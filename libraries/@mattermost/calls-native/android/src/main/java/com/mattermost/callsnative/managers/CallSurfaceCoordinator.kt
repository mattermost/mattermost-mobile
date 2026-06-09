package com.mattermost.callsnative.managers

import android.app.Activity
import android.app.Application
import android.app.KeyguardManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import java.lang.ref.WeakReference
import com.mattermost.callsnative.ui.CallActivity
import com.mattermost.callsnative.utils.TurboLogger

/**
 * Tracks MainActivity foreground state and routes the user between
 * MainActivity and CallActivity (lock-aware fallback).
 *
 * Rules:
 *   - User backgrounds the app (home / app switcher) → leave them alone.
 *     Don't push CallActivity over their current screen.
 *   - User locks the screen WHILE the app was foreground + active call →
 *     launch CallActivity so the call surface is consistent when they
 *     wake the phone.
 *   - User locks the screen while app was already backgrounded → do
 *     nothing. The CallStyle notification is the lock-screen entry point.
 *   - User opens MainActivity → finish CallActivity.
 *   - CallActivity → avatar tap → MainActivity (handled by CallActivity
 *     calling [launchMainActivity]).
 */
object CallSurfaceCoordinator : Application.ActivityLifecycleCallbacks {
    private const val TAG = "MMCalls/CallSurfaceCoordinator"

    private var initialized = false
    private var appContext: Context? = null
    @Volatile private var callActivityRef: WeakReference<CallActivity>? = null
    @Volatile private var mainActivityForeground = false

    fun initialize(app: Application) {
        if (initialized) return
        initialized = true
        appContext = app.applicationContext
        app.registerActivityLifecycleCallbacks(this)

        val filter = IntentFilter(Intent.ACTION_SCREEN_OFF)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            app.registerReceiver(screenReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            app.registerReceiver(screenReceiver, filter)
        }
    }

    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}

    override fun onActivityStarted(activity: Activity) {
        if (activity is CallActivity) {
            callActivityRef = WeakReference(activity)
            return
        }
        if (isMainActivity(activity)) {
            mainActivityForeground = true
            // MainActivity took over — finish the lock-aware surface.
            finishCallActivity()
        }
    }

    override fun onActivityResumed(activity: Activity) {}
    override fun onActivityPaused(activity: Activity) {}

    override fun onActivityStopped(activity: Activity) {
        if (activity is CallActivity) {
            val current = callActivityRef?.get()
            if (current === activity) {
                callActivityRef = null
            }
            return
        }
        if (isMainActivity(activity)) {
            mainActivityForeground = false
        }
    }

    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
    override fun onActivityDestroyed(activity: Activity) {}

    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action != Intent.ACTION_SCREEN_OFF) return
            // Only auto-launch CallActivity if MainActivity was foreground
            // at the moment the screen turned off. If the app was already
            // backgrounded, leave them alone; the notification is the
            // lock-screen entry point.
            if (mainActivityForeground && CallRegistry.hasActiveCalls()) {
                maybeLaunchCallActivity()
            }
        }
    }

    private fun maybeLaunchCallActivity() {
        if (callActivityRef?.get() != null) return
        val uuid = CallRegistry.firstActiveUuid() ?: return
        val ctx = appContext ?: return
        val intent = Intent(ctx, CallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(CallActivity.EXTRA_UUID, uuid)
        }
        try {
            ctx.startActivity(intent)
        } catch (e: Exception) {
            TurboLogger.e(TAG, "launch CallActivity failed: ${e.message}")
        }
    }

    private fun finishCallActivity() {
        val activity = callActivityRef?.get() ?: return
        if (!activity.isFinishing) {
            activity.finish()
        }
        callActivityRef = null
    }

    fun launchMainActivity() {
        val ctx = appContext ?: return
        val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName) ?: return
        launch.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_SINGLE_TOP,
        )
        try {
            ctx.startActivity(launch)
        } catch (e: Exception) {
            TurboLogger.e(TAG, "launch MainActivity failed: ${e.message}")
        }
    }

    fun isMainActivityForeground(): Boolean = mainActivityForeground

    fun isKeyguardLocked(): Boolean {
        val km = appContext?.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager ?: return false
        return km.isKeyguardLocked
    }

    private fun isMainActivity(activity: Activity): Boolean {
        return activity.javaClass.name.endsWith(".MainActivity")
    }
}
