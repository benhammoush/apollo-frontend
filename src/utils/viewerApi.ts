/**
 * Viewer read transport and inert compatibility signatures, with no job/mutation wiring.
 * @packageDocumentation
 */
import { ngrokRequestInit } from './ngrokRequestInit'

export const API_URL = import.meta.env.VITE_API_URL || ''

let heavyReadTail: Promise<unknown> = Promise.resolve()

/** Serialize expensive bodies, not just headers; cancelled waiters never advance an active transport. */
function heavyRead(url: string, init?: RequestInit): Promise<Response> {
  const signal = init?.signal
  const aborted = () => signal?.reason ?? new DOMException('Aborted', 'AbortError')
  if (signal?.aborted) return Promise.reject(aborted())
  const read = heavyReadTail.then(async () => {
    if (signal?.aborted) throw aborted()
    const response = await fetch(url, ngrokRequestInit(url, API_URL, init))
    // Native fetch resolves at headers, while the server is still holding its work admission.
    await response.clone().arrayBuffer()
    return response
  })
  heavyReadTail = read.catch(() => {})
  if (!signal) return read
  return new Promise((resolve, reject) => {
    const abort = () => reject(aborted())
    signal.addEventListener('abort', abort, { once: true })
    read.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
  })
}

/** Sends a resolved API request, adding warning bypass only for configured ngrok reads. */
export function viewerFetch(url: string, init?: RequestInit): Promise<Response> {
  const path = new URL(url, 'http://viewer.local').pathname.replace(/^\/api(?=\/)/, '')
  if ((init?.method ?? 'GET').toUpperCase() === 'GET' &&
      (path.startsWith('/market/') || path === '/storage/file')) return heavyRead(url, init)
  return fetch(url, ngrokRequestInit(url, API_URL, init))
}

/** Reads visitor JSON and rejects unsuccessful HTTP responses. */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await viewerFetch(`${API_URL}${path}`, { headers: { 'X-Query-Trigger': 'manual' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/** Rejects unavailable writes without making a request. */
export async function apiPost<T>(_path: string, _body: unknown): Promise<T> {
  throw new Error('Unavailable in this interface')
}
/** Rejects unavailable updates without making a request. */
export async function apiPut<T>(_path: string, _body: unknown): Promise<T> {
  throw new Error('Unavailable in this interface')
}
/** Rejects unavailable deletions without making a request. */
export async function apiDelete<T>(_path: string): Promise<T> {
  throw new Error('Unavailable in this interface')
}

export type UnifiedJobStatus = {
  job_id: string
  agent?: string
  status: string
  worker?: string
  progress?: Record<string, unknown>
  started_at?: string | null
  finished_at?: string | null
  run_id?: string | null
  error?: string | null
  last_log?: string
}
export type ApiEnvelope<T> = { status: 'ok'; data: T }

/** Rejects unavailable job cancellation without making a request. */
export async function apiCancelJob(_jobId: string): Promise<{ job_id: string; killed_pids: number[] }> {
  throw new Error('Unavailable in this interface')
}
/** Rejects access to private operational job results without making a request. */
export async function apiGetJobResult<T>(_jobId: string): Promise<T> {
  throw new Error('Unavailable in this interface')
}
