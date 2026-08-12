# Taqlyn RN sample

Proof harness for `@taqlyn/sdk-react-native`.

## Flow

1. `configure` (module load)
2. `resolveDeferred`
3. User taps **Ready for navigation** → `setReadyForNavigation(true)`
4. `observeLinks` delivers the deferred link
5. `consume(linkId)`

Uses optional `@taqlyn/nav-expo-router` helpers for href mapping / ready bootstrap only.

## Rules

- Import the public facade only (`@taqlyn/sdk-react-native`)
- Do not import Nitro Hybrid types or OS vendor kits from this app

## Run

Requires a **dev client** or bare RN build (Expo Go cannot load custom Nitro native code). See the package README.
