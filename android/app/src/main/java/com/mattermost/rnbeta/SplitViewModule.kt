package com.mattermost.rnbeta

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.learnium.RNDeviceInfo.resolver.DeviceTypeResolver

class SplitViewModule(private var reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var isDeviceFolded: Boolean = false
    private var listenerCount = 0

    companion object {
        private var instance: SplitViewModule? = null

        fun getInstance(reactContext: ReactApplicationContext): SplitViewModule {
            if (instance == null) {
                instance = SplitViewModule(reactContext)
            } else {
                instance!!.reactContext = reactContext
            }

            return instance!!
        }

        fun getInstance(): SplitViewModule? {
            return instance
        }
    }


    override fun getName() = "SplitView"

    private fun sendEvent(params: WritableMap?) {
        reactContext
                .getJSModule(RCTDeviceEventEmitter::class.java)
                .emit("SplitViewChanged", params)
    }

    private fun getSplitViewResults(folded: Boolean) : WritableMap? {
        if (currentActivity != null) {
            val deviceResolver = DeviceTypeResolver(this.reactContext)
            val map = Arguments.createMap()
            map.putBoolean("isSplitView", currentActivity!!.isInMultiWindowMode || folded)
            map.putBoolean("isTablet", deviceResolver.isTablet)
            return map
        }

        return null
    }

    fun setDeviceFolded(folded: Boolean) {
        val map = getSplitViewResults(folded)
        if (listenerCount > 0 && isDeviceFolded != folded) {
            sendEvent(map)
        }
        isDeviceFolded = folded
    }

    @ReactMethod
    fun isRunningInSplitView(promise: Promise) {
        promise.resolve(getSplitViewResults(isDeviceFolded))
    }

    @ReactMethod
    fun addListener(eventName: String) {
        listenerCount += 1
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        listenerCount -= count
    }
}
