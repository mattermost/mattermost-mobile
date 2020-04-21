package com.mattermost.rnbeta

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.provider.Settings
import android.util.ArraySet
import android.util.Log
import android.view.WindowManager
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter

class MattermostManagedModule private constructor(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), LifecycleEventListener {
    private val restrictionsFilter = IntentFilter(Intent.ACTION_APPLICATION_RESTRICTIONS_CHANGED)
    private val restrictionsReceiver: BroadcastReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
            val managedConfig: Bundle = MainApplication.instance.loadManagedConfig(ctx)
            // Check current configuration settings, change your app's UI and
            // functionality as necessary.
            Log.i(TAG, "Managed Configuration Changed")
            sendConfigChanged(managedConfig)
            handleBlurScreen(managedConfig)
        }
    }

    override fun getName(): String {
        return "MattermostManaged"
    }

    @ReactMethod
    fun getConfig(promise: Promise) {
        try {
            val config: Bundle = MainApplication.instance.getManagedConfig()
            val result: Any = Arguments.fromBundle(config)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.resolve(Arguments.createMap())
        }
    }

    @ReactMethod // Close the current activity and open the security settings.
    fun goToSecuritySettings() {
        val intent = Intent(Settings.ACTION_SECURITY_SETTINGS)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        reactApplicationContext.startActivity(intent)
        currentActivity!!.finish()
        System.exit(0)
    }

    @ReactMethod
    fun isRunningInSplitView(promise: Promise) {
        val result = Arguments.createMap()
        val current = currentActivity
        if (current != null) {
            result.putBoolean("isSplitView", current.isInMultiWindowMode)
        } else {
            result.putBoolean("isSplitView", false)
        }
        promise.resolve(result)
    }

    @ReactMethod
    fun quitApp() {
        currentActivity!!.finish()
        System.exit(0)
    }

    override fun onHostResume() {
        val activity = currentActivity
        val managedConfig = MainApplication.instance.getManagedConfig()
        if (activity != null) {
            activity.registerReceiver(restrictionsReceiver, restrictionsFilter)
        }
        val ctx = MainApplication.instance.getRunningReactContext()
        var newManagedConfig = MainApplication.instance.loadManagedConfig(ctx)
        if (!equalBundles(newManagedConfig, managedConfig)) {
            Log.i(TAG, "onResumed Managed Configuration Changed")
            sendConfigChanged(newManagedConfig)
        }
        handleBlurScreen(newManagedConfig)
    }

    override fun onHostPause() {
        val activity = currentActivity
        if (activity != null) {
            try {
                activity.unregisterReceiver(restrictionsReceiver)
            } catch (e: IllegalArgumentException) { // Just ignore this cause the receiver wasn't registered for this activity
            }
        }
    }

    override fun onHostDestroy() {}
    private fun handleBlurScreen(config: Bundle?) {
        val activity = currentActivity
        var blurAppScreen = false
        if (config != null) {
            blurAppScreen = java.lang.Boolean.parseBoolean(config.getString("blurApplicationScreen"))
        }
        if (blurAppScreen) {
            activity!!.window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)
        } else {
            activity!!.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
    }

    private fun sendConfigChanged(config: Bundle?) {
        var result = Arguments.createMap()
        if (config != null) {
            result = Arguments.fromBundle(config)
        }
        val ctx = MainApplication.instance.getRunningReactContext()
        ctx.getJSModule(RCTDeviceEventEmitter::class.java)?.emit("managedConfigDidChange", result)
    }

    private fun equalBundles(one: Bundle?, two: Bundle?): Boolean {
        if (one == null && two == null) {
            return true
        }
        if (one == null || two == null) return false
        if (one.size() != two.size()) return false
        val setOne: MutableSet<String> = ArraySet()
        setOne.addAll(one.keySet())
        setOne.addAll(two.keySet())
        var valueOne: Any?
        var valueTwo: Any?
        for (key in setOne) {
            if (!one.containsKey(key) || !two.containsKey(key)) return false
            valueOne = one[key]
            valueTwo = two[key]
            if (valueOne is Bundle && valueTwo is Bundle &&
                    !equalBundles(valueOne as Bundle?, valueTwo as Bundle?)) {
                return false
            } else if (valueOne == null) {
                if (valueTwo != null) return false
            } else if (valueOne != valueTwo) return false
        }
        return true
    }

    companion object {
        var instance: MattermostManagedModule? = null
            private set
        private val TAG = MattermostManagedModule::class.java.simpleName
        @JvmStatic
        fun getInstance(reactContext: ReactApplicationContext): MattermostManagedModule? {
            if (instance == null) {
                instance = MattermostManagedModule(reactContext)
            }
            return instance
        }

    }

    init {
        reactContext.addLifecycleEventListener(this)
    }
}
