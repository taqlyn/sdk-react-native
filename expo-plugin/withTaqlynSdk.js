/**
 * Expo config plugin — Associated Domains (iOS) + App Links intent filters (Android)
 * plus a note that Nitro requires a custom native build (dev client / prebuild).
 *
 * @param {import('@expo/config-plugins').ExpoConfig} config
 * @param {{
 *   associatedDomains?: string[],
 *   androidHosts?: string[],
 *   androidPathPrefix?: string,
 * }} [props]
 */
function withTaqlynSdk(config, props = {}) {
  const {
    associatedDomains = [],
    androidHosts = [],
    androidPathPrefix = '/',
  } = props

  config.plugins = config.plugins || []

  if (associatedDomains.length > 0) {
    config.ios = config.ios || {}
    config.ios.associatedDomains = [
      ...new Set([
        ...(config.ios.associatedDomains || []),
        ...associatedDomains.map((d) =>
          d.startsWith('applinks:') ? d : `applinks:${d}`,
        ),
      ]),
    ]
  }

  if (androidHosts.length > 0) {
    config.android = config.android || {}
    config.android.intentFilters = config.android.intentFilters || []
    config.android.intentFilters.push({
      action: 'VIEW',
      autoVerify: true,
      data: androidHosts.map((host) => ({
        scheme: 'https',
        host,
        pathPrefix: androidPathPrefix,
      })),
      category: ['BROWSABLE', 'DEFAULT'],
    })
  }

  // Document Nitro autolinking expectation on the Expo config object (non-runtime).
  config._taqlynSdk = {
    nitro: true,
    note:
      'Expo Go cannot load custom Nitro native code — use a development build / prebuild. Run `bun run codegen` (npx nitrogen) in @taqlyn/sdk-react-native after changing *.nitro.ts.',
  }

  return config
}

module.exports = withTaqlynSdk
