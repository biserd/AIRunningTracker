import Foundation

enum NativeConnectionLinks {
    static let readScopes: Set<String> = ["mcp:profile.read", "mcp:activities.read", "mcp:analytics.read", "mcp:goals.read", "mcp:plans.read"]
    private static func trusted(_ raw: String, host: String, path: String) throws -> URLComponents {
        guard let url = URLComponents(string: raw), url.scheme == "https", url.host == host,
              url.path == path, url.port == nil, url.user == nil, url.password == nil, url.fragment == nil else {
            throw APIError.invalidResponse
        }
        return url
    }
    private static func value(_ key: String, in url: URLComponents) throws -> String {
        let entries = (url.queryItems ?? []).filter { $0.name == key }
        guard entries.count == 1, let value = entries[0].value, !value.isEmpty else { throw APIError.invalidResponse }
        return value
    }
    static func authorization(_ raw: String) throws -> (url: URL, state: String) {
        let url = try trusted(raw, host: "aitracker.run", path: "/mcp/oauth/authorize")
        let state = try value("state", in: url)
        guard state.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil,
              try value("response_type", in: url) == "code",
              try value("code_challenge_method", in: url) == "S256",
              Set(try value("scope", in: url).split(separator: " ").map(String.init)) == readScopes,
              try value("redirect_uri", in: url) == "https://new.aitracker.run/whatsapp/callback",
              try value("resource", in: url) == "https://aitracker.run/mcp" else { throw APIError.invalidResponse }
        return (url.url!, state)
    }
    static func consentRequest(_ location: String) throws -> String {
        let raw = location.hasPrefix("/") && !location.hasPrefix("//") ? "https://aitracker.run" + location : location
        let url = try trusted(raw, host: "aitracker.run", path: "/mcp/consent")
        let request = try value("request", in: url)
        guard request.range(of: "^ra_mcp_req_[A-Za-z0-9_-]{40,80}$", options: .regularExpression) != nil else { throw APIError.invalidResponse }
        return request
    }
    static func callback(_ raw: String, state: String) throws -> String {
        let url = try trusted(raw, host: "new.aitracker.run", path: "/whatsapp/callback")
        guard try value("state", in: url) == state, !(url.queryItems ?? []).contains(where: { $0.name == "error" }) else { throw APIError.invalidResponse }
        let code = try value("code", in: url)
        guard code.count <= 512 else { throw APIError.invalidResponse }
        return code
    }
    static func whatsapp(_ raw: String) throws -> URL {
        guard let parsed = URLComponents(string: raw) else { throw APIError.invalidResponse }
        let url = try trusted(raw, host: "wa.me", path: parsed.path)
        let phone = String(url.path.dropFirst())
        let text = try value("text", in: url)
        guard phone.range(of: "^[1-9][0-9]{7,14}$", options: .regularExpression) != nil,
              text.range(of: "^LINK [a-f0-9]{48}$", options: .regularExpression) != nil else { throw APIError.invalidResponse }
        var native = URLComponents()
        native.scheme = "whatsapp"; native.host = "send"
        native.queryItems = [URLQueryItem(name: "phone", value: phone), URLQueryItem(name: "text", value: text)]
        guard let result = native.url else { throw APIError.invalidResponse }
        return result
    }
}
