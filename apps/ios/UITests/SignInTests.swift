import XCTest

final class SignInTests: XCTestCase {
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
