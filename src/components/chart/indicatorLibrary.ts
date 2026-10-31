import type { ChartIndicatorId, ChartIndicatorsState } from '../../store/persistedState'

export type IndicatorGroupId = 'core' | 'context' | 'custom'
export type OverlayIndicatorId = 'ema20' | 'ema50' | 'ema200' | 'sma20' | 'sma50' | 'sma200' | 'trends' | 'families' | 'triggers' | 'sessionLevels' | 'sessionsOhlc' | 'levels' | 'stockExchanges'
export type PaneIndicatorId = 'bollingerBands' | 'atr' | 'adx' | 'rsi'

export interface IndicatorDefinition {
  id: ChartIndicatorId
  label: string
  shortLabel: string
  group: IndicatorGroupId
  kind: 'overlay' | 'pane'
  description: string
}

export const INDICATOR_DEFINITIONS: IndicatorDefinition[] = [
  {
    id: 'bollingerBands',
    label: 'BB%',
    shortLabel: 'BB%',
    group: 'core',
    kind: 'pane',
    description: 'Position du prix dans les bandes de Bollinger.',
  },
  {
    id: 'atr',
    label: 'ATR',
    shortLabel: 'ATR',
    group: 'core',
    kind: 'pane',
    description: 'Mesure de volatilite en sous-pane.',
  },
  {
    id: 'adx',
    label: 'ADX',
    shortLabel: 'ADX',
    group: 'core',
    kind: 'pane',
    description: 'Force de tendance en sous-pane.',
  },
  {
    id: 'rsi',
    label: 'RSI',
    shortLabel: 'RSI',
    group: 'core',
    kind: 'pane',
    description: 'Oscillateur de momentum en sous-pane.',
  },
  {
    id: 'ema20',
    label: 'EMA 20',
    shortLabel: 'EMA20',
    group: 'context',
    kind: 'overlay',
    description: 'Repere court terme.',
  },
  {
    id: 'ema50',
    label: 'EMA 50',
    shortLabel: 'EMA50',
    group: 'context',
    kind: 'overlay',
    description: 'Repere moyen terme.',
  },
  {
    id: 'ema200',
    label: 'EMA 200',
    shortLabel: 'EMA200',
    group: 'context',
    kind: 'overlay',
    description: 'Repere de structure long terme.',
  },
  {
    id: 'sma20',
    label: 'SMA 20',
    shortLabel: 'SMA20',
    group: 'context',
    kind: 'overlay',
    description: 'Moyenne simple court terme.',
  },
  {
    id: 'sma50',
    label: 'SMA 50',
    shortLabel: 'SMA50',
    group: 'context',
    kind: 'overlay',
    description: 'Moyenne simple moyen terme.',
  },
  {
    id: 'sma200',
    label: 'SMA 200',
    shortLabel: 'SMA200',
    group: 'context',
    kind: 'overlay',
    description: 'Moyenne simple long terme.',
  },
  {
    id: 'trends',
    label: 'Tendances',
    shortLabel: 'Tend.',
    group: 'custom',
    kind: 'overlay',
    description: 'Trend rectangles by timeframe',
  },
  {
    id: 'families',
    label: 'Familles',
    shortLabel: 'Fam.',
    group: 'custom',
    kind: 'overlay',
    description: 'Family lines by timeframe',
  },
  {
    id: 'triggers',
    label: 'Déclencheurs',
    shortLabel: 'Décl.',
    group: 'custom',
    kind: 'overlay',
    description: 'Trigger signals by timeframe and direction',
  },
  {
    id: 'sessionLevels',
    label: 'Sessions',
    shortLabel: 'Sess.',
    group: 'custom',
    kind: 'overlay',
    description: 'Session levels (OHLC, range, vol regime)',
  },
  {
    id: 'sessionsOhlc',
    label: 'Sessions OHLC',
    shortLabel: 'Sess.OHLC',
    group: 'custom',
    kind: 'overlay',
    description: 'Session OHLC computed on-the-fly from chart bars',
  },
  {
    id: 'levels',
    label: 'Niveaux',
    shortLabel: 'Niv.',
    group: 'custom',
    kind: 'overlay',
    description: 'Period price levels (H1-MN12)',
  },
  {
    id: 'stockExchanges',
    label: 'Stock Exchanges',
    shortLabel: 'Exch.',
    group: 'custom',
    kind: 'overlay',
    description: 'Bourse openings/closings (TSE, LSE, NYSE)',
  },
]

export const INDICATOR_GROUP_LABELS: Record<IndicatorGroupId, string> = {
  core: 'Core',
  context: 'Context',
  custom: 'Custom',
}

export const PANE_INDICATOR_IDS: PaneIndicatorId[] = ['bollingerBands', 'atr', 'adx', 'rsi']
export const OVERLAY_INDICATOR_IDS: OverlayIndicatorId[] = ['ema20', 'ema50', 'ema200', 'sma20', 'sma50', 'sma200', 'trends', 'families', 'triggers', 'sessionLevels', 'sessionsOhlc', 'levels', 'stockExchanges']

export function getIndicatorDefinition(id: ChartIndicatorId): IndicatorDefinition {
  return INDICATOR_DEFINITIONS.find(def => def.id === id) ?? INDICATOR_DEFINITIONS[0]
}

export function getActiveIndicatorCount(indicators: ChartIndicatorsState): number {
  return Object.values(indicators).filter(indicator => indicator.enabled).length
}

export function getActivePaneIndicatorId(indicators: ChartIndicatorsState): PaneIndicatorId | null {
  for (const id of PANE_INDICATOR_IDS) {
    if (indicators[id].enabled) return id
  }
  return null
}
