import ActivityKit
import WidgetKit
import SwiftUI
@main struct RunWidgets: WidgetBundle {
    var body: some Widget { RunActivityWidget() }
}
struct RunActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RunActivityAttributes.self) { context in
            VStack(alignment: .leading, spacing: 10) {
                Label(context.state.running ? "RunAnalytics · Recording" : "RunAnalytics · Paused", systemImage: "figure.run").font(.headline)
                HStack {
                    Text(String(format: "%.2f %@", context.state.distance / (context.state.miles ? 1609.344 : 1000), context.state.miles ? "mi" : "km"))
                    Spacer()
                    Text(duration(context.state.seconds)).monospacedDigit()
                    Spacer()
                    Text(pace(context.state)).monospacedDigit()
                }
                Text("Open RunAnalytics to pause or finish.").font(.caption)
            }.padding().activityBackgroundTint(.black).activitySystemActionForegroundColor(.white).foregroundStyle(.white)
        } dynamicIsland: { context in
            DynamicIsland(expanded: {
                DynamicIslandExpandedRegion(.leading) { Label(context.state.running ? "Recording" : "Paused", systemImage: "figure.run") }
                DynamicIslandExpandedRegion(.trailing) { Text(duration(context.state.seconds)).monospacedDigit() }
                DynamicIslandExpandedRegion(.bottom) { Text(String(format: "%.2f %@ · %@", context.state.distance / (context.state.miles ? 1609.344 : 1000), context.state.miles ? "mi" : "km", pace(context.state))) }
            }, compactLeading: { Image(systemName: "figure.run").foregroundStyle(.orange) },
               compactTrailing: { Text(String(format: "%.1f", context.state.distance / (context.state.miles ? 1609.344 : 1000))) },
               minimal: { Image(systemName: "figure.run") })
        }
    }
    private func duration(_ seconds: Double) -> String { let value = max(0, Int(seconds)); return String(format: "%d:%02d", value / 60, value % 60) }
    private func pace(_ state: RunActivityAttributes.ContentState) -> String {
        guard state.distance > 0 else { return "—" }
        return duration(state.seconds / state.distance * (state.miles ? 1609.344 : 1000)) + (state.miles ? " /mi" : " /km")
    }
}
