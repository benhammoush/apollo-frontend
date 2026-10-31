import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { API_URL } from '../utils/viewerApi'
import { dedupFetch } from '../utils/dedupFetch'
import { clearCacheForUrl } from '../utils/fetchWithMeta'

interface BrokerDataContextValue {
  brokers: string[]
  loading: boolean
  refetch: () => void
}

const BrokerDataContext = createContext<BrokerDataContextValue>({
  brokers: [],
  loading: true,
  refetch: () => {},
})

const FALLBACK_INTERVAL = 60_000

export function BrokerDataProvider({ children }: { children: React.ReactNode }) {
  const [brokers, setBrokers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)
  const lastEventRef = useRef(0)

  const refetch = useCallback(() => {
    clearCacheForUrl('/data/brokers')
    lastEventRef.current = Date.now()
    setVersion(v => v + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    const fetchOnce = async () => {
      if (cancelled) return
      try {
        clearCacheForUrl('/data/brokers')
        const r = await dedupFetch(`${API_URL}/data/brokers`, {
          signal: controller.signal,
          headers: { 'X-Query-Trigger': 'manual' },
        })
        if (!cancelled) {
          const d = await r.json()
          setBrokers(d.brokers ?? [])
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchOnce()
    return () => { cancelled = true; controller.abort() }
  }, [version])

  useEffect(() => {
    const handler = () => refetch()
    window.addEventListener('apollo:brokers_changed', handler)
    return () => window.removeEventListener('apollo:brokers_changed', handler)
  }, [refetch])

  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - lastEventRef.current > FALLBACK_INTERVAL) {
        refetch()
      }
    }, FALLBACK_INTERVAL)
    return () => clearInterval(id)
  }, [refetch])

  return (
    <BrokerDataContext.Provider value={{ brokers, loading, refetch }}>
      {children}
    </BrokerDataContext.Provider>
  )
}

export function useBrokers() {
  return useContext(BrokerDataContext)
}
