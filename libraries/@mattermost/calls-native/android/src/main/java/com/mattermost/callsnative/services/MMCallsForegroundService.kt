package com.mattermost.callsnative.services

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import androidx.core.graphics.drawable.IconCompat
import androidx.core.net.toUri
import com.mattermost.callsnative.R
import com.mattermost.callsnative.receivers.AnswerReceiver
import com.mattermost.callsnative.ui.CallActivity
import com.mattermost.callsnative.managers.CallRegistry
import com.mattermost.callsnative.receivers.DeclineReceiver
import com.mattermost.callsnative.receivers.HangupReceiver
import com.mattermost.callsnative.utils.HostAppIcons
import com.mattermost.callsnative.receivers.MuteReceiver
import com.mattermost.callsnative.utils.TurboLogger

/**
 * Owns the CallStyle notification that gives the user lock-screen / heads-up
 * call UI, AND keeps the microphone alive while a call is in progress and the
 * app is backgrounded. Android forces both responsibilities into the same
 * notification: a `CallStyle` notification must be either posted by a
 * foreground service or carry a fullScreenIntent.
 */
class MMCallsForegroundService : Service() {
    companion object {
        private const val TAG = "MMCalls/MMCallsForegroundService"
        private const val NOTIFICATION_ID = 345678
        private const val CHANNEL_ID = "calls"
        private const val CHANNEL_NAME = "Calls"
        private const val RING_CHANNEL_ID = "calls_incoming"
        private const val RING_CHANNEL_NAME = "Incoming calls"
        private const val ACTION_START = "com.mattermost.callsnative.action.START_CALL"
        private const val ACTION_REFRESH = "com.mattermost.callsnative.action.REFRESH"
        private const val ACTION_RING = "com.mattermost.callsnative.action.RING"
        private const val EXTRA_UUID = "com.mattermost.callsnative.extra.UUID"
        private const val EXTRA_CALLEE_NAME = "com.mattermost.callsnative.extra.CALLEE_NAME"

        fun start(context: Context, uuid: String, calleeName: String) {
            val intent = Intent(context, MMCallsForegroundService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_UUID, uuid)
                putExtra(EXTRA_CALLEE_NAME, calleeName)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun ring(context: Context, uuid: String, callerName: String) {
            val intent = Intent(context, MMCallsForegroundService::class.java).apply {
                action = ACTION_RING
                putExtra(EXTRA_UUID, uuid)
                putExtra(EXTRA_CALLEE_NAME, callerName)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun refresh(context: Context, uuid: String) {
            val intent = Intent(context, MMCallsForegroundService::class.java).apply {
                action = ACTION_REFRESH
                putExtra(EXTRA_UUID, uuid)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, MMCallsForegroundService::class.java))
        }
    }

    private var ringtone: android.media.Ringtone? = null
    private var vibrator: android.os.Vibrator? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        ensureChannels()

        val uuid = intent?.getStringExtra(EXTRA_UUID).orEmpty()
        if (uuid.isEmpty()) {
            TurboLogger.w(TAG, "start without uuid — stopping")
            stopSelf()
            return START_NOT_STICKY
        }

        val handle = CallRegistry.get(uuid)
        if (intent?.action == ACTION_START || intent?.action == ACTION_RING) {
            val name = intent.getStringExtra(EXTRA_CALLEE_NAME).orEmpty()
            handle?.displayName = name
        }
        val displayName = handle?.displayName.orEmpty()
        val muted = handle?.muted ?: false
        val direction = handle?.direction ?: CallRegistry.Direction.Outgoing

        val isRinging = intent?.action == ACTION_RING ||
            (direction == CallRegistry.Direction.Incoming && !CallRegistry.isAnswered(uuid))
        val notification = if (isRinging) {
            buildIncomingNotification(uuid, displayName)
        } else {
            buildOngoingNotification(uuid, displayName, muted)
        }

        if (isRinging) {
            startRingerAndVibration()
        } else {
            stopRingerAndVibration()
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // phoneCall: CallStyle prominence, no mic-service timeout.
            // MICROPHONE: Core-Telecom doesn't capture mic for us — RTC does.
            val type = ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL or
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            startForeground(NOTIFICATION_ID, notification, type)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
        return START_NOT_STICKY
    }

    @SuppressLint("FullScreenIntentPolicy")
    private fun buildIncomingNotification(uuid: String, callerName: String): Notification {
        val displayName = callerName.ifBlank {
            getString(R.string.mobile_android_calls_incoming_call_placeholder)
                .replace("{applicationName}", HostAppIcons.appLabel(this))
        }
        val avatar = CallRegistry.get(uuid)?.avatar
        val icon = if (avatar != null) {
            IconCompat.createWithBitmap(avatar)
        } else {
            IconCompat.createWithResource(this, HostAppIcons.launcher(this))
        }
        val caller = Person.Builder()
            .setName(displayName)
            .setIcon(icon)
            .setImportant(true)
            .build()

        val builder = NotificationCompat.Builder(this, RING_CHANNEL_ID)
            .setSmallIcon(HostAppIcons.notificationSmall(this))
            .setContentTitle(displayName)
            .setContentText(getString(R.string.mobile_android_calls_incoming_voice_call))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(openCallScreenIntent(uuid))
            .setStyle(
                NotificationCompat.CallStyle.forIncomingCall(
                    caller,
                    declinePendingIntent(uuid),
                    answerPendingIntent(uuid),
                )
            )

        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        // canUseFullScreenIntent() exists on Android 14+; below that the
        // capability is implicit when the permission is declared.
        val canFsi = Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE ||
            nm.canUseFullScreenIntent()
        if (canFsi) {
            builder.setFullScreenIntent(fullScreenIntent(uuid), true)
        }

        return builder.build()
    }

    private fun answerPendingIntent(uuid: String): PendingIntent {
        val intent = Intent(this, AnswerReceiver::class.java).apply {
            action = AnswerReceiver.ACTION
            data = "mattermost-calls://answer/$uuid".toUri()
            putExtra(AnswerReceiver.EXTRA_UUID, uuid)
        }
        return PendingIntent.getBroadcast(
            this,
            uuid.hashCode() + 4,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun declinePendingIntent(uuid: String): PendingIntent {
        val intent = Intent(this, DeclineReceiver::class.java).apply {
            action = DeclineReceiver.ACTION
            data = "mattermost-calls://decline/$uuid".toUri()
            putExtra(DeclineReceiver.EXTRA_UUID, uuid)
        }
        return PendingIntent.getBroadcast(
            this,
            uuid.hashCode() + 5,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun fullScreenIntent(uuid: String): PendingIntent {
        val intent = Intent(this, CallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            data = "mattermost-calls://ring/$uuid".toUri()
            putExtra(CallActivity.EXTRA_UUID, uuid)
        }
        return PendingIntent.getActivity(
            this,
            uuid.hashCode() + 6,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun buildOngoingNotification(uuid: String, calleeName: String, muted: Boolean): Notification {
        val displayName = calleeName.ifBlank {
            getString(R.string.mobile_android_calls_incoming_call_placeholder)
                .replace("{applicationName}", HostAppIcons.appLabel(this))
        }
        val avatar = CallRegistry.get(uuid)?.avatar
        val icon = if (avatar != null) {
            IconCompat.createWithBitmap(avatar)
        } else {
            IconCompat.createWithResource(this, HostAppIcons.launcher(this))
        }
        val caller = Person.Builder()
            .setName(displayName)
            .setIcon(icon)
            .setImportant(true)
            .build()

        val muteIcon = if (muted) {
            android.R.drawable.ic_lock_silent_mode_off
        } else {
            android.R.drawable.ic_lock_silent_mode
        }

        val muteLabel = if (muted) {
            getString(R.string.mobile_android_calls_unmute)
        } else {
            getString(R.string.mobile_android_calls_mute)
        }

        val contentText = if (muted) {
            getString(R.string.mobile_android_calls_ongoing_muted)
        } else {
            getString(R.string.mobile_android_calls_ongoing)
        }

        val muteAction = NotificationCompat.Action.Builder(
            IconCompat.createWithResource(this, muteIcon),
            muteLabel,
            muteTogglePendingIntent(uuid, !muted),
        ).build()

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(HostAppIcons.notificationSmall(this))
            .setContentTitle(displayName)
            .setContentText(contentText)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setUsesChronometer(true)
            .setWhen(System.currentTimeMillis())
            .setContentIntent(openCallScreenIntent(uuid))
            .setSilent(true)
            .setOnlyAlertOnce(true)
            .setStyle(
                NotificationCompat.CallStyle.forOngoingCall(
                    caller,
                    hangupPendingIntent(uuid),
                )
            )
            .addAction(muteAction)
            .build()
    }

    private fun muteTogglePendingIntent(uuid: String, targetMuted: Boolean): PendingIntent {
        val intent = Intent(this, MuteReceiver::class.java).apply {
            action = MuteReceiver.ACTION
            data = "mattermost-calls://mute/$uuid/$targetMuted".toUri()
            putExtra(MuteReceiver.EXTRA_UUID, uuid)
            putExtra(MuteReceiver.EXTRA_MUTED, targetMuted)
        }
        return PendingIntent.getBroadcast(
            this,
            uuid.hashCode() + (if (targetMuted) 2 else 3),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun openCallScreenIntent(uuid: String): PendingIntent {
        val intent = Intent(this, CallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(CallActivity.EXTRA_UUID, uuid)
        }
        return PendingIntent.getActivity(
            this,
            uuid.hashCode() + 1,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun hangupPendingIntent(uuid: String): PendingIntent {
        val intent = Intent(this, HangupReceiver::class.java).apply {
            action = HangupReceiver.HANGUP_ACTION
            data = "mattermost-calls://hangup/$uuid".toUri()
            putExtra(HangupReceiver.HANGUP_UUID_EXTRA, uuid)
        }
        return PendingIntent.getBroadcast(
            this,
            uuid.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun startRingerAndVibration() {
        if (ringtone?.isPlaying == true) return
        try {
            val uri = android.media.RingtoneManager.getDefaultUri(
                android.media.RingtoneManager.TYPE_RINGTONE,
            )
            ringtone = android.media.RingtoneManager.getRingtone(applicationContext, uri)?.also {
                it.audioAttributes = android.media.AudioAttributes.Builder()
                    .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    it.isLooping = true
                }
                it.play()
            }
        } catch (e: Exception) {
            TurboLogger.w(TAG, "ringer failed: ${e.message}")
        }

        try {
            vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = getSystemService(VIBRATOR_MANAGER_SERVICE) as android.os.VibratorManager
                vm.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(VIBRATOR_SERVICE) as android.os.Vibrator
            }
            val pattern = longArrayOf(0L, 1000L, 1000L)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(android.os.VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(pattern, 0)
            }
        } catch (e: Exception) {
            TurboLogger.w(TAG, "vibration failed: ${e.message}")
        }
    }

    private fun stopRingerAndVibration() {
        try { ringtone?.stop() } catch (_: Exception) {}
        ringtone = null
        try { vibrator?.cancel() } catch (_: Exception) {}
        vibrator = null
    }

    override fun onDestroy() {
        stopRingerAndVibration()
        super.onDestroy()
    }

    private fun ensureChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager

        // Ongoing-call channel — silent. Notification rebuilds (mute toggles
        // etc.) must not re-alert the user.
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Active Mattermost calls"
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                enableVibration(false)
                setSound(null, null)
            }
            manager.createNotificationChannel(channel)
        }

        if (manager.getNotificationChannel(RING_CHANNEL_ID) == null) {
            val channel = NotificationChannel(RING_CHANNEL_ID, RING_CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Incoming Mattermost calls"
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                enableVibration(false)
                setSound(null, null)
            }
            manager.createNotificationChannel(channel)
        }
    }
}
