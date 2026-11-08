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
    var managing=false
    var body:some View {
        NavigationStack {
            ScrollView {
                VStack(alignment:.leading,spacing:24) {
                    Text(managing ? "Your account" : "How do you run?").font(.largeTitle.bold())
                    Text("Your RunAnalytics account works on its own. Connect a service now or add one later in Settings.").foregroundStyle(.secondary)
                    if let status=store.onboarding {
                        if status.sampleData == true {
                            Label("Review account · Sample running data",systemImage:"info.circle")
                        } else {
                            VStack(alignment:.leading,spacing:14) {
                                Label("Garmin",systemImage:"applewatch").font(.title2.bold())
                                if garmin?.connected == true { Text("Connected. Your Garmin runs sync to this account.") }
                                else {
                                    Text("Import running activity summaries from Garmin. Health and sleep sharing are separate permissions.").foregroundStyle(.secondary)
                                    Toggle("Allow RunAnalytics to import my Garmin activities",isOn:$garminConsent)
                                    Button("Connect Garmin") { Task { await connectGarmin() } }.buttonStyle(.borderedProminent).disabled(busy || !garminConsent || garmin?.available != true)
                                    if garmin?.available != true { Text("Garmin connection is currently unavailable. You can add it later.").font(.footnote).foregroundStyle(.secondary) }
                                }
                            }.padding(22).frame(maxWidth:.infinity,alignment:.leading).background(RunBrand.surface,in:RoundedRectangle(cornerRadius:22))
                            VStack(alignment:.leading,spacing:14) {
                                Label("Strava",systemImage:"figure.run").font(.title2.bold())
                                Text(status.stravaConnected ? "Connected. Your Strava runs sync to this account." : "Import your available running history from Strava.").foregroundStyle(.secondary)
                                if !status.stravaConnected { Button("Connect Strava") { Task { await connect() } }.buttonStyle(.bordered).disabled(busy) }
                            }.padding(22).frame(maxWidth:.infinity,alignment:.leading).background(RunBrand.surface,in:RoundedRectangle(cornerRadius:22))
                        }
                        if !managing {
                            Button { store.completeSetup(); dismiss() } label: { Label("Use RunAnalytics",systemImage:"iphone") }.buttonStyle(.borderedProminent).disabled(busy)
                            Text("Record runs with your phone and view your history. No connected service or coaching subscription required.").font(.footnote).foregroundStyle(.secondary)
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
                    } else { Text("Loading your account…") }
                    if busy { ProgressView("Please wait…") }
                    if let message { Text(message).foregroundStyle(.red) }
                    Button("Refresh account") { Task { await reload() } }.buttonStyle(.bordered).disabled(busy)
                    HStack {
                        Button("Sign out") { Task { await store.signOut() } }
                        Spacer()
                        Button("Delete account",role:.destructive) { confirmDeletion=true }
                    }.font(.footnote)
                }.padding(24).frame(maxWidth:650).frame(maxWidth:.infinity)
            }.background(RunBrand.canvas)
            .toolbar { if managing { ToolbarItem(placement:.confirmationAction) { Button("Close") { dismiss() } } } }
            .task { await reload() }
            .confirmationDialog("Permanently delete your account and running data?",isPresented:$confirmDeletion,titleVisibility:.visible) {
                Button("Delete my account",role:.destructive) { Task { await delete() } }
            } message: { Text("This cannot be undone. Apple subscriptions must also be cancelled in Apple's subscription settings; deleting your account does not cancel Apple billing.") }
        }
    }
    private func reload() async {
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
    var body:some View {
        VStack(alignment:.leading,spacing:16) {
            Text("Personal coaching, voice conversations and insights from your runs.")
            ForEach(subscriptions.products,id:\.id) { product in
                let annual=product.id.hasSuffix("annual")
                let trial=eligible.contains(product.id) && product.subscription?.introductoryOffer?.paymentMode == .freeTrial
                VStack(alignment:.leading,spacing:6) {
                    Text("\(annual ? "Annual" : "Monthly") · \(product.displayPrice)/\(annual ? "year" : "month")").font(.headline)
                    if trial { Text("7 days free, then \(product.displayPrice)/\(annual ? "year" : "month").").font(.callout) }
                    Button(trial ? "Start 7-day free trial" : "Subscribe") { Task { await subscriptions.purchase(product) } }
                        .buttonStyle(.borderedProminent).disabled(subscriptions.state == .purchasing)
                }
            }
            if subscriptions.products.isEmpty { Text("Apple plans are not available yet. Retry shortly.").foregroundStyle(.secondary) }
            if subscriptions.state == .pending { Text("Waiting for Apple purchase approval.") }
            if subscriptions.state == .purchasing { ProgressView("Confirming with Apple…") }
            if let error=subscriptions.error { Text(error).foregroundStyle(.red) }
            Text("Renews automatically unless cancelled at least 24 hours before the period ends. Manage or cancel in Apple subscriptions. Trials are for eligible Apple accounts.").font(.caption).foregroundStyle(.secondary)
            Button("Restore purchases") { Task { await subscriptions.restore() } }.disabled(subscriptions.state == .purchasing)
            ManageAppleSubscription()
            HStack {
                Link("Terms",destination:URL(string:"https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!)
                Link("Privacy",destination:URL(string:"https://aitracker.run/privacy")!)
            }.font(.footnote)
        }.task(id:subscriptions.products.map(\.id)) {
            for product in subscriptions.products {
                if await product.subscription?.isEligibleForIntroOffer == true { eligible.insert(product.id) }
            }
        }
    }
}
