import Foundation
import Security

struct Runner: Decodable { let id: Int; let name, timezone, unitPreference: String }
struct Workout: Decodable, Identifiable {
    let id, date, title, kind: String
    let minutes: Double
    let completed: Bool
}
struct RunningState: Decodable { let today, goal: String; let days: [Workout] }
struct Snapshot: Decodable { let runner: Runner; let state: RunningState; let canUseAI: Bool; let version: Int }
struct Message: Decodable, Identifiable {
    var id = UUID()
    let role, content: String
    enum CodingKeys: String, CodingKey { case role, content }
}
struct CoachStatus: Decodable { let configured: Bool; let history: [Message] }
struct Review: Decodable, Identifiable { let id, description: String }
struct Answer: Decodable { let message: String; let planReview: Review?; let reminderProposal: ReminderReview? }
struct ReminderReview: Decodable { let id, kind, title, localTime, timezone: String }
struct Confirmation: Decodable { let message: String }
struct OK: Decodable { let ok: Bool? }
struct WhatsAppStatus: Decodable {
    let configured, authorized, connected: Bool
    let destination: String?
    let templateReady: Bool?
}
struct Reminder: Decodable, Identifiable {
    let id, title, local_time, timezone, status: String
    let channel, delivery_status: String?
}
struct ReminderStatus: Decodable { let configured, verified: Bool; let email, timezone: String; let reminders: [Reminder] }

enum SettingsDestination: String, Identifiable {
    case whatsapp, reminders, notifications
    var id: String { rawValue }
}
struct WhatsAppConsent {
    struct Scope: Decodable { let scope, description: String }
    struct Details: Decodable { let clientName: String; let eligible: Bool; let scopes: [Scope] }
    let request, state: String
    let details: Details
}

enum APIError: LocalizedError {
    case server(Int, String), invalidResponse, missingSession, keychain(OSStatus)
    var errorDescription: String? {
        switch self {
        case .server(_, let message): return message
        case .invalidResponse: return "The server returned an unexpected response. Please retry."
        case .missingSession: return "Please sign in again."
        case .keychain: return "Your sign-in could not be stored securely. Please retry."
        }
    }
}

enum SignInLink {
    static func token(from text: String) throws -> String {
        guard let url = URLComponents(string: text.trimmingCharacters(in: .whitespacesAndNewlines)),
              url.scheme == "https", url.host == "new.aitracker.run", url.port == nil,
              url.user == nil, url.password == nil, url.path == "/auth/magic-link" else {
            throw APIError.server(400, "Paste the AITracker coach sign-in link from your email.")
        }
        let items = (url.fragment.flatMap { URLComponents(string: "?" + $0)?.queryItems } ?? []) + (url.queryItems ?? [])
        let tokens = items.filter { $0.name == "token" }
        guard tokens.count == 1, let token = tokens.first?.value,
              !token.isEmpty, token.count <= 4000 else {
            throw APIError.server(400, "Paste the AITracker coach sign-in link from your email.")
        }
        return token
    }
}

enum SignInEmail {
    static func normalize(_ text: String) throws -> String {
        let email = text.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard email.count <= 254,
              email.range(of: #"^[^\s@]+@[^\s@]+\.[^\s@]+$"#, options: .regularExpression) != nil else {
            throw APIError.server(400, "Enter a valid email address to receive your sign-in link.")
        }
        return email
    }
}
