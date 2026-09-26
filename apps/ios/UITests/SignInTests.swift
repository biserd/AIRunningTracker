import XCTest

final class SignInTests: XCTestCase {
    func testReviewerSignInIsSeparateFromNormalEmailLinks() {
        let app=XCUIApplication()
        app.launchArguments=["--test-sign-in-screen"]
        app.launch()
        let help=app.buttons["Trouble signing in?"]
        for _ in 0..<3 { if help.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(help.waitForExistence(timeout:5)); help.tap()
        let reviewer=app.buttons["reviewer-sign-in"]
        for _ in 0..<3 { if reviewer.isHittable { break }; app.swipeUp() }
        XCTAssertTrue(reviewer.waitForExistence(timeout:5)); reviewer.tap()
        XCTAssertTrue(app.textFields["reviewer-email"].waitForExistence(timeout:5))
        XCTAssertTrue(app.secureTextFields["reviewer-password"].exists)
        XCTAssertFalse(app.buttons["reviewer-submit"].isEnabled)
        app.buttons["Cancel"].tap()
        XCTAssertTrue(app.buttons["Email me a sign-in link"].exists)
        // Never send review credentials or sign in to production from UI tests.
    }
    func testEmailFieldCanBeTappedAndTypedInto() {
        let app = XCUIApplication()
        app.launchArguments = ["--test-sign-in-screen"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Run Analytics"].waitForExistence(timeout: 10))
        let email = app.textFields["Email address"]
        XCTAssertTrue(email.isHittable)
        email.tap()
        email.typeText("runner@example.com")
        // Allow the keyboard's final text-change event to reach SwiftUI.
        let typed = expectation(for: NSPredicate(format: "value == %@", "runner@example.com"), evaluatedWith: email)
        wait(for: [typed], timeout: 5)
        XCTAssertTrue(app.buttons["Email me a sign-in link"].isEnabled)
        XCTAssertEqual(app.secureTextFields.count, 0)
        // Never request a real email or access runner data from UI tests.
    }
}
