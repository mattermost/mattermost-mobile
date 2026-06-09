package com.mattermost.callsnative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.mattermost.callsnative.managers.CallsBridge

class MMCallsNativeModule(reactContext: ReactApplicationContext) : NativeMMCallsNativeSpec(reactContext) {
    private val implementation = MMCallsNativeModuleImpl(reactContext)

    override fun getName(): String = MMCallsNativeModuleImpl.NAME

    override fun addListener(eventType: String?) {
        CallsBridge.markJSListenersReady()
    }

    override fun removeListeners(count: Double) {
        if (count <= 0.0) {
            CallsBridge.markJSListenersGone()
        }
    }

    override fun reportOutgoingCall(params: ReadableMap?, promise: Promise?) {
        implementation.reportOutgoingCall(params, promise)
    }

    override fun reportConnected(uuid: String?, promise: Promise?) {
        implementation.reportConnected(uuid, promise)
    }

    override fun reportEnded(uuid: String?, reason: String?, promise: Promise?) {
        implementation.reportEnded(uuid, reason, promise)
    }

    override fun setMuted(uuid: String?, muted: Boolean, promise: Promise?) {
        implementation.setMuted(uuid, muted, promise)
    }
}
