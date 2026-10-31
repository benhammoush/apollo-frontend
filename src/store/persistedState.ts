/**
 * Chart/workspace persistence contracts, defaults and backward-compatible normalization.
 * @packageDocumentation
 */
// ── Persisted State — single source of truth for what survives page reloads ──
//
// All types and defaults for state written to localStorage live here.
// Other modules import from this file; nothing should define these types locally.
//
// Storage key: 'apollo_v2'
// Debounced write: 400 ms (see persistence.ts)
//
import { LevelPeriod } from '../types'
import type { UiThemeMode } from '../design-system'

// ── Chart color settings ──────────────────────────────────────────────────────
// User-customizable via the Settings panel. Stored per chart instance.
export interface ChartSettings {
  // Candlestick colors
  candleUp: string
  candleDown: string
  // Canvas background and grid
  chartBg: string
  gridColor: string
  gridVisible: boolean
  // Period level line colors (one per period)
  levelH1: string
  levelH4: string
  levelD1: string
  levelW1: string
  levelMN1: string
  levelMN3: string
  levelMN6: string
  levelMN12: string
  // Family line colors (MN1 resolved family — four series A–D)
  familyLineA: string
  familyLineB: string
  familyLineC: string
  familyLineD: string
  // Trend buy colors (one per timeframe)
  trendBuyH4: string
  trendBuyD1: string
  trendBuyW1: string
  trendBuyMN1: string
  trendBuyMN3: string
  trendBuyMN6: string
  trendBuyMN12: string
  // Trend sell colors (one per timeframe)
  trendSellH4: string
  trendSellD1: string
  trendSellW1: string
  trendSellMN1: string
  trendSellMN3: string
  trendSellMN6: string
  trendSellMN12: string
}

export const DEFAULT_CHART_SETTINGS: ChartSettings = {
  candleUp: '#3fb950',
  candleDown: '#f85149',
  chartBg: '#0d1117',
  gridColor: '#21262d',
  gridVisible: true,
  levelH1: '#f97316',
  levelH4: '#06b6d4',
  levelD1: '#6e7681',
  levelW1: '#388bfd',
  levelMN1: '#3fb950',
  levelMN3: '#d29922',
  levelMN6: '#a371f7',
  levelMN12: '#f85149',
  familyLineA: '#388bfd',
  familyLineB: '#8957e5',
  familyLineC: '#d29922',
  familyLineD: '#6e7681',
  trendBuyH4: '#3fb950',
  trendBuyD1: '#26a641',
  trendBuyW1: '#0ea5e9',
  trendBuyMN1: '#388bfd',
  trendBuyMN3: '#6e40c9',
  trendBuyMN6: '#8957e5',
  trendBuyMN12: '#a371f7',
  trendSellH4: '#f85149',
  trendSellD1: '#da3633',
  trendSellW1: '#f97316',
  trendSellMN1: '#d29922',
  trendSellMN3: '#ca8a04',
  trendSellMN6: '#b45309',
  trendSellMN12: '#92400e',
}

export type IndicatorSource = 'open' | 'high' | 'low' | 'close' | 'hl2' | 'hlc3' | 'ohlc4'
export type IndicatorMaType = 'SMA' | 'EMA' | 'SMMA (RMA)' | 'WMA' | 'VWMA'
export type IndicatorAtrSmoothing = 'RMA' | 'SMA' | 'EMA' | 'WMA'
export type ChartIndicatorId =
  | 'bollingerBands'
  | 'atr'
  | 'adx'
  | 'rsi'
  | 'ema20'
  | 'ema50'
  | 'ema200'
  | 'sma20'
  | 'sma50'
  | 'sma200'
  | 'trends'
  | 'families'
  | 'triggers'
  | 'sessionLevels'
  | 'sessionsOhlc'
  | 'levels'
  | 'stockExchanges'

export interface SessionLevelsIndicatorState {
  enabled: boolean
  showSydney: boolean
  showTokyo: boolean
  showLondon: boolean
  showNewYork: boolean
}

export interface SessionsOhlcIndicatorState {
  enabled: boolean
  showSydney: boolean
  showTokyo: boolean
  showLondon: boolean
  showNewYork: boolean
}

