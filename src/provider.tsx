import type { DeferredLink } from '@taqlyn/sdk-contract'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  configure,
  consume,
  observePlatformLinks,
  resolveDeferred,
  setReadyForNavigation,
} from './facade'
import { awaitPendingExpand } from './expand'
import type { ConfigureOptions } from './types'

export type TaqlynContextValue = {
  /** True once first deferred resolve attempt finished (match or null). */
  isLinkProcessed: boolean
  /** Held deferred link until clearLink / consume. */
  link: DeferredLink | null
  clearLink: () => void
  /** Auth/onboarding gate — when true, deferred delivery is allowed. */
  ready: boolean
  setReady: (ready: boolean) => void
}

const TaqlynContext = createContext<TaqlynContextValue | null>(null)

export type TaqlynProviderProps = {
  clientId: string
  publicKeyId: string
  config?: ConfigureOptions
  children: ReactNode
  /**
   * When true (default), call resolveDeferred on mount and observe platform links.
   * Pair with linkProcessingMode: 'deferred-only' when +native-intent owns warm URLs.
   */
  autoResolve?: boolean
}

/**
 * Detour-style root provider: configure + deferred resolve + ready-gate context.
 */
export function TaqlynProvider({
  clientId,
  publicKeyId,
  config = {},
  children,
  autoResolve = true,
}: TaqlynProviderProps) {
  const [isLinkProcessed, setProcessed] = useState(false)
  const [link, setLink] = useState<DeferredLink | null>(null)
  const [ready, setReadyState] = useState(false)

  useEffect(() => {
    configure(clientId, publicKeyId, config)
  }, [clientId, publicKeyId, config])

  useEffect(() => {
    if (!autoResolve) {
      setProcessed(true)
      return
    }
    let cancelled = false
    const sub = observePlatformLinks((next) => {
      if (!cancelled) setLink(next)
    })
    void (async () => {
      const deferred = await resolveDeferred()
      if (!cancelled && deferred) setLink(deferred)
      if (!cancelled) setProcessed(true)
      const pending = await awaitPendingExpand()
      if (!cancelled && pending?.href && pending.linkId) {
        /* optimistic expand finished — caller navigates via nav helpers */
      }
    })()
    return () => {
      cancelled = true
      sub.unsubscribe()
    }
  }, [autoResolve, clientId, publicKeyId])

  const setReady = useCallback((next: boolean) => {
    setReadyState(next)
    setReadyForNavigation(next)
  }, [])

  const clearLink = useCallback(() => {
    setLink((prev) => {
      if (prev?.linkId) consume(prev.linkId)
      return null
    })
  }, [])

  const value = useMemo(
    () => ({ isLinkProcessed, link, clearLink, ready, setReady }),
    [isLinkProcessed, link, clearLink, ready, setReady],
  )

  return <TaqlynContext.Provider value={value}>{children}</TaqlynContext.Provider>
}

export function useTaqlynContext(): TaqlynContextValue {
  const ctx = useContext(TaqlynContext)
  if (!ctx) {
    throw new Error('useTaqlynContext must be used within TaqlynProvider')
  }
  return ctx
}

/**
 * Auth/onboarding gate helper — hold navigation until ready + link processed.
 * Returns whether the app should still show a splash / sign-in shell.
 */
export function useTaqlynGate(): {
  holding: boolean
  link: DeferredLink | null
  isLinkProcessed: boolean
  ready: boolean
} {
  const { isLinkProcessed, link, ready } = useTaqlynContext()
  // Hold splash until deferred resolve finished and app called setReady(true).
  const holding = !isLinkProcessed || !ready
  return { holding, link, isLinkProcessed, ready }
}
