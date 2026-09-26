import XCTest
@testable import AITracker
final class NativeOnboardingTests:XCTestCase {
    func testSampleDataDoesNotPretendStravaIsConnected() throws {
        let data=Data(#"{"sampleData":true,"stravaConnected":false,"hasAccess":true,"appAccountToken":"abc","purchasesAvailable":true}"#.utf8)
        let status=try JSONDecoder().decode(NativeOnboarding.self,from:data)
        XCTAssertTrue(status.ready)
        XCTAssertFalse(status.stravaConnected)
    }
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
