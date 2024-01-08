package com.mattermost.rnbeta

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.learnium.RNDeviceInfo.resolver.DeviceTypeResolver

class SplitViewModule(private var reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
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
            var isSplitView = folded;
            if (currentActivity?.isInMultiWindowMode == true) {
                isSplitView = FoldableObserver.getInstance()?.isCompactView() == true
            }
            map.putBoolean("isSplitView", isSplitView)
            map.putBoolean("isTablet", deviceResolver.isTablet)
            return map
        }

        return null
    }

    fun setDeviceFolded() {
        val map = getSplitViewResults(FoldableObserver.getInstance()?.isDeviceFolded == true)
        if (listenerCount > 0) {
            sendEvent(map)
        }
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun isRunningInSplitView(): WritableMap? {
        return getSplitViewResults(FoldableObserver.getInstance()?.isDeviceFolded == true)
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
