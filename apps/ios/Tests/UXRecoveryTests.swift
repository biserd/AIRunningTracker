import XCTest
@testable import AITracker

final class UXRecoveryTests: XCTestCase {
    func testTransportFailuresAllowManualRetry() {
        XCTAssertTrue(SignInRecovery.canRetry(URLError(.networkConnectionLost)))
        XCTAssertTrue(SignInRecovery.canRetry(URLError(.timedOut)))
        XCTAssertTrue(SignInRecovery.canRetry(APIError.server(503, "Unavailable")))
        XCTAssertFalse(SignInRecovery.canRetry(APIError.server(401, "Expired")))
        XCTAssertFalse(SignInRecovery.canRetry(APIError.server(400, "Invalid link")))
        XCTAssertFalse(SignInRecovery.canRetry(CancellationError()))
    }
    func testCalendarDaysDoNotShiftWithTimezone() {
        XCTAssertEqual(runnerDay("2026-09-19", today: "2026-09-19"), "Today")
        XCTAssertEqual(runnerDay("2026-09-18", today: "2026-09-19"), "Yesterday")
        XCTAssertEqual(runnerDay("2026-09-20", today: "2026-09-19"), "Tomorrow")
        XCTAssertEqual(runnerDay("2026-08-31", today: "2026-09-01"), "Yesterday")
        XCTAssertEqual(runnerDay("invalid"), "invalid")
    }
    func testNavigationKeepsPushCompatibility() {
        XCTAssertEqual(CoachSection.allCases.map(\.title), ["Coach", "Plan", "Progress", "Settings"])
        XCTAssertEqual(CoachSection.schedule.rawValue, "schedule")
    }
}
