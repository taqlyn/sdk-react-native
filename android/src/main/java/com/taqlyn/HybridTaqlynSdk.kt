package com.taqlyn

import android.content.Context
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import com.margelo.nitro.taqlyn.DeferredLinkPayload
import com.margelo.nitro.taqlyn.HybridTaqlynSdkSpec
import com.taqlyn.bridge.TaqlynSdkCoreBridge
import com.taqlyn.bridge.WireDeferredLink
import java.util.HashMap

/**
 * Nitro Hybrid → [TaqlynSdkCoreBridge] → Android SdkCore.
 * Matching / Install Referrer stay in SdkCore.
 */
@DoNotStrip
@Keep
class HybridTaqlynSdk : HybridTaqlynSdkSpec() {
  override fun configure(
    clientId: String,
    publicKeyId: String,
    apiBaseUrl: String,
    linkProcessingMode: String,
    env: String,
  ) {
    TaqlynSdkCoreBridge.configure(
      clientId = clientId,
      publicKeyId = publicKeyId,
      apiBaseUrl = apiBaseUrl,
      linkProcessingMode = linkProcessingMode,
      env = env,
      context = resolveAppContext(),
    )
  }

  override fun resolveDeferred(): Promise<DeferredLinkPayload?> =
    Promise.async {
      TaqlynSdkCoreBridge.resolveDeferred()?.toPayload()
    }

  override fun addLinkListener(listener: (link: DeferredLinkPayload) -> Unit) {
    TaqlynSdkCoreBridge.observeLinks { wire ->
      listener(wire.toPayload())
    }
  }

  override fun removeLinkListener() {
    TaqlynSdkCoreBridge.stopObserving()
  }

  override fun consume(linkId: String) {
    TaqlynSdkCoreBridge.consume(linkId)
  }

  override fun setReadyForNavigation(ready: Boolean) {
    TaqlynSdkCoreBridge.setReadyForNavigation(ready)
  }

  private fun resolveAppContext(): Context {
    TaqlynSdkPackage.appContext?.let { return it }
    val at = Class.forName("android.app.ActivityThread")
    val app = at.getMethod("currentApplication").invoke(null) as? Context
    return requireNotNull(app?.applicationContext) {
      "Android Context required for SdkCore.configure — ensure TaqlynSdkPackage is linked"
    }
  }

  private fun WireDeferredLink.toPayload(): DeferredLinkPayload =
    DeferredLinkPayload(
      url = url,
      path = path,
      params = HashMap(params),
      linkId = linkId,
      matchType = matchType,
      isDeferred = isDeferred,
      campaignJson = campaignJson,
    )
}
