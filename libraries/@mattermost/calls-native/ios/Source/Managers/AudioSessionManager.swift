// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AVFoundation
import Foundation
import Gekidou
import WebRTC

/// Owns the `AVAudioSession` configuration for a Calls voice session, and
/// bridges CallKit's `didActivate` / `didDeactivate` callbacks into
/// react-native-webrtc's `RTCAudioSession` singleton — which is the
/// integration point officially documented by react-native-webrtc.
///
/// All AVAudioSession mutations go through `RTCAudioSession.sharedInstance()`
/// (WebRTC's proxy) to avoid races with WebRTC's own configuration lock.
/// The only exception is `AVAudioSession.sharedInstance()` read-only
/// properties used to inspect the current route — those are safe per the
/// RTCAudioSession header comment ("Callers should not call setters on
/// AVAudioSession directly, but other method invocations are fine").
@objc public final class AudioSessionManager: NSObject {
    private var rtcSession: RTCAudioSession { RTCAudioSession.sharedInstance() }
    private var avSession: AVAudioSession { AVAudioSession.sharedInstance() }
    private var ringtonePlayer: AVAudioPlayer?
    weak var bridge: CallsBridge?

    init(bridge: CallsBridge) {
        super.init()
        self.bridge = bridge
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(routeChanged(_:)),
            name: AVAudioSession.routeChangeNotification,
            object: nil
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - Call session configuration

    /// Apply the category + mode + options for a Calls voice session.
    /// Called from `CXAnswerCallAction` (incoming) and `CXStartCallAction` (outgoing).
    /// Also overwrites WebRTC's stored RTCAudioSessionConfiguration so that
    /// any internal reconfiguration WebRTC performs (e.g. on audioSessionDidActivate)
    /// uses the same options we set — specifically .allowBluetoothHFP — rather
    /// than its own defaults which don't include Bluetooth options.
    @objc public func configureForCall() {
        try? configureForCallThrowing()
    }

    /// Called from JS `startAudioSession()`. On the normal path CallKit already
    /// called `configureForCall()` via `CXStartCallAction` / `CXAnswerCallAction`,
    /// so this is a no-op. When CallKit registration failed the session is still
    /// unconfigured, so we configure it here as a fallback and surface any error.
    @objc(startAudioSessionWithError:)
    public func startAudioSession() throws {
        guard avSession.category != .playAndRecord else { return }
        try configureForCallThrowing()
    }

    private func configureForCallThrowing() throws {
        let webRTCConfig = RTCAudioSessionConfiguration()
        webRTCConfig.category = AVAudioSession.Category.playAndRecord.rawValue
        webRTCConfig.categoryOptions = [.allowBluetoothHFP, .allowBluetoothA2DP, .duckOthers]
        webRTCConfig.mode = AVAudioSession.Mode.voiceChat.rawValue
        RTCAudioSessionConfiguration.setWebRTC(webRTCConfig)

        rtcSession.lockForConfiguration()
        defer { rtcSession.unlockForConfiguration() }
        do {
            try rtcSession.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [.allowBluetoothHFP, .allowBluetoothA2DP, .duckOthers]
            )
            GekidouLogger.shared.log(.info,
                "AudioSessionManager: configured category=playAndRecord mode=voiceChat")
        } catch {
            GekidouLogger.shared.log(.error,
                "AudioSessionManager: setCategory failed: \(error.localizedDescription)")
            throw error
        }
    }

    /// Called from JS `stopAudioSession` when the RTC connection closes.
    /// For CallKit-backed calls this runs before `provider(_:didDeactivate:)` arrives —
    /// the early `setActive(false)` is redundant but harmless: RTCAudioSession
    /// tolerates a deactivation call on an already-inactive session. When CallKit
    /// registration failed and `didDeactivate` will never fire, this is the only
    /// teardown path.
    @objc public func resetSession() {
        do {
            try rtcSession.setActive(false)
            GekidouLogger.shared.log(.info, "AudioSessionManager: resetSession — session deactivated")
        } catch {
            GekidouLogger.shared.log(.error,
                "AudioSessionManager: resetSession failed: \(error.localizedDescription)")
        }
    }

