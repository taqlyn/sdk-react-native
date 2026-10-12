import {
  effectiveResolveMode,
  type ExpandResult,
  type ResolveMode,
  type ResolvedNavTarget,
} from '@taqlyn/sdk-contract'
import { API_ORIGIN, type ConfigureOptions } from './types'

interface Session {
  clientId: string
  publicKeyId: string
  env?: string
  resolveMode?: ResolveMode
  fallbackPath?: string
  hosts: string[]
  timeoutMs: number
}

let session: Session | null = null
let pendingExpandPromise: Promise<ResolvedNavTarget | null> | null = null

export function rememberExpandSession(
  clientId: string,
  publicKeyId: string,
  options: ConfigureOptions,
): void {
  session = {
    clientId: clientId.trim(),
    publicKeyId: publicKeyId.trim(),
    env: options.env,
    resolveMode: options.resolveMode,
    fallbackPath: options.fallbackPath ?? '/',
    hosts: options.hosts ?? [],
    timeoutMs: options.timeoutMs ?? 1500,
  }
  pendingExpandPromise = null
}

export function clearExpandSession(): void {
  session = null
  pendingExpandPromise = null
}

/**
 * When `resolveIncomingUrl` returned `pendingExpand`, await the background expand
 * and `router.replace` the destination (optimistic mode).
 */
export function awaitPendingExpand(): Promise<ResolvedNavTarget | null> {
  return pendingExpandPromise ?? Promise.resolve(null)
}

/** Expand a short URL via POST /v1/links/expand. */
export async function resolveShortLink(url: string): Promise<ExpandResult | null> {
  if (!session) return null
  try {
    const res = await fetch(`${API_ORIGIN}/v1/links/expand`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Taqlyn-Client-Id': session.clientId,
        'X-Taqlyn-Public-Key-Id': session.publicKeyId,
      },
      body: JSON.stringify({
        clientId: session.clientId,
        publicKeyId: session.publicKeyId,
        url,
        env: session.env,
      }),
    })
    if (res.status === 404) return null
    if (!res.ok) return null
    const body = (await res.json()) as {
      linkId: string
      code: string
      host: string
      destinationPath: string
      params?: Record<string, unknown>
      url: string
      linkResolveMode?: ResolveMode
      appResolveMode?: ResolveMode
      appExpandTimeoutMs?: number
    }
    const params: Record<string, string> = {}
    if (body.params) {
      for (const [k, v] of Object.entries(body.params)) {
        params[k] = String(v)
      }
    }
    if (
      body.appExpandTimeoutMs != null &&
      Number.isFinite(body.appExpandTimeoutMs) &&
      session
    ) {
      session.timeoutMs = Math.max(100, body.appExpandTimeoutMs)
    }
    return {
      linkId: body.linkId,
      code: body.code,
      host: body.host,
      destinationPath: body.destinationPath || '/',
      params,
      url: body.url,
      linkResolveMode: body.linkResolveMode ?? null,
      appResolveMode: body.appResolveMode ?? null,
      appExpandTimeoutMs: body.appExpandTimeoutMs ?? null,
    }
  } catch {
    return null
  }
}

export async function resolveIncomingUrl(url: string): Promise<ResolvedNavTarget | null> {
  if (!session) return pathMapOnly(url)
  if (!shouldExpand(url, session.hosts)) return pathMapOnly(url)
  const fallback = session.fallbackPath?.trim() || '/'
  const clientMode = session.resolveMode ?? 'await'
  // First paint uses client mode; link/app cascade applies once expand metadata returns
  // (and is exposed via ExpandResult / awaitPendingExpand).
  if (clientMode === 'optimistic') {
    pendingExpandPromise = (async () => {
      const result = await resolveShortLink(url)
      if (!result) return { href: fallback }
      const mode = effectiveResolveMode(
        result.linkResolveMode,
        result.appResolveMode,
        clientMode,
      )
      void mode
      return { href: hrefFromExpand(result), linkId: result.linkId }
    })()
    return { href: fallback, pendingExpand: true }
  }
  const timeoutMs = Math.max(100, session.timeoutMs)
  const result = await withTimeout(timeoutMs, () => resolveShortLink(url))
  if (result) {
    return { href: hrefFromExpand(result), linkId: result.linkId }
  }
  return { href: fallback }
}

/** Exported for unit tests. */
export function shouldExpand(url: string, hosts: string[]): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  const host = parsed.hostname.toLowerCase()
  const hostOk =
    hosts.length === 0
      ? true
      : hosts.some((prefix) => {
          let p = prefix.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
          return host === p || host.endsWith(`.${p}`) || url.startsWith(prefix)
        })
  if (!hostOk) return false
  const path = parsed.pathname.replace(/^\/+|\/+$/g, '')
  if (!path || path.includes('/')) return false
  return /^[A-Za-z0-9_-]{4,32}$/.test(path)
}

function pathMapOnly(url: string): ResolvedNavTarget | null {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname || '/'
    return { href: `${path}${parsed.search}` }
  } catch {
    return null
  }
}

function hrefFromExpand(result: ExpandResult): string {
  const path = result.destinationPath.startsWith('/')
    ? result.destinationPath
    : `/${result.destinationPath}`
  const qs = new URLSearchParams(result.params).toString()
  return qs ? `${path}?${qs}` : path
}

async function withTimeout<T>(
  ms: number,
  fn: () => Promise<T | null>,
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      fn(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