export interface StockExchangesIndicatorState {
  enabled: boolean
  showTSE: boolean
  showLSE: boolean
  showNYSE: boolean
}

export interface LevelsIndicatorState {
  enabled: boolean
  showH1: boolean
  showH4: boolean
  showD1: boolean
  showW1: boolean
  showMN1: boolean
  showMN3: boolean
  showMN6: boolean
  showMN12: boolean
}

export interface BollingerBandsIndicatorState {
  enabled: boolean
  length: number
  mult: number
  maType: IndicatorMaType
  src: IndicatorSource
  upperColor: string
  basisColor: string
  lowerColor: string
}

export interface AtrIndicatorState {
  enabled: boolean
  length: number
  smoothing: IndicatorAtrSmoothing
  color: string
}

export interface AdxIndicatorState {
  enabled: boolean
  adxSmoothing: number
  diLength: number
  color: string
  threshold: number
}

export interface RsiIndicatorState {
  enabled: boolean
  length: number
  src: IndicatorSource
  color: string
  upper: number
  lower: number
}

export interface MaIndicatorState {
  enabled: boolean
  color: string
}

export interface TrendsIndicatorState {
  enabled: boolean
}
export interface FamiliesIndicatorState {
  enabled: boolean
}
export interface TriggersIndicatorState {
  enabled: boolean
  showBuy: boolean
  showSell: boolean
  showM1: boolean
  showM5: boolean
  showM15: boolean
  showH1: boolean
  showH4: boolean
}

// ── Fibonacci Retracement Drawing Settings ──────────────────────────────────
export interface FibLevelConfig {
  value: number
  visible: boolean
}

export interface FibSettings {
  levels: FibLevelConfig[]
  lineColor: string
  showLabels: boolean
  extendLines: boolean
}

export const DEFAULT_FIB_SETTINGS: FibSettings = {
  levels: [
    { value: 0, visible: true },
    { value: 0.236, visible: true },
    { value: 0.382, visible: true },
    { value: 0.5, visible: true },
    { value: 0.618, visible: true },
    { value: 0.786, visible: true },
    { value: 1, visible: true },
  ],
  lineColor: '#f0c040',
  showLabels: true,
  extendLines: false,
}

export interface ChartIndicatorsState {
  bollingerBands: BollingerBandsIndicatorState
  atr: AtrIndicatorState
  adx: AdxIndicatorState
  rsi: RsiIndicatorState
  ema20: MaIndicatorState
  ema50: MaIndicatorState
  ema200: MaIndicatorState
  sma20: MaIndicatorState
  sma50: MaIndicatorState
  sma200: MaIndicatorState
  trends: TrendsIndicatorState
  families: FamiliesIndicatorState
  triggers: TriggersIndicatorState
  sessionLevels: SessionLevelsIndicatorState
  sessionsOhlc: SessionsOhlcIndicatorState
  levels: LevelsIndicatorState
  stockExchanges: StockExchangesIndicatorState
}

export const DEFAULT_CHART_INDICATORS: ChartIndicatorsState = {
  bollingerBands: {
    enabled: false,
    length: 20,
    mult: 2,
    maType: 'SMA',
    src: 'close',
    upperColor: '#6e7681',
    basisColor: '#f0b429',
    lowerColor: '#6e7681',
  },
  atr: {
    enabled: false,
    length: 14,
    smoothing: 'RMA',
    color: '#22d3ee',
  },
  adx: {
    enabled: false,
    adxSmoothing: 14,
    diLength: 14,
    color: '#a78bfa',
    threshold: 25,
  },
  rsi: {
    enabled: false,
    length: 14,
    src: 'close',
    color: '#f97316',
    upper: 70,
    lower: 30,
  },
  ema20: { enabled: false, color: '#22d3ee' },
  ema50: { enabled: false, color: '#f0b429' },
  ema200: { enabled: false, color: '#f05454' },
  sma20: { enabled: false, color: '#4d9fff' },
  sma50: { enabled: false, color: '#24d166' },
  sma200: { enabled: false, color: '#a78bfa' },
  trends: { enabled: false },
  families: { enabled: false },
  triggers: { enabled: false, showBuy: false, showSell: false, showM1: false, showM5: false, showM15: false, showH1: false, showH4: false },
  sessionLevels: { enabled: false, showSydney: false, showTokyo: false, showLondon: false, showNewYork: false },
  sessionsOhlc: { enabled: false, showSydney: false, showTokyo: false, showLondon: false, showNewYork: false },
  levels: { enabled: false, showH1: false, showH4: false, showD1: false, showW1: false, showMN1: false, showMN3: false, showMN6: false, showMN12: false },
  stockExchanges: { enabled: false, showTSE: false, showLSE: false, showNYSE: false },
}

