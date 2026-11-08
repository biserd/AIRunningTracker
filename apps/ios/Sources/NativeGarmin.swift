import SwiftUI

struct NativeGarminRecovery: Decodable {
    struct Status: Decodable {
        let connected, enabled: Bool
        let lastSyncAt: String?
        let summaryCount: Int
    }
    struct Metric: Decodable {
        let value: Double?
        let date: String?
        let baseline: Double?
        let baselineDays: Int
        let stale, tentative: Bool
    }
    let status: Status
    let today: String
    let metrics: [String: Metric]

    enum Kind: String, CaseIterable {
        case sleep, sleepScore, restingHeartRate, hrv, stress, bodyBattery
        var title: String {
            switch self {
            case .sleep: return "Sleep duration"
            case .sleepScore: return "Garmin sleep score"
            case .restingHeartRate: return "Resting heart rate"
            case .hrv: return "Overnight HRV"
            case .stress: return "Average stress"
            case .bodyBattery: return "Body Battery"
            }
        }
        func formatted(_ value: Double?) -> String {
            guard let value, value.isFinite, value >= 0 else { return "Not received" }
            if self == .sleep { let minutes = Int(value / 60); return "\(minutes / 60)h \(minutes % 60)m" }
            let unit = self == .hrv ? " ms" : self == .restingHeartRate ? " bpm" : " / 100"
            return String(format: "%.0f", value) + unit
        }
    }
    #if DEBUG
    static let preview = NativeGarminRecovery(status: Status(connected: true, enabled: true, lastSyncAt: "2026-11-08T20:22:00Z", summaryCount: 20), today: "2026-11-08", metrics: [
        "sleep": Metric(value: 28800, date: "2026-11-08", baseline: 27000, baselineDays: 12, stale: false, tentative: false),
        "hrv": Metric(value: 42, date: "2026-11-08", baseline: 40, baselineDays: 12, stale: false, tentative: false),
        "restingHeartRate": Metric(value: 55, date: "2026-11-08", baseline: nil, baselineDays: 2, stale: true, tentative: false)
    ])
    #endif
}

struct NativeGarminConnectionCard: View {
    @EnvironmentObject private var store: CoachStore
    @State private var manage = false
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(store.garminConnection?.connected == false ? "Garmin sync needs attention" : "Garmin connected", systemImage: store.garminConnection?.connected == false ? "exclamationmark.circle" : "checkmark.circle.fill").font(.headline)
            if store.garminConnection?.connected == false {
                Text("Review your Garmin connection to resume direct activity sync.")
            } else if store.garminConnection?.activityCount == 0 {
                Text("Waiting for your first direct Garmin run. Record a new run, then sync your watch with Garmin Connect.")
                Text("Older runs received through Strava keep their Strava label until Garmin sends a matching copy.").font(.caption).foregroundStyle(.secondary)
            } else if let count = store.garminConnection?.activityCount {
                Text("\(count) direct Garmin \(count == 1 ? "run" : "runs") received. Garmin and Strava matches appear once with both sources labeled.").font(.callout)
            } else { Text("Your Garmin runs appear in Recent runs when received.").font(.callout) }
            if let date = store.garminConnection?.lastSyncAt { Text("Last activity received: \(coachTimestamp(date))").font(.caption).foregroundStyle(.secondary) }
            NavigationLink { NativeGarminRecoveryView() } label: {
                Label("Sleep, HRV & recovery", systemImage: "heart.text.square").frame(maxWidth: .infinity, minHeight: 30)
            }.buttonStyle(.bordered).accessibilityIdentifier("garmin-recovery")
            Button("Manage Garmin connection") { manage = true }.buttonStyle(.bordered)
            if let error = store.garminStatusError { Text(error).font(.caption).foregroundStyle(.secondary) }
        }.padding(.vertical, 8)
            .sheet(isPresented: $manage) { NativeOnboardingView(managing: true) }
    }
}

