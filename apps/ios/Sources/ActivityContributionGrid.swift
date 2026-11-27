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
    @State private var selectedDate: String?
    @State private var availableWidth: CGFloat = 0

    init(calendar: NativeActivityCalendar) {
        self.calendar = calendar
        allWeeks = ActivityContributions.weeks(calendar.days)
    }
    private var weeks: [ActivityWeek] { showAll ? allWeeks : Array(allWeeks.suffix(12)) }
    private var cell: CGFloat {
        max(RunDesign.minimumTarget, min(sizeClass == .regular ? 56 : 48, floor((availableWidth - 38) / CGFloat(max(1, weeks.count))) - 4))
    }
    private var selected: NativeActivityCalendar.Day? {
        calendar.days.first { $0.date == selectedDate }
    }
    private var maximum: Double { max(1, calendar.days.map(\.totalDistanceKm).filter(\.isFinite).max() ?? 0) }

    var body: some View {
        InsightCard(title: "Activity calendar", symbol: "calendar", color: RunDesign.trend) {
            if weeks.isEmpty { Text("Your activity grid will appear when your runs sync.").foregroundStyle(.secondary) }
            else {
                Picker("Activity history", selection: $showAll) {
                    Text("Last 12 weeks").tag(false)
                    Text("Last 6 months").tag(true)
                }.pickerStyle(.menu).tint(RunDesign.action).accessibilityIdentifier("activity-history-range")
                Text("Swipe to browse weeks. Choose a day to see its runs.").font(.callout).foregroundStyle(.secondary)
                HStack(alignment: .top, spacing: 6) {
                    VStack(spacing: 4) {
                        Color.clear.frame(height: 24)
                        ForEach(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], id: \.self) { day in
                            Text(day).font(.caption2).foregroundStyle(.secondary).frame(width: 32, height: cell)
                        }
                    }.frame(width: 32).accessibilityHidden(true)
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
                    ForEach(0..<5) { level in RoundedRectangle(cornerRadius: 2).fill(RunDesign.trend.opacity(level == 0 ? 0.08 : 0.2 + Double(level) * 0.18)).frame(width: 12, height: 12) }
                    Text("More")
                    Spacer()
                    Text("Daily distance")
                }.font(.caption2).foregroundStyle(.secondary).accessibilityElement(children: .ignore).accessibilityLabel("Stronger color means more running distance")
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
        }.onChange(of: showAll) { _, _ in
            if let selectedDate, !weeks.contains(where: { $0.days.contains(where: { $0?.date == selectedDate }) }) {
                self.selectedDate = nil
            }
        }
    }
    private func dayButton(_ day: NativeActivityCalendar.Day) -> some View {
        let distance = day.totalDistanceKm.isFinite ? max(0, day.totalDistanceKm) : 0
        let isSelected = selectedDate == day.date
        let number = day.date.split(separator: "-").last.flatMap { Int($0) }.map { String($0) } ?? ""
        let shape = RoundedRectangle(cornerRadius: 8)
        return Button { selectedDate = day.date } label: {
            Text(number)
                .font(.caption.monospacedDigit().weight(isSelected ? .bold : .regular))
                .foregroundStyle(.primary)
                .minimumScaleFactor(0.65)
                .lineLimit(1)
                .frame(width: cell, height: cell)
                .background {
                    if isSelected { shape.fill(RunDesign.highlight) }
                    else if distance > 0 {
                        shape.fill(RunDesign.recovery)
                        shape.fill(RunDesign.trend.opacity(0.18 * min(1, distance / maximum)))
                    } else { shape.fill(RunDesign.inset) }
                }
                .overlay(shape.strokeBorder(isSelected ? RunDesign.action : .clear, lineWidth: 2))
                .contentShape(shape)
        }.buttonStyle(.plain)
            .accessibilityIdentifier("activity-day-\(day.date)")
            .accessibilityLabel(runnerDay(day.date, today: store.snapshot?.state.today))
            .accessibilityValue("\(runnerDistance(distance, units: calendar.unitPreference)), \(day.activities.count) \(day.activities.count == 1 ? "run" : "runs")")
            .accessibilityAddTraits(isSelected ? .isSelected : [])
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
