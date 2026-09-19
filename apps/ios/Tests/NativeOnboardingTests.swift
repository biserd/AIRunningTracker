import XCTest
@testable import AITracker
final class NativeOnboardingTests:XCTestCase {
    func testPaidRunnerStillNeedsStrava() throws {
        let data=Data(#"{"stravaConnected":false,"hasAccess":true,"appAccountToken":"abc","purchasesAvailable":true}"#.utf8)
        XCTAssertFalse(try JSONDecoder().decode(NativeOnboarding.self,from:data).ready)
    }
    func testExistingSubscriberSkipsPurchase() throws {
        let data=Data(#"{"stravaConnected":true,"hasAccess":true,"billingProvider":"stripe","appAccountToken":"abc","purchasesAvailable":true}"#.utf8)
        XCTAssertTrue(try JSONDecoder().decode(NativeOnboarding.self,from:data).ready)
    }
    func testFreeConnectedRunnerNeedsSubscription() throws {
        let data=Data(#"{"stravaConnected":true,"hasAccess":false,"appAccountToken":"abc","purchasesAvailable":true}"#.utf8)
        XCTAssertFalse(try JSONDecoder().decode(NativeOnboarding.self,from:data).ready)
    }
}
