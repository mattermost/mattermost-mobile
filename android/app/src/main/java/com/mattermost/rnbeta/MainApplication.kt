package com.mattermost.rnbeta


import android.annotation.SuppressLint
import android.app.Application
import android.content.Context
import android.content.res.Configuration
import android.os.Bundle
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.modules.network.OkHttpClientProvider
import com.mattermost.networkclient.RCTOkHttpClientFactory
import com.mattermost.rnshare.helpers.RealPathUtil
import com.mattermost.turbolog.TurboLog
import com.mattermost.turbolog.ConfigureOptions
import io.sentry.react.RNSentrySDK
import com.nozbe.watermelondb.jsi.WatermelonDBJSIPackage
import com.wix.reactnativenotifications.core.AppLaunchHelper
import com.wix.reactnativenotifications.core.AppLifecycleFacade
import com.wix.reactnativenotifications.core.JsIOHelper
import com.wix.reactnativenotifications.core.notification.INotificationsApplication
import com.wix.reactnativenotifications.core.notification.IPushNotification
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory
import expo.modules.image.okhttp.ExpoImageOkHttpClientGlideModule
import java.io.File

class MainApplication : Application(), ReactApplication, INotificationsApplication {

    override val reactHost: ReactHost by lazy {
        DefaultNewArchitectureEntryPoint.releaseLevel = try {
            ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
        } catch (e: IllegalArgumentException) {
            ReleaseLevel.STABLE
        }
        ExpoReactHostFactory.getDefaultReactHost(
            context = applicationContext,
            packageList = PackageList(this).packages.apply {
                add(WatermelonDBJSIPackage())
            },
            jsMainModulePath = "index"
        )
    }

    override fun onCreate() {
        super.onCreate()

        // Initialize Sentry early for native crash reporting
        RNSentrySDK.init(this)

        // Delete any previous temp files created by the app
        val tempFolder = File(applicationContext.cacheDir, RealPathUtil.CACHE_DIR_NAME)
        RealPathUtil.deleteTempFiles(tempFolder)
        TurboLog.configure(options = ConfigureOptions(logsDirectory = applicationContext.cacheDir.absolutePath + "/logs", logPrefix = applicationContext.packageName))

        TurboLog.i("ReactNative", "Cleaning temp cache " + tempFolder.absolutePath)

        // Tells React Native to use our RCTOkHttpClientFactory which builds an OKHttpClient
        // with a cookie jar defined in APIClientModule and an interceptor to intercept all
        // requests that originate from React Native's OKHttpClient
        OkHttpClientProvider.setOkHttpClientFactory(RCTOkHttpClientFactory())
        ExpoImageOkHttpClientGlideModule.okHttpClient = RCTOkHttpClientFactory().createNewNetworkModuleClient()

        loadReactNative(this)
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
        reactHost.currentReactContext?.runOnJSQueueThread {
            action()
        } ?: UiThreadUtil.runOnUiThread {
            reactHost.currentReactContext?.runOnJSQueueThread {
                action()
            }
        }
    }
}
