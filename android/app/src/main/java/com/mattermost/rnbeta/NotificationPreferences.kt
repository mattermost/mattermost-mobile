package com.mattermost.rnbeta

import android.content.Context
import android.content.SharedPreferences

class NotificationPreferences private constructor(context: Context) {
    val SHARED_NAME = "NotificationPreferences"
    val SOUND_PREF = "NotificationSound"
    val VIBRATE_PREF = "NotificationVibrate"
    val BLINK_PREF = "NotificationLights"
    private val mSharedPreferences: SharedPreferences
    var notificationSound: String?
        get() = mSharedPreferences.getString(SOUND_PREF, null)
        set(soundUri) {
            val editor = mSharedPreferences.edit()
            editor.putString(SOUND_PREF, soundUri)
            editor.commit()
        }

    var shouldVibrate: Boolean
        get() = mSharedPreferences.getBoolean(VIBRATE_PREF, true)
        set(vibrate) {
            val editor = mSharedPreferences.edit()
            editor.putBoolean(VIBRATE_PREF, vibrate)
            editor.commit()
        }

    var shouldBlink: Boolean
        get() = mSharedPreferences.getBoolean(BLINK_PREF, false)
        set(blink) {
            val editor = mSharedPreferences.edit()
            editor.putBoolean(BLINK_PREF, blink)
            editor.commit()
        }

    companion object {
        private var instance: NotificationPreferences? = null
        @JvmStatic
        fun getInstance(context: Context): NotificationPreferences? {
            if (instance == null) {
                instance = NotificationPreferences(context)
            }
            return instance
        }
    }

    init {
        mSharedPreferences = context.getSharedPreferences(SHARED_NAME, Context.MODE_PRIVATE)
    }
}
