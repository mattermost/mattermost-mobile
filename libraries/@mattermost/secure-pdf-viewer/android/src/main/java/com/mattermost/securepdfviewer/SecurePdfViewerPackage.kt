package com.mattermost.securepdfviewer

import com.facebook.react.ReactPackage
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.bridge.NativeModule

class SecurePdfViewerPackage : ReactPackage {

    override fun createNativeModules(reactContext: com.facebook.react.bridge.ReactApplicationContext): List<NativeModule> {
        return emptyList()
    }

    override fun createViewManagers(reactContext: com.facebook.react.bridge.ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(SecurePdfViewerViewManager())
    }
}
