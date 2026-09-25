import XCTest
@testable import AITracker

final class RunDetailTests:XCTestCase {
    func testPaceUsesRunnerUnits() {
        XCTAssertEqual(runPace(minutes:30,km:5,miles:false),"6:00 /km")
        XCTAssertEqual(runPace(minutes:10,km:1.609344,miles:true),"10:00 /mi")
        XCTAssertEqual(runPace(minutes:10,km:0,miles:false),"Not recorded")
    }
    func testRouteRejectsTruncatedData() {
        XCTAssertTrue(runRoute("_").isEmpty)
        let points=runRoute("_p~iF~ps|U_ulLnnqC_mqNvxq`@")
        XCTAssertEqual(points.count,3)
        XCTAssertEqual(points.first!.latitude,38.5,accuracy:0.00001)
    }
    func testMissingDetailsDecodeWithoutInventingMetrics() throws {
        let response=try JSONDecoder().decode(RunDetailResponse.self,from:Data(#"{"activity":{"locked":true}}"#.utf8))
        XCTAssertNil(response.activity.averageHeartrate)
        XCTAssertTrue(response.activity.laps.isEmpty)
        XCTAssertFalse(response.activity.lapsFetched)
        let unavailable=try JSONDecoder().decode(RunDetailResponse.self,from:Data(#"{"activity":{"lapsData":"{\"status\":\"not_available\"}"}}"#.utf8))
        XCTAssertTrue(unavailable.activity.lapsFetched)
        XCTAssertTrue(unavailable.activity.laps.isEmpty)
    }
    func testScheduleStartsTodayAndSortsDates() throws {
        let json=#"{"today":"2026-09-19","goal":"Run","days":[{"id":"future","date":"2026-09-20","title":"Easy","kind":"easy","minutes":30,"completed":false},{"id":"past","date":"2026-09-18","title":"Rest","kind":"rest","minutes":0,"completed":true},{"id":"today","date":"2026-09-19","title":"Rest","kind":"rest","minutes":0,"completed":false}]}"#
        let state=try JSONDecoder().decode(RunningState.self,from:Data(json.utf8))
        XCTAssertEqual(state.upcomingDays.map(\.id),["today","future"])
    }
    @MainActor func testOnlyNumericActivityReadPathAllowed() {
        XCTAssertTrue(CoachAPI.isInsightReadPath("/api/activities/42"))
        XCTAssertTrue(CoachAPI.isInsightReadPath("/api/activities/42/hydrate"))
        XCTAssertFalse(CoachAPI.isInsightReadPath("/api/activities/42/delete"))
        XCTAssertFalse(CoachAPI.isInsightReadPath("/api/activities/../42"))
        XCTAssertTrue(CoachAPI.isRunPreparationPath("/api/activities/42/hydrate"))
        XCTAssertFalse(CoachAPI.isRunPreparationPath("/api/activities/42/delete"))
        XCTAssertFalse(CoachAPI.isRunPreparationPath("/api/activities/../42/hydrate"))
    }
}
