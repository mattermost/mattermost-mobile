// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AVFoundation
import CallKit
import Foundation
import Gekidou
import UIKit
import UserNotifications

struct IncomingCallRequest {
    let channelID: String
    let serverID: String
    let postID: String
    let threadID: String
    let callerID: String
    let callerName: String
    let channelName: String
    /// Raw PushKit payload. Used to drive the ack-receipt round-trip in
    /// `reportIncomingCall` so the CallKit UI can be updated with the
    /// resolved name when the server returns enriched fields (IdLoaded
    /// configs). Empty for synthetic requests (outbound, decode failures).
    let rawUserInfo: [AnyHashable: Any]
}

private struct CallInfo {
    let request: IncomingCallRequest
    var isAnswered: Bool
    let silentForeground: Bool
}

@objc public final class CallKitProvider: NSObject, CXProviderDelegate {
    private let provider: CXProvider
    private let controller = CXCallController()
    private weak var bridge: CallsBridge?

    private var calls: [UUID: CallInfo] = [:]
    private let callsLock = NSLock()

    /// UUIDs whose next `CXSetMutedCallAction` we expect to handle without
    /// re-emitting a `CallMuted` event back to JS — because JS itself is
    /// what just requested the mute change. Prevents a feedback loop
    /// where in-app toggleMute → setMuted (JS→native) → CallKit delegate
    /// → CallMuted event → muteMyself (back to JS) → ad infinitum.
    private var jsOriginatedMutes: Set<UUID> = []

    init(bridge: CallsBridge) {
        self.bridge = bridge

        let configuration = CXProviderConfiguration()
        // Calls today is audio + screen share — no front-camera video. Screen
        // share doesn't surface through CallKit (it's handled in-app), so
        // CallKit's video affordance stays off.
        configuration.supportsVideo = false
        configuration.maximumCallGroups = 2
        configuration.maximumCallsPerCallGroup = 1
        configuration.supportedHandleTypes = [.generic]
        configuration.includesCallsInRecents = false

        if let iconData = Self.callKitIconTemplateData() {
            configuration.iconTemplateImageData = iconData
        }

        self.provider = CXProvider(configuration: configuration)
        super.init()
        self.provider.setDelegate(self, queue: .main)
        GekidouLogger.shared.log(.info, "CallKitProvider: initialized")
    }

    // MARK: - Inbound (PushKit-triggered)

