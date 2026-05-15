// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AVFoundation
import CallKit
import CryptoKit
import Foundation
import PushKit
import TurboLogIOSNative
import UIKit

private let mattermostVoIPTokenDefaultsKey = "MattermostVoIPToken"

/// VoIP push payload (server / push proxy must mirror this contract).
/// Top-level `mm_voip` on the PushKit payload, e.g.:
/// { "aps": { "content-available": 1 }, "mm_voip": { "call_id", "channel_id", "server_url", "caller_name" } }
private struct MattermostVoIPPayload {
    let callId: String
    let channelId: String
    let serverUrl: String
    let callerName: String

    init?(dictionary: [AnyHashable: Any]) {
        guard let dict = dictionary["mm_voip"] as? [String: Any] else {
            return nil
        }
        if let action = dict["action"] as? String, action == "cancel" {
            return nil
        }
        guard let callId = dict["call_id"] as? String, !callId.isEmpty,
              let channelId = dict["channel_id"] as? String, !channelId.isEmpty,
              let serverUrl = dict["server_url"] as? String, !serverUrl.isEmpty else {
            return nil
        }
        let rawCaller = dict["caller_name"] as? String
        let caller: String
        if let c = rawCaller, !c.isEmpty {
            caller = c
        } else {
            caller = "Mattermost"
        }
        self.callId = callId
        self.channelId = channelId
        self.serverUrl = serverUrl
        self.callerName = caller
    }
}

@objc public final class MattermostIncomingCalls: NSObject {
    @objc public static let shared = MattermostIncomingCalls()

    private let pushRegistry = PKPushRegistry(queue: .main)
    private let callController = CXCallController()
    private var provider: CXProvider?

    private let config: CXProviderConfiguration = {
        let c = CXProviderConfiguration()
        c.supportsVideo = true
        c.maximumCallsPerCallGroup = 1
        c.maximumCallGroups = 1
        c.supportedHandleTypes = [.generic]
        return c
    }()

    private var pending: [UUID: (serverUrl: String, channelId: String)] = [:]

    /// When the user accepts from CallKit we end the shell call via `CXEndCallAction`; skip restoring `.playback`
    /// so React Native `InCallManager` can own the session for the active call.
    private var suppressIdleAudioRestoreForNextEndAction = false

    private override init() {
        super.init()
    }

    /// Start PushKit + CallKit. Safe to call once at launch.
    @objc public func start() {
        if provider == nil {
            let p = CXProvider(configuration: config)
            p.setDelegate(self, queue: nil)
            provider = p
        }
        pushRegistry.delegate = self
        pushRegistry.desiredPushTypes = [.voIP]
    }

    private static func uuidForCallId(_ callId: String) -> UUID {
        let d = Insecure.MD5.hash(data: Data(callId.utf8))
        let bytes = [UInt8](d)
        return UUID(uuid: (
            bytes[0], bytes[1], bytes[2], bytes[3],
            bytes[4], bytes[5], bytes[6], bytes[7],
            bytes[8], bytes[9], bytes[10], bytes[11],
            bytes[12], bytes[13], bytes[14], bytes[15]
        ))
    }

    private func appURLScheme() -> String {
        guard let urlTypes = Bundle.main.object(forInfoDictionaryKey: "CFBundleURLTypes") as? [[String: Any]] else {
            return "mattermost"
        }

        for urlType in urlTypes where urlType["CFBundleURLName"] as? String == "com.mattermost" {
            guard let schemes = urlType["CFBundleURLSchemes"] as? [String] else {
                continue
            }
            if let scheme = schemes.first(where: { !$0.hasPrefix("mmauth") }) {
                return scheme
            }
        }

        return "mattermost"
    }

    private func answerDeepLink(serverUrl: String, channelId: String) -> URL? {
        var c = URLComponents()
        c.scheme = appURLScheme()
        c.host = "incoming-call"
        c.queryItems = [
            URLQueryItem(name: "server_url", value: serverUrl),
            URLQueryItem(name: "channel_id", value: channelId),
        ]
        return c.url
    }

    private func endSystemCall(_ uuid: UUID) {
        let transaction = CXTransaction(action: CXEndCallAction(call: uuid))
        callController.request(transaction) { error in
            if let error = error {
                TurboLogger.write(level: .warning, message: "MattermostIncomingCalls: failed to end CallKit call: \(error.localizedDescription)")
            }
        }
    }

