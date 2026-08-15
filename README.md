# `@taqlyn/sdk-react-native`

**Full guide:** [React Native cookbook](../../apps/docs/content/platforms/react-native.md) on the docs site.

Thin **Nitro Modules** wrapper around canonical Android / iOS **SdkCore**. Matching, Play Install Referrer, pasteboard, and UL/AL observation live in native SdkCore — this package only bridges.

## Public API

```ts
import {
  configure,
  createShareLink,
  trackOpen,
  resolveDeferred,
  observePlatformLinks,
  consume,
  setReadyForNavigation,
  DEFAULT_API_BASE_URL,
  type DeferredLink,
  type LinkProcessingMode,
} from '@taqlyn/sdk-react-native'
// Or platform entrypoints: '@taqlyn/sdk-react-native/ios' | '.../android'

configure(clientId, publicKeyId, {
  // apiBaseUrl optional — defaults to DEFAULT_API_BASE_URL (self-host: pass yours)
  linkProcessingMode: 'all', // 'all' | 'web-only' | 'deferred-only'
  env: 'sandbox',
})

const share = await createShareLink({
  destinationPath: '/offer',
  params: { sku: '42' },
  trackUniqueUsers: true, // Starter+ hashed unique visitors
  trackOpens: true, // reports POST /v1/events/open when consume() runs
})

// iOS: clipboard / App Clip / claim. Android: Play Install Referrer / claim.
const deferred = await resolveDeferred() // DeferredLink | null

// Platform-only listener — clipboard matches never fire on Android, referrer never on iOS.
const sub = observePlatformLinks((link) => {
  consume(link.linkId)
})

setReadyForNavigation(true) // deliver pending deferred to observers
```

Navigation: `@taqlyn/nav-expo-router` (Expo Router linking + `+native-intent`) or `@taqlyn/nav-react-navigation` (`NavigationContainer` linking). When those handle warm UL/AL, set `linkProcessingMode: 'deferred-only'`.

`DeferredLink` matches `@taqlyn/sdk-contract`.

## Architecture

```text
App feature / sample
  → public facade (this package)
    → adapters/native-bridge (Nitro Hybrid Object)
      → Android SdkCore / iOS SdkCore
```

Feature / sample code must use the **real Nitro autolink** — never a fake JS bridge. Unit tests may inject a fake via `__setNativeBridgeForTests`.

Feature code must **not** import Nitro Hybrid types, `installreferrer`, or pasteboard kits.

## Expo vs bare

| Target | Notes |
|--------|--------|
| **Bare RN** | Autolink this package + `react-native-nitro-modules`. New Architecture assumed. |
| **Expo (dev client / prebuild)** | Use the config plugin (`app.plugin.js`) for Associated Domains + Android intent filters. |
| **Expo Go** | **Cannot** load custom Nitro native code — use a development build. |

### Expo config plugin

```js
// app.config.js
plugins: [
  [
    '@taqlyn/sdk-react-native',
    {
      associatedDomains: ['links.example.com'],
      androidHosts: ['links.example.com'],
      androidPathPrefix: '/',
    },
  ],
]
```

### Nitro codegen

```bash
cd packages/sdk-react-native
bun install
bun run codegen   # npx nitrogen — regenerates ./nitrogen/generated
```

Commit `nitrogen/generated/` when present. After changing `src/specs/*.nitro.ts`, re-run codegen and implement any required Hybrid method stubs.

## Native SdkCore wiring

### Android

Prefer composite build from the host app `settings.gradle`:

```gradle
includeBuild("../sdk-android") {
  dependencySubstitution {
    substitute(module("com.taqlyn:taqlyn-sdk")).using(project(":taqlyn-sdk"))
  }
}
```

Or publish once:

```bash
cd ../sdk-android && ./gradlew :taqlyn-sdk:publishToMavenLocal
```

See `android/settings.include.gradle.example`.

### iOS

Add SPM package path to the host app (sibling checkout):

```swift
// Package / Xcode → Local → ../sdk-ios (product: TaqlynSDK)
```

Hybrid Swift imports `TaqlynSDK` and calls `SdkCore`.

## Sample

`sample/App.tsx` demonstrates configure → resolveDeferred → setReadyForNavigation → observe → consume, optionally using `@taqlyn/nav-expo-router` helpers (no Match logic).

## Tests

```bash
bun test
bun run typecheck
```

### Native bridge hosts (closes deferred / assemble risks)

Fake Install Referrer / pasteboard + sandbox-shaped `ResolveClient` — no Play Store / real device required for wrapper proof. Hybrid objects delegate to these bridges.

```bash
# Android: SdkCore bridge unit tests + AAR assemble
cd android-host
# Prefer cached Gradle if wrapper download is flaky:
#   $GRADLE_HOME/bin/gradle :bridge:testDebugUnitTest :bridge:assembleRelease
./gradlew :bridge:testDebugUnitTest :bridge:assembleRelease

# iOS: SdkCore bridge unit tests (clipboard fake + warm UL)
cd ios-bridge && swift test
```

## Package layout

```text
src/
  index.ts                 # public facade
  facade.ts
  adapters/native-bridge.ts
  adapters/fake-native-bridge.ts
  specs/TaqlynSdk.nitro.ts
android/ … HybridTaqlynSdk.kt → TaqlynSdkCoreBridge → SdkCore
android-host/ … bridge tests + assembleRelease
ios/ … HybridTaqlynSdk.swift → TaqlynSdkCoreBridge → SdkCore
ios-bridge/ … Swift package tests
expo-plugin/
sample/
```
