import SwiftUI

@main struct AITrackerApp: App {
    @StateObject private var store = CoachStore()
    var body: some Scene {
        WindowGroup {
            Group {
                if store.loading { ProgressView("Opening your coach…") }
                else if store.needsSignIn { SignInView() }
                else { CoachTabs() }
            }
            .environmentObject(store)
            .tint(RunBrand.orange)
            .onOpenURL { store.receiveSignInLink($0) }
            .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                if let url = activity.webpageURL { store.receiveSignInLink(url) }
            }
            .onChange(of: store.loading) { _, _ in store.processPendingSignIn() }
            .onChange(of: store.busy) { _, _ in store.processPendingSignIn() }
            .task {
                #if DEBUG
                if ProcessInfo.processInfo.arguments.contains("--test-sign-in-screen") {
                    store.loading = false
                    return
                }
                #endif
                await store.restore()
            }
            .alert("Run Analytics", isPresented: Binding(get: { store.error != nil }, set: { if !$0 { store.error = nil } })) {
                Button("OK") { store.error = nil }
            } message: { Text(store.error ?? "") }
        }
    }
}

struct CoachTabs: View {
    @EnvironmentObject var store: CoachStore
    var body: some View {
        TabView {
            ChatView().tabItem { Label("Coach", systemImage: "bubble.left.and.bubble.right") }
            ScheduleView().tabItem { Label("Schedule", systemImage: "calendar") }
            SettingsView().tabItem { Label("Settings", systemImage: "slider.horizontal.3") }
        }
        .sheet(item: $store.web, onDismiss: { Task { await store.refresh() } }) { destination in
            NavigationStack {
                ExistingCoachFlow(destination: destination, api: store.api)
                    .navigationTitle(destination.title).navigationBarTitleDisplayMode(.inline)
                    .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { store.web = nil } } }
            }
        }
    }
}

struct ChatView: View {
    @EnvironmentObject var store: CoachStore
    @State private var text = ""
    @State private var channel = "email"
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Button { store.web = .voice } label: {
                    Label("Talk to your coach", systemImage: "mic.fill").font(.title3.bold()).frame(maxWidth: .infinity).padding(8)
                }.buttonStyle(.borderedProminent).padding().disabled(store.snapshot?.canUseAI != true || store.busy)
                if store.snapshot?.canUseAI == false {
                    Text("Your running data is available. AI coaching needs an active trial or subscription.").font(.callout).padding()
                }
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 16) {
                            if store.messages.isEmpty { Text("How are you feeling today?").font(.title2).foregroundStyle(.secondary) }
                            ForEach(store.messages) { message in
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(message.role == "user" ? "You" : "Coach").font(.caption.bold()).foregroundStyle(.secondary)
                                    Text(message.content).font(.body).textSelection(.enabled)
                                }.padding().frame(maxWidth: .infinity, alignment: .leading)
                                    .background(message.role == "user" ? Color.orange.opacity(0.10) : Color(.secondarySystemBackground))
                                    .clipShape(RoundedRectangle(cornerRadius: 18)).id(message.id)
                            }
                            if store.busy { ProgressView("Coach is thinking…").accessibilityLabel("Coach is preparing a reply") }
                            if let reminder = store.reminderReview {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text(reminder.kind == "cancel" ? "Cancel reminder?" : "Schedule reminder?").font(.headline)
                                    Text(reminder.title)
                                    Text("\(reminder.localTime) · \(reminder.timezone)").font(.callout)
                                    Picker("Send through", selection: $channel) {
                                        Text("Email").tag("email")
                                        if store.whatsapp?.connected == true && store.whatsapp?.authorized == true { Text("WhatsApp").tag("whatsapp") }
                                    }
                                    Text(channel == "email" ? "To: \(store.verifiedEmail)" : "To: \(store.whatsapp?.destination ?? "WhatsApp")").font(.caption)
                                    Button("Confirm") { Task { await store.confirmReminder(channel: channel) } }
                                        .buttonStyle(.borderedProminent).disabled(store.busy || store.verifiedEmail.isEmpty)
                                    Button("Not now") { store.reminderReview = nil }.disabled(store.busy)
                                }.padding().background(Color.orange.opacity(0.1)).clipShape(RoundedRectangle(cornerRadius: 18))
                            }
                            if let review = store.review {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("Review plan change").font(.headline)
                                    Text(review.description)
                                    Text("Nothing changes until you confirm.").font(.caption).foregroundStyle(.secondary)
                                    Button("Save my plan") { Task { await store.confirmPlan() } }.buttonStyle(.borderedProminent).disabled(store.busy)
                                    Button("Dismiss", role: .cancel) { store.review = nil }.disabled(store.busy)
                                }.padding().background(Color.orange.opacity(0.1)).clipShape(RoundedRectangle(cornerRadius: 18))
                            }
                        }.padding()
                    }
                    .onChange(of: store.messages.count) { _, _ in
                        if let id = store.messages.last?.id { withAnimation { proxy.scrollTo(id, anchor: .bottom) } }
                    }
                }
                HStack(alignment: .bottom) {
                    TextField("Ask your coach", text: $text, axis: .vertical).lineLimit(1...5).textFieldStyle(.roundedBorder)
                    Button { let message = text; text = ""; Task { await store.send(message) } } label: {
                        Image(systemName: "arrow.up.circle.fill").font(.largeTitle)
                    }.accessibilityLabel("Send message").disabled(store.busy || text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || text.count > 2000 || store.snapshot?.canUseAI != true)
                }.padding()
            }.navigationTitle("Let’s talk running")
        }
    }
}

