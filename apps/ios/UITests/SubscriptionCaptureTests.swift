import XCTest
import UIKit
import StoreKitTest
final class SubscriptionCaptureTests: XCTestCase {
    func testCaptureNativePaywall() throws {
        let session = try SKTestSession(configurationFileNamed: "ReviewProducts")
        session.resetToDefaultState()
        session.disableDialogs = true
        XCUIDevice.shared.orientation = .portrait
        let app = XCUIApplication()
        app.launchArguments = ["--capture-subscription-review"]
        app.launch()
        XCTAssertTrue(app.staticTexts["Monthly · $7.99/month"].waitForExistence(timeout: 30))
        XCTAssertTrue(app.staticTexts["Annual · $79.99/year"].exists)
        XCTAssertTrue(app.staticTexts["7 days free, then $7.99/month."].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["7 days free, then $79.99/year."].exists)
        app.swipeUp()
        XCTAssertTrue(app.buttons["Restore purchases"].exists)
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = "Native subscription paywall - US StoreKit test catalog"
        attachment.lifetime = .keepAlways
        add(attachment)
        withExtendedLifetime(session) {}
    }
}
