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
    @State private var showPlans=false
    var managing=false
    var body:some View {
        NavigationStack {
            ScrollView {
                VStack(alignment:.leading,spacing:24) {
                    Text(managing ? "Your account" : "Ready to record").font(.largeTitle.bold())
                        .accessibilityAddTraits(.isHeader)
                    if managing {
                        Text("Connect a service to import your running history, or keep using Run Analytics on its own.").foregroundStyle(.secondary)
                    }
                    if let status=store.onboarding {
                        if status.sampleData == true {
                            Label("Review account · Sample running data",systemImage:"info.circle")
                        }
                        if !managing {
                            Text("Record runs for free. A watch or subscription isn’t required.")
                                .foregroundStyle(RunDesign.mutedText)
                            Button("Continue to Run") { store.completeSetup(); dismiss() }
                                .buttonStyle(RunActionStyle()).disabled(busy)
                                .accessibilityIdentifier("setup-continue-to-run")
                        }
                        if status.sampleData != true {
                            if managing {
                                sourceOptions(status)
                            } else {
                                DisclosureGroup("Connect Garmin or Strava (optional)", isExpanded: $showSources) {
                                    sourceOptions(status).padding(.top, RunDesign.gap)
                                }
                                .padding(RunDesign.insetPadding)
                                .frame(minHeight: RunDesign.actionHeight)
                                .background(RunDesign.inset, in: RoundedRectangle(cornerRadius: RunDesign.radius))
                                .accessibilityIdentifier("setup-optional-sources")
                            }
                        }
                        if managing {
                            if status.hasAccess {
                                Text("Coaching is active.").font(.headline)
                                if status.billingProvider=="apple" { ManageAppleSubscription() }
                            } else if status.purchasesAvailable, store.subscriptions != nil {
                                Button("Compare Apple plans") { showPlans=true }
                                    .buttonStyle(RunActionStyle(prominence:.secondary))
                            }
                        }
                    } else if message == nil { ProgressView("Loading your account…") }
                    if busy { ProgressView("Please wait…") }
                    if let message { Text(message).foregroundStyle(.red) }
                    if managing || store.onboarding == nil || message != nil {
                        accountActions
                    } else {
                        DisclosureGroup("Account options") { accountActions.padding(.top, RunDesign.gap) }
                            .frame(minHeight:RunDesign.minimumTarget)
                    }
                }.padding(24).frame(maxWidth:650).frame(maxWidth:.infinity)
            }.background(RunDesign.canvas.ignoresSafeArea())
            .toolbar { if managing { ToolbarItem(placement:.confirmationAction) { Button("Close") { dismiss() } } } }
            .task { await reload() }
            .sheet(isPresented:$showPlans) {
                if let subscriptions=store.subscriptions { NativePaywallSheet(subscriptions:subscriptions, entry:.account) }
            }
            .confirmationDialog("Permanently delete your account and running data?",isPresented:$confirmDeletion,titleVisibility:.visible) {
                Button("Delete my account",role:.destructive) { Task { await delete() } }
            } message: { Text("This cannot be undone. Apple subscriptions must also be cancelled in Apple's subscription settings; deleting your account does not cancel Apple billing.") }
        }
    }
    private var accountActions: some View {
        VStack(alignment:.leading,spacing:4) {
            Button("Refresh account") { Task { await reload() } }.buttonStyle(.bordered).disabled(busy)
                .frame(minHeight:RunDesign.minimumTarget)
            Button("Sign out") { Task { await store.signOut() } }
                .frame(minHeight:RunDesign.minimumTarget)
            Button("Delete account",role:.destructive) { confirmDeletion=true }
                .frame(minHeight:RunDesign.minimumTarget)
        }.font(.callout)
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
    var body:some View {
        Button("Manage Apple subscription") { showing=true }
            .frame(minHeight:RunDesign.minimumTarget)
            .manageSubscriptionsSheet(isPresented:$showing)
    }
}

enum NativePaywallEntry: String, Identifiable {
    case coach, plan, account
    var id: String { rawValue }
    var title: String {
        switch self {
        case .coach: "Know what to run next"
        case .plan: "Build a plan for your next race"
        case .account: "Get a coach for your running"
        }
    }
    var promise: String {
        switch self {
        case .coach: "Talk through your training by voice or chat and get a next step for your goal."
        case .plan: "Get a schedule for your goal and review changes before accepting them."
        case .account: "Get coaching, a training plan and insights from eligible runs."
        }
    }
    var action: String {
        switch self {
        case .coach: "See coaching plans"
        case .plan: "See plan options"
        case .account: "Compare Apple plans"
        }
    }
}

