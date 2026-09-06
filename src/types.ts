import type { DeferredLink } from '@taqlyn/sdk-contract'

export type { DeferredLink, MatchType, Campaign, ResolvePayload } from '@taqlyn/sdk-contract'

/** Optional filter — avoid double-handling with Expo Router / React Navigation. */
export type LinkProcessingMode = 'all' | 'web-only' | 'deferred-only'

/** Hosted control-plane origin. Not a public configure option. */
export const API_ORIGIN = 'https://api.taqlyn.com'

export interface ConfigureOptions {
  linkProcessingMode?: LinkProcessingMode
  /** Forwarded to resolve (e.g. `sandbox` / `live`). */
  env?: string
}

export interface ShareLinkInput {
  destinationPath?: string
  destinationWeb?: string
  params?: Record<string, string>
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  trackUniqueUsers?: boolean
  trackOpens?: boolean
}

export interface ShareLink {
  id: string
  code: string
  shortUrl: string
  host: string
  env: string
}

export interface LinkSubscription {
  unsubscribe(): void
}

export type LinkListener = (link: DeferredLink) => void
