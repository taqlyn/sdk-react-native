import type { HybridObject } from 'react-native-nitro-modules'

/**
 * Wire payload across the Nitro bridge — mirrors `@taqlyn/sdk-contract` DeferredLink.
 * `campaignJson` is `""` when absent; otherwise a JSON object string.
 */
export interface DeferredLinkPayload {
  url: string
  path: string
  params: Record<string, string>
  linkId: string
  matchType: string
  isDeferred: boolean
  campaignJson: string
}

/**
 * Nitro Hybrid Object → native Android/iOS SdkCore.
 * Matching / Install Referrer / pasteboard stay in native SdkCore.
 */
export interface TaqlynSdk
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /**
   * @param apiBaseUrl Ignored. Native SdkCore uses the baked hosted origin.
   * @param linkProcessingMode `all` | `web-only` | `deferred-only`
   * @param env empty string when unset
   */
  configure(
    clientId: string,
    publicKeyId: string,
    apiBaseUrl: string,
    linkProcessingMode: string,
    env: string,
  ): void

  resolveDeferred(): Promise<DeferredLinkPayload | undefined>

  /** Register a multi-fire listener for warm + deferred links. */
  addLinkListener(listener: (link: DeferredLinkPayload) => void): void

  removeLinkListener(): void

  consume(linkId: string): void

  setReadyForNavigation(ready: boolean): void
}