    /// Ends CallKit UI + system ring for this Mattermost call id (same UUID derivation as incoming VoIP).
    @objc public func endIncomingCallKit(callId: String) {
        let trimmed = callId.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return
        }
        let uuid = Self.uuidForCallId(trimmed)
        pending.removeValue(forKey: uuid)
        endSystemCall(uuid)
    }

    private func endStaleIncomingCallsBeforeNew(withId newCallId: String) {
        let newUuid = Self.uuidForCallId(newCallId)
        let stale = pending.keys.filter { $0 != newUuid }
        guard !stale.isEmpty else {
            return
        }
        for id in stale {
            pending.removeValue(forKey: id)
            endSystemCall(id)
        }
    }

    private static func isVoipCancelPayload(_ dictionary: [AnyHashable: Any]) -> String? {
        guard let dict = dictionary["mm_voip"] as? [String: Any] else {
            return nil
        }
        guard let action = dict["action"] as? String, action == "cancel" else {
            return nil
        }
        guard let callId = dict["call_id"] as? String else {
            return nil
        }
        let trimmed = callId.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    /// Mattermost sets `.playback` at launch (`AppDelegate`). That category can prevent CallKit from
    /// playing the system incoming-call ring when a VoIP push arrives in the background.
    private func prepareAudioSessionForCallKitIncoming() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setActive(false, options: [.notifyOthersOnDeactivation])
            try session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
        } catch {
            TurboLogger.write(level: .warning, message: "MattermostIncomingCalls: prepareAudioSessionForCallKitIncoming: \(error.localizedDescription)")
        }
    }

    /// Restore the category used at cold start after the user dismisses CallKit without joining via JS.
    private func restoreIdleAudioSessionAfterCallKitDismissed() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback)
        } catch {
            TurboLogger.write(level: .warning, message: "MattermostIncomingCalls: restoreIdleAudioSessionAfterCallKitDismissed: \(error.localizedDescription)")
        }
    }
}

extension MattermostIncomingCalls: PKPushRegistryDelegate {
    public func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
        let token = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
        TurboLogger.write(level: .info, message: "Mattermost VoIP push token updated")
        UserDefaults.standard.set(token, forKey: mattermostVoIPTokenDefaultsKey)
        NotificationCenter.default.post(
            name: NSNotification.Name("MattermostVoIPTokenUpdated"),
            object: nil,
            userInfo: ["token": token]
        )
    }

    public func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
        TurboLogger.write(level: .info, message: "Mattermost VoIP push token invalidated")
        UserDefaults.standard.removeObject(forKey: mattermostVoIPTokenDefaultsKey)
    }

    public func pushRegistry(
        _ registry: PKPushRegistry,
        didReceiveIncomingPushWith payload: PKPushPayload,
        for type: PKPushType,
        completion: @escaping () -> Void
    ) {
        let dict = payload.dictionaryPayload
        if let cancelId = Self.isVoipCancelPayload(dict) {
            endIncomingCallKit(callId: cancelId)
            completion()
            return
        }

        guard let voip = MattermostVoIPPayload(dictionary: dict) else {
            TurboLogger.write(level: .warning, message: "MattermostIncomingCalls: VoIP push missing mm_voip payload")
            completion()
            return
        }

        // Always report CallKit for VoIP pushes. Skipping when `applicationState == .active` can violate PushKit
        // expectations (VoIP delivery may be throttled or stopped after failures). JS layer avoids duplicate
        // ringtone while foreground (`shouldRing` checks AppState).

        guard let callProvider = provider else {
            TurboLogger.write(level: .error, message: "MattermostIncomingCalls: provider nil on VoIP push")
            completion()
            return
        }

        let uuid = Self.uuidForCallId(voip.callId)
        // Only one incoming ring per provider config; end prior pendings so reportNewIncomingCall does not fail.
        endStaleIncomingCallsBeforeNew(withId: voip.callId)
        pending[uuid] = (serverUrl: voip.serverUrl, channelId: voip.channelId)

        prepareAudioSessionForCallKitIncoming()

        let update = CXCallUpdate()
        update.remoteHandle = CXHandle(type: .generic, value: voip.callerName)
        update.localizedCallerName = voip.callerName
        update.hasVideo = true

        callProvider.reportNewIncomingCall(with: uuid, update: update) { error in
            if let error = error {
                TurboLogger.write(level: .error, message: "MattermostIncomingCalls: reportNewIncomingCall failed: \(error.localizedDescription)")
                self.pending.removeValue(forKey: uuid)
                self.restoreIdleAudioSessionAfterCallKitDismissed()
            }
            completion()
        }
    }
}

extension MattermostIncomingCalls: CXProviderDelegate {
    public func providerDidReset(_ provider: CXProvider) {
        pending.removeAll()
        restoreIdleAudioSessionAfterCallKitDismissed()
    }

    public func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        defer { action.fulfill() }
        let uuid = action.callUUID
        guard let info = pending.removeValue(forKey: action.callUUID) else {
            TurboLogger.write(level: .warning, message: "MattermostIncomingCalls: answer with no pending call")
            return
        }
        guard let url = answerDeepLink(serverUrl: info.serverUrl, channelId: info.channelId) else {
            return
        }
        suppressIdleAudioRestoreForNextEndAction = true
        DispatchQueue.main.async {
            let handled: Bool
            if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
                handled = appDelegate.dispatchDeepLinkToReactNative(url)
            } else {
                handled = false
            }
            if !handled {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                self.endSystemCall(uuid)
            }
        }
    }

    public func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        pending.removeValue(forKey: action.callUUID)
        if suppressIdleAudioRestoreForNextEndAction {
            suppressIdleAudioRestoreForNextEndAction = false
        } else {
            restoreIdleAudioSessionAfterCallKitDismissed()
        }
        action.fulfill()
    }
}
