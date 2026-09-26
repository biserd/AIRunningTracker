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
                else if store.onboarding?.ready != true && !ProcessInfo.processInfo.arguments.contains("--test-adaptive-layout") { NativeOnboardingView() }
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
                    if ProcessInfo.processInfo.arguments.contains("--app-store-capture") {
                        AppStoreCapture.populate(store)
                    }
                    store.loading = false
                    store.needsSignIn = false
                    store.busy = ProcessInfo.processInfo.arguments.contains("--test-pending-coach-request")
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
    @State private var openedBriefing: CoachBriefing?
    @State private var briefingUnavailable = false
    @State private var openingBriefing = false
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
                    .navigationBarTitleDisplayMode(.inline)
                    .navigationSplitViewColumnWidth(min: 220, ideal: 250, max: 300)
                } detail: {
                    switch selected {
                    case .coach: ChatView(text: $draft, channel: $reminderChannel)
                    case .schedule: ScheduleView()
                    case .progress: NavigationStack { RunningProgressView() }
                    case .settings: SettingsView()
                    }
                }.navigationSplitViewStyle(.balanced)
            } else {
                if #available(iOS 26.0, *) {
                    compactTabs
                        .tabBarMinimizeBehavior(.onScrollDown)
                        .tabViewBottomAccessory {
                            CoachVoiceAccessory(selected: $selected)
                        }
                } else {
                    compactTabs
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .applePushOpen)) { _ in openPush() }
        .onAppear { openPush() }
        .onChange(of: store.requestedCoach) { _, _ in selected = .coach }
        .onChange(of: store.settingsSheet) { _, destination in
            if destination != nil { Task { await store.voice.end() } }
        }
        .sheet(item: $store.settingsSheet) { destination in
            NavigationStack {
                Group {
                    switch destination {
                    case .whatsapp: NativeWhatsAppSettings()
                    case .reminders: UnifiedRemindersView()
                    case .email: NativeReminderSettings(connectionOnly: true)
                    case .notifications: NativePushSettings(push: store.push)
                    case .coaching: CoachingPreferencesView()
                    }
                }
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    if destination != .coaching {
                        ToolbarItem(placement: .cancellationAction) { Button("Close") { store.settingsSheet = nil }.disabled(store.busy || store.push.busy) }
                    }
                }
            }
        }
        .sheet(item: $openedBriefing) { briefing in
            CoachBriefingView(briefing: briefing)
        }
        .alert("Briefing unavailable", isPresented: $briefingUnavailable) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("This coaching update could not be loaded. Your latest updates are in Coach.")
        }
        .overlay(alignment: .top) {
            if openingBriefing {
                ProgressView("Opening coaching update…")
                    .padding(14)
                    .runGlassSurface(cornerRadius: 16)
                    .padding(.top, 12)
            }
        }
    }
    private var compactTabs: some View {
        TabView(selection: $selected) {
            ChatView(text: $draft, channel: $reminderChannel)
                .tabItem { Label("Coach", systemImage: CoachSection.coach.symbol) }.tag(CoachSection.coach)
            ScheduleView().tabItem { Label("Plan", systemImage: CoachSection.schedule.symbol) }.tag(CoachSection.schedule)
            NavigationStack { RunningProgressView() }
                .tabItem { Label("Progress", systemImage: CoachSection.progress.symbol) }.tag(CoachSection.progress)
            SettingsView().tabItem { Label("Settings", systemImage: CoachSection.settings.symbol) }.tag(CoachSection.settings)
        }
    }
    private func openPush() {
        guard !store.needsSignIn, let target = UserDefaults.standard.string(forKey: "pushDestination") else { return }
        UserDefaults.standard.removeObject(forKey: "pushDestination")
        selected = target == "schedule" ? .schedule : .coach
        let activity=UserDefaults.standard.integer(forKey:"pushActivity")
        UserDefaults.standard.removeObject(forKey:"pushActivity")
        let briefing=UserDefaults.standard.string(forKey:"pushBriefing").flatMap(PushBriefingReference.init)
        UserDefaults.standard.removeObject(forKey:"pushBriefing")
        let legacyBriefingAt=UserDefaults.standard.double(forKey:"pushLegacyBriefingAt")
        UserDefaults.standard.removeObject(forKey:"pushLegacyBriefingAt")
        store.settingsSheet = nil
        let wantsBriefing = briefing != nil || legacyBriefingAt > 0
        openingBriefing = wantsBriefing
        Task {
            if wantsBriefing { await store.refreshCompanion() }
            else { await store.refresh() }
            try? await store.push.refresh()
            if let briefing {
                if let saved = store.companion?.briefings.first(where: briefing.matches) {
                    openedBriefing = saved
                } else {
                    briefingUnavailable = true
                }
            } else if legacyBriefingAt > 0 {
                if let saved = store.companion?.briefings.first(where: { item in
                    guard let created = item.createdAt else { return false }
                    let interval = legacyBriefingAt - created.timeIntervalSince1970
                    return interval >= -60 && interval <= 7200
                }) {
                    openedBriefing = saved
                } else {
                    briefingUnavailable = true
                }
            }
            openingBriefing = false
            if activity>0, store.snapshot?.state.activities?.contains(where:{$0.id==activity})==true {
                await store.send("Review my newly synced run ID \(activity), using actual data. Ask how it felt and explain how it relates to my next planned run.")
            }
        }
    }
}

