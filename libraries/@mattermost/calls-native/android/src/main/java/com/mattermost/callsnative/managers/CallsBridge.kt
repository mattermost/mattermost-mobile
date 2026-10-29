package com.mattermost.callsnative.managers

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.mattermost.callsnative.utils.TurboLogger
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Singleton bridging native Telecom / FCM callbacks to the JS layer.
 *
 *  - Events emitted while RN is still booting are buffered until [markJSListenersReady]
 *    is invoked from the TurboModule's `addListener`.
 */
object CallsBridge {
    private const val TAG = "MMCalls/CallsBridge"

    enum class Event {
        VoIPTokenUpdated,
        IncomingCall,
        CallAnswered,
        CallDeclined,
        CallEnded,
        CallMuted,
    }

    private val booted = AtomicBoolean(false)
    private val jsReady = AtomicBoolean(false)
    private val flushPosted = AtomicBoolean(false)
    private val mainHandler = Handler(Looper.getMainLooper())

    @Volatile private var reactContext: ReactApplicationContext? = null

    private data class PendingEvent(val name: String, val body: WritableMap?)
    private val pending = ArrayDeque<PendingEvent>()
    private val pendingLock = Any()

    fun bootstrap(context: Context) {
        if (booted.getAndSet(true)) {
            return
        }
        try {
            PhoneAccountRegistrar.register(context)
            val app = (context as? android.app.Application)
                ?: (context.applicationContext as? android.app.Application)
            if (app != null) {
                CallSurfaceCoordinator.initialize(app)
            }
        } catch (e: Exception) {
            // Call UI is optional at process bootstrap. An OEM Telecom or
            // receiver failure must not prevent the rest of the app starting.
            TurboLogger.e(TAG, "bootstrap failed: ${e.message}")
        }
    }

    // True when RN is running AND our JS listeners are attached. Callers
    // use this to skip booting a headless task when the live runtime is
    // already prepared to receive events.
    fun isJSReady(): Boolean {
        val ctx = reactContext ?: return false
        return jsReady.get() && ctx.hasActiveReactInstance()
    }

    internal fun attachReactContext(ctx: ReactApplicationContext) {
        reactContext = ctx
    }

    internal fun detachReactContext(ctx: ReactApplicationContext) {
        if (reactContext === ctx) {
            reactContext = null
            jsReady.set(false)
        }
    }

    fun markJSListenersReady() {
        jsReady.set(true)
        if (flushPosted.compareAndSet(false, true)) {
            mainHandler.post { flushBuffered() }
        }
    }

    private fun flushBuffered() {
        flushPosted.set(false)
        val ctx = reactContext ?: return
        if (!jsReady.get() || !ctx.hasActiveReactInstance()) return

        // Keep events queued when the runtime disappears between the flush
        // being posted and executed. Clearing first would lose the only
        // incoming-call mapping needed to answer or tear down the call.
        val toFlush: List<PendingEvent>
        synchronized(pendingLock) {
            if (pending.isEmpty()) return
            toFlush = pending.toList()
            pending.clear()
        }
        for (event in toFlush) {
            ctx.emitDeviceEvent(event.name, event.body)
        }
    }

    fun markJSListenersGone() {
        jsReady.set(false)
        flushPosted.set(false)
    }

    fun send(event: Event, body: Map<String, Any?>? = null) {
        val payload = body?.toWritableMap()
        if (jsReady.get()) {
            val ctx = reactContext
            if (ctx != null && ctx.hasActiveReactInstance()) {
                ctx.emitDeviceEvent(event.name, payload)
                return
            }
        }
        synchronized(pendingLock) {
            pending.addLast(PendingEvent(event.name, payload))
        }
    }

    private fun Map<String, Any?>.toWritableMap(): WritableMap {
        val map = Arguments.createMap()
        for ((key, value) in this) {
            when (value) {
                null -> map.putNull(key)
                is String -> map.putString(key, value)
                is Boolean -> map.putBoolean(key, value)
                is Int -> map.putInt(key, value)
                is Long -> map.putDouble(key, value.toDouble())
                is Double -> map.putDouble(key, value)
                is Float -> map.putDouble(key, value.toDouble())
                else -> map.putString(key, value.toString())
            }
        }
        return map
    }
}
