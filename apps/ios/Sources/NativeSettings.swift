import SwiftUI
import UIKit

struct NativeWhatsAppSettings: View {
    @EnvironmentObject private var store: CoachStore
    @Environment(\.scenePhase) private var scenePhase
    @State private var consent: WhatsAppConsent?
    @State private var link: URL?
    @State private var busy = false
    @State private var error: String?
    @State private var confirmDisconnect = false

    var body: some View {
        Form {
            Section {
                Label(statusText, systemImage: store.whatsapp?.connected == true && store.whatsapp?.authorized == true ? "checkmark.circle.fill" : "message")
                if let destination = store.whatsapp?.destination { Text(destination).foregroundStyle(.secondary) }
            }
            if store.whatsapp?.configured == false {
                Text("WhatsApp setup is not available yet.")
            } else if store.whatsapp?.connected == true && store.whatsapp?.authorized == true {
                Section {
                    Text("Your coach is ready in WhatsApp.")
                    Button("Disconnect WhatsApp") { confirmDisconnect = true }.buttonStyle(.borderedProminent)
                }
            } else {
                Section("1. Connect your running data") {
                    if store.whatsapp?.authorized == true {
                        Label("Access approved", systemImage: "checkmark.circle.fill")
                    } else if let consent {
                        Text(consent.details.clientName).font(.headline)
                        ForEach(consent.details.scopes, id: \.scope) { scope in
                            Label(scope.description, systemImage: "checkmark.shield")
                        }
                        Text("Read-only access for up to 30 days. Twilio, Meta and our AI provider process your messages. You can disconnect anytime.")
                            .font(.footnote).foregroundStyle(.secondary)
                        Button("Allow read-only access") {
                            run {
                                self.consent = nil
                                try await store.api.approveWhatsApp(consent)
                                try await refresh()
                                try await prepareLink()
                            }
                        }.buttonStyle(.borderedProminent)
                        Button("Not now") { self.consent = nil }
                    } else {
                        Text("Approve access to your runs and training plan without leaving the app.")
                        Button("Review running data access") {
                            run { consent = try await store.api.whatsappConsent() }
                        }.buttonStyle(.borderedProminent).disabled(store.whatsapp?.configured != true)
                    }
                }
                Section("2. Open WhatsApp") {
                    if let link {
                        Button("Continue in WhatsApp") {
                            UIApplication.shared.open(link, options: [:]) { opened in
                                if !opened { error = "Install WhatsApp on this device, then try again. No browser is needed." }
                            }
                        }.buttonStyle(.borderedProminent)
                        Button("Refresh expired link") { run { try await prepareLink() } }
                        Text("Your private link expires after 10 minutes.").font(.footnote)
                    } else {
                        Button("Prepare WhatsApp link") { run { try await prepareLink() } }
                            .buttonStyle(.borderedProminent).disabled(store.whatsapp?.authorized != true)
                    }
                }
                Section("3. Tap Send") {
                    Text("Send the prepared message without editing it, then return here. Your connection updates automatically.")
                }
            }
            if store.whatsapp?.connected == true {
                if store.whatsapp?.templateReady == false {
                    Text("For reminders, message your coach in WhatsApp within the last 23 hours.").font(.footnote)
                }
                if store.whatsapp?.authorized != true {
                    Button("Disconnect WhatsApp") { confirmDisconnect = true }.buttonStyle(.borderedProminent)
                }
            }
            if busy { ProgressView("Updating connection…") }
            if let error { Text(error).foregroundStyle(.red).accessibilityLabel(error) }
            Button("Refresh status") { run { try await refresh() } }
        }
        .disabled(busy)
        .navigationTitle("WhatsApp")
        .accessibilityIdentifier("native-whatsapp-settings")
        .interactiveDismissDisabled(busy)
        .task { await initialRefresh() }
        .task(id: scenePhase == .active && link != nil) {
            guard scenePhase == .active, link != nil else { return }
            while !Task.isCancelled && link != nil {
                do { try await Task.sleep(for: .seconds(5)); try Task.checkCancellation(); if !busy { try await refresh() } }
                catch is CancellationError { return }
                catch { self.error = error.localizedDescription; return }
            }
        }
        .onChange(of: scenePhase) { _, phase in if phase == .active { Task { await initialRefresh() } } }
        .confirmationDialog("Disconnect WhatsApp?", isPresented: $confirmDisconnect) {
            Button("Disconnect", role: .destructive) {
                run {
                    let _: OK = try await store.api.request("/api/whatsapp/disconnect", body: ["confirm": true])
                    link = nil; consent = nil; try await refresh()
                }
            }
        } message: { Text("This revokes running-data access and cancels pending WhatsApp reminders.") }
    }
    private var statusText: String {
        guard let status = store.whatsapp else { return "Checking connection…" }
        if status.connected && status.authorized { return "Connected" }
        if status.connected { return "Running-data access expired" }
        return status.authorized ? "Ready to link your number" : "Not connected"
    }
    private func refresh() async throws {
        let account = store.api.credential?.token
        let status: WhatsAppStatus = try await store.api.request("/api/whatsapp")
        try Task.checkCancellation()
        guard account != nil, store.api.credential?.token == account, !store.needsSignIn else { throw CancellationError() }
        store.whatsapp = status
        if status.connected { link = nil }
    }
    private func initialRefresh() async {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--test-adaptive-layout") { return }
        #endif
        do { try await refresh() } catch is CancellationError {} catch { self.error = error.localizedDescription }
    }
    private func prepareLink() async throws {
        // Reauthorizing an existing number does not need another pairing token.
        if store.whatsapp?.connected == true { return }
        struct Link: Decodable { let url: String }
        let result: Link = try await store.api.request("/api/whatsapp/connect", body: ["confirm": true])
        link = try NativeConnectionLinks.whatsapp(result.url)
    }
    private func run(_ action: @escaping @MainActor () async throws -> Void) {
        guard !busy, !store.busy else { return }
        busy = true; store.busy = true; error = nil
        Task { @MainActor in
            defer { busy = false; store.busy = false }
            do { try await action() } catch { self.error = error.localizedDescription }
        }
    }
}

