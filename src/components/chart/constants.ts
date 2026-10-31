/**
 * Shared visitor chart presentation and history-window constants.
 * @packageDocumentation
 */
import { LevelPeriod } from '../../types'
import { ChartSettings } from '../../store/persistedState'
import { ALL_TFS } from '../../types/timeframes'
import type { FamilyTf, TrendTf } from '../../types/timeframes'
import { FamilyTF, TrendTF } from './types'

export const TFS = ALL_TFS

// ── Initial bar window per timeframe ─────────────────────────────────────────
//
// D1/W1/MN1/MN3/MN6/MN12 load full history upfront (few bars — fast).
// Smaller TFs load a short window; older bars are loaded on demand when the
// user scrolls left (lazy load).
//
export const TF_DEFAULT_DAYS: Record<string, number> = {
  M1: 3,        // ~3 days   (~4 300 bars)
  M5: 50,       // ~1 month  (~8 600 bars)
  M15: 200,      // ~6 months (~17 000 bars)
  H1: 730,      // ~2 years
  H4: 1825,     // ~5 years
  H9: 1825,     // ~5 years  (~4 900 bars)
  D1: Infinity, // full history (~6 500 bars — fast to load)
  W1: Infinity,
  MN1: Infinity,
  MN3: Infinity, // ~100 bars total
  MN6: Infinity, // ~50 bars total
  MN12: Infinity, // ~25 bars total
}

// ── Bar duration per timeframe (seconds) ─────────────────────────────────────
export const TF_BAR_SECS: Record<string, number> = {
  M1: 60,
  M5: 300,
  M15: 900,
  H1: 3600,
  H4: 14400,
  H9: 32400,
  D1: 86400,
  W1: 604800,
  MN1: 2592000,
  MN3: 7776000,
  MN6: 15552000,
  MN12: 31536000,
}

// Target number of visible bars after cross-chart navigation (per TF)
export const NAV_TARGET_BARS: Record<string, number> = {
  M1: 100,
  M5: 100,
  M15: 192,
  H1: 100,
  H4: 100,
  H9: 100,
  D1: 90,
  W1: 48,
  MN1: 60,
  MN3: 48,
  MN6: 36,
  MN12: 24,
}

export const MIN_HISTORY_DATE = '2010-01-01'
export const MIN_HISTORY_TS = new Date(MIN_HISTORY_DATE).getTime() / 1000

export const DEFAULT_LEVEL_VISIBLE: Record<LevelPeriod, boolean> = {
  H1: false, H4: false, D1: false, W1: false, MN1: false, MN3: false, MN6: false, MN12: false,
}

// ChartSettings, DEFAULT_CHART_SETTINGS, and SourceKey are imported from '../store/persistedState'.

// Helper: map LevelPeriod → the matching key in ChartSettings
export const PERIOD_SETTING_KEY: Record<LevelPeriod, keyof ChartSettings> = {
  H1: 'levelH1', H4: 'levelH4',
  D1: 'levelD1', W1: 'levelW1', MN1: 'levelMN1',
  MN3: 'levelMN3', MN6: 'levelMN6', MN12: 'levelMN12',
}

// Helper: map TrendTF → the matching buy/sell color keys in ChartSettings.
// Used in the Settings panel color pickers so TypeScript is happy (no `as any`).
export const TREND_BUY_KEY: Record<TrendTF, keyof ChartSettings> = {
  H4: 'trendBuyH4', D1: 'trendBuyD1', W1: 'trendBuyW1',
  MN1: 'trendBuyMN1', MN3: 'trendBuyMN3', MN6: 'trendBuyMN6', MN12: 'trendBuyMN12',
}
export const TREND_SELL_KEY: Record<TrendTF, keyof ChartSettings> = {
  H4: 'trendSellH4', D1: 'trendSellD1', W1: 'trendSellW1',
  MN1: 'trendSellMN1', MN3: 'trendSellMN3', MN6: 'trendSellMN6', MN12: 'trendSellMN12',
}

// Opacity per timeframe (H4=lowest, MN12=highest).
// Overlapping trend rectangles add up so strong multi-TF agreement is visible.
export const TREND_ALPHA: Record<TrendTF, number> = {
  H4: 0.05, D1: 0.07, W1: 0.09, MN1: 0.11, MN3: 0.13, MN6: 0.15, MN12: 0.17,
}

// Buy colors: green (short TF) → blue → purple (long TF)
export const TREND_BUY_COLOR: Record<TrendTF, string> = {
  H4: '#3fb950',
  D1: '#26a641',
  W1: '#0ea5e9',
  MN1: '#388bfd',
  MN3: '#6e40c9',
  MN6: '#8957e5',
  MN12: '#a371f7',
}

// Sell colors: red (short TF) → orange → dark amber (long TF)
export const TREND_SELL_COLOR: Record<TrendTF, string> = {
  H4: '#f85149',
  D1: '#da3633',
  W1: '#f97316',
  MN1: '#d29922',
  MN3: '#ca8a04',
  MN6: '#b45309',
  MN12: '#92400e',
}

// ── Family line series (MN1 family A–D) ───────────────────────────────────────
export const FAMILY_LETTERS = ['A', 'B', 'C', 'D'] as const
/** Y-level per family for the overlay price scale (A highest). */
export const FAMILY_LINE_Y: Record<(typeof FAMILY_LETTERS)[number], number> = {
  A: 4, B: 3, C: 2, D: 1,
}

/** Map `family_buy` / `family_sell` letter to a single-line Y value (A=4 … D=1). */
export function familyLetterToOrdinal(letter: string): number | null {
  const u = letter.trim().toUpperCase()
  if (u === 'A' || u === 'B' || u === 'C' || u === 'D')
    return FAMILY_LINE_Y[u as keyof typeof FAMILY_LINE_Y]
  return null
}

export function familyOrdinalToLetter(n: number): string {
  const v = Math.round(Number(n))
  const map: Record<number, string> = { 1: 'D', 2: 'C', 3: 'B', 4: 'A' }
  return map[v] ?? ''
}
// Vertical offset so buy/sell lines don't fully overlap at identical family letters.
export const FAMILY_LINE_DIRECTION_OFFSET = 0.12
export const FAMILY_TF_COLORS: Record<FamilyTf, string> = {
  MN1: '#22c55e',
  MN3: '#38bdf8',
  MN6: '#a78bfa',
  MN12: '#f59e0b',
}
export const FAMILY_LINE_LEVELS: Record<FamilyTF, Record<(typeof FAMILY_LETTERS)[number], number>> = {
  MN1: { A: 16, B: 15, C: 14, D: 13 },
  MN3: { A: 12, B: 11, C: 10, D: 9 },
  MN6: { A: 8, B: 7, C: 6, D: 5 },
  MN12: { A: 4, B: 3, C: 2, D: 1 },
}

// The legacy backend-computed pane has no admitted configuration in the visitor.
export const BB_PANE_HEIGHT = 88  // px — 70 × 1.25, applied as soon as the pane is created
export const BB_TF_CONFIG: Record<string, { period: number }> = {}

// Approximate LWC right price-axis width — used to clip canvas overlays
export const PRICE_AXIS_W = 65
