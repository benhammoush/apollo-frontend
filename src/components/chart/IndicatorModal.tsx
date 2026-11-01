import { theme } from '../../design-system'
import type { ChartIndicatorId, ChartIndicatorsState, LevelsIndicatorState, TriggersIndicatorState, SessionLevelsIndicatorState, SessionsOhlcIndicatorState, StockExchangesIndicatorState } from '../../store/persistedState'
import { INDICATOR_DEFINITIONS, INDICATOR_GROUP_LABELS } from './indicatorLibrary'
import type { IndicatorGroupId } from './indicatorLibrary'

interface Props {
  open: boolean
  indicators: ChartIndicatorsState
  showTrends: Record<string, boolean>
  showFamilies: boolean
  onClose: () => void
  onSelect: (id: ChartIndicatorId) => void
}

const GROUPS: IndicatorGroupId[] = ['core', 'context', 'custom']
const MASKED_INDICATORS = new Set<ChartIndicatorId>([
  'bollingerBands', 'atr', 'adx', 'rsi',
  'ema20', 'ema50', 'ema200', 'sma20', 'sma50', 'sma200',
  'trends', 'families', 'triggers', 'sessionLevels', 'levels',
])

export default function IndicatorModal({
  open,
  indicators,
  showTrends,
  showFamilies,
  onClose,
  onSelect,
}: Props) {
  if (!open) return null

  const isActive = (def: (typeof INDICATOR_DEFINITIONS)[number]) => {
    if (def.id === 'trends') return Object.values(showTrends).some(Boolean)
    if (def.id === 'families') return showFamilies
    if (def.id === 'triggers') {
      const t = indicators.triggers as TriggersIndicatorState
      return t.showBuy || t.showSell || t.showM1 || t.showM5 || t.showM15 || t.showH1 || t.showH4
    }
    if (def.id === 'sessionLevels') {
      const s = indicators.sessionLevels as SessionLevelsIndicatorState
      return s.showSydney || s.showTokyo || s.showLondon || s.showNewYork
    }
    if (def.id === 'sessionsOhlc') {
      const s = indicators.sessionsOhlc as SessionsOhlcIndicatorState
      return s.showSydney || s.showTokyo || s.showLondon || s.showNewYork
    }
    if (def.id === 'levels') {
      const l = indicators.levels as LevelsIndicatorState
      return l.showH1 || l.showH4 || l.showD1 || l.showW1 || l.showMN1 || l.showMN3 || l.showMN6 || l.showMN12
    }
    if (def.id === 'stockExchanges') {
      const e = indicators.stockExchanges as StockExchangesIndicatorState
      return e.showTSE || e.showLSE || e.showNYSE
    }
    return indicators[def.id].enabled as boolean
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: theme.colors.bg.overlay,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${theme.colors.border.muted}`,
          borderRadius: theme.radii.lg,
          boxShadow: theme.shadows.dropdown,
          color: theme.colors.text.primary,
          fontFamily: theme.fonts.mono,
          overflow: 'hidden',
          maxWidth: 'min(720px, calc(100% - 24px))',
          maxHeight: 'min(480px, calc(100vh - 80px))',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px 8px',
          borderBottom: `1px solid ${theme.colors.border.default}`,
          flexShrink: 0,
        }}>
          <div style={{ fontSize: theme.fonts.size.sm, fontWeight: theme.fonts.weight.bold }}>
            Indicateurs
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.colors.text.secondary,
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 0,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          flex: 1,
          minHeight: 0,
        }}>
          {GROUPS.map((group, gi) => {
            const flexMap: Record<string, number> = { core: 0.8, context: 1, custom: 1.3 }
            return (
            <div
              key={group}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                flex: flexMap[group],
                minWidth: 0,
                padding: '10px 10px 12px',
                borderLeft: gi > 0 ? `1px solid ${theme.colors.border.default}` : 'none',
              }}
            >
              <div style={{
                fontSize: 9,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: theme.colors.text.dimmer,
                padding: '2px 4px 4px',
              }}>
                {INDICATOR_GROUP_LABELS[group]}
              </div>
              {INDICATOR_DEFINITIONS.filter(def => def.group === group).map(def => {
                const active = isActive(def)
                const disabled = MASKED_INDICATORS.has(def.id)
                return (
                  <div
                    key={def.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: theme.radii.sm,
                      background: active ? theme.colors.bg.hover : 'transparent',
                      border: `1px solid ${active ? theme.colors.border.strong : 'transparent'}`,
                    }}
                  >
                    <span style={{
                      width: 10,
                      color: active ? theme.colors.accent.blue : theme.colors.text.muted,
                      fontSize: 9,
                      flexShrink: 0,
                    }}>
                      {active ? '●' : '○'}
                    </span>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={disabled ? undefined : () => { onClose(); onSelect(def.id) }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: disabled ? theme.colors.text.disabled : active ? theme.colors.text.primary : theme.colors.text.secondary,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        padding: 0,
                        fontSize: 12,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span>{disabled ? 'xxx' : def.label}</span>
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}
