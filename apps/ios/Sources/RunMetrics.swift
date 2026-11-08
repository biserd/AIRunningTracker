import Foundation

struct RunProgress: Codable, Equatable { let distance: Double; let seconds: Double }
struct RunSplit: Codable, Identifiable {
    let number: Int
    let distance: Double
    let seconds: Double
    var id: Int { number }
}
struct RunPulse: Codable { let date: Date; let bpm: Int }
extension PhoneRecording {
    var averageHeartRate: Int? {
        let samples = pulses ?? []
        return samples.isEmpty ? nil : Int((Double(samples.reduce(0) { $0 + $1.bpm }) / Double(samples.count)).rounded())
    }
    func splits(unit: Double) -> [RunSplit] {
        guard unit > 0 else { return [] }
        let points = [RunProgress(distance: 0, seconds: 0)] + (progress ?? [])
        var result: [RunSplit] = [], boundary = unit, previousTime = 0.0
        for pair in zip(points, points.dropFirst()) where pair.1.distance > pair.0.distance {
            while boundary <= pair.1.distance {
                let fraction = (boundary - pair.0.distance) / (pair.1.distance - pair.0.distance)
                let seconds = pair.0.seconds + fraction * (pair.1.seconds - pair.0.seconds)
                result.append(RunSplit(number: result.count + 1, distance: unit, seconds: max(0, seconds - previousTime)))
                previousTime = seconds; boundary += unit
            }
        }
        let remainder = distance - Double(result.count) * unit
        if remainder > 1 { result.append(RunSplit(number: result.count + 1, distance: remainder, seconds: max(0, seconds - previousTime))) }
        return result
    }
    var laps: [RunSplit] {
        let marks = [RunProgress(distance: 0, seconds: 0)] + (lapMarks ?? [])
        return zip(marks, marks.dropFirst()).enumerated().map { i, pair in RunSplit(number: i + 1, distance: max(0, pair.1.distance - pair.0.distance), seconds: max(0, pair.1.seconds - pair.0.seconds)) }
    }
    var recentPace: Double? {
        guard running, let last = progress?.last, seconds - last.seconds < 15,
              let first = progress?.last(where: { last.seconds - $0.seconds >= 15 }),last.distance > first.distance else { return nil }
        return (last.seconds - first.seconds) / (last.distance - first.distance) * 1000
    }
}
