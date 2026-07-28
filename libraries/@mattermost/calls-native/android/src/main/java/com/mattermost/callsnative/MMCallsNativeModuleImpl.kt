package com.mattermost.callsnative

import android.bluetooth.BluetoothHeadset
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class MMCallsNativeModuleImpl(private val context: ReactApplicationContext) {
    companion object {
        const val NAME = "MMCallsNative"
        private const val EVENT_AUDIO_ROUTE_CHANGED = "AudioRouteChanged"
    }

    private var audioManager: AudioManager? = null
    private var origAudioMode = AudioManager.MODE_NORMAL
    private var origSpeakerOn = false
    private var audioFocusRequest: AudioFocusRequest? = null
    private var ringtonePlayer: MediaPlayer? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var ringtoneStopRunnable: Runnable? = null
    private var headsetReceiver: BroadcastReceiver? = null
    private var btReceiver: BroadcastReceiver? = null

    // Track whether BT SCO is requested so getAudioRoute can reflect it.
    private var btScoRequested = false

    // -------------------------------------------------------------------------
    // Call UI stubs — iOS-only (Telecom/ConnectionService not yet implemented)
    // -------------------------------------------------------------------------

    fun reportOutgoingCall(promise: Promise?) {
        promise?.resolve(null)
    }

    fun reportConnected(promise: Promise?) {
        promise?.resolve(null)
    }

    fun reportEnded(promise: Promise?) {
        promise?.resolve(null)
    }

    fun setMuted(promise: Promise?) {
        promise?.resolve(null)
    }

    // -------------------------------------------------------------------------
    // Foreground service
    // -------------------------------------------------------------------------

    fun foregroundServiceStart(config: ReadableMap?) {
        if (config == null) return
        val intent = Intent(context, MMCallsForegroundService::class.java).apply {
            putExtra(MMCallsForegroundService.EXTRA_CHANNEL_ID, config.getString("channelId"))
            putExtra(MMCallsForegroundService.EXTRA_CHANNEL_NAME, config.getString("channelName"))
            putExtra(MMCallsForegroundService.EXTRA_CHANNEL_DESCRIPTION, config.getString("channelDescription"))
            putExtra(MMCallsForegroundService.EXTRA_TITLE, config.getString("title"))
            putExtra(MMCallsForegroundService.EXTRA_TEXT, config.getString("text"))
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    fun foregroundServiceStop() {
        context.stopService(Intent(context, MMCallsForegroundService::class.java))
    }

    // -------------------------------------------------------------------------
    // Audio session lifecycle
    // -------------------------------------------------------------------------

    fun startAudioSession(promise: Promise?) {
        val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        audioManager = audio
        origAudioMode = audio.mode
        origSpeakerOn = audio.isSpeakerphoneOn
        btScoRequested = false

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .build()
            audio.requestAudioFocus(req)
            audioFocusRequest = req
        } else {
            @Suppress("DEPRECATION")
            audio.requestAudioFocus(null, AudioManager.STREAM_VOICE_CALL, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        }

        audio.mode = AudioManager.MODE_IN_COMMUNICATION
        audio.isSpeakerphoneOn = false

        registerAudioReceivers()
        emitAudioRouteChanged()
        promise?.resolve(null)
    }

    fun stopAudioSession(promise: Promise?) {
        val audio = audioManager ?: (context.getSystemService(Context.AUDIO_SERVICE) as AudioManager)
        audio.stopBluetoothSco()
        audio.isSpeakerphoneOn = origSpeakerOn
        audio.mode = origAudioMode
        btScoRequested = false

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest?.let { audio.abandonAudioFocusRequest(it) }
            audioFocusRequest = null
        } else {
            @Suppress("DEPRECATION")
            audio.abandonAudioFocus(null)
        }

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
                audio.stopBluetoothSco()
                btScoRequested = false
                audio.isSpeakerphoneOn = true
            }
            "EARPIECE" -> {
                audio.stopBluetoothSco()
                btScoRequested = false
                audio.isSpeakerphoneOn = false
            }
            "WIRED_HEADSET" -> {
                audio.stopBluetoothSco()
                btScoRequested = false
                audio.isSpeakerphoneOn = false
            }
            "BLUETOOTH" -> {
                audio.isSpeakerphoneOn = false
                audio.startBluetoothSco()
                btScoRequested = true
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

    fun startRingtone(name: String, seconds: Int, promise: Promise?) {
        stopRingtoneInternal()

        val resId = getRingtoneResId(name)
        if (resId == 0) {
            promise?.reject("ringtone_not_found", "Ringtone not found: $name")
            return
        }

        try {
            val player = MediaPlayer.create(context, resId) ?: run {
                promise?.reject("ringtone_error", "Failed to create MediaPlayer for: $name")
                return
            }
            player.isLooping = seconds <= 0
            player.setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            )
            if (seconds > 0) {
                player.isLooping = false
                val stopRunnable = Runnable { stopRingtoneInternal() }
                ringtoneStopRunnable = stopRunnable
                mainHandler.postDelayed(stopRunnable, seconds * 1000L)
            } else {
                player.isLooping = true
            }
            player.start()
            ringtonePlayer = player
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
        val selected = when {
            btScoRequested && audio.isBluetoothScoOn -> "BLUETOOTH"
            audio.isSpeakerphoneOn -> "SPEAKER_PHONE"
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
        return try {
            val btManager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
                ?: return false
            // getConnectedDevices returns only devices actively connected on that profile right now.
            btManager.getConnectedDevices(BluetoothProfile.HEADSET).isNotEmpty()
        } catch (_: SecurityException) {
            false
        } catch (_: Exception) {
            false
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
