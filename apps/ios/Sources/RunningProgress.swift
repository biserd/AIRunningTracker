import SwiftUI

struct RunRecapResponse:Decodable {
    struct Recap:Decodable {
        let recapBullets:[String]
        let coachingCue,nextStep,nextStepRationale:String
        let confidenceFlags:[String]?
    }
    let recap:Recap?
}
struct NativeRunnerScore:Decodable {
    struct Components:Decodable { let consistency,performance,volume,improvement:Double }
    struct Trends:Decodable { let weeklyChange,monthlyChange:Double }
    let totalScore:Double
    let isProvisional:Bool
    let recentRunCount:Int
    let components:Components
    let trends:Trends
}
struct NativeActivityCalendar:Decodable {
    struct Activity:Decodable,Identifiable { let id:Int; let name:String; let distanceKm:Double }
    struct Day:Decodable,Identifiable {
        let date:String
        let totalDistanceKm:Double
        let activities:[Activity]
        var id:String { date }
    }
    let days:[Day]
    let maxDistance:Double
    let unitPreference:String
    var months:[String] { Array(Set(days.map { String($0.date.prefix(7)) })).sorted() }
}

struct RunAnalysisView:View {
    @EnvironmentObject var store:CoachStore
    let activityID:Int
    var refreshID=0
    @State private var recap:RunRecapResponse.Recap?
    @State private var loading=true
    @State private var preparing=false
    @State private var failure:String?
    var body:some View {
        VStack(alignment:.leading,spacing:12) {
            if loading { ProgressView("Reading coach analysis…") }
            else if let failure {
                Text(failure).foregroundStyle(.secondary)
                Button("Retry") { Task { await load() } }.tint(RunBrand.orange)
            } else if let recap {
                Label("Focus for your next run",systemImage:"scope").font(.headline).foregroundStyle(RunBrand.orange)
                Text(recap.coachingCue)
                DisclosureGroup("Full run analysis") {
                    VStack(alignment:.leading,spacing:12) {
                        ForEach(Array(recap.recapBullets.enumerated()),id:\.offset) { _,bullet in Text(bullet) }
                        Text("Next: \(recap.nextStep.replacingOccurrences(of:"_",with:" ").capitalized)").font(.headline).foregroundStyle(RunBrand.teal)
                        Text(recap.nextStepRationale)
                        ForEach(recap.confidenceFlags ?? [],id:\.self) { Text($0).font(.caption).foregroundStyle(.secondary) }
                    }.padding(.vertical,8)
                }
            } else if preparing {
                ProgressView("Preparing coach analysis…")
            } else {
                Text("Coach analysis is still preparing. Pull down to refresh.").foregroundStyle(.secondary)
                Button("Retry") { Task { await load() } }.tint(RunBrand.orange)
            }
        }.task(id:"\(activityID)-\(refreshID)") { await load() }
    }
    @MainActor private func load() async {
        let runner=store.snapshot?.runner.id
        loading=true; preparing=false; failure=nil; recap=nil
        for attempt in 0..<15 {
            do {
                let response=try await store.api.runRecap(activityID)
                guard !Task.isCancelled,store.snapshot?.runner.id==runner,!store.needsSignIn else { return }
                if let saved=response.recap { recap=saved; loading=false; preparing=false; return }
                loading=false; preparing=true
            } catch {
                guard !Task.isCancelled else { return }
                loading=false; preparing=false
                if case APIError.server(let status,_)=error, status==402 || status==403 {
                    failure="Coach analysis requires access through your current plan."
                } else { failure="Coach analysis could not load. Your run details are still available." }
                return
            }
            if attempt<14 {
                do { try await Task.sleep(nanoseconds:4_000_000_000) } catch { return }
            }
        }
        preparing=false
    }
}