struct ScheduleView: View {
    @EnvironmentObject var store: CoachStore
    var body: some View {
        NavigationStack {
            List {
                Section("Your current week") {
                    if store.snapshot?.state.days.isEmpty != false { Text("No scheduled workouts available.").foregroundStyle(.secondary) }
                    ForEach(store.snapshot?.state.days ?? []) { day in
                        HStack {
                            VStack(alignment: .leading, spacing: 5) {
                                Text(day.date).font(.caption).foregroundStyle(.secondary)
                                Text(day.title).font(.headline)
                                Text(day.minutes > 0 ? "\(Int(day.minutes)) min · \(day.kind)" : "Rest day").foregroundStyle(.secondary)
                            }
                            Spacer()
                            if day.completed { Image(systemName: "checkmark.circle.fill").foregroundStyle(.green).accessibilityLabel("Completed") }
                        }.padding(.vertical, 5)
                    }
                }
                Section("Reminders") {
                    if store.reminders.isEmpty { Text("No reminders yet.").foregroundStyle(.secondary) }
                    ForEach(store.reminders) { reminder in
                        VStack(alignment: .leading, spacing: 5) {
                            Text(reminder.title).font(.headline)
                            Text("\(reminder.local_time) · \(reminder.timezone)").font(.caption)
                            Text(reminder.status.capitalized).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    Button("Manage reminders") { store.web = .settings }.buttonStyle(.borderedProminent)
                }
            }.navigationTitle("Schedule").refreshable { await store.refresh() }
        }
    }
}

struct SettingsView: View {
    @EnvironmentObject var store: CoachStore
    @State private var confirmLogout = false
    var body: some View {
        NavigationStack {
            Form {
                Section("Your account") {
                    Text(store.snapshot?.runner.name ?? "Run Analytics runner").font(.headline)
                    LabeledContent("Units", value: store.snapshot?.runner.unitPreference ?? "")
                    LabeledContent("Timezone", value: store.snapshot?.runner.timezone ?? "")
                }
                Section("Stay connected") {
                    LabeledContent("WhatsApp", value: store.whatsapp.map { $0.connected && $0.authorized ? "Connected" : "Not connected" } ?? "Unavailable")
                    Button(store.whatsapp?.connected == true ? "Manage WhatsApp" : "Connect WhatsApp") { store.web = .settings }
                        .buttonStyle(.borderedProminent)
                    Button("Email & reminders") { store.web = .settings }.buttonStyle(.borderedProminent)
                }
                Section {
                    Button("Refresh running data") { Task { await store.refresh() } }.disabled(store.busy)
                    Button("Sign out", role: .destructive) { confirmLogout = true }.disabled(store.busy)
                } footer: { Text("Same Run Analytics account and running data. No separate subscription.") }
            }.navigationTitle("Settings")
                .confirmationDialog("Sign out of this device?", isPresented: $confirmLogout) {
                    Button("Sign out", role: .destructive) { Task { await store.signOut() } }
                }
        }
    }
}
