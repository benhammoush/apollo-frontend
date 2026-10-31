// ── Single source of truth for all timeframe identifiers ──────────────────
//
// MT5 naming convention: M1, M5, M15, H1, H4, D1, W1, MN1, MN3, MN6, MN12
//
// Every other file that needs a list of timeframe identifiers should import
// from here.  Do NOT define ad-hoc arrays or inline union types — they will
// eventually drift and cause bugs like silent data loss.

/** All supported timeframes, smallest to largest. */
export const ALL_TFS = ['M1', 'M5', 'M15', 'H1', 'H4', 'H9', 'D1', 'W1', 'MN1', 'MN3', 'MN6', 'MN12'] as const
export type TfLabel = typeof ALL_TFS[number]

/** Timeframes used for period level lines. */
export const LEVEL_TFS = ['H1', 'H4', 'D1', 'W1', 'MN1', 'MN3', 'MN6', 'MN12'] as const
export type LevelTf = typeof LEVEL_TFS[number]

/** Timeframes used for trend overlays (no H1 — only C-state trends). */
export const TREND_TFS = ['H4', 'D1', 'W1', 'MN1', 'MN3', 'MN6', 'MN12'] as const
export type TrendTf = typeof TREND_TFS[number]

/** Timeframes used for family lines. */
export const FAMILY_TFS = ['MN1', 'MN3', 'MN6', 'MN12'] as const
export type FamilyTf = typeof FAMILY_TFS[number]

/** Timeframes used for trigger signals. */
export const TRIGGER_TFS = ['M1', 'M5', 'M15', 'H1', 'H4'] as const
export type TriggerTf = typeof TRIGGER_TFS[number]
