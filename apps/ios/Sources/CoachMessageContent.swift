import SwiftUI

struct CoachMessageSources {
    let body: String
    let urls: [URL]

    init(_ content: String) {
        let parts = content.components(separatedBy: "\n\nSources:\n")
        guard parts.count == 2 else { body = content; urls = []; return }
        body = parts[0]
        urls = parts[1].components(separatedBy: .newlines).prefix(3).compactMap { line in
            guard let url = URL(string: line.trimmingCharacters(in: .whitespaces)),
                  url.scheme == "https", let host = url.host, host.contains("."),
                  url.user == nil, url.password == nil, url.port == nil,
                  url.fragment == nil, url.absoluteString.count <= 350,
                  !host.hasSuffix(".local"), !host.hasSuffix(".internal"),
                  !host.allSatisfy({ $0.isNumber || $0 == "." }) else { return nil }
            let allowed = Set(["lat", "lon", "lng", "latitude", "longitude", "site", "wfo", "fcsttype", "unit", "units", "product", "productid", "id", "variant"])
            let query = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
            guard query.allSatisfy({ allowed.contains($0.name.lowercased()) && ($0.value?.count ?? 0) <= 80 }) else { return nil }
            return url
        }
    }
}

struct CoachMessageContent: View {
    let content: String
    var body: some View {
        let message = CoachMessageSources(content)
        VStack(alignment: .leading, spacing: 8) {
            Text(message.body).font(.body).textSelection(.enabled)
            if !message.urls.isEmpty {
                Text("Sources").font(.caption).foregroundStyle(.secondary)
                ForEach(message.urls, id: \.absoluteString) { url in
                    Link(destination: url) {
                        Label(url.host ?? "View source", systemImage: "arrow.up.right.square")
                            .font(.callout)
                    }
                    .tint(RunBrand.orange)
                    .accessibilityHint("Opens the supporting website")
                }
            }
        }
    }
}
