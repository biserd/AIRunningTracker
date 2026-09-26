import SwiftUI

struct ActivityWeek: Identifiable {
    let start: Date
    let days: [NativeActivityCalendar.Day?] // Sunday at index 0, Saturday at index 6.
    var id: Date { start }
}

enum ActivityContributions {
    static func weeks(_ days: [NativeActivityCalendar.Day]) -> [ActivityWeek] {
        var cal = MileageHistory.calendar
        cal.firstWeekday = 1
        cal.minimumDaysInFirstWeek = 1
        var byDate: [Date: NativeActivityCalendar.Day] = [:]
        for day in days {
            if let date = MileageHistory.date(day.date) { byDate[date] = day }
        }
        guard let first = byDate.keys.min(), let last = byDate.keys.max(),
              var start = cal.dateInterval(of: .weekOfYear, for: first)?.start else { return [] }
        var result: [ActivityWeek] = []
        while start <= last {
            let cells = (0..<7).map { byDate[cal.date(byAdding: .day, value: $0, to: start)!] }
            result.append(ActivityWeek(start: start, days: cells))
            start = cal.date(byAdding: .day, value: 7, to: start)!
        }
        return result
    }
}

struct ActivityContributionCard: View {
    let calendar: NativeActivityCalendar
    private let allWeeks: [ActivityWeek]
    @EnvironmentObject var store: CoachStore
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var showAll = false
    @State private var selected: NativeActivityCalendar.Day?
    @State private var availableWidth: CGFloat = 0

    init(calendar: NativeActivityCalendar) {
        self.calendar = calendar
        allWeeks = ActivityContributions.weeks(calendar.days)
    }
    private var weeks: [ActivityWeek] { showAll ? allWeeks : Array(allWeeks.suffix(12)) }
    private var cell: CGFloat {
        max(28, min(sizeClass == .regular ? 48 : 32, floor((availableWidth - 38) / CGFloat(max(1, weeks.count))) - 4))
    }
    private var maximum: Double { max(1, calendar.days.map(\.totalDistanceKm).filter(\.isFinite).max() ?? 0) }

    var body: some View {
        InsightCard(title: "Activity calendar", symbol: "calendar", color: RunBrand.teal) {
            if weeks.isEmpty { Text("Your activity grid will appear when your runs sync.").foregroundStyle(.secondary) }
            else {
                Picker("Activity history", selection: $showAll) {
                    Text("Last 12 weeks").tag(false)
                    Text("Last 6 months").tag(true)
                }.pickerStyle(.menu).tint(RunBrand.orange).accessibilityIdentifier("activity-history-range")
                Text("Weeks run left to right. Tap a day to open its runs.").font(.callout).foregroundStyle(.secondary)
                HStack(alignment: .top, spacing: 6) {
                    VStack(spacing: 4) {
                        Color.clear.frame(height: 24)
                        ForEach(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], id: \.self) { day in
                            Text(day).font(.caption2).foregroundStyle(.secondary).frame(width: 32, height: cell)
                        }
                    }.accessibilityHidden(true)
                    ScrollView(.horizontal) {
                        HStack(alignment: .top, spacing: 4) {
                            ForEach(Array(weeks.enumerated()), id: \.element.id) { index, week in
                                VStack(spacing: 4) {
                                    Text(monthLabel(week, first: index == 0)).font(.caption2).foregroundStyle(.secondary)
                                        .frame(width: cell, height: 24, alignment: .leading)
                                    ForEach(0..<7, id: \.self) { row in
                                        if let day = week.days[row] { dayButton(day) }
                                        else { Color.clear.frame(width: cell, height: cell).accessibilityHidden(true) }
                                    }
                                }
                            }
                        }.padding(.bottom, 6)
                    }.defaultScrollAnchor(.trailing).accessibilityIdentifier("activity-contribution-grid")
                }.frame(maxWidth: .infinity, alignment: .leading)
                    .background { GeometryReader { proxy in
                        Color.clear.onAppear { availableWidth = proxy.size.width }
                            .onChange(of: proxy.size.width) { _, width in availableWidth = width }
                    } }
                HStack(spacing: 5) {
                    Text("Less")
                    ForEach(0..<5) { level in RoundedRectangle(cornerRadius: 2).fill(RunBrand.teal.opacity(level == 0 ? 0.08 : 0.2 + Double(level) * 0.18)).frame(width: 12, height: 12) }
                    Text("More")
                    Spacer()
                    Text("Daily distance")
                }.font(.caption2).foregroundStyle(.secondary).accessibilityElement(children: .ignore).accessibilityLabel("Darker squares mean more running distance")
                if let selected {
                    Divider()
                    Text(runnerDay(selected.date, today: store.snapshot?.state.today)).font(.headline)
                    if selected.activities.isEmpty { Text("No recorded runs.").foregroundStyle(.secondary) }
                    ForEach(selected.activities) { activity in
                        NavigationLink {
                            RunDetailView(run: runSummary(activity, day: selected))
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: "figure.run").foregroundStyle(RunBrand.orange)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(activity.name).font(.headline).foregroundStyle(.primary)
                                    Text(runnerDistance(activity.distanceKm, units: calendar.unitPreference)).foregroundStyle(.secondary)
                                }
                                Spacer(minLength: 0)
                                Image(systemName: "chevron.right").foregroundStyle(RunBrand.orange)
                            }.padding(12).frame(maxWidth: .infinity, minHeight: 52, alignment: .leading)
                                .background(RunBrand.orange.opacity(0.07), in: RoundedRectangle(cornerRadius: 12))
                                .contentShape(Rectangle())
                        }.buttonStyle(.plain).accessibilityIdentifier("calendar-run-\(activity.id)")
                    }
                }
            }
        }.onChange(of: showAll) { _, _ in selected = nil }
    }
    private func dayButton(_ day: NativeActivityCalendar.Day) -> some View {
        let distance = day.totalDistanceKm.isFinite ? max(0, day.totalDistanceKm) : 0
        return Button { selected = day } label: {
            RoundedRectangle(cornerRadius: 5)
                .fill(RunBrand.teal.opacity(distance > 0 ? 0.2 + 0.72 * min(1, distance / maximum) : 0.08))
                .overlay(RoundedRectangle(cornerRadius: 5).strokeBorder(selected?.id == day.id ? RunBrand.orange : .clear, lineWidth: 3))
                .frame(width: cell, height: cell)
        }.buttonStyle(.plain)
            .accessibilityIdentifier("activity-day-\(day.date)")
            .accessibilityLabel("\(day.date), \(runnerDistance(distance, units: calendar.unitPreference)), \(day.activities.count) runs")
            .accessibilityAddTraits(selected?.id == day.id ? .isSelected : [])
    }
    private func monthLabel(_ week: ActivityWeek, first: Bool) -> String {
        let day = first ? week.days.compactMap { $0 }.first : week.days.compactMap { $0 }.first { $0.date.hasSuffix("-01") }
        guard let key = day?.date, let date = MileageHistory.date(key) else { return "" }
        return MileageHistory.label(date, template: "MMM")
    }
    private func runSummary(_ activity: NativeActivityCalendar.Activity, day: NativeActivityCalendar.Day) -> RunSummary {
        store.snapshot?.state.activities?.first { $0.id == activity.id }
            ?? RunSummary(id: activity.id, name: activity.name, date: day.date, km: activity.distanceKm, minutes: 0)
    }
}
