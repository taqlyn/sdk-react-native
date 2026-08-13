/**
 * Android-only custom listener. No-op on other platforms.
 * Delivers App Links + Play Install Referrer / claim deferred.
 */
import { observeLinks } from '../facade'
import type { LinkListener, LinkSubscription } from '../types'
import { detectOs, isAndroidPlatformLink, type TaqlynOs } from './match'

export function observeAppLinks(
  listener: LinkListener,
  os: TaqlynOs = detectOs(),
): LinkSubscription {
  if (os !== 'android') {
    return { unsubscribe() {} }
  }
  return observeLinks((link) => {
    if (isAndroidPlatformLink(link)) listener(link)
  })
}

export { isAndroidPlatformLink }
