import { OHLCVBar } from '../../types'
import {
  TREND_TFS,
  FAMILY_TFS,
  TRIGGER_TFS,
} from '../../types/timeframes'
import type {
  TrendTf,
  FamilyTf,
  TriggerTf,
} from '../../types/timeframes'

// ── Backward-compat aliases (capital-F naming used throughout the codebase) ──
export type TrendTF = TrendTf
export type FamilyTF = FamilyTf
export type TriggerTF = TriggerTf
// Re-export the const arrays so existing imports keep working
export { TREND_TFS, FAMILY_TFS, TRIGGER_TFS }

// One continuous stretch of the same trend direction on one timeframe.
export interface TrendSegment {
  tf: TrendTF
  direction: 'buy' | 'sell'
  type: string
  timeFrom: number   // unix timestamp (start of trend period)
  timeTo: number   // unix timestamp (end = next change, or "now")
}


export interface WMFBar {
  UW: number
  LW: number
  Body: number
}

export interface Trigger {
  id: number
  datetime: string
  row_type?: string
  pair: string
  timeframe: string
  dir: 'buy' | 'sell'
  entry: number
  bb_trigger: number
  atr_short: number | null
  atr_long: number | null
  ref_short: number | null
  ref_long: number | null
  p_short: number | null
  p_long: number | null
  bkt_short: number | null
  bkt_long: number | null
  cell: string | null
}

// ── Tooltip data ──────────────────────────────────────────────────────────────
export interface TooltipData {
  bar: OHLCVBar
  bbPct: number | null   // null on timeframes without a BB panel
  x: number          // crosshair X in chart pixels
  y: number          // crosshair Y in chart pixels
  wmf: WMFBar
}