    func reportIncomingCall(_ request: IncomingCallRequest,
                            silentForeground: Bool,
                            pushCompletion: @escaping () -> Void) {
        // channelID + serverID are the minimum needed for the JS layer to
        // resolve which server and which channel to join. Without them we
        // can't drive doJoinCall. Satisfy iOS's "you must report" rule
        // without showing the user a broken incoming-call UI.
        if request.channelID.isEmpty || request.serverID.isEmpty {
            GekidouLogger.shared.log(.warning,
                "CallKitProvider: incomplete VoIP payload, bailing (channelID=\(request.channelID) serverID=\(request.serverID))")
            let uuid = UUID()
            let update = CXCallUpdate()
            update.remoteHandle = CXHandle(type: .generic, value: "unknown")
            provider.reportNewIncomingCall(with: uuid, update: update) { [weak self] _ in
                self?.provider.reportCall(with: uuid, endedAt: nil, reason: .failed)
                pushCompletion()
            }
            return
        }

        let uuid = UUID()
        let info = CallInfo(request: request, isAnswered: false, silentForeground: silentForeground)
        setCallInfo(info, for: uuid)

        let update = CXCallUpdate()
        update.remoteHandle = CXHandle(type: .generic,
                                       value: request.callerID.isEmpty ? request.channelID : request.callerID)
        // CallKit shows localizedCallerName as the primary display; if it's
        // empty it falls back to the handle (a raw ID — terrible UX). Pick
        // the best available initial name from the payload; for IdLoaded
        // configs the ack-receipt round-trip refreshes it via
        // updateCallerName(uuid:name:).
        update.localizedCallerName = Self.bestInitialDisplayName(request)
        update.hasVideo = false
        update.supportsHolding = false
        update.supportsGrouping = false
        update.supportsUngrouping = false
        update.supportsDTMF = false

        GekidouLogger.shared.log(.info,
            "CallKitProvider: reportNewIncomingCall uuid=\(uuid.uuidString) silent=\(silentForeground)")

        // For foreground pushes we suppress the system UI by ending the
        // just-reported call synchronously on the same runloop. Calling
        // reportCall(endedAt:) immediately after reportNewIncomingCall —
        // rather than waiting for the async completion handler — gives
        // iOS the end signal before it has a chance to render the
        // incoming-call UI, eliminating the brief flash on foreground.
        provider.reportNewIncomingCall(with: uuid, update: update) { [weak self] error in
            guard let self = self else {
                pushCompletion()
                return
            }
            if let error = error {
                GekidouLogger.shared.log(.error,
                    "CallKitProvider: reportNewIncomingCall failed: \(error.localizedDescription)")
                self.clearCallInfo(for: uuid)
                pushCompletion()
                return
            }

            if !silentForeground {
                self.bridge?.send(event: .IncomingCall, body: [
                    "uuid": uuid.uuidString,
                    "channelId": request.channelID,
                    "serverId": request.serverID,
                    "postId": request.postID,
                    "threadId": request.threadID,
                    "callerId": request.callerID,
                    "callerName": request.callerName,
                    "channelName": request.channelName,
                ])
                self.ackAndRefreshName(uuid: uuid, userInfo: request.rawUserInfo)
            }
            pushCompletion()
        }

        if silentForeground {
            provider.reportCall(with: uuid, endedAt: Date(), reason: .answeredElsewhere)
            clearCallInfo(for: uuid)
            GekidouLogger.shared.log(.info,
                "CallKitProvider: app foreground, suppressed CallKit UI uuid=\(uuid.uuidString)")
        }
    }

    /// POST /notifications/ack to the originating server. For IdLoaded
    /// configs the response carries the channel name and sender display
    /// name; we splice those into the CallKit UI via reportCall(updated:).
    /// Skipped for synthetic requests (empty rawUserInfo) — outbound calls
    /// and signature-verification failures.
    private func ackAndRefreshName(uuid: UUID, userInfo: [AnyHashable: Any]) {
        guard !userInfo.isEmpty else { return }

        let content = UNMutableNotificationContent()
        content.userInfo = userInfo
        Gekidou.PushNotification.default.postNotificationReceipt(content) { [weak self] enriched in
            guard let self = self, let enriched = enriched else { return }
            let info = enriched.userInfo
            let resolved = (info["channel_name"] as? String).flatMap { $0.isEmpty ? nil : $0 }
                ?? (info["sender_name"] as? String).flatMap { $0.isEmpty ? nil : $0 }
            guard let name = resolved else { return }
            DispatchQueue.main.async {
                self.updateCallerName(uuid: uuid, name: name)
            }
        }
    }

    // MARK: - Outbound (JS-triggered)

    @objc public func reportOutgoingCall(channelID: String,
                                          calleeName: String,
                                          completion: @escaping (UUID?, Error?) -> Void) {
        let uuid = UUID()
        let request = IncomingCallRequest(channelID: channelID,
                                          serverID: "",
                                          postID: "",
                                          threadID: "",
                                          callerID: "",
                                          callerName: calleeName,
                                          channelName: "",
                                          rawUserInfo: [:])
        let info = CallInfo(request: request, isAnswered: true, silentForeground: false)
        setCallInfo(info, for: uuid)

        let handle = CXHandle(type: .generic, value: calleeName.isEmpty ? channelID : calleeName)
        let startAction = CXStartCallAction(call: uuid, handle: handle)
        startAction.isVideo = false
        startAction.contactIdentifier = calleeName

        let transaction = CXTransaction(action: startAction)
        controller.request(transaction) { [weak self] error in
            guard let self = self else { return }
            if let error = error {
                GekidouLogger.shared.log(.error,
                    "CallKitProvider: request startCallAction failed: \(error.localizedDescription)")
                self.clearCallInfo(for: uuid)
                completion(nil, error)
                return
            }
            self.provider.reportOutgoingCall(with: uuid, startedConnectingAt: nil)
            GekidouLogger.shared.log(.info,
                "CallKitProvider: reported outgoing call uuid=\(uuid.uuidString)")
            completion(uuid, nil)
        }
    }

