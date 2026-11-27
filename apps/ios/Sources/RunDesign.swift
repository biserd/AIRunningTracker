import SwiftUI

/// Shared Run Analytics surfaces and action roles from the native Figma library.
enum RunDesign {
    static let canvas = Color("RunCanvas")
    static let surface = Color("RunSurface")
    static let inset = Color("RunSoftSurface")
    static let highlight = Color("RunHighlight")
    static let action = Color("RunAction")
    static let actionLabel = Color("RunActionLabel")
    static let recovery = Color("RunRecoverySurface")
    static let trend = Color("RunTrend")
    static let mutedText = Color("RunMutedText")
    static let minimumTarget: CGFloat = 44
    static let actionHeight: CGFloat = 52
    static let radius: CGFloat = 14
    static let panelRadius: CGFloat = 20
    static let gap: CGFloat = 12
    static let insetPadding: CGFloat = 16
    static let readableWidth: CGFloat = 760
}

/// Styling only: Button still supplies system focus, roles and accessibility traits.
struct RunActionStyle: ButtonStyle {
    enum Prominence { case primary, secondary }
    var prominence: Prominence = .primary
    @Environment(\.isEnabled) private var enabled

    func makeBody(configuration: Configuration) -> some View {
        let primary = prominence == .primary && enabled
        configuration.label
            .font(.headline)
            .multilineTextAlignment(.center)
            .padding(.horizontal, RunDesign.gap)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, minHeight: RunDesign.actionHeight)
            .foregroundStyle(primary ? RunDesign.actionLabel : enabled ? Color.primary : Color.secondary)
            .background(primary ? RunDesign.action : RunDesign.inset, in: RoundedRectangle(cornerRadius: RunDesign.radius))
            .opacity(configuration.isPressed ? 0.83 : 1)
            .contentShape(.interaction, RoundedRectangle(cornerRadius: RunDesign.radius))
    }
}

struct RunMetricTile: View {
    let title: String
    let value: String
    var detail: String? = nil
    var prominent = false
    @ScaledMetric(relativeTo: .largeTitle) private var displaySize = 50.0

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.caption).foregroundStyle(RunDesign.mutedText)
                .textCase(.uppercase)
            Text(value)
                .font(prominent ? .system(size: displaySize, weight: .bold) : .title2.bold())
                .monospacedDigit()
                .fixedSize(horizontal: false, vertical: true)
            if let detail { Text(detail).font(.footnote).foregroundStyle(RunDesign.mutedText) }
        }
        .padding(RunDesign.insetPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(prominent ? RunDesign.highlight : RunDesign.surface, in: RoundedRectangle(cornerRadius: RunDesign.radius))
        .accessibilityElement(children: .contain)
        .accessibilityLabel(title)
    }
}
