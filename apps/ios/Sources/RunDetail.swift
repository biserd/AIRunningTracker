import SwiftUI
import MapKit

struct RunDetailResponse:Decodable { let activity:RunDetail }
struct RunDetail:Decodable {
    let formattedDistance:String?
    let formattedPace:String?
    let formattedDuration:String?
    let distanceUnit:String?
    let paceUnit:String?
    let averageHeartrate:Double?
    let maxHeartrate:Double?
    let totalElevationGain:Double?
    let lapsData:String?
    let polyline:String?
    let detailedPolyline:String?
    let locked:Bool?
    let deepDiveLocked:Bool?
    var laps:[RunLap] {
        guard let data=lapsData?.data(using:.utf8) else { return [] }
        return (try? JSONDecoder().decode([RunLap].self,from:data)) ?? []
    }
}
struct RunLap:Decodable {
    let distance:Double?
    let moving_time:Double?
    let average_heartrate:Double?
}
func runPace(minutes:Double,km:Double,miles:Bool)->String {
    guard minutes.isFinite,km.isFinite,minutes>0,km>0 else { return "Not recorded" }
    let seconds=Int((minutes*60/(miles ? km/1.609344 : km)).rounded())
    return "\(seconds/60):\(String(format:"%02d",seconds%60)) /\(miles ? "mi" : "km")"
}
func runRoute(_ encoded:String)->[CLLocationCoordinate2D] {
    let bytes=Array(encoded.utf8); var index=0; var lat=0; var lon=0
    var points:[CLLocationCoordinate2D]=[]
    func component()->Int? {
        var result=0; var shift=0
        while index<bytes.count && shift<=30 {
            let byte=Int(bytes[index])-63; index+=1
            guard byte>=0,byte<=63 else { return nil }
            result |= (byte & 31)<<shift; shift+=5
            if byte<32 { return result & 1 == 1 ? ~(result>>1) : result>>1 }
        }
        return nil
    }
    while index<bytes.count && points.count<50_000 {
        guard let a=component(),let b=component() else { return [] }
        lat+=a; lon+=b
        let point=CLLocationCoordinate2D(latitude:Double(lat)/1e5,longitude:Double(lon)/1e5)
        guard CLLocationCoordinate2DIsValid(point) else { return [] }
        points.append(point)
    }
    return points
}
struct RunDetailView:View {
    @EnvironmentObject var store:CoachStore
    let run:RunSummary
    @State private var detail:RunDetail?
    @State private var failure:String?
    @State private var loading=false
    private var miles:Bool { store.snapshot?.runner.unitPreference == "miles" }
    var body:some View {
        List {
            Section(run.date) {
                LabeledContent("Distance",value:runnerDistance(run.km,units:miles ? "miles" : "km"))
                LabeledContent("Moving time",value:detail?.formattedDuration ?? "\(Int(run.minutes)) min")
                LabeledContent("Average pace",value:runPace(minutes:run.minutes,km:run.km,miles:miles))
                LabeledContent("Average HR",value:heartRate(detail?.averageHeartrate))
                LabeledContent("Max HR",value:heartRate(detail?.maxHeartrate))
                LabeledContent("Elevation gain",value:detail?.totalElevationGain.map { "\(Int(($0 * (miles ? 3.28084 : 1)).rounded())) \(miles ? "ft" : "m")" } ?? "Not recorded")
            }
            Section {
                Button("Ask coach about this run") {
                    store.requestedCoach=UUID()
                    Task { await store.send("Explain my run ID \(run.id) on \(run.date). Use actual data and relate it to my training plan.") }
                }.buttonStyle(.borderedProminent).disabled(store.busy || store.voice.active)
            }
            Section("Coach analysis") { RunAnalysisView(activityID:run.id) }
            if loading { ProgressView("Loading run details…") }
            if let failure { Section { Text(failure); Button("Retry") { Task { await load() } } } }
            if let detail {
                if detail.locked == true || detail.deepDiveLocked == true {
                    Text("Some run details require an eligible subscription.").foregroundStyle(.secondary)
                }
                Section("Recorded laps") {
                    if detail.laps.isEmpty { Text("No lap data recorded for this run.").foregroundStyle(.secondary) }
                    ForEach(Array(detail.laps.enumerated()),id:\.offset) { index,lap in
                        VStack(alignment:.leading,spacing:6) {
                            Text("Lap \(index+1)").font(.headline)
                            if let distance=lap.distance,let duration=lap.moving_time {
                                Text("\(runnerDistance(distance/1000,units:miles ? "miles" : "km")) · \(runPace(minutes:duration/60,km:distance/1000,miles:miles))")
                            }
                            if let hr=lap.average_heartrate { Text(heartRate(hr)).foregroundStyle(.secondary) }
                        }
                    }
                }
                Section("Route") {
                    let points=runRoute(detail.detailedPolyline ?? detail.polyline ?? "")
                    if points.count>1 {
                        Map { MapPolyline(coordinates:points).stroke(RunBrand.orange,lineWidth:4) }
                            .frame(height:240).clipShape(RoundedRectangle(cornerRadius:16))
                    } else { Text("No route recorded for this run.").foregroundStyle(.secondary) }
                }
            }
        }.navigationTitle(run.name ?? "Run").navigationBarTitleDisplayMode(.inline)
            .task { await load() }
    }
    private func heartRate(_ value:Double?)->String { value.map { "\(Int($0.rounded())) bpm" } ?? "Not recorded" }
    private func load() async {
        loading=true; failure=nil; defer { loading=false }
        do { detail=try await store.api.runDetail(run.id).activity }
        catch { failure="Could not load the full run details. Please retry." }
    }
}
