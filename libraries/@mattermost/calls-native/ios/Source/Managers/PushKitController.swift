// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CallKit
import Foundation
import Gekidou
import PushKit

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
                pushCompletion: completion
            )
            return
        }

        let channelID = (dict["channel_id"] as? String) ?? ""
        let serverID = (dict["server_id"] as? String) ?? ""
        let postID = (dict["post_id"] as? String) ?? ""
        let threadID = (dict["thread_id"] as? String) ?? ""
        let senderID = (dict["sender_id"] as? String) ?? ""
        let senderName = (dict["sender_name"] as? String) ?? ""
        let channelName = (dict["channel_name"] as? String) ?? ""

        GekidouLogger.shared.log(.info,
            "PushKitController: VoIP push received channelID=\(channelID)")

        // SYNCHRONOUS report — iOS 13+ enforces that this call happens
        // before `pushRegistry:didReceiveIncomingPush:...` returns.
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
            pushCompletion: completion
        )
    }
}
