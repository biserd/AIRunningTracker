import Foundation
import CoreLocation
import Combine

struct RunFix: Codable, Equatable {
    let latitude: Double
    let longitude: Double
    let timestamp: Date
    let accuracy: Double
    let segment: Int
    func meters(to other: RunFix) -> Double {
        let radians = Double.pi / 180
        let dLat = (other.latitude - latitude) * radians
        let dLon = (other.longitude - longitude) * radians
        let a = pow(sin(dLat / 2), 2) + cos(latitude * radians) * cos(other.latitude * radians) * pow(sin(dLon / 2), 2)
        return 6_371_000 * 2 * atan2(sqrt(max(0, a)), sqrt(max(0, 1-a)))
    }
}

struct PhoneRecording: Codable, Identifiable {
    let id: UUID
    let startedAt: Date
    var checkpoint: Date
    var running = true
    var seconds: Double = 0
    var distance: Double = 0
    var segment = 0
    var fixes: [RunFix] = []
    var name = "Phone run"
    var synced = false
    var endedAt: Date?
    // Optional fields preserve compatibility with recordings saved by earlier builds.
    var progress: [RunProgress]?
    var lapMarks: [RunProgress]?
    var pulses: [RunPulse]?
    var effort: Int?
    var notes: String?
    var unitMiles: Bool?
    // Optional so existing recordings still decode. Every resume sets a new boundary.
    var segmentStartedAt: Date?

    init(now: Date = Date()) { id = UUID(); startedAt = now; checkpoint = now; segmentStartedAt = now }
    mutating func advance(to now: Date) {
        if running { seconds += max(0, now.timeIntervalSince(checkpoint)) }
        checkpoint = max(checkpoint, now)
    }
    mutating func pause(at now: Date) { advance(to: now); running = false; segment += 1 }
    mutating func resume(at now: Date) { checkpoint = now; segmentStartedAt = now; running = true; segment += 1 }
    // Reject stale/inaccurate fixes and jumps. Never bridge pauses or GPS gaps.
    @discardableResult mutating func add(latitude: Double, longitude: Double, accuracy: Double, at: Date, now: Date) -> Bool {
        guard running, accuracy >= 0, accuracy <= 30, abs(now.timeIntervalSince(at)) <= 15,
              at >= (segmentStartedAt ?? startedAt), (-90...90).contains(latitude), (-180...180).contains(longitude), fixes.count < 50_000 else { return false }
        let next = RunFix(latitude: latitude, longitude: longitude, timestamp: at, accuracy: accuracy, segment: segment)
        if let last = fixes.last {
            let dt = at.timeIntervalSince(last.timestamp)
            guard dt > 0 else { return false }
            if last.segment == segment {
                if dt > 30 { segment += 1 }
                else {
                    let meters = last.meters(to: next)
                    guard meters / dt <= 12 else { return false }
                    // Suppress stationary jitter without counting it toward distance.
                    guard meters >= max(5, min(last.accuracy, accuracy) * 0.5) else { return false }
                    distance += meters
                }
            }
        }
        fixes.append(RunFix(latitude: latitude, longitude: longitude, timestamp: at, accuracy: accuracy, segment: segment))
        advance(to: now)
        if progress == nil { progress = [] }; progress?.append(RunProgress(distance: distance, seconds: seconds))
        return true
    }
    var movingTime: Int { max(1, Int(seconds.rounded())) }
    var elapsedTime: Int { max(movingTime, Int((endedAt ?? checkpoint).timeIntervalSince(startedAt).rounded())) }
    var body: [String: Any] {
        var result: [String: Any] = ["id": id.uuidString.lowercased(), "name": name, "startDate": ISO8601DateFormatter().string(from: startedAt),
         "distance": distance, "movingTime": movingTime, "elapsedTime": elapsedTime]
        if progress != nil { result["splits"] = splits(unit: unitMiles == true ? 1609.344 : 1000).map { ["number": Double($0.number), "distance": $0.distance, "seconds": $0.seconds] } }
        if lapMarks != nil { result["laps"] = laps.map { ["number": Double($0.number), "distance": $0.distance, "seconds": $0.seconds] } }
        if let effort { result["effort"] = effort }
        if let notes, !notes.isEmpty { result["notes"] = notes }
        if let averageHeartRate { result["averageHeartrate"] = averageHeartRate }
        return result
    }
}

