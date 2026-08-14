import { expect, test } from 'bun:test'
import { createFakeNativeBridge } from '../src/adapters/fake-native-bridge'
import {
  __setNativeBridgeForTests,
  configure,
  consume,
  observePlatformLinks,
  resolveDeferred,
  setReadyForNavigation,
} from '../src/index'
import type { DeferredLink } from '../src/types'

const seed: DeferredLink = {
  url: 'https://go.example.test/abc',
  path: '/offer',
  params: { sku: '42' },
  linkId: 'sl_test',
  matchType: 'install_referrer',
  isDeferred: true,
}

test('sample flow: configure → resolveDeferred → observe → consume', async () => {
  const consumed: string[] = []
  const seen: DeferredLink[] = []
  const bridge = createFakeNativeBridge()
  const originalConsume = bridge.consume.bind(bridge)
  bridge.consume = (id) => {
    consumed.push(id)
    originalConsume(id)
  }
  __setNativeBridgeForTests(bridge)

  configure('app_test_demo', 'pk_test_demo', {
    apiBaseUrl: 'https://api.example.test',
    env: 'sandbox',
  })
  bridge.setDeferredResult(seed)

  const deferred = await resolveDeferred()
  expect(deferred?.linkId).toBe('sl_test')
  expect(deferred?.path).toBe('/offer')

  const sub = observePlatformLinks((link) => {
    seen.push(link)
    consume(link.linkId)
  }, 'android')
  setReadyForNavigation(true)
  expect(seen).toHaveLength(1)
  expect(seen[0]?.linkId).toBe('sl_test')
  expect(consumed).toEqual(['sl_test'])
  sub.unsubscribe()
  __setNativeBridgeForTests(null)
})
