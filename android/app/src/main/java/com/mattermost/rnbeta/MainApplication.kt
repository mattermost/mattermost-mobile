package com.mattermost.rnbeta


import android.annotation.SuppressLint
import android.content.Context
import android.content.res.Configuration
import android.os.Bundle
import com.facebook.react.PackageList
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.react.modules.network.OkHttpClientProvider
import com.facebook.soloader.SoLoader
import com.mattermost.networkclient.RCTOkHttpClientFactory
import com.mattermost.rnshare.helpers.RealPathUtil
import com.mattermost.turbolog.TurboLog
import com.mattermost.turbolog.ConfigureOptions
import com.nozbe.watermelondb.jsi.JSIInstaller
import com.nozbe.watermelondb.jsi.WatermelonDBJSIPackage
import com.reactnativenavigation.NavigationApplication
import com.wix.reactnativenotifications.RNNotificationsPackage
import com.wix.reactnativenotifications.core.AppLaunchHelper
import com.wix.reactnativenotifications.core.AppLifecycleFacade
import com.wix.reactnativenotifications.core.JsIOHelper
import com.wix.reactnativenotifications.core.notification.INotificationsApplication
import com.wix.reactnativenotifications.core.notification.IPushNotification
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper
import expo.modules.image.okhttp.ExpoImageOkHttpClientGlideModule
import java.io.File

class MainApplication : NavigationApplication(), INotificationsApplication {
    private var listenerAdded = false

    override val reactNativeHost: ReactNativeHost =
        ReactNativeHostWrapper(this,
            object : DefaultReactNativeHost(this) {
                override fun getPackages(): List<ReactPackage> =
                    PackageList(this).packages.apply {
                        // Packages that cannot be autolinked yet can be added manually here, for example:
                        // add(MyReactNativePackage())
                        add(RNNotificationsPackage(this@MainApplication))
                        add(WatermelonDBJSIPackage())
                    }

                override fun getJSMainModuleName(): String = "index"

                override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

                override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
                override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
            })

    override val reactHost: ReactHost
        get() = getDefaultReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()

        // Delete any previous temp files created by the app
        val tempFolder = File(applicationContext.cacheDir, RealPathUtil.CACHE_DIR_NAME)
        RealPathUtil.deleteTempFiles(tempFolder)
        TurboLog.configure(options = ConfigureOptions(logsDirectory = applicationContext.cacheDir.absolutePath + "/logs", logPrefix = applicationContext.packageName))

        TurboLog.i("ReactNative", "Cleaning temp cache " + tempFolder.absolutePath)

        // Tells React Native to use our RCTOkHttpClientFactory which builds an OKHttpClient
        // with a cookie jar defined in APIClientModule and an interceptor to intercept all
        // requests that originate from React Native's OKHttpClient

        // Tells React Native to use our RCTOkHttpClientFactory which builds an OKHttpClient
        // with a cookie jar defined in APIClientModule and an interceptor to intercept all
        // requests that originate from React Native's OKHttpClient
        OkHttpClientProvider.setOkHttpClientFactory(RCTOkHttpClientFactory())
        ExpoImageOkHttpClientGlideModule.okHttpClient = RCTOkHttpClientFactory().createNewNetworkModuleClient()

        SoLoader.init(this, OpenSourceMergedSoMapping)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // If you opted-in for the New Architecture, we load the native entry point for this app.
            load(bridgelessEnabled = false)
        }
        ApplicationLifecycleDispatcher.onApplicationCreate(this)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
    }

    override fun getPushNotification(
        context: Context?,
        bundle: Bundle?,
        defaultFacade: AppLifecycleFacade?,
        defaultAppLaunchHelper: AppLaunchHelper?
    ): IPushNotification {
        return CustomPushNotification(
            context!!,
            bundle!!,
            defaultFacade!!,
            defaultAppLaunchHelper!!,
            JsIOHelper()
        )
    }

    @SuppressLint("VisibleForTests")
    private fun runOnJSQueueThread(action: () -> Unit) {
        reactNativeHost.reactInstanceManager.currentReactContext?.runOnJSQueueThread {
            action()
        } ?: UiThreadUtil.runOnUiThread {
            reactNativeHost.reactInstanceManager.currentReactContext?.runOnJSQueueThread {
                action()
            }
        }
    }
}
