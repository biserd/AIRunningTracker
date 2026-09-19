import XCTest
final class InsightLayoutTests:XCTestCase {
    func testReadOnlyInsightsStayNative() {
        let app=XCUIApplication()
        app.launchArguments=["--test-adaptive-layout","--test-insights"]
        app.launch()
        let insights=app.buttons.matching(NSPredicate(format:"label CONTAINS %@","Your running insights")).firstMatch
        XCTAssertTrue(insights.waitForExistence(timeout:10))
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
        let attachment=XCTAttachment(screenshot:XCUIApplication().screenshot())
        attachment.name=name; attachment.lifetime = .keepAlways; add(attachment)
    }
}