    // MARK: - Audio route selection

    /// Select the output audio route. All mutations go through
    /// `RTCAudioSession` with the configuration lock held.
    /// - `SPEAKER_PHONE`: overrides output to built-in speaker.
    /// - `EARPIECE`: clears override; prefers built-in mic input so the
    ///   system routes output to the receiver.
    /// - `BLUETOOTH`: clears override; sets preferred output to the first
    ///   connected BT HFP/A2DP port.
    /// - `WIRED_HEADSET`: clears override; sets preferred output to the
    ///   connected headphones/headset port.
    @objc public func setAudioRoute(_ route: String) {
        // overrideOutputAudioPort and setPreferredInput/setPreferredOutput are
        // output-routing calls that don't affect WebRTC's internal audio
        // configuration, so we call them directly on AVAudioSession rather than
        // going through RTCAudioSession. Using the RTCAudioSession proxy for
        // these caused spurious route-change notifications that fought with
        // CallKit's own speaker-button handling.
        do {
            switch route {
            case "SPEAKER_PHONE":
                // Clear any preferred input so earpiece doesn't fight speaker.
                try avSession.setPreferredInput(nil)
                try avSession.overrideOutputAudioPort(.speaker)

            case "EARPIECE":
                try avSession.overrideOutputAudioPort(.none)
                if let builtInMic = avSession.availableInputs?.first(where: { $0.portType == .builtInMic }) {
                    try avSession.setPreferredInput(builtInMic)
                }

            case "BLUETOOTH":
                // Must clear speaker override AND preferred input before
                // selecting BT — otherwise the earpiece preference set by a
                // previous CallKit or in-app route change wins and iOS silently
                // ignores the BT port selection.
                try avSession.overrideOutputAudioPort(.none)
                try avSession.setPreferredInput(nil)
                // Prefer BT HFP input so the system commits output to the BT
                // device rather than falling back to the receiver.
                if let btInput = avSession.availableInputs?.first(where: {
                    $0.portType == .bluetoothHFP || $0.portType == .bluetoothA2DP
                }) {
                    try avSession.setPreferredInput(btInput)
                }

            case "WIRED_HEADSET":
                try avSession.overrideOutputAudioPort(.none)
                try avSession.setPreferredInput(nil)
                if let headsetInput = avSession.availableInputs?.first(where: {
                    $0.portType == .headsetMic
                }) {
                    try avSession.setPreferredInput(headsetInput)
                }

            default:
                try avSession.overrideOutputAudioPort(.none)
                try avSession.setPreferredInput(nil)
            }
            GekidouLogger.shared.log(.info, "AudioSessionManager: setAudioRoute route=\(route)")
        } catch {
            GekidouLogger.shared.log(.error,
                "AudioSessionManager: setAudioRoute(\(route)) failed: \(error.localizedDescription)")
        }
    }

