package com.mattermost.rnshare

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
}