// ── Data source selector keys ─────────────────────────────────────────────────
// Each key selects which agent-run folder to read data from.
// null = "Latest" (live agent cache); string = a specific folder name.
export type SourceKey = 'trends' | 'families' | 'triggers' | 'sessionLevels'

// ── Per-chart persisted preferences ──────────────────────────────────────────
// Everything a user configures on a chart that should survive a page reload.
// Keyed by chartId in PersistedState.charts (currently only 'default').
export interface PersistedChartState {
  tf: string
  levelVisible: Record<LevelPeriod, boolean>
  showTrends: Record<string, boolean>        // keys are TrendTF values
  showFamilies: boolean
  settings: ChartSettings
  indicators: ChartIndicatorsState
  sources: Record<SourceKey, string | null>
  // Selected broker/data source — null = first available broker (auto-detect)
  broker: string | null
  // Fibonacci retracement drawing settings (per-chart)
  fibSettings: FibSettings
}

export const DEFAULT_CHART_STATE: PersistedChartState = {
  tf: 'D1',
  levelVisible: { H1: false, H4: false, D1: false, W1: false, MN1: false, MN3: false, MN6: false, MN12: false },
  showTrends: { H4: false, D1: false, W1: false, MN1: false, MN3: false, MN6: false, MN12: false },
  showFamilies: false,
  settings: { ...DEFAULT_CHART_SETTINGS },
  indicators: { ...DEFAULT_CHART_INDICATORS },
  sources: { trends: null, families: null, triggers: null, sessionLevels: null },
  broker: null,
  fibSettings: { ...DEFAULT_FIB_SETTINGS },
}

// ── Key migration (level3MN → levelMN3, etc.) ─────────────────────────────────
// Handles rename of chart settings and levelVisible keys.
// Idempotent — safe to run multiple times on already-migrated data.

export function migrateSettingsKeys(
  settings: Partial<Record<string, string>> | undefined | null,
): ChartSettings {
  const s = { ...DEFAULT_CHART_SETTINGS, ...(settings ?? {}) }
  if ('level3MN' in s) { (s as Record<string, string>).levelMN3 = (s as Record<string, string>).level3MN; delete (s as Record<string, string>).level3MN }
  if ('level6MN' in s) { (s as Record<string, string>).levelMN6 = (s as Record<string, string>).level6MN; delete (s as Record<string, string>).level6MN }
  if ('level12MN' in s) { (s as Record<string, string>).levelMN12 = (s as Record<string, string>).level12MN; delete (s as Record<string, string>).level12MN }
  if ('trendBuy3M' in s) { (s as Record<string, string>).trendBuyMN3 = (s as Record<string, string>).trendBuy3M; delete (s as Record<string, string>).trendBuy3M }
  if ('trendBuy6M' in s) { (s as Record<string, string>).trendBuyMN6 = (s as Record<string, string>).trendBuy6M; delete (s as Record<string, string>).trendBuy6M }
  if ('trendBuy12M' in s) { (s as Record<string, string>).trendBuyMN12 = (s as Record<string, string>).trendBuy12M; delete (s as Record<string, string>).trendBuy12M }
  if ('trendSell3M' in s) { (s as Record<string, string>).trendSellMN3 = (s as Record<string, string>).trendSell3M; delete (s as Record<string, string>).trendSell3M }
  if ('trendSell6M' in s) { (s as Record<string, string>).trendSellMN6 = (s as Record<string, string>).trendSell6M; delete (s as Record<string, string>).trendSell6M }
  if ('trendSell12M' in s) { (s as Record<string, string>).trendSellMN12 = (s as Record<string, string>).trendSell12M; delete (s as Record<string, string>).trendSell12M }
  if (!('levelH1' in s)) (s as Record<string, string>).levelH1 = DEFAULT_CHART_SETTINGS.levelH1
  if (!('levelH4' in s)) (s as Record<string, string>).levelH4 = DEFAULT_CHART_SETTINGS.levelH4
  return s as unknown as ChartSettings
}

