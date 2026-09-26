import XCTest
@testable import AITracker

final class CoachMessageSourcesTests: XCTestCase {
    func testSourceLinksAndBody() {
        let result = CoachMessageSources("A sourced answer.\n\nSources:\nhttps://www.nike.com/running")
        XCTAssertEqual(result.body, "A sourced answer.")
        XCTAssertEqual(result.urls.first?.host, "www.nike.com")
    }
    func testRejectsUnsafeLinks() {
        let result = CoachMessageSources("Answer\n\nSources:\nhttp://example.com\nhttps://user:password@example.com\nhttps://127.0.0.1")
        XCTAssertTrue(result.urls.isEmpty)
        XCTAssertEqual(CoachMessageSources("Plain reply").body, "Plain reply")
    }
    func testWeatherQueriesAreSupportedButTokensAreNot() {
        let forecast = CoachMessageSources("Weather\n\nSources:\nhttps://forecast.weather.gov/MapClick.php?lat=40.71&lon=-74.01")
        XCTAssertEqual(forecast.urls.count, 1)
        XCTAssertTrue(CoachMessageSources("Answer\n\nSources:\nhttps://example.com/?token=secret").urls.isEmpty)
    }
}
