package com.mattermost.share

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.JavaScriptModule
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.mattermost.rnbeta.MainApplication
import java.util.*

class SharePackage(application: MainApplication) : ReactPackage {
    var mApplication: MainApplication

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return Arrays.asList<NativeModule>(ShareModule(mApplication, reactContext))
    }
    fun createJSModules(): List<Class<out JavaScriptModule?>> = emptyList()
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()

    init {
        mApplication = application
    }
}
