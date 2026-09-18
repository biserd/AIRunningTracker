import XCTest
@testable import AITracker

final class ContractTests: XCTestCase {
    func testSnapshotUsesExistingCoachContract() throws {
        let fixture = #"{"runner":{"id":105,"name":"Test runner","timezone":"America/New_York","unitPreference":"miles"},"canUseAI":true,"version":1,"state":{"source":"production_account","today":"2026-09-18","goal":"Marathon","days":[{"id":"one","date":"2026-09-19","title":"Easy run","kind":"easy","minutes":40,"completed":false}],"activities":[]}}"#
        let snapshot = try JSONDecoder().decode(Snapshot.self, from: Data(fixture.utf8))
        XCTAssertEqual(snapshot.state.days.first?.minutes, 40)
        XCTAssertTrue(snapshot.canUseAI)
    }
    func testPlanReviewIsNotAConfirmation() throws {
        let fixture = #"{"message":"Review this change","planReview":{"id":"review-id","description":"Easier week","details":{"kind":"adjust"}}}"#
        let answer = try JSONDecoder().decode(Answer.self, from: Data(fixture.utf8))
        XCTAssertEqual(answer.planReview?.id, "review-id")
    }
    func testSignInLinkRejectsUntrustedHosts() throws {
        XCTAssertEqual(try SignInLink.token(from: "https://new.aitracker.run/auth/magic-link?token=sample"), "sample")
        XCTAssertEqual(try SignInLink.token(from: "https://new.aitracker.run/auth/magic-link#token=sample"), "sample")
        for link in ["http://new.aitracker.run/auth/magic-link?token=sample", "https://attacker.test/auth/magic-link?token=sample", "https://new.aitracker.run:444/auth/magic-link?token=sample", "https://new.aitracker.run/preview?token=sample"] {
            XCTAssertThrowsError(try SignInLink.token(from: link))
        }
    }
}