export function migrateLevelVisibleKeys(
  lv: Partial<Record<string, boolean>> | undefined | null,
): Record<LevelPeriod, boolean> {
  const result: Record<string, boolean> = { ...DEFAULT_CHART_STATE.levelVisible }
  if (lv) {
    for (const key of Object.keys(lv)) {
      const v: boolean | undefined = lv[key]
      if (v == null) continue
      if (key === '3MN') { result.MN3 = v; continue }
      if (key === '6MN') { result.MN6 = v; continue }
      if (key === '12MN') { result.MN12 = v; continue }
      result[key] = v
    }
  }
  return result as Record<LevelPeriod, boolean>
}

export function migrateChartStates(
  charts: Record<string, Partial<PersistedChartState> & Record<string, unknown>> | undefined | null,
): Record<string, PersistedChartState> {
  const migrated: Record<string, PersistedChartState> = {}
  if (!charts) return migrated
  for (const id of Object.keys(charts)) {
    const chart = charts[id]
    const s: Record<string, unknown> = { ...(chart.settings as unknown as Record<string, unknown> ?? {}) }
    if ('level3MN' in s) { s.levelMN3 = s.level3MN; delete s.level3MN }
    if ('level6MN' in s) { s.levelMN6 = s.level6MN; delete s.level6MN }
    if ('level12MN' in s) { s.levelMN12 = s.level12MN; delete s.level12MN }
    if ('trendBuy3M' in s) { s.trendBuyMN3 = s.trendBuy3M; delete s.trendBuy3M }
    if ('trendBuy6M' in s) { s.trendBuyMN6 = s.trendBuy6M; delete s.trendBuy6M }
    if ('trendBuy12M' in s) { s.trendBuyMN12 = s.trendBuy12M; delete s.trendBuy12M }
    if ('trendSell3M' in s) { s.trendSellMN3 = s.trendSell3M; delete s.trendSell3M }
    if ('trendSell6M' in s) { s.trendSellMN6 = s.trendSell6M; delete s.trendSell6M }
    if ('trendSell12M' in s) { s.trendSellMN12 = s.trendSell12M; delete s.trendSell12M }
    if (!('levelH1' in s)) s.levelH1 = DEFAULT_CHART_SETTINGS.levelH1
    if (!('levelH4' in s)) s.levelH4 = DEFAULT_CHART_SETTINGS.levelH4

    let lv: Record<string, boolean> | undefined
    if (chart.levelVisible) {
      lv = { ...chart.levelVisible as Record<string, boolean> }
      if ('3MN' in lv) { lv.MN3 = lv['3MN']; delete lv['3MN'] }
      if ('6MN' in lv) { lv.MN6 = lv['6MN']; delete lv['6MN'] }
      if ('12MN' in lv) { lv.MN12 = lv['12MN']; delete lv['12MN'] }
    }

    let st: Record<string, boolean> | undefined
    if (chart.showTrends) {
      st = { ...chart.showTrends as Record<string, boolean> }
      if ('3M' in st) { st.MN3 = st['3M']; delete st['3M'] }
      if ('6M' in st) { st.MN6 = st['6M']; delete st['6M'] }
      if ('12M' in st) { st.MN12 = st['12M']; delete st['12M'] }
    }

    migrated[id] = withChartStateDefaults({
      ...chart,
      settings: s as unknown as ChartSettings,
      levelVisible: lv as unknown as Record<LevelPeriod, boolean>,
      showTrends: st as unknown as Record<string, boolean>,
    } as PersistedChartState)
  }
  return migrated
}

