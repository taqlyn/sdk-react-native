import type { DeferredLink } from '@taqlyn/sdk-contract'

export type { DeferredLink, MatchType, Campaign, ResolvePayload } from '@taqlyn/sdk-contract'

/** Optional filter — avoid double-handling with Expo Router / React Navigation. */
export type LinkProcessingMode = 'all' | 'web-only' | 'deferred-only'

export interface ConfigureOptions {
  apiBaseUrl: string
  linkProcessingMode?: LinkProcessingMode
  /** Forwarded to resolve (e.g. `sandbox` / `live`). */
  env?: string
}

export interface LinkSubscription {
  unsubscribe(): void
}

export type LinkListener = (link: DeferredLink) => void
