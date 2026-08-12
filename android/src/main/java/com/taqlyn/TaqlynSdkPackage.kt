package com.taqlyn

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.margelo.nitro.taqlyn.TaqlynSdkOnLoad

class TaqlynSdkPackage : BaseReactPackage() {
  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? {
    appContext = reactContext.applicationContext
    return null
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider { emptyMap() }

  companion object {
    @JvmStatic
    var appContext: android.content.Context? = null

    init {
      TaqlynSdkOnLoad.initializeNative()
    }
  }
}
