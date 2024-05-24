package com.mattermostshare

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.mattermost.rnshare.MattermostShareImpl
import com.mattermost.rnshare.NativeMattermostShareSpec

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
