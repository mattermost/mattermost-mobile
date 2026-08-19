package com.mattermost.callsnative

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * Keeps the microphone alive while the user is in a Mattermost call and the
 * app is in the background. Android requires any process holding the mic in
 * background to run inside a foreground service with FOREGROUND_SERVICE_MICROPHONE
 * type since API 34.
 *
 * Title/body/channel strings come from the JS layer via the Intent extras
 * below — keeps i18n in one place.
 */
class MMCallsForegroundService : Service() {
    companion object {
        const val NOTIFICATION_ID = 345678

        const val EXTRA_CHANNEL_ID = "channelId"
        const val EXTRA_CHANNEL_NAME = "channelName"
        const val EXTRA_CHANNEL_DESCRIPTION = "channelDescription"
        const val EXTRA_TITLE = "title"
        const val EXTRA_TEXT = "text"
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val channelId = intent?.getStringExtra(EXTRA_CHANNEL_ID) ?: "calls_channel"
        val channelName = intent?.getStringExtra(EXTRA_CHANNEL_NAME) ?: "Mattermost"
        val channelDescription = intent?.getStringExtra(EXTRA_CHANNEL_DESCRIPTION) ?: ""
        val title = intent?.getStringExtra(EXTRA_TITLE) ?: "Mattermost"
        val text = intent?.getStringExtra(EXTRA_TEXT) ?: ""

        ensureChannel(channelId, channelName, channelDescription)

        val notification = buildNotification(channelId, title, text)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
        return START_NOT_STICKY
    }

    private fun ensureChannel(channelId: String, channelName: String, description: String) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val existing = manager.getNotificationChannel(channelId)
        if (existing == null) {
            val channel = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_LOW).apply {
                this.description = description
                enableVibration(false)
                setSound(null, null)
            }
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(channelId: String, title: String, text: String): Notification {
        val builder = NotificationCompat.Builder(this, channelId)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(appLauncherIcon())
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_CALL)
        return builder.build()
    }

    private fun appLauncherIcon(): Int {
        val info = packageManager.getApplicationInfo(packageName, PackageManager.GET_META_DATA)
        return info.icon
    }
}
