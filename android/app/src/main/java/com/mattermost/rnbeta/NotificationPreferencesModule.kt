package com.mattermost.rnbeta

import android.app.NotificationManager
import android.content.Context
import android.media.RingtoneManager
import android.net.Uri
import com.facebook.react.bridge.*
import com.mattermost.rnbeta.NotificationPreferences.Companion.getInstance

class NotificationPreferencesModule private constructor(application: com.mattermost.rnbeta.MainApplication, reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val mApplication: com.mattermost.rnbeta.MainApplication
    private val mNotificationPreference: NotificationPreferences?
    override fun getName(): String = "NotificationPreferences"

    @ReactMethod
    fun getPreferences(promise: Promise) {
        try {
            val context: Context = mApplication.getApplicationContext()
            val manager = RingtoneManager(context)
            manager.setType(RingtoneManager.TYPE_NOTIFICATION)
            val cursor = manager.cursor
            val result = Arguments.createMap()
            val sounds = Arguments.createArray()
            while (cursor.moveToNext()) {
                val notificationTitle = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX)
                val notificationId = cursor.getString(RingtoneManager.ID_COLUMN_INDEX)
                val notificationUri = cursor.getString(RingtoneManager.URI_COLUMN_INDEX)
                val map = Arguments.createMap()
                map.putString("name", notificationTitle)
                map.putString("uri", "$notificationUri/$notificationId")
                sounds.pushMap(map)
            }
            val defaultUri = RingtoneManager.getActualDefaultRingtoneUri(context, RingtoneManager.TYPE_NOTIFICATION)
            if (defaultUri != null) {
                result.putString("defaultUri", Uri.decode(defaultUri.toString()))
            }
            result.putString("selectedUri", mNotificationPreference!!.notificationSound)
            result.putBoolean("shouldVibrate", mNotificationPreference.shouldVibrate)
            result.putBoolean("shouldBlink", mNotificationPreference.shouldBlink)
            result.putArray("sounds", sounds)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("no notification sounds found", e)
        }
    }

    @ReactMethod
    fun previewSound(url: String?) {
        val context: Context = mApplication.getApplicationContext()
        val uri = Uri.parse(url)
        val r = RingtoneManager.getRingtone(context, uri)
        r.play()
    }

    @ReactMethod
    fun setNotificationSound(soundUri: String?) {
        mNotificationPreference!!.notificationSound = soundUri
    }

    @ReactMethod
    fun setShouldVibrate(vibrate: Boolean) {
        mNotificationPreference!!.shouldVibrate = vibrate
    }

    @ReactMethod
    fun setShouldBlink(blink: Boolean) {
        mNotificationPreference!!.shouldBlink = blink
    }

    @ReactMethod
    fun getDeliveredNotifications(promise: Promise) {
        val context: Context = mApplication.getApplicationContext()
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val statusBarNotifications = notificationManager.activeNotifications
        val result = Arguments.createArray()
        for (sbn in statusBarNotifications) {
            val map = Arguments.createMap()
            val n = sbn.notification
            val bundle = n.extras
            val identifier = sbn.id
            val channelId = bundle.getString("channel_id")
            map.putInt("identifier", identifier)
            map.putString("channel_id", channelId)
            result.pushMap(map)
        }
        promise.resolve(result)
    }

    @ReactMethod
    fun removeDeliveredNotifications(identifier: Int, channelId: String?) {
        val context: Context = mApplication.getApplicationContext()
        CustomPushNotification.clearNotification(context, identifier, channelId)
    }

    companion object {
        var instance: NotificationPreferencesModule? = null
            private set

        @JvmStatic
        fun getInstance(application: com.mattermost.rnbeta.MainApplication, reactContext: ReactApplicationContext): NotificationPreferencesModule? {
            if (instance == null) {
                instance = NotificationPreferencesModule(application, reactContext)
            }
            return instance
        }

    }

    init {
        mApplication = application
        val context: Context = mApplication.getApplicationContext()
        mNotificationPreference = getInstance(context)
    }
}
