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

    fun sendEvent(eventName: String,
                  params: WritableMap?) {
        reactContext
                .getJSModule(RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
    }

    private fun getSplitViewResults() : WritableMap? {
        if (currentActivity != null) {
            val deviceResolver = DeviceTypeResolver(this.reactContext)
            val map = Arguments.createMap()
            map.putBoolean("isSplitView", currentActivity!!.isInMultiWindowMode || isDeviceFolded)
            map.putBoolean("isTablet", deviceResolver.isTablet)
            return map
        }

        return null
    }

    fun setDeviceFolded(folded: Boolean) {
        isDeviceFolded = folded
        val map = getSplitViewResults()
        if (listenerCount > 0) {
            sendEvent("SplitViewChanged", map)
        }
    }

    @ReactMethod
    fun isRunningInSplitView(promise: Promise) {
        promise.resolve(getSplitViewResults())
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
