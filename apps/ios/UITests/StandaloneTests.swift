import XCTest
import UIKit
final class StandaloneTests:XCTestCase {
    func testFreeAccountOpensRunWithoutProviderOrPaywall() {
        XCUIDevice.shared.orientation = UIDevice.current.userInterfaceIdiom == .pad ? .landscapeLeft : .portrait
        defer { XCUIDevice.shared.orientation = .portrait }
        let app=XCUIApplication();app.launchArguments=["--test-standalone"];app.launch()
        XCTAssertTrue(app.buttons["start-phone-run"].waitForExistence(timeout:10))
        XCTAssertTrue(app.buttons["start-phone-run"].isEnabled)
        XCTAssertFalse(app.buttons["Connect Strava"].exists)
        XCTAssertFalse(app.buttons["Subscribe"].exists)
        capture("Free account Run home")
        if UIDevice.current.userInterfaceIdiom == .pad {
            let coach = app.descendants(matching: .any)["sidebar-coach"].firstMatch
            XCTAssertTrue(coach.waitForExistence(timeout: 5)); coach.tap()
        }
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
        capture("Standalone live route and recording metrics")
        for _ in 0..<4 { if app.buttons["Finish"].isHittable { break }; app.swipeUp() }
        app.buttons["Finish"].tap()
        XCTAssertTrue(app.navigationBars["Save your run"].waitForExistence(timeout:5))
        XCTAssertTrue(app.staticTexts["1 = very easy · 10 = maximum effort"].exists)
        XCTAssertTrue(app.buttons["Save run"].exists)
        capture("Standalone save effort and notes")
    }
    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
}
