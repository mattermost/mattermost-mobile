package com.mattermost.rnbeta

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import java.util.*
import javax.annotation.Nonnull

class RNPasteableTextInputPackage : ReactPackage {
    @Nonnull
    override fun createNativeModules(@Nonnull reactContext: ReactApplicationContext): List<NativeModule> {
        return emptyList()
    }

    @Nonnull
    override fun createViewManagers(@Nonnull reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return Arrays.asList(
                RNPasteableTextInputManager()
        )
    }
}
