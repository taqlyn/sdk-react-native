import { API_ORIGIN, type ConfigureOptions, type ShareLink, type ShareLinkInput } from './types'

interface Session {
  clientId: string
  publicKeyId: string
  env?: string
}

let session: Session | null = null

export function rememberSession(
  clientId: string,
  publicKeyId: string,
  options: ConfigureOptions,
): ConfigureOptions {
  session = {
    clientId: clientId.trim(),
    publicKeyId: publicKeyId.trim(),
    env: options.env,
  }
  return options
}

export function clearSession(): void {
  session = null
}

/** Create a unified short link for in-app sharing (public key id only). */
export async function createShareLink(input: ShareLinkInput): Promise<ShareLink> {
  if (!session) {
    throw new Error('configure before createShareLink')
  }
  const path = input.destinationPath?.trim() ?? ''
  const web = input.destinationWeb?.trim() ?? ''
  if (!path && !web) {
    throw new Error('destinationPath or destinationWeb required')
  }

  const res = await fetch(`${API_ORIGIN}/v1/sdk/short-links`, {
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
      destinationPath: path || undefined,
      destinationWeb: web || undefined,
      params: input.params,
      ogTitle: input.ogTitle,
      ogDescription: input.ogDescription,
      ogImage: input.ogImage,
      trackUniqueUsers: input.trackUniqueUsers,
      trackOpens: input.trackOpens,
      env: session.env,
    }),
  })
  if (!res.ok) {
    throw new Error(`createShareLink failed: ${res.status}`)
  }
  const body = (await res.json()) as {
    id: string
    code: string
    shortUrl: string
    host: string
    env: string
  }
  return {
    id: body.id,
    code: body.code,
    shortUrl: body.shortUrl,
    host: body.host,
    env: body.env,
  }
}

let anonymousId = ''

function deviceAnonymousId(): string {
  if (anonymousId) return anonymousId
  anonymousId =
    (globalThis.crypto && 'randomUUID' in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : `anon_${Date.now()}`)
  return anonymousId
}

/** Report that the SDK opened/consumed a link (first-party open tracking). */
export async function trackOpen(linkId: string): Promise<void> {
  if (!session) return
  const id = linkId.trim()
  if (!id) return
  await fetch(`${API_ORIGIN}/v1/events/open`, {
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
      linkId: id,
      anonymousId: deviceAnonymousId(),
    }),
  }).catch(() => {
    /* never block navigation on analytics */
  })
}

