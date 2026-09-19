import XCTest
@testable import AITracker
final class InsightTests:XCTestCase {
    func testPartialAnalyticsRetainAvailableData() throws {
        let json=#"{"predictions":[{"distance":"5K","predictedTime":"24:12","confidence":75}],"vo2Max":null,"efficiency":{"averageCadence":168,"runsAnalyzed":8},"hrZones":{"heartRateZones":{"zone1":{"min":100,"max":120,"name":"Recovery"}}},"unavailable":["vo2Max"]}"#
        let value=try JSONDecoder().decode(InsightAnalytics.self,from:Data(json.utf8))
        XCTAssertEqual(value.predictions?.first?.predictedTime,"24:12")
        XCTAssertNil(value.vo2Max)
        XCTAssertNil(value.efficiency?.efficiency)
        XCTAssertEqual(value.hrZones?.heartRateZones?["zone1"]?.min,100)
    }
    func testFreeAccountResponseAndNullableRecaps() throws {
        let value=try JSONDecoder().decode(InsightAnalytics.self,from:Data(#"{"predictions":[],"entitlements":{"advanced_insights":false}}"#.utf8))
        XCTAssertEqual(value.entitlements?["advanced_insights"],false)
        let recaps=try JSONDecoder().decode(InsightRecaps.self,from:Data(#"{"recaps":[{"id":1,"activityName":null,"coachingCue":null}]}"#.utf8))
        XCTAssertNil(recaps.recaps.first?.coachingCue)
    }
    @MainActor func testReadPathsAreNarrow() {
        XCTAssertTrue(CoachAPI.isInsightReadPath("/api/analytics/batch/105"))
        XCTAssertTrue(CoachAPI.isInsightReadPath("/api/coach-recaps"))
        XCTAssertFalse(CoachAPI.isInsightReadPath("/api/coach-recaps/1/viewed"))
        XCTAssertFalse(CoachAPI.isInsightReadPath("/api/analytics/batch/105?user=2"))
        XCTAssertFalse(CoachAPI.isInsightReadPath("/api/performance/recovery/../2"))
    }
}
