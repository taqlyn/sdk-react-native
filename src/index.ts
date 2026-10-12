/**
 * `@taqlyn/sdk-react-native` — public facade.
 *
 * Import from here in app feature / sample code.
 * Do not import Nitro Hybrid types, installreferrer, or pasteboard kits.
 */

export {
  configure,
  resolveDeferred,
  observeLinks,
  observeLinksAsync,
  consume,
  setReadyForNavigation,
  __setNativeBridgeForTests,
} from './facade'

export { createShareLink, trackOpen, logEvent } from './share'
export {
  resolveShortLink,
  resolveIncomingUrl,
  awaitPendingExpand,
} from './expand'

export {
  TaqlynProvider,
  useTaqlynContext,
  useTaqlynGate,
} from './provider'
export type { TaqlynProviderProps, TaqlynContextValue } from './provider'

export {
  observePlatformLinks,
  observeUniversalLinks,
  observeAppLinks,
  isIosPlatformLink,
  isAndroidPlatformLink,
  __setPlatformOsForTests,
} from './listeners/platform'
export type { TaqlynOs } from './listeners/match'

export {
  type DeferredLink,
  type MatchType,
  type Campaign,
  type ResolvePayload,
  type ResolveMode,
  type ExpandResult,
  type ResolvedNavTarget,
  type LinkProcessingMode,
  type ConfigureOptions,
  type LinkSubscription,
  type LinkListener,
  type ShareLink,
  type ShareLinkInput,
  type AnalyticsEventName,
  effectiveResolveMode,
} from './types'
