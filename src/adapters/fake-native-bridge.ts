/**
 * Test fake for `adapters/native-bridge`.
 * Mirrors SdkCore ready-gate + deferred resolve (no Match / referrer / pasteboard).
 */

import type { DeferredLink } from '@taqlyn/sdk-contract'
import type { NativeBridge } from './native-bridge'
import type { ConfigureOptions, LinkListener } from '../types'

export interface FakeNativeBridgeControls {
  /** Sandbox-shaped payload returned from the next resolveDeferred. */
  setDeferredResult(link: DeferredLink | null): void
  /** Emit a warm (non-deferred) link immediately to active listeners. */
  emitWarm(link: DeferredLink): void
  reset(): void
}

export function createFakeNativeBridge(): NativeBridge & FakeNativeBridgeControls {
  let configured = false
  let ready = false
  let pending: DeferredLink | null = null
  let nextResolve: DeferredLink | null = null
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

  return {
    configure(_clientId, _publicKeyId, options) {
      configured = true
      ready = false
      pending = null
      resolvedOnce = false
      mode = options.linkProcessingMode ?? 'all'
    },

    async resolveDeferred() {
      if (!configured) return null
      if (mode === 'web-only') return null
      if (resolvedOnce) return null
      resolvedOnce = true
      const link = nextResolve
      nextResolve = null
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

    emitWarm(link) {
      if (mode === 'deferred-only') return
      for (const listener of listeners) {
        listener(link)
      }
    },

    reset() {
      configured = false
      ready = false
      pending = null
      nextResolve = null
      resolvedOnce = false
      mode = 'all'
      listeners.clear()
    },
  }
}
