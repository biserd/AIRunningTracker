import Foundation
import Combine
import AVFoundation
import UIKit
import CoreBluetooth
import HealthKit
import CoreLocation
import ActivityKit

@MainActor final class RunFeedback: NSObject, AVSpeechSynthesizerDelegate {
    private let speech = AVSpeechSynthesizer()
    override init() { super.init(); speech.delegate = self }
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) { try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation) }
    func announce(_ text: String, audio: Bool) {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        guard audio else { return }
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .voicePrompt, options: [.duckOthers])
            try AVAudioSession.sharedInstance().setActive(true)
            let utterance = AVSpeechUtterance(string: text); utterance.rate = AVSpeechUtteranceDefaultSpeechRate
            speech.speak(utterance)
        } catch { /* Recording continues when an audio route is unavailable. */ }
    }
    func stop() {
        speech.stopSpeaking(at: .immediate)
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}

@MainActor final class RunHeartRate: NSObject, ObservableObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    @Published private(set) var devices: [CBPeripheral] = []
    @Published private(set) var status = "No heart-rate sensor connected"
    @Published private(set) var bpm: Int?
    @Published private(set) var scanning = false
    var onPulse: ((Int) -> Void)?
    private var central: CBCentralManager?
    private var peripheral: CBPeripheral?
    private var scanTimeout: Task<Void, Never>?
    private var pendingScan = false
    private var lastPulse: Date?
    private let service = CBUUID(string: "180D"), measurement = CBUUID(string: "2A37")
    static func decode(_ data: Data) -> Int? {
        let bytes = [UInt8](data)
        guard bytes.count >= 2 else { return nil }
        let wide = bytes[0] & 1 != 0
        if wide && bytes.count < 3 { return nil }
        // If contact detection is supported, require sensor contact.
        if bytes[0] & 4 != 0 && bytes[0] & 2 == 0 { return nil }
        let value = wide ? Int(bytes[1]) | Int(bytes[2]) << 8 : Int(bytes[1])
        return (25...250).contains(value) ? value : nil
    }
    func scan() {
        pendingScan = true
        if central == nil { central = CBCentralManager(delegate: self, queue: .main) }
        else if central?.state == .poweredOn { beginScan() }
        else { status = "Enable Bluetooth and allow access in iPhone Settings." }
    }
    private func beginScan() {
        pendingScan = false; devices = []; scanning = true; status = "Looking for Bluetooth heart-rate sensors…"
        central?.scanForPeripherals(withServices: [service])
        scanTimeout?.cancel()
        scanTimeout = Task { [weak self] in
            try? await Task.sleep(for: .seconds(15))
            guard !Task.isCancelled, let self else { return }
            self.stopScan()
            if self.peripheral == nil { self.status = self.devices.isEmpty ? "No sensors found. Wear and wake your sensor, then retry." : "Choose a sensor below." }
        }
    }
    func stopScan() { central?.stopScan(); scanning = false; pendingScan = false }
    func connect(_ device: CBPeripheral) {
        disconnect(); peripheral = device; device.delegate = self; status = "Connecting to \(device.name ?? "sensor")…"; central?.connect(device)
    }
    func disconnect() {
        stopScan(); scanTimeout?.cancel()
        if let peripheral { central?.cancelPeripheralConnection(peripheral) }
        peripheral = nil; devices = []; bpm = nil; lastPulse = nil; status = "No heart-rate sensor connected"
    }
    func expire() { if let lastPulse, Date().timeIntervalSince(lastPulse) > 15 { bpm = nil; status = "Waiting for fresh heart-rate data" } }
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state == .poweredOn && pendingScan { beginScan() }
        else if central.state != .poweredOn { stopScan(); bpm = nil; status = "Bluetooth is unavailable. Check permission and Bluetooth in Settings." }
    }
    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
        if !devices.contains(where: { $0.identifier == peripheral.identifier }) { devices.append(peripheral) }
    }
    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) { peripheral.discoverServices([service]) }
    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) { status = "Couldn’t connect. Retry pairing your sensor." }
    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        guard self.peripheral?.identifier == peripheral.identifier else { return }
        bpm = nil; status = "Sensor disconnected. Reconnect to resume heart-rate recording."
    }
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        for service in peripheral.services ?? [] { peripheral.discoverCharacteristics([measurement], for: service) }
    }
    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        for characteristic in service.characteristics ?? [] where characteristic.uuid == measurement { peripheral.setNotifyValue(true, for: characteristic) }
        status = "Connected to \(peripheral.name ?? "heart-rate sensor")"
    }
    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        guard self.peripheral?.identifier == peripheral.identifier else { return }
        guard error == nil, let data = characteristic.value, let value = Self.decode(data) else { return }
        bpm = value; lastPulse = Date(); onPulse?(value)
    }
}

