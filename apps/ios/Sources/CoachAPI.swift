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
