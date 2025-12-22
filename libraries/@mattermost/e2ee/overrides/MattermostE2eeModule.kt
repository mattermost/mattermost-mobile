// Old Architecture override for uniffi-bindgen-react-native generated code
package com.mattermost.e2ee

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.turbomodule.core.interfaces.CallInvokerHolder

@ReactModule(name = MattermostE2eeModule.NAME)
class MattermostE2eeModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return NAME
  }

  // Two native methods implemented in cpp-adapter.cpp, and ultimately
  // mattermost-e2ee.cpp

  external fun nativeInstallRustCrate(runtimePointer: Long, callInvoker: CallInvokerHolder): Boolean
  external fun nativeCleanupRustCrate(runtimePointer: Long): Boolean

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun installRustCrate(): Boolean {
    return nativeInstallRustCrate(
      reactContext.javaScriptContextHolder!!.get(),
      reactContext.jsCallInvokerHolder!!
    )
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun cleanupRustCrate(): Boolean {
    return nativeCleanupRustCrate(
      reactContext.javaScriptContextHolder!!.get()
    )
  }

  companion object {
    const val NAME = "MattermostE2ee"

    init {
      System.loadLibrary("mattermost-e2ee")
    }
  }
}
