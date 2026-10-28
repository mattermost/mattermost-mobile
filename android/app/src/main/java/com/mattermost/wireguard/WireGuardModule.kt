package com.mattermost.wireguard

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import android.os.SystemClock
import android.view.WindowManager
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.wireguard.android.backend.BackendException
import com.wireguard.android.backend.GoBackend
import com.wireguard.android.backend.Tunnel
import com.wireguard.config.Config
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.util.concurrent.Executors

class WireGuardModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {
    companion object {
        const val NAME = "ENCMAWireGuard"
        const val STATE_EVENT = "ENCMAWireGuardStateChanged"
        private const val VPN_PERMISSION_REQUEST = 7319
        private const val HANDSHAKE_TIMEOUT_MS = 20_000L
        private const val PROBE_INTERVAL_MS = 5_000L
        private const val PROBE_PORT = 9
    }

    private data class Verification(
        val handshakeEpochMillis: Long,
        val rxBytes: Long,
        val txBytes: Long,
    )

    private class HandshakeVerificationException(message: String) : Exception(message)

    private val executor = Executors.newSingleThreadExecutor()
    private val pendingLock = Any()
    private val applicationContext = reactContext.applicationContext

    @Volatile private var backend: GoBackend? = null
    @Volatile private var status = "disconnected"
    @Volatile private var statusMessage: String? = null
    @Volatile private var handshakeEpochMillis = 0L
    @Volatile private var rxBytes = 0L
    @Volatile private var txBytes = 0L
    @Volatile private var connecting = false
    @Volatile private var pendingConfig: Config? = null
    @Volatile private var pendingPromise: Promise? = null
    @Volatile private var secureFlagAddedByModule = false

    private val tunnel = object : Tunnel {
        override fun getName(): String = "encma"

        override fun onStateChange(newState: Tunnel.State) {
            when (newState) {
                Tunnel.State.UP -> {
                    // UP only means the interface exists. CONNECTED is emitted after handshake verification.
                    if (status != "connected") {
                        updateState("connecting")
                    }
                }
                Tunnel.State.DOWN -> {
                    handshakeEpochMillis = 0
                    rxBytes = 0
                    txBytes = 0
                    updateState("disconnected")
                }
                Tunnel.State.TOGGLE -> Unit
            }
        }
    }

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun addListener(eventName: String) = Unit

    @ReactMethod
    fun removeListeners(count: Int) = Unit

    @ReactMethod
    fun getState(promise: Promise) {
        executor.execute {
            try {
                val isUp = backend?.getState(tunnel) == Tunnel.State.UP
                if (!isUp && status == "connected") {
                    updateState("disconnected")
                }
                promise.resolve(createStateMap())
            } catch (error: Exception) {
                promise.reject("E_STATE", "The VPN connection state could not be read.")
            }
        }
    }

    @ReactMethod
    fun validateConfig(rawConfig: String, promise: Promise) {
        executor.execute {
            try {
                val config = WireGuardConfigParser.parse(rawConfig, applicationContext.packageName)
                promise.resolve(createConfigSummary(config))
            } catch (error: Exception) {
                val (code, message) = safeFailure(error)
                promise.reject(code, message)
            }
        }
    }

    @ReactMethod
    fun readConfigFile(uri: String, promise: Promise) {
        executor.execute {
            try {
                val input = applicationContext.contentResolver.openInputStream(android.net.Uri.parse(uri))
                    ?: throw IOException("Unable to open selected document")
                val contents = input.use { stream ->
                    val output = ByteArrayOutputStream()
                    val buffer = ByteArray(8192)
                    while (true) {
                        val count = stream.read(buffer)
                        if (count < 0) break
                        if (output.size() + count > WireGuardConfigParser.MAX_CONFIG_BYTES) {
                            throw IOException("Configuration too large")
                        }
                        output.write(buffer, 0, count)
                    }
                    output.toString(Charsets.UTF_8.name())
                }
                // Validate before returning the text to JavaScript. Secrets are never logged.
                WireGuardConfigParser.parse(contents, applicationContext.packageName)
                promise.resolve(contents)
            } catch (error: WireGuardConfigException) {
                promise.reject("E_CONFIG_INVALID", error.message)
            } catch (error: Exception) {
                promise.reject(
                    "E_CONFIG_READ",
                    "The selected file could not be read. Choose a UTF-8 WireGuard .conf file no larger than 64 KB.",
                )
            }
        }
    }