@MainActor final class RunHealthExport: ObservableObject {
    @Published var status: String?
    @Published var busy = false
    private let health = HKHealthStore()
    func save(_ run: PhoneRecording, includeRoute: Bool) async {
        guard !busy else { return }; busy = true; defer { busy = false }
        guard HKHealthStore.isHealthDataAvailable(), let end = run.endedAt else { status = "Apple Health is unavailable on this device."; return }
        let workoutType = HKObjectType.workoutType(), routeType = HKSeriesType.workoutRoute()
        let heart = HKQuantityType.quantityType(forIdentifier: .heartRate)!
        var share: Set<HKSampleType> = [workoutType, heart]
        if includeRoute { share.insert(routeType) }
        do {
            try await health.requestAuthorization(toShare: share, read: [])
            guard health.authorizationStatus(for: workoutType) == .sharingAuthorized else { status = "Allow workout saving in Apple Health settings, then retry."; return }
            // Stable sync metadata prevents repeated exports from creating duplicate workouts.
            let workout = HKWorkout(activityType: .running, start: run.startedAt, end: end, duration: run.seconds, totalEnergyBurned: nil, totalDistance: HKQuantity(unit: .meter(), doubleValue: run.distance), metadata: [HKMetadataKeySyncIdentifier: "runanalytics:" + run.id.uuidString, HKMetadataKeySyncVersion: 1, HKMetadataKeyIndoorWorkout: false])
            try await health.save(workout)
            if health.authorizationStatus(for: heart) == .sharingAuthorized {
                let samples = (run.pulses ?? []).enumerated().map { index, pulse in
                    HKQuantitySample(type: heart, quantity: HKQuantity(unit: HKUnit.count().unitDivided(by: .minute()), doubleValue: Double(pulse.bpm)), start: pulse.date, end: pulse.date, metadata: [HKMetadataKeySyncIdentifier: "runanalytics:pulse:\(run.id.uuidString):\(index)", HKMetadataKeySyncVersion: 1])
                }
                if !samples.isEmpty { try await health.add(samples, to: workout) }
            }
            if includeRoute, !run.fixes.isEmpty {
                guard health.authorizationStatus(for: routeType) == .sharingAuthorized else { status = "Workout saved. Route permission was declined."; return }
                // Separate route segments are inserted in timestamp order; no synthetic locations.
                for (segment, fixes) in Dictionary(grouping: run.fixes, by: \.segment).sorted(by: { $0.key < $1.key }) {
                    let builder = HKWorkoutRouteBuilder(healthStore: health, device: .local())
                    let locations = fixes.map { CLLocation(coordinate: CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude), altitude: 0, horizontalAccuracy: $0.accuracy, verticalAccuracy: -1, timestamp: $0.timestamp) }
                    try await builder.insertRouteData(locations)
                    _ = try await builder.finishRoute(with: workout, metadata: [HKMetadataKeySyncIdentifier: "runanalytics:route:\(run.id.uuidString):\(segment)", HKMetadataKeySyncVersion: 1])
                }
            }
            status = includeRoute ? "Workout and route saved to Apple Health." : "Workout saved to Apple Health."
        } catch { status = "Apple Health saving did not finish. Check permissions and retry. Your RunAnalytics recording is safe." }
    }
}

@MainActor final class RunLiveActivity {
    private var activity: Activity<RunActivityAttributes>?
    private var lastUpdate = Date.distantPast
    var status: String?
    func update(_ run: PhoneRecording, miles: Bool, force: Bool = false) {
        guard force || Date().timeIntervalSince(lastUpdate) >= 5 else { return }
        lastUpdate = Date()
        let state = RunActivityAttributes.ContentState(distance: run.distance, seconds: run.seconds, running: run.running, miles: miles)
        let content = ActivityContent(state: state, staleDate: Date().addingTimeInterval(30))
        if activity == nil {
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { status = "Live Activities are disabled in iPhone Settings."; return }
            do { activity = try Activity.request(attributes: RunActivityAttributes(runID: run.id.uuidString), content: content, pushType: nil) }
            catch { status = "Lock Screen statistics could not start. Recording continues in the app." }
        } else if let activity { Task { await activity.update(content) } }
    }
    func end() {
        let activities = Activity<RunActivityAttributes>.activities
        activity = nil
        Task { for item in activities { await item.end(nil, dismissalPolicy: .immediate) } }
    }
}
