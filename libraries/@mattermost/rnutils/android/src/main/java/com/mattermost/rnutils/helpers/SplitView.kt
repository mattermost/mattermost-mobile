package com.mattermost.rnutils.helpers

import android.content.Context
import android.content.res.Configuration
import android.telephony.TelephonyManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.mattermost.rnutils.RNUtilsModuleImpl
import com.mattermost.rnutils.enums.Events

class SplitView {
    companion object {
        private var context: ReactApplicationContext? = null

        fun setCtx(reactContext: ReactApplicationContext) {
            context = reactContext
        }

        private fun isTablet(): Boolean {
            if (context == null) {
                return false
            }
            val configuration = context!!.resources.configuration
            val screenLayout = configuration.screenLayout and Configuration.SCREENLAYOUT_SIZE_MASK
            val smallestScreenWidthDp = configuration.smallestScreenWidthDp
            val telephonyManager = context!!.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager

            val isLargeScreen = screenLayout >= Configuration.SCREENLAYOUT_SIZE_LARGE
            val isSmallestWidthLarge = smallestScreenWidthDp >= 600
            val isNotPhone = telephonyManager.phoneType == TelephonyManager.PHONE_TYPE_NONE

            return isLargeScreen || isSmallestWidthLarge || isNotPhone
        }

        fun setDeviceFolded() {
            val map = getSplitViewResults(FoldableObserver.getInstance()?.isDeviceFolded == true)
            RNUtilsModuleImpl.sendJSEvent(Events.SPLIT_VIEW_CHANGED.event, map)
        }

        private fun getSplitViewResults(folded: Boolean): WritableMap? {
            if (context?.currentActivity != null) {
                val map = Arguments.createMap()
                var isSplitView = folded
                if (context?.currentActivity?.isInMultiWindowMode == true) {
                    isSplitView = FoldableObserver.getInstance()?.isCompactView() == true
                }
                map.putBoolean("isSplit", isSplitView)
                map.putBoolean("isTablet", isTablet())
                return map
            }

            return null
        }

        fun isRunningInSplitView(): WritableMap? {
            return getSplitViewResults(FoldableObserver.getInstance()?.isDeviceFolded == true)
        }

        fun getWindowDimensions(): WritableMap? {
            if (context?.currentActivity != null) {
                val map = Arguments.createMap()
                val bounds = FoldableObserver.getInstance()?.getWindowDimensions()
                if (bounds != null) {
                    map.putInt("width", bounds.width())
                    map.putInt("height", bounds.height())
                } else {
                    map.putInt("width", 0)
                    map.putInt("height", 0)
                }

                return map
            }

            return null
        }

        fun emitDimensionsChanged() {
            val map = getWindowDimensions()
            RNUtilsModuleImpl.sendJSEvent(Events.DIMENSIONS_CHANGED.event, map)
        }
    }
}
