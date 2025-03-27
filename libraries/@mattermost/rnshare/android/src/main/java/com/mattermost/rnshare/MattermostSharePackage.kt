package com.mattermost.rnshare

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class MattermostSharePackage : TurboReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == MattermostShareImpl.NAME) {
      MattermostShareModule(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      val moduleInfos: MutableMap<String, ReactModuleInfo> = HashMap()
      val isTurboModule: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      moduleInfos[MattermostShareImpl.NAME] = ReactModuleInfo(
        MattermostShareImpl.NAME,
        MattermostShareImpl.NAME,
          _canOverrideExistingModule = false,
          _needsEagerInit = false,
          isCxxModule = false,
          isTurboModule = isTurboModule
      )
      moduleInfos
    }
  }
}
