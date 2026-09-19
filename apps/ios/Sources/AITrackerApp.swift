import SwiftUI

@main struct AITrackerApp: App {
    @UIApplicationDelegateAdaptor(PushAppDelegate.self) private var appDelegate
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var store = CoachStore()
    var body: some Scene {
        WindowGroup {
            Group {
                if store.loading { ProgressView("Opening your coach…") }
                else if store.needsSignIn { SignInView() }
                else { CoachTabs() }
            }
            .environmentObject(store)
            .onReceive(NotificationCenter.default.publisher(for: .applePushToken)) { event in
                if let token = event.object as? String { Task { do { try await store.push.received(token: token) } catch { store.report(error) } } }
            }
            .onReceive(NotificationCenter.default.publisher(for: .applePushFailure)) { _ in store.push.status = "Could not connect to Apple. Please retry." }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active && !store.needsSignIn { Task { await store.push.resume(); await store.refreshSchedule() } }
            }
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
                if ProcessInfo.processInfo.arguments.contains("--test-adaptive-layout") {
                    // Offline UI fixture only. Never restore a real account in layout tests.
                    store.loading = false
                    store.needsSignIn = false
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
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var selected: CoachSection = .coach
    @State private var draft = ""
    @State private var reminderChannel = "email"
    var body: some View {
        Group {
            if sizeClass == .regular {
                NavigationSplitView {
                    List(CoachSection.allCases, selection: Binding<CoachSection?>(
                        get: { selected }, set: { if let section = $0 { selected = section } }
                    )) { section in
                        NavigationLink(value: section) {
                            Label(section.title, systemImage: section.symbol)
                        }.accessibilityIdentifier("sidebar-\(section.rawValue)")
                    }
                    .listStyle(.sidebar)
                    .navigationTitle("Run Analytics")
                    .navigationSplitViewColumnWidth(min: 220, ideal: 250, max: 300)
                } detail: {
                    switch selected {
                    case .coach: ChatView(text: $draft, channel: $reminderChannel)
                    case .schedule: ScheduleView()
                    case .settings: SettingsView()
                    }
                }.navigationSplitViewStyle(.balanced)
            } else {
                TabView(selection: $selected) {
                    ChatView(text: $draft, channel: $reminderChannel)
                        .tabItem { Label("Coach", systemImage: CoachSection.coach.symbol) }.tag(CoachSection.coach)
                    ScheduleView().tabItem { Label("Schedule", systemImage: CoachSection.schedule.symbol) }.tag(CoachSection.schedule)
                    SettingsView().tabItem { Label("Settings", systemImage: CoachSection.settings.symbol) }.tag(CoachSection.settings)
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .applePushOpen)) { _ in openPush() }
        .onAppear { openPush() }
        .onChange(of: store.settingsSheet) { _, destination in
            if destination != nil { Task { await store.voice.end() } }
        }
        .sheet(item: $store.settingsSheet) { destination in
            NavigationStack {
                Group {
                    switch destination {
                    case .whatsapp: NativeWhatsAppSettings()
                    case .reminders: NativeReminderSettings()
                    case .notifications: NativePushSettings(push: store.push)
                    case .coaching: CoachingPreferencesView()
                    }
                }
                .navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { store.settingsSheet = nil }.disabled(store.busy) } }
            }
        }
    }
    private func openPush() {
        guard !store.needsSignIn, let target = UserDefaults.standard.string(forKey: "pushDestination") else { return }
        UserDefaults.standard.removeObject(forKey: "pushDestination")
        selected = target == "schedule" ? .schedule : .coach
        let activity=UserDefaults.standard.integer(forKey:"pushActivity")
        UserDefaults.standard.removeObject(forKey:"pushActivity")
        Task {
            await store.refresh(); try? await store.push.refresh()
            if activity>0, store.snapshot?.state.activities?.contains(where:{$0.id==activity})==true {
                await store.send("Review my newly synced run ID \(activity), using actual data. Ask how it felt and explain how it relates to my next planned run.")
            }
        }
    }
}

struct ChatView: View {
    @EnvironmentObject var store: CoachStore
    @Binding var text: String
    @Binding var channel: String
    @FocusState private var composerFocused: Bool
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                NativeVoiceControls(voice: store.voice, store: store)
                    .frame(maxWidth: 820)
                if store.snapshot?.canUseAI == false {
                    Text("Your running data is available. AI coaching needs an active trial or subscription.").font(.callout).padding()
                }
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 16) {
                            CoachCompanionCards()
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
                                    if reminder.appleOnly == true { Text("To your Apple devices").font(.caption) } else {
                                    Picker("Send through", selection: $channel) {
                                        Text("Email").tag("email")
                                        if store.push.enabled && store.push.reminders && reminder.kind == "create" { Text("Apple notification").tag("push") }
                                        if store.whatsapp?.connected == true && store.whatsapp?.authorized == true { Text("WhatsApp").tag("whatsapp") }
                                    }
                                    Text(channel == "push" ? "To your Apple devices" : channel == "email" ? "To: \(store.verifiedEmail)" : "To: \(store.whatsapp?.destination ?? "WhatsApp")").font(.caption)
                                    }
                                    Button("Confirm") { Task { await store.confirmReminder(channel: reminder.appleOnly == true ? "push" : channel) } }
                                        .buttonStyle(.borderedProminent).disabled(store.busy || (reminder.appleOnly != true && channel != "push" && store.verifiedEmail.isEmpty))
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
                        }.padding().frame(maxWidth: 820).frame(maxWidth: .infinity)
                    }
                    .onChange(of: store.messages.count) { _, _ in
                        if let id = store.messages.last?.id { withAnimation { proxy.scrollTo(id, anchor: .bottom) } }
                    }
                }
                HStack(alignment: .bottom) {
                    TextField("Ask your coach", text: $text, axis: .vertical).lineLimit(1...5).textFieldStyle(.roundedBorder)
                        .accessibilityIdentifier("coach-composer")
                        .focused($composerFocused)
                    Button { let message = text; text = ""; Task { await store.send(message) } } label: {
                        Image(systemName: "arrow.up.circle.fill").font(.largeTitle)
                    }.accessibilityLabel("Send message").disabled(store.busy || store.voice.active || text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || text.count > 2000 || store.snapshot?.canUseAI != true)
                }.padding().frame(maxWidth: 820)
            }.navigationTitle("Let’s talk running")
                .toolbar {
                    ToolbarItemGroup(placement: .keyboard) {
                        Spacer()
                        Button("Done") { composerFocused = false }
                            .accessibilityIdentifier("dismiss-coach-keyboard")
                    }
                }
        }
    }
}

