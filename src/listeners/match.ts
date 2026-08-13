import type { DeferredLink, MatchType } from '@taqlyn/sdk-contract'

const IOS_DEFERRED: ReadonlySet<MatchType> = new Set([
  'clipboard',
  'app_clip',
  'claim',
])

const ANDROID_DEFERRED: ReadonlySet<MatchType> = new Set([
  'install_referrer',
  'claim',
])

/** Warm UL, or deferred clipboard / App Clip / claim. */
export function isIosPlatformLink(link: DeferredLink): boolean {
  if (!link.isDeferred) return true
  return IOS_DEFERRED.has(link.matchType)
}

/** Warm App Link, or deferred Install Referrer / claim. */
export function isAndroidPlatformLink(link: DeferredLink): boolean {
  if (!link.isDeferred) return true
  return ANDROID_DEFERRED.has(link.matchType)
}

export type TaqlynOs = 'ios' | 'android' | 'web' | 'unknown'

let testOs: TaqlynOs | null = null

/** Test hook — bun/node has no react-native Platform. */
export function __setPlatformOsForTests(os: TaqlynOs | null): void {
  testOs = os
}

export function detectOs(): TaqlynOs {
  if (testOs) return testOs
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn = require('react-native') as { Platform?: { OS?: string } }
    const os = rn.Platform?.OS
    if (os === 'ios' || os === 'android' || os === 'web') return os
  } catch {
    /* bun tests / node */
  }
  return 'unknown'
}
