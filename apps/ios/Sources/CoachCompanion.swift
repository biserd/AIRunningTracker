import SwiftUI

struct CompanionPreferences: Codable {
    var notes:String
    var evening,weekly:Bool
    var hour,quietStart,quietEnd:Int
}
struct SavedInsight:Decodable,Identifiable { let id:Int; let title,content:String; let date:String? }
struct CoachBriefing:Decodable,Identifiable {
    let kind,reference,title,body,date:String
    var id:String { kind+reference }
}
struct CoachCheckIn:Decodable { let date,feeling:String; let activityId:Int }
struct CompanionData:Decodable {
    let preferences:CompanionPreferences
    let insights:[SavedInsight]
    let briefings:[CoachBriefing]
    let checkins:[CoachCheckIn]
}
func runnerDistance(_ km:Double,units:String)->String { String(format:"%.1f %@",units == "miles" ? km*0.621371 : km,units == "miles" ? "mi" : "km") }
func coachTimestamp(_ value:String)->String {
    let formatter=ISO8601DateFormatter(); formatter.formatOptions=[.withInternetDateTime,.withFractionalSeconds]
    if let date=formatter.date(from:value) { return date.formatted(date:.abbreviated,time:.shortened) }
    formatter.formatOptions=[.withInternetDateTime]
    return formatter.date(from:value)?.formatted(date:.abbreviated,time:.shortened) ?? value
}
func workoutSummary(_ day:Workout,units:String)->String {
    if day.kind == "rest" { return "Rest day" }
    var parts:[String]=[]
    if let km=day.distanceKm,km>0 { parts.append(runnerDistance(km,units:units)) }
    if day.minutes>0 { parts.append("\(Int(day.minutes)) min") }
    parts.append(day.kind.capitalized)
    return parts.joined(separator:" · ")
}
struct CoachCompanionCards:View {
    @EnvironmentObject var store:CoachStore
    var body:some View {
        VStack(alignment:.leading,spacing:12) {
            Text("How are you feeling?").font(.headline)
            ScrollView(.horizontal,showsIndicators:false) {
                HStack {
                    ForEach([("good","Good"),("tired","Tired"),("sore","Sore"),("short_on_time","Short on time")],id:\.0) { value in
                        Button(value.1) { Task { await store.checkIn(value.0) } }.buttonStyle(.bordered).disabled(store.busy || store.voice.active)
                    }
                }
            }
            if let saved=store.companion?.checkins.first(where:{$0.date==store.snapshot?.state.today && $0.activityId==0}) {
                Text("Today: \(saved.feeling.replacingOccurrences(of:"_",with:" "))").font(.caption).foregroundStyle(.secondary)
            }
            if let run=store.snapshot?.state.activities?.last {
                DisclosureGroup("Your latest run · \(run.date)") {
                    VStack(alignment:.leading,spacing:10) {
                        Text("\(run.name ?? "Run") · \(runnerDistance(run.km,units:store.snapshot?.runner.unitPreference ?? "km"))")
                        Button("Talk about this run") { Task { await store.send("Review my run ID \(run.id) on \(run.date), using my actual running data. Ask how the final part felt and connect it to my next planned session.") } }.buttonStyle(.borderedProminent).disabled(store.busy || store.voice.active)
                        HStack { ForEach(["good","tired","sore"],id:\.self) { feeling in
                            Button(feeling.capitalized) { Task { await store.checkIn(feeling,activity:run.id) } }.buttonStyle(.bordered).disabled(store.busy || store.voice.active)
                        } }
                    }.padding(.top,8)
                }
            }
            if let briefing=store.companion?.briefings.first {
                DisclosureGroup(briefing.title) {
                    Text(briefing.body).frame(maxWidth:.infinity,alignment:.leading).padding(.top,8)
                    Text(coachTimestamp(briefing.date)).font(.caption).foregroundStyle(.secondary)
                    Button("Discuss with coach") { Task { await store.send("Discuss my saved \(briefing.kind) briefing for \(briefing.reference), using fresh training data.") } }.buttonStyle(.bordered).disabled(store.busy || store.voice.active)
                }
            }
        }.padding().background(Color.orange.opacity(0.07)).clipShape(RoundedRectangle(cornerRadius:16))
    }
}
struct RunHistoryView:View {
    @EnvironmentObject var store:CoachStore
    var body:some View {
        List {
            Section { Text("Recorded runs from the last 90 days, up to 200 and subject to your plan.").font(.caption).foregroundStyle(.secondary) }
            ForEach((store.snapshot?.state.activities ?? []).reversed()) { run in
                DisclosureGroup("\(run.date) · \(run.name ?? "Run")") {
                    Text("\(runnerDistance(run.km,units:store.snapshot?.runner.unitPreference ?? "km")) · \(Int(run.minutes)) min")
                    Button("Ask coach about this run") { Task { await store.send("Explain my run ID \(run.id) on \(run.date). Use actual data and relate it to my training plan.") } }.disabled(store.busy || store.voice.active)
                    Text("Your answer appears in Coach.").font(.caption).foregroundStyle(.secondary)
                }
            }
            if store.snapshot?.state.activities?.isEmpty != false { Text("No recorded runs available.") }
        }.navigationTitle("Run history").refreshable { await store.refreshSchedule(force:true) }
    }
}
struct CoachInsightsView:View {
    @EnvironmentObject var store:CoachStore
    var body:some View {
        List {
            ForEach(store.companion?.insights ?? []) { insight in
                Section(insight.title) {
                    Text(insight.content)
                    if let date=insight.date { Text("Saved \(coachTimestamp(date))").font(.caption).foregroundStyle(.secondary) }
                }
            }
            if let error=store.companionError { Text(error).foregroundStyle(.red) }
            else if store.companion?.insights.isEmpty != false { Text("No saved insights available. AI insights require an eligible subscription.") }
        }.navigationTitle("Coach insights").refreshable { await store.refreshSchedule(force:true) }
    }
}
struct CoachingPreferencesView:View {
    @EnvironmentObject var store:CoachStore
    @State private var preferences=CompanionPreferences(notes:"",evening:false,weekly:false,hour:18,quietStart:21,quietEnd:7)
    @State private var saving=false
    @State private var saved=false
    var body:some View {
        Form {
            Section("What your coach should remember") {
                TextEditor(text:$preferences.notes).frame(minHeight:110)
                Text("Preferred running days, upcoming races and time constraints. These notes inform advice but do not change your plan. Avoid private medical details.").font(.caption).foregroundStyle(.secondary)
            }
            Section("Helpful check-ins") {
                Toggle("Tomorrow’s run briefing",isOn:$preferences.evening)
                Toggle("Sunday progress story",isOn:$preferences.weekly)
                Stepper("Briefing hour: \(preferences.hour):00",value:$preferences.hour,in:0...23)
                Text("Uses your account timezone. Briefings appear in the app; Apple alerts require notifications enabled. Weather uses your existing opted-in location.").font(.caption).foregroundStyle(.secondary)
            }
            Section("Quiet hours") {
                Stepper("From \(preferences.quietStart):00",value:$preferences.quietStart,in:0...23)
                Stepper("Until \(preferences.quietEnd):00",value:$preferences.quietEnd,in:0...23)
                Text("Applies to proactive Apple coaching, not reminders you explicitly schedule. Equal times turn quiet hours off.").font(.caption).foregroundStyle(.secondary)
            }
            Button(saved ? "Saved" : "Save preferences") {
                Task {
                    saving=true; defer { saving=false }
                    do {
                        let data=try JSONEncoder().encode(preferences)
                        let body=try JSONSerialization.jsonObject(with:data) as! [String:Any]
                        let _:OK=try await store.api.companion("preferences",body:body)
                        await store.refreshSchedule(force:true); saved=true
                    } catch { store.report(error) }
                }
            }.buttonStyle(.borderedProminent).disabled(saving || preferences.notes.count>1500 || store.companion==nil)
        }.navigationTitle("Your coach").onAppear { if let current=store.companion?.preferences { preferences=current } }
    }
}
