import SwiftUI
import AuthenticationServices
import StoreKit

struct NativeOnboarding:Decodable {
    let stravaConnected:Bool
    let syncStatus:String?
    let hasAccess:Bool
    let billingProvider:String?
    let appAccountToken:String
    let purchasesAvailable:Bool
    var ready:Bool { stravaConnected && hasAccess }
}
struct NativeStravaStart:Decodable { let url:String; let state:String }

@MainActor final class NativeStravaConnection:NSObject,ObservableObject,ASWebAuthenticationPresentationContextProviding {
    private var session:ASWebAuthenticationSession?
    func presentationAnchor(for session:ASWebAuthenticationSession)->ASPresentationAnchor {
        UIApplication.shared.connectedScenes.compactMap{$0 as? UIWindowScene}.flatMap{$0.windows}.first(where:{$0.isKeyWindow}) ?? ASPresentationAnchor()
    }
    func connect(_ start:NativeStravaStart) async throws {
        guard let url=URL(string:start.url),url.scheme=="https",url.host=="www.strava.com",url.path=="/oauth/authorize" else { throw APIError.invalidResponse }
        try await withCheckedThrowingContinuation { (continuation:CheckedContinuation<Void,Error>) in
            session=ASWebAuthenticationSession(url:url,callbackURLScheme:"runanalytics") { callback,error in
                if let error { continuation.resume(throwing:error); return }
                guard let callback,let result=URLComponents(url:callback,resolvingAgainstBaseURL:false),
                      result.scheme=="runanalytics",result.host=="strava",
                      result.queryItems?.filter({$0.name=="state"}).count==1,
                      result.queryItems?.first(where:{$0.name=="state"})?.value==start.state,
                      result.queryItems?.first(where:{$0.name=="status"})?.value=="connected" else {
                    continuation.resume(throwing:APIError.server(400,"Strava was not connected. Please retry and allow access to activities.")); return
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
    var managing=false
    var body:some View {
        NavigationStack {
            ScrollView {
                VStack(alignment:.leading,spacing:24) {
                    Text(managing ? "Your account" : "Make it your coach").font(.largeTitle.bold())
                    if let status=store.onboarding {
                        VStack(alignment:.leading,spacing:14) {
                            Label("1. Connect your running",systemImage:status.stravaConnected ? "checkmark.circle.fill" : "figure.run").font(.title2.bold())
                            Text(status.stravaConnected ? "Strava connected. Your runs sync in the background." : "Bring your Strava runs into your coaching.").foregroundStyle(.secondary)
                            if !status.stravaConnected {
                                Button("Connect Strava") { Task { await connect() } }.buttonStyle(.borderedProminent).disabled(busy)
                            }
                        }.padding(22).frame(maxWidth:.infinity,alignment:.leading).background(RunBrand.surface,in:RoundedRectangle(cornerRadius:22))
                        VStack(alignment:.leading,spacing:14) {
                            Label("2. Your coaching plan",systemImage:status.hasAccess ? "checkmark.circle.fill" : "bubble.left.and.bubble.right").font(.title2.bold())
                            if status.hasAccess {
                                Text("Your existing access is active. No additional subscription needed.")
                                if status.billingProvider=="apple" { ManageAppleSubscription() }
                            } else if status.stravaConnected, status.purchasesAvailable, let subscriptions=store.subscriptions {
                                NativePaywall(subscriptions:subscriptions)
                            } else {
                                Text(status.stravaConnected ? "Subscription options are temporarily unavailable. Please retry." : "Connect Strava first, then choose your plan. Creating an account is free.").foregroundStyle(.secondary)
                            }
                        }.padding(22).frame(maxWidth:.infinity,alignment:.leading).background(RunBrand.surface,in:RoundedRectangle(cornerRadius:22))
                        if status.ready {
                            Button("Open my coach") { Task { await store.refresh(); dismiss() } }.buttonStyle(.borderedProminent)
                        }
                    } else { Text("Loading your account setup…") }
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
    private func reload() async { do { try await store.refreshOnboarding() } catch { message=error.localizedDescription } }
    private func connect() async {
        guard !busy else { return }; busy=true; message=nil; defer{busy=false}
        do { try await strava.connect(store.api.startStrava()); try await store.refreshOnboarding() }
        catch { message=error.localizedDescription }
    }
    private func delete() async {
        guard !busy else{return}; busy=true; defer{busy=false}
        do { try await store.api.deleteAccount(); await store.signOut() } catch { message=error.localizedDescription }
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
