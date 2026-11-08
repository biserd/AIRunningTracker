import XCTest
import UIKit
final class StandaloneTests:XCTestCase {
    func testFreeAccountOpensRunWithoutProviderOrPaywall() {
        let app=XCUIApplication();app.launchArguments=["--test-standalone"];app.launch()
        XCTAssertTrue(app.buttons["start-phone-run"].waitForExistence(timeout:10))
        XCTAssertTrue(app.buttons["start-phone-run"].isEnabled)
        XCTAssertFalse(app.buttons["Connect Strava"].exists)
        XCTAssertFalse(app.buttons["Subscribe"].exists)
        if UIDevice.current.userInterfaceIdiom == .pad { app.descendants(matching:.any)["sidebar-coach"].firstMatch.tap() }
        else { app.tabBars.buttons["Coach"].tap() }
        XCTAssertTrue(app.staticTexts["Your optional running coach"].waitForExistence(timeout:5))
        if UIDevice.current.userInterfaceIdiom == .pad { app.descendants(matching:.any)["sidebar-runs"].firstMatch.tap() }
        else { app.tabBars.buttons["Run"].tap() }
        XCTAssertTrue(app.buttons["start-phone-run"].waitForExistence(timeout:5))
    }
    func testRecordingDisplayAndEffortFormAreReachable() {
        let app=XCUIApplication();app.launchArguments=["--test-standalone","--test-run-display"];app.launch()
        XCTAssertTrue(app.descendants(matching:.any)["live-run-map"].firstMatch.waitForExistence(timeout:10))
        XCTAssertTrue(app.staticTexts["Current lap pace"].exists)
        XCTAssertTrue(app.buttons["Finish"].exists)
        for _ in 0..<4 { if app.buttons["Finish"].isHittable { break }; app.swipeUp() }
        app.buttons["Finish"].tap()
        XCTAssertTrue(app.navigationBars["Save your run"].waitForExistence(timeout:5))
        XCTAssertTrue(app.staticTexts["1 = very easy · 10 = maximum effort"].exists)
        XCTAssertTrue(app.buttons["Save run"].exists)
    }
}
