package com.mattermost.rnbeta

import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import android.view.KeyEvent
import androidx.activity.OnBackPressedCallback
import androidx.core.view.WindowCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.mattermost.hardware.keyboard.MattermostHardwareKeyboardImpl
import com.mattermost.rnutils.helpers.FoldableObserver
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory;
import com.wix.reactnativenotifications.core.AppLifecycleFacadeHolder
import com.wix.reactnativenotifications.core.NotificationIntentAdapter
import com.wix.reactnativenotifications.core.notification.PushNotification
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
        supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
        super.onCreate(savedInstanceState)

        setHWKeyboardConnected()
        lastOrientation = this.resources.configuration.orientation
        foldableObserver.onCreate()
        WindowCompat.setDecorFitsSystemWindows(window, false)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)

        // When the process was killed but the task survived, Android recreates this activity with its
        // previous intent and delivers the notification tap here. React is not ready yet, so the
        // notifications module never sees it; hand it over so it becomes the initial notification.
        if (NotificationIntentAdapter.canHandleIntent(intent) && !AppLifecycleFacadeHolder.get().isReactInitialized()) {
            val data = NotificationIntentAdapter.extractPendingNotificationDataFromIntent(intent)
            PushNotification.get(applicationContext, data)?.onOpened()
        }
    }

    override fun onStart() {
        super.onStart()
        foldableObserver.onStart()
    }

    override fun onStop() {
        super.onStop()
        foldableObserver.onStop()
    }

    override fun onDestroy() {
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

    // Prebuilt react-android leaves ReactActivity's back callback disabled after
    // invokeDefaultOnBackPressed(). Re-enable it so back handling works after resume.
    // Remove when upgrading to React Native 0.84.0 or later.
    override fun invokeDefaultOnBackPressed() {
        super.invokeDefaultOnBackPressed()
        reactBackPressedCallback?.isEnabled = true
    }

    private val reactBackPressedCallback: OnBackPressedCallback? by lazy {
        try {
            val field = ReactActivity::class.java.getDeclaredField("mBackPressedCallback")
            field.isAccessible = true
            field.get(this) as? OnBackPressedCallback
        } catch (_: ReflectiveOperationException) {
            null
        }
    }

    private fun setHWKeyboardConnected() {
        HWKeyboardConnected = getResources().configuration.keyboard == Configuration.KEYBOARD_QWERTY
    }
}
