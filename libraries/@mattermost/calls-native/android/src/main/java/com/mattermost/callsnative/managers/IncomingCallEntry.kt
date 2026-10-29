package com.mattermost.callsnative.managers

import android.content.Context
import android.os.Build
import androidx.annotation.RequiresApi
import androidx.core.net.toUri
import androidx.core.telecom.CallAttributesCompat
import com.mattermost.callsnative.R
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.selects.select
import java.util.UUID
import com.mattermost.callsnative.services.MMCallsBootTaskService
import com.mattermost.callsnative.services.MMCallsForegroundService
import com.mattermost.callsnative.utils.HostAppIcons
import com.mattermost.callsnative.utils.TurboLogger

private const val RING_TIMEOUT_MS = 45_000L

/**
 * Entry point for incoming calls invoked by the host app's FCM receiver.
 */
object IncomingCallEntry {
    private const val TAG = "MMCalls/IncomingCallEntry"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default + CoroutineName("MMCalls/Incoming"))

    data class Params(
        val channelId: String,
        val serverId: String,
        val serverUrl: String,
        val callerName: String,
        val callerId: String,
        val postId: String,
        val threadId: String,
    )

    /** Returns the UUID of the registered call, or null if the device doesn't
     *  support self-managed Telecom or registration failed. */
    fun report(context: Context, params: Params): String? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            TurboLogger.w(TAG, "Telecom not supported; skipping incoming call")
            return null
        }
        if (!PhoneAccountRegistrar.isUsable()) {
            TurboLogger.w(TAG, "Telecom not registered; skipping incoming call")
            return null
        }
        return reportInternal(context.applicationContext, params)
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private fun reportInternal(context: Context, params: Params): String? {
        val callsManager = PhoneAccountRegistrar.getCallsManager() ?: return null

        val uuid = UUID.randomUUID().toString()
        val handle = CallRegistry.create(uuid)
        val displayName = params.callerName.ifBlank {
            context.getString(R.string.mobile_android_calls_incoming_call_placeholder)
                .replace("{applicationName}", HostAppIcons.appLabel(context))
        }
        handle.displayName = displayName
        handle.direction = CallRegistry.Direction.Incoming
        handle.callerId = params.callerId
        handle.channelId = params.channelId
        handle.serverUrl = params.serverUrl

        // Start the visible ring before publishing the call to JS. If Android
        // rejects the service start, the host can still use its ordinary
        // notification fallback without leaving a phantom buffered call.
        try {
            MMCallsForegroundService.ring(context, uuid, displayName)
        } catch (e: Exception) {
            TurboLogger.e(TAG, "unable to start incoming-call service: ${e.message}")
            handle.endReason = CallRegistry.Reason.Failed
            handle.ended = true
            CallRegistry.remove(uuid)
            return null
        }

        // Emitted before RN boots so the CallsBridge buffer captures it. JS
        // uses this to populate the native_call mapping for WS correlation.
        CallsBridge.send(
            CallsBridge.Event.IncomingCall,
            mapOf(
                "uuid" to uuid,
                "channelId" to params.channelId,
                "serverId" to params.serverId,
                "postId" to params.postId,
                "threadId" to params.threadId,
                "callerId" to params.callerId,
                "callerName" to displayName,
            ),
        )

        // The headless task runs `initialize()` so WS subscriptions
        // attach before the user reacts.
        bootReactNative(context)

        val attrs = CallAttributesCompat(
            displayName = displayName,
            address = "mattermost-calls:${params.channelId}".toUri(),
            direction = CallAttributesCompat.DIRECTION_INCOMING,
            callType = CallAttributesCompat.CALL_TYPE_AUDIO_CALL,
            callCapabilities = CallAttributesCompat.SUPPORTS_SET_INACTIVE or
                CallAttributesCompat.SUPPORTS_STREAM,
        )

        handle.job = scope.launch(CoroutineName("Call-$uuid")) {
            var terminalReason: CallRegistry.Reason? = null
            try {
                callsManager.addCall(
                    attrs,
                    onAnswer = { announceAnswered(context, handle, uuid) },
                    onDisconnect = { handle.disconnectSignal.trySend(CallRegistry.Reason.LocalHangup) },
                    onSetActive = { handle.setActiveSignal.trySend(Unit) },
                    // We don't support hold; treat as end.
                    onSetInactive = { handle.disconnectSignal.trySend(CallRegistry.Reason.LocalHangup) },
                ) {
                    val callControlScope = this

                    val ringTimeoutJob = callControlScope.launch {
                        delay(RING_TIMEOUT_MS)
                        if (!handle.answered) {
                            handle.disconnectSignal.trySend(CallRegistry.Reason.Unanswered)
                        }
                    }

                    callControlScope.launch {
                        while (true) {
                            val terminal = select {
                                handle.answerSignal.onReceive {
                                    callControlScope.answer(CallAttributesCompat.CALL_TYPE_AUDIO_CALL)
                                    announceAnswered(context, handle, uuid)
                                    ringTimeoutJob.cancel()
                                    null
                                }
                                handle.setActiveSignal.onReceive {
                                    callControlScope.setActive()
                                    null
                                }
                                handle.disconnectSignal.onReceive { reason -> reason }
                            }
                            if (terminal != null) {
                                terminalReason = terminal
                                ringTimeoutJob.cancel()
                                callControlScope.disconnect(CallRegistry.disconnectCauseFor(terminal))
                                if (!handle.answered && terminal == CallRegistry.Reason.Declined) {
                                    CallsBridge.send(
                                        CallsBridge.Event.CallDeclined,
                                        mapOf("uuid" to uuid),
                                    )
                                }
                                break
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                TurboLogger.e(TAG, "incoming call coroutine failed: ${e.message}")
                terminalReason = CallRegistry.Reason.Failed
            } finally {
                MMCallsForegroundService.stop(context, uuid)
                handle.endReason = terminalReason
                handle.ended = true
                CallRegistry.remove(uuid)
                CallsBridge.send(CallsBridge.Event.CallEnded, mapOf("uuid" to uuid))
            }
        }

        return uuid
    }

    private fun bootReactNative(context: Context) {
        if (CallsBridge.isJSReady()) return
        try {
            val intent = android.content.Intent(context.applicationContext, MMCallsBootTaskService::class.java)
            com.facebook.react.HeadlessJsTaskService.acquireWakeLockNow(context.applicationContext)
            context.applicationContext.startService(intent)
        } catch (e: Exception) {
            TurboLogger.e(TAG, "bootReactNative failed: ${e.message}")
        }
    }

    // Idempotent — multiple call paths land here (system onAnswer, the in-app
    // answer button, the notification answer action).
    private fun announceAnswered(context: Context, handle: CallRegistry.CallHandle, uuid: String) {
        if (handle.answered) return
        handle.answered = true
        MMCallsForegroundService.refresh(context, uuid)
        CallsBridge.send(CallsBridge.Event.CallAnswered, mapOf("uuid" to uuid))
    }

    /** Update the caller's display name after the ack-and-refresh round-trip
     *  resolves the enriched names for an `id_loaded:true` notification. */
    fun updateCallerName(context: Context, uuid: String, newName: String) {
        if (newName.isBlank()) return
        val handle = CallRegistry.get(uuid) ?: return
        if (handle.displayName == newName) return
        handle.displayName = newName
        MMCallsForegroundService.refresh(context, uuid)
    }

    fun updateAvatar(context: Context, uuid: String, bitmap: android.graphics.Bitmap?) {
        val handle = CallRegistry.get(uuid) ?: return
        handle.avatar = bitmap
        MMCallsForegroundService.refresh(context, uuid)
    }
}
