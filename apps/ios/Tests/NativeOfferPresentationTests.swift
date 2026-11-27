import XCTest
@testable import AITracker

final class NativeOfferPresentationTests: XCTestCase {
    func testOnlyAFreeIntroductionUsesTrialAction() {
        let trial = NativeOfferPlan(id:"monthly",name:"Monthly",renewal:"£7.99 every 1 month",introduction:.free("7 days"))
        let standard = NativeOfferPlan(id:"annual",name:"Annual",renewal:"€79.99 every 1 year",introduction:nil)
        let promotion = NativeOfferPlan(id:"monthly",name:"Monthly",renewal:"£7.99 every 1 month",introduction:.paid("£3.99 today for 1 month"))
        XCTAssertEqual(trial.action, "Start free trial with Apple")
        XCTAssertEqual(trial.initialTerms, "7 days free, then renews at this price.")
        XCTAssertEqual(standard.action, "Continue with Apple")
        XCTAssertEqual(standard.initialTerms, "Billed today.")
        XCTAssertEqual(promotion.action, "Continue with Apple")
        XCTAssertEqual(promotion.initialTerms, "£3.99 today for 1 month, then renews at this price.")
        XCTAssertEqual(standard.renewal, "€79.99 every 1 year")
    }

    func testCoachAndPlanPromiseDifferentFirstOutcomes() {
        XCTAssertNotEqual(NativePaywallEntry.coach.title, NativePaywallEntry.plan.title)
        XCTAssertNotEqual(NativePaywallEntry.coach.action, NativePaywallEntry.plan.action)
        XCTAssertEqual(NativePaywallEntry.account.action, "Compare Apple plans")
    }
}
