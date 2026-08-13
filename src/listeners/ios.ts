/**
 * iOS-only custom listener. No-op on other platforms.
 * Delivers Universal Links + clipboard / App Clip / claim deferred.
 */
import { observeLinks } from '../facade'
import type { LinkListener, LinkSubscription } from '../types'
import { detectOs, isIosPlatformLink, type TaqlynOs } from './match'

export function observeUniversalLinks(
  listener: LinkListener,
  os: TaqlynOs = detectOs(),
): LinkSubscription {
  if (os !== 'ios') {
    return { unsubscribe() {} }
  }
  return observeLinks((link) => {
    if (isIosPlatformLink(link)) listener(link)
  })
}

export { isIosPlatformLink }
