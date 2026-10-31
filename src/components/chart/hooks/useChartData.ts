import { useEffect, useMemo, useState } from 'react'
import {
  IChartApi, ISeriesApi,
  Time,
} from 'lightweight-charts'
import { OHLCVBar, PriceLevel, BBPctPoint, FamilySnapshot } from '../../../types'
import { SourceKey, type ChartIndicatorsState, type LevelsIndicatorState } from '../../../store/persistedState'
import { TrendTF, TrendSegment, Trigger, FamilyTF } from '../types'
import { fetchWithMeta, clearCacheForUrl, fetchWithRetry } from '../../../utils/fetchWithMeta'
import { useOhlcvData } from './useOhlcvData'
import { useTrendsData } from './useTrendsData'
import { useFamiliesData } from './useFamiliesData'
import { useTriggersData } from './useTriggersData'
import { useBollingerBandsData } from './useBollingerBandsData'
import { useSessionLevelsData, type SessionLevelRow } from './useSessionLevelsData'

export interface DatasetEntry {
  name: string
  source: string
  created_at: string
  agents: string[]
  brokers: Record<string, string | null>
}

interface Params {
  symbol: string
  tf: string
  sources: Record<SourceKey, string | null>
  broker: string | null
  showBB: boolean
  showTrends: Record<string, boolean>
  showFamilies: boolean
  indicators: ChartIndicatorsState

  trendSegsRef: React.MutableRefObject<TrendSegment[]>
  familyRowsRef: React.MutableRefObject<FamilySnapshot[]>
  familyBuyOrdinalSeriesRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  familySellOrdinalSeriesRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  familyTFVisibleRef: React.MutableRefObject<Set<FamilyTF>>
  triggersRef: React.MutableRefObject<Trigger[]>
  sessionRowsRef: React.MutableRefObject<SessionLevelRow[]>
  segmentsRef: React.MutableRefObject<PriceLevel[]>
  bbPointsRef: React.MutableRefObject<BBPctPoint[]>
  barsRef: React.MutableRefObject<OHLCVBar[]>
  loadedFromRef: React.MutableRefObject<number>
  isFetchingMoreRef: React.MutableRefObject<boolean>
  trendHLCacheRef: React.MutableRefObject<Map<string, { high: number; low: number }>>
  lastLoadAttemptRef: React.MutableRefObject<number>

  bgDirtyRef: React.MutableRefObject<boolean>

  chartRef: React.MutableRefObject<IChartApi | null>
  candleRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>
  bbLineRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  bbGreenRef: React.MutableRefObject<ISeriesApi<'Area'> | null>
  bbRedRef: React.MutableRefObject<ISeriesApi<'Baseline'> | null>

  tfRef: React.MutableRefObject<string>
  symbolRef: React.MutableRefObject<string>
  brokerRef: React.MutableRefObject<string | null>

  tooltipElRef: React.MutableRefObject<HTMLDivElement | null>

  setSelectedOppIdx: (idx: number) => void
  setPinnedOpps: (s: Set<number>) => void

  pendingNavTsRef: React.MutableRefObject<number | null>
  reloadCounter: number
  datasetsVisible: boolean
}

interface Result {
  isLoading: boolean
  bbLoading: boolean
  bbPaneHeight: number
  barsVersion: number
  setBbPaneHeight: React.Dispatch<React.SetStateAction<number>>
  hasTrends: boolean
  loadedTrendTFs: TrendTF[]
  hasFamilyData: boolean
  hasSessionLevels: boolean
  triggers: Trigger[]
  syncFamilyLineVisibility: () => void
  setTriggers: React.Dispatch<React.SetStateAction<Trigger[]>>
  availableDatasets: DatasetEntry[]
  loadOlderChunk: () => void
  navigateToDate: (targetTs: number) => void
  refreshFamilyLines: () => void
}

function getBrokerForSource(
  sources: Record<SourceKey, string | null>,
  sourceKey: SourceKey,
  agentName: string,
  datasets: DatasetEntry[],
): string | null {
  const folderName = sources[sourceKey]
  if (!folderName) return null
  const entry = datasets.find(d => d.name === folderName && d.agents.includes(agentName))
  return entry?.brokers?.[agentName] ?? null
}

