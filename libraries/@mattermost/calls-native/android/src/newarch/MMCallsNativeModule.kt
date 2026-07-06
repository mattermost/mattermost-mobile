package com.mattermost.callsnative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap

class MMCallsNativeModule(reactContext: ReactApplicationContext) : NativeMMCallsNativeSpec(reactContext) {
    private val implementation = MMCallsNativeModuleImpl(reactContext)

    override fun getName(): String = MMCallsNativeModuleImpl.NAME

    override fun addListener(eventType: String?) {
        // Keep: Required for RN built in Event Emitter Calls
    }

    override fun removeListeners(count: Double) {
        // Keep: Required for RN built in Event Emitter Calls
    }

    override fun reportOutgoingCall(params: ReadableMap?, promise: Promise?) {
        implementation.reportOutgoingCall(promise)
    }

    override fun reportConnected(uuid: String?, promise: Promise?) {
        implementation.reportConnected(promise)
    }

    override fun reportEnded(uuid: String?, reason: String?, promise: Promise?) {
        implementation.reportEnded(promise)
    }

    override fun setMuted(uuid: String?, muted: Boolean, promise: Promise?) {
        implementation.setMuted(promise)
    }

    override fun foregroundServiceStart(config: ReadableMap?) {
        implementation.foregroundServiceStart(config)
    }

    override fun foregroundServiceStop() {
        implementation.foregroundServiceStop()
    }
}
