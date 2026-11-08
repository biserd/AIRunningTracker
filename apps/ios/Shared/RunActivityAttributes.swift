import ActivityKit
struct RunActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        let distance: Double
        let seconds: Double
        let running: Bool
        let miles: Bool
    }
    let runID: String
}