    @ReactMethod
    fun connect(rawConfig: String, promise: Promise) {
        synchronized(pendingLock) {
            if (connecting) {
                promise.reject("E_BUSY", "A VPN connection attempt is already in progress.")
                return
            }
            connecting = true
            pendingPromise = promise
        }
        updateState("connecting")
        executor.execute {
            try {
                pendingConfig = WireGuardConfigParser.parse(rawConfig, applicationContext.packageName)
                com.facebook.react.bridge.UiThreadUtil.runOnUiThread {
                    requestPermissionAndConnect()
                }
            } catch (error: Exception) {
                failPending(error)
            }
        }
    }

    @ReactMethod
    fun disconnect(promise: Promise) {
        if (connecting) {
            promise.reject("E_BUSY", "Wait for the current VPN connection attempt to finish.")
            return
        }
        executor.execute {
            try {
                backend?.setState(tunnel, Tunnel.State.DOWN, null)
                updateState("disconnected")
                promise.resolve(createStateMap())
            } catch (error: Exception) {
                updateState("failed", "The VPN tunnel could not be disconnected cleanly.")
                promise.reject("E_DISCONNECT", "The VPN tunnel could not be disconnected cleanly.")
            }
        }
    }

    @ReactMethod
    fun setSecureScreen(enabled: Boolean) {
        com.facebook.react.bridge.UiThreadUtil.runOnUiThread {
            val window = reactContext.currentActivity?.window ?: return@runOnUiThread
            if (enabled) {
                if (window.attributes.flags and WindowManager.LayoutParams.FLAG_SECURE == 0) {
                    window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                    secureFlagAddedByModule = true
                }
            } else if (secureFlagAddedByModule) {
                window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                secureFlagAddedByModule = false
            }
        }
    }

    private fun requestPermissionAndConnect() {
        val config = pendingConfig ?: return
        try {
            val permissionIntent = VpnService.prepare(reactContext)
            if (permissionIntent == null) {
                executor.execute { connectWithPermission(config) }
                return
            }
            val activity = reactContext.currentActivity
            if (activity == null) {
                failPending("E_ACTIVITY", "Open the app before granting Android VPN permission.")
                return
            }
            activity.startActivityForResult(permissionIntent, VPN_PERMISSION_REQUEST)
        } catch (error: Exception) {
            failPending(error)
        }
    }

    private fun connectWithPermission(config: Config) {
        try {
            val goBackend = backend ?: GoBackend(applicationContext).also { backend = it }
            val startedAt = System.currentTimeMillis()
            val newState = goBackend.setState(tunnel, Tunnel.State.UP, config)
            if (newState != Tunnel.State.UP) {
                throw HandshakeVerificationException("Android did not activate the VPN interface.")
            }
            val verification = verifyHandshake(goBackend, config, startedAt)
            updateState(
                "connected",
                handshake = verification.handshakeEpochMillis,
                receivedBytes = verification.rxBytes,
                transmittedBytes = verification.txBytes,
            )
            val promise = takePendingPromise()
            promise?.resolve(createStateMap())
        } catch (error: Exception) {
            try {
                backend?.setState(tunnel, Tunnel.State.DOWN, null)
            } catch (_: Exception) {
                // The original, safe error is more useful to the user.
            }
            failPending(error)
        } catch (error: LinkageError) {
            failPending("E_BACKEND", "The WireGuard native backend could not be loaded on this device.")
        }
    }

    private fun verifyHandshake(backend: GoBackend, config: Config, startedAt: Long): Verification {
        val targets = WireGuardConfigParser.probeAddresses(config)
        if (targets.isEmpty()) {
            throw HandshakeVerificationException(
                "No address inside AllowedIPs is available to verify the WireGuard handshake.",
            )
        }

        val deadline = SystemClock.elapsedRealtime() + HANDSHAKE_TIMEOUT_MS
        var lastProbeAt = 0L
        while (SystemClock.elapsedRealtime() < deadline) {
            val now = SystemClock.elapsedRealtime()
            if (now - lastProbeAt >= PROBE_INTERVAL_MS) {
                targets.forEach { target ->
                    DatagramSocket().use { socket ->
                        val payload = byteArrayOf(0)
                        socket.send(DatagramPacket(payload, payload.size, target, PROBE_PORT))
                    }
                }
                lastProbeAt = now
            }

            val statistics = backend.getStatistics(tunnel)
            for (peer in config.peers) {
                val peerStats = statistics.peer(peer.publicKey) ?: continue
                val latestHandshake = peerStats.latestHandshakeEpochMillis()
                if (latestHandshake >= startedAt - 5_000 && peerStats.rxBytes() > 0) {
                    return Verification(
                        handshakeEpochMillis = latestHandshake,
                        rxBytes = peerStats.rxBytes(),
                        txBytes = peerStats.txBytes(),
                    )
                }
            }
            Thread.sleep(250)
        }

        throw HandshakeVerificationException(
            "The VPN interface was created, but the peer did not complete a handshake. " +
                "Check the endpoint, keys, AllowedIPs, DNS, and network connectivity.",
        )
    }

