import XCTest
@testable import AITracker

final class PhoneRunRecorderTests: XCTestCase {
    let start = Date(timeIntervalSince1970: 1_790_000_000)
    func testDistanceRejectsStaleFixesAndJumpsAndDoesNotBridgePause() {
        var run = PhoneRecording(now: start)
        XCTAssertFalse(run.add(latitude: 40, longitude: -73, accuracy: 80, at: start, now: start))
        XCTAssertFalse(run.add(latitude: 40, longitude: -73, accuracy: 5, at: start.addingTimeInterval(-100), now: start))
        XCTAssertTrue(run.add(latitude: 40, longitude: -73, accuracy: 5, at: start, now: start))
        XCTAssertTrue(run.add(latitude: 40.0001, longitude: -73, accuracy: 5, at: start.addingTimeInterval(5), now: start.addingTimeInterval(5)))
        XCTAssertEqual(run.distance, 11.12, accuracy: 0.1)
        XCTAssertFalse(run.add(latitude: 42, longitude: -73, accuracy: 5, at: start.addingTimeInterval(6), now: start.addingTimeInterval(6)))
        run.pause(at: start.addingTimeInterval(10))
        run.resume(at: start.addingTimeInterval(100))
        XCTAssertTrue(run.add(latitude: 41, longitude: -73, accuracy: 5, at: start.addingTimeInterval(105), now: start.addingTimeInterval(105)))
        XCTAssertEqual(run.distance, 11.12, accuracy: 0.1)
        XCTAssertEqual(run.seconds, 15)
    }
    func testGPSGapBreaksRouteAndRecoveryPreservesOnlyCheckpointTime() throws {
        var run = PhoneRecording(now: start)
        _ = run.add(latitude: 40, longitude: -73, accuracy: 5, at: start, now: start)
        _ = run.add(latitude: 41, longitude: -73, accuracy: 5, at: start.addingTimeInterval(60), now: start.addingTimeInterval(60))
        XCTAssertEqual(run.distance, 0)
        XCTAssertNotEqual(run.fixes[0].segment, run.fixes[1].segment)
        let restored = try JSONDecoder().decode(PhoneRecording.self, from: JSONEncoder().encode(run))
        XCTAssertEqual(restored.id, run.id)
        XCTAssertEqual(restored.seconds, 60)
        XCTAssertEqual(restored.fixes, run.fixes)
        XCTAssertNil(restored.body["fixes"], "GPS route is not uploaded with a summary")
    }
    @MainActor func testUnfinishedRunRecoveryAndAccountSwitchingStayIsolated() throws {
        let owner=UUID().uuidString,other=UUID().uuidString
        let root=try FileManager.default.url(for:.applicationSupportDirectory,in:.userDomainMask,appropriateFor:nil,create:true).appendingPathComponent("RunRecordings")
        let folder=root.appendingPathComponent(owner)
        try FileManager.default.createDirectory(at:folder,withIntermediateDirectories:true)
        defer { try? FileManager.default.removeItem(at:folder);try? FileManager.default.removeItem(at:root.appendingPathComponent(other)) }
        var run=PhoneRecording(now:start);run.advance(to:start.addingTimeInterval(60))
        try JSONEncoder().encode(run).write(to:folder.appendingPathComponent("draft.json"))
        let recorder=PhoneRunRecorder();recorder.selectAccount(owner)
        XCTAssertEqual(recorder.draft?.seconds,60)
        XCTAssertEqual(recorder.draft?.running,false)
        recorder.selectAccount(other)
        XCTAssertNil(recorder.draft);XCTAssertTrue(recorder.saved.isEmpty)
        recorder.selectAccount(owner)
        XCTAssertEqual(recorder.draft?.id,run.id)
        XCTAssertEqual(recorder.draft?.seconds,60)
    }
    func testSplitsInterpolateBoundariesAndRetainPartialDistance() {
        var run=PhoneRecording(now:start)
        run.distance=2500;run.seconds=1500
        run.progress=[RunProgress(distance:0,seconds:0),RunProgress(distance:1500,seconds:900),RunProgress(distance:2500,seconds:1500)]
        let splits=run.splits(unit:1000)
        XCTAssertEqual(splits.map(\.distance),[1000,1000,500])
        XCTAssertEqual(splits.map(\.seconds),[600,600,300])
        XCTAssertEqual(splits.reduce(0){$0+$1.seconds},run.seconds)
        run.lapMarks=[RunProgress(distance:800,seconds:500),RunProgress(distance:2000,seconds:1250)]
        XCTAssertEqual(run.laps.map(\.distance),[800,1200])
        XCTAssertEqual(run.laps.map(\.seconds),[500,750])
    }
    func testLegacyRecordingStillDecodesWithoutNewFields() throws {
        let original=PhoneRecording(now:start)
        let restored=try JSONDecoder().decode(PhoneRecording.self,from:JSONEncoder().encode(original))
        XCTAssertNil(restored.progress);XCTAssertNil(restored.effort);XCTAssertNil(restored.notes)
        XCTAssertNil(restored.averageHeartRate)
        XCTAssertNil(restored.body["fixes"])
        XCTAssertNil(restored.body["pulses"])
    }
    @MainActor func testBluetoothHeartRateDecodesWideValuesAndRejectsLostContactOrTruncatedData() {
        XCTAssertEqual(RunHeartRate.decode(Data([0,150])),150)
        XCTAssertEqual(RunHeartRate.decode(Data([1,200,0])),200)
        XCTAssertNil(RunHeartRate.decode(Data([1,150])))
        XCTAssertNil(RunHeartRate.decode(Data([4,150])))
        XCTAssertEqual(RunHeartRate.decode(Data([6,150])),150)
        XCTAssertNil(RunHeartRate.decode(Data([0,0])))
    }
}
