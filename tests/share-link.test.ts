import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { createFakeNativeBridge } from '../src/adapters/fake-native-bridge'
import {
  __setNativeBridgeForTests,
  configure,
  createShareLink,
  DEFAULT_API_BASE_URL,
} from '../src/index'

describe('createShareLink + default API host', () => {
  const fake = createFakeNativeBridge()
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    fake.reset()
    __setNativeBridgeForTests(fake)
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    __setNativeBridgeForTests(null)
  })

  test('configure defaults apiBaseUrl to hosted origin', () => {
    configure('app_test_demo', 'pk_test_demo')
    expect(fake.lastOptions?.apiBaseUrl).toBe(DEFAULT_API_BASE_URL)
  })

  test('self-host override wins', () => {
    configure('app_test_demo', 'pk_test_demo', {
      apiBaseUrl: 'https://api.self-host.example/',
    })
    expect(fake.lastOptions?.apiBaseUrl).toBe('https://api.self-host.example')
  })

  test('POSTs /v1/sdk/short-links with public key handles', async () => {
    configure('app_test_demo', 'pk_test_demo', { env: 'sandbox' })
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(`${DEFAULT_API_BASE_URL}/v1/sdk/short-links`)
      expect(init?.method).toBe('POST')
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      expect(body.clientId).toBe('app_test_demo')
      expect(body.publicKeyId).toBe('pk_test_demo')
      expect(body.destinationPath).toBe('/home')
      return new Response(
        JSON.stringify({
          id: 'sl_1',
          code: 'abc123',
          shortUrl: 'https://go.example.com/abc123',
          host: 'go.example.com',
          env: 'sandbox',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      )
    }) as typeof fetch

    const link = await createShareLink({ destinationPath: '/home' })
    expect(link.shortUrl).toBe('https://go.example.com/abc123')
    expect(link.code).toBe('abc123')
  })
})
