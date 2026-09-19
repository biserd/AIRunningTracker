import Foundation
import Security

struct SavedSession: Codable {
    let token: String
    let expires: Date
}

enum SessionVault {
    static let key: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: "run.aitracker.coach.session", kSecAttrAccount as String: "new.aitracker.run"]
    static func load() throws -> SavedSession? {
        var query = key
        query[kSecReturnData as String] = true
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else { throw APIError.keychain(status) }
        let session = try JSONDecoder().decode(SavedSession.self, from: data)
        if session.expires <= Date() { try clear(); return nil }
        return session
    }
    static func save(_ session: SavedSession) throws {
        let data = try JSONEncoder().encode(session)
        let attributes: [String: Any] = [kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
        var status = SecItemUpdate(key as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound { status = SecItemAdd(key.merging(attributes) { _, b in b } as CFDictionary, nil) }
        guard status == errSecSuccess else { throw APIError.keychain(status) }
    }
    static func clear() throws {
        let status = SecItemDelete(key as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw APIError.keychain(status) }
    }
}

// Never forward the account cookie to a redirected API URL.
final class RejectRedirects: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}

@MainActor final class CoachAPI {
    static let origin = URL(string: "https://new.aitracker.run")!
    static let cookieName = "__Host-coach_account"
    private let session: URLSession
    private(set) var credential: SavedSession?
    init() {
        let config = URLSessionConfiguration.ephemeral
        config.httpShouldSetCookies = false
        config.httpCookieStorage = nil
        config.urlCache = nil
        config.timeoutIntervalForRequest = 120
        session = URLSession(configuration: config, delegate: RejectRedirects(), delegateQueue: nil)
    }
    func restore() throws { credential = try SessionVault.load() }
    func clear() throws { credential = nil; try SessionVault.clear() }

    // The native app is a first-party consent UI. Use the existing issuer APIs;
    // never send the account token to authorization redirects or WhatsApp.
    func whatsappConsent() async throws -> WhatsAppConsent {
        struct Start: Decodable { let authorizationUrl: String }
        let start: Start = try await request("/api/whatsapp/authorize", body: ["confirm": true])
        let authorization = try NativeConnectionLinks.authorization(start.authorizationUrl)
        let (data, response) = try await session.data(for: URLRequest(url: authorization.url))
        _ = data
        guard let http = response as? HTTPURLResponse, http.statusCode == 302,
              let location = http.value(forHTTPHeaderField: "Location") else { throw APIError.invalidResponse }
        let requestID = try NativeConnectionLinks.consentRequest(location)
        let details: WhatsAppConsent.Details = try await issuerRequest(
            "/mcp/oauth/authorization-request", query: [URLQueryItem(name: "request", value: requestID)])
        guard details.eligible else { throw APIError.server(403, "An active trial or subscription is required for WhatsApp coaching.") }
        guard Set(details.scopes.map(\.scope)) == NativeConnectionLinks.readScopes else { throw APIError.invalidResponse }
        return WhatsAppConsent(request: requestID, state: authorization.state, details: details)
    }

    func approveWhatsApp(_ consent: WhatsAppConsent) async throws {
        struct Decision: Decodable { let redirectTo: String }
        let result: Decision = try await issuerRequest("/mcp/oauth/authorize/decision",
            body: ["request": consent.request, "approved": true])
        let code = try NativeConnectionLinks.callback(result.redirectTo, state: consent.state)
        let _: OK = try await request("/api/whatsapp/finish", body: ["code": code, "state": consent.state])
    }

