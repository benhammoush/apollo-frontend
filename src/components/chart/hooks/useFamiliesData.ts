import { useCallback, useEffect, useState } from 'react'
import { IChartApi, ISeriesApi } from 'lightweight-charts'
import { FamilySnapshot } from '../../../types'
import { SourceKey } from '../../../store/persistedState'
import { FamilyTF } from '../types'
import { fetchAgentFolderData } from './useAgentFolderData'

interface Params {
  symbol: string
  sources: Record<SourceKey, string | null>
  enabled: boolean
  broker: string | null
  chartRef: React.MutableRefObject<IChartApi | null>
  familyRowsRef: React.MutableRefObject<FamilySnapshot[]>
  familyBuyOrdinalSeriesRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  familySellOrdinalSeriesRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  familyTFVisibleRef: React.MutableRefObject<Set<FamilyTF>>
  showBB: boolean
  barsVersion: number
}

interface Result {
  hasFamilyData: boolean
  syncFamilyLineVisibility: () => void
  refreshFamilyLines: () => void
}

export function useFamiliesData(p: Params): Result {
  const [hasFamilyData, setHasFamilyData] = useState(false)

  const removeFamilySeries = useCallback(() => {
    const c = p.chartRef.current
    if (!c) return
    if (p.familyBuyOrdinalSeriesRef.current) {
      c.removeSeries(p.familyBuyOrdinalSeriesRef.current)
      p.familyBuyOrdinalSeriesRef.current = null
    }
    if (p.familySellOrdinalSeriesRef.current) {
      c.removeSeries(p.familySellOrdinalSeriesRef.current)
      p.familySellOrdinalSeriesRef.current = null
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const syncFamilyLineVisibility = useCallback(() => {
    const visible = p.familyTFVisibleRef.current.size > 0
    p.familyBuyOrdinalSeriesRef.current?.applyOptions({ visible })
    p.familySellOrdinalSeriesRef.current?.applyOptions({ visible })
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const applyFamilyLineData = useCallback(() => {
    removeFamilySeries()
  }, [removeFamilySeries])

  useEffect(() => {
    p.familyRowsRef.current = []
    setHasFamilyData(false)
    removeFamilySeries()

    if (!p.enabled) return
    if (!p.sources.families) return

    const controller = new AbortController()
    fetchAgentFolderData<FamilySnapshot>(
      'families',
      p.symbol,
      'families',
      p.sources.families,
      controller.signal,
      p.broker,
    )
      .then((families) => {
        if (!families?.length) return
        p.familyRowsRef.current = families
        setHasFamilyData(true)
        requestAnimationFrame(() => applyFamilyLineData())
      })
      .catch(err => { if (err.name !== 'AbortError') { /* ignore */ } })
    return () => controller.abort()
  }, [p.symbol, p.sources.families, p.enabled, p.broker, applyFamilyLineData, removeFamilySeries])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!p.familyRowsRef.current.length) return
    requestAnimationFrame(() => applyFamilyLineData())
  }, [p.showBB, p.barsVersion, applyFamilyLineData])

  const refreshFamilyLines = useCallback(() => {
    applyFamilyLineData()
  }, [applyFamilyLineData])

  return { hasFamilyData, syncFamilyLineVisibility, refreshFamilyLines }
}