struct NativePaywallSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var store: CoachStore
    @ObservedObject var subscriptions: AppleSubscriptions
    let entry: NativePaywallEntry

    private var activated: Bool {
        store.onboarding?.hasAccess == true && store.onboarding?.billingProvider == "apple"
    }
    var body: some View {
        if #available(iOS 18.0, *) { content.presentationSizing(.page) }
        else { content }
    }
    private var content: some View {
        NavigationStack {
            ScrollView {
                NativePaywall(subscriptions:subscriptions, entry:entry, activated:activated, openCoaching:{ dismiss() })
                    .modifier(NativeVisualTestSettings())
                    .padding(20).frame(maxWidth:830).frame(maxWidth:.infinity)
            }
            .background(RunDesign.canvas.ignoresSafeArea())
            .navigationTitle("Premium").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if !activated {
                    ToolbarItem(placement:.cancellationAction) {
                        Button("Not now") { dismiss() }
                            .disabled(subscriptions.state == .purchasing)
                            .accessibilityIdentifier("dismiss-premium")
                    }
                }
            }
        }
        .tint(RunDesign.action)
        .interactiveDismissDisabled(subscriptions.state == .purchasing)
    }
}

struct NativeOfferPlan: Identifiable, Equatable {
    enum Introduction: Equatable {
        case free(String)
        case paid(String)
    }
    let id: String
    let name: String
    let renewal: String
    let introduction: Introduction?
    var initialTerms: String {
        switch introduction {
        case .some(.free(let duration)): "\(duration) free, then renews at this price."
        case .some(.paid(let initialCharge)): "\(initialCharge), then \(renewal)."
        case nil: "Billed today."
        }
    }
    var action: String {
        if case .some(.free(_)) = introduction { return "Start free trial with Apple" }
        return "Continue with Apple"
    }
}

struct NativePaywall:View {
    @ObservedObject var subscriptions:AppleSubscriptions
    let entry:NativePaywallEntry
    let activated:Bool
    let openCoaching:()->Void
    @Environment(\.dynamicTypeSize) private var typeSize
    @State private var eligible:Set<String>=[]
    @State private var eligibilityLoaded=false
    @State private var selectedID:String?
    @State private var restoring=false
    @State private var restoreNotice:String?

    private var selected: NativeOfferPlan? { offers.first { $0.id == selectedID } }
    private var working: Bool { restoring || subscriptions.state == .purchasing }

