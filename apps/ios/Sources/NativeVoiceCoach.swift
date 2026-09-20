import SwiftUI
import AVFoundation

enum VoiceEvent {
    case started, closed, failure, transcript(String), delegation(String)
    static func parse(_ data: Data) -> VoiceEvent? {
        guard data.count <= 65_536,
              let event = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = event["type"] as? String else { return nil }
        switch type {
        case "session.started": return .started
        case "session.closed": return .closed
        case "error": return .failure
        case "session.input_transcript.delta":
            guard let delta = event["delta"] as? String else { return nil }
            return .transcript(String(delta.suffix(1800)))
        case "session.delegation.created":
            guard let delegation = event["delegation"] as? [String: Any],
                  let id = delegation["id"] as? String, !id.isEmpty, id.count <= 256 else { return nil }
            return .delegation(id)
        default: return nil
        }
    }
}

@MainActor final class NativeVoiceCoach: ObservableObject {
    static let maximumDuration = 5 * 60
    enum Phase { case off, connecting, live, ending }
    @Published private(set) var phase: Phase = .off
    @Published private(set) var muted = false
    @Published private(set) var checking = false
    @Published private(set) var caption = ""
    @Published private(set) var remaining = maximumDuration
    @Published private(set) var error: String?
    var active: Bool { phase != .off }
    private var transport: VoiceTransport?
    private weak var store: CoachStore?
    private var startup: Task<Void, Never>?
    private var timer: Task<Void, Never>?
    private var delegation: Task<Void, Never>?
    private var observers: [NSObjectProtocol] = []
    private var generation = UUID()
    private var providerRequested = false
    private var transcript = ""
    private var seen = Set<String>()

    init() {
        observers.append(NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] note in
            guard let type = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  type == AVAudioSession.InterruptionType.ended.rawValue,
                  let optionsValue = note.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt,
                  AVAudioSession.InterruptionOptions(rawValue: optionsValue).contains(.shouldResume) else { return }
            Task { @MainActor in self?.transport?.resumeAudio() }
        })
        observers.append(NotificationCenter.default.addObserver(forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main) { [weak self] note in
            guard let reason = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
                  reason == AVAudioSession.RouteChangeReason.oldDeviceUnavailable.rawValue else { return }
            Task { @MainActor in self?.transport?.resumeAudio() }
        })
    }
    deinit { observers.forEach { NotificationCenter.default.removeObserver($0) } }

    func start(store: CoachStore) {
        guard !active, !store.busy, store.snapshot?.canUseAI == true else { return }
        self.store = store
        phase = .connecting; error = nil; muted = false; checking = false
        caption = ""; transcript = ""; seen.removeAll(); remaining = Self.maximumDuration
        generation = UUID()
        let call = generation
        startup = Task { [weak self] in
            guard let self else { return }
            do {
                let allowed = await AVAudioApplication.requestRecordPermission()
                guard call == generation, phase == .connecting else { return }
                guard allowed else { throw APIError.server(403, "Allow microphone access in iPhone Settings to talk with your coach.") }
                let transport = VoiceTransport()
                self.transport = transport
                transport.onEvent = { [weak self] data in self?.receive(data, call: call) }
                transport.onFailure = { [weak self] in
                    guard let self, self.generation == call else { return }
                    self.error = "Voice connection interrupted. Please try again."
                    Task { await self.end() }
                }
                let sdp = try await transport.offer()
                guard call == generation, phase == .connecting else { transport.close(); return }
                providerRequested = true
                let result: VoiceAnswer
                do {
                    result = try await store.api.request("/api/ai/voice", body: ["id": UUID().uuidString, "sdp": sdp])
                } catch {
                    // A conflict belongs to another existing call, not this attempt.
                    if case APIError.server(409, _) = error { providerRequested = false }
                    throw error
                }
                guard call == generation, phase == .connecting else { return }
                try await transport.accept(result.sdp)
                remaining = max(1, min(result.seconds, Self.maximumDuration))
                timer = Task { [weak self] in
                    guard let self else { return }
                    // A media connection alone is not a ready Live session.
                    for _ in 0..<15 {
                        if phase == .live { break }
                        try? await Task.sleep(nanoseconds: 1_000_000_000)
                        guard !Task.isCancelled, call == generation else { return }
                    }
                    guard phase == .live else {
                        error = "Your coach could not connect. Please try again."
                        Task { await self.end() }; return
                    }
                    while remaining > 0 {
                        try? await Task.sleep(nanoseconds: 1_000_000_000)
                        guard !Task.isCancelled, call == generation else { return }
                        remaining -= 1
                    }
                    Task { await self.end() }
                }
            } catch {
                guard call == generation else { return }
                self.error = error is CancellationError ? "Voice stopped." : error.localizedDescription
                // Run outside startup: end waits for a possibly in-flight provider request.
                Task { await self.end() }
            }
        }
    }

    func end(cleanupAPI: CoachAPI? = nil) async {
        guard phase != .off, phase != .ending else { return }
        phase = .ending
        generation = UUID()
        // Shut off local audio immediately, even if the network is unavailable.
        transport?.send(["type": "session.close"])
        transport?.close(); transport = nil
        delegation?.cancel(); delegation = nil
        timer?.cancel(); timer = nil
        checking = false; muted = false
        let pending = startup
        // Do not cancel a request that might already have created a provider session.
        // Wait for it before stop so a late response cannot reopen an orphaned call.
        await pending?.value
        startup = nil
        if providerRequested, let store {
            do { let _: OK = try await (cleanupAPI ?? store.api).request("/api/ai/voice/stop", body: [:]) }
            catch { self.error = "Microphone off. The server is finishing the call; wait a moment before trying again." }
        }
        providerRequested = false
        phase = .off
    }
    func toggleMute() {
        guard phase == .live else { return }
        muted.toggle(); transport?.mute(muted)
    }
    private func commentary(_ content: String, id: String, call: UUID) {
        guard call == generation, phase == .live else { return }
        transport?.send(["type": "session.commentary.append", "delegation_id": id, "content": String(content.prefix(1500))])
    }
    private func receive(_ data: Data, call: UUID) {
        guard call == generation, let event = VoiceEvent.parse(data) else { return }
        switch event {
        case .started: if phase == .connecting { phase = .live }
        case .closed: Task { await end() }
        case .failure:
            error = "Voice encountered a problem. Please try again."
            Task { await end() }
        case .transcript(let delta):
            transcript = String((transcript + delta).suffix(1800)); caption = transcript
        case .delegation(let id):
            guard seen.insert(id).inserted else { return }
            guard !checking else {
                commentary("I am still checking your previous question. Please wait.", id: id, call: call); return
            }
            let message = transcript.trimmingCharacters(in: .whitespacesAndNewlines)
            transcript = ""
            guard !message.isEmpty, let store else {
                commentary("I did not catch that. Please repeat your question.", id: id, call: call); return
            }
            checking = true
            delegation = Task { [weak self, weak store] in
                guard let self, let store else { return }
                defer { if call == generation { checking = false } }
                do {
                    let answer = try await store.voiceAnswer(message)
                    guard !Task.isCancelled, call == generation else { return }
                    store.receiveVoiceAnswer(answer)
                    let review = answer.planReview != nil || answer.reminderProposal != nil
                    commentary(answer.message + (review ? " Review the change on screen and confirm to save it. Nothing has been saved yet." : ""), id: id, call: call)
                } catch {
                    commentary("I could not check your data just now. No changes were made.", id: id, call: call)
                }
            }
        }
    }
}

