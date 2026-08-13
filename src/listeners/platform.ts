import type { LinkListener, LinkSubscription } from '../types'
import { observeAppLinks } from './android'
import { observeUniversalLinks } from './ios'
import { detectOs, type TaqlynOs } from './match'

export {
  __setPlatformOsForTests,
  isAndroidPlatformLink,
  isIosPlatformLink,
} from './match'
export { observeAppLinks } from './android'
export { observeUniversalLinks } from './ios'

/** Platform-gated listener: iOS UL/clipboard, Android App Links/referrer. */
export function observePlatformLinks(
  listener: LinkListener,
  os: TaqlynOs = detectOs(),
): LinkSubscription {
  if (os === 'ios') return observeUniversalLinks(listener, os)
  if (os === 'android') return observeAppLinks(listener, os)
  return { unsubscribe() {} }
}