    @objc public func reportConnected(uuid: UUID) {
        provider.reportOutgoingCall(with: uuid, connectedAt: nil)
        updateCallInfo(for: uuid) { $0.isAnswered = true }
        GekidouLogger.shared.log(.info, "CallKitProvider: reportConnected uuid=\(uuid.uuidString)")
    }

    /// Replace the display name on an in-progress call. Used after the
    /// ack-receipt round-trip resolves the human name for an IdLoaded push
    /// (the original `reportIncomingCall` had only the channel/sender id).
    @objc public func updateCallerName(uuid: UUID, name: String) {
        guard !name.isEmpty else { return }
        let update = CXCallUpdate()
        update.localizedCallerName = name
        provider.reportCall(with: uuid, updated: update)
        GekidouLogger.shared.log(.info,
            "CallKitProvider: updateCallerName uuid=\(uuid.uuidString)")
    }

    @objc public func reportEnded(uuid: UUID, reason: CXCallEndedReason) {
        provider.reportCall(with: uuid, endedAt: nil, reason: reason)
        clearCallInfo(for: uuid)
        GekidouLogger.shared.log(.info,
            "CallKitProvider: reportEnded uuid=\(uuid.uuidString) reason=\(reason.rawValue)")
    }

    /// End any active CallKit call that matches the given route. Used when
    /// a `type=clear sub_type=calls` VoIP push arrives (the caller hung up
    /// before the callee answered) — the WebSocket call_end event can't
    /// reach us when the app is backgrounded, so the push is the only way
    /// to clear the ringing UI. A no-op if no matching call is tracked.
    /// Returns true if a matching call was found and ended, false if no
    /// tracked call matched the route (e.g. cancel arrived after the user
    /// already declined). The caller uses the return value to decide
    /// whether the iOS 13+ "must report on every VoIP push" rule was
    /// satisfied by the reportCall(endedAt:) we just made, or whether it
    /// needs to report-then-end a dummy call to stay compliant.
    @objc public func endCall(serverID: String, channelID: String, reason: CXCallEndedReason) -> Bool {
        guard !serverID.isEmpty, !channelID.isEmpty else { return false }
        callsLock.lock()
        let match = calls.first { _, info in
            info.request.serverID == serverID && info.request.channelID == channelID
        }
        callsLock.unlock()
        guard let (uuid, _) = match else {
            GekidouLogger.shared.log(.info,
                "CallKitProvider: endCall no match for serverID=\(serverID) channelID=\(channelID)")
            return false
        }
        reportEnded(uuid: uuid, reason: reason)
        return true
    }

    @objc public func setMuted(uuid: UUID, muted: Bool, completion: @escaping (Error?) -> Void) {
        callsLock.lock()
        jsOriginatedMutes.insert(uuid)
        callsLock.unlock()
        let action = CXSetMutedCallAction(call: uuid, muted: muted)
        let transaction = CXTransaction(action: action)
        controller.request(transaction) { [weak self] error in
            if error != nil {
                self?.callsLock.lock()
                self?.jsOriginatedMutes.remove(uuid)
                self?.callsLock.unlock()
            }
            completion(error)
        }
    }

    // MARK: - CXProviderDelegate

    public func providerDidReset(_ provider: CXProvider) {
        callsLock.lock()
        calls.removeAll()
        callsLock.unlock()
        GekidouLogger.shared.log(.info, "CallKitProvider: providerDidReset")
    }

