import SwiftUI

/// The breadcrumb holds stable source IDs and the original summary, so a
/// page-one refresh or a width change cannot replace the selected older run.
struct RunHistoryItem<Run: Identifiable>: Hashable where Run.ID: Hashable {
    let run: Run

    static func == (lhs: Self, rhs: Self) -> Bool { lhs.run.id == rhs.run.id }
    func hash(into hasher: inout Hasher) { hasher.combine(run.id) }
}

enum NativeRunRoute: Hashable {
    case history
    case run(RunHistoryItem<NativeRun>)
}

enum ProgressRoute: Hashable {
    case insights
    case history
    case run(RunHistoryItem<RunSummary>)
}

enum RunHistoryLayout {
    static let minimumSplitWidth: CGFloat = 720

    static func usesSplit(width: CGFloat, accessibilitySize: Bool) -> Bool {
        width >= minimumSplitWidth && !accessibilitySize
    }

    static func listWidth(for width: CGFloat) -> CGFloat {
        min(320, max(256, width * 0.32))
    }

    static func progressStackPath(_ path: [ProgressRoute], split: Bool) -> [ProgressRoute] {
        // In the split layout the selected run is shown inside the history
        // destination, rather than as another screen on top of it.
        if split, path.contains(.history), case .some(.run(_)) = path.last { return Array(path.dropLast()) }
        return path
    }
}

/// Only the history panes subdivide the available detail area. The app's
/// existing platform sidebar remains the owner of top-level navigation.
struct RunHistorySplit<History: View, Detail: View>: View {
    let width: CGFloat
    @ViewBuilder var history: History
    @ViewBuilder var detail: Detail

    var body: some View {
        HStack(spacing: 0) {
            history.frame(width: RunHistoryLayout.listWidth(for: width))
            Divider()
            detail.frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(RunDesign.canvas)
        }
    }
}

struct RunHistoryRow: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    let title: String
    let subtitle: String
    let distance: String
    var selected = false

    var body: some View {
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4))
            : AnyLayout(HStackLayout(alignment: .center, spacing: 8))
        layout {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline).foregroundStyle(Color.primary)
                    .fixedSize(horizontal: false, vertical: true)
                if !subtitle.isEmpty {
                    Text(subtitle).font(.footnote).foregroundStyle(RunDesign.mutedText)
                }
            }.frame(maxWidth: .infinity, alignment: .leading)
            Text(distance).font(.subheadline).foregroundStyle(RunDesign.mutedText)
                .fixedSize()
            if selected && !typeSize.isAccessibilitySize {
                Image(systemName: "checkmark").foregroundStyle(RunDesign.action).accessibilityHidden(true)
            }
        }
        .frame(minHeight: RunDesign.minimumTarget)
        .padding(.vertical, 4)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}

struct RunHistoryPlaceholder: View {
    var body: some View {
        ContentUnavailableView("Select a run", systemImage: "figure.run",
                               description: Text("Choose a run to see its details."))
    }
}

#if DEBUG
private struct RunHistoryWidthLimitKey: EnvironmentKey {
    static let defaultValue: CGFloat = .infinity
}

extension EnvironmentValues {
    var runHistoryWidthLimit: CGFloat {
        get { self[RunHistoryWidthLimitKey.self] }
        set { self[RunHistoryWidthLimitKey.self] = newValue }
    }
}

/// Changes the width passed to the history layout policy, not the OS window.
/// The control belongs to the app shell so a navigation destination cannot hide it.
struct RunHistoryWidthFixture: ViewModifier {
    @State private var narrow = false

    @ViewBuilder func body(content: Content) -> some View {
        if ProcessInfo.processInfo.arguments.contains("--test-history-resize") {
            content.environment(\.runHistoryWidthLimit, narrow ? 500 : .infinity)
                .overlay(alignment: .bottomTrailing) {
                    Button(narrow ? "Use full width" : "Use narrow width") { narrow.toggle() }
                        .buttonStyle(.borderedProminent)
                        .frame(minHeight: RunDesign.minimumTarget)
                        .padding()
                        .accessibilityIdentifier("history-test-resize")
                }
        } else {
            content
        }
    }
}
#endif

struct ProgressNavigation: View {
    @EnvironmentObject var store: CoachStore
    @Environment(\.dynamicTypeSize) private var typeSize
    #if DEBUG
    @Environment(\.runHistoryWidthLimit) private var widthLimit
    #endif
    @Binding var path: [ProgressRoute]

    private var canOpenCoachHistory: Bool {
        store.onboarding?.hasAccess == true && store.onboarding?.stravaConnected == true
    }

    var body: some View {
        GeometryReader { geometry in
            let width = availableWidth(geometry.size.width)
            let split = RunHistoryLayout.usesSplit(width: width, accessibilitySize: typeSize.isAccessibilitySize)
            // Keep the same stack alive throughout link pushes, back gestures and
            // resizing. Swapping stacks when the history link appended to the path
            // terminated the app on the iPad simulator.
            NavigationStack(path: stackPath(split: split)) {
                AllSourceProgress()
                    .navigationDestination(for: ProgressRoute.self) { route in
                        if canOpenCoachHistory {
                            switch route {
                            case .insights: RunningProgressView()
                            case .history:
                                if split { wideHistory(width: width) }
                                else { RunHistoryView() }
                            case let .run(item): RunDetailView(run: item.run).id(item.run.id)
                            }
                        }
                    }
            }
        }
        .onChange(of: canOpenCoachHistory) { _, canOpen in
            if !canOpen { path = [] }
        }
    }

    private func stackPath(split: Bool) -> Binding<[ProgressRoute]> {
        Binding(
            get: { RunHistoryLayout.progressStackPath(path, split: split) },
            set: { updated in
                if updated != RunHistoryLayout.progressStackPath(path, split: split) {
                    path = updated
                }
            }
        )
    }

    private func availableWidth(_ width: CGFloat) -> CGFloat {
        #if DEBUG
        min(width, widthLimit)
        #else
        width
        #endif
    }

    private func wideHistory(width: CGFloat) -> some View {
        RunHistorySplit(width: width) {
            RunHistoryView(selection: selectedID) { run in
                let history = RunHistoryLayout.progressStackPath(path, split: true)
                path = history + [.run(.init(run: run))]
            }
        } detail: {
            if case let .run(item)? = path.last {
                RunDetailView(run: item.run, embeddedInHistory: true).id(item.run.id)
            } else {
                RunHistoryPlaceholder()
            }
        }
        .navigationTitle("Run history")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var selectedID: Int? {
        if case let .run(item)? = path.last { return item.run.id }
        return nil
    }
}
