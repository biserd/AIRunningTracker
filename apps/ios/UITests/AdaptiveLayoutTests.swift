import XCTest
import UIKit

final class AdaptiveLayoutTests: XCTestCase {
    func testNavigationAndDraftSurviveRotation() {
        let app = XCUIApplication()
        app.launchArguments = ["--test-adaptive-layout"]
        app.launch()
        defer { XCUIDevice.shared.orientation = .portrait }
        XCTAssertTrue(app.navigationBars["Let’s talk running"].waitForExistence(timeout: 10))

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
        app.buttons["Notifications & reminders"].tap()
        XCTAssertTrue(app.navigationBars["Notifications"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Enable notifications"].exists)
        XCTAssertEqual(app.webViews.count, 0)
        app.navigationBars.buttons["Close"].tap()
        app.buttons["Coaching preferences"].tap()
        XCTAssertTrue(app.navigationBars["Your coach"].waitForExistence(timeout:5))
        XCTAssertTrue(app.navigationBars.buttons["Save"].exists)
        XCTAssertTrue(app.navigationBars.buttons["Cancel"].exists)
        XCTAssertFalse(app.navigationBars.buttons["Done"].exists)
        app.navigationBars.buttons["Cancel"].tap()
        app.buttons["Connect WhatsApp"].tap()
        XCTAssertTrue(app.navigationBars["WhatsApp"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.webViews.count, 0)
        app.navigationBars.buttons["Close"].tap()
        app.buttons["Email & reminders"].tap()
        XCTAssertTrue(app.navigationBars["Email & reminders"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.textFields["Email address"].exists)
        XCTAssertEqual(app.webViews.count, 0)
    }
}
