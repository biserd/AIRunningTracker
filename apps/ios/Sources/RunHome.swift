import SwiftUI
import MapKit

struct NativeRun: Codable, Identifiable {
    let id: String
    let name: String
    let startDate: String
    let source: String
    let sources: [String]
    let distance: Double
    let movingTime: Double
    let averageHeartrate: Double?
    let stravaRecordId: Int?
    var effort: Int?
    var notes: String?
    var splits: [RunSplit]?
    var laps: [RunSplit]?
    var date: Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: startDate) ?? ISO8601DateFormatter().date(from: startDate)
    }
    var sourceName: String { sources.map { $0 == "phone" ? "RunAnalytics" : $0.capitalized }.joined(separator: " + ") }
    init(recording: PhoneRecording) {
        id = "phone:" + recording.id.uuidString.lowercased(); name = recording.name
        startDate = ISO8601DateFormatter().string(from: recording.startedAt)
        source = "phone"; sources = ["phone"]; distance = recording.distance
        movingTime = Double(recording.movingTime); averageHeartrate = recording.averageHeartRate.map(Double.init); stravaRecordId = nil
        effort = recording.effort; notes = recording.notes; splits = recording.splits(unit: recording.unitMiles == true ? 1609.344 : 1000); laps = recording.laps
    }
}
struct NativeRunFeed: Codable {
    var activities: [NativeRun]
    let total: Int
    let totalPages: Int
    var page: Int
    var fetchedAt: Date? = nil
    let unitPreference: String
    var garminConnected: Bool? = nil
}
struct NativeRunOverview: Decodable {
    struct Stats: Decodable {
        let monthlyTotalDistance: String
        let monthlyTotalActivities: Int
        let monthlyTotalMinutes: Int
        let monthlyAvgPace: String
    }
    let stats: Stats
    let unitPreference: String
}
func runDuration(_ seconds: Double) -> String {
    let value = max(0, Int(seconds))
    return value >= 3600 ? String(format: "%d:%02d:%02d", value/3600, value/60%60, value%60) : String(format: "%d:%02d", value/60, value%60)
}
func runPace(distance: Double, seconds: Double, miles: Bool) -> String {
    guard distance > 0, seconds > 0 else { return "—" }
    return runDuration(seconds / distance * (miles ? 1609.344 : 1000))
}

