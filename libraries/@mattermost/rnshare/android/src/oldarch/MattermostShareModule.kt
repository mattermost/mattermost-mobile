package com.mattermost.rnshare

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

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
}
