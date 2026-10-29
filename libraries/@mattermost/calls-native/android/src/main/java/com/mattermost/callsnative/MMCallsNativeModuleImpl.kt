package com.mattermost.callsnative

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothHeadset
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.content.pm.PackageManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.net.toUri
import androidx.core.telecom.CallAttributesCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.modules.core.DeviceEventManagerModule
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
import kotlinx.coroutines.launch
import kotlinx.coroutines.selects.select
import java.util.UUID

class MMCallsNativeModuleImpl(private val context: ReactApplicationContext) {
    companion object {
        const val NAME = "MMCallsNative"
        private const val EVENT_AUDIO_ROUTE_CHANGED = "AudioRouteChanged"
        private const val TAG = "MMCalls/MMCallsNativeModuleImpl"
        private const val E_TELECOM_UNAVAILABLE = "telecom_unavailable"
        private const val E_UNKNOWN_CALL = "unknown_call"
    }

    // Telecom calls belong to the process, not MainActivity. In particular,
    // destroying the React host while CallActivity is visible must not hang
    // up an active call or remove its foreground service.
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default + CoroutineName("MMCalls"))

    init {
        CallsBridge.attachReactContext(context)
        context.addLifecycleEventListener(object : LifecycleEventListener {
            override fun onHostResume() {}
            override fun onHostPause() {}
            override fun onHostDestroy() {
                CallsBridge.detachReactContext(context)
            }
        })
    }

    private var jsListenerCount = 0

    @Synchronized
    fun addListener() {
        jsListenerCount += 1
    }

    @Synchronized
    fun removeListeners(count: Int) {
        jsListenerCount = (jsListenerCount - count).coerceAtLeast(0)
        if (jsListenerCount == 0) {
            CallsBridge.markJSListenersGone()
        }
    }

    fun setCallListenersReady() {
        CallsBridge.markJSListenersReady()
    }

    private var audioManager: AudioManager? = null
    private var origAudioMode = AudioManager.MODE_NORMAL
    @Suppress("DEPRECATION") private var origSpeakerOn = false   // used on API < 31 only
    private var origCommDeviceType: Int? = null                   // used on API 31+ only
    private var audioFocusRequest: AudioFocusRequest? = null
    private var ringtonePlayer: MediaPlayer? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var ringtoneStopRunnable: Runnable? = null
    private var headsetReceiver: BroadcastReceiver? = null
    private var btReceiver: BroadcastReceiver? = null
    private val vibrator: Vibrator by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
    }

    private val ringtoneVibratePattern = longArrayOf(0, 1000, 500, 1000, 500, 1000, 500, 1000, 500, 1000)

    // Track whether the user selected Bluetooth so getAudioRoute can reflect it.
    private var btActive = false

    // -------------------------------------------------------------------------
    // Self-managed Telecom call UI and its foreground service
    // -------------------------------------------------------------------------

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
        handle.channelId = channelId
        val attrs = CallAttributesCompat(
            displayName = displayName,
            address = "mattermost-calls:$channelId".toUri(),
            direction = CallAttributesCompat.DIRECTION_OUTGOING,
            callType = CallAttributesCompat.CALL_TYPE_AUDIO_CALL,
            callCapabilities = CallAttributesCompat.SUPPORTS_SET_INACTIVE or
                CallAttributesCompat.SUPPORTS_STREAM,
        )

        // The service must be running before addCall so Android sees it before
        // the first setActive() requests microphone access.
        MMCallsForegroundService.start(context, uuid, displayName)

        handle.job = scope.launch(CoroutineName("Call-$uuid")) {
            var terminalReason: CallRegistry.Reason? = null
            try {
                callsManager.addCall(
                    attrs,
                    onAnswer = { /* outbound — not invoked */ },
                    onDisconnect = { handle.disconnectSignal.trySend(CallRegistry.Reason.LocalHangup) },
                    onSetActive = { handle.setActiveSignal.trySend(Unit) },
                    // We don't support hold; treat it as an end request.
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
        CallRegistry.disconnect(id, reasonOf(reason))
        // Duplicate teardown is expected when JS, Telecom and the notification
        // all observe the same end event.
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
        if (handle.muted != muted) {
            handle.muted = muted
            MMCallsForegroundService.refresh(context, id)
        }
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

    // Preserve the previous microphone-only service as a fallback when Telecom
    // is unavailable. A registered Telecom call already owns a combined
    // phoneCall|microphone service, so starting another one would duplicate
    // notifications and foreground-service state.
    fun foregroundServiceStart(config: ReadableMap?) {
        if (config == null || CallRegistry.hasActiveCalls()) return
        val intent = Intent(context, com.mattermost.callsnative.MMCallsForegroundService::class.java).apply {
            putExtra(com.mattermost.callsnative.MMCallsForegroundService.EXTRA_CHANNEL_ID, config.getString("channelId"))
            putExtra(com.mattermost.callsnative.MMCallsForegroundService.EXTRA_CHANNEL_NAME, config.getString("channelName"))
            putExtra(com.mattermost.callsnative.MMCallsForegroundService.EXTRA_CHANNEL_DESCRIPTION, config.getString("channelDescription"))
            putExtra(com.mattermost.callsnative.MMCallsForegroundService.EXTRA_TITLE, config.getString("title"))
            putExtra(com.mattermost.callsnative.MMCallsForegroundService.EXTRA_TEXT, config.getString("text"))
        }
        context.startForegroundService(intent)
    }

    fun foregroundServiceStop() {
        context.stopService(Intent(context, com.mattermost.callsnative.MMCallsForegroundService::class.java))
    }

    // -------------------------------------------------------------------------
    // Audio session lifecycle
    // -------------------------------------------------------------------------

    fun startAudioSession(promise: Promise?) {
        if (audioManager != null) {
            // Already started — don't re-snapshot the already-modified audio
            // state or we'll restore MODE_IN_COMMUNICATION on stopAudioSession.
            emitAudioRouteChanged()
            promise?.resolve(null)
            return
        }
        val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audioManager = audio
        origAudioMode = audio.mode
        btActive = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            origCommDeviceType = audio.communicationDevice?.type
        } else {
            @Suppress("DEPRECATION")
            origSpeakerOn = audio.isSpeakerphoneOn
        }

        val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            .build()
        val result = audio.requestAudioFocus(req)
        if (result != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
            audioManager = null
            promise?.reject("start_audio_session_failed", "requestAudioFocus denied (result=$result)")
            return
        }
        audioFocusRequest = req

        audio.mode = AudioManager.MODE_IN_COMMUNICATION
        routeToEarpiece(audio)

        registerAudioReceivers()
        emitAudioRouteChanged()
        promise?.resolve(null)
    }

    fun stopAudioSession(promise: Promise?) {
        val audio = audioManager ?: (context.getSystemService(Context.AUDIO_SERVICE) as AudioManager)
        restoreOriginalRoute(audio)
        audio.mode = origAudioMode
        btActive = false

        audioFocusRequest?.let { audio.abandonAudioFocusRequest(it) }
        audioFocusRequest = null

        unregisterAudioReceivers()
        audioManager = null
        promise?.resolve(null)
    }

    // -------------------------------------------------------------------------
    // Audio route selection
    // -------------------------------------------------------------------------

    fun setAudioRoute(route: String, promise: Promise?) {
        val audio = audioManager ?: run { promise?.resolve(null); return }
        when (route) {
            "SPEAKER_PHONE" -> {
                stopBluetoothAudio(audio)
                btActive = false
                routeToSpeaker(audio)
            }
            "EARPIECE" -> {
                stopBluetoothAudio(audio)
                btActive = false
                routeToEarpiece(audio)
            }
            "WIRED_HEADSET" -> {
                stopBluetoothAudio(audio)
                btActive = false
                routeToWiredHeadset(audio)
            }
            "BLUETOOTH" -> {
                routeToEarpiece(audio)
                startBluetoothAudio(audio)
                btActive = true
            }
        }
        emitAudioRouteChanged()
        promise?.resolve(null)
    }

    fun getAudioRoute(promise: Promise?) {
        promise?.resolve(buildAudioRouteMap())
    }

    // -------------------------------------------------------------------------
    // Ringtone
    // -------------------------------------------------------------------------

    // isRingback distinguishes the outbound ringback — progress feedback for a call this device
    // placed, played into the ongoing call — from an incoming ring announcing someone else's call.
    // The caller's own phone must not buzz, and the tone has to follow the call's audio route
    // rather than sit on the ringer stream at ringer volume.
    fun startRingtone(name: String, seconds: Int, isRingback: Boolean, promise: Promise?) {
        stopRingtoneInternal()

        val resId = getRingtoneResId(name)
        if (resId == 0) {
            promise?.reject("ringtone_not_found", "Ringtone not found: $name")
            return
        }

        try {
            val usage = if (isRingback) {
                AudioAttributes.USAGE_VOICE_COMMUNICATION
            } else {
                AudioAttributes.USAGE_NOTIFICATION_RINGTONE
            }
            val attrs = AudioAttributes.Builder()
                .setUsage(usage)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build()
            // Pass AudioAttributes to the create() overload so they are applied
            // before prepare(), which is called internally by MediaPlayer.create().
            val player = MediaPlayer.create(context, resId, attrs, AudioManager.AUDIO_SESSION_ID_GENERATE) ?: run {
                promise?.reject("ringtone_error", "Failed to create MediaPlayer for: $name")
                return
            }
            player.isLooping = true
            if (seconds > 0) {
                val stopRunnable = Runnable { stopRingtoneInternal() }
                ringtoneStopRunnable = stopRunnable
                mainHandler.postDelayed(stopRunnable, seconds * 1000L)
            }
            player.start()
            ringtonePlayer = player
            if (!isRingback) {
                vibrator.vibrate(VibrationEffect.createWaveform(ringtoneVibratePattern, 0))
            }
            promise?.resolve(null)
        } catch (e: Exception) {
            promise?.reject("ringtone_error", e.message ?: "Unknown error")
        }
    }

    fun stopRingtone(promise: Promise?) {
        stopRingtoneInternal()
        promise?.resolve(null)
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private fun getRingtoneResId(name: String): Int {
        val pkg = context.packageName
        var id = context.resources.getIdentifier(name, "raw", pkg)
        if (id == 0) {
            id = context.resources.getIdentifier("default_ringtone", "raw", pkg)
        }
        return id
    }

    private fun stopRingtoneInternal() {
        ringtoneStopRunnable?.let { mainHandler.removeCallbacks(it) }
        ringtoneStopRunnable = null
        ringtonePlayer?.let {
            if (it.isPlaying) it.stop()
            it.release()
        }
        ringtonePlayer = null
        vibrator.cancel()
    }

    private fun registerAudioReceivers() {
        headsetReceiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context?, intent: Intent?) {
                emitAudioRouteChanged()
            }
        }
        btReceiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context?, intent: Intent?) {
                emitAudioRouteChanged()
            }
        }

        context.registerReceiver(headsetReceiver, IntentFilter(Intent.ACTION_HEADSET_PLUG))

        val btFilter = IntentFilter().apply {
            addAction(BluetoothHeadset.ACTION_CONNECTION_STATE_CHANGED)
            addAction(AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED)
        }
        context.registerReceiver(btReceiver, btFilter)
    }

    private fun unregisterAudioReceivers() {
        headsetReceiver?.let {
            try { context.unregisterReceiver(it) } catch (_: Exception) {}
            headsetReceiver = null
        }
        btReceiver?.let {
            try { context.unregisterReceiver(it) } catch (_: Exception) {}
            btReceiver = null
        }
    }

    private fun buildAudioRouteMap(): WritableMap {
        val audio = audioManager ?: (context.getSystemService(Context.AUDIO_SERVICE) as AudioManager)
        val available = mutableListOf("SPEAKER_PHONE", "EARPIECE")

        // Wired headset: query the sticky ACTION_HEADSET_PLUG broadcast.
        val headsetIntent = context.registerReceiver(null, IntentFilter(Intent.ACTION_HEADSET_PLUG))
        val wiredConnected = headsetIntent?.getIntExtra("state", 0) == 1
        if (wiredConnected) available.add("WIRED_HEADSET")

        // Bluetooth: check if any bonded device supports audio (HFP/HSP).
        val hasBluetooth = hasBondedBluetoothAudioDevice()
        if (hasBluetooth) available.add("BLUETOOTH")

        // Selected device: priority order matches typical Android call behavior.
        val speakerActive = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            audio.communicationDevice?.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
        } else {
            @Suppress("DEPRECATION")
            audio.isSpeakerphoneOn
        }
        val selected = when {
            btActive -> "BLUETOOTH"
            speakerActive -> "SPEAKER_PHONE"
            wiredConnected -> "WIRED_HEADSET"
            else -> "EARPIECE"
        }

        val list = Arguments.createArray()
        available.forEach { list.pushString(it) }

        return Arguments.createMap().apply {
            putString("selectedAudioDevice", selected)
            putArray("availableAudioDeviceList", list)
        }
    }

    private fun hasBondedBluetoothAudioDevice(): Boolean {
        // BLUETOOTH_CONNECT is required on API 31+ to query connection state.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            context.checkSelfPermission(android.Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED
        ) {
            return false
        }
        return try {
            val adapter = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)
                ?.adapter ?: return false
            // getProfileConnectionState works for all profiles (unlike
            // BluetoothManager.getConnectedDevices which only accepts GATT).
            adapter.getProfileConnectionState(BluetoothProfile.HEADSET) == BluetoothAdapter.STATE_CONNECTED
        } catch (_: SecurityException) {
            false
        } catch (_: Exception) {
            false
        }
    }

    private fun routeToSpeaker(audio: AudioManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val dev = audio.availableCommunicationDevices
                .firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
            if (dev != null) audio.setCommunicationDevice(dev)
        } else {
            @Suppress("DEPRECATION")
            audio.isSpeakerphoneOn = true
        }
    }

    private fun routeToWiredHeadset(audio: AudioManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val dev = audio.availableCommunicationDevices
                .firstOrNull { it.type == AudioDeviceInfo.TYPE_WIRED_HEADSET || it.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES }
            if (dev != null) audio.setCommunicationDevice(dev) else audio.clearCommunicationDevice()
        } else {
            @Suppress("DEPRECATION")
            audio.isSpeakerphoneOn = false
        }
    }

    private fun routeToEarpiece(audio: AudioManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val dev = audio.availableCommunicationDevices
                .firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE }
            if (dev != null) audio.setCommunicationDevice(dev) else audio.clearCommunicationDevice()
        } else {
            @Suppress("DEPRECATION")
            audio.isSpeakerphoneOn = false
        }
    }

    private fun restoreOriginalRoute(audio: AudioManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val targetType = origCommDeviceType
            if (targetType != null) {
                val dev = audio.availableCommunicationDevices.firstOrNull { it.type == targetType }
                if (dev != null) audio.setCommunicationDevice(dev) else audio.clearCommunicationDevice()
            } else {
                audio.clearCommunicationDevice()
            }
            origCommDeviceType = null
        } else {
            stopBluetoothAudio(audio)
            @Suppress("DEPRECATION")
            audio.isSpeakerphoneOn = origSpeakerOn
        }
    }

    private fun startBluetoothAudio(audio: AudioManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val btDevice = audio.availableCommunicationDevices
                .firstOrNull { it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO }
            if (btDevice != null) {
                audio.setCommunicationDevice(btDevice)
            }
        } else {
            @Suppress("DEPRECATION")
            audio.startBluetoothSco()
        }
    }

    private fun stopBluetoothAudio(audio: AudioManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            audio.clearCommunicationDevice()
        } else {
            @Suppress("DEPRECATION")
            audio.stopBluetoothSco()
        }
    }

    private fun emitAudioRouteChanged() {
        try {
            context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(EVENT_AUDIO_ROUTE_CHANGED, buildAudioRouteMap())
        } catch (_: Exception) {
            // JS bridge not yet ready — ignore.
        }
    }
}