struct RunHome: View {
    @EnvironmentObject var store: CoachStore
    @ObservedObject var recorder: PhoneRunRecorder
    @State private var accountSheet = false
    @State private var settingsSheet = false
    @State private var finishSheet = false
    @State private var discard = false
    @State private var name = "Phone run"
    @State private var effort = 0
    @State private var notes = ""
    private var miles: Bool { recorder.draft?.unitMiles ?? recorder.usesMiles }
    private var runs: [NativeRun] {
        let remote = store.runFeed?.activities ?? []
        let pending = recorder.saved.filter { recording in (!recording.synced || (recording.endedAt ?? recording.checkpoint) > (store.runFeed?.fetchedAt ?? .distantPast)) && !remote.contains(where: { $0.id == "phone:" + recording.id.uuidString.lowercased() }) }
        return (remote + pending.map(NativeRun.init(recording:))).sorted { $0.startDate > $1.startDate }
    }
    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 14) {
                        if let draft = recorder.draft {
                            Label(draft.running ? "Recording" : "Paused", systemImage: draft.running ? "record.circle" : "pause.circle")
                                .font(.headline).foregroundStyle(RunBrand.orange)
                            HStack(spacing: 12) {
                                metric("Distance", String(format: "%.2f %@", draft.distance / (miles ? 1609.344 : 1000), miles ? "mi" : "km"))
                                metric("Time", runDuration(draft.seconds))
                                metric("Pace", runPace(distance: draft.distance, seconds: draft.seconds, miles: miles))
                            }
                            LiveRunMap(recording: draft).frame(height: 180).clipShape(RoundedRectangle(cornerRadius: 14)).accessibilityIdentifier("live-run-map")
                            Text(draft.running ? recorder.gpsStatus : "GPS paused").font(.caption).foregroundStyle(.secondary)
                            if let bpm = recorder.heartRate.bpm { Label("\(bpm) bpm", systemImage: "heart.fill").foregroundStyle(.red) }
                            let lastMark = draft.lapMarks?.last
                            LabeledContent("Current lap pace", value: runPace(distance: draft.distance - (lastMark?.distance ?? 0), seconds: draft.seconds - (lastMark?.seconds ?? 0), miles: miles) + (miles ? " /mi" : " /km"))
                            if let pace = draft.recentPace { LabeledContent("Recent pace", value: runDuration(pace * (miles ? 1.609344 : 1)) + (miles ? " /mi" : " /km")) }
                            Button { recorder.markLap() } label: { Label("Mark lap", systemImage: "flag").frame(maxWidth: .infinity, minHeight: 30) }
                                .buttonStyle(.bordered).controlSize(.large).disabled(!draft.running)
                            if let lap = draft.laps.last { Text("Lap \(lap.number): \(runDuration(lap.seconds)) · \(runPace(distance: lap.distance, seconds: lap.seconds, miles: miles)) /\(miles ? "mi" : "km")").font(.caption) }
                        } else {
                            Text("Ready for a run?").font(.title2.bold())
                            Text("Your route, pace and distance. Just press Start.").foregroundStyle(.secondary)
                            Text("Saved runs also appear on your RunAnalytics web dashboard.").font(.footnote).foregroundStyle(.secondary)
                            Button { recorder.startOrResume() } label: { Label("Start run", systemImage: "figure.run").frame(maxWidth: .infinity, minHeight: 32) }
                                .buttonStyle(.borderedProminent).controlSize(.large)
                                .disabled(!recorder.storageReady || !recorder.profileUnitsReady).accessibilityIdentifier("start-phone-run")
                            if !recorder.profileUnitsReady {
                                if store.runFeedError != nil {
                                    Text("Connect to load your profile before your first run.").font(.callout).foregroundStyle(.secondary)
                                    Button("Retry") { Task { await store.refreshRuns() } }.buttonStyle(.bordered)
                                } else { ProgressView("Loading your profile…") }
                            }
                        }
                        if let message = recorder.message { Text(message).font(.footnote).foregroundStyle(.secondary) }
                        if recorder.permissionDenied {
                            Link("Open iPhone Settings", destination: URL(string: UIApplication.openSettingsURLString)!).buttonStyle(.bordered)
                        }
                    }.padding(.vertical, 8)
                }
                if let draft = recorder.draft {
                    RunSplitSection(title: "Splits", splits: draft.splits(unit: miles ? 1609.344 : 1000), miles: miles)
                } else {
                    if recorder.saved.contains(where: { !$0.synced }) {
                        Section {
                            Label("\(recorder.saved.filter { !$0.synced }.count) run(s) waiting to sync", systemImage: "icloud.and.arrow.up")
                            Button("Retry sync") { Task { await store.refreshRuns() } }.buttonStyle(.bordered).disabled(recorder.syncing)
                        }
                    }
                    if store.garminConnection?.connected == true || ["reconnect_required", "permission_required", "disconnect_pending"].contains(store.garminConnection?.status ?? "") || (store.garminConnection == nil && store.runFeed?.garminConnected == true) {
                        Section { NativeGarminConnectionCard() }
                    }
                    Section("Recent runs") {
                        if runs.isEmpty { ContentUnavailableView("Your running starts here", systemImage: "figure.run", description: Text("Record a run or connect Garmin or Strava.")) }
                        ForEach(runs) { run in
                            NavigationLink { NativeRunSummary(run: run, miles: miles, recorder: recorder) } label: {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(run.name).font(.headline)
                                    Text("\(run.sourceName) · \(String(format: "%.2f", run.distance / (miles ? 1609.344 : 1000))) \(miles ? "mi" : "km") · \(runDuration(run.movingTime))").font(.subheadline)
                                    if let date = run.date { Text(date, format: .dateTime.month().day().hour().minute()).font(.caption).foregroundStyle(.secondary) }
                                }
                            }
                        }
                        if let feed = store.runFeed, feed.page < feed.totalPages {
                            Button("Load older runs") { Task { await store.loadMoreRuns() } }.buttonStyle(.bordered).disabled(store.refreshingRuns)
                        }
                        if let error = store.runFeedError { Text(error).font(.footnote).foregroundStyle(.secondary) }
                    }
                    Section {
                        Button { accountSheet = true } label: { Label("Garmin & Strava connections", systemImage: "link").frame(maxWidth: .infinity, minHeight: 30) }.buttonStyle(.bordered)
                    }
                }
            }
            .navigationTitle("Run")
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if let draft = recorder.draft {
                    HStack(spacing: 12) {
                        Button { draft.running ? recorder.pause() : recorder.startOrResume() } label: {
                            Label(draft.running ? "Pause" : "Resume", systemImage: draft.running ? "pause.fill" : "play.fill").frame(maxWidth: .infinity, minHeight: 34)
                        }.buttonStyle(.borderedProminent).accessibilityIdentifier("run-pause-resume")
                        Button { recorder.pause(); finishSheet = true } label: { Label("Finish", systemImage: "stop.fill").frame(maxWidth: .infinity, minHeight: 34) }
                            .buttonStyle(.bordered).accessibilityIdentifier("finish-phone-run")
                    }.controlSize(.large).padding(16).frame(maxWidth: 760).frame(maxWidth: .infinity).background(.bar)
                }
            }
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button { settingsSheet = true } label: { Image(systemName: "gearshape").frame(minWidth: 32, minHeight: 32) }.accessibilityLabel("Run settings")
                    if recorder.draft != nil {
                        Menu { Button("Discard run", role: .destructive) { discard = true } } label: { Image(systemName: "ellipsis.circle").frame(minWidth: 32, minHeight: 32) }.accessibilityLabel("More run options")
                    }
                }
            }
            .refreshable { await store.refreshRuns() }
            .task { await store.refreshRuns() }
            .sheet(isPresented: $accountSheet) { NativeOnboardingView(managing: true) }
            .sheet(isPresented: $settingsSheet) { RunRecordingSettings(recorder: recorder) }
            .sheet(isPresented: $finishSheet) {
                NavigationStack {
                    Form {
                        Section {
                            TextField("Run name", text: $name)
                            Picker("Effort", selection: $effort) {
                                Text("Skip effort rating").tag(0)
                                ForEach(1...10, id: \.self) { value in Text("\(value) / 10").tag(value) }
                            }
                            Text("1 = very easy · 10 = maximum effort").font(.caption)
                            TextField("How did it feel?", text: $notes, axis: .vertical).lineLimit(3...6)
                        }
                        Section {
                            Button {
                                recorder.finish(name: name, effort: effort == 0 ? nil : effort, notes: notes)
                                if recorder.draft == nil { finishSheet = false; Task { await store.refreshRuns() } }
                            } label: { Label("Save run", systemImage: "checkmark").frame(maxWidth: .infinity, minHeight: 32) }.buttonStyle(.borderedProminent).controlSize(.large).disabled(recorder.draft == nil)
                            if let message = recorder.message { Text(message).font(.footnote) }
                        } footer: { Text("Saved to your account when you’re online. Your GPS route stays on this iPhone.") }
                    }.navigationTitle("Save your run")
                    .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Keep paused") { finishSheet = false } } }
                }.presentationDetents([.large])
            }
            .confirmationDialog("Discard this unfinished run?", isPresented: $discard, titleVisibility: .visible) {
                Button("Discard run", role: .destructive) { recorder.discard() }
            }
        }
    }
    private func metric(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) { Text(label).font(.caption).foregroundStyle(.secondary); Text(value).font(.title3.monospacedDigit().bold()) }.frame(maxWidth: .infinity, alignment: .leading)
    }
}
struct RunRecordingSettings: View {
    @ObservedObject var recorder: PhoneRunRecorder
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            Form {
                Section {
                    LabeledContent("Distance units", value: recorder.usesMiles ? "Miles" : "Kilometres")
                } footer: { Text("Uses your saved RunAnalytics profile preference.") }
                Section {
                    Toggle("Audio cues", isOn: $recorder.audioAnnouncements)
                } footer: { Text("Spoken distance and lap updates while you run.") }
                Section("Heart-rate sensor") { RunHeartRatePanel(sensor: recorder.heartRate) }
                Section {
                    Text("GPS routes stay on the recording iPhone. Run summaries sync to your account. Force-quitting stops recording.").font(.footnote).foregroundStyle(.secondary)
                    if let status = recorder.liveActivityMessage { Text(status).font(.footnote).foregroundStyle(.secondary) }
                }
            }.navigationTitle("Run settings").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
    }
}
struct NativeRunSummary: View {
    @EnvironmentObject var store: CoachStore
    let run: NativeRun
    let miles: Bool
    @ObservedObject var recorder: PhoneRunRecorder
    @State private var exportHealth = false
    private var recording: PhoneRecording? { recorder.saved.first { "phone:" + $0.id.uuidString.lowercased() == run.id } }
    private var segments: [[CLLocationCoordinate2D]] {
        guard let recording else { return [] }
        return Dictionary(grouping: recording.fixes, by: \.segment).sorted { $0.key < $1.key }.map { $0.value.map { CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude) } }
    }
    var body: some View {
        List {
            Section {
                Text(run.sourceName).foregroundStyle(.secondary)
                if let date = run.date { Text(date, format: .dateTime.month().day().year().hour().minute()) }
                LabeledContent("Distance", value: String(format: "%.2f %@", run.distance / (miles ? 1609.344 : 1000), miles ? "mi" : "km"))
                LabeledContent("Running time", value: runDuration(run.movingTime))
                LabeledContent("Average pace", value: runPace(distance: run.distance, seconds: run.movingTime, miles: miles) + (miles ? " /mi" : " /km"))
                if let heart = run.averageHeartrate { LabeledContent("Average heart rate", value: "\(Int(heart)) bpm") }
            }
            if let effort = recording?.effort ?? run.effort { Section("Effort") { Text("\(effort) / 10") } }
            if let notes = recording?.notes ?? run.notes, !notes.isEmpty { Section("Your notes") { Text(notes) } }
            RunSplitSection(title: "Splits", splits: recording?.splits(unit: miles ? 1609.344 : 1000) ?? run.splits ?? [], miles: miles)
            RunSplitSection(title: "Manual laps", splits: recording?.laps ?? run.laps ?? [], miles: miles)
            if let recording {
                Section {
                    Button("Save to Apple Health") { exportHealth = true }.buttonStyle(.bordered).controlSize(.large)
                    Text("Choose whether to include your GPS route. Apple Health saving is separate from account sync.").font(.caption).foregroundStyle(.secondary)
                }
            }
            if !segments.isEmpty {
                Section("Route on this iPhone") {
                    Map { ForEach(segments.indices, id: \.self) { index in MapPolyline(coordinates: segments[index]).stroke(.orange, lineWidth: 4) } }
                        .frame(height: 240)
                }
            }

        }.navigationTitle(run.name).navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $exportHealth) {
            if let recording { RunHealthExportView(run: recording, exporter: recorder.healthExport) }
        }
    }
}
struct AllSourceProgress: View {
    @EnvironmentObject var store: CoachStore
    var body: some View {
        List {
            Section("Garmin") {
                NavigationLink { NativeGarminRecoveryView() } label: { Label("Sleep, HRV & recovery", systemImage: "heart.text.square") }
                    .accessibilityIdentifier("garmin-recovery")
            }
            if let overview = store.runOverview {
                Section("This month") {
                    LabeledContent("Distance", value: overview.stats.monthlyTotalDistance + (overview.unitPreference == "miles" ? " mi" : " km"))
                    LabeledContent("Runs", value: String(overview.stats.monthlyTotalActivities))
                    LabeledContent("Running time", value: "\(overview.stats.monthlyTotalMinutes) min")
                    LabeledContent("Average pace", value: overview.stats.monthlyAvgPace + (overview.unitPreference == "miles" ? " /mi" : " /km"))
                }
            } else { ContentUnavailableView("Your progress", systemImage: "chart.bar.xaxis", description: Text("Record or sync a run to start building your history.")) }
            Section { Text("RunAnalytics, Garmin and Strava runs contribute to these totals. Clear Garmin and Strava matches count once. Phone recordings stay separate.").font(.footnote).foregroundStyle(.secondary) }
            if let error = store.runFeedError { Text(error).foregroundStyle(.secondary) }
            if store.onboarding?.hasAccess == true && store.onboarding?.stravaConnected == true {
                NavigationLink("Coach insights") { RunningProgressView() }
            }
        }.navigationTitle("Progress").task { await store.refreshRuns() }.refreshable { await store.refreshRuns() }
    }
}

