import SwiftUI
import WebKit

// Connections/OAuth only. Voice runs natively in the Coach tab.
// Cookies live in a nonpersistent WK store, scoped only to the coach hostname.
struct ExistingCoachFlow: UIViewRepresentable {
    let destination: WebDestination
    let api: CoachAPI
    func makeCoordinator() -> Coordinator { Coordinator(api: api) }
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        context.coordinator.observeBackground(webView)
        Task { @MainActor in
            guard let credential = api.credential, credential.expires > Date(),
                  let cookie = HTTPCookie(properties: [.name: CoachAPI.cookieName, .value: credential.token,
                    .domain: "new.aitracker.run", .path: "/", .secure: "TRUE", .expires: credential.expires,
                    HTTPCookiePropertyKey("HttpOnly"): "TRUE"]) else { return }
            await config.websiteDataStore.httpCookieStore.setCookie(cookie)
            webView.load(URLRequest(url: destination.url))
        }
        return webView
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.setMicrophoneCaptureState(.none, completionHandler: nil)
        uiView.stopLoading()
        uiView.loadHTMLString("", baseURL: nil)
        coordinator.stopVoice()
    }
    @MainActor final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let api: CoachAPI
        var observer: NSObjectProtocol?
        init(api: CoachAPI) { self.api = api }
        deinit { if let observer { NotificationCenter.default.removeObserver(observer) } }
        func stopVoice() { Task { let _: OK? = try? await api.request("/api/ai/voice/stop", body: [:]) } }
        func observeBackground(_ webView: WKWebView) {
            observer = NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self, weak webView] _ in
                Task { @MainActor in
                    webView?.setMicrophoneCaptureState(.none, completionHandler: nil)
                    self?.stopVoice()
                }
            }
        }
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { decisionHandler(.cancel); return }
            if url.absoluteString == "about:blank" { decisionHandler(.allow); return }
            if url.scheme == "https", ["new.aitracker.run", "aitracker.run"].contains(url.host ?? ""), url.port == nil {
                decisionHandler(.allow); return
            }
            decisionHandler(.cancel)
            // Open only intentional external links, never arbitrary redirect schemes.
            if action.navigationType == .linkActivated, url.scheme == "https" || url.scheme == "whatsapp" {
                UIApplication.shared.open(url)
            }
        }
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = navigationAction.request.url, navigationAction.navigationType == .linkActivated,
               url.scheme == "https", url.host == "wa.me" { UIApplication.shared.open(url) }
            return nil
        }
        func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(origin.protocol == "https" && origin.host == "new.aitracker.run" && frame.isMainFrame && type == .microphone ? .prompt : .deny)
        }
    }
}
