package com.mattermost.callsnative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.mattermost.callsnative.managers.CallsBridge

class MMCallsNativeModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private val implementation = MMCallsNativeModuleImpl(context)

    override fun getName(): String = MMCallsNativeModuleImpl.NAME

    @ReactMethod
    fun addListener(eventType: String?) {
        CallsBridge.markJSListenersReady()
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        if (count <= 0.0) {
            CallsBridge.markJSListenersGone()
        }
    }

    @ReactMethod
    fun reportOutgoingCall(params: ReadableMap?, promise: Promise?) {
        implementation.reportOutgoingCall(params, promise)
    }

    @ReactMethod
    fun reportConnected(uuid: String?, promise: Promise?) {
        implementation.reportConnected(uuid, promise)
    }

    @ReactMethod
    fun reportEnded(uuid: String?, reason: String?, promise: Promise?) {
        implementation.reportEnded(uuid, reason, promise)
    }

    @ReactMethod
    fun setMuted(uuid: String?, muted: Boolean, promise: Promise?) {
        implementation.setMuted(uuid, muted, promise)
    }
}
