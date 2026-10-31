import { useRef, type ReactNode } from 'react'
import {
  IChartApi, ISeriesApi,
  Time,
} from 'lightweight-charts'
import { theme } from '../../design-system'
import { OHLCVBar, PriceLevel, BBPctPoint, LevelPeriod } from '../../types'
import { ChartSettings } from '../../store/persistedState'
import { TrendTF, TrendSegment, Trigger } from './types'
import type { SessionLevelRow } from './hooks/useSessionLevelsData'
import { BB_TF_CONFIG } from './constants'
import { useChartCanvas } from './hooks/useChartCanvas'
import { Drawing, DrawingTool } from './drawings'
import ApolloLogo from '../layout/ApolloLogo'
import type { PaneIndicatorId } from './indicatorLibrary'
import type { IndicatorSnapshots } from './hooks/useLibraryIndicators'
import type { FibSettings } from '../../store/persistedState'

interface Props {
  // LWC refs
  chartRef: React.MutableRefObject<IChartApi | null>
  candleRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>
  bbLineRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  bbGreenRef: React.MutableRefObject<ISeriesApi<'Area'> | null>
  bbRedRef: React.MutableRefObject<ISeriesApi<'Baseline'> | null>
  animRef: React.MutableRefObject<number>
  bgCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>
  bgDirtyRef: React.MutableRefObject<boolean>
  fgDirtyRef: React.MutableRefObject<boolean>

  // Data refs
  barsRef: React.MutableRefObject<OHLCVBar[]>
  segmentsRef: React.MutableRefObject<PriceLevel[]>
  trendSegsRef: React.MutableRefObject<TrendSegment[]>
  bbPointsRef: React.MutableRefObject<BBPctPoint[]>
  triggersRef: React.MutableRefObject<Trigger[]>
  sessionRowsRef: React.MutableRefObject<SessionLevelRow[]>
  showSessionRef: React.MutableRefObject<{ sydney: boolean; tokyo: boolean; london: boolean; newYork: boolean }>
  showSessionsOhlcRef: React.MutableRefObject<{ sydney: boolean; tokyo: boolean; london: boolean; newYork: boolean }>
  showStockExchangesRef: React.MutableRefObject<{ tse: boolean; lse: boolean; nyse: boolean }>

  // Visibility refs
  levelVisibleRef: React.MutableRefObject<Record<LevelPeriod, boolean>>
  showTrendsRef: React.MutableRefObject<Record<TrendTF, boolean>>
  showTriggersRef: React.MutableRefObject<boolean>
  showBuyRef: React.MutableRefObject<boolean>
  showSellRef: React.MutableRefObject<boolean>
  showM5Ref: React.MutableRefObject<boolean>
  showM15Ref: React.MutableRefObject<boolean>
  showH1Ref: React.MutableRefObject<boolean>
  showM1Ref: React.MutableRefObject<boolean>
  showH4Ref: React.MutableRefObject<boolean>

  // Color refs
  periodColorsRef: React.MutableRefObject<Record<LevelPeriod, string>>
  trendBuyColorsRef: React.MutableRefObject<Record<TrendTF, string>>
  trendSellColorsRef: React.MutableRefObject<Record<TrendTF, string>>

  // Interaction refs
  hoveredTriggerIdxRef: React.MutableRefObject<number>
  selectedTriggerIdxRef: React.MutableRefObject<number>
  lastMouseXRef: React.MutableRefObject<number>
  lastMouseYRef: React.MutableRefObject<number>
  pinnedTriggersRef: React.MutableRefObject<Set<number>>
  highlightMarkerRef: React.MutableRefObject<{ ts: number; expiresAt: number } | null>
  trendHLCacheRef: React.MutableRefObject<Map<string, { high: number; low: number }>>

  // Tooltip DOM refs
  tooltipElRef: React.MutableRefObject<HTMLDivElement | null>
  tooltipDateRef: React.MutableRefObject<HTMLDivElement | null>
  tooltipORef: React.MutableRefObject<HTMLSpanElement | null>
  tooltipHRef: React.MutableRefObject<HTMLSpanElement | null>
  tooltipLRef: React.MutableRefObject<HTMLSpanElement | null>
  tooltipCRef: React.MutableRefObject<HTMLSpanElement | null>
  tooltipUWRef: React.MutableRefObject<HTMLSpanElement | null>
  tooltipBDRef: React.MutableRefObject<HTMLSpanElement | null>
  tooltipLWRef: React.MutableRefObject<HTMLSpanElement | null>
  tooltipBBRowRef: React.MutableRefObject<HTMLDivElement | null>
  tooltipBBValRef: React.MutableRefObject<HTMLSpanElement | null>
  bbPaneLabelRef: React.MutableRefObject<HTMLDivElement | null>
  indicatorValueStripRef: React.MutableRefObject<HTMLDivElement | null>

  // TF ref + init
  tfRef: React.MutableRefObject<string>
  initSettings: ChartSettings
  loadOlderChunk: () => void

  // Cross-chart crosshair sync
  chartId: string
  syncCrosshairTimeRef: React.MutableRefObject<number | null>
  syncCrosshairPriceRef: React.MutableRefObject<number | null>
  activePaneIndicatorIdRef: React.MutableRefObject<PaneIndicatorId | null>
  indicatorSnapshotsRef: React.MutableRefObject<IndicatorSnapshots>

  // Drawings
  drawingsRef: React.MutableRefObject<Drawing[]>
  drawingToolRef: React.MutableRefObject<DrawingTool | null>
  drawingColorRef: React.MutableRefObject<string>
  drawingInProgressRef: React.MutableRefObject<Drawing | null>
  symbolRef: React.MutableRefObject<string>
  fibSettingsRef: React.MutableRefObject<FibSettings>

  // Render state
  tf: string
  isLoading: boolean
  bbLoading: boolean
  bbPaneHeight: number

  // Children: ChartTooltip + DatasetDropdown (positioned absolute inside this wrapper)
  children?: ReactNode
}

export default function ChartCanvas(props: Props) {
  const { tf, isLoading, bbLoading, bbPaneHeight, children, ...canvasParams } = props

  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)

  useChartCanvas({ containerRef, wrapperRef, overlayRef, bbPaneHeight, ...canvasParams })

  return (
    <div ref={wrapperRef} style={{ flex: 1, position: 'relative', minHeight: 0, minWidth: 0, zIndex: 0 }}>

      {/* LWC candlestick chart */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Canvas overlay: trend rects + period level lines + trade markers */}
      <canvas ref={overlayRef}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 10 }} />

      {/* ── Loading overlay ──────────────────────────────────────────────────── */}
      {isLoading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50,
          backdropFilter: 'blur(6px)',
          background: theme.colors.bg.deep + 'c8',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          pointerEvents: 'none',
        }}>
          <ApolloLogo size={48} />
          <span style={{
            fontSize: theme.fonts.size.sm,
            color: theme.colors.text.muted,
            fontFamily: theme.fonts.mono,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {tf}
          </span>
        </div>
      )}

      {/* ── BB loading overlay ───────────────────────────────────────────────── */}
      {bbLoading && BB_TF_CONFIG[tf] && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: bbPaneHeight + 40, zIndex: 20, pointerEvents: 'none',
          background: theme.colors.bg.deep + 'bf',
          backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <ApolloLogo size={20} />
          <span style={{ fontSize: 10, color: theme.colors.text.muted, fontFamily: theme.fonts.mono, letterSpacing: '0.05em' }}>
            BB%
          </span>
        </div>
      )}

      {/* Children: ChartTooltip + DatasetDropdown (absolute positioned) */}
      {children}

    </div>
  )
}
