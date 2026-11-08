import XCTest
@testable import AITracker

final class RunRefreshQueueTests: XCTestCase {
    @MainActor func testSaveDuringHistoryReadSchedulesAnotherUploadPass() async {
        let queue = RunRefreshQueue()
        let reading = expectation(description: "First upload snapshot completed; history read in flight")
        var releaseRead: CheckedContinuation<Void, Never>?
        var saved: [String] = []
        var uploaded: [String] = []
        let refresh = Task {
            await queue.run {
                uploaded += saved
                await withCheckedContinuation { continuation in
                    releaseRead = continuation
                    reading.fulfill()
                }
            }
        }
        await fulfillment(of: [reading], timeout: 5)
        saved.append("new-recording")
        await queue.run { uploaded += saved }
        XCTAssertTrue(uploaded.isEmpty, "The follow-up waits for the in-flight history read")
        releaseRead?.resume()
        await refresh.value
        XCTAssertEqual(uploaded, ["new-recording"])
    }

    @MainActor func testConcurrentRequestsCoalesceToTheLatestFollowUp() async {
        let queue = RunRefreshQueue()
        let started = expectation(description: "First operation started")
        var release: CheckedContinuation<Void, Never>?
        var operations: [Int] = []
        let first = Task {
            await queue.run {
                operations.append(1)
                await withCheckedContinuation { continuation in release = continuation; started.fulfill() }
            }
        }
        await fulfillment(of: [started], timeout: 5)
        await queue.run { operations.append(2) }
        await queue.run { operations.append(3) }
        release?.resume()
        await first.value
        XCTAssertEqual(operations, [1, 3])
        await queue.run { operations.append(4) }
        XCTAssertEqual(operations, [1, 3, 4], "The queue remains reusable after draining")
    }

    @MainActor func testAnAccountSwitchCanReplacePendingWorkWithTheNewGeneration() async {
        let queue = RunRefreshQueue()
        let started = expectation(description: "Old account refresh is in flight")
        var release: CheckedContinuation<Void, Never>?
        var generation = 1
        var results: [Int] = []
        let first = Task {
            await queue.run {
                await withCheckedContinuation { continuation in release = continuation; started.fulfill() }
            }
        }
        await fulfillment(of: [started], timeout: 5)
        await queue.run { if generation == 1 { results.append(1) } }
        generation = 2
        await queue.run { if generation == 2 { results.append(2) } }
        release?.resume()
        await first.value
        XCTAssertEqual(results, [2])
    }
}