@MainActor final class PhoneRunRecorder: NSObject, ObservableObject, CLLocationManagerDelegate {
    @Published private(set) var draft: PhoneRecording?
    @Published private(set) var saved: [PhoneRecording] = []
    @Published private(set) var account: String?
    @Published private(set) var storageReady = false
    @Published var message: String?
    @Published var syncing = false
    @Published private(set) var permissionDenied = false
    let heartRate = RunHeartRate()
    let healthExport = RunHealthExport()
    private let feedback = RunFeedback()
    private let live = RunLiveActivity()
    @Published private(set) var usesMiles = false
    @Published private(set) var profileUnitsReady = false
    func applyProfileUnits(_ preference: String) {
        guard account != nil, ["km", "miles"].contains(preference) else { return }
        usesMiles = preference == "miles"
        profileUnitsReady = true
    }
    @Published var audioAnnouncements = UserDefaults.standard.bool(forKey: "run-audio-announcements") {
        didSet { UserDefaults.standard.set(audioAnnouncements, forKey: "run-audio-announcements") }
    }
    @Published private(set) var liveActivityMessage: String?
    private var announcedDistance = 0
    private let location = CLLocationManager()
    private var directory: URL?
    private var timer: AnyCancellable?
    private var awaitingPermission = false
    private var savedCheckpoint = Date.distantPast

