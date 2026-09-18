import SwiftUI

@MainActor final class CoachStore: ObservableObject {
    let api = CoachAPI()
    private var sessionGeneration = UUID()
    private var conversationGeneration = 0
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

    func report(_ failure: Error) {
        error = failure.localizedDescription
        if case APIError.server(401, _) = failure {
            snapshot = nil; messages = []; reminders = []; whatsapp = nil; review = nil; reminderReview = nil; verifiedEmail = ""; needsSignIn = true
        }
    }
    func restore() async {
        defer { loading = false }
        do { try api.restore(); if api.credential != nil { needsSignIn = false; await refresh() } }
        catch { report(error) }
    }
    func signIn(email: String, password: String) async {
        busy = true; error = nil; defer { busy = false }
        do {
            let _: OK = try await api.request("/api/account/login", body: ["email":email,"password":password])
            needsSignIn = false; await refresh()
        } catch { report(error) }
    }
    func verify(link: String) async {
        busy = true; error = nil; defer { busy = false }
        do {
            let token = try SignInLink.token(from: link)
            let _: OK = try await api.request("/api/account/verify", body: ["token":token])
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
        guard !busy, !text.isEmpty, text.count <= 2000 else { return }
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
    case voice, settings
    var id: String { rawValue }
    var title: String { self == .voice ? "Voice coach" : "Connections & reminders" }
    var url: URL { URL(string: "https://new.aitracker.run/preview" + (self == .settings ? "#whatsapp" : ""))! }
}
