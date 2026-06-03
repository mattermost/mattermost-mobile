package com.mattermost.rnbeta

import android.content.Intent
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import androidx.core.view.WindowCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.mattermost.hardware.keyboard.MattermostHardwareKeyboardImpl
import com.mattermost.rnutils.helpers.FoldableObserver
import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
    private var HWKeyboardConnected = false
    private val foldableObserver = FoldableObserver.getInstance(this)
    private var lastOrientation: Int = Configuration.ORIENTATION_UNDEFINED

    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String = "Mattermost"

    /**
     * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
     * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        ReactActivityDelegateWrapper(this, BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
                DefaultReactActivityDelegate(this, mainComponentName, DefaultNewArchitectureEntryPoint.fabricEnabled))


    override fun onCreate(savedInstanceState: Bundle?) {
        Log.d("MMNotifTest", "MainActivity.onCreate intent=" + intent + " extras=" + intent?.extras?.keySet())
        super.onCreate(savedInstanceState)

        setHWKeyboardConnected()
        lastOrientation = this.resources.configuration.orientation
        foldableObserver.onCreate()
        WindowCompat.setDecorFitsSystemWindows(window, Build.VERSION.SDK_INT < Build.VERSION_CODES.R)
    }

    override fun onNewIntent(intent: Intent) {
        Log.d("MMNotifTest", "MainActivity.onNewIntent intent=" + intent + " extras=" + intent.extras?.keySet())
        super.onNewIntent(intent)
    }

    override fun onResume() {
        Log.d("MMNotifTest", "MainActivity.onResume")
        super.onResume()
    }

    override fun onPause() {
        Log.d("MMNotifTest", "MainActivity.onPause")
        super.onPause()
    }

    override fun onStart() {
        Log.d("MMNotifTest", "MainActivity.onStart")
        super.onStart()
        foldableObserver.onStart()
    }

    override fun onStop() {
        Log.d("MMNotifTest", "MainActivity.onStop")
        super.onStop()
        foldableObserver.onStop()
    }

    override fun onDestroy() {
        Log.d("MMNotifTest", "MainActivity.onDestroy isFinishing=" + isFinishing + " isChangingConfigurations=" + isChangingConfigurations)
        super.onDestroy()
        foldableObserver.onDestroy()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        val newOrientation = newConfig.orientation
        if (newOrientation != lastOrientation) {
            lastOrientation = newOrientation
            foldableObserver.handleWindowLayoutInfo()
        }
        if (newConfig.hardKeyboardHidden == Configuration.HARDKEYBOARDHIDDEN_NO) {
            HWKeyboardConnected = true
        } else if (newConfig.hardKeyboardHidden == Configuration.HARDKEYBOARDHIDDEN_YES) {
            HWKeyboardConnected = false
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (HWKeyboardConnected) {
            val ok = MattermostHardwareKeyboardImpl.dispatchKeyEvent(event)
            if (ok) {
                return true
            }
        }
        return super.dispatchKeyEvent(event)
    }

    private fun setHWKeyboardConnected() {
        HWKeyboardConnected = getResources().configuration.keyboard == Configuration.KEYBOARD_QWERTY
    }
}