export function migrateLevelsToIndicator(
  indicatorLevels: Partial<LevelsIndicatorState> | undefined | null,
  legacyLevelVisible: Partial<Record<string, boolean>> | undefined | null,
): LevelsIndicatorState {
  const defaults = DEFAULT_CHART_STATE.indicators.levels
  const fromIndicator = indicatorLevels ?? {}
  const anyFromIndicator = Object.values(fromIndicator).some(v => v === true)
  if (anyFromIndicator) {
    return { ...defaults, ...fromIndicator }
  }
  if (legacyLevelVisible) {
    const showKeys: Record<string, keyof LevelsIndicatorState> = {
      H1: 'showH1', H4: 'showH4', D1: 'showD1', W1: 'showW1',
      MN1: 'showMN1', MN3: 'showMN3', MN6: 'showMN6', MN12: 'showMN12',
    }
    const migrated: any = { ...defaults }
    let anyEnabled = false
    for (const [rawKey, value] of Object.entries(legacyLevelVisible)) {
      const targetKey = showKeys[rawKey] ?? showKeys[rawKey.toUpperCase()]
      if (targetKey && value === true) {
        migrated[targetKey] = true
        anyEnabled = true
      }
    }
    if (anyEnabled) migrated.enabled = true
    return migrated
  }
  return defaults
}

/**
 * Completes saved chart preferences without reviving disabled session/exchange overlays.
 * @param state - Existing chart state or a missing/new chart.
 * @returns A completed state; explicitly enabled overlay selections and other preferences survive.
 */
export function withChartStateDefaults(state?: Partial<PersistedChartState> | null): PersistedChartState {
  const rawSources = { ...DEFAULT_CHART_STATE.sources, ...(state?.sources as Record<string, string | null> | undefined ?? {}) }
  let families = rawSources.families ?? null
  if (families == null && 'patterns' in rawSources) {
    families = (rawSources as { patterns?: string | null }).patterns ?? null
  }

  const mergedSettings = {
    ...DEFAULT_CHART_STATE.settings,
    ...(state?.settings ?? {}),
  } as ChartSettings & Record<string, string>
  if (!mergedSettings.familyLineA && (mergedSettings as { patternBuy1M?: string }).patternBuy1M) {
    mergedSettings.familyLineA = (mergedSettings as { patternBuy1M?: string }).patternBuy1M!
    mergedSettings.familyLineB = (mergedSettings as { patternBuy3M?: string }).patternBuy3M!
    mergedSettings.familyLineC = (mergedSettings as { patternBuy6M?: string }).patternBuy6M!
    mergedSettings.familyLineD = (mergedSettings as { patternSell1M?: string }).patternSell1M!
  }

  return {
    ...DEFAULT_CHART_STATE,
    ...(state ?? {}),
    levelVisible: { ...DEFAULT_CHART_STATE.levelVisible, ...(state?.levelVisible ?? {}) },
    showTrends: { ...DEFAULT_CHART_STATE.showTrends, ...(state?.showTrends ?? {}) },
    showFamilies: state?.showFamilies ?? DEFAULT_CHART_STATE.showFamilies,
    settings: { ...DEFAULT_CHART_SETTINGS, ...mergedSettings },
    indicators: {
      ...DEFAULT_CHART_STATE.indicators,
      ...(state?.indicators ?? {}),
      bollingerBands: { ...DEFAULT_CHART_STATE.indicators.bollingerBands, ...(state?.indicators?.bollingerBands ?? {}) },
      atr: { ...DEFAULT_CHART_STATE.indicators.atr, ...(state?.indicators?.atr ?? {}) },
      adx: { ...DEFAULT_CHART_STATE.indicators.adx, ...(state?.indicators?.adx ?? {}) },
      rsi: { ...DEFAULT_CHART_STATE.indicators.rsi, ...(state?.indicators?.rsi ?? {}) },
      ema20: { ...DEFAULT_CHART_STATE.indicators.ema20, ...(state?.indicators?.ema20 ?? {}) },
      ema50: { ...DEFAULT_CHART_STATE.indicators.ema50, ...(state?.indicators?.ema50 ?? {}) },
      ema200: { ...DEFAULT_CHART_STATE.indicators.ema200, ...(state?.indicators?.ema200 ?? {}) },
      sma20: { ...DEFAULT_CHART_STATE.indicators.sma20, ...(state?.indicators?.sma20 ?? {}) },
      sma50: { ...DEFAULT_CHART_STATE.indicators.sma50, ...(state?.indicators?.sma50 ?? {}) },
      sma200: { ...DEFAULT_CHART_STATE.indicators.sma200, ...(state?.indicators?.sma200 ?? {}) },
      trends: { ...DEFAULT_CHART_STATE.indicators.trends, ...(state?.indicators?.trends ?? {}) },
      families: { ...DEFAULT_CHART_STATE.indicators.families, ...(state?.indicators?.families ?? {}) },
      triggers: { ...DEFAULT_CHART_STATE.indicators.triggers, ...(state?.indicators?.triggers ?? {}) },
      // Older defaults set visibility flags despite enabled:false; rendering reads those flags.
      sessionLevels: { ...DEFAULT_CHART_STATE.indicators.sessionLevels,
        ...(state?.indicators?.sessionLevels?.enabled === true ? state.indicators.sessionLevels : {}) },
      sessionsOhlc: { ...DEFAULT_CHART_STATE.indicators.sessionsOhlc,
        ...(state?.indicators?.sessionsOhlc?.enabled === true ? state.indicators.sessionsOhlc : {}) },
      stockExchanges: { ...DEFAULT_CHART_STATE.indicators.stockExchanges,
        ...(state?.indicators?.stockExchanges?.enabled === true ? state.indicators.stockExchanges : {}) },
      levels: migrateLevelsToIndicator(state?.indicators?.levels, state?.levelVisible),
    },
    fibSettings: {
      ...DEFAULT_FIB_SETTINGS,
      ...(state?.fibSettings ?? {}),
      levels: state?.fibSettings?.levels && state.fibSettings.levels.length > 0
        ? state.fibSettings.levels
        : DEFAULT_FIB_SETTINGS.levels,
    },
    sources: {
      trends: rawSources.trends ?? null,
      families,
      triggers: rawSources.triggers ?? null,
      sessionLevels: rawSources.sessionLevels ?? null,
    },
  }
}

