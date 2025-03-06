package com.mattermost.hardware.keyboard

import android.view.KeyEvent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap

class MattermostHardwareKeyboardImpl(reactApplicationContext: ReactApplicationContext) {
    companion object {
        const val NAME = "MattermostHardwareKeyboard"
        private lateinit var context: ReactApplicationContext

        fun setCtx(ctx: ReactApplicationContext) {
            context = ctx
        }

        fun dispatchKeyEvent(event: KeyEvent): Boolean {
            val keyCode = event.keyCode
            val keyAction = event.action
            if (keyAction == KeyEvent.ACTION_UP) {
                if (keyCode == KeyEvent.KEYCODE_ENTER) {
                    val keyPressed = if (event.isShiftPressed) "shift-enter" else "enter"
                    sendEvent(keyPressed)
                    return true
                } else if (keyCode == KeyEvent.KEYCODE_K && event.isCtrlPressed) {
                    sendEvent("find-channels")
                    return true
                }
            }

            return false
        }

        private fun sendEvent(action: String) {
            if (!this::context.isInitialized) {
                return
            }

            if (context.hasActiveReactInstance()) {
                val result: WritableMap = WritableNativeMap()
                result.putString("action", action)
                context.emitDeviceEvent("mmHardwareKeyboardEvent", result)
            }
        }
    }

    init {
        setCtx(reactApplicationContext)
    }
}
