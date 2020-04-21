package com.mattermost.rnbeta

import android.content.Context
import android.view.inputmethod.InputMethodManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.UIManagerModule

class RNTextInputResetModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "RNTextInputReset"

    // https://github.com/facebook/react-native/pull/12462#issuecomment-298812731
    @ReactMethod
    fun resetKeyboardInput(reactTagToReset: Int) {
        val uiManager = reactApplicationContext.getNativeModule(UIManagerModule::class.java)
        uiManager.addUIBlock { nativeViewHierarchyManager ->
            val imm = reactApplicationContext.baseContext.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
            val viewToReset = nativeViewHierarchyManager.resolveView(reactTagToReset)
            imm.restartInput(viewToReset)
        }
    }
}
