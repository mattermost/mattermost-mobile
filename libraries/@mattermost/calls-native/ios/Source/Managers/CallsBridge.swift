// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Foundation
import Gekidou

/// `CallsBridge` is the singleton that:
///  - owns the PushKit + CallKit + AVAudioSession managers,
///  - holds the JS-side event delegate (the `RCTEventEmitter` subclass) so
///    managers can emit events without knowing about React internals,
///  - exposes the `bootstrap()` entry-point that `AppDelegate` must call
///    synchronously inside `didFinishLaunchingWithOptions`.
///
@objc public final class CallsBridge: NSObject {
    @objc public static let shared = CallsBridge()

    /// Cold-launch event buffer. On a VoIP-triggered cold launch the
    /// PushKit + CallKit delegates fire before React Native finishes
    /// loading, so JS subscribers aren't attached when we'd emit. We
    /// buffer here and flush once the RCTEventEmitter signals it has
    /// listeners (via `startObserving`, which calls `flushPendingEvents`).
    private struct PendingEvent {
        let name: String
        let body: [String: Any]?
    }
    private var pendingEvents: [PendingEvent] = []
    private let pendingLock = NSLock()
    private var hasJSListeners = false

    @objc public weak var delegate: CallsBridgeDelegate? {
        didSet {
            // Reset on RN reload (delegate replaced). The initial nil →
            // delegate transition must preserve the cold-launch buffer.
            if oldValue != nil && oldValue !== delegate {
                pendingLock.lock()
                pendingEvents.removeAll()
                hasJSListeners = false
                pendingLock.unlock()
            }
        }
    }

    private var didBootstrap = false
    private(set) lazy var pushKitController = PushKitController(bridge: self)
    @objc public private(set) lazy var callKitProvider = CallKitProvider(bridge: self)
    private(set) lazy var audioSession = AudioSessionManager()

    private override init() {
        super.init()
    }

    /// One-shot bootstrap. Must be called synchronously from
    /// `AppDelegate.application(_:didFinishLaunchingWithOptions:)` on the
    /// main thread so the `PKPushRegistry` and `CXProvider` are wired
    /// before any incoming VoIP push delegate can fire.
    @objc public func bootstrap() {
        if didBootstrap {
            return
        }
        didBootstrap = true

        // Force evaluation of the lazy properties so the underlying registry
        // and provider are allocated now, not when JS first calls in.
        _ = pushKitController
        _ = callKitProvider
        _ = audioSession
    }

    /// Called by `MMCallsNative.startObserving` when JS has attached its
    /// first listener. Flushes any events buffered during cold launch.
    @objc public func markJSListenersReady() {
        var toFlush: [PendingEvent] = []
        pendingLock.lock()
        hasJSListeners = true
        if !pendingEvents.isEmpty {
            toFlush = pendingEvents
            pendingEvents.removeAll()
        }
        pendingLock.unlock()

        guard !toFlush.isEmpty, let delegate = delegate else { return }
        GekidouLogger.shared.log(.info,
            "CallsBridge: flushing \(toFlush.count) pending event(s) to JS")
        for event in toFlush {
            delegate.sendEventWithName(event.name, body: event.body)
        }
    }

    /// Called by `MMCallsNative.stopObserving` when JS detaches.
    @objc public func markJSListenersGone() {
        pendingLock.lock()
        hasJSListeners = false
        pendingLock.unlock()
    }

    /// Emit an event to the JS layer. If no JS listener has attached yet
    /// (cold launch), buffer it until `markJSListenersReady()` is called.
    /// Safe to call from any thread.
    func send(event: Event, body: [String: Any]?) {
        pendingLock.lock()
        let ready = hasJSListeners
        if !ready {
            pendingEvents.append(PendingEvent(name: event.rawValue, body: body))
        }
        pendingLock.unlock()

        if ready {
            delegate?.sendEventWithName(event.rawValue, body: body)
        } else {
            GekidouLogger.shared.log(.debug,
                "CallsBridge: buffered event \(event.rawValue) — JS not ready")
        }
    }
}
