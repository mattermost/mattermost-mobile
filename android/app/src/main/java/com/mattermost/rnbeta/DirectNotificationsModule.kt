package com.mattermost.rnbeta

import android.content.Intent
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DirectNotificationsModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    companion object {
        const val NAME = "ENCMADirectNotifications"
    }

    private val applicationContext = reactContext.applicationContext

    override fun getName(): String = NAME

    @ReactMethod
    fun setMode(serverUrl: String, mode: String, promise: Promise) {
        try {
            DirectNotificationStore.setMode(applicationContext, serverUrl, mode)
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("E_DIRECT_NOTIFICATION_MODE", error.message, error)
        }
    }

    @ReactMethod
    fun removeServer(serverUrl: String, promise: Promise) {
        try {
            DirectNotificationStore.removeServer(applicationContext, serverUrl)
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("E_DIRECT_NOTIFICATION_MODE", error.message, error)
        }
    }

    @ReactMethod
    fun startService(title: String, text: String, promise: Promise) {
        try {
            val intent = Intent(applicationContext, DirectNotificationsService::class.java).apply {
                action = DirectNotificationsService.ACTION_START
                putExtra(DirectNotificationsService.EXTRA_TITLE, title)
                putExtra(DirectNotificationsService.EXTRA_TEXT, text)
            }
            ContextCompat.startForegroundService(applicationContext, intent)
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("E_DIRECT_NOTIFICATION_SERVICE", error.message, error)
        }
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            val intent = Intent(applicationContext, DirectNotificationsService::class.java).apply {
                action = DirectNotificationsService.ACTION_STOP
            }
            applicationContext.stopService(intent)
            promise.resolve(null)
        } catch (error: Exception) {
            promise.reject("E_DIRECT_NOTIFICATION_SERVICE", error.message, error)
        }
    }
}
