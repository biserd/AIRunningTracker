import XCTest
import UIKit

final class AdaptiveLayoutTests: XCTestCase {
    func testNavigationAndDraftSurviveRotation() {
        let app = XCUIApplication()
        app.launchArguments = ["--test-adaptive-layout"]
        XCUIDevice.shared.orientation = .portrait
        app.launch()
        defer { XCUIDevice.shared.orientation = .portrait }
        XCTAssertTrue(app.navigationBars["Let’s talk running"].waitForExistence(timeout: 10))

        // Enter a draft offline: no sign-in, microphone, or provider requests.
        let composer = app.textViews.firstMatch
        XCTAssertTrue(composer.waitForExistence(timeout: 5))
        composer.tap()
        composer.typeText("My next run")
        let typed = expectation(for: NSPredicate(format: "value == %@", "My next run"), evaluatedWith: composer)
        wait(for: [typed], timeout: 5)
        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertTrue(app.textViews.firstMatch.waitForExistence(timeout: 5))
        XCTAssertEqual(app.textViews.firstMatch.value as? String, "My next run")

        if UIDevice.current.userInterfaceIdiom == .pad {
            let settings = app.buttons["sidebar-settings"]
            // NavigationLink is exposed as a button in the split-view sidebar.
            XCTAssertTrue(settings.waitForExistence(timeout: 5))
            settings.tap()
        } else {
            app.tabBars.buttons["Settings"].tap()
        }
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 5))
    }
}