@available(iOS 26.0, *)
private struct CoachVoiceAccessory: View {
    @EnvironmentObject private var store: CoachStore
    @Binding var selected: CoachSection

    var body: some View {
        Button {
            selected = .coach
            if !store.voice.active { store.voice.start(store: store) }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: store.voice.active ? "waveform" : "mic.fill")
                    .symbolEffect(.variableColor, isActive: store.voice.phase == .live && !store.voice.muted)
                    .foregroundStyle(RunBrand.orange)
                Text(accessoryTitle).font(.subheadline.bold()).lineLimit(1)
                Spacer(minLength: 8)
                if store.voice.phase == .live {
                    Text("\(store.voice.remaining / 60):\(String(format: "%02d", store.voice.remaining % 60))")
                        .font(.caption.monospacedDigit()).foregroundStyle(.secondary)
                } else {
                    Image(systemName: "chevron.right").font(.caption.bold()).foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 4)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(!store.voice.active && (store.snapshot?.canUseAI != true || store.busy))
        .accessibilityLabel(store.voice.active ? "Return to active voice coach" : "Talk to your coach")
    }

    private var accessoryTitle: String {
        switch store.voice.phase {
        case .connecting: return "Connecting to coach…"
        case .live: return store.voice.muted ? "Coach · muted" : "Coach is listening"
        case .ending: return "Ending voice session…"
        case .off: return "Talk to your coach"
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
                            if store.messages.isEmpty {
                                if let briefing = store.companion?.briefings.first {
                                    Text(briefing.title).font(.headline)
                                    Text(briefing.body).font(.body)
                                } else { Text("How are you feeling today?").font(.title2).foregroundStyle(.secondary) }
                            }
                            DisclosureGroup("Check in & running context") { CoachCompanionCards() }
                            ForEach(store.messages) { message in
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(message.role == "user" ? "You" : "Coach").font(.caption.bold()).foregroundStyle(.secondary)
                                    Text(message.content).font(.body).textSelection(.enabled)
                                }.padding().frame(maxWidth: .infinity, alignment: .leading)
                                    .background(message.role == "user" ? RunBrand.orange.opacity(0.10) : RunBrand.surface)
                                    .clipShape(RoundedRectangle(cornerRadius: 18)).id(message.id)
                            }
                            if store.busy { ProgressView("Coach is thinking…").accessibilityLabel("Coach is preparing a reply") }
                            ChatReviewCards(channel:$channel)
                        }.padding().frame(maxWidth: 820).frame(maxWidth: .infinity)
                    }
                    .onChange(of: store.messages.count) { _, _ in
                        if let id = store.messages.last?.id { withAnimation { proxy.scrollTo(id, anchor: .bottom) } }
                    }
                }
                HStack(alignment: .bottom, spacing: 10) {
                    TextField("Ask your coach", text: $text, axis: .vertical).lineLimit(1...5).textFieldStyle(.roundedBorder)
                        .accessibilityIdentifier("coach-composer")
                        .focused($composerFocused)
                    Button { let message = text; text = ""; Task { await store.send(message) } } label: {
                        Image(systemName: "arrow.up").font(.headline.bold()).frame(width: 28, height: 28)
                    }
                    .runPrimaryActionStyle()
                    .buttonBorderShape(.circle)
                    .accessibilityLabel("Send message")
                    .disabled(store.busy || store.voice.active || text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || text.count > 2000 || store.snapshot?.canUseAI != true)
                }
                .padding(12)
                .frame(maxWidth: 820)
                .runGlassSurface(cornerRadius: 22)
                .padding(.horizontal)
                .padding(.bottom, 8)
            }.background { RunAmbientBackdrop() }.navigationTitle("Let’s talk running")
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

