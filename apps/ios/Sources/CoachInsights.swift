import SwiftUI

struct InsightShortcut:View {
    @EnvironmentObject var store:CoachStore
    var body:some View {
        NavigationLink { CoachInsightsView().id(store.snapshot?.runner.id) } label: {
            HStack(spacing:14) {
                Image(systemName:"chart.xyaxis.line").font(.title2).foregroundStyle(RunBrand.teal)
                VStack(alignment:.leading,spacing:4) {
                    Text("Your running insights").font(.headline).foregroundStyle(.primary)
                    Text("Recovery, race outlook & more").font(.caption).foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName:"chevron.right").foregroundStyle(RunBrand.orange)
            }.padding(18).background(RunBrand.surface,in:RoundedRectangle(cornerRadius:20))
        }.buttonStyle(.plain).accessibilityIdentifier("open-running-insights")
    }
}

struct InsightAnalytics:Decodable {
    struct Prediction:Decodable { let distance,predictedTime:String; let confidence:Double?; let recommendation:String? }
    struct Fitness:Decodable { let current:Double?; let trend,comparison:String? }
    struct Load:Decodable { let riskLevel:String?; let riskFactors,recommendations:[String]? }
    struct Efficiency:Decodable { let averageCadence,strideLength,efficiency:Double?; let runsAnalyzed:Int?; let dataConfidence:String?; let recommendations:[String]? }
    struct Zone:Decodable { let min,max:Double; let name,description:String? }
    struct Zones:Decodable { let heartRateZones:[String:Zone]? }
    let predictions:[Prediction]?
    let vo2Max:Fitness?
    let injuryRisk:Load?
    let efficiency:Efficiency?
    let hrZones:Zones?
    let unavailable:[String]?
    struct Entitlements:Decodable { let capabilities:[String:Bool]? }
    let entitlements:Entitlements?
}
struct InsightRecovery:Decodable {
    let readyToRun:Bool?
    let statusMessage,recoveryMessage,recommendedNextStep:String?
    let freshnessScore:Double?
}
struct InsightRecaps:Decodable {
    struct Recap:Decodable,Identifiable { let id:Int; let activityName,activityDate,coachingCue,nextStep:String? }
    let recaps:[Recap]
}

