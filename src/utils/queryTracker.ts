import { pathToGroup } from './queryLabels'

export interface QueryEntry {
  key: string
  method: string
  label: string
  path: string
  status: 'pending' | 'success' | 'error'
  statusCode?: number
  duration?: number
  timestamp: number
  firstSeen: number
  callCount: number
  trigger: 'manual' | 'auto' | 'unknown'
  interval?: number
}

let entries = new Map<string, QueryEntry>()

function dispatch() {
  window.dispatchEvent(new CustomEvent('apollo:query:update'))
}

function extractMeta(init?: RequestInit): { trigger: 'manual' | 'auto' | 'unknown'; interval?: number } {
  if (!init?.headers) return { trigger: 'unknown' }

  const h = new Headers(init.headers)
  const trigger = (h.get('X-Query-Trigger') as 'manual' | 'auto') || 'unknown'
  const intervalStr = h.get('X-Query-Interval')
  const interval = intervalStr ? parseInt(intervalStr, 10) : undefined

  h.delete('X-Query-Trigger')
  h.delete('X-Query-Interval')
  init.headers = h

  return { trigger, interval }
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof Request) return input.url
  return input.href
}

function resolveMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase()
  if (input instanceof Request) return input.method.toUpperCase()
  return 'GET'
}

const _fetch = window.fetch.bind(window)

window.fetch = function (this: typeof globalThis, input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = resolveMethod(input, init)
  const rawUrl = resolveUrl(input)
  const meta = extractMeta(init)

  const { key: groupKey, label: groupLabel } = pathToGroup(rawUrl, method)
  const entryKey = `${method}:${groupKey}`
  const now = Date.now()

  const existing = entries.get(entryKey)
  if (existing) {
    existing.status = 'pending'
    existing.statusCode = undefined
    existing.duration = undefined
    existing.timestamp = now
    existing.path = rawUrl
    existing.callCount++
    if (meta.trigger !== 'unknown') {
      existing.trigger = meta.trigger
      existing.interval = meta.interval
    }
  } else {
    entries.set(entryKey, {
      key: entryKey,
      method,
      label: groupLabel,
      path: rawUrl,
      status: 'pending',
      timestamp: now,
      firstSeen: now,
      callCount: 1,
      trigger: meta.trigger,
      interval: meta.interval,
    })
  }

  dispatch()

  const start = performance.now()
  const entry = entries.get(entryKey)!

  return _fetch(input, init)
    .then(res => {
      entry.status = res.ok ? 'success' : 'error'
      entry.statusCode = res.status
      entry.duration = Math.round(performance.now() - start)
      dispatch()
      return res
    })
    .catch(err => {
      entry.status = 'error'
      entry.duration = Math.round(performance.now() - start)
      dispatch()
      throw err
    })
} as typeof window.fetch

export function getQueryLog(): QueryEntry[] {
  return Array.from(entries.values())
}

export function clearQueryLog() {
  entries.clear()
  dispatch()
}
