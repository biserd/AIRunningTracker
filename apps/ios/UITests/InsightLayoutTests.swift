import XCTest
import UIKit
final class InsightLayoutTests:XCTestCase {
    func testReadOnlyInsightsStayNative() {
        XCUIDevice.shared.orientation = UIDevice.current.userInterfaceIdiom == .pad ? .landscapeLeft : .portrait
        defer { XCUIDevice.shared.orientation = .portrait }
        let app=XCUIApplication()
        app.launchArguments=["--test-adaptive-layout","--test-insights"]
        app.launch()
        if UIDevice.current.userInterfaceIdiom == .pad {
            let progress = app.descendants(matching: .any)["sidebar-progress"].firstMatch
            XCTAssertTrue(progress.waitForExistence(timeout: 10)); progress.tap()
        } else {
            XCTAssertTrue(app.tabBars.buttons["Progress"].waitForExistence(timeout: 10))
            app.tabBars.buttons["Progress"].tap()
        }
        let insights=app.buttons["Coach insights"]
        XCTAssertTrue(insights.waitForExistence(timeout:10))
        XCTAssertTrue(app.staticTexts["Running distance"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["mileage-selected-period"].label.contains("This week so far"))
        capture("Progress weekly distance")
        app.segmentedControls.buttons["Monthly"].tap()
        XCTAssertTrue(app.staticTexts["mileage-selected-period"].label.contains("This month so far"))
        XCTAssertEqual(app.staticTexts["mileage-selected-total"].label, "31.1 mi")
        capture("Progress monthly distance")
        app.segmentedControls.buttons["Weekly"].tap()
        XCTAssertEqual(app.staticTexts["mileage-selected-total"].label, "3.1 mi")
        XCTAssertTrue(app.staticTexts["Runner Score"].waitForExistence(timeout:5))
        XCTAssertTrue(app.staticTexts["54 / 100"].exists)
        capture("Progress overview")
        insights.tap()
        XCTAssertTrue(app.navigationBars["Coach insights"].waitForExistence(timeout:5))
        XCTAssertTrue(app.staticTexts["A little easier today."].exists)
        capture("Insights overview")
        app.segmentedControls.buttons["Performance"].tap()
        XCTAssertTrue(app.staticTexts["24:12"].waitForExistence(timeout:5))
        capture("Insights performance")
        XCTAssertEqual(app.webViews.count,0)
        app.segmentedControls.buttons["Recaps"].tap()
        XCTAssertTrue(app.staticTexts["After your run"].exists)
        XCTAssertFalse(app.buttons["Save"].exists)
    }
    private func capture(_ name:String) {
        let attachment=XCTAttachment(screenshot:XCUIScreen.main.screenshot())
        attachment.name=name; attachment.lifetime = .keepAlways; add(attachment)
    }
    func testContributionGridOpensRunDetails() {
        let app = XCUIApplication()
        app.launchArguments = ["--test-adaptive-layout", "--test-insights", "--test-calendar-navigation"]
        app.launch()
        XCUIDevice.shared.orientation = UIDevice.current.userInterfaceIdiom == .pad ? .landscapeLeft : .portrait
        defer { XCUIDevice.shared.orientation = .portrait }
        if UIDevice.current.userInterfaceIdiom == .pad {
            let progress = app.descendants(matching: .any)["sidebar-progress"].firstMatch
            XCTAssertTrue(progress.waitForExistence(timeout: 10)); progress.tap()
        } else { app.tabBars.buttons["Progress"].tap() }
        let day = app.buttons["activity-day-2026-09-30"]
        for _ in 0..<7 {
            if day.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(day.waitForExistence(timeout: 5)); XCTAssertTrue(day.isHittable)
        day.tap()
        let run = app.buttons["calendar-run-182"]
        for _ in 0..<3 {
            if run.isHittable { break }
            app.swipeUp()
        }
        XCTAssertTrue(run.waitForExistence(timeout: 5))
        let grid = app.scrollViews["activity-contribution-grid"].firstMatch
        XCTAssertTrue(grid.exists)
        XCTAssertGreaterThan(grid.frame.width, app.frame.width * 0.45, "The contribution grid should use the content width, not share it with an expanding weekday-label column.")
        capture("Contribution calendar with linked run")
        run.tap()
        XCTAssertTrue(app.navigationBars["Easy run"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "30:00")).firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "9:39 /mi")).firstMatch.exists)
        XCTAssertEqual(app.webViews.count, 0)
        capture("Run opened from activity calendar")
    }
}