    private fun createConfigSummary(config: Config): WritableMap {
        val summary = Arguments.createMap()
        summary.putArray("addresses", Arguments.fromList(config.`interface`.addresses.map { it.toString() }))
        summary.putArray(
            "dnsServers",
            Arguments.fromList(config.`interface`.dnsServers.map { it.hostAddress }),
        )
        summary.putArray(
            "allowedIps",
            Arguments.fromList(config.peers.flatMap { peer -> peer.allowedIps.map { it.toString() } }.distinct()),
        )
        summary.putArray(
            "endpoints",
            Arguments.fromList(config.peers.mapNotNull { peer -> peer.endpoint.orElse(null)?.toString() }),
        )
        summary.putInt("peerCount", config.peers.size)
        return summary
    }

    private fun createStateMap(): WritableMap {
        val state = Arguments.createMap()
        state.putString("status", status)
        if (statusMessage == null) state.putNull("message") else state.putString("message", statusMessage)
        state.putDouble("handshakeEpochMillis", handshakeEpochMillis.toDouble())
        state.putDouble("rxBytes", rxBytes.toDouble())
        state.putDouble("txBytes", txBytes.toDouble())
        state.putString("applicationId", applicationContext.packageName)
        return state
    }

    private fun updateState(
        newStatus: String,
        message: String? = null,
        handshake: Long = handshakeEpochMillis,
        receivedBytes: Long = rxBytes,
        transmittedBytes: Long = txBytes,
    ) {
        status = newStatus
        statusMessage = message
        handshakeEpochMillis = handshake
        rxBytes = receivedBytes
        txBytes = transmittedBytes
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(STATE_EVENT, createStateMap())
        }
    }

    private fun safeFailure(error: Exception): Pair<String, String> {
        return when (error) {
            is WireGuardConfigException -> "E_CONFIG_INVALID" to
                (error.message ?: "The WireGuard configuration is invalid.")
            is HandshakeVerificationException -> "E_HANDSHAKE" to
                (error.message ?: "The WireGuard handshake could not be verified.")
            is BackendException -> {
                when (error.reason) {
                    BackendException.Reason.DNS_RESOLUTION_FAILURE ->
                        "E_ENDPOINT_DNS" to "The WireGuard endpoint hostname could not be resolved."
                    BackendException.Reason.VPN_NOT_AUTHORIZED ->
                        "E_PERMISSION" to "Android VPN permission is required."
                    else ->
                        "E_BACKEND" to "Android could not start the WireGuard tunnel (${error.reason.name.lowercase().replace('_', ' ')})."
                }
            }
            is SecurityException -> "E_PERMISSION" to
                "Android denied VPN creation. Review VPN permission and any conflicting VPN profile."
            is IOException -> "E_VERIFY_NETWORK" to
                "The tunnel was created, but verification traffic could not be sent. Check AllowedIPs and connectivity."
            else -> "E_CONNECT" to "The WireGuard connection could not be established."
        }
    }

    private fun failPending(error: Exception) {
        val (code, message) = safeFailure(error)
        failPending(code, message)
    }

    private fun failPending(code: String, message: String) {
        updateState("failed", message)
        val promise = takePendingPromise()
        promise?.reject(code, message)
    }

    private fun takePendingPromise(): Promise? {
        return synchronized(pendingLock) {
            val promise = pendingPromise
            pendingPromise = null
            pendingConfig = null
            connecting = false
            promise
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != VPN_PERMISSION_REQUEST) return
        if (resultCode == Activity.RESULT_OK) {
            pendingConfig?.let { config -> executor.execute { connectWithPermission(config) } }
        } else {
            failPending("E_PERMISSION_DENIED", "Android VPN permission was not granted.")
        }
    }

    override fun onNewIntent(intent: Intent) = Unit

    override fun invalidate() {
        reactContext.removeActivityEventListener(this)
        val promise = takePendingPromise()
        promise?.reject("E_CANCELLED", "The VPN connection attempt was cancelled.")
        executor.shutdownNow()
        super.invalidate()
    }
}
