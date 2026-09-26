import XCTest
@testable import AITracker

final class ActivityContributionTests: XCTestCase {
    private func day(_ date: String) -> NativeActivityCalendar.Day { .init(date: date, totalDistanceKm: 0, activities: []) }
    func testSundayFirstColumnsAndChronologicalWeeks() {
        let weeks = ActivityContributions.weeks([day("2026-09-07"), day("2026-09-01"), day("2026-09-06"), day("2026-09-05")])
        XCTAssertEqual(weeks.count, 2)
        XCTAssertEqual(weeks[0].start, MileageHistory.date("2026-08-30"))
        XCTAssertEqual(weeks[0].days.count, 7)
        XCTAssertNil(weeks[0].days[0])
        XCTAssertEqual(weeks[0].days[2]?.date, "2026-09-01") // Tuesday, not a column header.
        XCTAssertEqual(weeks[0].days[6]?.date, "2026-09-05")
        XCTAssertEqual(weeks[1].days[0]?.date, "2026-09-06")
        XCTAssertEqual(weeks[1].days[1]?.date, "2026-09-07")
        XCTAssertNil(weeks[1].days[2]) // No invented future activity.
    }
    func testMissingWeeksStayAlignedAcrossNewYear() {
        let weeks = ActivityContributions.weeks([day("2025-12-31"), day("2026-01-14")])
        XCTAssertEqual(weeks.count, 3)
        XCTAssertTrue(weeks[1].days.allSatisfy { $0 == nil })
        XCTAssertEqual(weeks[0].days[3]?.date, "2025-12-31")
        XCTAssertEqual(weeks[2].days[3]?.date, "2026-01-14")
    }
    func testLeapDayAndInvalidInput() {
        let weeks = ActivityContributions.weeks([day("2024-02-29"), day("invalid")])
        XCTAssertEqual(weeks.count, 1)
        XCTAssertEqual(weeks[0].days[4]?.date, "2024-02-29")
        XCTAssertTrue(ActivityContributions.weeks([]).isEmpty)
        XCTAssertTrue(ActivityContributions.weeks([day("2026-02-30")]).isEmpty)
    }
}
