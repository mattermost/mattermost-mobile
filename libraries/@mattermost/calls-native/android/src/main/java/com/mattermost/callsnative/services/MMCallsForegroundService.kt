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
        private const val CHANNEL_ID = "calls"
        private const val CHANNEL_NAME = "Calls"
        private const val RING_CHANNEL_ID = "calls_incoming"
        private const val RING_CHANNEL_NAME = "Incoming calls"
        private const val ACTION_START = "com.mattermost.callsnative.action.START_CALL"
        private const val ACTION_REFRESH = "com.mattermost.callsnative.action.REFRESH"
        private const val ACTION_RING = "com.mattermost.callsnative.action.RING"
        private const val ACTION_STOP = "com.mattermost.callsnative.action.STOP"
        private const val EXTRA_UUID = "com.mattermost.callsnative.extra.UUID"
        private const val EXTRA_CALLEE_NAME = "com.mattermost.callsnative.extra.CALLEE_NAME"

        // Positive Int derived from the uuid. NotificationManager rejects negatives on some OEMs.
        internal fun notificationIdFor(uuid: String): Int = uuid.hashCode() and 0x7FFFFFFF

        fun start(context: Context, uuid: String, calleeName: String) =
            startServiceWith(context, ACTION_START, uuid, calleeName)

        fun ring(context: Context, uuid: String, callerName: String) =
            startServiceWith(context, ACTION_RING, uuid, callerName)

        fun refresh(context: Context, uuid: String) =
            startServiceWith(context, ACTION_REFRESH, uuid, null)

        fun stop(context: Context, uuid: String) =
            startServiceWith(context, ACTION_STOP, uuid, null)

        private fun startServiceWith(context: Context, action: String, uuid: String, name: String?) {
            val intent = Intent(context, MMCallsForegroundService::class.java).apply {
                this.action = action
                putExtra(EXTRA_UUID, uuid)
                if (name != null) putExtra(EXTRA_CALLEE_NAME, name)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }

    private var ringtone: android.media.Ringtone? = null
    private var vibrator: android.os.Vibrator? = null
    private var toneGen: android.media.ToneGenerator? = null
    private val toneHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private val toneLoop: Runnable = object : Runnable {
        override fun run() {
            try { toneGen?.startTone(android.media.ToneGenerator.TONE_SUP_CALL_WAITING, 300) } catch (_: Exception) {}
            toneHandler.postDelayed(this, 5000L)
        }
    }
    private var callWaitingUuid: String? = null
    // The uuid currently promoted to the FGS notification. Android only allows
    // one foreground notification per service; secondaries are posted via
    // NotificationManager.notify with their own ids.
    private var primaryUuid: String? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        ensureChannels()

        val uuid = intent?.getStringExtra(EXTRA_UUID).orEmpty()
        if (uuid.isEmpty()) {
            stopSelf()
            return START_NOT_STICKY
        }

        if (intent?.action == ACTION_STOP) {
            handleStop(uuid)
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

        val isSecondaryRing = isRinging && primaryUuid != null && uuid != primaryUuid
        if (isRinging && primaryUuid == null) {
            startRingerAndVibration()
        } else if (isSecondaryRing) {
            startCallWaitingTone(uuid)
        } else if (!isRinging && uuid == primaryUuid) {
            stopRingerAndVibration()
        }
        // If a secondary stops ringing (answered, declined, timed out), kill the tone.
        if (!isRinging && uuid == callWaitingUuid) {
            stopCallWaitingTone()
        }

        // Secondary call just got answered → it owns the audio focus now,
        // swap it in as primary immediately. The old primary remains visible
        // (re-posted as a standalone notification) until JS tears it down via
        // leaveCall; this avoids the "stale primary visible alongside the
        // call you just answered" window.
        val isSecondaryAnswered = !isRinging &&
            primaryUuid != null && uuid != primaryUuid &&
            CallRegistry.isAnswered(uuid)
        if (isSecondaryAnswered) {
            swapPrimary(newPrimary = uuid, newPrimaryNotification = notification)
            return START_NOT_STICKY
        }

        if (primaryUuid == null || uuid == primaryUuid) {
            primaryUuid = uuid
            promoteToForeground(uuid, notification)
        } else {
            val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            nm.notify(notificationIdFor(uuid), notification)
        }
        return START_NOT_STICKY
    }

    // Promotes a new primary while preserving the old primary's notification
    // as a standalone (it stays visible until JS tears it down).
    private fun swapPrimary(newPrimary: String, newPrimaryNotification: Notification) {
        val oldPrimary = primaryUuid ?: return
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        val oldHandle = CallRegistry.get(oldPrimary)
        // CallStyle notifications must be FGS-hosted OR carry a fullScreenIntent.
        // The old primary is about to become standalone, so build it with the
        // fullScreenIntent variant.
        val oldNotification = if (oldHandle != null) {
            buildOngoingNotification(oldPrimary, oldHandle.displayName, oldHandle.muted, withFullScreenIntent = true)
        } else null

        // Cancel the secondary copy of the new primary before promoting it.
        nm.cancel(notificationIdFor(newPrimary))
        primaryUuid = newPrimary
        promoteToForeground(newPrimary, newPrimaryNotification)

        if (oldNotification != null) {
            nm.notify(notificationIdFor(oldPrimary), oldNotification)
        }
    }

    private fun promoteToForeground(uuid: String, notification: Notification) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            val type = ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL or
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            startForeground(notificationIdFor(uuid), notification, type)
        } else {
            startForeground(notificationIdFor(uuid), notification)
        }
    }

    private fun handleStop(uuid: String) {
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.cancel(notificationIdFor(uuid))

        if (uuid == callWaitingUuid) {
            stopCallWaitingTone()
        }

        if (uuid != primaryUuid) return

        stopRingerAndVibration()
        primaryUuid = null

        // Promote a surviving call if any. Registry is the source of truth.
        val nextUuid = CallRegistry.firstActiveUuid()
        if (nextUuid != null) {
            promoteCall(nextUuid)
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    // Promotes `uuid` to primary: clears any prior secondary notification,
    // resets call-waiting state, and starts the full ringer if it's still
    // ringing (the call-waiting tone was for it being secondary, no longer
    // applicable now that it's the top call).
    private fun promoteCall(uuid: String) {
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        val handle = CallRegistry.get(uuid)
        val displayName = handle?.displayName.orEmpty()
        val muted = handle?.muted ?: false
        val isRinging = handle?.direction == CallRegistry.Direction.Incoming &&
            !CallRegistry.isAnswered(uuid)
        val notification = if (isRinging) {
            buildIncomingNotification(uuid, displayName)
        } else {
            buildOngoingNotification(uuid, displayName, muted)
        }

        stopCallWaitingTone()
        nm.cancel(notificationIdFor(uuid))
        primaryUuid = uuid
        if (isRinging) {
            startRingerAndVibration()
        }
        promoteToForeground(uuid, notification)
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

    @SuppressLint("FullScreenIntentPolicy")
    private fun buildOngoingNotification(
        uuid: String,
        calleeName: String,
        muted: Boolean,
        withFullScreenIntent: Boolean = false,
    ): Notification {
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

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
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

        // CallStyle requires either FGS hosting or a fullScreenIntent. When
        // this notification is being posted standalone (not FGS-promoted),
        // attach the intent to satisfy the platform check.
        if (withFullScreenIntent) {
            val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            val canFsi = Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE ||
                nm.canUseFullScreenIntent()
            if (canFsi) {
                builder.setFullScreenIntent(fullScreenIntent(uuid), false)
            }
        }

        return builder.build()
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

    private fun startCallWaitingTone(uuid: String) {
        if (callWaitingUuid == uuid) return
        callWaitingUuid = uuid
        if (toneGen == null) {
            try {
                @Suppress("DEPRECATION")
                toneGen = android.media.ToneGenerator(android.media.AudioManager.STREAM_VOICE_CALL, 80)
            } catch (_: Exception) {
                return
            }
        }
        toneHandler.removeCallbacks(toneLoop)
        toneHandler.post(toneLoop)
    }

    private fun stopCallWaitingTone() {
        callWaitingUuid = null
        toneHandler.removeCallbacks(toneLoop)
        try { toneGen?.stopTone() } catch (_: Exception) {}
        try { toneGen?.release() } catch (_: Exception) {}
        toneGen = null
    }

    override fun onDestroy() {
        stopRingerAndVibration()
        stopCallWaitingTone()
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
