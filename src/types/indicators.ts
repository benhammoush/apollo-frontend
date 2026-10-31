// ── Indicator types: price levels, BB %b, family snapshots ────────────────────

export type LevelPeriod = 'H1' | 'H4' | 'D1' | 'W1' | 'MN1' | 'MN3' | 'MN6' | 'MN12'
export type LevelType = 'high' | 'low' | '50pct' | 'open'

export interface PriceLevel {
  period: LevelPeriod
  level_type: LevelType
  price: number
  time_from: number   // unix timestamp
  time_to: number   // unix timestamp
  color: string   // hex
  dashed: boolean
}

export interface LevelsResponse {
  symbol: string
  segments: PriceLevel[]
}

// ── Bollinger Band %b time series ─────────────────────────────────────────────

/**
 * BB %b sample for chart overlay (chart indicator and/or GET /agents/bb/{symbol}/series).
 *   time — unix timestamp of the bar
 *   pct  — BB %b value  (< 0 = below lower band, > 1 = above upper band)
 */
export interface BBPctPoint { time: number; pct: number }

// ── Family snapshot (indic_families worker) ─────────────────────────────────
/** One row per D1 date + timeframe with primitives + buy/sell family labels. */
export type FamilyLetter = 'A' | 'B' | 'C' | 'D'

export interface FamilySnapshot {
  date: string
  tf: 'MN1' | 'MN3' | 'MN6' | 'MN12'
  close_outside: boolean
  co_bull: boolean
  co_bear: boolean
  sweep_low: boolean
  sweep_high: boolean
  mid_reclaim_bull: boolean
  mid_reclaim_bear: boolean
  return_inside_after_sweep_low: boolean
  return_inside_after_sweep_high: boolean
  family_buy: string
  family_sell: string
}
