import { theme } from '../../design-system'
import type {
  ChartIndicatorId,
  ChartIndicatorsState,
  IndicatorAtrSmoothing,
  IndicatorSource,
  SourceKey,
  SessionLevelsIndicatorState,
  SessionsOhlcIndicatorState,
  TriggersIndicatorState,
  LevelsIndicatorState,
  StockExchangesIndicatorState,
} from '../../store/persistedState'
import { getIndicatorDefinition } from './indicatorLibrary'
import { TREND_TFS, FAMILY_TFS, TRIGGER_TFS } from '../../types/timeframes'
import type { TrendTf, FamilyTf, TriggerTf } from '../../types/timeframes'
import type { TrendTF, FamilyTF, TriggerTF } from './types'
import type { LevelPeriod } from '../../types'

import DatasetDropdown from './DatasetDropdown'
import type { Dataset } from './DatasetDropdown'

interface Props {
  open: boolean
  selectedIndicatorId: ChartIndicatorId | null
  indicators: ChartIndicatorsState
  onClose: () => void
  onToggle: (id: ChartIndicatorId) => void
  onPatch: (id: ChartIndicatorId, patch: Record<string, unknown>) => void
  showTrends: Record<TrendTF, boolean>
  onToggleTrendTf: (tf: TrendTF) => void
  trendBuyColors: Record<TrendTF, string>
  trendSellColors: Record<TrendTF, string>
  onTrendBuyColorChange: (tf: TrendTF, color: string) => void
  onTrendSellColorChange: (tf: TrendTF, color: string) => void
  selectedFamilyTF: FamilyTF
  setSelectedFamilyTF: (tf: FamilyTF) => void
  hasFamilyData: boolean
  showFamilies: boolean
  triggersState: TriggersIndicatorState
  onToggleTriggerDirection: (dir: 'buy' | 'sell') => void
  onToggleTriggerTF: (tf: TriggerTF) => void
  sessionLevelsState: SessionLevelsIndicatorState
  onToggleSession: (session: 'showSydney' | 'showTokyo' | 'showLondon' | 'showNewYork') => void
  sessionsOhlcState: SessionsOhlcIndicatorState
  onToggleSessionsOhlc: (session: 'showSydney' | 'showTokyo' | 'showLondon' | 'showNewYork') => void
  levelsState: LevelsIndicatorState
  onToggleLevelTF: (period: LevelPeriod) => void
  periodColors: Record<LevelPeriod, string>
  onLevelColorChange: (period: LevelPeriod, color: string) => void
  stockExchangesState: StockExchangesIndicatorState
  onToggleExchange: (exchange: 'showTSE' | 'showLSE' | 'showNYSE') => void
  sources: Record<SourceKey, string | null>
  setSource: (key: SourceKey, val: string | null) => void
  availableDatasets: Dataset[]
}

const SOURCE_OPTIONS: IndicatorSource[] = ['open', 'high', 'low', 'close', 'hl2', 'hlc3', 'ohlc4']
const ATR_SMOOTHING_OPTIONS: IndicatorAtrSmoothing[] = ['RMA', 'SMA', 'EMA', 'WMA']
const levelPeriods: LevelPeriod[] = ['H1', 'H4', 'D1', 'W1', 'MN1', 'MN3', 'MN6', 'MN12']

