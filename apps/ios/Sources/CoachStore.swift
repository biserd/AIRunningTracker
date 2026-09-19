import SwiftUI
import CryptoKit
import Combine

@MainActor final class CoachStore: ObservableObject {
    let api = CoachAPI()
    let voice = NativeVoiceCoach()
    private var voiceObservation: AnyCancellable?
    private var sessionGeneration = UUID()
    private var conversationGeneration = 0
    private var didRestore = false
    private var pendingSignIn: String?
    private var lastLinkDigest: String?
    @Published var snapshot: Snapshot?
    @Published var messages: [Message] = []
    @Published var reminders: [Reminder] = []
    @Published var whatsapp: WhatsAppStatus?
    @Published var review: Review?
    @Published var reminderReview: ReminderReview?
    @Published var verifiedEmail = ""
    @Published var error: String?
    @Published var busy = false
    @Published var loading = true
    @Published var needsSignIn = true
    @Published var web: WebDestination?

    init() {
        voiceObservation = voice.objectWillChange.sink { [weak self] _ in self?.objectWillChange.send() }
    }

    func report(_ failure: Error) {
        error = failure.localizedDescription
        if case APIError.server(401, _) = failure {
            snapshot = nil; messages = []; reminders = []; whatsapp = nil; review = nil; reminderReview = nil; verifiedEmail = ""; needsSignIn = true
        }
    }
    func restore() async {
        guard !didRestore else { return }
        didRestore = true
        defer { loading = false }
        do { try api.restore(); if api.credential != nil { needsSignIn = false; await refresh() } }
        catch { report(error) }
    }
    func receiveSignInLink(_ url: URL) {
        do {
            let token = try SignInLink.token(from: url.absoluteString)
            let digest = SHA256.hash(data: Data(token.utf8)).map { String(format: "%02x", $0) }.joined()
            // iOS can deliver the same link through both lifecycle callbacks.
            guard digest != lastLinkDigest else { return }
            lastLinkDigest = digest
            pendingSignIn = url.absoluteString
            processPendingSignIn()
        } catch { report(error) }
    }
    func processPendingSignIn() {
        guard !loading, !busy, let link = pendingSignIn else { return }
        pendingSignIn = nil
        Task { await verify(link: link) }
    }
    func requestSignInLink(email: String) async -> Bool {
        guard !busy else { return false }
        busy = true; error = nil; defer { busy = false }
        do {
            let normalized = try SignInEmail.normalize(email)
            let _: OK = try await api.request("/api/account/email", body: ["email": normalized])
            return true
        } catch { report(error); return false }
    }
    func verify(link: String) async {
        guard !busy else { return }
        busy = true; error = nil; defer { busy = false }
        await voice.end()
        do {
            let token = try SignInLink.token(from: link)
            let _: OK = try await api.request("/api/account/verify", body: ["token":token])
            sessionGeneration = UUID()
            snapshot = nil; messages = []; reminders = []; whatsapp = nil; review = nil; reminderReview = nil; verifiedEmail = ""; web = nil
            needsSignIn = false; await refresh()
        } catch { report(error) }
    }
    func refresh() async {
        let generation = sessionGeneration
        let conversation = conversationGeneration
        do {
            let nextSnapshot: Snapshot = try await api.request("/api/state")
            let status: CoachStatus = try await api.request("/api/ai/status")
            let nextWhatsApp: WhatsAppStatus = try await api.request("/api/whatsapp")
            let reminderStatus: ReminderStatus = try await api.request("/api/reminders")
            guard generation == sessionGeneration, !needsSignIn else { return }
            snapshot = nextSnapshot
            if conversation == conversationGeneration { messages = status.history }
            whatsapp = nextWhatsApp
            reminders = reminderStatus.reminders
            verifiedEmail = reminderStatus.verified ? reminderStatus.email : ""
        } catch { if generation == sessionGeneration { report(error) } }
    }
    func send(_ text: String) async {
        let text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !busy, !voice.active, !text.isEmpty, text.count <= 2000 else { return }
        conversationGeneration += 1
        busy = true; error = nil; defer { busy = false }
        messages.append(Message(role: "user", content: text))
        do {
            let answer: Answer = try await api.request("/api/ai/chat", body: ["id": UUID().uuidString,"message":text])
            messages.append(Message(role: "assistant", content: answer.message))
            review = answer.planReview
            reminderReview = answer.reminderProposal
        } catch { report(error) }
    }
    func voiceAnswer(_ text: String) async throws -> Answer {
        guard !needsSignIn, !busy else { throw APIError.missingSession }
        conversationGeneration += 1
        messages.append(Message(role: "user", content: text))
        return try await api.request("/api/ai/chat", body: ["id": UUID().uuidString, "message": text])
    }
    func receiveVoiceAnswer(_ answer: Answer) {
        messages.append(Message(role: "assistant", content: answer.message))
        review = answer.planReview
        reminderReview = answer.reminderProposal
    }
    func confirmPlan() async {
        guard let review, !busy else { return }
        busy = true; error = nil; defer { busy = false }
        do {
            let result: Confirmation = try await api.request("/api/ai/plan-confirm", body: ["id":review.id,"confirm":true])
            self.review = nil
            await refresh()
            messages.append(Message(role: "assistant", content: result.message))
        } catch { report(error) }
    }
    func signOut() async {
        await voice.end()
        sessionGeneration = UUID()
        busy = true; defer { busy = false }
        // Clear this device even when offline. Existing server logout only clears cookies.
        let _: OK? = try? await api.request("/api/account/logout", body: [:])
        do { try api.clear() } catch { report(error) }
        snapshot = nil; messages = []; reminders = []; whatsapp = nil; review = nil; reminderReview = nil; verifiedEmail = ""; web = nil; needsSignIn = true
    }
    func confirmReminder(channel: String) async {
        guard let reminderReview, !busy else { return }
        busy = true; error = nil; defer { busy = false }
        do {
            let _: OK = try await api.request("/api/reminders/confirm", body: ["id":reminderReview.id,"kind":reminderReview.kind,"confirm":true,"channel":channel])
            self.reminderReview = nil
            await refresh()
            messages.append(Message(role: "assistant", content: reminderReview.kind == "cancel" ? "Reminder cancelled." : "Reminder scheduled."))
        } catch { report(error) }
    }
}

enum WebDestination: String, Identifiable {
    case settings
    var id: String { rawValue }
    var title: String { "Connections & reminders" }
    var url: URL { URL(string: "https://new.aitracker.run/preview#whatsapp")! }
}
