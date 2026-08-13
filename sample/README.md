# Taqlyn RN sample — Cenomi Malls (`com.cenomi.mallsapp`)

Proof harness for `@taqlyn/sdk-react-native`. iOS bundle ID and Android package are **`com.cenomi.mallsapp`**.

## Run

Requires a **dev client** (Expo Go cannot use a custom bundle ID).

```bash
cd packages/sdk-react-native/sample
bun install
# iOS (booted simulator)
npx expo run:ios --udid <SIMULATOR_UDID>
# Android
adb reverse tcp:8081 tcp:8081
npx expo run:android --device emulator-5554
```

Optional Metro/Expo env (after `./scripts/demo-seed.sh` from repo root):

```bash
export TAQLYN_API_BASE_URL=${TAQLYN_BASE_URL:-https://api.rutvik.qzz.io}
export TAQLYN_CLIENT_ID=…
export TAQLYN_PUBLIC_KEY_ID=…
```

## Dashboard → Apps → Bind platforms

Paste these into https://app.rutvik.qzz.io (or local dashboard) for deferred + Universal/App Link testing.

### Android

| Field | Value |
|-------|--------|
| Package name | `com.cenomi.mallsapp` |
| SHA-256 fingerprints | Expo debug (`android/app/debug.keystore`): `FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C` |

Also add `~/.android/debug.keystore` if you install non-Expo debug builds: `42:01:4B:6D:7B:A7:52:51:2C:22:7A:F8:83:AC:C7:25:18:69:63:17:5B:B0:D9:A1:FD:E5:B6:99:55:52:B2:3D`. Add **Play App Signing** SHA-256 from Play Console → App integrity for store / real-device App Links.

### iOS

| Field | Value |
|-------|--------|
| Bundle ID | `com.cenomi.mallsapp` |
| Team ID | `H7Y4Z32BAT` |
| Apple ID (numeric) | `6742008986` (App Store: [Cenomi Plus](https://apps.apple.com/us/app/cenomi-plus/id6742008986)) |

### Web (sandbox or production env switcher)

| Field | Suggested value |
|-------|-----------------|
| Base URL | `https://cenomi.com` |
| Path template | `/open/{code}` |
| Prefer web when app not installed | optional |

### Linking hosts (Associated Domains / App Links)

After create-app, dashboard **bootHosts** look like `{slug}-{env}.rutvik.qzz.io`. This sample also claims:

- `demo-application-sandbox.rutvik.qzz.io`
- `demo-application-production.rutvik.qzz.io`
- `new-application-sandbox.rutvik.qzz.io`
- `new-application-production.rutvik.qzz.io`
- `go.rutvik.qzz.io`
- `mark-pr.riddhu.qzz.io`

Add the same hosts under **Domains** if you mint short links there. Verify:

```bash
curl -sS "https://<host>/.well-known/apple-app-site-association"
curl -sS "https://<host>/.well-known/assetlinks.json"
```

AASA `appID` must be `H7Y4Z32BAT.com.cenomi.mallsapp`. assetlinks `package_name` must be `com.cenomi.mallsapp` with the SHA-256(s) above.

## Flow

1. `configure` (module load; fake Nitro bridge if native SdkCore is not linked)
2. `resolveDeferred`
3. Tap **Ready for navigation** → `setReadyForNavigation(true)`
4. `observeLinks` / `expo-linking` incoming URL
5. `consume(linkId)`

See [docs/guides/public-demo.md](../../../docs/guides/public-demo.md).
