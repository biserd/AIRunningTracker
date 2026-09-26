import SwiftUI
import Charts

struct MileageProgressCard: View {
    let calendar: NativeActivityCalendar
    private let weekly, monthly: [MileageBucket]
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var period = MileagePeriod.weekly
    @State private var selection: Int?

    init(calendar: NativeActivityCalendar) {
        self.calendar = calendar
        weekly = MileageHistory.buckets(days: calendar.days, period: .weekly)
        monthly = MileageHistory.buckets(days: calendar.days, period: .monthly)
    }

    private var buckets: [MileageBucket] { period == .weekly ? weekly : monthly }
    private var unit: String { calendar.unitPreference == "miles" ? "mi" : "km" }
    private var selectedIndex: Int { min(max(selection ?? (buckets.count - 1), 0), max(buckets.count - 1, 0)) }

    var body: some View {
        InsightCard(title: "Running distance", symbol: "chart.bar.xaxis", color: RunBrand.orange) {
            Picker("Distance period", selection: $period) {
                ForEach(MileagePeriod.allCases) { Text($0.rawValue).tag($0) }
            }.pickerStyle(.segmented).accessibilityIdentifier("mileage-period")
            if buckets.isEmpty {
                Text("Your weekly and monthly distance will appear after your runs sync.")
                    .foregroundStyle(.secondary)
            } else {
                let bucket = buckets[selectedIndex]
                VStack(alignment: .leading, spacing: 4) {
                    Text(runnerDistance(bucket.distanceKm, units: calendar.unitPreference))
                        .font(.largeTitle.bold()).foregroundStyle(RunBrand.orange)
                        .accessibilityIdentifier("mileage-selected-total")
                    Text(detail(bucket)).font(.subheadline).foregroundStyle(.secondary)
                        .accessibilityIdentifier("mileage-selected-period")
                    if bucket.isIncomplete {
                        Text("Partial history · available synced runs only").font(.caption).foregroundStyle(.secondary)
                    }
                }.frame(maxWidth: .infinity, alignment: .leading)
                chart
                Text(period == .weekly ? "Tap a week · Monday–Sunday" : "Tap a month to see its total")
                    .font(.caption).foregroundStyle(.secondary)
                Text("Synced runs · \(unit) · same UTC dates as your activity calendar")
                    .font(.caption2).foregroundStyle(.secondary)
            }
        }.onChange(of: period) { _, _ in selection = nil }
            .onChange(of: calendar.days.last?.date) { _, _ in selection = nil }
    }

    private var chart: some View {
        Chart(Array(buckets.enumerated()), id: \.element.id) { index, bucket in
            BarMark(x: .value("Period", index), y: .value("Distance", bucket.distance(units: calendar.unitPreference)))
                .foregroundStyle(index == selectedIndex ? RunBrand.orange : RunBrand.orange.opacity(0.4))
                .cornerRadius(4)
                .accessibilityLabel(detail(bucket))
                .accessibilityValue(runnerDistance(bucket.distanceKm, units: calendar.unitPreference))
        }
        .chartXScale(domain: -0.5...(Double(max(0, buckets.count - 1)) + 0.5))
        .chartYScale(domain: 0...max(1, (buckets.map { $0.distance(units: calendar.unitPreference) }.max() ?? 0) * 1.15))
        .chartXSelection(value: $selection)
        .chartXAxis {
            AxisMarks(values: tickIndices) { value in
                if let index = value.as(Int.self), buckets.indices.contains(index) {
                    AxisValueLabel {
                        Text(MileageHistory.label(buckets[index].start, template: period == .weekly ? "MMMd" : "MMM"))
                            .font(.caption2)
                    }
                }
            }
        }
        .chartYAxis { AxisMarks(position: .leading) { _ in AxisGridLine(); AxisValueLabel() } }
        .frame(height: sizeClass == .regular ? 240 : 190)
        .accessibilityIdentifier("mileage-chart")
    }

    private var tickIndices: [Int] {
        let step = period == .weekly && sizeClass != .regular ? 3 : (period == .weekly ? 2 : 1)
        return Array(stride(from: 0, to: buckets.count, by: step))
    }

    private func detail(_ bucket: MileageBucket) -> String {
        let title: String
        if bucket.isCurrent {
            title = period == .weekly ? "This week so far" : "This month so far"
        } else {
            title = period == .weekly
                ? "Week of \(MileageHistory.label(bucket.start, template: "MMMdyyyy"))"
                : MileageHistory.label(bucket.start, template: "MMMMyyyy")
        }
        return "\(title) · \(bucket.runs) \(bucket.runs == 1 ? "run" : "runs")"
    }
}
