package com.mattermost.rnbeta

import android.content.Context
import android.os.Bundle
import android.util.Log

import com.facebook.react.PackageList
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.JSIModulePackage
import com.facebook.react.bridge.JSIModuleSpec
import com.facebook.react.bridge.JavaScriptContextHolder
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.flipper.ReactNativeFlipper
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.modules.network.OkHttpClientProvider
import com.facebook.soloader.SoLoader

import com.mattermost.helpers.RealPathUtil
import com.mattermost.networkclient.RCTOkHttpClientFactory
import com.mattermost.share.ShareModule

import com.nozbe.watermelondb.jsi.WatermelonDBJSIPackage

import com.reactnativenavigation.NavigationApplication

import com.wix.reactnativenotifications.RNNotificationsPackage
import com.wix.reactnativenotifications.core.AppLaunchHelper
import com.wix.reactnativenotifications.core.AppLifecycleFacade
import com.wix.reactnativenotifications.core.JsIOHelper
import com.wix.reactnativenotifications.core.notification.INotificationsApplication
import com.wix.reactnativenotifications.core.notification.IPushNotification

import java.io.File

class MainApplication : NavigationApplication(), INotificationsApplication {
    var instance: MainApplication? = null
    var sharedExtensionIsOpened = false

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this).packages.apply {
                    // Packages that cannot be autolinked yet can be added manually here, for example:
                    // add(MyReactNativePackage())
                    add(RNNotificationsPackage(this@MainApplication))
                    add(object : TurboReactPackage() {
                        override fun getModule(
                            name: String,
                            reactContext: ReactApplicationContext
                        ): NativeModule {
                            return when (name) {
                                "MattermostManaged" -> MattermostManagedModule.getInstance(
                                    reactContext
                                )
                                "MattermostShare" -> ShareModule.getInstance(reactContext)
                                "Notifications" -> NotificationsModule.getInstance(
                                    instance,
                                    reactContext
                                )
                                "SplitView" -> SplitViewModule.getInstance(
                                    reactContext
                                )
                                else ->
                                    throw IllegalArgumentException("Could not find module $name")
                            }
                        }

                        override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
                            return ReactModuleInfoProvider {
                                val map: MutableMap<String, ReactModuleInfo> = java.util.HashMap()
                                map["MattermostManaged"] = ReactModuleInfo(
                                    "MattermostManaged",
                                    "com.mattermost.rnbeta.MattermostManagedModule",
                                    false,
                                    false,
                                    false,
                                    false
                                )
                                map["MattermostShare"] = ReactModuleInfo(
                                    "MattermostShare",
                                    "com.mattermost.share.ShareModule",
                                    false,
                                    false,
                                    false,
                                    false
                                )
                                map["Notifications"] = ReactModuleInfo(
                                    "Notifications",
                                    "com.mattermost.rnbeta.NotificationsModule",
                                    false,
                                    false,
                                    false,
                                    false
                                )
                                map["SplitView"] = ReactModuleInfo(
                                    "SplitView",
                                    "com.mattermost.rnbeta.SplitViewModule",
                                    false,
                                    false,
                                    false,
                                    false
                                )
                                map
                            }
                        }
                    })
                }

            override fun getJSIModulePackage(): JSIModulePackage {
                return JSIModulePackage { reactApplicationContext: ReactApplicationContext?, jsContext: JavaScriptContextHolder? ->
                    val modules =
                        mutableListOf<JSIModuleSpec<*>>()
                    modules.addAll(
                        WatermelonDBJSIPackage().getJSIModules(
                            reactApplicationContext,
                            jsContext
                        )
                    )
                    modules
                }
            }

            override fun getJSMainModuleName(): String = "index"

            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }

    override val reactHost: ReactHost
        get() = getDefaultReactHost(this.applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        instance = this
        val context: Context = applicationContext

        // Delete any previous temp files created by the app
        val tempFolder = File(context.cacheDir, RealPathUtil.CACHE_DIR_NAME)
        RealPathUtil.deleteTempFiles(tempFolder)
        Log.i("ReactNative", "Cleaning temp cache " + tempFolder.absolutePath)

        // Tells React Native to use our RCTOkHttpClientFactory which builds an OKHttpClient
        // with a cookie jar defined in APIClientModule and an interceptor to intercept all
        // requests that originate from React Native's OKHttpClient

        // Tells React Native to use our RCTOkHttpClientFactory which builds an OKHttpClient
        // with a cookie jar defined in APIClientModule and an interceptor to intercept all
        // requests that originate from React Native's OKHttpClient
        OkHttpClientProvider.setOkHttpClientFactory(RCTOkHttpClientFactory())

        SoLoader.init(this, false)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // If you opted-in for the New Architecture, we load the native entry point for this app.
            load()
        }
        ReactNativeFlipper.initializeFlipper(this, reactNativeHost.reactInstanceManager)
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
}
