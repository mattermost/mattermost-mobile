package com.mattermost.hardware.keyboard

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class MattermostHardwareKeyboardModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private val impl = MattermostHardwareKeyboardImpl(context)

    override fun getName() = MattermostHardwareKeyboardImpl.NAME

    @ReactMethod
    fun addListener(eventName: String) {
        // Keep: Required for RN built in Event Emitter Calls
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Keep: Required for RN built in Event Emitter Calls
    }
}
