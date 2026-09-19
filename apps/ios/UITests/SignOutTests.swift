import XCTest
import UIKit

final class SignOutTests: XCTestCase {
    func testSignOutImmediatelyReturnsToEmailLogin() {
        let app = XCUIApplication()
        app.launchArguments = ["--test-adaptive-layout", "--test-pending-coach-request"]
        app.launch()
        XCTAssertTrue(app.navigationBars["Let’s talk running"].waitForExistence(timeout: 10))
        if UIDevice.current.userInterfaceIdiom == .pad {
            app.descendants(matching: .any)["sidebar-settings"].firstMatch.tap()
        } else {
            app.tabBars.buttons["Settings"].tap()
        }
        XCTAssertTrue(app.navigationBars["Settings"].waitForExistence(timeout: 5))
        let signOut = app.buttons["Sign out"]
        for _ in 0..<3 { if signOut.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(signOut.isEnabled)
        signOut.tap()
        let confirm = app.buttons["confirm-sign-out"]
        XCTAssertTrue(confirm.waitForExistence(timeout: 3))
        confirm.tap()
        XCTAssertTrue(app.buttons["Email me a sign-in link"].waitForExistence(timeout: 2))
        XCTAssertFalse(app.navigationBars["Settings"].exists)
    }
}
