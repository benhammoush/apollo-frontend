import { useEffect, useState } from 'react'
import { SourceKey } from '../../../store/persistedState'
import { Trigger } from '../types'
import { fetchAgentFolderData } from './useAgentFolderData'

interface Params {
  symbol: string
  sources: Record<SourceKey, string | null>
  enabled: boolean
  broker: string | null
  triggersRef: React.MutableRefObject<Trigger[]>
  setSelectedOppIdx: (idx: number) => void
  setPinnedOpps: (s: Set<number>) => void
  visibleStart?: number
  visibleEnd?: number
}

interface Result {
  triggers: Trigger[]
  setTriggers: React.Dispatch<React.SetStateAction<Trigger[]>>
}

export function useTriggersData(p: Params): Result {
  const [triggers, setTriggers] = useState<Trigger[]>([])

  useEffect(() => {
    p.triggersRef.current = []
    setTriggers([])
    p.setSelectedOppIdx(-1)
    p.setPinnedOpps(new Set())

    if (!p.enabled) {
      console.warn('[TriggersBT] fetch skipped — enabled is false')
      return
    }

    if (!p.sources.triggers) return

    console.warn('[TriggersBT] fetching for', p.symbol, 'folder:', p.sources.triggers, 'broker:', p.broker, 'range:', p.visibleStart, p.visibleEnd)
    const controller = new AbortController()
    fetchAgentFolderData<Trigger>(
      'Triggers_BT',
      p.symbol,
      'triggers',
      p.sources.triggers,
      controller.signal,
      p.broker,
      p.visibleStart,
      p.visibleEnd,
    )
      .then((rows) => {
        if (!rows?.length) {
          console.warn('[TriggersBT] fetch returned empty or null')
          return
        }
        const withId = rows.map((row, i) => ({ ...row, id: i + 1 }))
        console.warn('[TriggersBT] loaded', withId.length, 'rows')
        p.triggersRef.current = withId
        setTriggers(withId)
      })
      .catch(err => {
        if (err.name !== 'AbortError') console.warn('[TriggersBT] fetch error:', err.message)
      })
    return () => controller.abort()
  }, [p.symbol, p.sources.triggers, p.enabled, p.broker])  // eslint-disable-line react-hooks/exhaustive-deps

  return { triggers, setTriggers }
}
