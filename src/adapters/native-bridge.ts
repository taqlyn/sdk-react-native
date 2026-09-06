/**
 * `adapters/native-bridge` — Nitro Hybrid Object ↔ JS facade.
 *
 * Feature / sample code must import the public facade (`@taqlyn/sdk-react-native`)
 * only — never Nitro Hybrid types, Play Install Referrer, or pasteboard kits.
 */

import type { DeferredLink, MatchType } from '@taqlyn/sdk-contract'
import type { DeferredLinkPayload, TaqlynSdk } from '../specs/TaqlynSdk.nitro'
import { API_ORIGIN, type ConfigureOptions, type LinkListener, type LinkSubscription } from '../types'

/** Injectable bridge (Nitro Hybrid or test fake). */
export interface NativeBridge {
  configure(
    clientId: string,
    publicKeyId: string,
    options: ConfigureOptions,
  ): void
  resolveDeferred(): Promise<DeferredLink | null>
  observeLinks(listener: LinkListener): LinkSubscription
  consume(linkId: string): void
  setReadyForNavigation(ready: boolean): void
}

export function payloadToDeferredLink(
  payload: DeferredLinkPayload,
): DeferredLink {
  let campaign: DeferredLink['campaign']
  if (payload.campaignJson && payload.campaignJson !== '{}') {
    try {
      campaign = JSON.parse(payload.campaignJson) as DeferredLink['campaign']
    } catch {
      campaign = undefined
    }
  }
  return {
    url: payload.url,
    path: payload.path,
    params: { ...payload.params },
    linkId: payload.linkId,
    matchType: (payload.matchType || 'none') as MatchType,
    isDeferred: payload.isDeferred,
    ...(campaign ? { campaign } : {}),
  }
}

export function deferredLinkToPayload(link: DeferredLink): DeferredLinkPayload {
  return {
    url: link.url,
    path: link.path,
    params: { ...link.params },
    linkId: link.linkId,
    matchType: link.matchType,
    isDeferred: link.isDeferred,
    campaignJson: link.campaign ? JSON.stringify(link.campaign) : '',
  }
}

/**
 * Nitro-backed bridge. Created lazily so unit tests can inject a fake without
 * loading `react-native-nitro-modules`.
 */
export function createNitroNativeBridge(): NativeBridge {
  // Dynamic require kept inside this adapter only (never in feature/sample code).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nitro = require('react-native-nitro-modules') as {
    NitroModules: { createHybridObject: <T>(name: string) => T }
  }
  const hybrid = nitro.NitroModules.createHybridObject<TaqlynSdk>('TaqlynSdk')

  return {
    configure(clientId, publicKeyId, options) {
      hybrid.configure(
        clientId,
        publicKeyId,
        API_ORIGIN,
        options.linkProcessingMode ?? 'all',
        options.env ?? '',
      )
    },
    async resolveDeferred() {
      const payload = await hybrid.resolveDeferred()
      if (!payload) return null
      return payloadToDeferredLink(payload)
    },
    observeLinks(listener) {
      hybrid.addLinkListener((payload) => {
        listener(payloadToDeferredLink(payload))
      })
      return {
        unsubscribe() {
          hybrid.removeLinkListener()
        },
      }
    },
    consume(linkId) {
      hybrid.consume(linkId)
    },
    setReadyForNavigation(ready) {
      hybrid.setReadyForNavigation(ready)
    },
  }
}
