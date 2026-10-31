/**
 * Shares short-lived visitor reads while preserving no-store request ownership.
 * @packageDocumentation
 */
import { viewerFetch } from './viewerApi'

const _inFlight = new Map<string, Promise<Response>>()
const _cache = new Map<string, { data: unknown; ts: number }>()

const DEFAULT_TTL = 5_000

/** Cancel only this caller's wait/body, never the shared read or another chart's response clone. */
function callerResponse(promise: Promise<Response>, signal?: AbortSignal | null): Promise<Response> {
  if (!signal) return promise.then(response => response.clone())
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    if (signal.aborted) { abort(); return }
    signal.addEventListener('abort', abort, { once: true })
    promise.then(response => {
      signal.removeEventListener('abort', abort)
      if (signal.aborted) { abort(); return }
      const clone = response.clone()
      const body = clone.body?.pipeThrough(new TransformStream(), { signal }) ?? null
      resolve(new Response(body, { status: clone.status, statusText: clone.statusText, headers: clone.headers }))
    }, error => {
      signal.removeEventListener('abort', abort)
      reject(error)
    }).catch(reject)
  })
}

/** Share eligible GET transport while retaining per-caller cancellation; no-store reads stay wholly independent. */
export function dedupFetch(url: string, init?: RequestInit): Promise<Response> {
  // Paged snapshots must not accumulate in the shared cache or inherit another
  // viewer's AbortSignal through in-flight coalescing.
  if (init?.cache === 'no-store') return viewerFetch(url, init)
  const method = (init?.method ?? 'GET').toUpperCase()
  const isRead = method === 'GET' && !init?.body
  if (!isRead) return viewerFetch(url, init)
  if (init?.signal?.aborted) return Promise.reject(init.signal.reason ?? new DOMException('Aborted', 'AbortError'))

  const cached = _cache.get(url)
  if (cached && Date.now() - cached.ts < DEFAULT_TTL) {
    return callerResponse(Promise.resolve(new Response(JSON.stringify(cached.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'x-cache': 'hit' },
    })), init?.signal)
  }

  const inFlight = _inFlight.get(url)
  if (inFlight) return callerResponse(inFlight, init?.signal)

  // A shared read can outlive all current callers, but never an unbounded transport deadline.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  const promise = viewerFetch(url, { ...init, signal: controller.signal }).then(async (r) => {
    if (r.ok) {
      try {
        const clone = r.clone()
        const data = await clone.json()
        _cache.set(url, { data, ts: Date.now() })
      } catch {
        // non-JSON or streaming — don't cache
      }
    }
    return r
  }).finally(() => {
    clearTimeout(timeout)
    if (_inFlight.get(url) === promise) _inFlight.delete(url)
  })

  _inFlight.set(url, promise)
  return callerResponse(promise, init?.signal)
}

/** Clears one retained response, or all retained responses and in-flight registrations. */
export function clearDedupCache(url?: string) {
  if (url) {
    _cache.delete(url)
  } else {
    _cache.clear()
    _inFlight.clear()
  }
}
