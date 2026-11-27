import SwiftUI
import AuthenticationServices
import StoreKit

struct NativeOnboarding:Codable {
    var sampleData:Bool? = nil
    let stravaConnected:Bool
    let syncStatus:String?
    let hasAccess:Bool
    let billingProvider:String?
    let appAccountToken:String
    let purchasesAvailable:Bool
    // Account access and recording do not require a provider or coaching subscription.
    var canRecord:Bool { true }
}
struct NativeStravaStart:Decodable { let url:String; let state:String }

@MainActor final class NativeStravaConnection:NSObject,ObservableObject,ASWebAuthenticationPresentationContextProviding {
    private var session:ASWebAuthenticationSession?
    func presentationAnchor(for session:ASWebAuthenticationSession)->ASPresentationAnchor {
        UIApplication.shared.connectedScenes.compactMap{$0 as? UIWindowScene}.flatMap{$0.windows}.first(where:{$0.isKeyWindow}) ?? ASPresentationAnchor()
    }
    func connect(_ start:NativeStravaStart, provider:String = "strava") async throws {
        guard let url=URL(string:start.url),url.scheme=="https",url.user==nil,url.password==nil,url.port==nil,
              (provider=="strava" && url.host=="www.strava.com" && url.path=="/oauth/authorize") ||
              (provider=="garmin" && url.host=="aitracker.run" && url.path=="/api/native/garmin/launch") else { throw APIError.invalidResponse }
        defer { session=nil }
        try await withCheckedThrowingContinuation { (continuation:CheckedContinuation<Void,Error>) in
            session=ASWebAuthenticationSession(url:url,callbackURLScheme:"runanalytics") { callback,error in
                if let error { continuation.resume(throwing:error); return }
                guard let callback,let result=URLComponents(url:callback,resolvingAgainstBaseURL:false),
                      result.scheme=="runanalytics",result.host==provider,
                      result.queryItems?.filter({$0.name=="state"}).count==1,
                      result.queryItems?.first(where:{$0.name=="state"})?.value==start.state,
                      result.queryItems?.first(where:{$0.name=="status"})?.value=="connected" else {
                    continuation.resume(throwing:APIError.server(400,"The service was not connected. Please retry and allow access to activities.")); return
                }
                continuation.resume()
            }
            session?.presentationContextProvider=self
            if session?.start() != true { continuation.resume(throwing:APIError.invalidResponse) }
        }
        session=nil
    }
}

