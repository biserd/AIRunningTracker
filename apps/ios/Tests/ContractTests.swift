import XCTest
@testable import AITracker

final class ContractTests: XCTestCase {
    @MainActor func testSignOutCleanupCannotClearANewerLogin() throws {
        defer { try? SessionVault.clear() }
        try SessionVault.save(SavedSession(token: "old-test-session", expires: Date().addingTimeInterval(300)))
        let api = CoachAPI()
        try api.restore()
        let cleanup = api.signOutCleanupClient()
        try api.clear()
        XCTAssertNil(api.credential)
        XCTAssertNil(try SessionVault.load())
        XCTAssertEqual(cleanup.credential?.token, "old-test-session")
        try SessionVault.save(SavedSession(token: "new-test-session", expires: Date().addingTimeInterval(300)))
        try cleanup.clear()
        XCTAssertEqual(try SessionVault.load()?.token, "new-test-session")
    }
    func testSignInRejectsAmbiguousOrEmptyTokens() {
        for suffix in ["", "?token=", "?token=a&token=b", "?token=a#token=b", "#token=a&token=b"] {
            XCTAssertThrowsError(try SignInLink.token(from: "https://new.aitracker.run/auth/magic-link" + suffix))
        }
    }
    @MainActor func testColdStartQueuesLinkAndRejectsForeignURL() {
        let store = CoachStore()
        store.receiveSignInLink(URL(string: "https://new.aitracker.run/auth/magic-link#token=test")!)
        XCTAssertTrue(store.loading)
        XCTAssertFalse(store.busy)
        XCTAssertNil(store.error)
        store.receiveSignInLink(URL(string: "https://example.com/auth/magic-link#token=test")!)
        XCTAssertNotNil(store.error)
    }
    func testEmailIsNormalizedBeforeRequest() throws {
        XCTAssertEqual(try SignInEmail.normalize("  Runner@Example.com\n"), "runner@example.com")
        for email in ["", "runner", "runner@", "runner @example.com", "runner@@example.com"] {
            XCTAssertThrowsError(try SignInEmail.normalize(email))
        }
    }
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
