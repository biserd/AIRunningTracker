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

/// Drives a real max-width proposal for the history content in UI tests,
/// without pretending that a simulator can resize a Stage Manager window.
struct RunHistoryWidthFixture: ViewModifier {
    #if DEBUG
    @State private var narrow = false
    #endif

    @ViewBuilder func body(content: Content) -> some View {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--test-history-resize") {
            VStack(spacing: 0) {
                content.frame(maxWidth: narrow ? 500 : .infinity)
                    .frame(maxWidth: .infinity)
                Button(narrow ? "Use full width" : "Use narrow width") { narrow.toggle() }
                    .frame(minHeight: RunDesign.minimumTarget)
                    .accessibilityIdentifier("history-test-resize")
            }
        } else {
            content
        }
        #else
        content
        #endif
    }
}

struct ProgressNavigation: View {
    @EnvironmentObject var store: CoachStore
    @Environment(\.dynamicTypeSize) private var typeSize
    @Binding var path: [ProgressRoute]

    private var canOpenCoachHistory: Bool {
        store.onboarding?.hasAccess == true && store.onboarding?.stravaConnected == true
    }

    var body: some View {
        GeometryReader { geometry in
            if !canOpenCoachHistory {
                NavigationStack { AllSourceProgress() }
            } else if path.contains(.history),
               RunHistoryLayout.usesSplit(width: geometry.size.width, accessibilitySize: typeSize.isAccessibilitySize) {
                NavigationStack {
                    RunHistorySplit(width: geometry.size.width) {
                        RunHistoryView(selection: selectedID) { run in
                            path = [.insights, .history, .run(.init(run: run))]
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
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Button { path = [.insights] } label: {
                                Label("Back to Progress", systemImage: "chevron.backward")
                            }.accessibilityIdentifier("progress-history-back")
                        }
                    }
                }
            } else {
                NavigationStack(path: $path) {
                    AllSourceProgress()
                        .navigationDestination(for: ProgressRoute.self) { route in
                            switch route {
                            case .insights: RunningProgressView()
                            case .history: RunHistoryView()
                            case let .run(item): RunDetailView(run: item.run).id(item.run.id)
                            }
                        }
                }
            }
        }
        .modifier(RunHistoryWidthFixture())
        .onChange(of: canOpenCoachHistory) { _, canOpen in
            if !canOpen { path = [] }
        }
    }

    private var selectedID: Int? {
        if case let .run(item)? = path.last { return item.run.id }
        return nil
    }
}