struct ScheduleView: View {
    @EnvironmentObject var store: CoachStore
    var body: some View {
        NavigationStack {
            List {
                Section {
                    if let plan=store.snapshot?.state.plan {
                        Text(plan.name ?? "Your training plan").font(.headline)
                        if let week=plan.weekNumber { Text("Week \(week) of \(plan.totalWeeks)").foregroundStyle(.secondary) }
                    }
                    if let updated=store.snapshot?.state.updatedAt { Text("Updated \(updated)").font(.caption).foregroundStyle(.secondary) }
                    if let failure=store.scheduleError { Text(failure).foregroundStyle(.red) }
                    NavigationLink("Run history") { RunHistoryView() }
                    NavigationLink("Coach insights") { CoachInsightsView() }
                }
                Section("This week and what’s next") {
                    if store.snapshot?.state.days.isEmpty != false { Text("No scheduled workouts available.").foregroundStyle(.secondary) }
                    ForEach(store.snapshot?.state.days ?? []) { day in
                        HStack {
                            VStack(alignment: .leading, spacing: 5) {
                                Text(day.date + (day.date == store.snapshot?.state.today ? " · Today" : "")).font(.caption).foregroundStyle(.secondary)
                                Text(day.title).font(.headline)
                                Text(workoutSummary(day,units:store.snapshot?.runner.unitPreference ?? "km")).foregroundStyle(.secondary)
                                if let detail=day.description, !detail.isEmpty { Text(detail).font(.callout).foregroundStyle(.secondary) }
                                if let pace=day.targetPace, !pace.isEmpty { Text("Target pace: \(pace)").font(.caption) }
                            }
                            Spacer()
                            if day.completed { Image(systemName: "checkmark.circle.fill").foregroundStyle(.green).accessibilityLabel("Completed") }
                        }.padding(.vertical, 5)
                    }
                }
                Section("Reminders") {
                    ForEach(store.push.items) { item in
                        VStack(alignment: .leading) {
                            Text(item.title).font(.headline)
                            Text(Date(timeIntervalSince1970: item.due_at), format: .dateTime.month().day().hour().minute())
                            Text("Apple notification").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    if store.reminders.isEmpty && store.push.items.isEmpty { Text("No reminders yet.").foregroundStyle(.secondary) }
                    ForEach(store.reminders) { reminder in
                        VStack(alignment: .leading, spacing: 5) {
                            Text(reminder.title).font(.headline)
                            Text("\(reminder.local_time) · \(reminder.timezone)").font(.caption)
                            Text(reminder.status.capitalized).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    Button("Manage reminders") { store.settingsSheet = .reminders }.buttonStyle(.borderedProminent)
                    Button("Apple notifications") { store.settingsSheet = .notifications }.buttonStyle(.borderedProminent)
                }
            }.frame(maxWidth: 900).frame(maxWidth: .infinity)
                .background(Color(.systemGroupedBackground))
                .navigationTitle("Schedule").refreshable { await store.refreshSchedule(force:true) }
                .task { await store.refreshSchedule() }
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
                    Button("Coaching preferences") { store.settingsSheet = .coaching }.buttonStyle(.borderedProminent)
                    LabeledContent("Apple notifications", value: store.push.status)
                    Button("Notifications & reminders") { store.settingsSheet = .notifications }.buttonStyle(.borderedProminent)
                    LabeledContent("WhatsApp", value: store.whatsapp.map { $0.connected && $0.authorized ? "Connected" : "Not connected" } ?? "Unavailable")
                    Button(store.whatsapp?.connected == true ? "Manage WhatsApp" : "Connect WhatsApp") { store.settingsSheet = .whatsapp }
                        .buttonStyle(.borderedProminent)
                    Button("Email & reminders") { store.settingsSheet = .reminders }.buttonStyle(.borderedProminent)
                }
                Section {
                    Button("Refresh running data") { Task { await store.refresh() } }.disabled(store.busy)
                    Button("Sign out", role: .destructive) { confirmLogout = true }.disabled(store.busy)
                } footer: { Text("Same Run Analytics account and running data. No separate subscription.") }
            }.frame(maxWidth: 760).frame(maxWidth: .infinity)
                .background(Color(.systemGroupedBackground))
                .navigationTitle("Settings")
                .confirmationDialog("Sign out of this device?", isPresented: $confirmLogout) {
                    Button("Sign out", role: .destructive) { Task { await store.signOut() } }
                }
        }
    }
}

enum CoachSection: String, CaseIterable, Identifiable {
    case coach, schedule, settings
    var id: String { rawValue }
    var title: String {
        switch self {
        case .coach: return "Coach"
        case .schedule: return "Schedule"
        case .settings: return "Settings"
        }
    }
    var symbol: String {
        switch self {
        case .coach: return "bubble.left.and.bubble.right"
        case .schedule: return "calendar"
        case .settings: return "slider.horizontal.3"
        }
    }
}
