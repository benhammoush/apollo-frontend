import { useEffect, useState } from 'react'
import { SourceKey } from '../../../store/persistedState'
import { TrendSegment } from '../types'
import { TREND_TFS, TrendTF } from '../types'
import { fetchAgentFolderData } from './useAgentFolderData'

interface Params {
  symbol: string
  sources: Record<SourceKey, string | null>
  enabled: boolean
  broker: string | null
  trendSegsRef: React.MutableRefObject<TrendSegment[]>
  bgDirtyRef: React.MutableRefObject<boolean>
}

interface Result {
  hasTrends: boolean
  loadedTrendTFs: TrendTF[]
}

export function useTrendsData(p: Params): Result {
  const [hasTrends, setHasTrends] = useState(false)
  const [loadedTrendTFs, setLoadedTrendTFs] = useState<TrendTF[]>([])

  useEffect(() => {
    p.trendSegsRef.current = []
    setHasTrends(false)
    setLoadedTrendTFs([])

    if (!p.enabled) return
    if (!p.sources.trends) return

    const controller = new AbortController()
    fetchAgentFolderData<{ time: string; tf: string; trend: string }>(
      'trends',
      p.symbol,
      'changes',
      p.sources.trends,
      controller.signal,
      p.broker,
    )
      .then((changes) => {
        if (!changes) return

        const nowTs = Math.floor(Date.now() / 1000)
        const segments: TrendSegment[] = []

        for (const trendTf of TREND_TFS) {
          const tfChanges = changes
            .filter(c => c.tf === trendTf)
            .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

          for (let i = 0; i < tfChanges.length; i++) {
            const change = tfChanges[i]
            const direction = change.trend === 'buy' ? 'buy' : 'sell'
            const timeFrom = Math.floor(new Date(change.time).getTime() / 1000)
            const timeTo = i + 1 < tfChanges.length
              ? Math.floor(new Date(tfChanges[i + 1].time).getTime() / 1000)
              : nowTs

            segments.push({ tf: trendTf, direction, type: '', timeFrom, timeTo })
          }
        }

        p.trendSegsRef.current = segments
        setHasTrends(segments.length > 0)
        setLoadedTrendTFs([...new Set(segments.map(s => s.tf))] as TrendTF[])
        p.bgDirtyRef.current = true
      })
      .catch(err => { if (err.name !== 'AbortError') p.trendSegsRef.current = [] })
    return () => controller.abort()
  }, [p.symbol, p.sources.trends, p.enabled, p.broker])  // eslint-disable-line react-hooks/exhaustive-deps

  return { hasTrends, loadedTrendTFs }
}
