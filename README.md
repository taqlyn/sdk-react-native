# `@taqlyn/sdk-react-native`

**Full guide:** [React Native cookbook](../../apps/docs/content/platforms/react-native.md) on the docs site.

Thin **Nitro Modules** wrapper around canonical Android / iOS **SdkCore**. Matching, Play Install Referrer, pasteboard, and UL/AL observation live in native SdkCore — this package only bridges.

## Public API

```ts
import {
  configure,
  createShareLink,
  trackOpen,
  logEvent,
  resolveDeferred,
  resolveIncomingUrl,
  awaitPendingExpand,
  observePlatformLinks,
  consume,
  setReadyForNavigation,
  TaqlynProvider,
  useTaqlynGate,
  type DeferredLink,
  type LinkProcessingMode,
} from '@taqlyn/sdk-react-native'
// Or platform entrypoints: '@taqlyn/sdk-react-native/ios' | '.../android'

configure(clientId, publicKeyId, {
  linkProcessingMode: 'deferred-only', // when +native-intent owns warm URLs
  env: 'sandbox',
  resolveMode: 'await', // or 'optimistic'
  fallbackPath: '/',
  hosts: ['https://go.example.com'],
  timeoutMs: 1500,
})

const share = await createShareLink({
  destinationPath: '/offer',
  params: { sku: '42' },
  trackUniqueUsers: true, // Starter+ hashed unique visitors
  trackOpens: true, // reports POST /v1/events/open when consume() runs
})

// iOS: clipboard / App Clip / claim. Android: Play Install Referrer / claim.
const deferred = await resolveDeferred() // DeferredLink | null

// Warm short-code → in-app path (POST /v1/links/expand)
const nav = await resolveIncomingUrl('https://go.example.com/Ab12Cd')

// Platform-only listener — clipboard matches never fire on Android, referrer never on iOS.
const sub = observePlatformLinks((link) => {
  consume(link.linkId) // also fires trackOpen
})

void logEvent('view_item', { sku: '42' }) // POST /v1/events/sdk (202)

setReadyForNavigation(true) // deliver pending deferred to observers
```

Prefer `TaqlynProvider` + `useTaqlynGate` for auth/onboarding hold (Detour-style). Navigation: `@taqlyn/nav-expo-router` (`createTaqlynNativeIntentHandler`) or `@taqlyn/nav-react-navigation` (`createTaqlynExpandingLinking` / `createTaqlynDeferredLinking`).

`DeferredLink` matches `@taqlyn/sdk-contract`. Guides: [short-link-expand](../../docs/guides/short-link-expand.md) · [detour-parity-gaps](../../docs/guides/detour-parity-gaps.md).

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

Published `@taqlyn/sdk-react-native` pulls `com.taqlyn:taqlyn-sdk` from Maven Central. Host apps must not `includeBuild` a local `sdk-android` checkout.

iOS: CocoaPods / the Nitro podspec depends on published `TaqlynSDK` (SPM: `https://github.com/taqlyn/sdk-ios.git`). Do not add a local `packages/sdk-ios` path in customer apps.

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

## CI/CD & NPM Publishing

This package publishes to npm using **Tokenless OIDC Trusted Publishing** (modeled on `react-native-nitro-google-sign-in/google-signin`):

- **No static `NPM_TOKEN` required:** Uses GitHub Actions OIDC (`id-token: write`) to exchange ephemeral credentials directly with `registry.npmjs.org`.
- **Automatic SLSA Provenance:** Emits public cryptographic Sigstore provenance attestations verifying the exact commit and workflow run.
- **Workflow:** `.github/workflows/publish.yml` triggers on published releases or Git tags (`v*`), runs Nitrogen codegen (`bun run codegen`), builds the package, and executes `npm publish --provenance --access public`.

