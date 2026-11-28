import UIKit
import XCTest

final class ProductJourneyUITests: XCTestCase {
    func testSignedOutSampleShowsResultWithoutProviderOrPurchase() {
        let app = XCUIApplication()
        app.launchArguments = ["--test-sign-in-screen", "--test-dark-accessibility"]
        app.launch()
        let sample = app.buttons["open-sample-run"]
        XCTAssertTrue(sample.waitForExistence(timeout:10))
        sample.tap()
        XCTAssertTrue(app.navigationBars["Sample run"].waitForExistence(timeout:8))
        XCTAssertTrue(app.staticTexts["Example data · Not your activity"].exists)
        let result = app.staticTexts["5 km in 30 minutes"]
        XCTAssertTrue(result.exists)
        XCTAssertGreaterThanOrEqual(result.frame.height, 40, "The sample sheet should receive large accessibility type")
        XCTAssertFalse(app.buttons["continue-apple-purchase"].exists)
        attach("Signed-out example · dark · accessibility size")
        app.buttons["Back to sign-in"].tap()
        XCTAssertTrue(sample.waitForExistence(timeout:8))
    }

    func testPlanUpgradeRequiresIntentAndExplicitSelection() {
        let app = XCUIApplication()
        app.launchArguments = ["--test-standalone", "--test-premium-ux"]
        if UIDevice.current.userInterfaceIdiom == .pad { XCUIDevice.shared.orientation = .landscapeLeft }
        defer { XCUIDevice.shared.orientation = .portrait }
        app.launch()
        let sidebar = app.descendants(matching:.any)["sidebar-plan"].firstMatch
        if sidebar.waitForExistence(timeout:3) { sidebar.tap() }
        else { app.tabBars.buttons["Plan"].tap() }
        let discover = app.buttons["open-contextual-premium"]
        XCTAssertTrue(discover.waitForExistence(timeout:8))
        XCTAssertEqual(discover.label, "See plan options")
        XCTAssertFalse(app.buttons["continue-apple-purchase"].exists)
        attach("Plan · useful, dismissible Premium discovery")
        discover.tap()
        XCTAssertTrue(app.navigationBars["Premium"].waitForExistence(timeout:8))
        let proceed = app.buttons["continue-apple-purchase"]
        XCTAssertTrue(proceed.waitForExistence(timeout:8))
        XCTAssertFalse(proceed.isEnabled)
        let outcome = app.staticTexts["premium-sheet-benefit-heading"]
        let choose = app.staticTexts["premium-sheet-offers-heading"]
        XCTAssertTrue(outcome.exists && choose.exists)
        XCTAssertEqual(outcome.label, "Build a plan for your next race")
        XCTAssertEqual(choose.label, "Choose a plan")
        if app.frame.width >= 1250 {
            let alignedSideBySide = NSPredicate { _, _ in choose.frame.minX > outcome.frame.minX + 200 }
            XCTAssertEqual(XCTWaiter.wait(for:[XCTNSPredicateExpectation(predicate:alignedSideBySide,object:nil)],timeout:4),.completed)
        } else if app.frame.width < 600 {
            XCTAssertLessThan(abs(choose.frame.minX - outcome.frame.minX), 5)
        }
        let monthly = app.descendants(matching:.any)["offer-monthly"].firstMatch
        XCTAssertTrue(monthly.exists)
        XCTAssertTrue(monthly.label.contains("$7.99"))
        monthly.tap()
        XCTAssertEqual(proceed.label, "Start free trial with Apple")
        attach("Plan Premium · eligible monthly offer")
        let annual = app.descendants(matching:.any)["offer-annual"].firstMatch
        XCTAssertTrue(annual.exists)
        XCTAssertTrue(annual.label.contains("$79.99"))
        annual.tap()
        XCTAssertEqual(proceed.label, "Continue with Apple")
        let close = app.buttons["dismiss-premium"]
        XCTAssertEqual(close.label, "Not now")
        close.tap()
        XCTAssertTrue(discover.waitForExistence(timeout:8))
        app.buttons["Back to Run"].tap()
        XCTAssertTrue(app.buttons["start-phone-run"].waitForExistence(timeout:8))
    }

    func testCoachOfferRemainsDismissibleAtAccessibilitySize() {
        let app = XCUIApplication()
        app.launchArguments = ["--test-standalone", "--test-premium-ux", "--test-dark-accessibility"]
        app.launch()
        let sidebar = app.descendants(matching:.any)["sidebar-coach"].firstMatch
        if sidebar.waitForExistence(timeout:3) { sidebar.tap() }
        else { app.tabBars.buttons["Coach"].tap() }
        let discover = app.buttons["open-contextual-premium"]
        XCTAssertTrue(discover.waitForExistence(timeout:8))
        XCTAssertEqual(discover.label, "See coaching plans")
        discover.tap()
        XCTAssertTrue(app.navigationBars["Premium"].waitForExistence(timeout:8))
        let close = app.buttons["dismiss-premium"]
        XCTAssertTrue(close.isHittable)
        let headline = app.staticTexts["premium-sheet-benefit-heading"]
        XCTAssertTrue(headline.exists)
        XCTAssertEqual(headline.label, "Know what to run next")
        XCTAssertGreaterThanOrEqual(headline.frame.height, 40, "The offer sheet should receive large accessibility type")
        attach("Coach Premium · dark · accessibility size")
        close.tap()
        XCTAssertTrue(discover.waitForExistence(timeout:8))
    }

    private func attach(_ name:String) {
        let capture = XCTAttachment(screenshot:XCUIScreen.main.screenshot())
        let size = XCUIApplication().frame.size
        capture.name = "\(name) · \(Int(size.width))×\(Int(size.height))"
        capture.lifetime = .keepAlways
        add(capture)
    }
}
