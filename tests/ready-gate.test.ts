import { describe, expect, test, beforeEach } from 'bun:test'
import type { DeferredLink } from '@taqlyn/sdk-contract'
import { createFakeNativeBridge } from '../src/adapters/fake-native-bridge'
import {
  __setNativeBridgeForTests,
  configure,
  resolveDeferred,
  observeLinks,
  setReadyForNavigation,
  consume,
} from '../src/index'

const sandboxLink: DeferredLink = {
  url: 'https://links.example.com/r/abc?product=42',
  path: '/product/42',
  params: { product: '42' },
  linkId: 'link_sandbox_1',
  matchType: 'install_referrer',
  isDeferred: true,
  campaign: { utm_source: 'sandbox', utm_campaign: 'phase08' },
}

describe('ready gate + deferred resolve (fake bridge)', () => {
  const fake = createFakeNativeBridge()

  beforeEach(() => {
    fake.reset()
    __setNativeBridgeForTests(fake)
    configure('app_test', 'pk_test', {
      env: 'sandbox',
    })
  })

  test('holds pending until setReadyForNavigation(true)', async () => {
    const received: DeferredLink[] = []
    observeLinks((link) => received.push(link))

    fake.setDeferredResult(sandboxLink)
    const resolved = await resolveDeferred()
    expect(resolved?.linkId).toBe('link_sandbox_1')
    expect(received).toHaveLength(0)

    setReadyForNavigation(true)
    expect(received).toHaveLength(1)
    expect(received[0]?.path).toBe('/product/42')
    expect(received[0]?.matchType).toBe('install_referrer')
  })

  test('deferred resolve via injectable fake against sandbox-shaped payload', async () => {
    fake.setDeferredResult(sandboxLink)
    const link = await resolveDeferred()
    expect(link).not.toBeNull()
    expect(link?.url).toContain('links.example.com')
    expect(link?.params.product).toBe('42')
    expect(link?.campaign?.utm_source).toBe('sandbox')
    expect(link?.isDeferred).toBe(true)

    // resolve-once
    expect(await resolveDeferred()).toBeNull()
  })

  test('consume clears pending for matching linkId', async () => {
    const received: DeferredLink[] = []
    observeLinks((link) => received.push(link))
    fake.setDeferredResult(sandboxLink)
    await resolveDeferred()
    setReadyForNavigation(true)
    expect(received).toHaveLength(1)

    consume('link_sandbox_1')
    // Re-ready should not re-deliver after consume
    setReadyForNavigation(false)
    setReadyForNavigation(true)
    expect(received).toHaveLength(1)
  })

  test('warm UL/AL delivered via observe path without ready gate', () => {
    const received: DeferredLink[] = []
    observeLinks((link) => received.push(link))

    const warm: DeferredLink = {
      url: 'https://links.example.com/product/9',
      path: '/product/9',
      params: {},
      linkId: 'warm_1',
      matchType: 'none',
      isDeferred: false,
    }
    fake.emitWarm(warm)
    expect(received).toHaveLength(1)
    expect(received[0]?.isDeferred).toBe(false)
    expect(received[0]?.path).toBe('/product/9')
  })
})
