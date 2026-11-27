import SwiftUI

struct PlanReviewCard: View {
    let review: Review
    let working: Bool
    let apply: () -> Void
    let keepCurrent: () -> Void

    private var creating: Bool { review.details?.kind == "create" }

    var body: some View {
        VStack(alignment: .leading, spacing: RunDesign.gap) {
            Label(creating ? "Review new plan" : "Review plan change", systemImage: "calendar.badge.clock")
                .font(.title3.bold())
                .accessibilityAddTraits(.isHeader)
            Text("Nothing changes until you confirm.").font(.callout).foregroundStyle(RunDesign.mutedText)
            Text(review.description)
                .fixedSize(horizontal: false, vertical: true)
            if let details = review.details {
                detailsList(details)
                    .font(.callout)
            }
            Button(action: apply) {
                if working { ProgressView("Saving plan…").tint(.primary) }
                else { Text(creating ? "Create plan" : "Apply change") }
            }
            .buttonStyle(RunActionStyle())
            .accessibilityIdentifier("apply-plan-review")
            .disabled(working)
            Button("Keep current plan", role: .cancel, action: keepCurrent)
                .buttonStyle(RunActionStyle(prominence: .secondary))
                .accessibilityIdentifier("keep-current-plan")
                .disabled(working)
        }
        .padding(RunDesign.insetPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RunDesign.highlight, in: RoundedRectangle(cornerRadius: RunDesign.panelRadius))
    }

    @ViewBuilder private func detailsList(_ details: Review.Details) -> some View {
        switch details.kind {
        case "create":
            if let date = details.raceDate { row("Race date", displayDate(date)) }
            if let days = details.preferredRunDays, !days.isEmpty {
                row("Running days", days.map { $0.capitalized }.formatted(.list(type: .and)))
            }
            if let hours = details.maxWeeklyHours { row("Weekly maximum", "\(hours.formatted()) hours") }
        case "workout":
            if details.operation == "move", let date = details.date { row("Move to", displayDate(date)) }
            if details.operation == "shorten", let duration = details.minutes {
                row("New duration", "\(duration) minutes")
            }
        case "settings":
            if let date = details.raceDate { row("Race date", displayDate(date)) }
            if let time = details.targetTime { row("Target time", time) }
        default:
            EmptyView() // The server description remains authoritative.
        }
    }
    private func displayDate(_ value: String) -> String {
        MileageHistory.date(value).map { MileageHistory.label($0, template: "EEEEMMMMdyyyy") } ?? value
    }
    private func row(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).foregroundStyle(RunDesign.mutedText)
            Text(value).fontWeight(.semibold)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}
