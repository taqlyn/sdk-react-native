import type { DeferredLink } from '@taqlyn/sdk-contract'
import {
  createNitroNativeBridge,
  type NativeBridge,
} from './adapters/native-bridge'
import type {
  ConfigureOptions,
  LinkListener,
  LinkSubscription,
} from './types'

let bridge: NativeBridge | null = null

function getBridge(): NativeBridge {
  if (!bridge) {
    bridge = createNitroNativeBridge()
  }
  return bridge
}

/** Test / DI hook — inject a fake bridge before configure. */
export function __setNativeBridgeForTests(next: NativeBridge | null): void {
  bridge = next
}

/**
 * Public SdkCore facade (sdk-contract surface).
 * App feature code imports these functions only.
 */
export function configure(
  clientId: string,
  publicKeyId: string,
  options: ConfigureOptions,
): void {
  if (!clientId.trim()) throw new Error('clientId required')
  if (!publicKeyId.trim()) throw new Error('publicKeyId required')
  if (!options.apiBaseUrl.trim()) throw new Error('options.apiBaseUrl required')
  getBridge().configure(clientId, publicKeyId, options)
}

export async function resolveDeferred(): Promise<DeferredLink | null> {
  return getBridge().resolveDeferred()
}

/**
 * Subscribe to warm + deferred links (deferred gated by setReadyForNavigation).
 * Returns an unsubscribe handle. Also usable as async iterable via `observeLinksAsync`.
 */
export function observeLinks(listener: LinkListener): LinkSubscription {
  return getBridge().observeLinks(listener)
}

/** Async iterable over the same stream (unsubscribe when the consumer breaks). */
export async function* observeLinksAsync(): AsyncIterable<DeferredLink> {
  const queue: DeferredLink[] = []
  let wake: (() => void) | null = null
  let done = false

  const sub = observeLinks((link) => {
    queue.push(link)
    wake?.()
  })

  try {
    while (!done) {
      if (queue.length === 0) {
        await new Promise<void>((resolve) => {
          wake = resolve
        })
        wake = null
      }
      const next = queue.shift()
      if (next) yield next
    }
  } finally {
    done = true
    sub.unsubscribe()
  }
}

export function consume(linkId: string): void {
  getBridge().consume(linkId)
}

export function setReadyForNavigation(ready: boolean): void {
  getBridge().setReadyForNavigation(ready)
}