export default function ChartIndicatorsPanel({
  open,
  selectedIndicatorId,
  indicators,
  onClose,
  onToggle,
  onPatch,
  showTrends,
  onToggleTrendTf,
  trendBuyColors,
  trendSellColors,
  onTrendBuyColorChange,
  onTrendSellColorChange,
  selectedFamilyTF,
  setSelectedFamilyTF,
  hasFamilyData,
  showFamilies,
  triggersState,
  onToggleTriggerDirection,
  onToggleTriggerTF,
  sessionLevelsState,
  onToggleSession,
  sessionsOhlcState,
  onToggleSessionsOhlc,
  levelsState,
  onToggleLevelTF,
  periodColors,
  onLevelColorChange,
  stockExchangesState,
  onToggleExchange,
  sources,
  setSource,
  availableDatasets,
}: Props) {
  if (!open || !selectedIndicatorId) return null

  const def = getIndicatorDefinition(selectedIndicatorId)
  const indicator = indicators[selectedIndicatorId]
  const bbIndicator = indicators.bollingerBands
  const atrIndicator = indicators.atr
  const adxIndicator = indicators.adx
  const rsiIndicator = indicators.rsi

  const visible = selectedIndicatorId === 'families'
    ? showFamilies
    : selectedIndicatorId === 'trends'
      ? Object.values(showTrends).some(Boolean)
      : selectedIndicatorId === 'triggers'
        ? triggersState.showBuy || triggersState.showSell || triggersState.showM1 || triggersState.showM5 || triggersState.showM15 || triggersState.showH1 || triggersState.showH4
        : selectedIndicatorId === 'sessionLevels'
          ? sessionLevelsState.showSydney || sessionLevelsState.showTokyo || sessionLevelsState.showLondon || sessionLevelsState.showNewYork
          : selectedIndicatorId === 'sessionsOhlc'
            ? sessionsOhlcState.showSydney || sessionsOhlcState.showTokyo || sessionsOhlcState.showLondon || sessionsOhlcState.showNewYork
            : selectedIndicatorId === 'levels'
            ? levelsState.showH1 || levelsState.showH4 || levelsState.showD1 || levelsState.showW1 || levelsState.showMN1 || levelsState.showMN3 || levelsState.showMN6 || levelsState.showMN12
            : selectedIndicatorId === 'stockExchanges'
              ? stockExchangesState.showTSE || stockExchangesState.showLSE || stockExchangesState.showNYSE
              : !!indicator.enabled

  const tfKeyMap: Record<TriggerTF, keyof TriggersIndicatorState> = {
    M1: 'showM1', M5: 'showM5', M15: 'showM15', H1: 'showH1', H4: 'showH4',
  }

  return (
    <div style={{
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 35,
      width: 300,
      maxWidth: 'min(300px, calc(100% - 24px))',
      maxHeight: 'min(440px, calc(100vh - 100px))',
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
      pointerEvents: 'auto',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
        padding: '10px 12px 8px',
        borderBottom: `1px solid ${theme.colors.border.default}`,
        flexShrink: 0,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: theme.fonts.size.sm, fontWeight: theme.fonts.weight.bold, lineHeight: 1.2 }}>
            {def.label}
          </div>
          <div style={{ fontSize: theme.fonts.size.xs, color: theme.colors.text.secondary, marginTop: 3, lineHeight: 1.25 }}>
            {def.description}
          </div>
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
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      <div style={{
        padding: '12px 12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        flex: 1,
        minHeight: 0,
      }}>
        {selectedIndicatorId === 'bollingerBands' && (
          <>
            <NumberRow label="Length" value={bbIndicator.length} min={1} onChange={value => onPatch(selectedIndicatorId, { length: value })} />
            <NumberRow label="Multiplier" value={bbIndicator.mult} min={0.1} step={0.1} onChange={value => onPatch(selectedIndicatorId, { mult: value })} />
            <SelectRow label="Source" value={bbIndicator.src} options={SOURCE_OPTIONS} onChange={value => onPatch(selectedIndicatorId, { src: value })} />
            <ColorRow label="Color" value={bbIndicator.basisColor} onChange={value => onPatch(selectedIndicatorId, { basisColor: value })} />
          </>
        )}

        {selectedIndicatorId === 'atr' && (
          <>
            <NumberRow label="Length" value={atrIndicator.length} min={1} onChange={value => onPatch(selectedIndicatorId, { length: value })} />
            <SelectRow label="Smoothing" value={atrIndicator.smoothing} options={ATR_SMOOTHING_OPTIONS} onChange={value => onPatch(selectedIndicatorId, { smoothing: value })} />
            <ColorRow label="Color" value={atrIndicator.color} onChange={value => onPatch(selectedIndicatorId, { color: value })} />
          </>
        )}

        {selectedIndicatorId === 'adx' && (
          <>
            <NumberRow label="ADX Smooth" value={adxIndicator.adxSmoothing} min={1} onChange={value => onPatch(selectedIndicatorId, { adxSmoothing: value })} />
            <NumberRow label="DI Length" value={adxIndicator.diLength} min={1} onChange={value => onPatch(selectedIndicatorId, { diLength: value })} />
            <NumberRow label="Threshold" value={adxIndicator.threshold} min={1} onChange={value => onPatch(selectedIndicatorId, { threshold: value })} />
            <ColorRow label="Color" value={adxIndicator.color} onChange={value => onPatch(selectedIndicatorId, { color: value })} />
          </>
        )}

        {selectedIndicatorId === 'rsi' && (
          <>
            <NumberRow label="Length" value={rsiIndicator.length} min={1} onChange={value => onPatch(selectedIndicatorId, { length: value })} />
            <SelectRow label="Source" value={rsiIndicator.src} options={SOURCE_OPTIONS} onChange={value => onPatch(selectedIndicatorId, { src: value })} />
            <NumberRow label="Upper" value={rsiIndicator.upper} min={1} max={100} onChange={value => onPatch(selectedIndicatorId, { upper: value })} />
            <NumberRow label="Lower" value={rsiIndicator.lower} min={0} max={99} onChange={value => onPatch(selectedIndicatorId, { lower: value })} />
            <ColorRow label="Color" value={rsiIndicator.color} onChange={value => onPatch(selectedIndicatorId, { color: value })} />
          </>
        )}

        {selectedIndicatorId === 'trends' && (
          <>
            <SettingsSection label="Source de données">
              <DatasetDropdown
                sourceKey="trends"
                agentName="trends"
                sources={sources}
                setSource={setSource}
                availableDatasets={availableDatasets}
              />
            </SettingsSection>
            <SettingsSection label="Timeframes">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TREND_TFS.map(tf => (
                  <button
                    key={tf}
                    onClick={() => onToggleTrendTf(tf)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 4,
                      border: `1px solid ${showTrends[tf] ? trendBuyColors[tf] : theme.colors.border.grid}`,
                      background: showTrends[tf] ? trendBuyColors[tf] + '22' : 'transparent',
                      color: showTrends[tf] ? trendBuyColors[tf] : theme.colors.text.axisText,
                      cursor: 'pointer',
                      fontSize: theme.fonts.size.xs,
                      fontFamily: theme.fonts.mono,
                    }}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </SettingsSection>
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', color: theme.colors.text.axisText, fontSize: theme.fonts.size.sm, marginBottom: 4 }}>
                Colors
              </summary>
              <div style={{ marginTop: 4 }}>
                {TREND_TFS.map(tf => (
                  <div key={tf} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: theme.colors.text.axisText, fontSize: theme.fonts.size.sm, width: 32 }}>{tf}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                      <span style={{ color: theme.colors.text.dimmer, fontSize: theme.fonts.size.xs }}>Buy</span>
                      <input
                        type="color"
                        value={trendBuyColors[tf]}
                        onChange={e => onTrendBuyColorChange(tf, e.target.value)}
                        style={{ width: 22, height: 22, border: `1px solid ${theme.colors.border.muted}`, borderRadius: 4, padding: 1, background: 'transparent', cursor: 'pointer' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ color: theme.colors.text.dimmer, fontSize: theme.fonts.size.xs }}>Sell</span>
                      <input
                        type="color"
                        value={trendSellColors[tf]}
                        onChange={e => onTrendSellColorChange(tf, e.target.value)}
                        style={{ width: 22, height: 22, border: `1px solid ${theme.colors.border.muted}`, borderRadius: 4, padding: 1, background: 'transparent', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </>
        )}

        {selectedIndicatorId === 'families' && (
          <>
            <SettingsSection label="Source de données">
              <DatasetDropdown
                sourceKey="families"
                agentName="families"
                sources={sources}
                setSource={setSource}
                availableDatasets={availableDatasets}
              />
            </SettingsSection>
            <SettingsSection label="Timeframe">
              <div style={{ display: 'flex', gap: 6 }}>
                {FAMILY_TFS.map(tf => (
                  <button
                    key={tf}
                    onClick={() => setSelectedFamilyTF(tf)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 4,
                      border: `1px solid ${selectedFamilyTF === tf ? theme.colors.text.link : theme.colors.border.grid}`,
                      background: selectedFamilyTF === tf ? theme.colors.text.link + '22' : 'transparent',
                      color: selectedFamilyTF === tf ? theme.colors.text.link : theme.colors.text.axisText,
                      cursor: 'pointer', fontSize: theme.fonts.size.xs, fontFamily: theme.fonts.mono,
                    }}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              {!hasFamilyData && (
                <div style={{ marginTop: 8, fontSize: 9, color: theme.colors.text.dimmer, fontStyle: 'italic' }}>
                  No family data loaded
                </div>
              )}
            </SettingsSection>

          </>
        )}

        {selectedIndicatorId === 'triggers' && (
          <>
            <SettingsSection label="Source de données">
              <DatasetDropdown
                sourceKey="triggers"
                agentName="Triggers_BT"
                sources={sources}
                setSource={setSource}
                availableDatasets={availableDatasets}
              />
            </SettingsSection>
            <SettingsSection label="Direction">
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => onToggleTriggerDirection('buy')}
                  style={{
                    padding: '4px 10px', borderRadius: 4,
                    border: `1px solid ${triggersState.showBuy ? theme.colors.chart.up : theme.colors.border.grid}`,
                    background: triggersState.showBuy ? theme.colors.chart.up + '22' : 'transparent',
                    color: triggersState.showBuy ? theme.colors.chart.up : theme.colors.text.axisText,
                    cursor: 'pointer', fontSize: theme.fonts.size.xs, fontFamily: theme.fonts.mono,
                  }}
                >
                  Buy
                </button>
                <button
                  onClick={() => onToggleTriggerDirection('sell')}
                  style={{
                    padding: '4px 10px', borderRadius: 4,
                    border: `1px solid ${triggersState.showSell ? theme.colors.chart.down : theme.colors.border.grid}`,
                    background: triggersState.showSell ? theme.colors.chart.down + '22' : 'transparent',
                    color: triggersState.showSell ? theme.colors.chart.down : theme.colors.text.axisText,
                    cursor: 'pointer', fontSize: theme.fonts.size.xs, fontFamily: theme.fonts.mono,
                  }}
                >
                  Sell
                </button>
              </div>
            </SettingsSection>
            <SettingsSection label="Timeframes">
              <div style={{ display: 'flex', gap: 6 }}>
                {TRIGGER_TFS.map(tf => {
                  const isActive = triggersState[tfKeyMap[tf]] as boolean
                  return (
                    <button
                      key={tf}
                      onClick={() => onToggleTriggerTF(tf)}
                      style={{
                        padding: '4px 10px', borderRadius: 4,
                        border: `1px solid ${isActive ? theme.colors.text.link : theme.colors.border.grid}`,
                        background: isActive ? theme.colors.text.link + '22' : 'transparent',
                        color: isActive ? theme.colors.text.link : theme.colors.text.axisText,
                        cursor: 'pointer', fontSize: theme.fonts.size.xs, fontFamily: theme.fonts.mono,
                      }}
                    >
                      {tf}
                    </button>
                  )
                })}
              </div>
            </SettingsSection>
          </>
        )}

        {selectedIndicatorId === 'sessionLevels' && (
          <>
            <SettingsSection label="Source de données">
              <DatasetDropdown
                sourceKey="sessionLevels"
                agentName="session_levels"
                sources={sources}
                setSource={setSource}
                availableDatasets={availableDatasets}
              />
            </SettingsSection>
            <SettingsSection label="Sessions">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(['showSydney', 'showTokyo', 'showLondon', 'showNewYork'] as const).map((key) => {
                  const label = key.replace('show', '')
                  const sessionColor = {
                    Sydney: '#22d3ee',
                    Tokyo: '#a78bfa',
                    London: '#388bfd',
                    NewYork: '#f97316',
                  }[label]
                  const isActive = sessionLevelsState[key] as boolean
                  return (
                    <button
                      key={key}
                      onClick={() => onToggleSession(key)}
                      style={{
                        padding: '4px 10px', borderRadius: 4,
                        border: `1px solid ${isActive ? sessionColor : theme.colors.border.grid}`,
                        background: isActive ? sessionColor + '22' : 'transparent',
                        color: isActive ? sessionColor : theme.colors.text.axisText,
                        cursor: 'pointer', fontSize: theme.fonts.size.xs, fontFamily: theme.fonts.mono,
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </SettingsSection>
          </>
        )}

        {selectedIndicatorId === 'sessionsOhlc' && (
          <>
            <SettingsSection label="Sessions">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(['showSydney', 'showTokyo', 'showLondon', 'showNewYork'] as const).map((key) => {
                  const label = key.replace('show', '')
                  const sessionColor = {
                    Sydney: '#22d3ee',
                    Tokyo: '#a78bfa',
                    London: '#388bfd',
                    NewYork: '#f97316',
                  }[label]
                  const isActive = sessionsOhlcState[key] as boolean
                  return (
                    <button
                      key={key}
                      onClick={() => onToggleSessionsOhlc(key)}
                      style={{
                        padding: '4px 10px', borderRadius: 4,
                        border: `1px solid ${isActive ? sessionColor : theme.colors.border.grid}`,
                        background: isActive ? sessionColor + '22' : 'transparent',
                        color: isActive ? sessionColor : theme.colors.text.axisText,
                        cursor: 'pointer', fontSize: theme.fonts.size.xs, fontFamily: theme.fonts.mono,
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </SettingsSection>
          </>
        )}

        {selectedIndicatorId === 'levels' && (
          <>
            <SettingsSection label="Timeframes">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {levelPeriods.map(period => {
                  const key = `show${period}` as keyof LevelsIndicatorState
                  const isActive = levelsState[key] as boolean
                  return (
                    <button
                      key={period}
                      onClick={() => onToggleLevelTF(period)}
                      style={{
                        padding: '4px 10px', borderRadius: 4,
                        border: `1px solid ${isActive ? periodColors[period] : theme.colors.border.grid}`,
                        background: isActive ? periodColors[period] + '22' : 'transparent',
                        color: isActive ? periodColors[period] : theme.colors.text.axisText,
                        cursor: 'pointer', fontSize: theme.fonts.size.xs, fontFamily: theme.fonts.mono,
                      }}
                    >
                      {period}
                    </button>
                  )
                })}
              </div>
            </SettingsSection>
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', color: theme.colors.text.axisText, fontSize: theme.fonts.size.sm, marginBottom: 4 }}>
                Colors
              </summary>
              <div style={{ marginTop: 4 }}>
                {levelPeriods.map(period => (
                  <div key={period} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ color: theme.colors.text.axisText, fontSize: theme.fonts.size.sm, width: 36 }}>{period}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                      <input
                        type="color"
                        value={periodColors[period]}
                        onChange={e => onLevelColorChange(period, e.target.value)}
                        style={{ width: 22, height: 22, border: `1px solid ${theme.colors.border.muted}`, borderRadius: 4, padding: 1, background: 'transparent', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </>
        )}

        {selectedIndicatorId === 'stockExchanges' && (
          <>
            <SettingsSection label="Exchanges">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(['showTSE', 'showLSE', 'showNYSE'] as const).map((key) => {
                  const label = key.replace('show', '')
                  const exchangeColor = {
                    TSE: '#a78bfa',
                    LSE: '#388bfd',
                    NYSE: '#f97316',
                  }[label]
                  const isActive = stockExchangesState[key] as boolean
                  return (
                    <button
                      key={key}
                      onClick={() => onToggleExchange(key)}
                      style={{
                        padding: '4px 10px', borderRadius: 4,
                        border: `1px solid ${isActive ? exchangeColor : theme.colors.border.grid}`,
                        background: isActive ? exchangeColor + '22' : 'transparent',
                        color: isActive ? exchangeColor : theme.colors.text.axisText,
                        cursor: 'pointer', fontSize: theme.fonts.size.xs, fontFamily: theme.fonts.mono,
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </SettingsSection>
          </>
        )}

        {selectedIndicatorId !== 'bollingerBands' && selectedIndicatorId !== 'atr' && selectedIndicatorId !== 'adx' && selectedIndicatorId !== 'rsi' && selectedIndicatorId !== 'trends' && selectedIndicatorId !== 'families' && selectedIndicatorId !== 'triggers' && selectedIndicatorId !== 'sessionLevels' && selectedIndicatorId !== 'sessionsOhlc' && selectedIndicatorId !== 'levels' && selectedIndicatorId !== 'stockExchanges' && (
          <>
            <div style={{ fontSize: theme.fonts.size.xs, color: theme.colors.text.secondary }}>
              Preset fixe.
            </div>
            <ColorRow label="Color" value={(indicator as { color: string }).color} onChange={value => onPatch(selectedIndicatorId, { color: value })} />
          </>
        )}
      </div>

      <div style={{
        flexShrink: 0,
        padding: '6px 10px 8px',
        borderTop: `1px solid ${theme.colors.border.default}`,
        background: theme.colors.bg.surface + 'aa',
      }}>
          <button
            type="button"
            onClick={() => onToggle(selectedIndicatorId)}
            style={showHideFooterButton(visible)}
          >
            {visible ? 'Hide' : 'Show'}
          </button>
        </div>
    </div>
  )
}

/** Green when hidden (action: show), red when visible (action: hide). */
function showHideFooterButton(visible: boolean) {
  const accent = visible ? theme.colors.accent.red : theme.colors.accent.green
  return {
    width: '100%',
    padding: '4px 8px',
    fontSize: theme.fonts.size.xs,
    fontWeight: theme.fonts.weight.medium,
    fontFamily: theme.fonts.mono,
    letterSpacing: '0.02em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    borderRadius: theme.radii.sm,
    border: `1px solid ${accent}`,
    background: accent + '22',
    color: accent,
  } as const
}

function SettingsSection({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ color: theme.colors.text.secondary, fontSize: theme.fonts.size.xs, fontWeight: theme.fonts.weight.medium, marginBottom: 2 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function rowBase() {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  } as const
}

function labelStyle() {
  return {
    color: theme.colors.text.secondary,
    fontSize: theme.fonts.size.xs,
  } as const
}

function NumberRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
}) {
  return (
    <div style={rowBase()}>
      <span style={labelStyle()}>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(Number(e.target.value))}
        style={inputStyle()}
      />
    </div>
  )
}

function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  onChange: (value: T) => void
}) {
  return (
    <div style={rowBase()}>
      <span style={labelStyle()}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        style={inputStyle()}
      >
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  )
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const safeValue = typeof value === 'string' && value ? value : '#000000'
  return (
    <div style={rowBase()}>
      <span style={labelStyle()}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: theme.colors.text.muted, fontSize: theme.fonts.size.xs }}>{safeValue.replace('#', '')}</span>
        <input
          type="color"
          value={safeValue}
          onChange={e => onChange(e.target.value)}
          style={{
            width: 28,
            height: 22,
            border: `1px solid ${theme.colors.border.muted}`,
            borderRadius: theme.radii.sm,
            background: 'transparent',
            cursor: 'pointer',
          }}
        />
      </div>
    </div>
  )
}

function inputStyle() {
  return {
    minWidth: 108,
    maxWidth: 132,
    background: theme.colors.bg.deep,
    color: theme.colors.text.primary,
    border: `1px solid ${theme.colors.border.muted}`,
    borderRadius: theme.radii.sm,
    padding: '4px 6px',
    fontSize: theme.fonts.size.sm,
    fontFamily: theme.fonts.mono,
    outline: 'none',
  } as const
}
