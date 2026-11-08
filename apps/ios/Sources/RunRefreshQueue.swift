import Foundation

/// Keep the latest refresh requested during an in-flight upload/history read.
/// The operation checks its account generation before touching account state.
@MainActor final class RunRefreshQueue {
    private var pending: (@MainActor () async -> Void)?
    private var running = false

    func run(_ operation: @escaping @MainActor () async -> Void) async {
        pending = operation
        guard !running else { return }
        running = true
        defer { running = false }
        while let next = pending {
            pending = nil
            await next()
        }
    }
}