struct ChatReviewCards:View {
    @EnvironmentObject var store:CoachStore
    @Binding var channel:String
    var body:some View {
        if let reminder=store.reminderReview {
            VStack(alignment:.leading,spacing:12) {
                Text(reminder.kind == "cancel" ? "Cancel reminder?" : "Schedule reminder?").font(.headline)
                Text(reminder.title)
                Text("\(reminder.localTime) · \(reminder.timezone)").font(.callout)
                if let recurrence=reminder.recurrence,recurrence != "none" { Text("Repeats \(recurrence) until cancelled").font(.callout).bold() }
                if reminder.appleOnly == true { Text("To your Apple devices").font(.caption) }
                else {
                    Picker("Send through",selection:$channel) {
                        Text("Email").tag("email")
                        if store.push.enabled && store.push.reminders && reminder.kind == "create" { Text("Apple notification").tag("push") }
                        if store.whatsapp?.connected == true && store.whatsapp?.authorized == true { Text("WhatsApp").tag("whatsapp") }
                    }
                    Text(destination).font(.caption)
                }
                Button("Confirm") { Task { await store.confirmReminder(channel:reminder.appleOnly == true ? "push" : channel) } }
                    .buttonStyle(.borderedProminent).disabled(store.busy || (reminder.appleOnly != true && channel != "push" && store.verifiedEmail.isEmpty))
                Button("Not now") { store.reminderReview=nil }.disabled(store.busy)
            }.padding().background(RunBrand.orange.opacity(0.1),in:RoundedRectangle(cornerRadius:18))
        }
        if let review=store.review {
            VStack(alignment:.leading,spacing:12) {
                Text("Review plan change").font(.headline)
                Text(review.description)
                Text("Nothing changes until you confirm.").font(.caption).foregroundStyle(.secondary)
                Button("Save my plan") { Task { await store.confirmPlan() } }.buttonStyle(.borderedProminent).disabled(store.busy)
                Button("Dismiss",role:.cancel) { store.review=nil }.disabled(store.busy)
            }.padding().background(RunBrand.orange.opacity(0.1),in:RoundedRectangle(cornerRadius:18))
        }
    }
    private var destination:String {
        if channel == "push" { return "To your Apple devices" }
        if channel == "email" { return "To: \(store.verifiedEmail)" }
        return "To: \(store.whatsapp?.destination ?? "WhatsApp")"
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
                    if let updated=store.snapshot?.state.updatedAt { Text("Updated \(coachTimestamp(updated))").font(.caption).foregroundStyle(.secondary) }
                    if let failure=store.scheduleError { Text(failure).foregroundStyle(.red) }
                    Button("Adjust my plan with coach") {
                        store.requestedCoach = UUID()
                        Task { await store.send("Help me review my upcoming training plan. Ask what I want to change before proposing an update.") }
                    }.buttonStyle(.borderedProminent).disabled(store.busy || store.voice.active || store.snapshot?.canUseAI != true)
                }
                Section("Today and what’s next") {
                    if store.snapshot?.state.upcomingDays.isEmpty != false { Text("No upcoming workouts available.").foregroundStyle(.secondary) }
                    ForEach(store.snapshot?.state.upcomingDays ?? []) { day in
                        HStack {
                            VStack(alignment: .leading, spacing: 5) {
                                Text(runnerDay(day.date, today: store.snapshot?.state.today)).font(.callout).foregroundStyle(.secondary)
                                Text(day.title).font(.title3.bold())
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
                    NavigationLink { UnifiedRemindersView() } label: { Label("All reminders", systemImage: "bell") }
                }
            }.frame(maxWidth: 900).frame(maxWidth: .infinity)
                .scrollContentBackground(.hidden).background(RunBrand.canvas)
                .navigationTitle("Plan").refreshable { await store.refreshSchedule(force:true) }
                .task { await store.refreshSchedule() }
        }
    }
}

