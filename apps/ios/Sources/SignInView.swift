import SwiftUI

enum RunBrand {
    static let orange = Color(red: 200 / 255, green: 59 / 255, blue: 10 / 255)
}

struct SignInView: View {
    @EnvironmentObject var store: CoachStore
    @Environment(\.colorScheme) private var scheme
    @State private var email = ""
    @State private var link = ""
    @State private var sentTo: String?
    @State private var showLink = false
    @State private var sending = false
    @FocusState private var emailFocused: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 30) {
                HStack(spacing: 12) {
                    Image(systemName: "waveform.path.ecg")
                        .font(.title2.bold()).foregroundStyle(.white).padding(14)
                        .background(RunBrand.orange, in: RoundedRectangle(cornerRadius: 15))
                    Text("Run Analytics").font(.title.bold())
                }.padding(.top, 36)

                VStack(alignment: .leading, spacing: 12) {
                    Text("Your running.\nYour coach.").font(.system(.largeTitle, design: .rounded).bold())
                    Text("Sign in with a link. No password needed.")
                        .font(.title3).foregroundStyle(.secondary)
                }

                VStack(alignment: .leading, spacing: 18) {
                    Text("Email address").font(.headline)
                    TextField("you@example.com", text: $email)
                        .textContentType(.emailAddress).keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                        .submitLabel(.go).focused($emailFocused)
                        .padding(16).background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
                        .accessibilityLabel("Email address")
                        .onSubmit { sendLink() }
                    Button(action: sendLink) {
                        HStack {
                            if sending { ProgressView().tint(.white) }
                            Text(sending ? "Sending your link…" : sentTo == nil ? "Email me a sign-in link" : "Send a new link")
                                .font(.headline)
                        }.frame(maxWidth: .infinity).padding(.vertical, 12)
                    }.buttonStyle(.borderedProminent).buttonBorderShape(.roundedRectangle(radius: 12))
                        .disabled(store.busy || email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                    if let sentTo {
                        Label("Check your inbox", systemImage: "envelope.badge").font(.headline).foregroundStyle(RunBrand.orange)
                        Text("If \(sentTo) has an account, your link is on its way. Check spam too.")
                            .font(.callout).foregroundStyle(.secondary)
                    } else {
                        Text("Use the email for your existing account.").font(.callout).foregroundStyle(.secondary)
                    }
                }.padding(24).background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 24))

                DisclosureGroup(isExpanded: $showLink) {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("In this test build, press and hold the sign-in button in your email and copy its link. Paste it here without opening it first.")
                            .font(.callout).foregroundStyle(.secondary)
                        TextField("Paste your sign-in link", text: $link, axis: .vertical)
                            .lineLimit(2...3).textInputAutocapitalization(.never).autocorrectionDisabled()
                            .privacySensitive().padding(14)
                            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
                        Button {
                            Task { await store.verify(link: link); if !store.needsSignIn { link = "" } }
                        } label: {
                            HStack {
                                if store.busy && !sending { ProgressView().tint(.white) }
                                Text("Open my coach").font(.headline)
                            }.frame(maxWidth: .infinity).padding(.vertical, 10)
                        }.buttonStyle(.borderedProminent).disabled(store.busy || link.isEmpty)
                    }.padding(.top, 16)
                } label: {
                    Text("Already have your link?").font(.headline)
                }.padding(24).background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 24))

                Label("Your account. Your running data.", systemImage: "lock.shield")
                    .font(.callout).foregroundStyle(.secondary).frame(maxWidth: .infinity)
            }.frame(maxWidth: 480).padding(24).frame(maxWidth: .infinity)
        }
        .background(scheme == .dark ? Color(.systemGroupedBackground) : Color(red: 248 / 255, green: 250 / 255, blue: 252 / 255))
        .scrollDismissesKeyboard(.interactively)
    }

    private func sendLink() {
        guard !store.busy, !sending else { return }
        emailFocused = false
        let requestedEmail = email
        sending = true
        Task {
            defer { sending = false }
            if await store.requestSignInLink(email: requestedEmail) {
                sentTo = requestedEmail.trimmingCharacters(in: .whitespacesAndNewlines)
                showLink = true
            }
        }
    }
}