struct NativeOnboardingView:View {
    @EnvironmentObject var store:CoachStore
    @Environment(\.dismiss) private var dismiss
    @StateObject private var strava=NativeStravaConnection()
    @State private var busy=false
    @State private var message:String?
    @State private var confirmDeletion=false
    @State private var garmin:NativeGarminStatus?
    @State private var garminConsent=false
    @State private var showSources=false
    var managing=false
    var body:some View {
        NavigationStack {
            ScrollView {
                VStack(alignment:.leading,spacing:24) {
                    Text(managing ? "Your account" : "Set up your running").font(.largeTitle.bold())
                        .accessibilityAddTraits(.isHeader)
                    if managing {
                        Text("Connect a service to import your running history, or keep using Run Analytics on its own.").foregroundStyle(.secondary)
                    }
                    if let status=store.onboarding {
                        if status.sampleData == true {
                            Label("Review account · Sample running data",systemImage:"info.circle")
                        }
                        if !managing {
                            VStack(alignment: .leading, spacing: RunDesign.gap) {
                                Label("First step", systemImage: "figure.run").font(.caption).textCase(.uppercase)
                                Text("Go for a run").font(.title2.bold()).accessibilityAddTraits(.isHeader)
                                Text("Track distance, pace and time. No need to connect a watch or subscribe.")
                            }
                            .padding(RunDesign.insetPadding)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(RunDesign.highlight, in: RoundedRectangle(cornerRadius: RunDesign.panelRadius))
                            Button("Continue to Run") { store.completeSetup(); dismiss() }
                                .buttonStyle(RunActionStyle()).disabled(busy)
                                .accessibilityIdentifier("setup-continue-to-run")
                        }
                        if status.sampleData != true {
                            if managing {
                                sourceOptions(status)
                            } else {
                                DisclosureGroup("Connect Garmin or Strava", isExpanded: $showSources) {
                                    sourceOptions(status).padding(.top, RunDesign.gap)
                                }
                                .padding(RunDesign.insetPadding)
                                .frame(minHeight: RunDesign.actionHeight)
                                .background(RunDesign.inset, in: RoundedRectangle(cornerRadius: RunDesign.radius))
                                .accessibilityIdentifier("setup-optional-sources")
                                Text("Connect or disconnect services anytime in Settings.").font(.footnote).foregroundStyle(.secondary)
                            }
                        }
                        if managing {
                            VStack(alignment:.leading,spacing:14) {
                                Label("Optional coaching",systemImage:"bubble.left.and.bubble.right").font(.title2.bold())
                                if status.hasAccess {
                                    Text("Your existing coaching access is active.")
                                    if status.billingProvider=="apple" { ManageAppleSubscription() }
                                } else if status.purchasesAvailable,let subscriptions=store.subscriptions { NativePaywall(subscriptions:subscriptions) }
                            }.padding(22).frame(maxWidth:.infinity,alignment:.leading).background(RunBrand.surface,in:RoundedRectangle(cornerRadius:22))
                        }
                    } else if message == nil { ProgressView("Loading your account…") }
                    if busy { ProgressView("Please wait…") }
                    if let message { Text(message).foregroundStyle(.red) }
                    Button("Refresh account") { Task { await reload() } }.buttonStyle(.bordered).disabled(busy)
                    HStack {
                        Button("Sign out") { Task { await store.signOut() } }
                        Spacer()
                        Button("Delete account",role:.destructive) { confirmDeletion=true }
                    }.font(.footnote)
                }.padding(24).frame(maxWidth:650).frame(maxWidth:.infinity)
            }.background(RunDesign.canvas.ignoresSafeArea())
            .toolbar { if managing { ToolbarItem(placement:.confirmationAction) { Button("Close") { dismiss() } } } }
            .task { await reload() }
            .confirmationDialog("Permanently delete your account and running data?",isPresented:$confirmDeletion,titleVisibility:.visible) {
                Button("Delete my account",role:.destructive) { Task { await delete() } }
            } message: { Text("This cannot be undone. Apple subscriptions must also be cancelled in Apple's subscription settings; deleting your account does not cancel Apple billing.") }
        }
    }
    private func sourceOptions(_ status: NativeOnboarding) -> some View {
        VStack(alignment: .leading, spacing: RunDesign.gap) {
            VStack(alignment: .leading, spacing: RunDesign.gap) {
                Label("Garmin", systemImage: "applewatch").font(.title3.bold())
                if garmin?.connected == true { Text("Connected. Your Garmin runs sync to this account.") }
                else {
                    Text("Import running activity summaries from Garmin. Health and sleep sharing are separate permissions.").foregroundStyle(.secondary)
                    Toggle("Allow RunAnalytics to import my Garmin activities", isOn: $garminConsent)
                    Button("Connect Garmin") { Task { await connectGarmin() } }
                        .buttonStyle(RunActionStyle(prominence: .secondary))
                        .disabled(busy || !garminConsent || garmin?.available != true)
                    if garmin?.available != true { Text("Garmin connection is currently unavailable. You can add it later.").font(.footnote).foregroundStyle(.secondary) }
                }
            }.padding(RunDesign.insetPadding).frame(maxWidth: .infinity, alignment: .leading)
                .background(RunDesign.surface, in: RoundedRectangle(cornerRadius: RunDesign.panelRadius))
            VStack(alignment: .leading, spacing: RunDesign.gap) {
                Label("Strava", systemImage: "figure.run").font(.title3.bold())
                Text(status.stravaConnected ? "Connected. Your Strava runs sync to this account." : "Import your available running history from Strava.").foregroundStyle(.secondary)
                if !status.stravaConnected {
                    Button("Connect Strava") { Task { await connect() } }
                        .buttonStyle(RunActionStyle(prominence: .secondary)).disabled(busy)
                }
            }.padding(RunDesign.insetPadding).frame(maxWidth: .infinity, alignment: .leading)
                .background(RunDesign.surface, in: RoundedRectangle(cornerRadius: RunDesign.panelRadius))
        }
    }
    private func reload() async {
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--test-first-run-setup") { return }
        #endif
        do { try await store.refreshOnboarding() } catch { message=error.localizedDescription }
        garmin=try? await store.api.garminStatus()
    }
    private func connectGarmin() async {
        guard !busy,garminConsent else{return};busy=true;message=nil;defer{busy=false}
        do { try await strava.connect(store.api.startGarmin(),provider:"garmin"); await reload(); await store.refreshRuns() }
        catch { if (error as? ASWebAuthenticationSessionError)?.code != .canceledLogin { message=error.localizedDescription } }
    }
    private func connect() async {
        guard !busy else { return }; busy=true; message=nil; defer{busy=false}
        do { try await strava.connect(store.api.startStrava()); try await store.refreshOnboarding() }
        catch { if (error as? ASWebAuthenticationSessionError)?.code != .canceledLogin { message=error.localizedDescription } }
    }
    private func delete() async {
        guard !busy else{return}; busy=true; defer{busy=false}
        do {
            try await store.api.deleteAccount()
            var cleanupFailure:String?
            do { try store.recorder.clearAccountFiles() } catch { cleanupFailure="Your account was deleted, but local recordings could not be removed. Remove the app from this iPhone to erase them." }
            await store.signOut()
            if let cleanupFailure { store.error=cleanupFailure }
        } catch { message=error.localizedDescription }
    }
}

