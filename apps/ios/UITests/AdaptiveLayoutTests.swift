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
        let typed = expectation(for: NSPredicate(format: "value == %@", "My next run"), evaluatedWith: composer)
        wait(for: [typed], timeout: 5)
        app.buttons["dismiss-coach-keyboard"].tap()
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
    }
}