struct SettingsView: View {
    @EnvironmentObject var store: CoachStore
    @State private var confirmLogout = false
    @State private var accountSheet = false
    var body: some View {
        NavigationStack {
            Form {
                Section("Your account") {
                    Text(store.snapshot?.runner.name ?? "Run Analytics runner").font(.headline)
                    settingsRow("Subscription & Strava", symbol: "person.crop.circle") { accountSheet=true }
                    LabeledContent("Units", value: store.snapshot?.runner.unitPreference ?? "")
                    LabeledContent("Timezone", value: store.snapshot?.runner.timezone ?? "")
                }
                Section {
                    if store.refreshingSchedule {
                        ProgressView("Refreshing running data…").accessibilityIdentifier("running-data-refreshing")
                    } else if let error = store.scheduleError {
                        Label(error,systemImage:"exclamationmark.triangle").foregroundStyle(.red)
                    } else if let date = store.refreshedAt {
                        HStack {
                            Label("Running data updated",systemImage:"checkmark.circle.fill").foregroundStyle(RunBrand.teal)
                            Spacer()
                            Text(date,style:.time).foregroundStyle(.secondary)
                        }
                    } else {
                        Text("Running data not loaded yet.").foregroundStyle(.secondary)
                    }
                    if let error=store.companionError { Text(error).font(.footnote).foregroundStyle(.red) }
                } header: {
                    Text("Running data")
                } footer: {
                    Text("Pull down to refresh your saved runs and plan. This does not start a new Strava sync.")
                }
                Section("Connections") {
                    settingsRow("WhatsApp", symbol: "message", status: store.whatsapp.map { $0.connected && $0.authorized ? "Connected" : "Not connected" } ?? "Not loaded") { store.settingsSheet = .whatsapp }
                    settingsRow("Email", symbol: "envelope", status: store.verifiedEmail.isEmpty ? "Not connected" : "Connected") { store.settingsSheet = .email }
                }
                Section("Coaching") {
                    settingsRow("Coaching preferences", symbol: "slider.horizontal.3") { store.settingsSheet = .coaching }
                }
                Section("Notifications") {
                    settingsRow("Apple notifications", symbol: "bell.badge", status: store.push.status) { store.settingsSheet = .notifications }
                    settingsRow("All reminders", symbol: "clock") { store.settingsSheet = .reminders }
                }
                Section {
                    Button("Sign out", role: .destructive) { confirmLogout = true }
                } footer: { Text("Same Run Analytics account and running data. No separate subscription.") }
            }.frame(maxWidth: 760).frame(maxWidth: .infinity)
                .scrollContentBackground(.hidden).background(RunBrand.canvas)
                .navigationTitle("Settings")
                .sheet(isPresented:$accountSheet) { NativeOnboardingView(managing:true) }
                .refreshable { await store.refreshSchedule(force:true) }
                .confirmationDialog("Sign out of this device?", isPresented: $confirmLogout) {
                    Button("Sign out", role: .destructive) { Task { await store.signOut() } }.accessibilityIdentifier("confirm-sign-out")
                }
        }
    }
    private func settingsRow(_ title: String, symbol: String, status: String? = nil, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Label(title, systemImage: symbol).foregroundStyle(.primary)
                Spacer()
                if let status { Text(status).font(.caption).foregroundStyle(.secondary) }
                Image(systemName: "chevron.right").font(.caption.bold()).foregroundStyle(.tertiary)
            }.frame(minHeight: 44).contentShape(Rectangle())
        }.buttonStyle(.plain).accessibilityIdentifier("settings-\(title)")
    }
}

enum CoachSection: String, CaseIterable, Identifiable {
    case coach, schedule, progress, settings
    var id: String { rawValue }
    var title: String {
        switch self {
        case .coach: return "Coach"
        case .schedule: return "Plan"
        case .progress: return "Progress"
        case .settings: return "Settings"
        }
    }
    var symbol: String {
        switch self {
        case .coach: return "bubble.left.and.bubble.right"
        case .schedule: return "calendar"
        case .progress: return "chart.bar.xaxis"
        case .settings: return "slider.horizontal.3"
        }
    }
}
