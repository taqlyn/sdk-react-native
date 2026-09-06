import Foundation
import NitroModules
import TaqlynSDK

/**
 Nitro Hybrid → `TaqlynSdkCoreBridge` → iOS `SdkCore`.
 Matching / pasteboard stay in TaqlynSDK.SdkCore.
 */
class HybridTaqlynSdk: HybridTaqlynSdkSpec {
  func configure(
    clientId: String,
    publicKeyId: String,
    apiBaseUrl: String,
    linkProcessingMode: String,
    env: String
  ) throws {
    _ = apiBaseUrl
    TaqlynSdkCoreBridge.configure(
      clientId: clientId,
      publicKeyId: publicKeyId,
      linkProcessingMode: linkProcessingMode,
      env: env
    )
  }

  func resolveDeferred() throws -> Promise<DeferredLinkPayload?> {
    return Promise.async {
      guard let wire = await TaqlynSdkCoreBridge.resolveDeferred() else { return nil }
      return DeferredLinkPayload(
        url: wire.url,
        path: wire.path,
        params: wire.params,
        linkId: wire.linkId,
        matchType: wire.matchType,
        isDeferred: wire.isDeferred,
        campaignJson: wire.campaignJson
      )
    }
  }

  func addLinkListener(listener: @escaping (DeferredLinkPayload) -> Void) throws {
    TaqlynSdkCoreBridge.observeLinks { wire in
      listener(
        DeferredLinkPayload(
          url: wire.url,
          path: wire.path,
          params: wire.params,
          linkId: wire.linkId,
          matchType: wire.matchType,
          isDeferred: wire.isDeferred,
          campaignJson: wire.campaignJson
        )
      )
    }
  }

  func removeLinkListener() throws {
    TaqlynSdkCoreBridge.stopObserving()
  }

  func consume(linkId: String) throws {
    TaqlynSdkCoreBridge.consume(linkId)
  }

  func setReadyForNavigation(ready: Bool) throws {
    TaqlynSdkCoreBridge.setReadyForNavigation(ready)
  }
}
