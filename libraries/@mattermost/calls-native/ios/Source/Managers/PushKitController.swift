// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CallKit
import Foundation
import Gekidou
import PushKit
import UIKit

/// Owns the single `PKPushRegistry` for VoIP pushes. The delegate callback
/// MUST call `reportNewIncomingCall` synchronously inside its body — iOS
/// terminates apps that don't on iOS 13+.
final class PushKitController: NSObject, PKPushRegistryDelegate {
    private let registry: PKPushRegistry
    private weak var bridge: CallsBridge?

    init(bridge: CallsBridge) {
        self.registry = PKPushRegistry(queue: .main)
        self.bridge = bridge
        super.init()
        self.registry.delegate = self
        self.registry.desiredPushTypes = [.voIP]
        GekidouLogger.shared.log(.info, "PushKitController: initialized")
    }

    // MARK: - PKPushRegistryDelegate

    func pushRegistry(_ registry: PKPushRegistry, didUpdate credentials: PKPushCredentials, for type: PKPushType) {
        guard type == .voIP else { return }
        let token = credentials.token.map { String(format: "%02x", $0) }.joined()
        GekidouLogger.shared.log(.info, "PushKitController: VoIP token issued, length=\(token.count)")
        bridge?.send(event: .VoIPTokenUpdated, body: ["token": token])
    }

    func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
        guard type == .voIP else { return }
        GekidouLogger.shared.log(.warning, "PushKitController: VoIP token invalidated by system")
        bridge?.send(event: .VoIPTokenUpdated, body: ["token": ""])
    }

    func pushRegistry(_ registry: PKPushRegistry,
                      didReceiveIncomingPushWith payload: PKPushPayload,
                      for type: PKPushType,
                      completion: @escaping () -> Void) {
        guard type == .voIP, let bridge = bridge else {
            completion()
            return
        }

        let dict = payload.dictionaryPayload

        // Authenticate the push via Gekidou's VoIP-aware signature
        // verification. Same JWT mechanism as the standard push path, but
        // compares against the stored VoIP token (not the standard one).
        guard Gekidou.PushNotification.default.verifyVoIPSignature(dict) else {
            GekidouLogger.shared.log(.warning,
                "PushKitController: VoIP push signature verification failed; reporting + ending")
            bridge.callKitProvider.reportIncomingCall(
                IncomingCallRequest(channelID: "", serverID: "",
                                    postID: "", threadID: "",
                                    callerID: "", callerName: "",
                                    channelName: "", rawUserInfo: [:]),
                silentForeground: false,
                pushCompletion: completion
            )
            return
        }

        let pushType = (dict["type"] as? String) ?? ""
        let subType = (dict["sub_type"] as? String) ?? ""
        let category = (dict["category"] as? String) ?? ""
        let channelID = (dict["channel_id"] as? String) ?? ""
        let serverID = (dict["server_id"] as? String) ?? ""
        let postID = (dict["post_id"] as? String) ?? ""
        let threadID = (dict["thread_id"] as? String) ?? ""
        let senderID = (dict["sender_id"] as? String) ?? ""
        let senderName = (dict["sender_name"] as? String) ?? ""
        let channelName = (dict["channel_name"] as? String) ?? ""

        // Cancel-ring path: covers both "caller hung up before we answered"
        // (default, .unanswered) and "user answered on another device"
        // (category=answered_elsewhere, .answeredElsewhere — silent dismiss
        // matching how CallKit treats a call accepted on another device).
        if pushType == "clear" && subType == "calls" {
            GekidouLogger.shared.log(.info,
                "PushKitController: VoIP clear received serverID=\(serverID) channelID=\(channelID) category=\(category)")

            let reason: CXCallEndedReason = category == "answered_elsewhere" ? .answeredElsewhere : .unanswered
            let ended = bridge.callKitProvider.endCall(serverID: serverID,
                                                       channelID: channelID,
                                                       reason: reason)
            if ended {
                completion()
            } else {
                // No matching active call — typically a cancel that arrived
                // after the user already declined. Report + end a throwaway
                // to satisfy the rule without showing UI.
                bridge.callKitProvider.reportIncomingCall(
                    IncomingCallRequest(channelID: "", serverID: "",
                                        postID: "", threadID: "",
                                        callerID: "", callerName: "",
                                        channelName: "", rawUserInfo: [:]),
                    silentForeground: false,
                    pushCompletion: completion
                )
            }
            return
        }

        let appWasActive = UIApplication.shared.applicationState == .active
        GekidouLogger.shared.log(.info,
            "PushKitController: VoIP push received channelID=\(channelID) appActive=\(appWasActive)")

        // SYNCHRONOUS report — iOS 13+ enforces that this call happens
        // before `pushRegistry:didReceiveIncomingPush:...` returns.
        // When the app is foreground, the CallKit provider immediately
        // ends the just-reported call with .answeredElsewhere so the
        // system UI doesn't take over from the in-app incoming-call UI
        // (driven by the main WebSocket's call_start event).
        bridge.callKitProvider.reportIncomingCall(
            IncomingCallRequest(
                channelID: channelID,
                serverID: serverID,
                postID: postID,
                threadID: threadID,
                callerID: senderID,
                callerName: senderName,
                channelName: channelName,
                rawUserInfo: dict
            ),
            silentForeground: appWasActive,
            pushCompletion: completion
        )
    }
}