// ── Top-level persisted state ─────────────────────────────────────────────────

// Multi-chart layout mode:
// 1 = single
// 2 = 2 wide (horizontal)
// 3 = 2-top + 1-bottom
// 4 = 2x2
// 5 = 2 high (vertical)
// 6 = 3x2
// 8 = 4x2
// 9 = 3 high (vertical)
// 10 = 3 wide (horizontal)
// 11 = 4 high (vertical)
// 12 = 4 wide (horizontal)
// 13 = 2x3
// 14 = 2x4
// 15 = 3 top + 1 bottom
// 16 = 1 top + 3 bottom
// 17 = 3 left + 1 right
// 18 = 1 left + 3 right
// 19 = 1 top + 2 bottom
// 20 = 1 left + 2 right
// 21 = 2 left + 1 right
export type LayoutMode = 1 | 2 | 3 | 4 | 5 | 6 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21

export function getLayoutSlotCount(mode: LayoutMode): number {
  switch (mode) {
    case 1: return 1
    case 2:
    case 5: return 2
    case 3:
    case 9:
    case 10:
    case 19:
    case 20:
    case 21: return 3
    case 4:
    case 11:
    case 12: return 4
    case 15:
    case 16:
    case 17:
    case 18: return 4
    case 6:
    case 13: return 6
    case 8:
    case 14: return 8
    default: return 1
  }
}

export function isCompactLayoutMode(mode: LayoutMode): boolean {
  return mode === 10 || getLayoutSlotCount(mode) >= 4
}

// ── Workspace slot content types ──────────────────────────────────────────────
export type SlotContentType = 'chart' | 'dataset' | 'logs' | 'empty'

