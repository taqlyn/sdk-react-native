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

export type {
  DeferredLink,
  MatchType,
  Campaign,
  ResolvePayload,
  LinkProcessingMode,
  ConfigureOptions,
  LinkSubscription,
  LinkListener,
} from './types'

/** Re-export bridge types for tests / advanced DI — not for feature UI. */
export type { NativeBridge } from './adapters/native-bridge'
export { createFakeNativeBridge } from './adapters/fake-native-bridge'
export type { FakeNativeBridgeControls } from './adapters/fake-native-bridge'