    func applePush<T: Decodable>(_ action: String, body: [String: Any] = [:]) async throws -> T {
        guard ["register", "unregister", "reminders", "reminder", "test"].contains(action) else { throw APIError.invalidResponse }
        return try await issuerRequest("/api/apple-push/" + action, body: body)
    }
    func companion<T:Decodable>(_ action:String, body:[String:Any] = [:]) async throws -> T {
        guard ["read","preferences","checkin","reminder-draft"].contains(action) else { throw APIError.invalidResponse }
        return try await issuerRequest("/api/coach/companion/" + action, body:body)
    }
    func runningSnapshot() async throws -> Snapshot { try await issuerRequest("/api/coach/experience") }
    // Read-only access to the exact APIs used by the main Coach Insights page.
    func analytics(userID:Int) async throws -> InsightAnalytics {
        guard userID > 0 else { throw APIError.invalidResponse }
        return try await issuerRequest("/api/analytics/batch/\(userID)")
    }
    func recovery(userID:Int) async throws -> InsightRecovery {
        guard userID > 0 else { throw APIError.invalidResponse }
        return try await issuerRequest("/api/performance/recovery/\(userID)")
    }
    func coachRecaps() async throws -> InsightRecaps { try await issuerRequest("/api/coach-recaps") }
    static func isInsightReadPath(_ path:String)->Bool {
        path == "/api/coach-recaps" || path.range(of:"^/api/(analytics/batch|performance/recovery)/[1-9][0-9]*$",options:.regularExpression) != nil
    }
    private func issuerRequest<T: Decodable>(_ path: String, query: [URLQueryItem] = [], body: [String: Any]? = nil) async throws -> T {
        guard (Self.isInsightReadPath(path) && body == nil) || ["/api/coach/experience","/api/coach/companion/reminder-draft","/api/coach/companion/read","/api/coach/companion/preferences","/api/coach/companion/checkin","/mcp/oauth/authorization-request", "/mcp/oauth/authorize/decision", "/api/apple-push/register", "/api/apple-push/unregister", "/api/apple-push/reminders", "/api/apple-push/reminder", "/api/apple-push/test"].contains(path),
              let credential, credential.expires > Date() else { throw APIError.missingSession }
        var url = URLComponents(string: "https://aitracker.run" + path)!
        if !query.isEmpty { url.queryItems = query }
        var request = URLRequest(url: url.url!)
        request.httpMethod = body == nil ? "GET" : "POST"
        request.setValue("Bearer \(credential.token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.setValue("https://aitracker.run", forHTTPHeaderField: "Origin")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            let response = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            throw APIError.server(http.statusCode, response?["message"] as? String ?? "Could not complete the request. Please retry.")
        }
        guard data.count < 300_000 else { throw APIError.invalidResponse }
        return try JSONDecoder().decode(T.self, from: data)
    }
    func request<T: Decodable>(_ path: String, body: [String: Any]? = nil) async throws -> T {
        guard path.hasPrefix("/api/"), !path.contains(".."), !path.contains("?") else { throw APIError.invalidResponse }
        var request = URLRequest(url: Self.origin.appendingPathComponent(String(path.dropFirst())))
        request.httpMethod = body == nil ? "GET" : "POST"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue(Self.origin.absoluteString, forHTTPHeaderField: "Origin")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        if let credential, credential.expires > Date() {
            request.setValue("\(Self.cookieName)=\(credential.token)", forHTTPHeaderField: "Cookie")
        }
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            if http.statusCode == 401 { try clear() }
            let error = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            throw APIError.server(http.statusCode, error?["error"] as? String ?? "Could not complete the request. Please retry.")
        }
        if path == "/api/account/verify" {
            var fields: [String: String] = [:]
            for (key, value) in http.allHeaderFields { fields[String(describing: key)] = String(describing: value) }
            guard let cookie = HTTPCookie.cookies(withResponseHeaderFields: fields, for: Self.origin).first(where: {
                $0.name == Self.cookieName && $0.domain == Self.origin.host && $0.path == "/" && $0.isSecure
            }), !cookie.value.isEmpty else { throw APIError.missingSession }
            let saved = SavedSession(token: cookie.value, expires: cookie.expiresDate ?? Date().addingTimeInterval(604800))
            try SessionVault.save(saved)
            credential = saved
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
}
