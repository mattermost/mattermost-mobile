package com.mattermost.callsnative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap

class MMCallsNativeModule(reactContext: ReactApplicationContext) : NativeMMCallsNativeSpec(reactContext) {
    private val implementation = MMCallsNativeModuleImpl(reactContext)

    override fun getName(): String = MMCallsNativeModuleImpl.NAME

    override fun addListener(eventType: String?) {
        implementation.addListener()
    }

    override fun removeListeners(count: Double) {
        implementation.removeListeners(count.toInt())
    }

    override fun setCallListenersReady() {
        implementation.setCallListenersReady()
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

    override fun foregroundServiceStart(config: ReadableMap?) {
        implementation.foregroundServiceStart(config)
    }

    override fun foregroundServiceStop() {
        implementation.foregroundServiceStop()
    }

    override fun startAudioSession(promise: Promise?) {
        implementation.startAudioSession(promise)
    }

    override fun stopAudioSession(promise: Promise?) {
        implementation.stopAudioSession(promise)
    }

    override fun setAudioRoute(route: String?, promise: Promise?) {
        implementation.setAudioRoute(route ?: "EARPIECE", promise)
    }

    override fun getAudioRoute(promise: Promise?) {
        implementation.getAudioRoute(promise)
    }

    override fun startRingtone(name: String?, seconds: Double, isRingback: Boolean, promise: Promise?) {
        implementation.startRingtone(name ?: "default_ringtone", seconds.toInt(), isRingback, promise)
    }

    override fun stopRingtone(promise: Promise?) {
        implementation.stopRingtone(promise)
    }
}
