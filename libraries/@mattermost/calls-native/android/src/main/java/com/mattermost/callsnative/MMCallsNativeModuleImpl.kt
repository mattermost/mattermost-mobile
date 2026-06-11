package com.mattermost.callsnative

import android.os.Build
import androidx.core.net.toUri
import androidx.core.telecom.CallAttributesCompat
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap
import com.mattermost.callsnative.managers.CallRegistry
import com.mattermost.callsnative.managers.CallsBridge
import com.mattermost.callsnative.managers.PhoneAccountRegistrar
import com.mattermost.callsnative.services.MMCallsForegroundService
import com.mattermost.callsnative.utils.HostAppIcons
import com.mattermost.callsnative.utils.TurboLogger
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.selects.select
import java.util.UUID

class MMCallsNativeModuleImpl(private val context: ReactApplicationContext) {
    companion object {
        const val NAME = "MMCallsNative"
        private const val TAG = "MMCalls/MMCallsNativeModuleImpl"
        private const val E_TELECOM_UNAVAILABLE = "telecom_unavailable"
        private const val E_UNKNOWN_CALL = "unknown_call"
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default + CoroutineName("MMCalls"))

    init {
        CallsBridge.attachReactContext(context)
        context.addLifecycleEventListener(object : LifecycleEventListener {
            override fun onHostResume() {}
            override fun onHostPause() {}
            override fun onHostDestroy() {
                CallsBridge.detachReactContext(context)
                scope.cancel()
            }
        })
    }

    fun reportOutgoingCall(params: ReadableMap?, promise: Promise?) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise?.reject(E_TELECOM_UNAVAILABLE, "androidx.core.telecom requires API 26+")
            return
        }
        if (!PhoneAccountRegistrar.isUsable()) {
            promise?.reject(E_TELECOM_UNAVAILABLE, "Telecom not registered")
            return
        }
        val callsManager = PhoneAccountRegistrar.getCallsManager()
        if (callsManager == null) {
            promise?.reject(E_TELECOM_UNAVAILABLE, "CallsManager unavailable")
            return
        }
        val channelId = params?.getString("channelId").orEmpty()
        if (channelId.isEmpty()) {
            promise?.reject(E_TELECOM_UNAVAILABLE, "channelId required")
            return
        }
        val calleeName = params?.getString("calleeName").orEmpty()
        val uuid = UUID.randomUUID().toString()

        val handle = CallRegistry.create(uuid)
        val displayName = calleeName.ifBlank {
            context.getString(R.string.mobile_android_calls_incoming_call_placeholder)
                .replace("{applicationName}", HostAppIcons.appLabel(context))
        }
        handle.displayName = displayName
        val attrs = CallAttributesCompat(
            displayName = displayName,
            address = "mattermost-calls:$channelId".toUri(),
            direction = CallAttributesCompat.DIRECTION_OUTGOING,
            callType = CallAttributesCompat.CALL_TYPE_AUDIO_CALL,
            callCapabilities = CallAttributesCompat.SUPPORTS_SET_INACTIVE or
                CallAttributesCompat.SUPPORTS_STREAM,
        )

        // Foreground service must be running before addCall so the OS sees
        // it before the call's first setActive() asks for the mic.
        MMCallsForegroundService.start(context, uuid, displayName)

        handle.job = scope.launch(CoroutineName("Call-$uuid")) {
            var terminalReason: CallRegistry.Reason? = null
            try {
                callsManager.addCall(
                    attrs,
                    onAnswer = { /* outbound — not invoked */ },
                    onDisconnect = { handle.disconnectSignal.trySend(CallRegistry.Reason.LocalHangup) },
                    onSetActive = { handle.setActiveSignal.trySend(Unit) },
                    // We don't support hold; treat as end.
                    onSetInactive = { handle.disconnectSignal.trySend(CallRegistry.Reason.LocalHangup) },
                ) {
                    val callControlScope = this
                    callControlScope.launch {
                        while (true) {
                            val terminal = select {
                                handle.setActiveSignal.onReceive {
                                    callControlScope.setActive()
                                    null
                                }
                                handle.disconnectSignal.onReceive { reason -> reason }
                            }
                            if (terminal != null) {
                                terminalReason = terminal
                                callControlScope.disconnect(CallRegistry.disconnectCauseFor(terminal))
                                break
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                TurboLogger.e(TAG, "outgoing call coroutine failed: ${e.message}")
                terminalReason = CallRegistry.Reason.Failed
            } finally {
                MMCallsForegroundService.stop(context, uuid)
                handle.endReason = terminalReason
                handle.ended = true
                CallRegistry.remove(uuid)
                CallsBridge.send(CallsBridge.Event.CallEnded, mapOf("uuid" to uuid))
            }
        }

        val result = WritableNativeMap().apply { putString("uuid", uuid) }
        promise?.resolve(result)
    }

    fun reportConnected(uuid: String?, promise: Promise?) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise?.reject(E_TELECOM_UNAVAILABLE, "androidx.core.telecom requires API 26+")
            return
        }
        val id = uuid.orEmpty()
        if (!CallRegistry.setActive(id)) {
            promise?.reject(E_UNKNOWN_CALL, "No active call")
            return
        }
        CallRegistry.get(id)?.connected = true
        promise?.resolve(null)
    }

    fun reportEnded(uuid: String?, reason: String?, promise: Promise?) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise?.reject(E_TELECOM_UNAVAILABLE, "androidx.core.telecom requires API 26+")
            return
        }
        val id = uuid.orEmpty()
        val signal = reasonOf(reason)
        // No live call is expected on a duplicate teardown — resolve silently.
        CallRegistry.disconnect(id, signal)
        promise?.resolve(null)
    }

    fun setMuted(uuid: String?, muted: Boolean, promise: Promise?) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise?.reject(E_TELECOM_UNAVAILABLE, "androidx.core.telecom requires API 26+")
            return
        }
        val id = uuid.orEmpty()
        val handle = CallRegistry.get(id)
        if (handle == null) {
            promise?.reject(E_UNKNOWN_CALL, "No active call")
            return
        }
        if (handle.muted == muted) {
            promise?.resolve(null)
            return
        }
        handle.muted = muted
        MMCallsForegroundService.refresh(context, id)
        promise?.resolve(null)
    }

    private fun reasonOf(raw: String?): CallRegistry.Reason = when (raw) {
        "remoteEnded" -> CallRegistry.Reason.RemoteEnded
        "failed" -> CallRegistry.Reason.Failed
        "unanswered" -> CallRegistry.Reason.Unanswered
        "declined" -> CallRegistry.Reason.Declined
        "declinedElsewhere" -> CallRegistry.Reason.DeclinedElsewhere
        "answeredElsewhere" -> CallRegistry.Reason.AnsweredElsewhere
        else -> CallRegistry.Reason.LocalHangup
    }

}
