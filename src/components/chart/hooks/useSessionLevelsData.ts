import { useEffect, useState } from 'react'
import { SourceKey } from '../../../store/persistedState'
import { fetchAgentFolderData } from './useAgentFolderData'

export interface SessionLevelRow {
  date: string
  pair: string
  session: string
  start: string
  end: string
  open: number
  high: number
  low: number
  close: number
  avg_50: number
  range: number
  direction: string
  range_pips: number
  range_atr: number | null
  range_zscore_60: number | null
  range_zscore_120: number | null
  range_zscore_252: number | null
  range_quantile_60: number | null
  range_quantile_120: number | null
  range_quantile_252: number | null
  return_std_m5: number | null
  return_std_m15: number | null
  return_std_h1: number | null
  realized_vol_m5: number | null
  realized_vol_m15: number | null
  realized_vol_h1: number | null
  vol_regime: string | null
}

interface Params {
  symbol: string
  sources: Record<SourceKey, string | null>
  enabled: boolean
  broker: string | null
  sessionRowsRef: React.MutableRefObject<SessionLevelRow[]>
}

interface Result {
  hasSessionLevels: boolean
}

export function useSessionLevelsData(p: Params): Result {
  const [hasSessionLevels, setHasSessionLevels] = useState(false)

  useEffect(() => {
    p.sessionRowsRef.current = []
    setHasSessionLevels(false)

    if (!p.enabled) return
    if (!p.sources.sessionLevels) return

    const controller = new AbortController()
    fetchAgentFolderData<SessionLevelRow>(
      'session_levels',
      p.symbol,
      'rows',
      p.sources.sessionLevels,
      controller.signal,
      p.broker,
    )
      .then((rows) => {
        if (!rows?.length) return
        p.sessionRowsRef.current = rows
        setHasSessionLevels(true)
      })
      .catch(err => { if (err.name !== 'AbortError') { /* ignore */ } })
    return () => controller.abort()
  }, [p.symbol, p.sources.sessionLevels, p.enabled, p.broker])  // eslint-disable-line react-hooks/exhaustive-deps

  return { hasSessionLevels }
}
