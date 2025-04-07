package com.mattermost.hardware.keyboard

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class MattermostHardwareKeyboardPackage : TurboReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return if (name == MattermostHardwareKeyboardImpl.NAME) {
            MattermostHardwareKeyboardModule(reactContext)
        } else {
            null
        }
    }

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(
                MattermostHardwareKeyboardImpl.NAME to ReactModuleInfo(
                        MattermostHardwareKeyboardImpl.NAME,
                        MattermostHardwareKeyboardImpl.NAME,
                    _canOverrideExistingModule = false,
                    _needsEagerInit = false,
                    isCxxModule = false,
                    isTurboModule = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
                )
        )
    }
}
