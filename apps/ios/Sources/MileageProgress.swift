import Foundation

enum MileagePeriod: String, CaseIterable, Identifiable {
    case weekly = "Weekly", monthly = "Monthly"
    var id: String { rawValue }
    var component: Calendar.Component { self == .weekly ? .weekOfYear : .month }
    var count: Int { self == .weekly ? 12 : 6 }
}

struct MileageBucket: Identifiable {
    let start, end: Date // End is exclusive, even for the current partial period.
    let distanceKm: Double
    let runs: Int
    let isCurrent, isIncomplete: Bool
    var id: Date { start }
    func distance(units: String) -> Double { distanceKm * (units == "miles" ? 0.621371 : 1) }
}

enum MileageHistory {
    // Match the existing activity-calendar API's UTC date keys. Weeks start Monday.
    static var calendar: Calendar {
        var value = Calendar(identifier: .gregorian)
        value.timeZone = TimeZone(secondsFromGMT: 0)!
        value.firstWeekday = 2
        value.minimumDaysInFirstWeek = 4
        return value
    }

    static func date(_ key: String) -> Date? {
        let formatter = dateFormatter()
        guard let date = formatter.date(from: key), formatter.string(from: date) == key else { return nil }
        return date
    }

    private static func dateFormatter() -> DateFormatter {
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = calendar.timeZone
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.isLenient = false
        return formatter
    }

    static func label(_ date: Date, template: String) -> String {
        let formatter = DateFormatter()
        formatter.calendar = calendar
        formatter.timeZone = calendar.timeZone
        formatter.setLocalizedDateFormatFromTemplate(template)
        return formatter.string(from: date)
    }

    static func buckets(days: [NativeActivityCalendar.Day], period: MileagePeriod) -> [MileageBucket] {
        let cal = calendar
        let formatter = dateFormatter()
        var byDate: [Date: NativeActivityCalendar.Day] = [:]
        for day in days {
            guard let date = formatter.date(from: day.date), formatter.string(from: date) == day.date,
                  day.totalDistanceKm.isFinite, day.totalDistanceKm >= 0 else { continue }
            byDate[date] = day // A repeated date must never double-count distance.
        }
        guard let first = byDate.keys.min(), let latest = byDate.keys.max(),
              let current = cal.dateInterval(of: period.component, for: latest)?.start,
              let earliest = cal.date(byAdding: period.component, value: -(period.count - 1), to: current),
              let through = cal.date(byAdding: .day, value: 1, to: latest) else { return [] }
        return (0..<period.count).compactMap { offset in
            guard let start = cal.date(byAdding: period.component, value: offset, to: earliest),
                  let end = cal.date(byAdding: period.component, value: 1, to: start), end > first else { return nil }
            let entries = byDate.filter { $0.key >= start && $0.key < end }
            let expectedDays = cal.dateComponents([.day], from: start, to: min(end, through)).day ?? 0
            return MileageBucket(start: start, end: end,
                distanceKm: entries.values.reduce(0) { $0 + $1.totalDistanceKm },
                runs: entries.values.reduce(0) { $0 + $1.activities.count },
                isCurrent: start == current, isIncomplete: entries.count < expectedDays)
        }
    }
}
