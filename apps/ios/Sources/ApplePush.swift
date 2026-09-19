import SwiftUI
import UserNotifications

extension Notification.Name {
    static let applePushToken = Notification.Name("applePushToken")
    static let applePushOpen = Notification.Name("applePushOpen")
    static let applePushFailure = Notification.Name("applePushFailure")
}

final class PushAppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken token: Data) {
        NotificationCenter.default.post(name: .applePushToken, object: token.map { String(format: "%02x", $0) }.joined())
    }
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .applePushFailure, object: nil)
    }
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                withCompletionHandler completion: @escaping (UNNotificationPresentationOptions) -> Void) {
        let generation = notification.request.content.userInfo["generation"] as? String
        completion(generation != nil && generation == UserDefaults.standard.string(forKey: "pushGeneration") ? [.banner, .sound] : [])
    }
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
                                withCompletionHandler completion: @escaping () -> Void) {
        let data = response.notification.request.content.userInfo
        if let generation = data["generation"] as? String,
           generation == UserDefaults.standard.string(forKey: "pushGeneration"),
           let destination = data["destination"] as? String, ["coach", "schedule"].contains(destination) {
            // Persist only the allowlisted screen, never a URL or runner data.
            UserDefaults.standard.set(destination, forKey: "pushDestination")
            if let value=data["activityId"] as? String, let id=Int(value),id>0 {
                UserDefaults.standard.set(id,forKey:"pushActivity")
            } else { UserDefaults.standard.removeObject(forKey:"pushActivity") }
            NotificationCenter.default.post(name: .applePushOpen, object: destination)
        }
        completion()
    }
}

struct AppleReminder: Decodable, Identifiable {
    let id, title: String
    let due_at: Double
    var recurrence:String? = nil
}

@MainActor final class ApplePush: ObservableObject {
    @Published var enabled = false
    @Published var reminders = true
    @Published var runs = true
    @Published var status = "Off"
    @Published var items: [AppleReminder] = []
    @Published var busy = false
    private var token: String?
    private var runner: Int?
    private var epoch = UUID()
    private var api: CoachAPI?
    private var installation: String {
        if let id = UserDefaults.standard.string(forKey: "pushInstallation") { return id }
        let id = UUID().uuidString.lowercased()
        UserDefaults.standard.set(id, forKey: "pushInstallation")
        return id
    }
    private func key(_ field: String) -> String { "push.\(runner ?? 0).\(field)" }
    func attach(api: CoachAPI, runner: Int) async {
        guard self.runner != runner else { return }
        epoch = UUID(); self.api = api; self.runner = runner; token = nil
        enabled = UserDefaults.standard.bool(forKey: key("enabled"))
        reminders = UserDefaults.standard.object(forKey: key("reminders")) as? Bool ?? true
        runs = UserDefaults.standard.object(forKey: key("runs")) as? Bool ?? true
        status = enabled ? "Connecting…" : "Off"
        if enabled { await resume() }
    }
    func resume() async {
        guard enabled, runner != nil else { return }
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        guard enabled, runner != nil else { return }
        if settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional {
            UIApplication.shared.registerForRemoteNotifications()
        } else {
            if let api { let _: OK? = try? await api.applePush("unregister", body: ["installation": installation]) }
            clearLocalDelivery()
            status = "Notifications are off in iOS Settings"
        }
    }
    func enable() async throws {
        guard runner != nil else { throw APIError.missingSession }
        let current = epoch
        let allowed = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
        guard current == epoch else { return }
        guard allowed else { status = "Allow notifications in iOS Settings"; return }
        enabled = true; UserDefaults.standard.set(true, forKey: key("enabled")); status = "Connecting…"
        UIApplication.shared.registerForRemoteNotifications()
    }
    func received(token: String) async throws {
        guard enabled, runner != nil else { return }
        self.token = token
        try await save()
    }
    func save() async throws {
        guard let api, let token, enabled else { return }
        let current = epoch
        struct Registered: Decodable { let generation: String }
        #if DEBUG
        let environment = "sandbox"
        #else
        let environment = "production"
        #endif
        let result: Registered = try await api.applePush("register", body: ["installation": installation, "token": token,
            "environment": environment, "reminders": reminders, "runs": runs])
        guard current == epoch else { return }
        UserDefaults.standard.set(result.generation, forKey: "pushGeneration")
        UserDefaults.standard.set(reminders, forKey: key("reminders"))
        UserDefaults.standard.set(runs, forKey: key("runs"))
        status = "Connected"
        try await refresh()
    }
    func refresh() async throws {
        guard let api else { return }
        let current = epoch
        struct List: Decodable { let reminders: [AppleReminder] }
        let result: List = try await api.applePush("reminders")
        guard current == epoch else { return }
        items = result.reminders
    }
    func disable() async throws {
        guard let api else { return }
        let _: OK = try await api.applePush("unregister", body: ["installation": installation])
        UserDefaults.standard.set(false, forKey: key("enabled")); enabled = false; status = "Off"
        UIApplication.shared.unregisterForRemoteNotifications()
        clearLocalDelivery()
    }
    func detach(cleanupAPI: CoachAPI? = nil) async {
        epoch = UUID()
        let oldAPI = cleanupAPI ?? api
        // Disable OS delivery immediately, including when logout is offline.
        UIApplication.shared.unregisterForRemoteNotifications()
        clearLocalDelivery()
        runner = nil; api = nil; token = nil; enabled = false; status = "Off"; items = []
        if let oldAPI { let _: OK? = try? await oldAPI.applePush("unregister", body: ["installation": installation]) }
    }
    private func clearLocalDelivery() {
        UserDefaults.standard.removeObject(forKey: "pushGeneration")
        UserDefaults.standard.removeObject(forKey: "pushDestination")
        UserDefaults.standard.removeObject(forKey: "pushActivity")
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()
    }
    func schedule(title: String, date: Date, id: String = UUID().uuidString, recurrence:String = "none", timezone:String = TimeZone.current.identifier) async throws {
        guard let api else { throw APIError.missingSession }
        let _: OK = try await api.applePush("reminder", body: ["id": id, "title": title, "dueAt": Int(date.timeIntervalSince1970), "recurrence":recurrence, "timezone":timezone])
        try await refresh()
    }
    func cancel(_ id: String) async throws {
        guard let api else { return }
        let _: OK = try await api.applePush("reminder", body: ["id": id, "cancel": true])
        try await refresh()
    }
    func test() async throws {
        guard let api else { return }
        let _: OK = try await api.applePush("test", body: ["installation": installation])
    }
}

