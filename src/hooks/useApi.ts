/**
 * Loads visitor JSON with cancellable optional polling and explicit errors.
 * @packageDocumentation
 */
import { useState, useEffect, useCallback } from 'react'
import { API_URL, viewerFetch } from '../utils/viewerApi'

/** Reads a visitor path; polling stops and its current request aborts when the hook is cleaned up. */
export function useApi<T>(path: string, interval = 0) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const refetch = useCallback(() => {
    setVersion(v => v + 1)
  }, [])

  useEffect(() => {
    if (!path) {
      setData(null)
      setLoading(false)
      return
    }
    const controller = new AbortController()
    let timeoutId: number | undefined
    let cancelled = false

    const poll = async () => {
      if (cancelled) return
      const headers: Record<string, string> = {
        'X-Query-Trigger': interval > 0 ? 'auto' : 'manual',
      }
      if (interval > 0) headers['X-Query-Interval'] = String(interval)

      try {
        setLoading(true)
        const res = await viewerFetch(`${API_URL}${path}`, { signal: controller.signal, headers })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        if (!cancelled) setError(String(e))
      } finally {
        if (!cancelled) setLoading(false)
        if (!cancelled && interval > 0) {
          timeoutId = window.setTimeout(poll, interval)
        }
      }
    }

    poll()
    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, [path, interval, version])

  return { data, loading, error, refetch }
}
