import XCTest
@testable import AITracker

final class VoiceTests: XCTestCase {
    func testOnlyKnownVoiceEventsAreAccepted() {
        XCTAssertNil(VoiceEvent.parse(Data("not-json".utf8)))
        XCTAssertNil(VoiceEvent.parse(Data(#"{"type":"unknown"}"#.utf8)))
        XCTAssertNil(VoiceEvent.parse(Data(#"{"type":"session.delegation.created","delegation":{"id":""}}"#.utf8)))
        if case .started? = VoiceEvent.parse(Data(#"{"type":"session.started"}"#.utf8)) {} else { XCTFail("Missing ready event") }
        if case .delegation(let id)? = VoiceEvent.parse(Data(#"{"type":"session.delegation.created","delegation":{"id":"one"}}"#.utf8)) {
            XCTAssertEqual(id, "one")
        } else { XCTFail("Missing delegation") }
    }
    func testTranscriptAndPayloadAreBounded() throws {
        let data = try JSONSerialization.data(withJSONObject: ["type": "session.input_transcript.delta", "delta": String(repeating: "x", count: 2500)])
        if case .transcript(let text)? = VoiceEvent.parse(data) { XCTAssertEqual(text.count, 1800) }
        else { XCTFail("Missing transcript") }
        XCTAssertNil(VoiceEvent.parse(Data(repeating: 32, count: 65_537)))
    }
    @MainActor func testNoCallStartsForAnonymousOrUnentitledRunner() {
        let store = CoachStore()
        store.voice.start(store: store)
        XCTAssertFalse(store.voice.active)
        XCTAssertEqual(store.voice.phase, .off)
    }
    @MainActor func testStoppingIdleVoiceIsSafe() async {
        let voice = NativeVoiceCoach()
        await voice.end()
        voice.toggleMute()
        XCTAssertEqual(voice.phase, .off)
        XCTAssertFalse(voice.muted)
    }
    @MainActor func testVoiceSessionAllowsFiveMinutes() {
        XCTAssertEqual(NativeVoiceCoach.maximumDuration, 300)
    }
}
