#if DEBUG
import Foundation

/// Offline App Store capture data. No account, microphone, AI request or writes.
@MainActor enum AppStoreCapture {
    static func populate(_ store: CoachStore) {
        let days = [
            Workout(id:"demo-1",date:"2026-09-26",title:"Easy miles",kind:"easy",minutes:35,completed:false,distanceKm:5.6,description:"Relaxed effort. Finish feeling fresh."),
            Workout(id:"demo-2",date:"2026-09-27",title:"Long run",kind:"long",minutes:85,completed:false,distanceKm:12.9,description:"Start easy and keep it conversational."),
            Workout(id:"demo-3",date:"2026-09-28",title:"Rest & recharge",kind:"rest",minutes:0,completed:false,description:"A day to recover. Gentle movement if you like."),
            Workout(id:"demo-4",date:"2026-09-29",title:"Steady intervals",kind:"quality",minutes:45,completed:false,distanceKm:7.2,description:"Warm up, then 4 × 4 minutes steady with easy recoveries."),
            Workout(id:"demo-5",date:"2026-09-30",title:"Easy run",kind:"easy",minutes:30,completed:false,distanceKm:4.8,description:"Comfortable miles, no pace to chase.")
        ]
        store.snapshot=Snapshot(runner:Runner(id:900001,name:"Alex",timezone:"America/New_York",unitPreference:"miles"),state:RunningState(today:"2026-09-26",goal:"half_marathon",days:days,activities:[RunSummary(id:90001,name:"Morning run",date:"2026-09-25",km:6.4,minutes:39)],plan:PlanSummary(id:9001,name:"Your autumn half marathon",totalWeeks:12,weekNumber:6)),canUseAI:true,version:1)
        store.messages=[
            Message(role:"user",content:"I have 30 minutes today. Can we keep it easy before tomorrow’s long run?"),
            Message(role:"assistant",content:"Yes. Today is a 35-minute easy run, so a shorter, relaxed session fits. Keep it conversational and save your energy for tomorrow’s long run. Want me to prepare that change for you to review?")
        ]
    }
}
#endif