struct RunningProgressView:View {
    @EnvironmentObject var store:CoachStore
    @State private var score:NativeRunnerScore?
    @State private var calendar:NativeActivityCalendar?
    @State private var failures:[String]=[]
    @State private var loading=false
    @State private var month=""
    @State private var selected:NativeActivityCalendar.Day?
    private var visibleDays:[NativeActivityCalendar.Day] { calendar?.days.filter { $0.date.hasPrefix(month) } ?? [] }
    private var offset:Int {
        guard let date=visibleDays.first?.date else { return 0 }
        let formatter=DateFormatter(); formatter.locale=Locale(identifier:"en_US_POSIX"); formatter.timeZone=TimeZone(secondsFromGMT:0); formatter.dateFormat="yyyy-MM-dd"
        guard let value=formatter.date(from:date) else { return 0 }
        var cal=Calendar(identifier:.gregorian); cal.timeZone=TimeZone(secondsFromGMT:0)!
        return (cal.component(.weekday,from:value)+5)%7
    }
    var body:some View {
        ScrollView {
            VStack(spacing:20) {
                VStack(spacing: 0) {
                    NavigationLink { RunHistoryView() } label: { progressLink("Run history", symbol: "figure.run") }.buttonStyle(.plain)
                    Divider()
                    NavigationLink { CoachInsightsView().id(store.snapshot?.runner.id) } label: { progressLink("Coach insights", symbol: "sparkles") }.buttonStyle(.plain)
                }.padding(.horizontal).background(RunBrand.surface, in: RoundedRectangle(cornerRadius: 18))
                if store.snapshot == nil && score == nil && calendar == nil && !loading {
                    ContentUnavailableView("Progress not loaded", systemImage: "chart.bar.xaxis", description: Text("Pull down to refresh your running data."))
                }
                if loading { ProgressView("Reading your progress…") }
                if !failures.isEmpty {
                    Text(failures.joined(separator:"\n")).foregroundStyle(.secondary)
                    Button("Retry") { Task { await load() } }.buttonStyle(.borderedProminent)
                }
                if let calendar {
                    MileageProgressCard(calendar: calendar)
                }
                if let score {
                    InsightCard(title:"Runner Score",symbol:"trophy",color:RunBrand.orange) {
                        Text("\(Int(score.totalScore.rounded())) / 100").font(.largeTitle.bold()).foregroundStyle(RunBrand.orange)
                        Text("Last 30 days · \(score.recentRunCount) runs").font(.caption).foregroundStyle(.secondary)
                        if score.isProvisional { Text("Early estimate. More runs will build a clearer picture.").font(.callout) }
                        Text(String(format:"%+.0f runs versus the previous 30 days",score.trends.monthlyChange)).font(.callout)
                        DisclosureGroup("Score breakdown") {
                            VStack(spacing:12) {
                                component("Consistency",score.components.consistency)
                                component("Performance",score.components.performance)
                                component("Volume",score.components.volume)
                                component("Improvement",score.components.improvement)
                            }.padding(.top,12)
                        }
                    }
                }
                if let calendar {
                    InsightCard(title:"Activity calendar",symbol:"calendar",color:RunBrand.teal) {
                        if calendar.days.isEmpty { Text("No calendar data available yet.") }
                        else {
                            Picker("Month",selection:$month) { ForEach(calendar.months,id:\.self) { Text(runnerMonth($0)).tag($0) } }.pickerStyle(.menu)
                            Text("Tap a day to see its runs. Darker means more distance.").font(.caption).foregroundStyle(.secondary)
                            ScrollView(.horizontal, showsIndicators: false) {
                            LazyVGrid(columns:Array(repeating:GridItem(.flexible(minimum:44),spacing:2),count:7),spacing:4) {
                                ForEach(Array(["M","T","W","T","F","S","S"].enumerated()),id:\.offset) { _,day in Text(day).font(.caption).foregroundStyle(.secondary) }
                                ForEach(0..<offset,id:\.self) { _ in Color.clear.frame(height:44) }
                                ForEach(visibleDays) { day in
                                    Button { selected=day } label: {
                                        Text(String(day.date.suffix(2))).font(.callout.monospacedDigit()).frame(minWidth:44,maxWidth:.infinity,minHeight:44)
                                            .background(RunBrand.teal.opacity(day.totalDistanceKm>0 ? 0.2+0.55*min(1,day.totalDistanceKm/max(1,calendar.maxDistance)) : 0.06),in:RoundedRectangle(cornerRadius:7))
                                            .overlay(RoundedRectangle(cornerRadius:7).strokeBorder(selected?.id==day.id ? RunBrand.orange : .clear,lineWidth:2))
                                    }.buttonStyle(.plain).accessibilityLabel("\(day.date), \(runnerDistance(day.totalDistanceKm,units:calendar.unitPreference)), \(day.activities.count) runs")
                                }
                            }.frame(minWidth:320)
                            }
                            if let selected {
                                Text(runnerDay(selected.date, today: store.snapshot?.state.today)).font(.headline)
                                if selected.activities.isEmpty { Text("No recorded runs.").foregroundStyle(.secondary) }
                                ForEach(selected.activities) { run in
                                    HStack { Text(run.name); Spacer(); Text(runnerDistance(run.distanceKm,units:calendar.unitPreference)).foregroundStyle(.secondary) }
                                }
                            }
                        }
                    }.onChange(of:month) { _,_ in selected=nil }
                }
            }.padding(20).frame(maxWidth:760).frame(maxWidth:.infinity)
        }.background(RunBrand.canvas).navigationTitle("Progress")
            .task(id:store.snapshot?.runner.id) { await load() }.refreshable { await store.refreshSchedule(force: true); await load() }
    }
    private func progressLink(_ title: String, symbol: String) -> some View {
        HStack {
            Label(title, systemImage: symbol).font(.headline).foregroundStyle(.primary)
            Spacer()
            Image(systemName: "chevron.right").font(.caption.bold()).foregroundStyle(.secondary)
        }.frame(minHeight: 52).contentShape(Rectangle())
    }
    private func component(_ name:String,_ value:Double)->some View {
        VStack { HStack { Text(name); Spacer(); Text("\(Int(value))/25") }; ProgressView(value:min(25,max(0,value)),total:25).tint(RunBrand.orange) }
    }
    @MainActor private func load() async {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--test-insights") {
            score = NativeRunnerScore(totalScore: 54, isProvisional: false, recentRunCount: 12,
                components: .init(consistency: 15, performance: 10, volume: 19, improvement: 10),
                trends: .init(weeklyChange: 1, monthlyChange: 2))
            let formatter = DateFormatter()
            formatter.calendar = MileageHistory.calendar
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.timeZone = MileageHistory.calendar.timeZone
            formatter.dateFormat = "yyyy-MM-dd"
            calendar = NativeActivityCalendar(days: (0..<183).map { offset in
                let date = MileageHistory.calendar.date(byAdding: .day, value: offset, to: MileageHistory.date("2026-04-01")!)!
                let day = MileageHistory.calendar.component(.day, from: date)
                return .init(date: formatter.string(from: date), totalDistanceKm: day % 3 == 0 ? 5 : 0,
                    activities: day % 3 == 0 ? [.init(id: offset, name: "Easy run", distanceKm: 5)] : [])
            }, maxDistance: 5, unitPreference: "miles")
            month = "2026-09"
            return
        }
        #endif
        guard !loading,let id=store.snapshot?.runner.id else { return }
        loading=true; failures=[]; score=nil; calendar=nil; selected=nil
        defer { loading=false }
        async let s=fetch { try await store.api.runnerScore(id) }
        async let c=fetch { try await store.api.activityCalendar() }
        let results=await(s,c)
        guard !Task.isCancelled,store.snapshot?.runner.id==id,!store.needsSignIn else { return }
        switch results.0 { case .success(let value):score=value; case .failure:failures.append("Runner Score could not load.") }
        switch results.1 { case .success(let value):calendar=value; if !value.months.contains(month) { month=value.months.last ?? "" }; case .failure:failures.append("Running distance and activity calendar could not load.") }
    }
    @MainActor private func fetch<T>(_ action:() async throws -> T) async -> Result<T,Error> { do { return .success(try await action()) } catch { return .failure(error) } }
}
