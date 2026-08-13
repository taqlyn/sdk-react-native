import { describe, expect, test, beforeEach } from 'bun:test'
import type { DeferredLink } from '@taqlyn/sdk-contract'
import { createFakeNativeBridge } from '../src/adapters/fake-native-bridge'
import {
  __setNativeBridgeForTests,
  __setPlatformOsForTests,
  configure,
  resolveDeferred,
  setReadyForNavigation,
  observePlatformLinks,
  observeUniversalLinks,
  observeAppLinks,
  isIosPlatformLink,
  isAndroidPlatformLink,
} from '../src/index'

const clipboardLink: DeferredLink = {
  url: 'https://links.example.com/home?click_id=clk_ios',
  path: '/home',
  params: { click_id: 'clk_ios' },
  linkId: 'clip_1',
  matchType: 'clipboard',
  isDeferred: true,
}

const referrerLink: DeferredLink = {
  url: 'https://links.example.com/home?click_id=clk_and',
  path: '/home',
  params: { click_id: 'clk_and' },
  linkId: 'ref_1',
  matchType: 'install_referrer',
  isDeferred: true,
}

const warm: DeferredLink = {
  url: 'https://links.example.com/home',
  path: '/home',
  params: {},
  linkId: 'warm_1',
  matchType: 'none',
  isDeferred: false,
}

describe('platform-only listeners', () => {
  const fake = createFakeNativeBridge()

  beforeEach(() => {
    fake.reset()
    __setNativeBridgeForTests(fake)
    __setPlatformOsForTests(null)
    configure('app_test', 'pk_test', {
      apiBaseUrl: 'https://api.sandbox.example.com',
    })
  })

  test('filter helpers: clipboard is iOS-only, referrer is Android-only', () => {
    expect(isIosPlatformLink(clipboardLink)).toBe(true)
    expect(isIosPlatformLink(referrerLink)).toBe(false)
    expect(isAndroidPlatformLink(referrerLink)).toBe(true)
    expect(isAndroidPlatformLink(clipboardLink)).toBe(false)
    expect(isIosPlatformLink(warm)).toBe(true)
    expect(isAndroidPlatformLink(warm)).toBe(true)
  })

  test('iOS listener delivers clipboard deferred, ignores referrer', async () => {
    const received: DeferredLink[] = []
    observeUniversalLinks((link) => received.push(link), 'ios')

    fake.setDeferredResult(clipboardLink)
    await resolveDeferred()
    setReadyForNavigation(true)
    expect(received.map((l) => l.matchType)).toEqual(['clipboard'])

    fake.emitWarm(referrerLink)
    expect(received).toHaveLength(1)
  })

  test('Android listener is a no-op on iOS os', () => {
    const received: DeferredLink[] = []
    observeAppLinks((link) => received.push(link), 'ios')
    fake.emitWarm(warm)
    expect(received).toHaveLength(0)
  })

  test('Android listener delivers referrer, ignores clipboard', async () => {
    const received: DeferredLink[] = []
    observeAppLinks((link) => received.push(link), 'android')

    fake.setDeferredResult(referrerLink)
    await resolveDeferred()
    setReadyForNavigation(true)
    expect(received.map((l) => l.matchType)).toEqual(['install_referrer'])

    fake.setClipboardToken('tok')
    fake.emitWarm(clipboardLink)
    expect(received).toHaveLength(1)
  })

  test('observePlatformLinks picks iOS vs Android', () => {
    const ios: DeferredLink[] = []
    const android: DeferredLink[] = []
    observePlatformLinks((l) => ios.push(l), 'ios')
    observePlatformLinks((l) => android.push(l), 'android')
    fake.emitWarm(warm)
    expect(ios).toHaveLength(1)
    expect(android).toHaveLength(1)
  })

  test('fake clipboard token resolves as iOS deferred', async () => {
    fake.setClipboardToken('clk_paste')
    const link = await resolveDeferred()
    expect(link?.matchType).toBe('clipboard')
    expect(link?.params.click_id).toBe('clk_paste')
    expect(await resolveDeferred()).toBeNull()
  })

  test('fake onOpenURL emits warm UL', () => {
    const received: DeferredLink[] = []
    observeUniversalLinks((link) => received.push(link), 'ios')
    fake.onOpenURL('https://new-application-production.rutvik.qzz.io/ortO0qSc?sku=1')
    expect(received).toHaveLength(1)
    expect(received[0]?.isDeferred).toBe(false)
    expect(received[0]?.path).toBe('/ortO0qSc')
    expect(received[0]?.params.sku).toBe('1')
  })
})
