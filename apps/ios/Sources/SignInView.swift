import SwiftUI

enum RunBrand {
    static let orange = Color(red: 200 / 255, green: 59 / 255, blue: 10 / 255)
    static let teal = Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(red:0.30,green:0.83,blue:0.73,alpha:1) : UIColor(red:0.04,green:0.43,blue:0.39,alpha:1) })
    static let blue = Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(red:0.48,green:0.70,blue:1,alpha:1) : UIColor(red:0.17,green:0.36,blue:0.68,alpha:1) })
    static let rose = Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(red:1,green:0.55,blue:0.65,alpha:1) : UIColor(red:0.68,green:0.19,blue:0.32,alpha:1) })
    static let canvas = Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor.systemGroupedBackground : UIColor(red:0.98,green:0.97,blue:0.95,alpha:1) })
    static let surface = Color(UIColor.secondarySystemGroupedBackground)
}

struct SignInView: View {
    @EnvironmentObject var store: CoachStore
    @Environment(\.colorScheme) private var scheme
    @State private var email = ""
    @State private var link = ""
    @State private var sentTo: String?
    @State private var showLink = false
    @State private var sending = false
    @State private var signup = false
    @State private var acceptedTerms = false
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
                    Picker("Account",selection:$signup) {
                        Text("Sign in").tag(false)
                        Text("Create account").tag(true)
                    }.pickerStyle(.segmented)
                    Text("Email address").font(.headline)
                    TextField("you@example.com", text: $email)
                        .textContentType(.emailAddress).keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                        .submitLabel(.go).focused($emailFocused)
                        .padding(16).background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
                        .accessibilityLabel("Email address")
                        .onSubmit { sendLink() }
                    if signup {
                        Toggle("I agree to the terms and privacy policy",isOn:$acceptedTerms).font(.callout)
                        HStack {
                            Link("Terms",destination:URL(string:"https://aitracker.run/terms")!)
                            Link("Privacy",destination:URL(string:"https://aitracker.run/privacy")!)
                        }.font(.caption)
                    }
                    Button(action: sendLink) {
                        HStack {
                            if sending { ProgressView().tint(.white) }
                            Text(sending ? "Sending your link…" : sentTo == nil ? "Email me a sign-in link" : "Send a new link")
                                .font(.headline)
                        }.frame(maxWidth: .infinity).padding(.vertical, 12)
                    }.buttonStyle(.borderedProminent).buttonBorderShape(.roundedRectangle(radius: 12))
                        .disabled(store.busy || (signup && !acceptedTerms) || email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                    if let sentTo {
                        Label("Check your inbox", systemImage: "envelope.badge").font(.headline).foregroundStyle(RunBrand.orange)
                        Text("Check \(sentTo) for your secure link. Tap it on this device to continue. Check spam too.")
                            .font(.callout).foregroundStyle(.secondary)
                    } else {
                        Text(signup ? "Verify your email, then connect Strava. No charge to create an account." : "Use the email for your existing account.").font(.callout).foregroundStyle(.secondary)
                    }
                }.padding(24).background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 24))

                DisclosureGroup(isExpanded: $showLink) {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("If your email opens a browser instead, request a fresh link. Press and hold its sign-in button, copy the link, and paste it here without opening it first.")
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
                    Text("Trouble signing in?").font(.headline)
                }.padding(24).background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 24))

                Label("Your account. Your running data.", systemImage: "lock.shield")
                    .font(.callout).foregroundStyle(.secondary).frame(maxWidth: .infinity)
            }.frame(maxWidth: 480).padding(24).frame(maxWidth: .infinity)
        }
        .background(scheme == .dark ? Color(.systemGroupedBackground) : Color(red: 248 / 255, green: 250 / 255, blue: 252 / 255))
        .scrollDismissesKeyboard(.interactively)
    }

    private func sendLink() {
        guard !store.busy, !sending, !signup || acceptedTerms else { return }
        emailFocused = false
        let requestedEmail = email
        sending = true
        Task {
            defer { sending = false }
            if await store.requestSignInLink(email: requestedEmail,signup:signup) {
                sentTo = requestedEmail.trimmingCharacters(in: .whitespacesAndNewlines)
            }
        }
    }
}
