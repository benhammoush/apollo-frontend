import { API_URL } from './viewerApi'
import { dedupFetch, clearDedupCache } from './dedupFetch'

export interface FetchMeta {
  trigger: 'manual' | 'auto'
  interval?: number
}

export function fetchWithMeta(
  url: string,
  init?: RequestInit,
  meta?: FetchMeta,
): Promise<Response> {
  const headers = new Headers(init?.headers)
  if (meta) {
    headers.set('X-Query-Trigger', meta.trigger)
    if (meta.interval) headers.set('X-Query-Interval', String(meta.interval))
  }
  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`
  return dedupFetch(fullUrl, { ...init, headers })
}

export function clearCacheForUrl(url: string) {
  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`
  clearDedupCache(fullUrl)
}

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  meta?: FetchMeta,
  maxRetries = 3,
): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const signal = init?.signal
      const connectSignal = signal ?? new AbortController().signal
      const r = await fetchWithMeta(url, { ...init, signal: connectSignal }, meta)
      if (r.ok) return r
      if (attempt === maxRetries) return r
    } catch (err) {
      lastError = err
      if (err instanceof DOMException && err.name === 'AbortError') throw err
    }
    if (attempt < maxRetries) {
      const delay = Math.min(1000 * 2 ** attempt, 8000)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastError
}
