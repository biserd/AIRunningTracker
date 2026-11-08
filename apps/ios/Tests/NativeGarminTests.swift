import XCTest
@testable import AITracker

final class NativeGarminTests: XCTestCase {
    func testRecoveryDecodesNullReadingsAndGarminDatesWithoutInventingValues() throws {
        let json = #"{"status":{"connected":true,"enabled":true,"lastSyncAt":"2026-11-08T20:22:00Z","summaryCount":8},"today":"2026-11-08","metrics":{"sleep":{"value":28860,"date":"2026-11-08","baseline":null,"baselineDays":3,"stale":false,"tentative":true},"hrv":{"value":null,"date":null,"baseline":null,"baselineDays":0,"stale":true,"tentative":false}}}"#
        let result = try JSONDecoder().decode(NativeGarminRecovery.self, from: Data(json.utf8))
        XCTAssertEqual(result.metrics["sleep"]?.date, "2026-11-08")
        XCTAssertEqual(NativeGarminRecovery.Kind.sleep.formatted(result.metrics["sleep"]?.value), "8h 1m")
        XCTAssertTrue(result.metrics["sleep"]?.tentative == true)
        XCTAssertNil(result.metrics["sleep"]?.baseline)
        XCTAssertEqual(result.metrics["sleep"]?.baselineDays, 3)
        XCTAssertNil(result.metrics["hrv"]?.value)
        XCTAssertEqual(NativeGarminRecovery.Kind.hrv.formatted(result.metrics["hrv"]?.value), "Not received")
        XCTAssertNil(result.metrics["bodyBattery"])
    }
    func testRecoveryUsesEachMetricDateAndReportsStaleReadings() throws {
        let value = NativeGarminRecovery.preview
        XCTAssertTrue(value.metrics["restingHeartRate"]?.stale == true)
        XCTAssertEqual(value.metrics["restingHeartRate"]?.date, "2026-11-06")
        XCTAssertEqual(value.metrics["hrv"]?.date, "2026-11-08")
        XCTAssertEqual(NativeGarminRecovery.Kind.hrv.formatted(value.metrics["hrv"]?.value), "42 ms")
        XCTAssertEqual(NativeGarminRecovery.Kind.restingHeartRate.formatted(value.metrics["restingHeartRate"]?.value), "55 bpm")
        XCTAssertEqual(NativeGarminRecovery.Kind.sleepScore.formatted(nil), "Not received")
        XCTAssertEqual(NativeGarminRecovery.Kind.hrv.formatted(42.4), "42.4 ms")
        XCTAssertEqual(NativeGarminRecovery.Kind.hrv.formatted(.infinity), "Not received")
    }
    func testExistingGarminStatusRemainsCompatibleAndIncludesDeliveryCount() throws {
        let legacy = try JSONDecoder().decode(NativeGarminStatus.self, from: Data(#"{"available":true,"connected":true,"status":"connected"}"#.utf8))
        XCTAssertNil(legacy.activityCount)
        let current = try JSONDecoder().decode(NativeGarminStatus.self, from: Data(#"{"available":true,"connected":true,"status":"connected","activityCount":0,"lastSyncAt":null}"#.utf8))
        XCTAssertEqual(current.activityCount, 0)
        XCTAssertNil(current.lastSyncAt)
    }
}