// Presentation only. These views never mark recaps viewed or modify coaching settings.
struct CoachInsightsView:View {
    @EnvironmentObject var store:CoachStore
    @State private var analytics:InsightAnalytics?
    @State private var recovery:InsightRecovery?
    @State private var recaps:[InsightRecaps.Recap]=[]
    @State private var failures:[String]=[]
    @State private var loading=false
    @State private var loaded:Date?
    @State private var selected="Overview"
    private let sections=["Overview","Performance","Recaps"]
    var body:some View {
        ScrollView {
            VStack(alignment:.leading,spacing:22) {
                VStack(alignment:.leading,spacing:12) {
                    Label("YOUR RUNNING, IN FOCUS",systemImage:"sparkles").font(.caption.bold()).tracking(1.5).foregroundStyle(RunBrand.orange)
                    Text("Find your next\nbreakthrough.").font(.system(.largeTitle,design:.rounded).bold())
                    Text("The same insights as Run Analytics. Made easier to explore.").font(.callout).foregroundStyle(.secondary)
                    if let loaded { Label("Fetched \(loaded.formatted(date:.omitted,time:.shortened)) · Read only",systemImage:"arrow.clockwise").font(.caption).foregroundStyle(.secondary) }
                }.padding(22).frame(maxWidth:.infinity,alignment:.leading)
                    .background(LinearGradient(colors:[RunBrand.orange.opacity(0.13),RunBrand.teal.opacity(0.07)],startPoint:.topLeading,endPoint:.bottomTrailing),in:RoundedRectangle(cornerRadius:26))
                Picker("Insight section",selection:$selected) { ForEach(sections,id:\.self) { Text($0) } }.pickerStyle(.segmented)
                if loading { ProgressView("Reading your insights…").frame(maxWidth:.infinity).padding() }
                if !failures.isEmpty {
                    InsightCard(title:"Some insights could not load",symbol:"wifi.exclamationmark",color:RunBrand.orange) {
                        Text(failures.joined(separator:"\n")).font(.callout).foregroundStyle(.secondary)
                        Button("Try again") { Task { await load() } }.buttonStyle(.borderedProminent).disabled(loading)
                    }
                }
                if analytics?.entitlements?.capabilities?["advancedInsights"] == false {
                    InsightCard(title:"More insight with your plan",symbol:"lock",color:RunBrand.orange) {
                        Text("Advanced analysis requires an eligible trial or subscription. Your existing account access applies here.").foregroundStyle(.secondary)
                    }
                }
                if selected == "Overview" { overview }
                else if selected == "Performance" { performance }
                else { recapCards }
                Text("Estimates from your synced runs, not medical advice. Missing measurements are never shown as zero.")
                    .font(.caption).foregroundStyle(.secondary).padding(.horizontal,4)
            }.padding(20).frame(maxWidth:900).frame(maxWidth:.infinity)
        }.background(RunBrand.canvas).navigationTitle("Coach insights").navigationBarTitleDisplayMode(.inline)
            .task(id:store.snapshot?.runner.id) { await load() }
            .refreshable { await load() }
    }
    @ViewBuilder private var overview:some View {
        InsightCard(title:"Your recovery",symbol:"heart.text.clipboard",color:RunBrand.teal) {
            if let recovery {
                Text(recovery.statusMessage ?? "Recovery overview").font(.title3.weight(.semibold))
                if let message=recovery.recoveryMessage { Text(message).foregroundStyle(.secondary) }
                if let next=recovery.recommendedNextStep { Label("Next: \(next.replacingOccurrences(of:"_",with:" "))",systemImage:"arrow.right.circle.fill").font(.headline).foregroundStyle(RunBrand.teal) }
            } else { empty("Recovery needs recent running data.") }
        }
        InsightCard(title:"Your training load",symbol:"waveform.path.ecg",color:RunBrand.orange) {
            if let risk=analytics?.injuryRisk {
                Text(loadLabel(risk.riskLevel)).font(.title2.bold())
                ForEach(risk.riskFactors ?? [],id:\.self) { Text($0).font(.callout).foregroundStyle(.secondary) }
                if let next=risk.recommendations?.first { Label(next,systemImage:"lightbulb").font(.callout) }
                Text("Training-load signal, not an injury prediction.").font(.caption).foregroundStyle(.secondary)
            } else { empty("Not enough load data yet.") }
        }
        if let notes=store.companion?.insights, !notes.isEmpty {
            InsightCard(title:"Saved coach notes",symbol:"text.bubble",color:RunBrand.blue) {
                ForEach(Array(notes.prefix(3))) { note in
                    DisclosureGroup(note.title) {
                        Text(note.content).frame(maxWidth:.infinity,alignment:.leading).padding(.vertical,8)
                        if let date=note.date { Text(coachTimestamp(date)).font(.caption).foregroundStyle(.secondary) }
                    }
                }
            }
        }
    }
    @ViewBuilder private var performance:some View {
        InsightCard(title:"Your race outlook",symbol:"flag.checkered",color:RunBrand.orange) {
            if let predictions=analytics?.predictions,!predictions.isEmpty {
                LazyVGrid(columns:[GridItem(.adaptive(minimum:145),alignment:.leading)],alignment:.leading,spacing:16) {
                    ForEach(Array(predictions.enumerated()),id:\.offset) { _,prediction in
                        VStack(alignment:.leading,spacing:7) {
                            Text(prediction.distance).font(.headline).foregroundStyle(RunBrand.orange)
                            Text(prediction.predictedTime).font(.system(.title2,design:.rounded).bold()).monospacedDigit()
                            if let confidence=prediction.confidence { Text("\(Int(confidence))% confidence").font(.caption).foregroundStyle(.secondary) }
                            if let note=prediction.recommendation { Text(note).font(.caption).foregroundStyle(.secondary) }
                        }.padding(14).frame(maxWidth:.infinity,alignment:.leading).background(RunBrand.orange.opacity(0.06),in:RoundedRectangle(cornerRadius:16))
                    }
                }
                Text("Estimated finish times, not guarantees.").font(.caption).foregroundStyle(.secondary)
            } else { empty("Race estimates will appear when enough running data is available.") }
        }
        InsightCard(title:"Aerobic fitness",symbol:"lungs",color:RunBrand.teal) {
            if let fitness=analytics?.vo2Max,let current=fitness.current,current>0 {
                metric(String(format:"%.1f",current),caption:"Estimated VO₂ max · ml/kg/min",color:RunBrand.teal)
                if let trend=fitness.trend { Text(trend.capitalized).font(.headline) }
                if let comparison=fitness.comparison { Text(comparison).foregroundStyle(.secondary) }
            } else { empty("An aerobic fitness estimate is not available yet.") }
        }
        InsightCard(title:"Running efficiency",symbol:"figure.run",color:RunBrand.blue) {
            if let efficiency=analytics?.efficiency {
                if let cadence=efficiency.averageCadence,cadence>0 { metric(String(format:"%.0f",cadence),caption:"Average cadence · steps/min",color:RunBrand.blue) }
                if let score=efficiency.efficiency { Text("Efficiency score: \(Int(score))/100").font(.headline) }
                if let count=efficiency.runsAnalyzed { Text("Based on \(count) runs · \(efficiency.dataConfidence ?? "unknown") confidence").font(.caption).foregroundStyle(.secondary) }
                ForEach(efficiency.recommendations ?? [],id:\.self) { Text($0).font(.callout).foregroundStyle(.secondary) }
            } else { empty("No efficiency measurements available.") }
        }
        InsightCard(title:"Heart-rate zones",symbol:"heart.fill",color:RunBrand.rose) {
            if let zones=analytics?.hrZones?.heartRateZones,!zones.isEmpty {
                ForEach(zones.keys.sorted(),id:\.self) { key in
                    if let zone=zones[key] {
                        VStack(alignment:.leading,spacing:5) {
                            HStack { Text(zone.name ?? key.capitalized).font(.headline); Spacer(); Text("\(Int(zone.min))–\(Int(zone.max)) bpm").monospacedDigit().font(.callout) }
                            if let detail=zone.description { Text(detail).font(.caption).foregroundStyle(.secondary) }
                        }.padding(12).background(RunBrand.rose.opacity(0.06),in:RoundedRectangle(cornerRadius:12))
                    }
                }
                Text("Estimated zones from your existing profile. No settings are changed here.").font(.caption).foregroundStyle(.secondary)
            } else { empty("Heart-rate zones are not available yet.") }
        }
    }
    @ViewBuilder private var recapCards:some View {
        if recaps.isEmpty { InsightCard(title:"After your run",symbol:"text.bubble",color:RunBrand.blue) { empty("Your existing post-run coaching recaps appear here after a run is synced and analyzed.") } }
        ForEach(recaps) { recap in
            InsightCard(title:recap.activityName ?? "Run recap",symbol:"figure.run",color:RunBrand.teal) {
                if let date=recap.activityDate { Text(coachTimestamp(date)).font(.caption).foregroundStyle(.secondary) }
                Text(recap.coachingCue ?? "No coaching summary saved for this run.").font(.body)
                if let next=recap.nextStep { Label(next.replacingOccurrences(of:"_",with:" ").capitalized,systemImage:"arrow.right.circle").font(.headline).foregroundStyle(RunBrand.teal) }
            }
        }
    }
    private func empty(_ text:String)->some View { Text(loading ? "Loading…" : text).foregroundStyle(.secondary).padding(.vertical,6) }
    private func metric(_ value:String,caption:String,color:Color)->some View { VStack(alignment:.leading,spacing:4) { Text(value).font(.system(.largeTitle,design:.rounded).bold()).foregroundStyle(color); Text(caption).font(.caption).foregroundStyle(.secondary) } }
    private func loadLabel(_ risk:String?)->String { switch risk?.lowercased() { case "low":return "Within your baseline"; case "medium":return "Watch your load"; case "high":return "Load elevated"; default:return "Training load" } }
    @MainActor private func load() async {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--test-insights") {
            // Offline UI fixture only. No account, network or health-data access.
            analytics=try? JSONDecoder().decode(InsightAnalytics.self,from:Data(#"{"predictions":[{"distance":"5K","predictedTime":"24:12","confidence":75},{"distance":"10K","predictedTime":"50:20","confidence":72}],"vo2Max":{"current":46.2,"trend":"stable","comparison":"Based on recent running data"},"injuryRisk":{"riskLevel":"Low","riskFactors":["Your recent mileage is within your usual range."],"recommendations":["Keep your easy runs comfortable."]},"efficiency":{"averageCadence":168,"efficiency":76,"runsAnalyzed":8,"dataConfidence":"moderate"},"hrZones":{"heartRateZones":{"zone1":{"min":100,"max":120,"name":"Active recovery","description":"Easy conversational effort"},"zone2":{"min":120,"max":140,"name":"Aerobic base","description":"Comfortable and sustainable"}}}}"#.utf8))
            recovery=try? JSONDecoder().decode(InsightRecovery.self,from:Data(#"{"statusMessage":"A little easier today.","recoveryMessage":"Your last run was a harder effort. Keep the next one relaxed.","recommendedNextStep":"easy"}"#.utf8))
            return
        }
        #endif
        guard !loading,let id=store.snapshot?.runner.id else { return }
        loading=true; failures=[]; defer { loading=false }
        async let a=fetch { try await store.api.analytics(userID:id) }
        async let r=fetch { try await store.api.recovery(userID:id) }
        async let c=fetch { try await store.api.coachRecaps() }
        let results=await(a,r,c)
        guard !Task.isCancelled,store.snapshot?.runner.id==id,!store.needsSignIn else { return }
        analytics=nil; recovery=nil; recaps=[]
        switch results.0 { case .success(let value):analytics=value; if value.unavailable?.isEmpty == false { failures.append("Some performance calculations are temporarily unavailable.") }; case .failure:failures.append("Performance insights could not be loaded.") }
        switch results.1 { case .success(let value):recovery=value; case .failure:failures.append("Recovery could not be loaded.") }
        switch results.2 { case .success(let value):recaps=value.recaps; case .failure(let error):if case APIError.server(403,_)=error { failures.append("Post-run recaps require an eligible subscription.") } else { failures.append("Post-run recaps could not be loaded.") } }
        loaded=Date()
    }
    @MainActor private func fetch<T>(_ action:() async throws -> T) async -> Result<T,Error> { do { return .success(try await action()) } catch { return .failure(error) } }
}

struct InsightCard<Content:View>:View {
    let title,symbol:String
    let color:Color
    @ViewBuilder let content:Content
    var body:some View {
        VStack(alignment:.leading,spacing:16) {
            HStack(spacing:12) {
                Image(systemName:symbol).font(.title3).foregroundStyle(color).frame(width:42,height:42).background(color.opacity(0.10),in:RoundedRectangle(cornerRadius:13))
                Text(title).font(.title3.bold())
            }
            content
        }.padding(20).frame(maxWidth:.infinity,alignment:.leading).background(RunBrand.surface,in:RoundedRectangle(cornerRadius:22))
            .overlay(RoundedRectangle(cornerRadius:22).strokeBorder(color.opacity(0.13),lineWidth:1))
    }
}
