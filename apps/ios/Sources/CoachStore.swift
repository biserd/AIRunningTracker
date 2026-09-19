import SwiftUI
import CryptoKit
import Combine

@MainActor final class CoachStore: ObservableObject {
    let api = CoachAPI()
    let voice = NativeVoiceCoach()
    let push = ApplePush()
    private var pushObservation: AnyCancellable?
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
    @Published var settingsSheet: SettingsDestination?
    @Published var companion: CompanionData?
    @Published var companionError:String?
    @Published var scheduleError: String?
    @Published var refreshingSchedule = false
    @Published var savingCheckIn = false
    private var refreshedAt: Date?
    private var reminderClarification:String?

    init() {
        voiceObservation = voice.objectWillChange.sink { [weak self] _ in self?.objectWillChange.send() }
        pushObservation = push.objectWillChange.sink { [weak self] _ in self?.objectWillChange.send() }
    }

    func report(_ failure: Error) {
        if failure is CancellationError { return }
        error = failure.localizedDescription
        if case APIError.server(401, _) = failure {
            Task { await push.detach() }
            snapshot = nil; companion=nil; refreshedAt=nil; reminderClarification=nil; messages = []; reminders = []; whatsapp = nil; review = nil; reminderReview = nil; verifiedEmail = ""; needsSignIn = true
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
        let generation = sessionGeneration
        busy = true; error = nil; defer { busy = false }
        await voice.end()
        guard generation == sessionGeneration else { return }
        do {
            await push.detach()
            guard generation == sessionGeneration else { return }
            let token = try SignInLink.token(from: link)
            let _: OK = try await api.request("/api/account/verify", body: ["token":token])
            guard generation == sessionGeneration else { return }
            sessionGeneration = UUID()
            snapshot = nil; companion=nil; refreshedAt=nil; reminderClarification=nil; messages = []; reminders = []; whatsapp = nil; review = nil; reminderReview = nil; verifiedEmail = ""; settingsSheet = nil
            needsSignIn = false; await refresh()
        } catch { report(error) }
    }
    func refresh() async {
        let generation = sessionGeneration
        let conversation = conversationGeneration
        do {
            await refreshSchedule(force:true)
            let status: CoachStatus = try await api.request("/api/ai/status")
            guard generation == sessionGeneration, !needsSignIn else { return }
            if conversation == conversationGeneration { messages = status.history }
        } catch { if generation == sessionGeneration { report(error) } }
        if let next:WhatsAppStatus = try? await api.request("/api/whatsapp"), generation == sessionGeneration, !needsSignIn { whatsapp=next }
        if let next:ReminderStatus = try? await api.request("/api/reminders"), generation == sessionGeneration, !needsSignIn {
            reminders=next.reminders; verifiedEmail=next.verified ? next.email : ""
        }
    }
    func refreshSchedule(force:Bool = false) async {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--test-adaptive-layout") { return }
        #endif
        guard !needsSignIn, !refreshingSchedule else { return }
        if !force, let refreshedAt, Date().timeIntervalSince(refreshedAt)<60 { return }
        refreshingSchedule=true; defer { refreshingSchedule=false }
        let generation=sessionGeneration
        do {
            let next=try await api.runningSnapshot()
            guard generation==sessionGeneration, !needsSignIn else { return }
            snapshot=next; scheduleError=nil; refreshedAt=Date()
            await push.attach(api:api,runner:next.runner.id)
        } catch { if generation==sessionGeneration { scheduleError="Could not refresh. Showing the last loaded schedule."; report(error) } }
        do {
            let next:CompanionData=try await api.companion("read")
            guard generation==sessionGeneration, !needsSignIn else { return }; companion=next; companionError=nil
        } catch { if generation==sessionGeneration { companionError="Could not refresh coaching details. Pull down to retry." } }
        try? await push.refresh()
    }
    func checkIn(_ feeling:String,activity:Int=0) async {
        guard !savingCheckIn, !busy, !voice.active else { return }
        savingCheckIn=true; defer { savingCheckIn=false }
        let generation=sessionGeneration
        do {
            let _:OK=try await api.companion("checkin",body:["feeling":feeling,"activityId":activity])
            guard generation==sessionGeneration,!needsSignIn else { return }
            await refreshSchedule(force:true)
            guard generation==sessionGeneration,!needsSignIn else { return }
            await send("I feel \(feeling.replacingOccurrences(of: "_", with: " "))\(activity>0 ? " after run ID \(activity)" : " today"). Use my saved check-in and actual plan. Suggest one next step; do not change my plan without confirmation.")
        } catch { report(error) }
    }
    func send(_ text: String) async {
        let text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !busy, !voice.active, !text.isEmpty, text.count <= 2000 else { return }
        conversationGeneration += 1
        busy = true; error = nil; defer { busy = false }
        messages.append(Message(role: "user", content: text))
        do {
            let answer = try await coachAnswer(text)
            messages.append(Message(role: "assistant", content: answer.message))
            review = answer.planReview
            reminderReview = answer.reminderProposal
        } catch { report(error) }
    }
    func voiceAnswer(_ text: String) async throws -> Answer {
        guard !needsSignIn, !busy else { throw APIError.missingSession }
        conversationGeneration += 1
        messages.append(Message(role: "user", content: text))
        return try await coachAnswer(text)
    }
    private func coachAnswer(_ text:String) async throws -> Answer {
        if push.enabled && (reminderClarification != nil || text.range(of:"\\b(remind|reminder|reminders|notify|notification|alarm|ping me|wake me)\\b",options:[.regularExpression,.caseInsensitive]) != nil) {
            let request=[reminderClarification,text].compactMap{$0}.joined(separator:"\nFollow-up: ")
            let answer:Answer=try await api.companion("reminder-draft",body:["message":String(request.suffix(2000))])
            reminderClarification=answer.handled != false && answer.reminderProposal == nil ? String(request.suffix(1400)) : nil
            if answer.handled != false { return answer }
        }
        return try await api.request("/api/ai/chat",body:["id":UUID().uuidString,"message":text])
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
        let cleanup = api.signOutCleanupClient()
        sessionGeneration = UUID()
        conversationGeneration += 1
        pendingSignIn = nil; lastLinkDigest = nil
        busy = false; loading = false; error = nil
        companionError = nil; scheduleError = nil
        // Local sign-out must not depend on connectivity or provider cleanup.
        do { try api.clear() } catch { self.error = error.localizedDescription }
        snapshot = nil; companion=nil; refreshedAt=nil; reminderClarification=nil; messages = []; reminders = []; whatsapp = nil; review = nil; reminderReview = nil; verifiedEmail = ""; settingsSheet = nil; needsSignIn = true
        async let endVoice: Void = voice.end(cleanupAPI: cleanup)
        async let detachPush: Void = push.detach(cleanupAPI: cleanup)
        let _: OK? = try? await cleanup.request("/api/account/logout", body: [:])
        _ = await (endVoice, detachPush)
    }
    func confirmReminder(channel: String) async {
        guard let reminderReview, !busy else { return }
        busy = true; error = nil; defer { busy = false }
        do {
            if channel == "push" {
                if reminderReview.kind == "cancel" { try await push.cancel(reminderReview.id) }
                else {
                    let formatter = DateFormatter()
                    formatter.locale = Locale(identifier: "en_US_POSIX")
                    formatter.timeZone = TimeZone(identifier: reminderReview.timezone)
                    formatter.dateFormat = "yyyy-MM-dd'T'HH:mm"
                    guard let date = reminderReview.dueAt.map({Date(timeIntervalSince1970:$0)}) ?? formatter.date(from: reminderReview.localTime) else { throw APIError.invalidResponse }
                    try await push.schedule(title: reminderReview.title, date: date, id: reminderReview.id, recurrence:reminderReview.recurrence ?? "none", timezone:reminderReview.timezone)
                }
                self.reminderReview = nil
                messages.append(Message(role: "assistant", content: reminderReview.kind == "cancel" ? "Apple reminder cancelled." : "Apple notification scheduled. You can manage it in Notifications."))
                return
            }
            let _: OK = try await api.request("/api/reminders/confirm", body: ["id":reminderReview.id,"kind":reminderReview.kind,"confirm":true,"channel":channel])
            self.reminderReview = nil
            await refresh()
            messages.append(Message(role: "assistant", content: reminderReview.kind == "cancel" ? "Reminder cancelled." : "Reminder scheduled."))
        } catch { report(error) }
    }
}
