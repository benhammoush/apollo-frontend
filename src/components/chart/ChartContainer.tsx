import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  IChartApi, ISeriesApi,
  Time,
} from 'lightweight-charts'
import {
  OHLCVBar, PriceLevel, LevelPeriod,
  BBPctPoint, FamilyLetter, FamilySnapshot,
} from '../../types'
import {
  usePersistedChart,
  usePersistedState,
} from '../../store/PersistedContext'
import {
  ChartSettings,
  type ChartIndicatorId,
  type ChartIndicatorsState,
  type LevelsIndicatorState,
  DEFAULT_CHART_SETTINGS,
  SourceKey,
  type FibSettings,
  DEFAULT_FIB_SETTINGS,
} from '../../store/persistedState'
import {
  TREND_TFS, TrendTF, TrendSegment, Trigger, FamilyTF,
} from './types'
import {
  DEFAULT_LEVEL_VISIBLE,
  TREND_BUY_COLOR, TREND_SELL_COLOR, TREND_BUY_KEY, TREND_SELL_KEY,
  PERIOD_SETTING_KEY,
} from './constants'
import { useChartData } from './hooks/useChartData'
import { useLibraryIndicators, type IndicatorSnapshots } from './hooks/useLibraryIndicators'
import { type SessionLevelRow } from './hooks/useSessionLevelsData'
import TriggersPanel from './TriggersPanel'
import ChartToolbar from './ChartToolbar'
import ChartSettingsPanel from './ChartSettingsPanel'
import ChartIndicatorsPanel from './ChartIndicatorsPanel'
import IndicatorModal from './IndicatorModal'
import ChartTooltip from './ChartTooltip'
import ChartLivePrice from './ChartLivePrice'
import ChartActiveIndicators from './ChartActiveIndicators'
import ChartCanvas from './ChartCanvas'
import FamilyMonthStrip from './FamilyMonthStrip'
import MeasureNavigateModal from './MeasureNavigateModal'
import FibSettingsModal from './FibSettingsModal'
import {
  Drawing, DrawingTool, DEFAULT_DRAWING_COLOR,
  loadDrawings, saveDrawings, clearStoredDrawings,
} from './drawings'
import { theme } from '../../design-system'
import { API_URL } from '../../utils/viewerApi'
import { fetchWithMeta } from '../../utils/fetchWithMeta'
import { useBrokers } from '../../contexts/BrokerDataContext'
import { INDICATOR_DEFINITIONS, getActivePaneIndicatorId, type PaneIndicatorId } from './indicatorLibrary'

// =============================================================================
// Props
// =============================================================================
interface Props {
  symbol: string
  /** Unique ID for this chart instance — maps to its persisted state slice. */
  chartId?: string
  symbols?: string[]
  onSymbolChange?: (symbol: string) => void
  compact?: boolean
  isActive?: boolean
}