    override init() {
        super.init()
        heartRate.onPulse = { [weak self] bpm in
            guard let self, self.draft?.running == true else { return }
            if self.draft?.pulses == nil { self.draft?.pulses = [] }
            if (self.draft?.pulses?.count ?? 0) < 200_000 { self.draft?.pulses?.append(RunPulse(date: Date(), bpm: bpm)) }
        }
        location.delegate = self
        location.activityType = .fitness
        location.desiredAccuracy = kCLLocationAccuracyBest
        location.distanceFilter = 5
        location.pausesLocationUpdatesAutomatically = false
    }
    func selectAccount(_ token: String?) {
        guard token != account else { return }
        pause(); live.end(); heartRate.disconnect(); feedback.stop()
        location.stopUpdatingLocation(); timer = nil; awaitingPermission = false
        usesMiles = false; profileUnitsReady = false
        account = token; directory = nil; storageReady = false; draft = nil; saved = []; message = nil
        guard let token, UUID(uuidString: token) != nil else { return }
        do {
            let root = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
                .appendingPathComponent("RunRecordings", isDirectory: true).appendingPathComponent(token, isDirectory: true)
            try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
            directory = root
            for file in try FileManager.default.contentsOfDirectory(at: root, includingPropertiesForKeys: nil) where file.pathExtension == "json" {
                if file.lastPathComponent == "feed.json" { continue }
                let run = try JSONDecoder().decode(PhoneRecording.self, from: Data(contentsOf: file))
                if file.lastPathComponent == "draft.json" { draft = run }
                else { saved.append(run) }
            }
            if let unfinished=draft,saved.contains(where:{$0.id==unfinished.id && $0.endedAt != nil}) {
                try FileManager.default.removeItem(at:root.appendingPathComponent("draft.json"));draft=nil
            }
            // Recover at the last durable checkpoint; never invent time or distance while terminated.
            if draft != nil { draft?.running = false; draft?.segment += 1; message = "Recovered your unfinished run. Resume or save it when you’re ready." }
            saved.sort { $0.startedAt > $1.startedAt }
            if let feed = cachedFeed() { applyProfileUnits(feed.unitPreference) }
            storageReady = true
        } catch { message = "Saved runs could not be opened. Please restart the app before recording. Your files have been kept." }
    }
    func startOrResume() {
        guard account != nil, storageReady, (draft != nil || profileUnitsReady), draft?.running != true else { return }
        switch location.authorizationStatus {
        case .notDetermined:
            awaitingPermission = true; location.requestWhenInUseAuthorization()
        case .authorizedAlways, .authorizedWhenInUse:
            guard location.accuracyAuthorization == .fullAccuracy else {
                permissionDenied = true; message = "Enable Precise Location in Settings to record a GPS run."; return
            }
            permissionDenied = false
            if draft == nil { draft = PhoneRecording(); draft?.unitMiles = usesMiles } else { draft?.resume(at: Date()) }
            announcedDistance = Int((draft?.distance ?? 0) / ((draft?.unitMiles ?? usesMiles) ? 1609.344 : 1000))
            if let draft { live.update(draft, miles: draft.unitMiles ?? usesMiles, force: true); liveActivityMessage = live.status }
            feedback.announce("Run started", audio: audioAnnouncements)
            guard persistDraft() else { draft?.running = false; return }
            message = "Finding GPS. Distance begins when a reliable location is available."
            location.allowsBackgroundLocationUpdates = true
            location.showsBackgroundLocationIndicator = true
            location.startUpdatingLocation()
            timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect().sink { [weak self] now in
                guard let self, self.draft?.running == true else { return }
                self.draft?.advance(to: now)
                self.heartRate.expire()
                if let draft = self.draft { self.live.update(draft, miles: draft.unitMiles ?? self.usesMiles) }
                if now.timeIntervalSince(self.savedCheckpoint) >= 5 { _ = self.persistDraft() }
            }
        default:
            permissionDenied = true; message = "Allow location access in Settings to record with your phone. Garmin and Strava still work without it."
        }
    }
    func pause() {
        guard draft?.running == true else { return }
        draft?.pause(at: Date()); location.stopUpdatingLocation(); timer = nil
        _ = persistDraft()
        if let draft { live.update(draft, miles: draft.unitMiles ?? usesMiles, force: true) }
        feedback.stop(); feedback.announce("Run paused", audio: false)
    }
    var gpsStatus: String {
        guard let fix = draft?.fixes.last else { return "Finding a reliable GPS signal…" }
        return Date().timeIntervalSince(fix.timestamp) > 30 ? "GPS signal is weak · distance may be incomplete" : "GPS recording · accuracy ±\(Int(fix.accuracy)) m"
    }
    func markLap() {
        guard draft?.running == true else { return }
        draft?.advance(to: Date())
        if draft?.lapMarks == nil { draft?.lapMarks = [] }
        let mark = RunProgress(distance: draft?.distance ?? 0, seconds: draft?.seconds ?? 0)
        draft?.lapMarks?.append(mark)
        _ = persistDraft(); feedback.announce("Lap \(draft?.lapMarks?.count ?? 0)", audio: audioAnnouncements)
    }
    func finish(name: String, effort: Int? = nil, notes: String = "") {
        pause()
        guard var run = draft, let directory else { return }
        guard run.seconds >= 1 else { message = "Record at least one second before saving."; return }
        run.name = String(name.trimmingCharacters(in: .whitespacesAndNewlines).prefix(120))
        if run.name.isEmpty { run.name = "Phone run" }
        run.effort = effort.flatMap { (1...10).contains($0) ? $0 : nil }
        run.notes = String(notes.prefix(2000))
        run.endedAt = run.checkpoint
        do {
            try write(run, to: directory.appendingPathComponent(run.id.uuidString + ".json"))
            // If removing the draft fails, keep it for recovery and do not claim success.
            try FileManager.default.removeItem(at: directory.appendingPathComponent("draft.json"))
            saved.removeAll { $0.id == run.id }; saved.insert(run, at: 0); draft = nil; live.end(); heartRate.disconnect(); feedback.stop()
            message = "Saved on this iPhone. Your run summary will sync to your account."
        } catch { message = "Could not finish saving. Your recording is still here; please try again." }
    }
    func discard() {
        pause()
        do {
            if let directory, FileManager.default.fileExists(atPath: directory.appendingPathComponent("draft.json").path) {
                try FileManager.default.removeItem(at: directory.appendingPathComponent("draft.json"))
            }
            draft = nil; message = nil; live.end(); heartRate.disconnect(); feedback.stop()
        } catch { message = "Could not discard the recording. Please try again." }
    }
    func sync(api: CoachAPI) async {
        guard !syncing, let directory, let owner = account, storageReady else { return }
        syncing = true; defer { syncing = false }
        for var run in saved where !run.synced {
            do {
                try await api.savePhoneRun(run)
                guard owner == account else { return }
                run.synced = true
                try write(run, to: directory.appendingPathComponent(run.id.uuidString + ".json"))
                if let i = saved.firstIndex(where: { $0.id == run.id }) { saved[i] = run }
            } catch {
                guard owner == account else { return }
                message = "Saved on this iPhone. Couldn’t sync yet; use Retry sync when you’re online."
                return
            }
        }
    }
    func clearAccountFiles() throws {
        live.end(); heartRate.disconnect(); feedback.stop()
        location.stopUpdatingLocation(); timer = nil; awaitingPermission = false
        if let directory { try FileManager.default.removeItem(at: directory) }
        draft = nil; saved = []; account = nil; directory = nil; storageReady = false
        usesMiles = false; profileUnitsReady = false
    }
    func cacheFeed(_ feed: NativeRunFeed) {
        guard let directory else { return }
        applyProfileUnits(feed.unitPreference)
        do { try JSONEncoder().encode(feed).write(to: directory.appendingPathComponent("feed.json"), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication]) }
        catch { message = "Runs loaded, but the offline history could not be saved." }
    }
    func cachedFeed() -> NativeRunFeed? {
        guard let directory else { return nil }
        return try? JSONDecoder().decode(NativeRunFeed.self, from: Data(contentsOf: directory.appendingPathComponent("feed.json")))
    }
    private func write(_ run: PhoneRecording, to url: URL) throws {
        try JSONEncoder().encode(run).write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
    @discardableResult private func persistDraft() -> Bool {
        guard let draft, let directory else { return false }
        do { try write(draft, to: directory.appendingPathComponent("draft.json")); savedCheckpoint = Date(); return true }
        catch {
            self.draft?.running = false; location.stopUpdatingLocation(); timer = nil
            if let draft = self.draft { live.update(draft, miles: draft.unitMiles ?? usesMiles, force: true) }
            message = "Recording paused because this iPhone could not save it. Free some storage and try again."
            return false
        }
    }
    #if DEBUG
    func installRunDisplayFixture(running: Bool = false) {
        var run = PhoneRecording(now: Date().addingTimeInterval(-900))
        run.seconds = 900; run.distance = 2500; run.running = running; run.checkpoint = Date(); run.unitMiles = usesMiles
        run.progress = [RunProgress(distance: 0, seconds: 0), RunProgress(distance: 2500, seconds: 900)]
        run.fixes = [RunFix(latitude: 40.78, longitude: -73.97, timestamp: Date().addingTimeInterval(-10), accuracy: 5, segment: 0), RunFix(latitude: 40.79, longitude: -73.96, timestamp: Date(), accuracy: 5, segment: 0)]
        draft = run
    }
    #endif
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if awaitingPermission, manager.authorizationStatus != .notDetermined { awaitingPermission = false; startOrResume() }
        if manager.authorizationStatus == .denied || manager.authorizationStatus == .restricted { pause(); permissionDenied = true }
    }
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard draft?.running == true else { return }
        var accepted = false
        for fix in locations {
            if draft?.add(latitude: fix.coordinate.latitude, longitude: fix.coordinate.longitude, accuracy: fix.horizontalAccuracy, at: fix.timestamp, now: Date()) == true { accepted = true }
        }
        if accepted {
            message = nil; _ = persistDraft()
            if let draft {
                let miles = draft.unitMiles ?? usesMiles
                live.update(draft, miles: miles)
                let completed = Int(draft.distance / (miles ? 1609.344 : 1000))
                if completed > announcedDistance {
                    announcedDistance = completed
                    feedback.announce("\(completed) \(miles ? "miles" : "kilometres"). Average pace \(runPace(distance: draft.distance, seconds: draft.seconds, miles: miles)).", audio: audioAnnouncements)
                }
            }
        }
    }
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        message = "GPS is unavailable. Time continues; distance resumes when a reliable signal returns."
    }
}
