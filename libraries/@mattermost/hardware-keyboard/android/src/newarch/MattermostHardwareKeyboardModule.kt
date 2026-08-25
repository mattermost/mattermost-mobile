package com.mattermost.hardware.keyboard

import com.facebook.react.bridge.ReactApplicationContext
import com.mattermost.hardwarekeyboard.NativeMattermostHardwareKeyboardSpec

class MattermostHardwareKeyboardModule(context: ReactApplicationContext) : NativeMattermostHardwareKeyboardSpec(context) {
    private val impl = MattermostHardwareKeyboardImpl(context)

    override fun addListener(eventType: String?) {
        // Keep: Required for RN built in Event Emitter Calls
    }

    override fun removeListeners(count: Double) {
        // Keep: Required for RN built in Event Emitter Calls
    }
}