export function useChartData(p: Params): Result {
  const [availableDatasets, setAvailableDatasets] = useState<DatasetEntry[]>([])

  const ohlcv = useOhlcvData({
    symbol: p.symbol,
    tf: p.tf,
    broker: p.broker,
    reloadCounter: p.reloadCounter,
    pendingNavTsRef: p.pendingNavTsRef,
    candleRef: p.candleRef,
    chartRef: p.chartRef,
    tooltipElRef: p.tooltipElRef,
    tfRef: p.tfRef,
    symbolRef: p.symbolRef,
    brokerRef: p.brokerRef,
    barsRef: p.barsRef,
    loadedFromRef: p.loadedFromRef,
    isFetchingMoreRef: p.isFetchingMoreRef,
    lastLoadAttemptRef: p.lastLoadAttemptRef,
    trendHLCacheRef: p.trendHLCacheRef,
    bgDirtyRef: p.bgDirtyRef,
  })

  const trendsBroker = getBrokerForSource(p.sources, 'trends', 'trends', availableDatasets)
  const familiesBroker = getBrokerForSource(p.sources, 'families', 'families', availableDatasets)
  const triggersBroker = getBrokerForSource(p.sources, 'triggers', 'Triggers_BT', availableDatasets)

  const trends = useTrendsData({
    symbol: p.symbol,
    sources: p.sources,
    enabled: Object.values(p.showTrends).some(Boolean),
    broker: trendsBroker,
    trendSegsRef: p.trendSegsRef,
    bgDirtyRef: p.bgDirtyRef,
  })

  const families = useFamiliesData({
    symbol: p.symbol,
    sources: p.sources,
    enabled: p.showFamilies,
    broker: familiesBroker,
    chartRef: p.chartRef,
    familyRowsRef: p.familyRowsRef,
    familyBuyOrdinalSeriesRef: p.familyBuyOrdinalSeriesRef,
    familySellOrdinalSeriesRef: p.familySellOrdinalSeriesRef,
    familyTFVisibleRef: p.familyTFVisibleRef,
    showBB: p.showBB,
    barsVersion: ohlcv.barsVersion,
  })

  const triggersHook = useTriggersData({
    symbol: p.symbol,
    sources: p.sources,
    enabled: p.indicators.triggers.enabled,
    broker: triggersBroker,
    triggersRef: p.triggersRef,
    setSelectedOppIdx: p.setSelectedOppIdx,
    setPinnedOpps: p.setPinnedOpps,
    visibleStart: p.barsRef.current.length > 0
      ? Math.floor(p.barsRef.current[0].time) - 15552000  // 6 months before
      : Math.floor(Date.now() / 1000) - 63072000,         // 2 years ago
    visibleEnd: p.barsRef.current.length > 0
      ? Math.ceil(p.barsRef.current[p.barsRef.current.length - 1].time) + 15552000  // 6 months after
      : Math.ceil(Date.now() / 1000) + 2592000,            // 30 days from now
  })

  const sessionLevelsBroker = getBrokerForSource(p.sources, 'sessionLevels', 'session_levels', availableDatasets)

  const sessionLevels = useSessionLevelsData({
    symbol: p.symbol,
    sources: p.sources,
    enabled: p.indicators.sessionLevels.enabled,
    broker: sessionLevelsBroker,
    sessionRowsRef: p.sessionRowsRef,
  })

  const bb = useBollingerBandsData({
    symbol: p.symbol,
    tf: p.tf,
    sources: p.sources,
    showBB: p.showBB,
    chartRef: p.chartRef,
    bbPointsRef: p.bbPointsRef,
    bbLineRef: p.bbLineRef,
    bbGreenRef: p.bbGreenRef,
    bbRedRef: p.bbRedRef,
  })

  // ── Fetch available datasets (on mount + WS-driven refresh) ────────────────────
  const [dsVersion, setDsVersion] = useState(0)

  useEffect(() => {
    if (!p.datasetsVisible) return
    clearCacheForUrl('/agents/folders/list')
    const controller = new AbortController()
    fetchWithRetry('/agents/folders/list',
      { signal: controller.signal }, { trigger: 'manual' })
      .then(r => r.ok ? r.json() : [])
      .then((data: DatasetEntry[]) => setAvailableDatasets(data))
      .catch(() => {})
    return () => controller.abort()
  }, [dsVersion, p.datasetsVisible])

  useEffect(() => {  }, [])

  // ── Fetch period level segments (only when levels are visible) ────────────────
  const levelsVisible = useMemo(() => {
    const lvl = p.indicators.levels as LevelsIndicatorState
    return lvl.showH1 || lvl.showH4 || lvl.showD1 || lvl.showW1 || lvl.showMN1 || lvl.showMN3 || lvl.showMN6 || lvl.showMN12
  }, [p.indicators.levels])

  useEffect(() => {
    if (!levelsVisible) {
      p.segmentsRef.current = []
      p.bgDirtyRef.current = true
      return
    }
    p.segmentsRef.current = []
    const controller = new AbortController()
    fetchWithMeta(`/levels/${p.symbol}`, { signal: controller.signal }, { trigger: 'manual' })
      .then(r => r.json())
      .then((res: { symbol: string; segments: PriceLevel[] }) => {
        p.segmentsRef.current = res.segments ?? []
        p.bgDirtyRef.current = true
      })
      .catch(err => { if (err.name !== 'AbortError') { /* ignore */ } })
    return () => controller.abort()
  }, [p.symbol, levelsVisible])  // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isLoading: ohlcv.isLoading,
    bbLoading: bb.bbLoading,
    bbPaneHeight: bb.bbPaneHeight,
    barsVersion: ohlcv.barsVersion,
    setBbPaneHeight: bb.setBbPaneHeight,
    hasTrends: trends.hasTrends,
    loadedTrendTFs: trends.loadedTrendTFs,
    hasFamilyData: families.hasFamilyData,
    hasSessionLevels: sessionLevels.hasSessionLevels,
    triggers: triggersHook.triggers,
    syncFamilyLineVisibility: families.syncFamilyLineVisibility,
    setTriggers: triggersHook.setTriggers,
    availableDatasets,
    loadOlderChunk: ohlcv.loadOlderChunk,
    navigateToDate: ohlcv.navigateToDate,
    refreshFamilyLines: families.refreshFamilyLines,
  }
}