struct NativeGarminRecoveryView: View {
    @EnvironmentObject private var store: CoachStore
    @State private var recovery: NativeGarminRecovery?
    @State private var loading = false
    @State private var failure: String?
    @State private var requestID = UUID()
    @State private var manage = false
    var body: some View {
        List {
            Section {
                Label("Garmin Connect", systemImage: "applewatch").font(.headline)
                Text("The same private sleep and health readings as your web recovery dashboard.").font(.callout).foregroundStyle(.secondary)
                if let date = recovery?.status.lastSyncAt { Text("Last summary received: \(coachTimestamp(date))").font(.caption).foregroundStyle(.secondary) }
            }
            if loading && recovery == nil { ProgressView("Loading Garmin recovery") }
            if let failure {
                Section {
                    Text(failure).foregroundStyle(.secondary)
                    Button("Retry") { Task { await load() } }.buttonStyle(.bordered)
                }
            }
            if let recovery {
                if !recovery.status.connected {
                    Section {
                        Text("Connect Garmin to see your sleep, HRV and health readings.")
                        Button("Connect Garmin") { manage = true }.buttonStyle(.borderedProminent)
                    }
                } else if !recovery.status.enabled {
                    Section {
                        Text("Health and sleep sharing is not enabled for this account.")
                        Link("Review health sharing on the web", destination: URL(string: "https://aitracker.run/recovery")!).buttonStyle(.bordered)
                    }
                } else {
                    ForEach(NativeGarminRecovery.Kind.allCases, id: \.rawValue) { kind in
                        metric(kind, recovery: recovery)
                    }
                }
            }
            Section {
                Link("Open full web recovery dashboard", destination: URL(string: "https://aitracker.run/recovery")!).buttonStyle(.bordered)
                Text("Garmin readings stay outside AI coaching and messaging. Missing readings are not estimated or turned into a readiness score.").font(.footnote).foregroundStyle(.secondary)
            }
        }.navigationTitle("Garmin recovery").navigationBarTitleDisplayMode(.inline)
            .task(id: store.onboarding?.appAccountToken) { recovery = nil; await load() }
            .refreshable { await load() }
            .sheet(isPresented: $manage, onDismiss: { Task { await load() } }) { NativeOnboardingView(managing: true) }
    }
    private func metric(_ kind: NativeGarminRecovery.Kind, recovery: NativeGarminRecovery) -> some View {
        let reading = recovery.metrics[kind.rawValue]
        return Section(kind.title) {
            VStack(alignment: .leading, spacing: 8) {
                Text(kind.formatted(reading?.value)).font(.title2.bold().monospacedDigit())
                if let date = reading?.date {
                    Text("\(runnerDay(date)) - \(reading?.stale == true ? "Older reading" : "Latest available")").font(.caption).foregroundStyle(.secondary)
                } else { Text("Not received from Garmin yet.").font(.caption).foregroundStyle(.secondary) }
                if reading?.tentative == true { Text("Tentative sleep; Garmin may update it.").font(.caption) }
                if reading?.value != nil {
                    if let baseline = reading?.baseline { Text("Prior 14-day median: \(kind.formatted(baseline))").font(.caption).foregroundStyle(.secondary) }
                    else { Text("Building your baseline: \(reading?.baselineDays ?? 0)/7 prior days").font(.caption).foregroundStyle(.secondary) }
                }
            }.padding(.vertical, 4)
        }
    }
    @MainActor private func load() async {
        let request = UUID(); requestID = request
        guard !store.needsSignIn, let account = store.onboarding?.appAccountToken else { recovery = nil; failure = nil; loading = false; return }
        loading = true; failure = nil
        defer { if requestID == request { loading = false } }
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--test-garmin-display") { recovery = .preview; return }
        #endif
        do {
            let next = try await store.api.garminRecovery()
            guard requestID == request, !Task.isCancelled, !store.needsSignIn, store.onboarding?.appAccountToken == account else { return }
            recovery = next
        } catch {
            guard requestID == request, !Task.isCancelled, !store.needsSignIn, store.onboarding?.appAccountToken == account else { return }
            failure = "Garmin recovery could not load. Your existing data is still on the web dashboard."
        }
    }
}
