package com.mattermost.rnutils

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class RNUtilsPackage : TurboReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return if (name == RNUtilsModuleImpl.NAME) {
            RNUtilsModule(reactContext)
        } else {
            null
        }
    }

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(
                RNUtilsModuleImpl.NAME to ReactModuleInfo(
                        RNUtilsModuleImpl.NAME,
                        RNUtilsModuleImpl.NAME,
                    _canOverrideExistingModule = false,
                    _needsEagerInit = false,
                    isCxxModule = false,
                    isTurboModule = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
                )
        )
    }
}