struct ManageAppleSubscription:View {
    @State private var showing=false
    var body:some View { Button("Manage Apple subscription") { showing=true }.manageSubscriptionsSheet(isPresented:$showing) }
}
struct NativePaywall:View {
    @ObservedObject var subscriptions:AppleSubscriptions
    @State private var eligible:Set<String>=[]
    @State private var eligibilityLoaded=false
    @State private var selectedID:String?
    @State private var restoring=false
    @State private var restoreNotice:String?

    private var selected: Product? { subscriptions.products.first { $0.id == selectedID } }
    private var working: Bool { restoring || subscriptions.state == .purchasing }

    var body:some View {
        VStack(alignment:.leading,spacing:16) {
            Text("Run Analytics Premium").font(.title2.bold()).accessibilityAddTraits(.isHeader)
            Text("Personal coaching, voice conversations and insights from your runs.")
            if subscriptions.loadingProducts {
                ProgressView("Loading Apple subscription options…")
            } else if subscriptions.products.isEmpty {
                Text("Apple subscription options are unavailable right now.").foregroundStyle(.secondary)
                Button("Retry loading plans") { Task { await subscriptions.reloadProducts() } }.buttonStyle(.bordered)
            } else {
                ForEach(subscriptions.products,id:\.id) { product in
                    option(product)
                }
                if !eligibilityLoaded { ProgressView("Checking trial eligibility…").font(.footnote) }
                if let selected { Text(terms(selected)).font(.callout).foregroundStyle(.secondary) }
                Button {
                    guard let selected else { return }
                    Task { await subscriptions.purchase(selected) }
                } label: {
                    if subscriptions.state == .purchasing { ProgressView("Confirming with Apple…") }
                    else { Text(selected.flatMap(trialDuration) == nil ? "Continue with Apple" : "Start free trial with Apple") }
                }
                .buttonStyle(RunActionStyle())
                .disabled(selected == nil || !eligibilityLoaded || working || subscriptions.state == .pending)
                .accessibilityIdentifier("continue-apple-purchase")
            }
            if subscriptions.state == .pending {
                Label("Waiting for Apple approval. There’s no need to try buying again.", systemImage: "clock")
            }
            if subscriptions.state == .cancelled {
                Text("Purchase cancelled. Nothing was charged for this attempt.").foregroundStyle(.secondary)
            }
            if let error=subscriptions.error { Text(error).foregroundStyle(.red) }
            Text("Renews automatically unless cancelled at least 24 hours before the period ends. Manage or cancel in Apple subscriptions.").font(.footnote).foregroundStyle(.secondary)
            Button(restoring ? "Restoring purchases…" : "Restore purchases") {
                restoring=true; restoreNotice=nil
                Task {
                    await subscriptions.restore()
                    restoring=false
                    if subscriptions.error == nil { restoreNotice="Restore finished. If access hasn’t updated, check the Apple account used for the purchase." }
                }
            }.disabled(working)
            if let restoreNotice { Text(restoreNotice).font(.callout).foregroundStyle(.secondary) }
            ManageAppleSubscription()
            HStack {
                Link("Terms of Use",destination:URL(string:"https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!)
                Link("Privacy",destination:URL(string:"https://aitracker.run/privacy")!)
            }.font(.footnote)
        }.task(id:subscriptions.products.map(\.id)) {
            let products=subscriptions.products
            if !products.contains(where: { $0.id == selectedID }) { selectedID=nil }
            eligibilityLoaded=false
            var current:Set<String>=[]
            for product in products {
                if await product.subscription?.isEligibleForIntroOffer == true { current.insert(product.id) }
            }
            guard !Task.isCancelled else { return }
            eligible=current
            eligibilityLoaded=true
        }
    }

    private func option(_ product: Product) -> some View {
        let chosen=selectedID == product.id
        return Button {
            selectedID=product.id
            restoreNotice=nil
        } label: {
            HStack(alignment: .top, spacing: RunDesign.gap) {
                Image(systemName: chosen ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(chosen ? RunDesign.action : Color.secondary)
                    .accessibilityHidden(true)
                VStack(alignment:.leading,spacing:4) {
                    Text(product.id.hasSuffix("annual") ? "Annual" : "Monthly").font(.headline)
                    Text(terms(product)).foregroundStyle(.secondary).font(.callout)
                }
                Spacer(minLength: 0)
            }
            .padding(RunDesign.insetPadding)
            .frame(maxWidth:.infinity,minHeight:RunDesign.actionHeight,alignment:.leading)
            .background(chosen ? RunDesign.highlight : RunDesign.inset, in: RoundedRectangle(cornerRadius:RunDesign.radius))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain).disabled(working || subscriptions.state == .pending)
        .accessibilityElement(children:.combine)
        .accessibilityAddTraits(chosen ? .isSelected : [])
    }

    private func terms(_ product: Product) -> String {
        let period=product.subscription?.subscriptionPeriod
        let cadence=period.flatMap { duration($0) } ?? (product.id.hasSuffix("annual") ? "1 year" : "1 month")
        let renewal="\(product.displayPrice) every \(cadence)"
        guard let trial=trialDuration(product) else { return renewal }
        return "\(trial) free, then \(renewal)"
    }

    private func trialDuration(_ product: Product) -> String? {
        guard eligibilityLoaded, eligible.contains(product.id),
              let offer=product.subscription?.introductoryOffer, offer.paymentMode == .freeTrial else { return nil }
        return duration(offer.period, count: offer.periodCount)
    }

    private func duration(_ period: Product.SubscriptionPeriod, count: Int = 1) -> String? {
        let total=period.value * count
        let formatter=DateComponentsFormatter()
        formatter.unitsStyle = .full
        switch period.unit {
        case .day: formatter.allowedUnits = .day; return formatter.string(from:DateComponents(day:total))
        case .week: formatter.allowedUnits = .day; return formatter.string(from:DateComponents(day:total * 7))
        case .month: formatter.allowedUnits = .month; return formatter.string(from:DateComponents(month:total))
        case .year: formatter.allowedUnits = .year; return formatter.string(from:DateComponents(year:total))
        @unknown default: return nil
        }
    }
}
