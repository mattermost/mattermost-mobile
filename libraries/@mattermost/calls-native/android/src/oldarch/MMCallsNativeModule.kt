package com.mattermost.callsnative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class MMCallsNativeModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private val implementation = MMCallsNativeModuleImpl(context)

    override fun getName(): String = MMCallsNativeModuleImpl.NAME

    @ReactMethod
    fun addListener(eventType: String?) {
        // Keep: Required for RN built in Event Emitter Calls
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        // Keep: Required for RN built in Event Emitter Calls
    }

    @ReactMethod
    fun reportOutgoingCall(params: ReadableMap?, promise: Promise?) {
        implementation.reportOutgoingCall(promise)
    }

    @ReactMethod
    fun reportConnected(uuid: String?, promise: Promise?) {
        implementation.reportConnected(promise)
    }

    @ReactMethod
    fun reportEnded(uuid: String?, reason: String?, promise: Promise?) {
        implementation.reportEnded(promise)
    }

    @ReactMethod
    fun setMuted(uuid: String?, muted: Boolean, promise: Promise?) {
        implementation.setMuted(promise)
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun foregroundServiceStart(config: ReadableMap?) {
        implementation.foregroundServiceStart(config)
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun foregroundServiceStop() {
        implementation.foregroundServiceStop()
    }

    @ReactMethod
    fun startAudioSession(promise: Promise?) {
        implementation.startAudioSession(promise)
    }

    @ReactMethod
    fun stopAudioSession(promise: Promise?) {
        implementation.stopAudioSession(promise)
    }

    @ReactMethod
    fun setAudioRoute(route: String?, promise: Promise?) {
        implementation.setAudioRoute(route ?: "EARPIECE", promise)
    }

    @ReactMethod
    fun getAudioRoute(promise: Promise?) {
        implementation.getAudioRoute(promise)
    }

    @ReactMethod
    fun startRingtone(name: String?, seconds: Double, isRingback: Boolean, promise: Promise?) {
        implementation.startRingtone(name ?: "default_ringtone", seconds.toInt(), isRingback, promise)
    }

    @ReactMethod
    fun stopRingtone(promise: Promise?) {
        implementation.stopRingtone(promise)
    }
}
