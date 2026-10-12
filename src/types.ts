import type { DeferredLink } from '@taqlyn/sdk-contract'

export type {
  DeferredLink,
  MatchType,
  Campaign,
  ResolvePayload,
  ResolveMode,
  ExpandResult,
  ResolvedNavTarget,
  AnalyticsEventName,
} from '@taqlyn/sdk-contract'

export { effectiveResolveMode } from '@taqlyn/sdk-contract'

/** Optional filter — avoid double-handling with Expo Router / React Navigation. */
export type LinkProcessingMode = 'all' | 'web-only' | 'deferred-only'

/** Hosted control-plane origin. Not a public configure option. */
export const API_ORIGIN = 'https://api.taqlyn.com'

export interface ConfigureOptions {
  linkProcessingMode?: LinkProcessingMode
  /** Forwarded to resolve (e.g. `sandbox` / `live`). */
  env?: string
  /** Client default expand UX; cascade link → app → client → await. */
  resolveMode?: import('@taqlyn/sdk-contract').ResolveMode
  /** Optional default backstack/home path. */
  fallbackPath?: string
  /** Hosts that may need short-link expand. */
  hosts?: string[]
  /** Await timeout ms (app expandTimeoutMs overrides when set on expand response). */
  timeoutMs?: number
  /**
   * Android-only opt-in: when Install Referrer is empty, try probabilistic IP-hash match.
   * Forwarded to native SdkCore; ignored / never enabled on iOS.
   */
  enableProbabilisticMatch?: boolean
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
