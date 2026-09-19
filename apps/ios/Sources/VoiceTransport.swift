import Foundation
import AVFoundation
import WebRTC

// Native audio only. Account cookies and provider keys never enter this transport.
@MainActor final class VoiceTransport: NSObject {
    private static let factory: RTCPeerConnectionFactory = {
        RTCInitializeSSL()
        return RTCPeerConnectionFactory()
    }()
    private var peer: RTCPeerConnection?
    private var channel: RTCDataChannel?
    private var track: RTCAudioTrack?
    var onEvent: ((Data) -> Void)?
    var onFailure: (() -> Void)?

    func offer() async throws -> String {
        try configureAudio()
        return try await createOffer()
    }
    private func configureAudio() throws {
        let audio = RTCAudioSession.sharedInstance()
        audio.lockForConfiguration()
        defer { audio.unlockForConfiguration() }
        try audio.setCategory(AVAudioSession.Category.playAndRecord.rawValue,
                              with: [.defaultToSpeaker, .allowBluetooth])
        try audio.setMode(AVAudioSession.Mode.voiceChat.rawValue)
    }
    private func createOffer() async throws -> String {
        let configuration = RTCConfiguration()
        configuration.sdpSemantics = .unifiedPlan
        let constraints = RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil)
        guard let peer = Self.factory.peerConnection(with: configuration, constraints: constraints, delegate: self) else {
            throw APIError.server(503, "Could not start native audio.")
        }
        self.peer = peer
        let source = Self.factory.audioSource(with: constraints)
        let track = Self.factory.audioTrack(with: source, trackId: "coach-microphone")
        self.track = track
        peer.add(track, streamIds: ["coach-audio"])
        guard let channel = peer.dataChannel(forLabel: "oai-events", configuration: RTCDataChannelConfiguration()) else {
            throw APIError.server(503, "Could not start voice controls.")
        }
        self.channel = channel
        channel.delegate = self
        let offer: RTCSessionDescription = try await withCheckedThrowingContinuation { continuation in
            peer.offer(for: RTCMediaConstraints(mandatoryConstraints: ["OfferToReceiveAudio": "true"], optionalConstraints: nil)) { description, error in
                if let error { continuation.resume(throwing: error) }
                else if let description { continuation.resume(returning: description) }
                else { continuation.resume(throwing: APIError.invalidResponse) }
            }
        }
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            peer.setLocalDescription(offer) { error in
                if let error { continuation.resume(throwing: error) } else { continuation.resume() }
            }
        }
        let deadline = Date().addingTimeInterval(10)
        while peer.iceGatheringState != .complete {
            try Task.checkCancellation()
            guard self.peer === peer, Date() < deadline else {
                throw APIError.server(503, "Voice networking could not connect. Please try again.")
            }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        guard self.peer === peer, let sdp = peer.localDescription?.sdp else { throw CancellationError() }
        return sdp
    }

    func accept(_ sdp: String) async throws {
        guard let peer, sdp.hasPrefix("v=0"), sdp.utf8.count < 100_000 else { throw APIError.invalidResponse }
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            peer.setRemoteDescription(RTCSessionDescription(type: .answer, sdp: sdp)) { error in
                if let error { continuation.resume(throwing: error) } else { continuation.resume() }
            }
        }
    }
    func mute(_ muted: Bool) {
        track?.isEnabled = !muted
        send(["type": muted ? "session.input_audio.mute" : "session.input_audio.unmute"])
    }
    @discardableResult func send(_ event: [String: Any]) -> Bool {
        guard let channel, channel.readyState == .open else { return false }
        var event = event
        event["event_id"] = UUID().uuidString
        guard let data = try? JSONSerialization.data(withJSONObject: event) else { return false }
        return channel.sendData(RTCDataBuffer(data: data, isBinary: false))
    }
    func close() {
        track?.isEnabled = false
        track = nil
        channel?.delegate = nil
        channel?.close()
        channel = nil
        peer?.delegate = nil
        peer?.close()
        peer = nil
        let audio = RTCAudioSession.sharedInstance()
        audio.lockForConfiguration()
        try? audio.setActive(false)
        audio.unlockForConfiguration()
    }
}

extension VoiceTransport: RTCPeerConnectionDelegate, RTCDataChannelDelegate {
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream) {}
    nonisolated func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceConnectionState) {
        if newState == .failed || newState == .disconnected {
            Task { @MainActor [weak self] in
                guard let self, self.peer === peerConnection else { return }
                self.onFailure?()
            }
        }
    }
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceGatheringState) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {}
    nonisolated func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {}
    nonisolated func dataChannelDidChangeState(_ dataChannel: RTCDataChannel) {}
    nonisolated func dataChannel(_ dataChannel: RTCDataChannel, didReceiveMessageWith buffer: RTCDataBuffer) {
        guard !buffer.isBinary, buffer.data.count <= 65_536 else { return }
        let data = buffer.data
        Task { @MainActor [weak self] in
            guard let self, self.channel === dataChannel else { return }
            self.onEvent?(data)
        }
    }
}
