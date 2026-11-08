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
        XCTAssertTrue(app.buttons["finish-phone-run"].exists)
        capture("Standalone live route and recording metrics")
        for _ in 0..<4 { if app.buttons["finish-phone-run"].isHittable { break }; app.swipeUp() }
        app.buttons["finish-phone-run"].tap()
        XCTAssertTrue(app.navigationBars["Save your run"].waitForExistence(timeout:5))
        XCTAssertTrue(app.staticTexts["1 = very easy · 10 = maximum effort"].exists)
        XCTAssertTrue(app.buttons["Save run"].exists)
        capture("Standalone save effort and notes")
    }
    func testProfileMilesAndRecordingActionsStayReachable() {
        let app = XCUIApplication()
        app.launchArguments = ["--test-standalone", "--test-run-display", "--test-run-active", "--test-profile-miles"]
        app.launch()
        XCTAssertTrue(app.staticTexts["1.55 mi"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.segmentedControls.buttons["Miles"].exists)
        XCTAssertFalse(app.buttons["Talk to your coach"].exists)
        XCTAssertFalse(app.buttons["Disconnect sensor"].exists)
        let pause = app.buttons["run-pause-resume"], finish = app.buttons["finish-phone-run"]
        XCTAssertTrue(pause.isHittable); XCTAssertTrue(finish.isHittable)
        capture("Simple recording with saved miles and pinned controls")
        pause.tap()
        XCTAssertTrue(app.staticTexts["Paused"].waitForExistence(timeout: 5))
        XCTAssertEqual(pause.label, "Resume")
        app.buttons["Run settings"].tap()
        XCTAssertTrue(app.navigationBars["Run settings"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Miles"].exists)
        XCTAssertTrue(app.buttons["Connect heart-rate sensor"].exists)
        XCTAssertFalse(app.buttons["Disconnect sensor"].exists)
        capture("Run settings follow profile units")
        app.buttons["Done"].tap()
        XCTAssertTrue(finish.isHittable)
        finish.tap()
        XCTAssertTrue(app.buttons["Save run"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Save run"].isHittable)
    }
    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways; add(attachment)
    }
}