struct LiveRunMap: View {
    let recording: PhoneRecording
    private var segments: [[CLLocationCoordinate2D]] {
        Dictionary(grouping: recording.fixes, by: \.segment).sorted { $0.key < $1.key }.map { $0.value.map { CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude) } }
    }
    var body: some View {
        Map {
            UserAnnotation()
            ForEach(segments.indices, id: \.self) { index in MapPolyline(coordinates: segments[index]).stroke(.orange, lineWidth: 4) }
        }.mapControls { MapUserLocationButton(); MapCompass() }
        .overlay(alignment: .bottom) { if recording.fixes.isEmpty { Text("Waiting for GPS…").padding(8).background(.regularMaterial, in: Capsule()) } }
    }
}
struct RunSplitSection: View {
    let title: String
    let splits: [RunSplit]
    let miles: Bool
    var body: some View {
        if !splits.isEmpty {
            Section(title) {
                ForEach(splits) { split in
                    HStack {
                        Text("\(split.number)")
                        Spacer()
                        Text(String(format: "%.2f %@", split.distance / (miles ? 1609.344 : 1000), miles ? "mi" : "km"))
                        Text(runDuration(split.seconds)).monospacedDigit()
                        Text(runPace(distance: split.distance, seconds: split.seconds, miles: miles) + (miles ? " /mi" : " /km")).monospacedDigit()
                    }.font(.caption)
                }
            }
        }
    }
}
struct RunHeartRatePanel: View {
    @ObservedObject var sensor: RunHeartRate
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let bpm = sensor.bpm { Label("\(bpm) bpm", systemImage: "heart.fill").foregroundStyle(.red) }
            Text(sensor.status).font(.caption).foregroundStyle(.secondary)
            if sensor.hasConnection {
                Button { sensor.disconnect() } label: { Label("Disconnect sensor", systemImage: "xmark.circle").frame(maxWidth: .infinity, minHeight: 30) }.buttonStyle(.bordered).controlSize(.large)
            } else {
                Button { sensor.scanning ? sensor.stopScan() : sensor.scan() } label: {
                    Label(sensor.scanning ? "Stop searching" : "Connect heart-rate sensor", systemImage: sensor.scanning ? "stop.circle" : "heart.circle").frame(maxWidth: .infinity, minHeight: 30)
                }.buttonStyle(.bordered).controlSize(.large)
            }
            ForEach(sensor.devices, id: \.identifier) { device in
                Button { sensor.connect(device) } label: { Label(device.name ?? "Heart-rate sensor", systemImage: "heart").frame(maxWidth: .infinity, minHeight: 30) }.buttonStyle(.bordered)
            }
        }
    }
}
struct RunHealthExportView: View {
    let run: PhoneRecording
    @ObservedObject var exporter: RunHealthExport
    @Environment(\.dismiss) private var dismiss
    @State private var includeRoute = false
    var body: some View {
        NavigationStack {
            Form {
                Text("Save this run’s time, distance and available sensor heart rate to Apple Health.")
                Toggle("Include GPS route in Apple Health", isOn: $includeRoute)
                Text("Your location stays on this iPhone unless you choose this export. Apple Health manages data according to your device settings.").font(.caption)
                Button("Save workout") { Task { await exporter.save(run, includeRoute: includeRoute) } }.buttonStyle(.borderedProminent).controlSize(.large).disabled(exporter.busy)
                if exporter.busy { ProgressView("Saving to Apple Health…") }
                if let status = exporter.status { Text(status) }
            }.navigationTitle("Apple Health")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() }.disabled(exporter.busy) } }
        }.presentationDetents([.medium, .large]).onAppear { exporter.status = nil }
    }
}
