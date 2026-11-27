import XCTest
import UIKit

final class RunHistoryUITests: XCTestCase {
    func testAllSourceHistoryHasSingleColumnAtAccessibilitySize() {
        let app = XCUIApplication()
        app.launchArguments = ["--test-standalone", "--test-run-history", "--test-dark-accessibility"]
        app.launch()
        XCTAssertTrue(app.buttons["start-phone-run"].waitForExistence(timeout: 8))
        let history = app.descendants(matching: .any)["open-native-run-history"].firstMatch
        for _ in 0..<4 where !history.isHittable { app.swipeUp() }
        XCTAssertTrue(history.isHittable)
        history.tap()
        XCTAssertTrue(app.navigationBars["Run history"].waitForExistence(timeout: 8))
        XCTAssertFalse(app.buttons["native-history-back"].exists)
        let garminRun = app.descendants(matching: .any)["native-history-garmin:sample"].firstMatch
        XCTAssertTrue(garminRun.waitForExistence(timeout: 8))
        capture("All-source history in dark mode at accessibility size 5")
        garminRun.tap()
        XCTAssertTrue(app.navigationBars["Garmin park intervals"].waitForExistence(timeout: 8))
        XCTAssertFalse(app.buttons["Open coach insight"].exists)
        capture("Garmin run detail in compact layout")
    }

    func testWideRunHistoryKeepsSelectedRunDuringWidthRoundTrip() throws {
        try XCTSkipUnless(UIDevice.current.userInterfaceIdiom == .pad, "Requires iPad for the expanded pane")
        XCUIDevice.shared.orientation = .landscapeLeft
        defer { XCUIDevice.shared.orientation = .portrait }
        let app = XCUIApplication()
        app.launchArguments = ["--test-standalone", "--test-run-history", "--test-history-resize"]
        app.launch()
        XCUIDevice.shared.orientation = .landscapeLeft
        let hideSidebar = app.buttons["Hide Sidebar"]
        if hideSidebar.waitForExistence(timeout: 5), hideSidebar.isHittable { hideSidebar.tap() }
        let history = app.descendants(matching: .any)["open-native-run-history"].firstMatch
        XCTAssertTrue(history.waitForExistence(timeout: 8))
        history.tap()
        let wideBack = app.buttons["native-history-back"]
        XCTAssertTrue(wideBack.waitForExistence(timeout: 8))
        XCTAssertTrue(app.staticTexts["Select a run"].exists)
        let garminRun = app.buttons["native-history-garmin:sample"]
        let stravaRun = app.buttons["native-history-strava:42"]
        XCTAssertTrue(garminRun.isHittable)
        XCTAssertTrue(stravaRun.isHittable)
        stravaRun.tap()
        let detail = app.staticTexts["native-history-detail-title"]
        XCTAssertTrue(detail.waitForExistence(timeout: 8))
        XCTAssertEqual(detail.label, "Saturday long run")
        XCTAssertTrue(garminRun.isHittable)
        capture("Expanded Run history with Strava run selected")

        let resize = app.buttons["history-test-resize"]
        resize.tap()
        XCTAssertTrue(app.navigationBars["Saturday long run"].waitForExistence(timeout: 8))
        XCTAssertFalse(wideBack.exists)
        capture("Same selected run after a 500-point width proposal")
        resize.tap()
        XCTAssertTrue(wideBack.waitForExistence(timeout: 8))
        XCTAssertTrue(detail.waitForExistence(timeout: 8))
        XCTAssertEqual(detail.label, "Saturday long run")
        garminRun.tap()
        XCTAssertTrue(app.staticTexts.matching(identifier: "native-history-detail-title")
            .matching(NSPredicate(format: "label == %@", "Garmin park intervals"))
            .firstMatch.waitForExistence(timeout: 8))
        wideBack.tap()
        XCTAssertTrue(app.buttons["start-phone-run"].waitForExistence(timeout: 8))
    }

    func testProgressHistoryStillOpensCoachingRun() {
        let app = XCUIApplication()
        app.launchArguments = ["--test-adaptive-layout", "--test-insights", "--test-run-history", "--test-calendar-navigation"]
        app.launch()
        let sidebar = app.descendants(matching: .any)["sidebar-progress"].firstMatch
        if sidebar.waitForExistence(timeout: 3) { sidebar.tap() }
        else { app.tabBars.buttons["Progress"].tap() }
        let insights = app.buttons["Coach insights"]
        XCTAssertTrue(insights.waitForExistence(timeout: 10))
        insights.tap()
        let history = app.descendants(matching: .any)["open-coaching-run-history"].firstMatch
        XCTAssertTrue(history.waitForExistence(timeout: 8))
        history.tap()
        let coachingRun = app.descendants(matching: .any)["progress-history-42"].firstMatch
        XCTAssertTrue(coachingRun.waitForExistence(timeout: 8))
        coachingRun.tap()
        if app.buttons["progress-history-back"].exists {
            XCTAssertEqual(app.staticTexts["progress-history-detail-title"].label, "Coaching history intervals")
            XCTAssertTrue(coachingRun.isHittable)
        } else {
            XCTAssertTrue(app.navigationBars["Coaching history intervals"].waitForExistence(timeout: 8))
        }
        XCTAssertFalse(app.descendants(matching: .any)["native-history-garmin:sample"].exists)
        capture("Progress keeps its scoped coaching history")
    }

    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        let window = XCUIApplication().frame
        attachment.name = "\(name) — \(Int(window.width))×\(Int(window.height)) pt"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