struct NativePushSettings: View {
    @EnvironmentObject var store: CoachStore
    @ObservedObject var push: ApplePush
    @Environment(\.openURL) private var openURL
    @State private var title = "Time for your run"
    @State private var date = Date().addingTimeInterval(3600)
    @State private var saved = false
    @State private var recurrence = "none"
    var body: some View {
        Form {
            Section {
                LabeledContent("Notifications", value: push.status)
                if push.enabled {
                    if push.status != "Connected" { Button("Retry connection") { Task { await push.resume() } } }
                    Toggle("Running reminders", isOn: $push.reminders).onChange(of: push.reminders) { _, _ in perform { try await push.save() } }
                    Toggle("New synced runs", isOn: $push.runs).onChange(of: push.runs) { _, _ in perform { try await push.save() } }
                    Button("Send a test notification") { perform { try await push.test(); saved = true } }
                    Button("Turn off notifications", role: .destructive) { perform { try await push.disable() } }
                } else {
                    Button("Enable notifications") { perform { try await push.enable() } }.buttonStyle(.borderedProminent)
                }
                Button("Open iOS notification settings") { if let url = URL(string: UIApplication.openNotificationSettingsURLString) { openURL(url) } }
            } footer: { Text("Private alerts on this device. Run details and reminder text stay inside the app. Delivery may be delayed by Focus or network conditions.") }
            if push.enabled && push.reminders {
                Section("New reminder") {
                    TextField("Reminder", text: $title)
                    DatePicker("When", selection: $date, in: Date().addingTimeInterval(60)...Date().addingTimeInterval(6 * 86400))
                    Picker("Repeat",selection:$recurrence) { Text("Once").tag("none");Text("Daily").tag("daily");Text("Weekly").tag("weekly") }
                }
                Section("Your reminders") {
                    ForEach(push.items) { item in
                        VStack(alignment: .leading) {
                            Text(item.title)
                            if let recurrence=item.recurrence { Text("Repeats \(recurrence)").font(.caption).foregroundStyle(.secondary) }
                            Text(Date(timeIntervalSince1970: item.due_at), format: .dateTime.month().day().hour().minute()).foregroundStyle(.secondary)
                            Button("Cancel", role: .destructive) { perform { try await push.cancel(item.id) } }
                        }
                    }
                }
            }
        }.navigationTitle("Notifications").disabled(push.busy)
            .toolbar {
                if push.enabled && push.reminders {
                    ToolbarItem(placement:.confirmationAction) {
                        Button("Set reminder") { perform { try await push.schedule(title:title,date:date,recurrence:recurrence); saved=true } }
                            .buttonStyle(.borderedProminent).disabled(push.busy || title.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty)
                    }
                }
            }
            .alert("Saved", isPresented: $saved) { Button("OK", role: .cancel) {} } message: { Text("Your request is saved. Notifications are checked every 30 seconds.") }
    }
    private func perform(_ action: @escaping @MainActor () async throws -> Void) {
        push.busy = true
        Task { defer { push.busy = false }; do { try await action() } catch { store.report(error) } }
    }
}