    var body:some View {
        Group {
            if activated {
                VStack(alignment:.leading, spacing:RunDesign.insetPadding) {
                    Label("Coaching is ready",systemImage:"checkmark.circle").font(.title2.bold())
                        .accessibilityAddTraits(.isHeader)
                    Text("Your Apple subscription is active on this account.")
                    Button("Done",action:openCoaching).buttonStyle(RunActionStyle())
                    ManageAppleSubscription()
                }
            } else if typeSize.isAccessibilitySize {
                VStack(alignment:.leading,spacing:20) { outcome; purchase }
            } else {
                ViewThatFits(in:.horizontal) {
                    HStack(alignment:.top,spacing:20) {
                        outcome.frame(minWidth:278,maxWidth:.infinity,alignment:.leading)
                        purchase.frame(minWidth:278,maxWidth:.infinity,alignment:.leading)
                    }
                    VStack(alignment:.leading,spacing:20) { outcome; purchase }
                }
            }
        }
        .task(id:subscriptions.products.map(\.id)) {
            let products=subscriptions.products
            #if DEBUG
            if previewOffersEnabled { eligibilityLoaded=true; return }
            #endif
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

    private var outcome: some View {
        VStack(alignment:.leading,spacing:RunDesign.gap) {
            Text("Run Analytics Premium").font(.footnote).foregroundStyle(RunDesign.mutedText)
            Text(entry.title).font(.title2.bold()).accessibilityAddTraits(.isHeader)
            Text(entry.promise)
            comparison("Stays free","Record GPS runs and review your basic history and totals.")
            comparison("With Premium","Voice and chat coaching, training plans, and eligible coaching insights.")
            if entry != .account {
                Text("Garmin data stays out of AI coaching.").font(.footnote).foregroundStyle(RunDesign.mutedText)
            }
        }.frame(maxWidth:.infinity,alignment:.leading)
    }
    private func comparison(_ label:String,_ detail:String)->some View {
        VStack(alignment:.leading,spacing:4) {
            Text(label).font(.headline)
            Text(detail).font(.callout).foregroundStyle(RunDesign.mutedText)
        }.padding(RunDesign.gap).frame(maxWidth:.infinity,alignment:.leading)
            .background(RunDesign.inset,in:RoundedRectangle(cornerRadius:RunDesign.radius))
            .accessibilityElement(children:.combine)
    }
    private var purchase: some View {
        VStack(alignment:.leading,spacing:RunDesign.gap) {
            if subscriptions.loadingProducts {
                ProgressView("Loading Apple subscription options…")
            } else if offers.isEmpty {
                Text("Apple subscription options are unavailable right now.").foregroundStyle(.secondary)
                Button("Retry loading plans") { Task { await subscriptions.reloadProducts() } }.buttonStyle(.bordered)
            } else {
                Text("Choose a plan").font(.headline).accessibilityAddTraits(.isHeader)
                ForEach(offers) { offer in option(offer) }
                if !eligibilityLoaded { ProgressView("Checking trial eligibility…").font(.footnote) }
                Text("Auto-renews unless canceled at least 24 hours before renewal. Manage in Apple subscriptions.")
                    .font(.footnote).foregroundStyle(RunDesign.mutedText)
                Button {
                    guard let selected, let product=subscriptions.products.first(where:{ $0.id == selected.id }) else { return }
                    Task { await subscriptions.purchase(product) }
                } label: {
                    if subscriptions.state == .purchasing { ProgressView("Confirming with Apple…") }
                    else { Text(selected?.action ?? "Continue with Apple") }
                }
                .buttonStyle(RunActionStyle())
                .disabled(selected == nil || !eligibilityLoaded || working || subscriptions.state == .pending || subscriptions.state == .delivered)
                .accessibilityIdentifier("continue-apple-purchase")
            }
            if subscriptions.state == .pending {
                Label("Waiting for Apple approval. There’s no need to try buying again.", systemImage: "clock")
            }
            if subscriptions.state == .cancelled {
                Text("Purchase cancelled. Nothing was charged for this attempt.").foregroundStyle(.secondary)
            }
            if subscriptions.state == .delivered {
                Text("Apple confirmed the purchase. If access hasn’t updated, restore purchases.").foregroundStyle(.secondary)
            }
            if let error=subscriptions.error { Text(error).foregroundStyle(.red) }
            Button(restoring ? "Restoring purchases…" : "Restore purchases") {
                restoring=true; restoreNotice=nil
                Task {
                    await subscriptions.restore()
                    restoring=false
                    if subscriptions.error == nil { restoreNotice="No active purchase was restored here. Check the Apple account used for the purchase." }
                }
            }.frame(minHeight:RunDesign.minimumTarget).disabled(working)
            if let restoreNotice { Text(restoreNotice).font(.callout).foregroundStyle(.secondary) }
            ManageAppleSubscription()
            let footer = typeSize.isAccessibilitySize ? AnyLayout(VStackLayout(alignment:.leading)) : AnyLayout(HStackLayout())
            footer {
                Link("Terms of Use",destination:URL(string:"https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!)
                    .frame(minHeight:RunDesign.minimumTarget)
                Link("Privacy",destination:URL(string:"https://aitracker.run/privacy")!)
                    .frame(minHeight:RunDesign.minimumTarget)
            }.font(.footnote)
        }.frame(maxWidth:.infinity,alignment:.leading)
    }

    private func option(_ offer: NativeOfferPlan) -> some View {
        let chosen=selectedID == offer.id
        return Button {
            selectedID=offer.id
            restoreNotice=nil
        } label: {
            HStack(alignment: .top, spacing: RunDesign.gap) {
                Image(systemName: chosen ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(chosen ? RunDesign.action : Color.secondary)
                    .accessibilityHidden(true)
                VStack(alignment:.leading,spacing:4) {
                    Text(offer.name).font(.headline)
                    Text(offer.renewal).font(.title2.bold())
                    if eligibilityLoaded {
                        Text(offer.initialTerms).foregroundStyle(RunDesign.mutedText).font(.footnote)
                    }
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
        .accessibilityIdentifier(offer.id.hasSuffix("annual") ? "offer-annual" : "offer-monthly")
    }

    private var offers: [NativeOfferPlan] {
        #if DEBUG
        if previewOffersEnabled {
            return [
                .init(id:"preview.monthly",name:"Monthly",renewal:"$7.99 every 1 month",introduction:.free("7 days")),
                .init(id:"preview.annual",name:"Annual",renewal:"$79.99 every 1 year",introduction:nil),
            ]
        }
        #endif
        return subscriptions.products.compactMap { product in
            guard let period=product.subscription?.subscriptionPeriod, let cadence=duration(period) else { return nil }
            var introduction: NativeOfferPlan.Introduction?
            if eligibilityLoaded, eligible.contains(product.id), let offer=product.subscription?.introductoryOffer {
                guard let total=duration(offer.period,count:offer.periodCount) else { return nil }
                if offer.paymentMode == .freeTrial { introduction = .free(total) }
                else if offer.paymentMode == .payUpFront { introduction = .paid("\(offer.displayPrice) today for \(total)") }
                else if offer.paymentMode == .payAsYouGo, let interval=duration(offer.period) {
                    introduction = .paid("\(offer.displayPrice) every \(interval) for \(total)")
                } else { return nil }
            }
            return .init(id:product.id,name:product.id.hasSuffix("annual") ? "Annual" : "Monthly",
                         renewal:"\(product.displayPrice) every \(cadence)",introduction:introduction)
        }
    }
    #if DEBUG
    private var previewOffersEnabled: Bool { ProcessInfo.processInfo.arguments.contains("--test-premium-ux") }
    #endif

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
