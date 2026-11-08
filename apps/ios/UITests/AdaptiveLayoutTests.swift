import XCTest
import UIKit

final class AdaptiveLayoutTests: XCTestCase {
    func testNavigationAndDraftSurviveRotation() {
        let app = XCUIApplication()
        app.launchArguments = ["--test-adaptive-layout"]
        app.launch()
        defer { XCUIDevice.shared.orientation = .portrait }
        XCTAssertTrue(app.navigationBars["Let’s talk running"].waitForExistence(timeout: 10))

        XCTAssertEqual(app.buttons.matching(identifier: "Talk to your coach").count, 1, "Coach has one voice entry point")
        let checkIn = app.buttons["coach-check-in"]
        XCTAssertTrue(checkIn.waitForExistence(timeout: 5)); checkIn.tap()
        XCTAssertTrue(app.navigationBars["Daily check-in"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Good"].exists)
        let checkInImage = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        checkInImage.name = "Simple daily check-in"; checkInImage.lifetime = .keepAlways; add(checkInImage)
        app.buttons["Done"].tap()

        // Enter a draft offline: no sign-in, microphone, or provider requests.
        let composer = app.descendants(matching: .any)["coach-composer"].firstMatch
        XCTAssertTrue(composer.waitForExistence(timeout: 5))
        composer.tap()
        composer.typeText("My next run")
        // Commit the keyboard's marked text before asserting the accessibility value.
        app.buttons["dismiss-coach-keyboard"].tap()
        let typed = expectation(for: NSPredicate(format: "value == %@", "My next run"), evaluatedWith: composer)
        wait(for: [typed], timeout: 20)
        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertTrue(composer.waitForExistence(timeout: 5))
        XCTAssertEqual(composer.value as? String, "My next run")

        if UIDevice.current.userInterfaceIdiom == .pad {
            let settings = app.descendants(matching: .any)["sidebar-settings"].firstMatch
            XCTAssertTrue(settings.waitForExistence(timeout: 5))
            settings.tap()
        } else {
            app.tabBars.buttons["Settings"].tap()
        }
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["Refresh running data"].exists)
        XCTAssertTrue(app.staticTexts["Running data not loaded yet."].exists)
        tapSetting("Apple notifications", app: app)
        XCTAssertTrue(app.navigationBars["Notifications"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Enable notifications"].exists)
        XCTAssertEqual(app.webViews.count, 0)
        app.navigationBars.buttons["Close"].tap()
        tapSetting("Coaching preferences", app: app)
        XCTAssertTrue(app.navigationBars["Your coach"].waitForExistence(timeout:5))
        XCTAssertTrue(app.navigationBars.buttons["Save"].exists)
        XCTAssertTrue(app.navigationBars.buttons["Cancel"].exists)
        XCTAssertFalse(app.navigationBars.buttons["Done"].exists)
        app.navigationBars.buttons["Cancel"].tap()
        tapSetting("WhatsApp", app: app)
        XCTAssertTrue(app.navigationBars["WhatsApp"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.webViews.count, 0)
        app.navigationBars.buttons["Close"].tap()
        tapSetting("Email", app: app)
        XCTAssertTrue(app.navigationBars["Email"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.textFields["Email address"].exists)
        XCTAssertEqual(app.webViews.count, 0)
        app.navigationBars.buttons["Close"].tap()
        tapSetting("All reminders", app: app)
        XCTAssertTrue(app.navigationBars["Reminders"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["No reminders yet."].exists)
        app.navigationBars.buttons["Close"].tap()
        if UIDevice.current.userInterfaceIdiom == .pad {
            app.descendants(matching: .any)["sidebar-progress"].firstMatch.tap()
        } else { app.tabBars.buttons["Progress"].tap() }
        XCTAssertTrue(app.navigationBars["Progress"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Your progress"].exists)
        if UIDevice.current.userInterfaceIdiom == .pad {
            app.descendants(matching: .any)["sidebar-coach"].firstMatch.tap()
        } else { app.tabBars.buttons["Coach"].tap() }
        app.segmentedControls.buttons["Plan"].tap()
        XCTAssertTrue(app.navigationBars["Plan"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["Run history"].exists)
    }
    func testCoachHasSingleVoiceAndClearSummaryActions() {
        let app = XCUIApplication()
        app.launchArguments = ["--test-adaptive-layout", "--test-coach-ux"]
        app.launch()
        XCTAssertTrue(app.buttons["Read summary"].waitForExistence(timeout: 10))
        XCTAssertEqual(app.buttons.matching(identifier: "Talk to your coach").count, 1)
        XCTAssertTrue(app.buttons["coach-check-in"].isHittable)
        let screenshot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        screenshot.name = "Simple Coach home with one voice action"; screenshot.lifetime = .keepAlways; add(screenshot)
        app.buttons["Read summary"].tap()
        XCTAssertTrue(app.navigationBars["Your week in running"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "leave room to recover afterward")).firstMatch.exists)
    }
    private func tapSetting(_ title: String, app: XCUIApplication) {
        let button = app.buttons["settings-\(title)"]
        for _ in 0..<5 { if button.isHittable { break }; app.swipeUp() }
        if !button.isHittable { for _ in 0..<5 { if button.isHittable { break }; app.swipeDown() } }
        XCTAssertTrue(button.isHittable)
        button.tap()
    }
}