private struct VoiceAnswer: Decodable { let sdp: String; let seconds: Int }

struct NativeVoiceControls: View {
    @ObservedObject var voice: NativeVoiceCoach
    let store: CoachStore
    var body: some View {
        VStack(spacing: 12) {
            if voice.active {
                HStack(spacing: 12) {
                    Image(systemName: voice.muted ? "mic.slash.fill" : "waveform")
                        .font(.largeTitle).foregroundStyle(RunBrand.orange)
                        .symbolEffect(.variableColor, isActive: voice.phase == .live && !voice.muted)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(voice.phase == .connecting ? "Connecting…" : voice.phase == .ending ? "Ending call…" : voice.checking ? "Checking your running data…" : voice.muted ? "Microphone muted" : "Connected to your coach")
                            .font(.headline).accessibilityAddTraits(.updatesFrequently)
                        if voice.phase == .live { Text("\(voice.remaining / 60):\(String(format: "%02d", voice.remaining % 60)) remaining").font(.caption).foregroundStyle(.secondary) }
                    }
                    Spacer()
                }
                HStack {
                    Button { voice.toggleMute() } label: { Label(voice.muted ? "Unmute" : "Mute", systemImage: voice.muted ? "mic.fill" : "mic.slash.fill") }
                        .buttonStyle(.bordered).disabled(voice.phase != .live)
                    Button(role: .destructive) { Task { await voice.end() } } label: { Label("End call", systemImage: "phone.down.fill") }
                        .buttonStyle(.borderedProminent).disabled(voice.phase == .ending)
                }
                if !voice.caption.isEmpty { Text(voice.caption).font(.callout).foregroundStyle(.secondary).lineLimit(3).privacySensitive() }
            } else {
                Button { voice.start(store: store) } label: {
                    Label("Talk to your coach", systemImage: "mic.fill").font(.title3.bold()).frame(maxWidth: .infinity).padding(8)
                }.buttonStyle(.borderedProminent).disabled(store.snapshot?.canUseAI != true || store.busy)
                if store.busy { Text("Voice will be ready when your coach finishes replying.").font(.caption).foregroundStyle(.secondary) }
                else if store.snapshot == nil { Text("Loading your coaching access…").font(.caption).foregroundStyle(.secondary) }
            }
            if let error = voice.error { Text(error).font(.callout).foregroundStyle(.red) }
        }.padding(16).background(RunBrand.surface, in: RoundedRectangle(cornerRadius: 24))
            .overlay(RoundedRectangle(cornerRadius:24).strokeBorder(RunBrand.orange.opacity(0.12),lineWidth:1)).padding()
    }
}