export interface ChartSlotState    { type: 'chart';      symbol: string }
export interface DatasetSlotState  { type: 'dataset'; selectedAgent?: string; selectedFolder?: string; selectedFile?: string; openRandom?: boolean }
export interface LogsSlotState     { type: 'logs';       selectedJobId?: string }
export interface EmptySlotState    { type: 'empty' }

export type SlotState =
  | ChartSlotState
  | DatasetSlotState
  | LogsSlotState
  | EmptySlotState

// ── Tab types — each tab in the bottom bar can be a workspace or a page ───────
export type TabType = 'workspace' | 'engine' | 'data' | 'storage'
export interface WorkspaceTabRecord {
  id: string
  name: string
  type: 'workspace'
  layoutMode: LayoutMode
  activeSlot: number
  slots: SlotState[]
  panelSizes?: { rows: number[]; cols: number[][] }
  charts: Record<string, PersistedChartState>
  symbolSyncEnabled: boolean
}

export interface EngineTabRecord {
  id: string
  name: string
  type: 'engine'
}

export interface DataTabRecord {
  id: string
  name: string
  type: 'data'
}

export interface StorageTabRecord {
  id: string
  name: string
  type: 'storage'
}

export type TabRecord = WorkspaceTabRecord | EngineTabRecord | DataTabRecord | StorageTabRecord

export interface PersistedState {
  uiThemeMode: UiThemeMode
  chartSettings: ChartSettings
  selectedSymbol: string
  // Multi-chart layout (live state of the active tab)
  layoutMode: LayoutMode
  activeSlot: number
  // Per-slot content state
  slots: SlotState[]
  // Legacy — kept for migration, derived from slots for chart-type slots
  slotSymbols: [string, string, string, string, string, string, string, string]
  // Per-chart preferences keyed by slot index ('0'–'7').
  charts: Record<string, PersistedChartState>
  // When true, changing the symbol on any chart applies it to all visible charts
  symbolSyncEnabled: boolean
  // Panel resize proportions for the active workspace tab
  panelSizes?: { rows: number[]; cols: number[][] }
  // Browser-like tabs
  tabs: TabRecord[]
  activeTabId: string
}

const DEFAULT_SLOT_SYMBOLS: PersistedState['slotSymbols'] =
  ['EURUSD', 'EURUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF', 'EURJPY']

const DEFAULT_SLOTS: SlotState[] = [
  { type: 'chart', symbol: 'EURUSD' },
  { type: 'chart', symbol: 'EURUSD' },
  { type: 'dataset', openRandom: true },
  { type: 'logs' },
  { type: 'empty' },
  { type: 'empty' },
  { type: 'empty' },
  { type: 'empty' },
]

export const DEFAULT_TAB: WorkspaceTabRecord = {
  id: 'tab-1',
  name: 'Workspace 1',
  type: 'workspace',
  layoutMode: 4,
  activeSlot: 0,
  slots: DEFAULT_SLOTS.slice(0, 4),
  charts: { '0': withChartStateDefaults({ tf: 'M1' }), '1': withChartStateDefaults({ tf: 'H4' }) },
  symbolSyncEnabled: false,
}

export const DEFAULT_PERSISTED: PersistedState = {
  uiThemeMode: 'dark',
  chartSettings: { ...DEFAULT_CHART_SETTINGS },
  selectedSymbol: 'EURUSD',
  layoutMode: 4,
  activeSlot: 0,
  slots: DEFAULT_SLOTS,
  slotSymbols: DEFAULT_SLOT_SYMBOLS,
  charts: DEFAULT_TAB.charts,
  symbolSyncEnabled: false,
  tabs: [DEFAULT_TAB],
  activeTabId: 'tab-1',
}

/** Capture live workspace fields without changing another tab or mutating saved/default records. */
export function snapshotActiveTab(state: PersistedState): TabRecord {
  const active = state.tabs.find(tab => tab.id === state.activeTabId) ?? state.tabs[0]
  if (!active) return state.tabs[0]
  if (active.type !== 'workspace') return active
  return { ...active, layoutMode: state.layoutMode, activeSlot: state.activeSlot,
    slots: state.slots, panelSizes: state.panelSizes, charts: state.charts,
    symbolSyncEnabled: state.symbolSyncEnabled }
}
