import XCTest
@testable import AITracker
final class ScheduleTests:XCTestCase {
    func testDistanceOnlyWorkoutIsNotRest() throws {
        let data=Data(#"{"id":"1","date":"2026-09-19","title":"Easy run","kind":"easy","minutes":0,"completed":false,"distanceKm":8}"#.utf8)
        let day=try JSONDecoder().decode(Workout.self,from:data)
        XCTAssertEqual(workoutSummary(day,units:"km"),"8.0 km · Easy")
        XCTAssertEqual(workoutSummary(day,units:"miles"),"5.0 mi · Easy")
    }
    func testSnapshotAcceptsMainBackendWithoutVersion() throws {
        let data=Data(#"{"runner":{"id":1,"name":"Runner","timezone":"UTC","unitPreference":"km"},"canUseAI":true,"state":{"today":"2026-09-19","goal":"Run","days":[],"activities":[]}}"#.utf8)
        XCTAssertNil(try JSONDecoder().decode(Snapshot.self,from:data).version)
    }
}
