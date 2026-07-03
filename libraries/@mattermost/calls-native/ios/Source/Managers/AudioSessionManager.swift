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
final class AudioSessionManager {
    private let session = AVAudioSession.sharedInstance()

    /// Apply the category + mode + options for a Calls voice session.
    /// Called from `CXAnswerCallAction` (incoming) and `reportOutgoingCall`.
    func configureForCall() {
        do {
            try session.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [.allowBluetoothHFP, .allowBluetoothA2DP, .duckOthers]
            )
            GekidouLogger.shared.log(.info, "AudioSessionManager: configured category=playAndRecord mode=voiceChat")
        } catch {
            GekidouLogger.shared.log(.error,
                "AudioSessionManager: setCategory failed: \(error.localizedDescription)")
        }
    }

    /// CallKit just activated the audio session. Forward to
    /// `RTCAudioSession` so react-native-webrtc's internal state matches
    /// reality and the audio unit can start when peer-connection audio is
    /// ready. Per react-native-webrtc's iOS docs:
    ///   "your CXProviderDelegate should call through to
    ///    RTCAudioSession.sharedInstance.audioSessionDidActivate accordingly."
    func activated(_ audioSession: AVAudioSession) {
        RTCAudioSession.sharedInstance().audioSessionDidActivate(audioSession)
        GekidouLogger.shared.log(.info, "AudioSessionManager: forwarded didActivate to RTCAudioSession")
    }

    /// Symmetric for deactivation.
    func deactivated(_ audioSession: AVAudioSession) {
        RTCAudioSession.sharedInstance().audioSessionDidDeactivate(audioSession)
        GekidouLogger.shared.log(.info, "AudioSessionManager: forwarded didDeactivate to RTCAudioSession")
    }
}
