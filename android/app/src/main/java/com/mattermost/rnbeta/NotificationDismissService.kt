package com.mattermost.rnbeta

import android.app.IntentService
import android.content.Context
import android.content.Intent
import android.util.Log
import com.wix.reactnativenotifications.core.NotificationIntentAdapter

class NotificationDismissService : IntentService("notificationDismissService") {
    private var mContext: Context? = null
    override fun onHandleIntent(intent: Intent) {
        mContext = applicationContext
        val bundle = NotificationIntentAdapter.extractPendingNotificationDataFromIntent(intent)
        val notificationId = intent.getIntExtra(CustomPushNotification.NOTIFICATION_ID, -1)
        val channelId = bundle.getString("channel_id")
        CustomPushNotification.clearNotification(mContext, notificationId, channelId)
        Log.i("ReactNative", "Dismiss notification")
    }
}
