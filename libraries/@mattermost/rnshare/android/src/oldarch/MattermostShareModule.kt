package com.mattermost.rnshare

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule

@ReactModule(name = MattermostShareImpl.NAME)
class MattermostShareModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val implementation = MattermostShareImpl(reactContext)

    override fun getName(): String = MattermostShareImpl.NAME

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getCurrentActivityName(): String = implementation.getCurrentActivityName()

    @ReactMethod
    fun clear() {
        implementation.clear()
    }

    @ReactMethod
    fun close(data: ReadableMap?) {
        implementation.close(data)
    }

    @ReactMethod
    fun getSharedData(promise: Promise?) {
        implementation.getSharedData(promise)
    }

    fun sendDraftUpdate(draft: WritableNativeMap) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onDraftUpdated", draft)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        //No-op: Required for RN  built-in emitters
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        //No-op: Required for RN  built-in emitters
    }
}
