import Foundation
import Combine
import StoreKit

/// StoreKit never grants server access by itself. Delivery must persist a verified
/// transaction against the signed-in runner before the transaction is finished.
@MainActor final class AppleSubscriptions:ObservableObject {
    static let productIDs = ["run.aitracker.coach.premium.monthly", "run.aitracker.coach.premium.annual"]
    enum PurchaseState:Equatable { case idle, purchasing, pending, cancelled, delivered }
    enum PurchaseError:Error { case unverified, wrongAccount, unknownProduct }
    @Published private(set) var products:[Product]=[]
    @Published private(set) var state:PurchaseState = .idle
    @Published private(set) var error:String?
    private var updates:Task<Void,Never>?
    private let accountToken:UUID
    private let deliver:(String) async throws -> Void

    init(accountToken:UUID, deliver:@escaping (String) async throws -> Void) {
        self.accountToken=accountToken
        self.deliver=deliver
    }
    func start() async {
        guard updates == nil else { return }
        updates=Task { [weak self] in
            for await result in Transaction.updates {
                guard !Task.isCancelled,let self else { return }
                do { try await self.accept(result) }
                catch { self.error="Your purchase needs to finish syncing. Please restore purchases." }
            }
        }
        await reloadProducts()
        await reconcile()
    }
    func reloadProducts() async {
        error=nil
        do { products=try await Product.products(for:Self.productIDs).sorted { $0.price < $1.price } }
        catch { self.error="Apple subscription options could not load. Please retry." }
    }
    func stop() { updates?.cancel(); updates=nil; products=[]; state = .idle; error=nil }
    deinit { updates?.cancel() }
    func purchase(_ product:Product) async {
        guard state != .purchasing,Self.productIDs.contains(product.id) else { return }
        error=nil; state = .purchasing
        do {
            switch try await product.purchase(options:[.appAccountToken(accountToken)]) {
            case .success(let result):try await accept(result); state = .delivered
            case .pending:state = .pending
            case .userCancelled:state = .cancelled
            @unknown default:state = .idle
            }
        } catch { state = .idle; self.error="We could not confirm your subscription. Restore purchases before trying to buy again." }
    }
    func restore() async {
        error=nil
        do { try await AppStore.sync(); await reconcile() }
        catch { self.error="Purchases could not be restored. Please retry." }
    }
    private func reconcile() async {
        for await result in Transaction.currentEntitlements {
            do { try await accept(result) }
            catch { self.error="A purchase could not be linked to this account. Please contact support." }
        }
    }
    private func accept(_ result:VerificationResult<Transaction>) async throws {
        guard case .verified(let transaction)=result else { throw PurchaseError.unverified }
        guard Self.productIDs.contains(transaction.productID) else { return }
        guard transaction.appAccountToken==accountToken else { throw PurchaseError.wrongAccount }
        // Send signed data, including expirations/revocations, for authoritative
        // server verification. Never trust client-supplied dates or plan names.
        try await deliver(result.jwsRepresentation)
        guard !Task.isCancelled else { return }
        await transaction.finish()
    }
}
