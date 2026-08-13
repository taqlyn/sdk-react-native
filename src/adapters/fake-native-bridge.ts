/**
 * Test fake for `adapters/native-bridge`.
 * Mirrors SdkCore ready-gate + deferred resolve (no Match / referrer / pasteboard).
 */

import type { DeferredLink } from '@taqlyn/sdk-contract'
import type { NativeBridge } from './native-bridge'
import type { ConfigureOptions, LinkListener } from '../types'

export interface FakeNativeBridgeControls {
  lastOptions?: ConfigureOptions
  /** Sandbox-shaped payload returned from the next resolveDeferred. */
  setDeferredResult(link: DeferredLink | null): void
  /** iOS clipboard token → next resolveDeferred (matchType clipboard). */
  setClipboardToken(token: string | null): void
  /** Emit a warm (non-deferred) link immediately to active listeners. */
  emitWarm(link: DeferredLink): void
  /** Simulate iOS onOpenURL / Android VIEW intent as a warm link. */
  onOpenURL(url: string): void
  onIntent(url: string): void
  reset(): void
}

function warmFromUrl(url: string): DeferredLink {
  try {
    const parsed = new URL(url)
    const params = Object.fromEntries(parsed.searchParams.entries())
    return {
      url,
      path: parsed.pathname || '/',
      params,
      linkId: params.linkId || params.link_id || url,
      matchType: 'none',
      isDeferred: false,
    }
  } catch {
    return {
      url,
      path: '/',
      params: {},
      linkId: url,
      matchType: 'none',
      isDeferred: false,
    }
  }
}

export function createFakeNativeBridge(): NativeBridge & FakeNativeBridgeControls {
  let configured = false
  let ready = false
  let pending: DeferredLink | null = null
  let nextResolve: DeferredLink | null = null
  let clipboardToken: string | null = null
  let resolvedOnce = false
  let mode: ConfigureOptions['linkProcessingMode'] = 'all'
  const listeners = new Set<LinkListener>()

  const deliverDeferredIfReady = () => {
    if (!ready || !pending) return
    if (mode === 'web-only') return
    for (const listener of listeners) {
      listener(pending)
    }
  }

  const controls: NativeBridge & FakeNativeBridgeControls = {
    configure(_clientId, _publicKeyId, options) {
      configured = true
      ready = false
      pending = null
      resolvedOnce = false
      mode = options.linkProcessingMode ?? 'all'
      controls.lastOptions = { ...options }
    },

    async resolveDeferred() {
      if (!configured) return null
      if (mode === 'web-only') return null
      if (resolvedOnce) return null
      resolvedOnce = true
      let link = nextResolve
      nextResolve = null
      if (!link && clipboardToken) {
        const token = clipboardToken
        clipboardToken = null
        link = {
          url: `https://links.example.com/open?click_id=${encodeURIComponent(token)}`,
          path: '/home',
          params: { click_id: token },
          linkId: `clip_${token}`,
          matchType: 'clipboard',
          isDeferred: true,
        }
      }
      if (!link) return null
      pending = link
      deliverDeferredIfReady()
      return link
    },

    observeLinks(listener) {
      listeners.add(listener)
      if (ready && pending && mode !== 'web-only') {
        listener(pending)
      }
      return {
        unsubscribe() {
          listeners.delete(listener)
        },
      }
    },

    consume(linkId) {
      if (pending?.linkId === linkId) {
        pending = null
      }
    },

    setReadyForNavigation(value) {
      ready = value
      if (value) deliverDeferredIfReady()
    },

    setDeferredResult(link) {
      nextResolve = link
    },

    setClipboardToken(token) {
      clipboardToken = token && token.trim().length > 0 ? token.trim() : null
    },

    emitWarm(link) {
      if (mode === 'deferred-only') return
      for (const listener of listeners) {
        listener(link)
      }
    },

    onOpenURL(url) {
      this.emitWarm(warmFromUrl(url))
    },

    onIntent(url) {
      this.emitWarm(warmFromUrl(url))
    },

    reset() {
      configured = false
      ready = false
      pending = null
      nextResolve = null
      clipboardToken = null
      resolvedOnce = false
      mode = 'all'
      listeners.clear()
      controls.lastOptions = undefined
    },
  }
  return controls
}
