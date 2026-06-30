package com.mattermost.callsnative

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap

/**
 * Android implementation backing the JS-side TurboModule. The call-UI
 * methods (reportOutgoingCall etc.) are no-ops in Phase 1; Telecom /
 * ConnectionService integration lands in Phase 2.
 */
class MMCallsNativeModuleImpl(private val context: ReactApplicationContext) {
    companion object {
        const val NAME = "MMCallsNative"
        private const val NOT_IMPLEMENTED = "android_not_implemented"
        private const val MESSAGE = "@mattermost/calls-native call UI is iOS-only in Phase 1"
    }

    fun reportOutgoingCall(promise: Promise?) {
        promise?.reject(NOT_IMPLEMENTED, MESSAGE)
    }

    fun reportConnected(promise: Promise?) {
        promise?.reject(NOT_IMPLEMENTED, MESSAGE)
    }

    fun reportEnded(promise: Promise?) {
        promise?.reject(NOT_IMPLEMENTED, MESSAGE)
    }

    fun setMuted(promise: Promise?) {
        promise?.reject(NOT_IMPLEMENTED, MESSAGE)
    }

    fun foregroundServiceStart(config: ReadableMap?) {
        if (config == null) {
            return
        }
        val intent = Intent(context, MMCallsForegroundService::class.java).apply {
            putExtra(MMCallsForegroundService.EXTRA_CHANNEL_ID, config.getString("channelId"))
            putExtra(MMCallsForegroundService.EXTRA_CHANNEL_NAME, config.getString("channelName"))
            putExtra(MMCallsForegroundService.EXTRA_CHANNEL_DESCRIPTION, config.getString("channelDescription"))
            putExtra(MMCallsForegroundService.EXTRA_TITLE, config.getString("title"))
            putExtra(MMCallsForegroundService.EXTRA_TEXT, config.getString("text"))
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    fun foregroundServiceStop() {
        context.stopService(Intent(context, MMCallsForegroundService::class.java))
    }
}