    /// Returns the currently active output route and the full list of
    /// available audio output devices.
    @objc public func currentAudioRoute() -> [String: Any] {
        let outputs = avSession.currentRoute.outputs

        var selected = "EARPIECE"
        for port in outputs {
            switch port.portType {
            case .builtInSpeaker:
                selected = "SPEAKER_PHONE"
            case .bluetoothHFP, .bluetoothA2DP:
                selected = "BLUETOOTH"
            case .headphones, .headsetMic:
                selected = "WIRED_HEADSET"
            default:
                break
            }
        }

        let inputs = avSession.availableInputs ?? []

        var available: Set<String> = [selected, "SPEAKER_PHONE"]

        let hasReceiver = inputs.contains(where: { $0.portType == .builtInMic })
        if hasReceiver { available.insert("EARPIECE") }

        // Bluetooth HFP: check both active outputs AND available inputs so
        // that AirPods/BT headsets remain in the list when speaker or earpiece
        // is the current active route (they're still connected, just not active).
        let hasBT = outputs.contains(where: { $0.portType == .bluetoothHFP || $0.portType == .bluetoothA2DP })
            || inputs.contains(where: { $0.portType == .bluetoothHFP || $0.portType == .bluetoothA2DP })
        if hasBT { available.insert("BLUETOOTH") }

        // Wired headset: check outputs (headphones port) and inputs (headsetMic).
        let hasWired = outputs.contains(where: { $0.portType == .headphones || $0.portType == .headsetMic })
            || inputs.contains(where: { $0.portType == .headsetMic })
        if hasWired { available.insert("WIRED_HEADSET") }

        // Use a fixed order so the list is deterministic across emissions with
        // identical membership — prevents spurious JS diffs on the available list.
        let ordered: [String] = ["BLUETOOTH", "WIRED_HEADSET", "EARPIECE", "SPEAKER_PHONE"]
            .filter { available.contains($0) }

        return [
            "selectedAudioDevice": selected,
            "availableAudioDeviceList": ordered,
        ]
    }

    // MARK: - Route change observer

    @objc private func routeChanged(_ notification: Notification) {
        bridge?.send(event: .AudioRouteChanged, body: currentAudioRoute())
    }

    // MARK: - CallKit lifecycle forwarding

    /// CallKit just activated the audio session. Forward to
    /// `RTCAudioSession` so react-native-webrtc's internal state matches
    /// reality and the audio unit can start when peer-connection audio is
    /// ready. Per react-native-webrtc's iOS docs:
    ///   "your CXProviderDelegate should call through to
    ///    RTCAudioSession.sharedInstance.audioSessionDidActivate accordingly."
    @objc func activated(_ audioSession: AVAudioSession) {
        rtcSession.audioSessionDidActivate(audioSession)
        GekidouLogger.shared.log(.info, "AudioSessionManager: forwarded didActivate to RTCAudioSession")
    }

    /// Symmetric for deactivation.
    @objc func deactivated(_ audioSession: AVAudioSession) {
        rtcSession.audioSessionDidDeactivate(audioSession)
        GekidouLogger.shared.log(.info, "AudioSessionManager: forwarded didDeactivate to RTCAudioSession")
    }

    // MARK: - Ringtone

    /// Play a ringtone from the app bundle. File is resolved by name (e.g. `<name>.mp3`)
    /// with a fallback to `default_ringtone.mp3`.
    @objc public func startRingtone(_ name: String) throws {
        stopRingtone()

        let url: URL
        if let bundleURL = Bundle.main.url(forResource: name, withExtension: "mp3") {
            url = bundleURL
        } else if let defaultURL = Bundle.main.url(forResource: "default_ringtone", withExtension: "mp3") {
            url = defaultURL
        } else {
            throw NSError(
                domain: "CallsNative",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Ringtone not found: \(name)"]
            )
        }

        // Don't overwrite the call session category if configureForCall() has
        // already run — WebRTC's audio unit must keep its playAndRecord session.
        let callSessionActive = avSession.category == .playAndRecord
        if !callSessionActive {
            try avSession.setCategory(.soloAmbient)
            try avSession.setActive(true)
        }

        ringtonePlayer = try AVAudioPlayer(contentsOf: url)
        ringtonePlayer?.numberOfLoops = -1
        ringtonePlayer?.play()
        GekidouLogger.shared.log(.info, "AudioSessionManager: startRingtone name=\(name)")
    }

    @objc public func stopRingtone() {
        guard ringtonePlayer != nil else { return }
        ringtonePlayer?.stop()
        ringtonePlayer = nil
        if avSession.category != .playAndRecord {
            try? avSession.setActive(false, options: .notifyOthersOnDeactivation)
        }
        GekidouLogger.shared.log(.info, "AudioSessionManager: stopRingtone")
    }
}
