package com.mattermost.callsnative.managers

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import androidx.annotation.RequiresApi
import androidx.core.telecom.CallsManager
import java.util.concurrent.atomic.AtomicBoolean
import com.mattermost.callsnative.utils.TurboLogger

object PhoneAccountRegistrar {
    private const val TAG = "MMCalls/PhoneAccountRegistrar"

    private val registered = AtomicBoolean(false)

    @SuppressLint("StaticFieldLeak")
    @Volatile private var cachedManager: CallsManager? = null

    fun register(context: Context) {
        if (registered.get() || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        registerInternal(context)
    }

    @RequiresApi(Build.VERSION_CODES.O)
    private fun registerInternal(context: Context) {
        val appContext = context.applicationContext
        val manager = CallsManager(appContext)
        try {
            manager.registerAppWithTelecom(CallsManager.CAPABILITY_SUPPORTS_VIDEO_CALLING)
            cachedManager = manager
            registered.set(true)
        } catch (e: SecurityException) {
            TurboLogger.e(TAG, "registerAppWithTelecom denied: ${e.message}")
        } catch (e: UnsupportedOperationException) {
            TurboLogger.e(TAG, "Telecom unsupported on this device: ${e.message}")
        }
    }

    fun isUsable(): Boolean = registered.get() && cachedManager != null

    fun getCallsManager(): CallsManager? = cachedManager
}
