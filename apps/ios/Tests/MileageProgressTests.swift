import XCTest
@testable import AITracker

final class MileageProgressTests: XCTestCase {
    private func day(_ date: String, _ km: Double = 0) -> NativeActivityCalendar.Day {
        .init(date: date, totalDistanceKm: km, activities: km > 0 ? [.init(id: 1, name: "Run", distanceKm: km)] : [])
    }
    private func days(_ start: String, count: Int) -> [NativeActivityCalendar.Day] {
        let formatter = DateFormatter()
        formatter.calendar = MileageHistory.calendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = MileageHistory.calendar.timeZone
        formatter.dateFormat = "yyyy-MM-dd"
        return (0..<count).map {
            day(formatter.string(from: MileageHistory.calendar.date(byAdding: .day, value: $0, to: MileageHistory.date(start)!)!))
        }
    }
    func testMondayWeeksCrossYearAndPreserveZeroWeeks() throws {
        var input = days("2025-12-29", count: 21)
        input[0] = day("2025-12-29", 5)
        input[6] = day("2026-01-04", 10)
        input[20] = day("2026-01-18", 3)
        let result = MileageHistory.buckets(days: input.reversed(), period: .weekly)
        XCTAssertEqual(result.count, 3)
        XCTAssertEqual(result.map(\.distanceKm), [15, 0, 3])
        XCTAssertEqual(result.map(\.runs), [2, 0, 1])
        XCTAssertEqual(result.map(\.isIncomplete), [false, false, false])
        XCTAssertEqual(result.map(\.isCurrent), [false, false, true])
        XCTAssertEqual(result[1].start, MileageHistory.date("2026-01-05"))
    }
    func testLeapMonthAndMilesConversion() throws {
        var input = days("2024-02-01", count: 30)
        input[28] = day("2024-02-29", 10)
        input[29] = day("2024-03-01", 2)
        let result = MileageHistory.buckets(days: input, period: .monthly)
        XCTAssertEqual(result.map(\.distanceKm), [10, 2])
        XCTAssertFalse(result[0].isIncomplete)
        XCTAssertEqual(result[0].distance(units: "miles"), 6.21371, accuracy: 0.00001)
        XCTAssertEqual(result[0].distance(units: "km"), 10)
    }
    func testLimitsTwelveWeeksAndSixMonths() {
        let input = days("2026-01-01", count: 269)
        XCTAssertEqual(MileageHistory.buckets(days: input, period: .weekly).count, 12)
        let monthly = MileageHistory.buckets(days: input, period: .monthly)
        XCTAssertEqual(monthly.count, 6)
        XCTAssertEqual(monthly.first?.start, MileageHistory.date("2026-04-01"))
    }
    func testUTCWeeksUnaffectedByDaylightSaving() throws {
        let result = MileageHistory.buckets(days: days("2026-03-02", count: 14), period: .weekly)
        XCTAssertEqual(result.count, 2)
        XCTAssertEqual(result[0].end.timeIntervalSince(result[0].start), 7 * 86400)
        XCTAssertFalse(result[0].isIncomplete)
    }
    func testMissingDaysNotRepresentedAsCompleteHistory() {
        let result = MileageHistory.buckets(days: [day("2026-09-23", 4), day("2026-09-25", 6)], period: .weekly)
        XCTAssertEqual(result.count, 1)
        XCTAssertTrue(result[0].isIncomplete)
        XCTAssertEqual(result[0].distanceKm, 10)
    }
    func testNoFabricatedHistoryInvalidDatesOrDoubleCounting() {
        XCTAssertTrue(MileageHistory.buckets(days: [], period: .weekly).isEmpty)
        let invalid = [day("bad", 10), day("2026-02-30", 10), day("2026-09-26", .nan), day("2026-09-25", -1)]
        XCTAssertTrue(MileageHistory.buckets(days: invalid, period: .monthly).isEmpty)
        let result = MileageHistory.buckets(days: [day("2026-09-25", 5), day("2026-09-25", 5)], period: .weekly)
        XCTAssertEqual(result[0].distanceKm, 5)
        XCTAssertEqual(result[0].runs, 1)
    }
}
