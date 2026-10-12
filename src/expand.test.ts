import { describe, expect, test, beforeEach, afterEach, mock } from 'bun:test'
import { effectiveResolveMode } from '@taqlyn/sdk-contract'
import {
  rememberExpandSession,
  clearExpandSession,
  resolveIncomingUrl,
  awaitPendingExpand,
  shouldExpand,
} from './expand'

describe('effectiveResolveMode cascade', () => {
  test('link > app > client > await', () => {
    expect(effectiveResolveMode('optimistic', 'await', 'await')).toBe('optimistic')
    expect(effectiveResolveMode(null, 'optimistic', 'await')).toBe('optimistic')
    expect(effectiveResolveMode(null, null, 'optimistic')).toBe('optimistic')
    expect(effectiveResolveMode(null, null, null)).toBe('await')
  })
})

describe('shouldExpand', () => {
  test('hosts + short-code heuristic', () => {
    expect(shouldExpand('https://go.example.com/Ab12Cd', ['https://go.example.com'])).toBe(
      true,
    )
    expect(shouldExpand('https://go.example.com/offer/x', ['https://go.example.com'])).toBe(
      false,
    )
    expect(shouldExpand('https://evil.example/Ab12Cd', ['https://go.example.com'])).toBe(false)
  })
})

describe('resolveIncomingUrl', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    clearExpandSession()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    clearExpandSession()
  })

  test('await timeout → fallbackPath', async () => {
    rememberExpandSession('c', 'pk', {
      resolveMode: 'await',
      fallbackPath: '/home',
      hosts: ['https://go.example.com'],
      timeoutMs: 30,
    })
    globalThis.fetch = mock(() => new Promise(() => {})) as typeof fetch
    const got = await resolveIncomingUrl('https://go.example.com/Ab12Cd')
    expect(got).toEqual({ href: '/home' })
  })

  test('optimistic → fallback then pending expand destination', async () => {
    rememberExpandSession('c', 'pk', {
      resolveMode: 'optimistic',
      fallbackPath: '/splash',
      hosts: ['https://go.example.com'],
      timeoutMs: 1500,
    })
    globalThis.fetch = mock(async () =>
      new Response(
        JSON.stringify({
          linkId: 'lnk_1',
          code: 'Ab12Cd',
          host: 'go.example.com',
          destinationPath: '/offer',
          params: { sku: '1' },
          url: 'https://go.example.com/Ab12Cd',
          linkResolveMode: 'await',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as typeof fetch

    const first = await resolveIncomingUrl('https://go.example.com/Ab12Cd')
    expect(first).toEqual({ href: '/splash', pendingExpand: true })
    const pending = await awaitPendingExpand()
    expect(pending?.href).toBe('/offer?sku=1')
    expect(pending?.linkId).toBe('lnk_1')
  })

  test('non-short URL path-maps', async () => {
    rememberExpandSession('c', 'pk', {
      hosts: ['https://go.example.com'],
      resolveMode: 'await',
    })
    const got = await resolveIncomingUrl('https://go.example.com/offer/item?sku=9')
    expect(got).toEqual({ href: '/offer/item?sku=9' })
  })
})
