import XCTest
@testable import AITracker

final class RunningProgressTests:XCTestCase {
    func testMissingRecapIsAnEmptyState() throws {
        XCTAssertNil(try JSONDecoder().decode(RunRecapResponse.self,from:Data(#"{"recap":null}"#.utf8)).recap)
    }
    func testSavedAnalysisDecodes() throws {
        let data=Data(#"{"recap":{"recapBullets":["Steady effort"],"coachingCue":"Relax your shoulders","nextStep":"easy","nextStepRationale":"Recover first","confidenceFlags":[]}}"#.utf8)
        let result=try JSONDecoder().decode(RunRecapResponse.self,from:data)
        XCTAssertEqual(result.recap?.recapBullets,["Steady effort"])
    }
    func testCalendarPreservesEmptyDaysAndMonthOrder() throws {
        let data=Data(#"{"days":[{"date":"2026-09-01","totalDistanceKm":0,"activities":[]},{"date":"2026-08-31","totalDistanceKm":5,"activities":[{"id":4,"name":"Easy","distanceKm":5}]}],"maxDistance":5,"unitPreference":"miles"}"#.utf8)
        let result=try JSONDecoder().decode(NativeActivityCalendar.self,from:data)
        XCTAssertEqual(result.months,["2026-08","2026-09"])
        XCTAssertEqual(result.days.first?.totalDistanceKm,0)
        XCTAssertEqual(result.unitPreference,"miles")
    }
    func testScoreKeepsComponentsAndProvisionalState() throws {
        let data=Data(#"{"totalScore":54,"recentRunCount":2,"isProvisional":true,"components":{"consistency":15,"performance":10,"volume":19,"improvement":10},"trends":{"weeklyChange":1,"monthlyChange":2}}"#.utf8)
        let score=try JSONDecoder().decode(NativeRunnerScore.self,from:data)
        XCTAssertEqual(score.totalScore,54)
        XCTAssertTrue(score.isProvisional)
        XCTAssertEqual(score.components.volume,19)
    }
    @MainActor func testOnlyExplicitReadRoutesAllowed() {
        for path in ["/api/activities/42/coach-recap","/api/runner-score/105","/api/activities/heatmap"] { XCTAssertTrue(CoachAPI.isInsightReadPath(path)) }
        for path in ["/api/runner-score/0","/api/runner-score/105/delete","/api/activities/42/coach-recap/generate","/api/activities/heatmap?userId=2"] { XCTAssertFalse(CoachAPI.isInsightReadPath(path)) }
    }
}
