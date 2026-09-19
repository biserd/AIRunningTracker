import XCTest
@testable import AITracker

final class NativeConnectionTests: XCTestCase {
    func testCallbackIsBoundToStateAndExactHost() throws {
        let callback = "https://new.aitracker.run/whatsapp/callback?code=test-code&state=expected"
        XCTAssertEqual(try NativeConnectionLinks.callback(callback, state: "expected"), "test-code")
        for value in [callback.replacingOccurrences(of: "new.aitracker.run", with: "attacker.test"),
                      callback + "&state=other", callback + "&code=second", callback + "&error=access_denied",
                      callback.replacingOccurrences(of: "https:", with: "http:"), callback + "#token=secret"] {
            XCTAssertThrowsError(try NativeConnectionLinks.callback(value, state: "expected"))
        }
        XCTAssertThrowsError(try NativeConnectionLinks.callback(callback, state: "wrong"))
    }
    func testConsentRedirectNeverEscapesIssuer() throws {
        let request = "ra_mcp_req_" + String(repeating: "a", count: 48)
        XCTAssertEqual(try NativeConnectionLinks.consentRequest("/mcp/consent?request=" + request), request)
        for location in ["//attacker.test/mcp/consent?request=" + request,
                         "https://aitracker.run.attacker.test/mcp/consent?request=" + request,
                         "/mcp/consent?request=short", "/mcp/consent?request=" + request + "&request=" + request] {
            XCTAssertThrowsError(try NativeConnectionLinks.consentRequest(location))
        }
    }
    func testWhatsAppLinkUsesNativeAppOnly() throws {
        let token = String(repeating: "a", count: 48)
        let result = try NativeConnectionLinks.whatsapp("https://wa.me/15551234567?text=LINK%20" + token)
        XCTAssertEqual(result.scheme, "whatsapp")
        XCTAssertEqual(result.host, "send")
        for raw in ["https://attacker.test/15551234567?text=LINK%20" + token,
                    "https://wa.me/invalid?text=LINK%20" + token,
                    "https://wa.me/15551234567?text=arbitrary", "http://wa.me/15551234567?text=LINK%20" + token] {
            XCTAssertThrowsError(try NativeConnectionLinks.whatsapp(raw))
        }
    }
    func testAuthorizationRejectsWriteScopesAndForeignCallback() throws {
        var url = URLComponents(string: "https://aitracker.run/mcp/oauth/authorize")!
        url.queryItems = [URLQueryItem(name: "state", value: String(repeating: "a", count: 64)),
            URLQueryItem(name: "response_type", value: "code"), URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "scope", value: NativeConnectionLinks.readScopes.sorted().joined(separator: " ")),
            URLQueryItem(name: "redirect_uri", value: "https://new.aitracker.run/whatsapp/callback"),
            URLQueryItem(name: "resource", value: "https://aitracker.run/mcp")]
        XCTAssertNoThrow(try NativeConnectionLinks.authorization(url.string!))
        url.queryItems?.append(URLQueryItem(name: "scope", value: "mcp:plans.write"))
        XCTAssertThrowsError(try NativeConnectionLinks.authorization(url.string!))
        url.queryItems?.removeLast()
        url.host = "attacker.test"
        XCTAssertThrowsError(try NativeConnectionLinks.authorization(url.string!))
    }
}