struct NativeReminderSettings: View {
    @EnvironmentObject private var store: CoachStore
    @State private var status: ReminderStatus?
    @State private var email = ""
    @State private var zone = TimeZone.current.identifier
    @State private var code = ""
    @State private var codeSent = false
    @State private var title = ""
    @State private var date = Date().addingTimeInterval(3600)
    @State private var channel = "email"
    @State private var review: ReminderReview?
    @State private var busy = false
    @State private var error: String?
    @State private var message: String?
    @State private var confirmDisconnect = false

    var body: some View {
        Form {
            Section("Email connection") {
                if let status, status.verified {
                    Label(status.email, systemImage: "checkmark.circle.fill").privacySensitive()
                    Text(status.timezone).foregroundStyle(.secondary)
                    Button("Disconnect email") { confirmDisconnect = true }.buttonStyle(.borderedProminent)
                } else {
                    TextField("Email address", text: $email).textContentType(.emailAddress).keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                    TextField("Timezone", text: $zone).textInputAutocapitalization(.never).autocorrectionDisabled()
                    Button(codeSent ? "Send a new code" : "Verify my email") {
                        run {
                            let address = try SignInEmail.normalize(email)
                            let _: OK = try await store.api.request("/api/reminders/verify/start", body: ["email": address, "timezone": zone])
                            codeSent = true; message = "Enter the code from your email below."
                        }
                    }.buttonStyle(.borderedProminent).disabled(status?.configured != true || TimeZone(identifier: zone) == nil)
                    if codeSent {
                        TextField("Verification code", text: $code).textContentType(.oneTimeCode)
                            .textInputAutocapitalization(.characters).autocorrectionDisabled().privacySensitive()
                        Button("Confirm email") {
                            run {
                                let _: OK = try await store.api.request("/api/reminders/verify/finish", body: ["code": code.filter { !$0.isWhitespace }])
                                code = ""; codeSent = false; message = "Email connected."
                            }
                        }.buttonStyle(.borderedProminent).disabled(code.filter { !$0.isWhitespace }.count != 12)
                    }
                    if status?.configured == false { Text("Email reminders are not available yet.") }
                }
            }
            if status?.verified == true {
                Section("New reminder") {
                    TextField("Remind me to…", text: $title)
                    DatePicker("When", selection: $date, in: Date()..., displayedComponents: [.date, .hourAndMinute])
                        .environment(\.timeZone, TimeZone(identifier: status?.timezone ?? "") ?? .current)
                    Text("Time in \(status?.timezone ?? zone)").font(.footnote).foregroundStyle(.secondary)
                    Button("Review reminder") {
                        run {
                            let formatter = DateFormatter()
                            formatter.locale = Locale(identifier: "en_US_POSIX")
                            formatter.calendar = Calendar(identifier: .gregorian)
                            formatter.timeZone = TimeZone(identifier: status?.timezone ?? zone)
                            formatter.dateFormat = "yyyy-MM-dd'T'HH:mm"
                            review = try await store.api.request("/api/reminders/draft", body: ["kind": "create", "title": title, "localTime": formatter.string(from: date)])
                        }
                    }.buttonStyle(.borderedProminent).disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || title.count > 160)
                }
            }
            if let review {
                Section(review.kind == "cancel" ? "Cancel reminder?" : "Confirm reminder") {
                    Text(review.title).font(.headline)
                    Text("\(review.localTime.replacingOccurrences(of: "T", with: " ")) · \(review.timezone)")
                    if review.kind == "create" {
                        Picker("Deliver through", selection: $channel) {
                            Text("Email").tag("email")
                            if store.whatsapp?.connected == true && store.whatsapp?.authorized == true { Text("WhatsApp").tag("whatsapp") }
                        }
                        Text(channel == "email" ? "To: \(status?.email ?? "")" : "To: \(store.whatsapp?.destination ?? "WhatsApp")").font(.footnote)
                    }
                    Button("Not now") { self.review = nil }
                }
            }
            Section("Your reminders") {
                if status?.reminders.isEmpty != false { Text("No reminders yet.").foregroundStyle(.secondary) }
                ForEach(status?.reminders ?? []) { item in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(item.title).font(.headline)
                        Text("\(item.local_time.replacingOccurrences(of: "T", with: " ")) · \(item.timezone)").font(.caption)
                        Text("\(item.channel == "whatsapp" ? "WhatsApp" : "Email") · \(item.status.capitalized)").font(.caption)
                        if let delivery = item.delivery_status { Text(delivery.capitalized).font(.caption) }
                        if ["draft", "scheduled"].contains(item.status) {
                            HStack {
                                if item.status == "draft" { Button("Review") { reviewItem(item, kind: "create") } }
                                Button("Cancel reminder") { reviewItem(item, kind: "cancel") }
                            }.buttonStyle(.borderedProminent)
                        }
                    }.padding(.vertical, 4)
                }
            }
            if busy { ProgressView("Updating reminders…") }
            if let message { Text(message).foregroundStyle(.secondary) }
            if let error { Text(error).foregroundStyle(.red) }
            Button("Refresh reminders") { run {} }
            Section { Text("One-time reminders. Delivery is checked every minute and may be delayed. No marketing emails.").font(.footnote) }
        }
        .disabled(busy)
        .navigationTitle("Email & reminders")
        .toolbar {
            if let review {
                ToolbarItem(placement:.confirmationAction) {
                    Button(review.kind == "cancel" ? "Confirm cancellation" : "Schedule") {
                        run {
                            let _:OK = try await store.api.request("/api/reminders/confirm",body:["id":review.id,"kind":review.kind,"confirm":true,"channel":channel])
                            self.review=nil; title=""
                            message=review.kind == "cancel" ? "Reminder cancelled." : "Reminder scheduled."
                        }
                    }.buttonStyle(.borderedProminent).disabled(busy)
                }
            }
        }
        .accessibilityIdentifier("native-reminder-settings")
        .interactiveDismissDisabled(busy)
        .task {
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--test-adaptive-layout") { return }
            #endif
            do { try await refresh() } catch { self.error = error.localizedDescription }
        }
        .confirmationDialog("Disconnect email and WhatsApp?", isPresented: $confirmDisconnect) {
            Button("Disconnect both", role: .destructive) {
                run {
                    let _: OK = try await store.api.request("/api/reminders/disconnect", body: ["confirm": true])
                    review = nil; message = "Disconnected. Pending reminders cancelled."
                }
            }
        } message: { Text("The current service disconnects both channels and cancels pending reminders. A message already being sent may still arrive.") }
    }
    private func reviewItem(_ item: Reminder, kind: String) {
        channel = item.channel ?? "email"
        review = ReminderReview(id: item.id, kind: kind, title: item.title, localTime: item.local_time, timezone: item.timezone)
    }
    private func refresh() async throws {
        let account = store.api.credential?.token
        let next: ReminderStatus = try await store.api.request("/api/reminders")
        let whatsapp: WhatsAppStatus = try await store.api.request("/api/whatsapp")
        try Task.checkCancellation()
        guard account != nil, store.api.credential?.token == account, !store.needsSignIn else { throw CancellationError() }
        status = next; store.reminders = next.reminders
        store.verifiedEmail = next.verified ? next.email : ""; store.whatsapp = whatsapp
        if !next.timezone.isEmpty { zone = next.timezone }
        if !(whatsapp.connected && whatsapp.authorized) { channel = "email" }
    }
    private func run(_ action: @escaping @MainActor () async throws -> Void) {
        guard !busy, !store.busy else { return }
        busy = true; store.busy = true; error = nil; message = nil
        Task { @MainActor in
            defer { busy = false; store.busy = false }
            do { try await action(); try await refresh() } catch { self.error = error.localizedDescription }
        }
    }
}