    public func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
        guard var info = callInfo(for: action.callUUID) else {
            action.fail()
            return
        }
        info.isAnswered = true
        setCallInfo(info, for: action.callUUID)

        bridge?.audioSession.configureForCall()
        bridge?.send(event: .CallAnswered, body: ["uuid": action.callUUID.uuidString])
        action.fulfill()
    }

    public func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
        let info = callInfo(for: action.callUUID)
        let event: CallsBridge.Event = (info?.isAnswered == true) ? .CallEnded : .CallDeclined

        bridge?.send(event: event, body: ["uuid": action.callUUID.uuidString])
        clearCallInfo(for: action.callUUID)
        action.fulfill()
    }

    public func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
        callsLock.lock()
        let jsOriginated = jsOriginatedMutes.remove(action.callUUID) != nil
        callsLock.unlock()
        if !jsOriginated {
            bridge?.send(event: .CallMuted, body: [
                "uuid": action.callUUID.uuidString,
                "muted": action.isMuted,
            ])
        }
        action.fulfill()
    }

    public func provider(_ provider: CXProvider, perform action: CXStartCallAction) {
        // For Phase 1 we don't need to do anything here — outbound calls go
        // through reportOutgoingCall above which already requested the
        // transaction. iOS still calls this delegate; just fulfill.
        action.fulfill()
    }

    public func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
        bridge?.audioSession.activated(audioSession)
    }

    public func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
        bridge?.audioSession.deactivated(audioSession)
    }

    // MARK: - Call info bookkeeping

    private func callInfo(for uuid: UUID) -> CallInfo? {
        callsLock.lock()
        defer { callsLock.unlock() }
        return calls[uuid]
    }

    private func setCallInfo(_ info: CallInfo, for uuid: UUID) {
        callsLock.lock()
        calls[uuid] = info
        callsLock.unlock()
    }

    private func updateCallInfo(for uuid: UUID, _ mutation: (inout CallInfo) -> Void) {
        callsLock.lock()
        if var info = calls[uuid] {
            mutation(&info)
            calls[uuid] = info
        }
        callsLock.unlock()
    }

    private func clearCallInfo(for uuid: UUID) {
        callsLock.lock()
        calls.removeValue(forKey: uuid)
        callsLock.unlock()
    }

    // MARK: - Display-name selection

    /// Pick the best name we can show on the initial CXCallUpdate, before
    /// the ack-receipt has had a chance to enrich the payload. The order
    /// favors the most-specific identifier we have: channel > sender > a
    /// localized fallback. Returning empty would make CallKit display the
    /// raw handle (a user id) — terrible UX.
    private static func bestInitialDisplayName(_ request: IncomingCallRequest) -> String {
        if !request.channelName.isEmpty { return request.channelName }
        if !request.callerName.isEmpty { return request.callerName }
        return localizedIncomingCallPlaceholder()
    }

    /// Reads `mobile.ios.calls.incoming_call_placeholder` from the main app
    /// bundle's Localizable.strings
    private static func localizedIncomingCallPlaceholder() -> String {
        let key = "mobile.ios.calls.incoming_call_placeholder"
        let appName = (Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String)
            ?? (Bundle.main.object(forInfoDictionaryKey: "CFBundleName") as? String)
            ?? "Mattermost"
        let template = NSLocalizedString(key, bundle: .main, value: "\(appName) call", comment: "")
        return template.replacingOccurrences(of: "{applicationName}", with: appName)
    }

    // MARK: - Bundled icon

    private static func callKitIconTemplateData() -> Data? {
        let frameworkBundle = Bundle(for: CallKitProvider.self)
        guard let resourceURL = frameworkBundle.url(forResource: "MMCallsNativeResources", withExtension: "bundle"),
              let resourceBundle = Bundle(url: resourceURL),
              let image = UIImage(named: "MMCallKitIcon", in: resourceBundle, compatibleWith: nil) else {
            GekidouLogger.shared.log(.warning, "CallKitProvider: MMCallKitIcon not found in resource bundle")
            return nil
        }
        return image.pngData()
    }
}
