package com.mattermost.callsnative.managers

import android.graphics.Bitmap
import android.os.Build
import android.telecom.DisconnectCause
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.concurrent.ConcurrentHashMap

/**
 * Per-call coordination handles. The [addCall] coroutine creates an entry on
 * launch and removes it on completion.
 *
 * Each handle also exposes a [StateFlow] snapshot — used by [com.mattermost.callsnative.ui.CallActivity] to
 * render and re-render as state evolves (name resolves via ack-and-refresh,
 * avatar arrives, call gets answered or torn down).
 */
internal object CallRegistry {
    data class CallSnapshot(
        val uuid: String,
        val direction: Direction,
        val displayName: String,
        val callerId: String,
        val channelId: String,
        val serverUrl: String,
        val avatar: Bitmap?,
        val answered: Boolean,
        val connected: Boolean,
        val muted: Boolean,
        val ended: Boolean,
        val endReason: Reason?,
    )

    class CallHandle internal constructor(uuid: String) {
        val setActiveSignal: Channel<Unit> = Channel(Channel.CONFLATED)
        val disconnectSignal: Channel<Reason> = Channel(Channel.CONFLATED)
        val answerSignal: Channel<Unit> = Channel(Channel.CONFLATED)
        var job: Job? = null
        var notificationId: Int = 0

        private val _snapshot = MutableStateFlow(
            CallSnapshot(
                uuid = uuid,
                direction = Direction.Outgoing,
                displayName = "",
                callerId = "",
                channelId = "",
                serverUrl = "",
                avatar = null,
                answered = false,
                connected = false,
                muted = false,
                ended = false,
                endReason = null,
            )
        )
        val snapshot: StateFlow<CallSnapshot> = _snapshot.asStateFlow()

        var displayName: String
            get() = _snapshot.value.displayName
            set(value) { _snapshot.value = _snapshot.value.copy(displayName = value) }

        var muted: Boolean
            get() = _snapshot.value.muted
            set(value) { _snapshot.value = _snapshot.value.copy(muted = value) }

        var direction: Direction
            get() = _snapshot.value.direction
            set(value) { _snapshot.value = _snapshot.value.copy(direction = value) }

        var answered: Boolean
            get() = _snapshot.value.answered
            set(value) { _snapshot.value = _snapshot.value.copy(answered = value) }

        var connected: Boolean
            get() = _snapshot.value.connected
            set(value) { _snapshot.value = _snapshot.value.copy(connected = value) }

        var callerId: String
            get() = _snapshot.value.callerId
            set(value) { _snapshot.value = _snapshot.value.copy(callerId = value) }

        var channelId: String
            get() = _snapshot.value.channelId
            set(value) { _snapshot.value = _snapshot.value.copy(channelId = value) }

        var serverUrl: String
            get() = _snapshot.value.serverUrl
            set(value) { _snapshot.value = _snapshot.value.copy(serverUrl = value) }

        var avatar: Bitmap?
            get() = _snapshot.value.avatar
            set(value) { _snapshot.value = _snapshot.value.copy(avatar = value) }

        var ended: Boolean
            get() = _snapshot.value.ended
            set(value) { _snapshot.value = _snapshot.value.copy(ended = value) }

        var endReason: Reason?
            get() = _snapshot.value.endReason
            set(value) { _snapshot.value = _snapshot.value.copy(endReason = value) }
    }

    enum class Direction { Outgoing, Incoming }

    /** End-reason routed from JS / lock-screen / system into the call coroutine. */
    enum class Reason {
        RemoteEnded,
        Failed,
        Unanswered,
        Declined,
        DeclinedElsewhere,
        AnsweredElsewhere,
        LocalHangup,
    }

    private val handles = ConcurrentHashMap<String, CallHandle>()
    private val nextNotificationId = java.util.concurrent.atomic.AtomicInteger(1)

    fun create(uuid: String): CallHandle {
        val handle = CallHandle(uuid).apply { notificationId = nextNotificationId.getAndIncrement() }
        handles[uuid] = handle
        return handle
    }

    fun get(uuid: String): CallHandle? = handles[uuid]

    fun hasActiveCalls(): Boolean = handles.isNotEmpty()

    fun firstActiveUuid(): String? = handles.keys.firstOrNull()

    fun remove(uuid: String) {
        handles.remove(uuid)
    }

    fun setActive(uuid: String): Boolean {
        val handle = handles[uuid] ?: return false
        return handle.setActiveSignal.trySend(Unit).isSuccess
    }

    // The `answered` flag is set in IncomingCallEntry.announceAnswered —
    // the single place that emits CallAnswered to JS. Setting it here would
    // short-circuit its dedup guard and the event would never reach JS.
    fun answer(uuid: String): Boolean {
        val handle = handles[uuid] ?: return false
        return handle.answerSignal.trySend(Unit).isSuccess
    }

    fun isAnswered(uuid: String): Boolean = handles[uuid]?.answered == true

    fun disconnect(uuid: String, reason: Reason): Boolean {
        val handle = handles[uuid] ?: return false
        return handle.disconnectSignal.trySend(reason).isSuccess
    }

    fun requestUserHangup(uuid: String) { disconnect(uuid, Reason.LocalHangup) }
    fun requestUserAnswer(uuid: String) { answer(uuid) }
    fun requestUserDecline(uuid: String) { disconnect(uuid, Reason.Declined) }

    fun disconnectCauseFor(reason: Reason): DisconnectCause = when (reason) {
        Reason.RemoteEnded -> DisconnectCause(DisconnectCause.REMOTE)
        Reason.Failed -> DisconnectCause(DisconnectCause.ERROR)
        Reason.Unanswered -> DisconnectCause(DisconnectCause.MISSED)
        Reason.Declined -> DisconnectCause(DisconnectCause.REJECTED)
        Reason.DeclinedElsewhere ->
            DisconnectCause(DisconnectCause.REJECTED, "declined_elsewhere")
        Reason.AnsweredElsewhere -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N_MR1) {
            DisconnectCause(DisconnectCause.ANSWERED_ELSEWHERE)
        } else {
            DisconnectCause(DisconnectCause.REJECTED, "answered_elsewhere")
        }
        Reason.LocalHangup -> DisconnectCause(DisconnectCause.LOCAL)
    }
}
