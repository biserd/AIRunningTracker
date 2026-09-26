import XCTest
import UIKit

final class AppStoreCaptureTests: XCTestCase {
    func testCoachAndPlanMarketingCaptures() {
        let tablet=UIDevice.current.userInterfaceIdiom == .pad
        XCUIDevice.shared.orientation=tablet ? .landscapeLeft : .portrait
        defer { XCUIDevice.shared.orientation = .portrait }
        let app=XCUIApplication()
        app.launchArguments=["--test-adaptive-layout","--app-store-capture"]
        app.launch()
        XCTAssertTrue(app.buttons["Talk to your coach"].waitForExistence(timeout:15))
        XCTAssertTrue(app.buttons["Talk to your coach"].isEnabled)
        XCTAssertTrue(app.staticTexts["I have 30 minutes today. Can we keep it easy before tomorrow’s long run?"].exists)
        capture("App Store - Voice and chat coach")
        if tablet { app.descendants(matching:.any)["sidebar-schedule"].firstMatch.tap() }
        else { app.tabBars.buttons["Plan"].tap() }
        XCTAssertTrue(app.staticTexts["Your autumn half marathon"].waitForExistence(timeout:10))
        XCTAssertTrue(app.staticTexts["Week 6 of 12"].exists)
        XCTAssertTrue(app.staticTexts["Easy miles"].exists)
        XCTAssertTrue(app.buttons["Adjust my plan with coach"].isEnabled)
        capture("App Store - Training plan")
        XCTAssertEqual(app.webViews.count,0)
    }
    private func capture(_ name:String) {
        let attachment=XCTAttachment(screenshot:XCUIScreen.main.screenshot())
        attachment.name=name; attachment.lifetime = .keepAlways; add(attachment)
    }
}