// =============================================================================
// ChartContainer — orchestrates all state, hooks, and sub-components
// =============================================================================
export default function ChartContainer({ symbol, chartId = 'default', symbols = [], onSymbolChange, compact, isActive = true }: Props) {

  const { state: appState, setChartSettings } = usePersistedState()

  // ── Persisted chart state — survives page reload ──────────────────────────────
  //
  // All user preferences (TF, visibility toggles, colors, panel sizes, sources)
  // are read from and written to localStorage via the PersistedContext.
  //
  // Thin setter wrappers below match the old useState setter API so all JSX
  // and effects that call setTf(), setSettings(), etc. work without any changes.
  //
  const { chartState, updateChart } = usePersistedChart(chartId)
  const {
    tf,
    settings,
    indicators,
    showTrends,
    showFamilies,
    sources,
    broker,
    fibSettings,
  } = chartState

  // Memoized setters — stable references prevent child re-renders when unrelated
  // chartState fields change.
  const setTf = useCallback((t: string) => updateChart({ tf: t }), [updateChart])
  const setShowTrends = useCallback(
    (u: typeof showTrends | ((p: typeof showTrends) => typeof showTrends)) =>
      updateChart({ showTrends: typeof u === 'function' ? u(chartState.showTrends) : u }),
    [updateChart, chartState.showTrends],
  )
  const setShowFamilies = useCallback(
    (u: boolean | ((p: boolean) => boolean)) =>
      updateChart({ showFamilies: typeof u === 'function' ? u(chartState.showFamilies) : u }),
    [updateChart, chartState.showFamilies],
  )
  const setSettings = useCallback(
    (u: ChartSettings | ((p: ChartSettings) => ChartSettings)) =>
      setChartSettings(typeof u === 'function' ? u(chartState.settings) : u),
    [setChartSettings, chartState.settings],
  )
  const setIndicators = useCallback(
    (u: ChartIndicatorsState | ((p: ChartIndicatorsState) => ChartIndicatorsState)) =>
      updateChart({ indicators: typeof u === 'function' ? u(chartState.indicators) : u }),
    [updateChart, chartState.indicators],
  )
  const setSources = useCallback(
    (u: typeof sources | ((p: typeof sources) => typeof sources)) =>
      updateChart({ sources: typeof u === 'function' ? u(chartState.sources) : u }),
    [updateChart, chartState.sources],
  )
  const setBroker = useCallback(
    (b: string | null) => updateChart({ broker: b }),
    [updateChart],
  )
  const updateFibSettings = useCallback(
    (s: FibSettings) => updateChart({ fibSettings: s }),
    [updateChart],
  )

  // ── Live bid/ask display — updated directly via DOM refs to avoid re-renders ──
  const liveBidRef = useRef<HTMLSpanElement>(null)
  const liveAskRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    // Double-rAF ensures the white frame is committed to screen before the
    // transition back begins — a single rAF can be batched with the color set
    // and never actually paint the flash.
    const flash = (el: HTMLSpanElement, defaultColor: string) => {
      el.style.transition = 'none'
      el.style.color = theme.colors.accent.primary
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = 'color 0.35s ease'
        el.style.color = defaultColor
      }))
    }

    const handler = (e: Event) => {
      const msg = (e as CustomEvent).detail as { data: { symbol: string; bid: number; ask: number; source: string } }
      if (!msg?.data) return
      if (msg.data.symbol.toUpperCase() !== symbolRef.current.toUpperCase()) return
      if (brokerRef.current && msg.data.source !== brokerRef.current) return
      const { bid, ask } = msg.data
      if (liveBidRef.current) {
        liveBidRef.current.textContent = bid.toFixed(5)
        flash(liveBidRef.current, theme.colors.chart.down)
      }
      if (liveAskRef.current) {
        liveAskRef.current.textContent = ask.toFixed(5)
        flash(liveAskRef.current, theme.colors.chart.up)
      }
    }
    window.addEventListener('apollo:tick', handler)
    return () => window.removeEventListener('apollo:tick', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear bid/ask display when symbol or broker changes
  useEffect(() => {
    if (liveBidRef.current) liveBidRef.current.textContent = '—'
    if (liveAskRef.current) liveAskRef.current.textContent = '—'
  }, [symbol, broker])

  const [availableBrokers, setAvailableBrokers] = useState<string[]>([])
  const { brokers: brokerList, loading: brokersLoading } = useBrokers()
  useEffect(() => {
    if (brokersLoading) return
    setAvailableBrokers(brokerList)
    const cur = brokerRef.current
    if (!cur && brokerList.length > 0) setBroker(brokerList[0])
    else if (cur && brokerList.length > 0 && !brokerList.includes(cur)) setBroker(brokerList[0])
    else if (cur && brokerList.length === 0) setBroker(null)
  }, [brokerList, brokersLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── LWC refs ──────────────────────────────────────────────────────────────────
  const chartRef = useRef<IChartApi | null>(null)
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const bbLineRef = useRef<ISeriesApi<'Line'> | null>(null)
  const bbGreenRef = useRef<ISeriesApi<'Area'> | null>(null)
  const bbRedRef = useRef<ISeriesApi<'Baseline'> | null>(null)
  const animRef = useRef<number>(0)

  // ── Two-layer canvas + dirty-flag draw system ─────────────────────────────────
  //
  // bgCanvas  (off-screen, not in the DOM)
  //   Draws: trend rectangles and period level lines.
  //   Expensive to draw, but only changes when data or visibility changes.
  //   Stored as a plain <canvas> element created in the chart-init effect.
  //
  // overlayCanvas  (on-screen, position:absolute over the chart)
  //   Each "foreground" frame: clear, blit bgCanvas (one fast GPU drawImage),
  //   then draw the cheap interactive layer (trade arrows, hover/select lines).
  //
  // Dirty flags:
  //   bgDirtyRef  — set when trends/levels need a full background redraw
  //   fgDirtyRef  — set whenever the on-screen canvas needs updating
  //
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const bgDirtyRef = useRef(true)
  const fgDirtyRef = useRef(true)

  // ── Tooltip DOM refs ──────────────────────────────────────────────────────────
  // Updated by writing directly to these DOM nodes inside the LWC crosshairMove
  // handler — completely bypassing React state and avoiding a re-render on move.
  const tooltipElRef = useRef<HTMLDivElement>(null)
  const tooltipDateRef = useRef<HTMLDivElement>(null)
  const tooltipORef = useRef<HTMLSpanElement>(null)
  const tooltipHRef = useRef<HTMLSpanElement>(null)
  const tooltipLRef = useRef<HTMLSpanElement>(null)
  const tooltipCRef = useRef<HTMLSpanElement>(null)
  const tooltipUWRef = useRef<HTMLSpanElement>(null)
  const tooltipBDRef = useRef<HTMLSpanElement>(null)
  const tooltipLWRef = useRef<HTMLSpanElement>(null)
  const tooltipBBRowRef = useRef<HTMLDivElement>(null)
  const tooltipBBValRef = useRef<HTMLSpanElement>(null)
  const bbPaneLabelRef = useRef<HTMLDivElement>(null)
  const indicatorValueStripRef = useRef<HTMLDivElement>(null)

  // ── Data refs (read inside the rAF draw loop — never trigger re-renders) ──────
  const segmentsRef = useRef<PriceLevel[]>([])
  const trendSegsRef = useRef<TrendSegment[]>([])
  const familyRowsRef = useRef<FamilySnapshot[]>([])
  const familyBuyOrdinalSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const familySellOrdinalSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const familyTFVisibleRef = useRef<Set<FamilyTF>>(new Set(['MN1']))
  const bbPointsRef = useRef<BBPctPoint[]>([])

  // Toggle visibility refs (synced from React state below)
  const levelVisibleRef = useRef<Record<LevelPeriod, boolean>>(DEFAULT_LEVEL_VISIBLE)
  const showTrendsRef = useRef<Record<TrendTF, boolean>>(
    Object.fromEntries(TREND_TFS.map(t => [t, false])) as Record<TrendTF, boolean>
  )
  // Trend colors read in drawBgCanvas — synced from settings on every render
  const trendBuyColorsRef = useRef<Record<TrendTF, string>>({ ...TREND_BUY_COLOR })
  const trendSellColorsRef = useRef<Record<TrendTF, string>>({ ...TREND_SELL_COLOR })
  const showTriggersRef = useRef(false)
  const showSessionRef = useRef({ sydney: true, tokyo: true, london: true, newYork: true })
  const showSessionsOhlcRef = useRef({ sydney: true, tokyo: true, london: true, newYork: true })
  const showStockExchangesRef = useRef({ tse: true, lse: true, nyse: true })
  const showBuyRef = useRef(false)
  const showSellRef = useRef(false)
  const showM5Ref = useRef(false)
  const showM15Ref = useRef(false)
  const showH1Ref = useRef(false)
  const showH4Ref = useRef(false)
  const showM1Ref = useRef(false)
  const showFamiliesRef = useRef(true)
  // Lets stable callbacks (drawOverlay, loadOlderChunk) know the current TF + broker
  const tfRef = useRef('D1')
  const brokerRef = useRef<string | null>(null)
  const activePaneIndicatorIdRef = useRef<PaneIndicatorId | null>(null)
  const indicatorSnapshotsRef = useRef<IndicatorSnapshots>({})

  // High/low cache per trend segment
  const trendHLCacheRef = useRef<Map<string, { high: number; low: number }>>(new Map())

  // Period level colors — kept in a ref so the drawOverlay callback (stable [])
  // can read the latest user-selected color on every animation frame.
  const periodColorsRef = useRef<Record<LevelPeriod, string>>({
    H1: DEFAULT_CHART_SETTINGS.levelH1,
    H4: DEFAULT_CHART_SETTINGS.levelH4,
    D1: DEFAULT_CHART_SETTINGS.levelD1, W1: DEFAULT_CHART_SETTINGS.levelW1,
    MN1: DEFAULT_CHART_SETTINGS.levelMN1,
    MN3: DEFAULT_CHART_SETTINGS.levelMN3, MN6: DEFAULT_CHART_SETTINGS.levelMN6,
    MN12: DEFAULT_CHART_SETTINGS.levelMN12,
  })

  // All loaded OHLCV bars — kept as a ref so lazy-load can prepend without
  // triggering a full component re-render.
  const barsRef = useRef<OHLCVBar[]>([])
  const loadedFromRef = useRef<number>(0)
  const isFetchingMoreRef = useRef<boolean>(false)
  const symbolRef = useRef<string>(symbol)

  const lastLoadAttemptRef = useRef<number>(0)

  // Crosshair time + price received from other chart instances (for the sync crosshair)
  const syncCrosshairTimeRef = useRef<number | null>(null)
  const syncCrosshairPriceRef = useRef<number | null>(null)

  // ── Drawing state ─────────────────────────────────────────────────────────────
  const [drawingTool, setDrawingTool] = useState<DrawingTool | null>(null)
  const [drawingColor, setDrawingColor] = useState<string>(DEFAULT_DRAWING_COLOR)
  const drawingToolRef = useRef<DrawingTool | null>(null)
  const drawingColorRef = useRef<string>(DEFAULT_DRAWING_COLOR)
  const drawingsRef = useRef<Drawing[]>([])
  const drawingInProgressRef = useRef<Drawing | null>(null)
  // Fib settings — synced from persisted chart state
  const fibSettingsRef = useRef<FibSettings>(fibSettings ?? DEFAULT_FIB_SETTINGS)
  const [showFibSettings, setShowFibSettings] = useState(false)
  // Measure tool: finalized rectangle + modal state
  const [measureDone, setMeasureDone] = useState<Drawing | null>(null)
  const [showNavModal, setShowNavModal] = useState(false)
  const [measureButtonPos, setMeasureButtonPos] = useState<{ x: number; y: number } | null>(null)
  // Pending navigate timestamp: consumed by useChartData's initial load on next reload
  const pendingNavTsRef = useRef<number | null>(null)
  // Highlight marker: shown on the chart after a cross-chart navigate, auto-clears
  const highlightMarkerRef = useRef<{ ts: number; expiresAt: number } | null>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Incrementing forces a full reload (used when TF/symbol don't change but we still need to navigate)
  const [reloadCounter, setReloadCounter] = useState(0)
  // Text drawing: when user clicks with text tool, show inline input
  const [pendingText, setPendingText] = useState<{ time: number; price: number; screenX: number; screenY: number } | null>(null)
  const [pendingTextLabel, setPendingTextLabel] = useState('')
  const chartWrapperRef = useRef<HTMLDivElement | null>(null)

  // ATR triggers for the chart overlay and bottom panel
  const triggersRef = useRef<Trigger[]>([])
  // Session level rows for chart overlay
  const sessionRowsRef = useRef<SessionLevelRow[]>([])

  // Which trigger is currently selected (-1 = nothing selected)
  const selectedTriggerIdxRef = useRef<number>(-1)

  // Which trigger arrow the cursor is hovering over (-1 = none)
  const hoveredTriggerIdxRef = useRef<number>(-1)

  // Last known cursor X pixel position inside the chart canvas
  const lastMouseXRef = useRef<number>(-1)
  const lastMouseYRef = useRef<number>(-1)

  // ── React state (transient — not persisted across reloads) ───────────────────
  const [selectedTriggerIdx, setSelectedTriggerIdx] = useState<number>(-1)
  const [pinnedTriggers, setPinnedTriggers] = useState<Set<number>>(new Set())
  const pinnedTriggersRef = useRef<Set<number>>(new Set())
  const [showTriggerPanel, setShowTriggerPanel] = useState(false)
  const [triggerPanelHeight, setTriggerPanelHeight] = useState(200)
  const [showSettings, setShowSettings] = useState(false)
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(false)
  const [showIndicatorModal, setShowIndicatorModal] = useState(false)
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<ChartIndicatorId | null>(null)
  const settingsPanelRef = useRef<HTMLDivElement | null>(null)

  const effectiveSettings = useMemo<ChartSettings>(() => ({
    ...settings,
    chartBg: appState.uiThemeMode === 'dark' ? theme.colors.bg.card : theme.colors.bg.card,
  }), [settings, appState.uiThemeMode])

  const levelVisible = useMemo<Record<LevelPeriod, boolean>>(() => {
    const lvl = indicators.levels as LevelsIndicatorState
    return {
      H1: lvl.showH1, H4: lvl.showH4, D1: lvl.showD1, W1: lvl.showW1,
      MN1: lvl.showMN1, MN3: lvl.showMN3, MN6: lvl.showMN6, MN12: lvl.showMN12,
    }
  }, [indicators.levels])

  // Source selectors
  const setSource = (key: SourceKey, val: string | null) =>
    setSources((prev: Record<SourceKey, string | null>) => ({ ...prev, [key]: val }))

  const patchIndicator = useCallback((id: ChartIndicatorId, patch: Record<string, unknown>) => {
    setIndicators(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
      },
    }))
  }, [setIndicators])

  const toggleIndicator = useCallback((id: ChartIndicatorId) => {
    if (id === 'trends') {
      const anyVisible = Object.values(showTrends).some(Boolean)
      const newShowTrends = Object.fromEntries(
        TREND_TFS.map(tf => [tf, !anyVisible])
      ) as Record<TrendTF, boolean>
      setShowTrends(newShowTrends)
      return
    }
    if (id === 'families') {
      setShowFamilies(v => !v)
      return
    }
    if (id === 'triggers') {
      setIndicators(prev => {
        const t = prev.triggers
        const anyVisible = t.showBuy || t.showSell || t.showM1 || t.showM5 || t.showM15 || t.showH1 || t.showH4
        return anyVisible
          ? { ...prev, triggers: { ...t, enabled: false, showBuy: false, showSell: false, showM1: false, showM5: false, showM15: false, showH1: false, showH4: false } }
          : { ...prev, triggers: { ...t, enabled: true, showBuy: true, showSell: true, showM1: true, showM5: true, showM15: true, showH1: true, showH4: true } }
      })
      return
    }
    if (id === 'sessionLevels') {
      setIndicators(prev => {
        const s = prev.sessionLevels
        const anyVisible = s.showSydney || s.showTokyo || s.showLondon || s.showNewYork
        return anyVisible
          ? { ...prev, sessionLevels: { ...s, enabled: false, showSydney: false, showTokyo: false, showLondon: false, showNewYork: false } }
          : { ...prev, sessionLevels: { ...s, enabled: true, showSydney: true, showTokyo: true, showLondon: true, showNewYork: true } }
      })
      return
    }
    if (id === 'sessionsOhlc') {
      setIndicators(prev => {
        const s = prev.sessionsOhlc
        const anyVisible = s.showSydney || s.showTokyo || s.showLondon || s.showNewYork
        return anyVisible
          ? { ...prev, sessionsOhlc: { ...s, enabled: false, showSydney: false, showTokyo: false, showLondon: false, showNewYork: false } }
          : { ...prev, sessionsOhlc: { ...s, enabled: true, showSydney: true, showTokyo: true, showLondon: true, showNewYork: true } }
      })
      return
    }
    if (id === 'stockExchanges') {
      setIndicators(prev => {
        const e = prev.stockExchanges
        const anyVisible = e.showTSE || e.showLSE || e.showNYSE
        return anyVisible
          ? { ...prev, stockExchanges: { ...e, enabled: false, showTSE: false, showLSE: false, showNYSE: false } }
          : { ...prev, stockExchanges: { ...e, enabled: true, showTSE: true, showLSE: true, showNYSE: true } }
      })
      return
    }
    if (id === 'levels') {
      setIndicators(prev => {
        const lvl = prev.levels as LevelsIndicatorState
        const anyVisible = lvl.showH1 || lvl.showH4 || lvl.showD1 || lvl.showW1 || lvl.showMN1 || lvl.showMN3 || lvl.showMN6 || lvl.showMN12
        const v = !anyVisible
        return { ...prev, levels: { ...lvl, enabled: v, showH1: v, showH4: v, showD1: v, showW1: v, showMN1: v, showMN3: v, showMN6: v, showMN12: v } }
      })
      return
    }
    setIndicators(prev => {
      const next = {
        ...prev,
        [id]: {
          ...prev[id],
          enabled: !prev[id].enabled,
        },
      }
      if (id === 'bollingerBands' || id === 'atr' || id === 'adx' || id === 'rsi') {
        const nextEnabled = !prev[id].enabled
        for (const paneId of ['bollingerBands', 'atr', 'adx', 'rsi'] as const) {
          ;(next as Record<string, any>)[paneId] = {
            ...(next as Record<string, any>)[paneId],
            enabled: paneId === id ? nextEnabled : false,
          }
        }
      }
      return next
    })
    setSelectedIndicatorId(id)
    setShowIndicatorPanel(true)
  }, [setIndicators, showTrends, setShowTrends, setShowFamilies])

  const selectIndicator = useCallback((id: ChartIndicatorId) => {
    setSelectedIndicatorId(id)
    setShowIndicatorPanel(true)
  }, [])

  const [selectedFamilyTF, setSelectedFamilyTF] = useState<FamilyTF>('MN1')

  // ── Data fetching ─────────────────────────────────────────────────────────────
  const {
    isLoading, bbLoading, bbPaneHeight, barsVersion,
    triggers, availableDatasets, loadOlderChunk, navigateToDate,
    loadedTrendTFs, hasFamilyData,
    syncFamilyLineVisibility, hasSessionLevels,
    refreshFamilyLines,
  } = useChartData({
    symbol, tf, sources, broker: broker ?? null, showBB: false,
    showTrends,
    showFamilies,
    indicators,
    trendSegsRef,
    familyRowsRef,
    familyBuyOrdinalSeriesRef, familySellOrdinalSeriesRef,
    familyTFVisibleRef,
    triggersRef,
    sessionRowsRef,
    segmentsRef, bbPointsRef, barsRef, loadedFromRef, isFetchingMoreRef,
    trendHLCacheRef, lastLoadAttemptRef,
    bgDirtyRef,
    chartRef, candleRef, bbLineRef, bbGreenRef, bbRedRef,
    tfRef, symbolRef, brokerRef, tooltipElRef,
    setSelectedOppIdx: setSelectedTriggerIdx,
    setPinnedOpps: setPinnedTriggers,
    pendingNavTsRef,
    reloadCounter,
    datasetsVisible: showIndicatorPanel,
  })

  useEffect(() => {
    if (selectedIndicatorId) return
    const firstEnabled = (Object.entries(indicators) as [ChartIndicatorId, { enabled: boolean }][]).find(([, indicator]) => indicator.enabled)?.[0]
    if (firstEnabled) setSelectedIndicatorId(firstEnabled)
  }, [indicators, selectedIndicatorId])

  const activeIndicators = useMemo(() => {
    return INDICATOR_DEFINITIONS.filter(def => {
      if (def.id === 'trends') return Object.values(showTrends).some(Boolean)
      if (def.id === 'families') return showFamilies
      if (def.id === 'triggers') {
        const t = indicators.triggers
        return t.showBuy || t.showSell || t.showM1 || t.showM5 || t.showM15 || t.showH1 || t.showH4
      }
      if (def.id === 'sessionLevels') {
        const s = indicators.sessionLevels
        return s.showSydney || s.showTokyo || s.showLondon || s.showNewYork
      }
      if (def.id === 'sessionsOhlc') {
        const s = indicators.sessionsOhlc
        return s.showSydney || s.showTokyo || s.showLondon || s.showNewYork
      }
      if (def.id === 'levels') {
        const l = indicators.levels as LevelsIndicatorState
        return l.showH1 || l.showH4 || l.showD1 || l.showW1 || l.showMN1 || l.showMN3 || l.showMN6 || l.showMN12
      }
      if (def.id === 'stockExchanges') {
        const e = indicators.stockExchanges
        return e.showTSE || e.showLSE || e.showNYSE
      }
      return indicators[def.id].enabled
    }).map(def => ({ id: def.id, label: def.shortLabel }))
  }, [indicators, showTrends, showFamilies])
  const activePaneIndicatorId = useMemo(() => getActivePaneIndicatorId(indicators), [indicators])
  activePaneIndicatorIdRef.current = activePaneIndicatorId
  useLibraryIndicators({
    chartRef,
    bars: barsRef.current,
    barsVersion,
    indicators,
    showBBPane: false,
    activePaneIndicatorId,
    indicatorSnapshotsRef,
  })

  // Keep refs in sync with state so stable callbacks always read current values
  useEffect(() => { tfRef.current = tf }, [tf])
  useEffect(() => { symbolRef.current = symbol }, [symbol])
  useEffect(() => { brokerRef.current = broker ?? null }, [broker])
  useEffect(() => {
    familyTFVisibleRef.current = new Set([selectedFamilyTF])
    syncFamilyLineVisibility()
    refreshFamilyLines()
  }, [selectedFamilyTF, syncFamilyLineVisibility, refreshFamilyLines])

  // Clear the measure overlay when the tool is deactivated
  useEffect(() => {
    if (drawingTool !== 'measure') {
      drawingInProgressRef.current = null
      setMeasureDone(null)
      setMeasureButtonPos(null)
      setShowNavModal(false)
    }
  }, [drawingTool])

  // Sync drawing tool/color refs + reload drawings when symbol changes
  useEffect(() => { drawingToolRef.current = drawingTool }, [drawingTool])
  useEffect(() => { drawingColorRef.current = drawingColor }, [drawingColor])
  useEffect(() => {
    drawingsRef.current = loadDrawings(symbol)
    bgDirtyRef.current = true
  }, [symbol])
  useEffect(() => { fibSettingsRef.current = fibSettings ?? DEFAULT_FIB_SETTINGS; bgDirtyRef.current = true }, [fibSettings])

  // Listen for measure finalization events from useChartCanvas
  useEffect(() => {
    const handler = (e: Event) => {
      const { chartId: srcId, drawing } = (e as CustomEvent).detail
      if (srcId !== chartId) return
      setMeasureDone(drawing)
    }
    window.addEventListener('apollo:measurefinalized', handler)
    return () => window.removeEventListener('apollo:measurefinalized', handler)
  }, [chartId])

  // Listen for tool deactivation events from useChartCanvas (e.g. right-click exits measure)
  useEffect(() => {
    const handler = (e: Event) => {
      const { chartId: srcId } = (e as CustomEvent).detail
      if (srcId !== chartId) return
      setDrawingTool(null)
    }
    window.addEventListener('apollo:deactivate-tool', handler)
    return () => window.removeEventListener('apollo:deactivate-tool', handler)
  }, [chartId])

  // Track button position anchored to the measure info box; updates on chart scroll/zoom
  useEffect(() => {
    if (!measureDone) { setMeasureButtonPos(null); return }
    const chart = chartRef.current
    const candle = candleRef.current
    if (!chart || !candle) return

    const compute = () => {
      const [pt1, pt2] = measureDone.points
      const x1 = chart.timeScale().timeToCoordinate(pt1.time as unknown as Time)
      const y1 = candle.priceToCoordinate(pt1.price)
      const x2 = chart.timeScale().timeToCoordinate(pt2.time as unknown as Time)
      const y2 = candle.priceToCoordinate(pt2.price)
      if (x1 === null || y1 === null || x2 === null || y2 === null) { setMeasureButtonPos(null); return }
      const rx = Math.min(x1, x2), ry = Math.min(y1, y2)
      const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1)
      // Mirror the info box placement logic from the canvas draw loop
      const boxW = 100, boxH = 54
      const boxY = ry > boxH + 8 ? ry - boxH - 6 : ry + rh + 6
      // Place button to the right of the info box, vertically centered on it
      setMeasureButtonPos({ x: rx + rw / 2 + boxW / 2 + 6, y: boxY + boxH / 2 - 14 })
    }

    compute()
    chart.timeScale().subscribeVisibleLogicalRangeChange(compute)
    return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(compute)
  }, [measureDone]) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for cross-chart navigate commands
  useEffect(() => {
    const handler = (e: Event) => {
      const { targetChartId, targetTs, newTf, newSymbol, highlightMs } = (e as CustomEvent).detail
      if (targetChartId !== chartId) return
      // Always do a full reload centered on the target date — set pending ts first,
      // then trigger the initial-load effect via a state change.
      pendingNavTsRef.current = targetTs
      // Set highlight marker if requested (auto-clears after highlightMs)
      if (highlightMs > 0) {
        highlightMarkerRef.current = { ts: targetTs, expiresAt: Date.now() + highlightMs }
        fgDirtyRef.current = true
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
        highlightTimerRef.current = setTimeout(() => {
          highlightMarkerRef.current = null
          fgDirtyRef.current = true
          highlightTimerRef.current = null
        }, highlightMs)
      }
      const tfUnchanged = !newTf || newTf === tf
      const symbolUnchanged = !newSymbol || newSymbol === symbol
      if (!tfUnchanged) setTf(newTf)
      if (!symbolUnchanged) onSymbolChange?.(newSymbol)
      // If neither TF nor symbol changed, bump reloadCounter to force the effect
      if (tfUnchanged && symbolUnchanged) setReloadCounter(v => v + 1)
    }
    window.addEventListener('apollo:navigate', handler)
    return () => {
      window.removeEventListener('apollo:navigate', handler)
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    }
  }, [chartId, tf, symbol, setTf, onSymbolChange])

  // Listen for text draw requests from useChartCanvas (dispatched on text tool click)
  useEffect(() => {
    const handler = (e: Event) => {
      const { time, price, screenX, screenY } = (e as CustomEvent).detail
      setPendingText({ time, price, screenX, screenY })
      setPendingTextLabel('')
    }
    window.addEventListener('apollo:textdraw', handler)
    return () => window.removeEventListener('apollo:textdraw', handler)
  }, [])

  const goToDate = useCallback((dateStr: string) => {
    if (!dateStr) return
    navigateToDate(Math.floor(new Date(dateStr).getTime() / 1000))
  }, [navigateToDate])

  const clearDrawings = useCallback(() => {
    clearStoredDrawings(symbol)
    drawingsRef.current = []
    bgDirtyRef.current = true
  }, [symbol])

  const finishTextDrawing = useCallback(() => {
    if (!pendingText || !pendingTextLabel.trim()) { setPendingText(null); return }
    const d: Drawing = {
      id: `${Date.now()}`,
      type: 'text',
      points: [{ time: pendingText.time, price: pendingText.price }],
      color: drawingColorRef.current,
      label: pendingTextLabel.trim(),
    }
    drawingsRef.current = [...drawingsRef.current, d]
    saveDrawings(symbol, drawingsRef.current)
    bgDirtyRef.current = true
    setPendingText(null)
  }, [pendingText, pendingTextLabel, symbol])
  // Visibility changes → background layer must be redrawn
  useEffect(() => { levelVisibleRef.current = levelVisible; bgDirtyRef.current = true }, [levelVisible])
  useEffect(() => { showTrendsRef.current = showTrends; bgDirtyRef.current = true }, [showTrends])
  useEffect(() => { showTriggersRef.current = indicators.triggers.enabled; fgDirtyRef.current = true }, [indicators.triggers.enabled])
  useEffect(() => {
    showSessionRef.current = {
      sydney: indicators.sessionLevels.showSydney,
      tokyo: indicators.sessionLevels.showTokyo,
      london: indicators.sessionLevels.showLondon,
      newYork: indicators.sessionLevels.showNewYork,
    }
    bgDirtyRef.current = true
  }, [indicators.sessionLevels.showSydney, indicators.sessionLevels.showTokyo, indicators.sessionLevels.showLondon, indicators.sessionLevels.showNewYork])
  useEffect(() => {
    showSessionsOhlcRef.current = {
      sydney: indicators.sessionsOhlc.showSydney,
      tokyo: indicators.sessionsOhlc.showTokyo,
      london: indicators.sessionsOhlc.showLondon,
      newYork: indicators.sessionsOhlc.showNewYork,
    }
    bgDirtyRef.current = true
  }, [indicators.sessionsOhlc.showSydney, indicators.sessionsOhlc.showTokyo, indicators.sessionsOhlc.showLondon, indicators.sessionsOhlc.showNewYork])
  useEffect(() => {
    showStockExchangesRef.current = {
      tse: indicators.stockExchanges.showTSE,
      lse: indicators.stockExchanges.showLSE,
      nyse: indicators.stockExchanges.showNYSE,
    }
    bgDirtyRef.current = true
  }, [indicators.stockExchanges.showTSE, indicators.stockExchanges.showLSE, indicators.stockExchanges.showNYSE])
  useEffect(() => { showBuyRef.current = indicators.triggers.showBuy; fgDirtyRef.current = true }, [indicators.triggers.showBuy])
  useEffect(() => { showSellRef.current = indicators.triggers.showSell; fgDirtyRef.current = true }, [indicators.triggers.showSell])
  useEffect(() => { showM5Ref.current = indicators.triggers.showM5; fgDirtyRef.current = true }, [indicators.triggers.showM5])
  useEffect(() => { showM15Ref.current = indicators.triggers.showM15; fgDirtyRef.current = true }, [indicators.triggers.showM15])
  useEffect(() => { showH1Ref.current = indicators.triggers.showH1; fgDirtyRef.current = true }, [indicators.triggers.showH1])
  useEffect(() => { showH4Ref.current = indicators.triggers.showH4; fgDirtyRef.current = true }, [indicators.triggers.showH4])
  useEffect(() => { showM1Ref.current = indicators.triggers.showM1; fgDirtyRef.current = true }, [indicators.triggers.showM1])
  useEffect(() => { showFamiliesRef.current = showFamilies; fgDirtyRef.current = true }, [showFamilies])
  useEffect(() => { selectedTriggerIdxRef.current = selectedTriggerIdx; fgDirtyRef.current = true }, [selectedTriggerIdx])
  useEffect(() => { pinnedTriggersRef.current = pinnedTriggers; fgDirtyRef.current = true }, [pinnedTriggers])

  // ── Settings: push changes to the lightweight-charts instance + sync color refs
  useEffect(() => {
    chartRef.current?.applyOptions({
      layout: { background: { color: effectiveSettings.chartBg } },
      grid: {
        vertLines: { color: effectiveSettings.gridColor, visible: effectiveSettings.gridVisible },
        horzLines: { color: effectiveSettings.gridColor, visible: effectiveSettings.gridVisible },
      },
    })
    candleRef.current?.applyOptions({
      upColor: effectiveSettings.candleUp,
      downColor: effectiveSettings.candleDown,
      borderUpColor: effectiveSettings.candleUp,
      borderDownColor: effectiveSettings.candleDown,
      wickUpColor: effectiveSettings.candleUp,
      wickDownColor: effectiveSettings.candleDown,
    })
    periodColorsRef.current = {
      H1: effectiveSettings.levelH1,
      H4: effectiveSettings.levelH4,
      D1: effectiveSettings.levelD1, W1: effectiveSettings.levelW1,
      MN1: effectiveSettings.levelMN1,
      MN3: effectiveSettings.levelMN3, MN6: effectiveSettings.levelMN6,
      MN12: effectiveSettings.levelMN12,
    }
    trendBuyColorsRef.current = {
      H4: effectiveSettings.trendBuyH4, D1: effectiveSettings.trendBuyD1,
      W1: effectiveSettings.trendBuyW1, MN1: effectiveSettings.trendBuyMN1,
      MN3: effectiveSettings.trendBuyMN3, MN6: effectiveSettings.trendBuyMN6, MN12: effectiveSettings.trendBuyMN12,
    }
    trendSellColorsRef.current = {
      H4: effectiveSettings.trendSellH4, D1: effectiveSettings.trendSellD1,
      W1: effectiveSettings.trendSellW1, MN1: effectiveSettings.trendSellMN1,
      MN3: effectiveSettings.trendSellMN3, MN6: effectiveSettings.trendSellMN6, MN12: effectiveSettings.trendSellMN12,
    }
    refreshFamilyLines()
    bgDirtyRef.current = true
  }, [effectiveSettings, refreshFamilyLines])

  // Listen for global settings toggle event from AppHeader (only for primary chart)
  useEffect(() => {
    if (chartId !== '0' && chartId !== 'default') return
    const handler = () => setShowSettings(v => !v)
    window.addEventListener('apollo:toggle-chart-settings', handler)
    return () => window.removeEventListener('apollo:toggle-chart-settings', handler)
  }, [chartId])

  // Close the settings panel when the user clicks outside it
  // (excluding the AppHeader settings trigger button).
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        showSettings &&
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(target) &&
        !(target as Element).closest?.('[data-chart-settings-trigger]')
      ) {
        setShowSettings(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => { document.removeEventListener('mousedown', handleClickOutside) }
  }, [showSettings])

  const toggleTrend = (t: TrendTF) =>
    setShowTrends(prev => ({ ...prev, [t]: !prev[t] }))

  const toggleLevelPeriod = useCallback((period: LevelPeriod) => {
    const key = `show${period}` as keyof LevelsIndicatorState
    setIndicators(prev => ({
      ...prev,
      levels: { ...(prev.levels as LevelsIndicatorState), [key]: !(prev.levels as LevelsIndicatorState)[key], enabled: true },
    }))
  }, [setIndicators])

  const setLevelColor = useCallback((period: LevelPeriod, color: string) => {
    const settingKey = PERIOD_SETTING_KEY[period]
    updateChart({ settings: { ...chartState.settings, [settingKey]: color } })
  }, [updateChart, chartState.settings])

  // ── Derive period colors from settings (memoized for stable prop reference) ──
  const periodColors = useMemo<Record<LevelPeriod, string>>(() => ({
    H1: effectiveSettings.levelH1,
    H4: effectiveSettings.levelH4,
    D1: effectiveSettings.levelD1,
    W1: effectiveSettings.levelW1,
    MN1: effectiveSettings.levelMN1,
    MN3: effectiveSettings.levelMN3,
    MN6: effectiveSettings.levelMN6,
    MN12: effectiveSettings.levelMN12,
  }), [effectiveSettings.levelH1, effectiveSettings.levelH4, effectiveSettings.levelD1, effectiveSettings.levelW1, effectiveSettings.levelMN1, effectiveSettings.levelMN3, effectiveSettings.levelMN6, effectiveSettings.levelMN12])

  const familyLetterColors = useMemo<Record<FamilyLetter, string>>(() => ({
    A: effectiveSettings.familyLineA,
    B: effectiveSettings.familyLineB,
    C: effectiveSettings.familyLineC,
    D: effectiveSettings.familyLineD,
  }), [effectiveSettings.familyLineA, effectiveSettings.familyLineB, effectiveSettings.familyLineC, effectiveSettings.familyLineD])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, position: 'relative' }}>

      {/* ── Row 1: symbol picker + timeframe buttons + settings button ──────────── */}
      <ChartToolbar
        symbol={symbol}
        symbols={symbols}
        tf={tf}
        setTf={setTf}
        onSymbolChange={onSymbolChange}
        compact={compact}
        drawingTool={drawingTool}
        setDrawingTool={setDrawingTool}
        broker={broker ?? null}
        setBroker={setBroker}
        brokers={availableBrokers}
        hasActiveIndicators={activeIndicators.length > 0}
        onOpenIndicatorModal={() => setShowIndicatorModal(true)}
        fibSettings={fibSettings ?? DEFAULT_FIB_SETTINGS}
        onOpenFibSettings={() => setShowFibSettings(true)}
        onClearDrawings={clearDrawings}
      />

      <IndicatorModal
        open={showIndicatorModal}
        indicators={indicators}
        showTrends={showTrends}
        showFamilies={showFamilies}
        onClose={() => setShowIndicatorModal(false)}
        onSelect={selectIndicator}
      />

      <FibSettingsModal
        open={showFibSettings}
        settings={fibSettings ?? DEFAULT_FIB_SETTINGS}
        onChange={updateFibSettings}
        onClose={() => setShowFibSettings(false)}
      />

      {/* ================= SETTINGS FLOATING PANEL ================= */}
      <ChartSettingsPanel
        showSettings={showSettings}
        settingsPanelRef={settingsPanelRef}
        settings={settings}
        setSettings={setSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* ── Main chart area + side panel ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', position: 'relative', minHeight: 0, minWidth: 0, zIndex: 0 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
      <ChartCanvas
        // LWC refs
        chartRef={chartRef}
        candleRef={candleRef}
        bbLineRef={bbLineRef}
        bbGreenRef={bbGreenRef}
        bbRedRef={bbRedRef}
        animRef={animRef}
        bgCanvasRef={bgCanvasRef}
        bgDirtyRef={bgDirtyRef}
        fgDirtyRef={fgDirtyRef}
        // Data refs
        barsRef={barsRef}
        segmentsRef={segmentsRef}
        trendSegsRef={trendSegsRef}
        bbPointsRef={bbPointsRef}
        triggersRef={triggersRef}
        sessionRowsRef={sessionRowsRef}
        showSessionRef={showSessionRef}
        showSessionsOhlcRef={showSessionsOhlcRef}
        showStockExchangesRef={showStockExchangesRef}
        // Visibility refs
        levelVisibleRef={levelVisibleRef}
        showTrendsRef={showTrendsRef}
        showTriggersRef={showTriggersRef}
        showBuyRef={showBuyRef}
        showSellRef={showSellRef}
        showM5Ref={showM5Ref}
        showM15Ref={showM15Ref}
        showH1Ref={showH1Ref}
        showM1Ref={showM1Ref}
        showH4Ref={showH4Ref}
        // Color refs
        periodColorsRef={periodColorsRef}
        trendBuyColorsRef={trendBuyColorsRef}
        trendSellColorsRef={trendSellColorsRef}
        // Interaction refs
        hoveredTriggerIdxRef={hoveredTriggerIdxRef}
        selectedTriggerIdxRef={selectedTriggerIdxRef}
        lastMouseXRef={lastMouseXRef}
        lastMouseYRef={lastMouseYRef}
        pinnedTriggersRef={pinnedTriggersRef}
        highlightMarkerRef={highlightMarkerRef}
        trendHLCacheRef={trendHLCacheRef}
        // Tooltip refs
        tooltipElRef={tooltipElRef}
        tooltipDateRef={tooltipDateRef}
        tooltipORef={tooltipORef}
        tooltipHRef={tooltipHRef}
        tooltipLRef={tooltipLRef}
        tooltipCRef={tooltipCRef}
        tooltipUWRef={tooltipUWRef}
        tooltipBDRef={tooltipBDRef}
        tooltipLWRef={tooltipLWRef}
        tooltipBBRowRef={tooltipBBRowRef}
        tooltipBBValRef={tooltipBBValRef}
        bbPaneLabelRef={bbPaneLabelRef}
        indicatorValueStripRef={indicatorValueStripRef}
        // TF ref + init
        tfRef={tfRef}
        initSettings={effectiveSettings}
        loadOlderChunk={loadOlderChunk}
        // Cross-chart crosshair sync
        chartId={chartId}
        syncCrosshairTimeRef={syncCrosshairTimeRef}
        syncCrosshairPriceRef={syncCrosshairPriceRef}
        activePaneIndicatorIdRef={activePaneIndicatorIdRef}
        indicatorSnapshotsRef={indicatorSnapshotsRef}
        // Drawings
        drawingsRef={drawingsRef}
        drawingToolRef={drawingToolRef}
        drawingColorRef={drawingColorRef}
        drawingInProgressRef={drawingInProgressRef}
        symbolRef={symbolRef}
        fibSettingsRef={fibSettingsRef}
        // Render state
        tf={tf}
        isLoading={isLoading}
        bbLoading={bbLoading}
        bbPaneHeight={bbPaneHeight}
      >
        {/* ── Live bid/ask price overlay — top-right ──────────────────────────── */}
        <ChartLivePrice liveBidRef={liveBidRef} liveAskRef={liveAskRef} />

        <ChartActiveIndicators
          activeIndicators={activeIndicators}
          selectedIndicatorId={selectedIndicatorId}
          onSelectIndicator={selectIndicator}
        />

        {/* ── BB pane label + crosshair tooltip ──────────────────────────────── */}
        <ChartTooltip
          tf={tf}
          bbPaneHeight={bbPaneHeight}
          bbPaneLabelRef={bbPaneLabelRef}
          tooltipElRef={tooltipElRef}
          tooltipDateRef={tooltipDateRef}
          tooltipORef={tooltipORef}
          tooltipHRef={tooltipHRef}
          tooltipLRef={tooltipLRef}
          tooltipCRef={tooltipCRef}
          tooltipUWRef={tooltipUWRef}
          tooltipBDRef={tooltipBDRef}
          tooltipLWRef={tooltipLWRef}
          tooltipBBRowRef={tooltipBBRowRef}
          tooltipBBValRef={tooltipBBValRef}
          indicatorValueStripRef={indicatorValueStripRef}
        />

        <ChartIndicatorsPanel
          open={showIndicatorPanel}
          selectedIndicatorId={selectedIndicatorId}
          indicators={indicators}
          onClose={() => setShowIndicatorPanel(false)}
          onToggle={toggleIndicator}
          onPatch={patchIndicator}
          showTrends={showTrends}
          onToggleTrendTf={toggleTrend}
          trendBuyColors={trendBuyColorsRef.current}
          trendSellColors={trendSellColorsRef.current}
          onTrendBuyColorChange={(tf, color) => updateChart({ settings: { ...chartState.settings, [TREND_BUY_KEY[tf]]: color } })}
          onTrendSellColorChange={(tf, color) => updateChart({ settings: { ...chartState.settings, [TREND_SELL_KEY[tf]]: color } })}
          selectedFamilyTF={selectedFamilyTF}
          setSelectedFamilyTF={(tf) => { setSelectedFamilyTF(tf); setShowFamilies(true) }}
          hasFamilyData={hasFamilyData}
          showFamilies={showFamilies}
          triggersState={indicators.triggers}
          onToggleTriggerDirection={(dir) => {
            setIndicators(prev => ({
              ...prev,
              triggers: { ...prev.triggers, [dir === 'buy' ? 'showBuy' : 'showSell']: !prev.triggers[dir === 'buy' ? 'showBuy' : 'showSell'], enabled: true },
            }))
          }}
          onToggleTriggerTF={(tf) => {
            const keyMap = { M1: 'showM1', M5: 'showM5', M15: 'showM15', H1: 'showH1', H4: 'showH4' } as const
            const key = keyMap[tf]
            setIndicators(prev => ({
              ...prev,
              triggers: { ...prev.triggers, [key]: !prev.triggers[key], enabled: true },
            }))
          }}
          sessionLevelsState={indicators.sessionLevels}
          onToggleSession={(session) => {
            setIndicators(prev => ({
              ...prev,
              sessionLevels: { ...prev.sessionLevels, [session]: !prev.sessionLevels[session], enabled: true },
            }))
          }}
          sessionsOhlcState={indicators.sessionsOhlc}
          onToggleSessionsOhlc={(session) => {
            setIndicators(prev => ({
              ...prev,
              sessionsOhlc: { ...prev.sessionsOhlc, [session]: !prev.sessionsOhlc[session], enabled: true },
            }))
          }}
          stockExchangesState={indicators.stockExchanges}
          onToggleExchange={(exchange) => {
            setIndicators(prev => ({
              ...prev,
              stockExchanges: { ...prev.stockExchanges, [exchange]: !prev.stockExchanges[exchange], enabled: true },
            }))
          }}
          levelsState={indicators.levels as LevelsIndicatorState}
          onToggleLevelTF={toggleLevelPeriod}
          periodColors={periodColors}
          onLevelColorChange={setLevelColor}
          sources={sources}
          setSource={setSource}
          availableDatasets={availableDatasets}
        />

        {/* ── Measure navigate button — anchored to the measure info box ── */}
        {measureButtonPos && drawingTool === 'measure' && (
          <button
            onClick={() => setShowNavModal(true)}
            onMouseDown={e => e.stopPropagation()}
            title="Navigate other charts to this date range"
            style={{
              position: 'absolute',
              left: measureButtonPos.x,
              top: measureButtonPos.y,
              zIndex: 20,
              background: theme.colors.accent.blue,
              border: 'none',
              borderRadius: theme.radii.sm,
              width: 28, height: 28,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: theme.shadows.tooltip,
              pointerEvents: 'auto',
            }}
          >
            {/* 2×2 chart-grid: send to other charts */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.colors.bg.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2"  y="2"  width="9" height="9" rx="1.5" />
              <rect x="13" y="2"  width="9" height="9" rx="1.5" />
              <rect x="2"  y="13" width="9" height="9" rx="1.5" />
              <rect x="13" y="13" width="9" height="9" rx="1.5" />
              <polyline points="4,8 6,5 8,7" strokeWidth="1.5" />
              <polyline points="15,8 17,5 19,7" strokeWidth="1.5" />
              <polyline points="4,19 6,16 8,18" strokeWidth="1.5" />
              <polyline points="15,19 17,16 19,18" strokeWidth="1.5" />
            </svg>
          </button>
        )}

      </ChartCanvas>

      {showFamilies && (
        <FamilyMonthStrip
          chartRef={chartRef}
          barsRef={barsRef}
          familyRowsRef={familyRowsRef}
          selectedFamilyTF={selectedFamilyTF}
          letterColors={familyLetterColors}
          barsVersion={barsVersion}
          isLoading={isLoading}
          hasFamilyData={hasFamilyData}
        />
      )}
      </div>
      </div>{/* row wrapper */}

      {/* ── Text drawing input overlay ──────────────────────────────────────── */}
      {pendingText && (
        <div style={{
          position: 'fixed',
          left: pendingText.screenX,
          top: pendingText.screenY,
          zIndex: 999,
          background: theme.colors.border.default,
          border: `1px solid ${theme.colors.border.muted}`,
          borderRadius: 4,
          padding: '4px 6px',
          display: 'flex',
          gap: 4,
        }}>
          <input
            autoFocus
            value={pendingTextLabel}
            onChange={e => setPendingTextLabel(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') finishTextDrawing()
              if (e.key === 'Escape') setPendingText(null)
            }}
            placeholder="Label…"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: drawingColor,
              fontSize: 12,
              width: 120,
            }}
          />
          <button
            onClick={finishTextDrawing}
            style={{ background: 'transparent', border: 'none', color: theme.colors.text.link, cursor: 'pointer', fontSize: 11 }}
          >✓</button>
          <button
            onClick={() => setPendingText(null)}
            style={{ background: 'transparent', border: 'none', color: theme.colors.text.axisText, cursor: 'pointer', fontSize: 11 }}
          >✕</button>
        </div>
      )}

      {triggers.length > 0 && (
        <TriggersPanel
          triggers={triggers}
          showTriggerPanel={showTriggerPanel}
          setShowTriggerPanel={setShowTriggerPanel}
          triggerPanelHeight={triggerPanelHeight}
          setTriggerPanelHeight={setTriggerPanelHeight}
          selectedTriggerIdx={selectedTriggerIdx}
          setSelectedTriggerIdx={setSelectedTriggerIdx}
          pinnedTriggers={pinnedTriggers}
          setPinnedTriggers={setPinnedTriggers}
          navigateToDate={navigateToDate}
        />
      )}

      {/* ── Measure navigate modal ────────────────────────────────────────────── */}
      {showNavModal && measureDone && (
        <MeasureNavigateModal
          drawing={measureDone}
          sourceChartId={chartId}
          sourceSymbol={symbol}
          onClose={() => setShowNavModal(false)}
        />
      )}

    </div>
  )
}
