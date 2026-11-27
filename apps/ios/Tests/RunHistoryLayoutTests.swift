import XCTest
@testable import AITracker

final class RunHistoryLayoutTests: XCTestCase {
    func testSplitUsesAvailableWidthAndFallsBackForAccessibilityText() {
        XCTAssertFalse(RunHistoryLayout.usesSplit(width: 500, accessibilitySize: false))
        XCTAssertFalse(RunHistoryLayout.usesSplit(width: 719, accessibilitySize: false))
        XCTAssertTrue(RunHistoryLayout.usesSplit(width: 720, accessibilitySize: false))
        XCTAssertTrue(RunHistoryLayout.usesSplit(width: 1040, accessibilitySize: false))
        XCTAssertFalse(RunHistoryLayout.usesSplit(width: 1040, accessibilitySize: true))
        XCTAssertEqual(RunHistoryLayout.listWidth(for: 720), 256)
        XCTAssertEqual(RunHistoryLayout.listWidth(for: 1040), 320)
    }

    func testNavigationIdentityIsTheRunIDNotTheRefreshedTitle() {
        let original = RunSummary(id: 42, name: "Original title", date: "2026-11-21", km: 10, minutes: 60)
        let refreshed = RunSummary(id: 42, name: "Updated title", date: "2026-11-21", km: 10.1, minutes: 61)
        let other = RunSummary(id: 43, name: "Original title", date: "2026-11-21", km: 10, minutes: 60)
        let cached = RunHistoryItem(run: original)
        XCTAssertEqual(cached, RunHistoryItem(run: refreshed))
        XCTAssertNotEqual(cached, RunHistoryItem(run: other))
        XCTAssertEqual(cached.run.name, "Original title")
        XCTAssertEqual(Set([cached, RunHistoryItem(run: refreshed), RunHistoryItem(run: other)]).count, 2)
    }
}
