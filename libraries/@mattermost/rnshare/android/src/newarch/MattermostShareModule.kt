package com.mattermost.rnshare

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap

class MattermostShareModule(private val reactContext: ReactApplicationContext) : NativeMattermostShareSpec(reactContext) {
    private var implementation = MattermostShareImpl(reactContext)

    override fun getCurrentActivityName(): String = implementation.getCurrentActivityName()

    override fun clear() {
        implementation.clear()
    }

    override fun close(data: ReadableMap?) {
        implementation.close(data)
    }

    override fun getSharedData(promise: Promise?) {
        implementation.getSharedData(promise)
    }

    override fun sendDraftUpdate(draft: ReadableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onDraftUpdated", draft)
    }

    @com.facebook.react.bridge.ReactMethod
    fun addListener(eventName: String) {
        //No-op: Required for RN  built-in emitters
    }

    @com.facebook.react.bridge.ReactMethod
    fun removeListeners(count: Int) {
        //No-op: Required for RN  built-in emitters
    }
}
