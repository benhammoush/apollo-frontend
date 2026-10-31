/**
 * Renders visitor candles, supplied overlays and interactive chart tools.
 * @packageDocumentation
 */
import { useCallback, useEffect, useRef } from 'react'
import {
  createChart,
  IChartApi, ISeriesApi,
  CandlestickSeries, Time,
} from 'lightweight-charts'
import { OHLCVBar, PriceLevel, BBPctPoint, LevelPeriod } from '../../../types'
import { theme } from '../../../design-system'
import { ChartSettings } from '../../../store/persistedState'
import { TrendTF, TrendSegment, Trigger } from '../types'
import type { SessionLevelRow } from './useSessionLevelsData'
import {
  TREND_ALPHA,
  BB_TF_CONFIG, PRICE_AXIS_W,
  TF_BAR_SECS,
} from '../constants'
import { snapToBarTime, findBarsInRange, findNearestBBPct } from '../algorithms'
import { Drawing, DrawingTool, FibLevelTime, saveDrawings } from '../drawings'
import type { PaneIndicatorId } from '../indicatorLibrary'
import type { IndicatorSnapshots } from './useLibraryIndicators'
import type { FibSettings } from '../../../store/persistedState'
import { isLondonDstShift } from '../../../utils/dst'

interface Params {
  // DOM refs
  containerRef: React.MutableRefObject<HTMLDivElement | null>
  wrapperRef: React.MutableRefObject<HTMLDivElement | null>
  overlayRef: React.MutableRefObject<HTMLCanvasElement | null>
  bbPaneHeight: number

  // LWC refs (hook writes to these)
  chartRef: React.MutableRefObject<IChartApi | null>
  candleRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>
  bbLineRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  bbGreenRef: React.MutableRefObject<ISeriesApi<'Area'> | null>
  bbRedRef: React.MutableRefObject<ISeriesApi<'Baseline'> | null>
  animRef: React.MutableRefObject<number>
  bgCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>

  // Dirty flags
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

  // TF ref
  tfRef: React.MutableRefObject<string>

  // Initial settings for chart creation
  initSettings: ChartSettings

  // Stable callback from useChartData
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

  // Fib settings
  fibSettingsRef: React.MutableRefObject<FibSettings>
}

export function useChartCanvas({
  containerRef, wrapperRef, overlayRef, bbPaneHeight,
  chartRef, candleRef, bbLineRef, bbGreenRef, bbRedRef, animRef, bgCanvasRef,
  bgDirtyRef, fgDirtyRef,
  barsRef, segmentsRef, trendSegsRef, bbPointsRef, triggersRef,
  sessionRowsRef, showSessionRef, showSessionsOhlcRef,
  showStockExchangesRef,
  levelVisibleRef, showTrendsRef,
  showTriggersRef, showBuyRef, showSellRef, showM1Ref, showM5Ref, showM15Ref, showH1Ref, showH4Ref,
  periodColorsRef, trendBuyColorsRef, trendSellColorsRef,
  hoveredTriggerIdxRef, selectedTriggerIdxRef, lastMouseXRef, lastMouseYRef, pinnedTriggersRef,
  highlightMarkerRef, trendHLCacheRef,
  tooltipElRef, tooltipDateRef, tooltipORef, tooltipHRef, tooltipLRef, tooltipCRef,
  tooltipUWRef, tooltipBDRef, tooltipLWRef, tooltipBBRowRef, tooltipBBValRef, bbPaneLabelRef, indicatorValueStripRef,
  tfRef, initSettings, loadOlderChunk,
  chartId, syncCrosshairTimeRef, syncCrosshairPriceRef,
  activePaneIndicatorIdRef, indicatorSnapshotsRef,
  drawingsRef, drawingToolRef, drawingColorRef, drawingInProgressRef, symbolRef,
  fibSettingsRef,
}: Params): void {
  // Ghost mouse position during in-progress drawing (only used inside this hook)
  const drawingGhostRef = useRef<{ x: number; y: number } | null>(null)

  // Fib post-creation interaction
  const fibHoverRef = useRef<{ drawingId: string; anchor: 'diagonal' | 'diagLeft' | 'diagRight' | 'anchor1' | 'anchor2' } | null>(null)
  const fibDragStateRef = useRef<{ drawingId: string; anchor: 'diagonal' | 'diagLeft' | 'diagRight' | 'anchor1' | 'anchor2'; origPoints: { time: number; price: number }[]; clickTime: number; clickPrice: number; drawingIndex: number; origLevelTimes: Record<number, FibLevelTime> | null } | null>(null)

  const distanceToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
    const dx = x2 - x1, dy = y2 - y1
    const lenSq = dx * dx + dy * dy
    if (lenSq === 0) return Math.hypot(px - x1, py - y1)
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
    t = Math.max(0, Math.min(1, t))
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
  }

  const HIT_DIAGONAL = 10
  const HIT_ANCHOR = 12

  const hideIndicatorStrip = () => {
    if (indicatorValueStripRef.current) indicatorValueStripRef.current.style.display = 'none'
  }

  const setIndicatorStrip = (
    text: string,
    position: { bottom?: number; top?: number },
  ) => {
    const strip = indicatorValueStripRef.current
    if (!strip || !text) return
    strip.textContent = text
    strip.style.top = position.top !== undefined ? `${position.top}px` : 'auto'
    strip.style.bottom = position.bottom !== undefined ? `${position.bottom}px` : 'auto'
    strip.style.transform = 'translateY(0)'
    strip.style.display = ''
  }

  const findSeriesValueAtTime = (values: Array<{ time: number; value: number }>, ts: number) => {
    let lo = 0
    let hi = values.length - 1
    let match: { time: number; value: number } | null = null
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const point = values[mid]
      if (point.time === ts) return point
      if (point.time < ts) {
        match = point
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    return match
  }

  const formatIndicatorValue = (value: number) => {
    if (!Number.isFinite(value)) return 'n/a'
    if (Math.abs(value) >= 1000) return value.toFixed(1)
    if (Math.abs(value) >= 100) return value.toFixed(2)
    if (Math.abs(value) >= 1) return value.toFixed(5)
    return value.toFixed(5)
  }

  const renderIndicatorStrip = (ts: number, mouseY: number) => {
    const wrapperHeight = wrapperRef.current?.clientHeight ?? 0
    if (wrapperHeight <= 0) {
      hideIndicatorStrip()
      return
    }

    const activePaneIndicatorId = activePaneIndicatorIdRef.current
    const hasIndicatorPane = !!activePaneIndicatorId
    const hasBBPane = !!bbLineRef.current && !!BB_TF_CONFIG[tfRef.current]
    const indicatorPaneHeight = hasIndicatorPane ? 88 : 0
    const bbPaneBottom = hasIndicatorPane ? indicatorPaneHeight : 0
    const timeScaleHeight = 24
    const indicatorPaneTop = wrapperHeight - timeScaleHeight - indicatorPaneHeight
    const bbPaneTop = indicatorPaneTop - bbPaneHeight
    const isHoveringIndicatorPane = hasIndicatorPane && mouseY >= wrapperHeight - indicatorPaneHeight
    const isHoveringBBPane =
      hasBBPane &&
      mouseY >= wrapperHeight - indicatorPaneHeight - bbPaneHeight &&
      mouseY < wrapperHeight - indicatorPaneHeight

    if (isHoveringIndicatorPane && activePaneIndicatorId) {
      const snapshots = indicatorSnapshotsRef.current[activePaneIndicatorId] ?? []
      const parts = snapshots
        .map(snapshot => {
          const point = findSeriesValueAtTime(snapshot.values, ts)
          return point ? `${snapshot.label} ${formatIndicatorValue(point.value)}` : null
        })
        .filter((part): part is string => part !== null)
      if (parts.length > 0) {
        setIndicatorStrip(parts.join('  ·  '), { top: Math.max(8, indicatorPaneTop - 22) })
        return
      }
    }

    const bbPct = BB_TF_CONFIG[tfRef.current]
      ? findNearestBBPct(ts, bbPointsRef.current)
      : null

    if (isHoveringBBPane) {
      if (bbPct !== null) {
        setIndicatorStrip(`BB% ${bbPct.toFixed(3)}`, { top: Math.max(8, bbPaneTop - 22) })
        return
      }
    }

    const paneParts = activePaneIndicatorId
      ? (indicatorSnapshotsRef.current[activePaneIndicatorId] ?? [])
        .map(snapshot => {
          const point = findSeriesValueAtTime(snapshot.values, ts)
          return point ? `${snapshot.label} ${formatIndicatorValue(point.value)}` : null
        })
        .filter((part): part is string => part !== null)
      : []

    const overlayParts = Object.entries(indicatorSnapshotsRef.current)
      .filter(([id, snapshots]) => {
        if (!snapshots || snapshots.length === 0) return false
        return id !== 'atr' && id !== 'adx' && id !== 'rsi' && id !== 'bollingerBands'
      })
      .flatMap(([, snapshots]) =>
        snapshots
          .map(snapshot => {
            const point = findSeriesValueAtTime(snapshot.values, ts)
            return point ? `${snapshot.label} ${formatIndicatorValue(point.value)}` : null
          })
          .filter((part): part is string => part !== null),
      )

    const pricePaneParts = [
      ...(bbPct !== null ? [`BB% ${bbPct.toFixed(3)}`] : []),
      ...overlayParts,
    ]

    if (pricePaneParts.length > 0) {
      setIndicatorStrip(pricePaneParts.join('  ·  '), { bottom: bbPaneBottom + 8 })
      return
    }

    if (paneParts.length > 0) {
      setIndicatorStrip(paneParts.join('  ·  '), { top: Math.max(8, indicatorPaneTop - 22) })
      return
    }

    hideIndicatorStrip()
  }

  // ── Canvas draw loop (runs every animation frame) ─────────────────────────────
  //
  // Uses ONLY refs (never state) so that changing TF/symbol doesn't re-create
  // the chart.  All state changes sync to refs via useEffect above.
  //
  // Two-layer system (see bgCanvasRef declaration above for full explanation):
  //   • bgDirtyRef  → redraw trends/levels to the off-screen bgCanvas
  //   • fgDirtyRef  → blit bgCanvas to on-screen overlay + draw interactive layer
  //   • both false  → skip this frame entirely (no canvas work at all)
  //
  const drawOverlay = useCallback(() => {
    const chart = chartRef.current
    const series = candleRef.current
    if (!chart || !series) return

    const overlay = overlayRef.current
    const bgCanvas = bgCanvasRef.current
    if (!overlay) return

    const W = overlay.width
    const H = overlay.height
    if (W === 0 || H === 0) return

    // ── LAYER 1: background (expensive, skipped when not dirty) ──────────────────
    //
    // Draws trend rectangles and period level lines to the
    // off-screen bgCanvas.  Only runs when bgDirtyRef is true, which happens
    // when data loads, visibility toggles, chart scrolls/zooms, or colors change.
    //
    if (bgDirtyRef.current && bgCanvas) {
      const bgCtx = bgCanvas.getContext('2d')
      if (bgCtx) {
        bgCtx.clearRect(0, 0, W, H)

        const range = chart.timeScale().getVisibleRange()
        if (range) {
          const paneW = W - PRICE_AXIS_W

          bgCtx.save()
          bgCtx.beginPath()
          bgCtx.rect(0, 0, paneW, H)
          bgCtx.clip()

          // ── Draw trend rectangles ──────────────────────────────────────────────
          const bars = barsRef.current
          for (const seg of trendSegsRef.current) {
            if (!showTrendsRef.current[seg.tf]) continue

            const fromTs = snapToBarTime(seg.timeFrom, bars)
            const toTs = snapToBarTime(seg.timeTo, bars)

            const x1 = chart.timeScale().timeToCoordinate(fromTs as unknown as Time)
            const x2 = chart.timeScale().timeToCoordinate(toTs as unknown as Time)
            if (x1 === null || x2 === null) continue

            const cacheKey = `${seg.timeFrom}_${seg.timeTo}`
            let hl = trendHLCacheRef.current.get(cacheKey)
            if (!hl) {
              let barsInRange = findBarsInRange(bars, seg.timeFrom, seg.timeTo)
              // If the raw range has no loaded bars (e.g. the segment sits in
              // unloaded history and snapToBarTime mapped it to the boundary
              // bar), fall back to the single bar that fromTs snapped to.
              if (barsInRange.length === 0) barsInRange = findBarsInRange(bars, fromTs, fromTs + 1)
              if (barsInRange.length > 0) {
                let high = barsInRange[0].high, low = barsInRange[0].low
                for (const b of barsInRange) {
                  if (b.high > high) high = b.high
                  if (b.low < low) low = b.low
                }
                hl = { high, low }
                trendHLCacheRef.current.set(cacheKey, hl)
              }
            }

            const topY = hl ? series.priceToCoordinate(hl.high) : 0
            const botY = hl ? series.priceToCoordinate(hl.low) : H
            const rectTop = topY ?? 0
            const rectBot = botY ?? H

            const left = Math.max(0, Math.min(x1, x2))
            const right = Math.min(paneW, Math.max(x1, x2))
            if (right <= left) continue

            const rectW = right - left
            const rectH = rectBot - rectTop

            // Read color from settings-derived refs (user can customize in Settings panel)
            const tfColor = seg.direction === 'buy' ? trendBuyColorsRef.current[seg.tf] : trendSellColorsRef.current[seg.tf]

            bgCtx.fillStyle = tfColor + Math.round(TREND_ALPHA[seg.tf] * 255).toString(16).padStart(2, '0')
            bgCtx.fillRect(left, rectTop, rectW, rectH)
            bgCtx.strokeStyle = tfColor + '66'
            bgCtx.lineWidth = 1
            bgCtx.strokeRect(left, rectTop, rectW, rectH)
          }

          // ── Draw period level lines ────────────────────────────────────────────
          const visFrom = range.from as unknown as number
          const visTo = range.to as unknown as number
          bgCtx.lineWidth = 1
          for (const seg of segmentsRef.current) {
            if (!(levelVisibleRef.current[seg.period as LevelPeriod] ?? false)) continue
            if (seg.time_to <= visFrom || seg.time_from >= visTo) continue

            const snappedFrom = snapToBarTime(seg.time_from, bars)
            const snappedTo = snapToBarTime(seg.time_to, bars)
            const x1 = chart.timeScale().timeToCoordinate(snappedFrom as unknown as Time)
            const x2 = chart.timeScale().timeToCoordinate(snappedTo as unknown as Time)
            const y = series.priceToCoordinate(seg.price)
            if (x1 === null || x2 === null || y === null || y < 0 || y > H) continue

            bgCtx.strokeStyle = periodColorsRef.current[seg.period as LevelPeriod] ?? seg.color
            bgCtx.setLineDash(seg.dashed ? [4, 4] : [])
            bgCtx.beginPath()
            bgCtx.moveTo(Math.max(0, x1), y)
            bgCtx.lineTo(Math.min(paneW, x2), y)
            bgCtx.stroke()
          }
          bgCtx.setLineDash([])

          // ── Draw session level rectangles ──────────────────────────────────────
          const SESSION_COLORS: Record<string, string> = {
            Sydney: '#22d3ee', Tokyo: '#a78bfa', London: '#388bfd', New_York: '#f97316',
          }
          const SESSION_KEYS: Record<string, keyof typeof showSessionRef.current> = {
            Sydney: 'sydney', Tokyo: 'tokyo', London: 'london', New_York: 'newYork',
          }
          for (const row of sessionRowsRef.current) {
            const sKey = SESSION_KEYS[row.session]
            if (!sKey || !showSessionRef.current[sKey]) continue

            const bars = barsRef.current
            const startTs = snapToBarTime((new Date(row.start).getTime() / 1000), bars) as unknown as Time
            const endTs = snapToBarTime((new Date(row.end).getTime() / 1000), bars) as unknown as Time
            const x1 = chart.timeScale().timeToCoordinate(startTs)
            const x2 = chart.timeScale().timeToCoordinate(endTs)
            if (x1 === null && x2 === null) continue
            const leftCoord = x1 ?? 0
            const rightCoord = x2 ?? paneW

            const left = Math.max(0, Math.min(leftCoord, rightCoord))
            const right = Math.min(paneW, Math.max(leftCoord, rightCoord))
            if (right <= left) continue

            const topY = series.priceToCoordinate(row.high)
            const botY = series.priceToCoordinate(row.low)
            if (topY === null || botY === null) continue

            const rectTop = Math.max(0, topY)
            const rectBot = Math.min(H, botY)
            if (rectBot <= rectTop) continue

            const color = SESSION_COLORS[row.session] ?? '#888888'
            const alphaHex = '15'

            bgCtx.fillStyle = color + alphaHex
            bgCtx.fillRect(left, rectTop, right - left, rectBot - rectTop)
            bgCtx.strokeStyle = color + '55'
            bgCtx.lineWidth = 1
            bgCtx.strokeRect(left, rectTop, right - left, rectBot - rectTop)

            const openY = series.priceToCoordinate(row.open)
            const closeY = series.priceToCoordinate(row.close)
            bgCtx.save()
            bgCtx.setLineDash([4, 4])
            bgCtx.lineWidth = 1
            if (openY !== null && openY >= 0 && openY <= H) {
              bgCtx.strokeStyle = color + 'aa'
              bgCtx.beginPath()
              bgCtx.moveTo(left, openY)
              bgCtx.lineTo(right, openY)
              bgCtx.stroke()
            }
            if (closeY !== null && closeY >= 0 && closeY <= H) {
              bgCtx.strokeStyle = color + 'aa'
              bgCtx.beginPath()
              bgCtx.moveTo(left, closeY)
              bgCtx.lineTo(right, closeY)
              bgCtx.stroke()
            }
            bgCtx.restore()

            const rangeLabel = row.range_pips != null ? row.range_pips.toFixed(6) : ''
            const lines = [row.session, rangeLabel]
            bgCtx.font = `bold 9px ${theme.fonts.mono}`
            bgCtx.fillStyle = color + 'cc'
            const lineH = 11
            const labelBase = Math.min(H - (lines.length - 1) * lineH, rectBot + 13)
            for (let li = 0; li < lines.length; li++) {
              const line = lines[li]
              if (!line) continue
              bgCtx.fillText(line, left + 4, labelBase + li * lineH)
            }
          }

          // ── Draw Sessions OHLC (computed on-the-fly from chart bars) ──────────
          const SESSIONS_OHLC_SPECS = [
            { id: 'sydney' as keyof typeof showSessionsOhlcRef.current, label: 'Sydney', openH: 0, closeH: 9, color: '#22d3ee', dstShift: false },
            { id: 'tokyo' as keyof typeof showSessionsOhlcRef.current, label: 'Tokyo', openH: 2, closeH: 11, color: '#a78bfa', dstShift: false },
            { id: 'london' as keyof typeof showSessionsOhlcRef.current, label: 'London', openH: 10, closeH: 19, color: '#388bfd', dstShift: true },
            { id: 'newYork' as keyof typeof showSessionsOhlcRef.current, label: 'New_York', openH: 15, closeH: 24, color: '#f97316', dstShift: false },
          ]
          const visRangeSessions = chart.timeScale().getVisibleRange()
          if (visRangeSessions !== null && barsRef.current.length > 0) {
            const visFromS = visRangeSessions.from as unknown as number
            const visToS = visRangeSessions.to as unknown as number
            const barEndS = barsRef.current[barsRef.current.length - 1].time
            const startDayS = new Date(visFromS * 1000)
            startDayS.setUTCHours(0, 0, 0, 0)
            const endDayS = new Date(Math.min(visToS, barEndS) * 1000)
            endDayS.setUTCHours(0, 0, 0, 0)

            const oneDayS = 86400000
            for (let dt = startDayS.getTime(); dt <= endDayS.getTime(); dt += oneDayS) {
              const dayDate = new Date(dt)
              const dow = dayDate.getUTCDay()
              if (dow === 0 || dow === 6) continue

              for (const spec of SESSIONS_OHLC_SPECS) {
                if (!showSessionsOhlcRef.current[spec.id]) continue

                const dstShift = spec.dstShift && isLondonDstShift(dayDate) ? 1 : 0
                const y = dayDate.getUTCFullYear()
                const mo = dayDate.getUTCMonth()
                const day = dayDate.getUTCDate()

                const openTs = (Date.UTC(y, mo, day, spec.openH + dstShift, 0, 0) / 1000) | 0
                const closeTs = spec.closeH === 24
                  ? (Date.UTC(y, mo, day + 1, 0, 0, 0) / 1000) | 0
                  : (Date.UTC(y, mo, day, spec.closeH + dstShift, 0, 0) / 1000) | 0

                if (openTs > barEndS) continue

                const sessionBars = findBarsInRange(barsRef.current, openTs, closeTs)
                if (sessionBars.length === 0) continue

                const sOpen = sessionBars[0].open
                const sClose = sessionBars[sessionBars.length - 1].close
                const sHigh = Math.max(...sessionBars.map(b => b.high))
                const sLow = Math.min(...sessionBars.map(b => b.low))
                const rangePips = sHigh - sLow

                const startTsOhlc = snapToBarTime(openTs, barsRef.current) as unknown as Time
                const endTsOhlc = snapToBarTime(closeTs, barsRef.current) as unknown as Time
                const x1 = chart.timeScale().timeToCoordinate(startTsOhlc)
                const x2 = chart.timeScale().timeToCoordinate(endTsOhlc)
                if (x1 === null && x2 === null) continue
                const leftCoord = x1 ?? 0
                const rightCoord = x2 ?? paneW

                const left = Math.max(0, Math.min(leftCoord, rightCoord))
                const right = Math.min(paneW, Math.max(leftCoord, rightCoord))
                if (right <= left) continue

                const topY = series.priceToCoordinate(sHigh)
                const botY = series.priceToCoordinate(sLow)
                if (topY === null || botY === null) continue

                const rectTop = Math.max(0, topY)
                const rectBot = Math.min(H, botY)
                if (rectBot <= rectTop) continue

                const color = spec.color
                const alphaHex = '15'

                bgCtx.fillStyle = color + alphaHex
                bgCtx.fillRect(left, rectTop, right - left, rectBot - rectTop)
                bgCtx.strokeStyle = color + '55'
                bgCtx.lineWidth = 1
                bgCtx.strokeRect(left, rectTop, right - left, rectBot - rectTop)

                const openY = series.priceToCoordinate(sOpen)
                const closeY = series.priceToCoordinate(sClose)
                bgCtx.save()
                bgCtx.setLineDash([4, 4])
                bgCtx.lineWidth = 1
                if (openY !== null && openY >= 0 && openY <= H) {
                  bgCtx.strokeStyle = color + 'aa'
                  bgCtx.beginPath()
                  bgCtx.moveTo(left, openY)
                  bgCtx.lineTo(right, openY)
                  bgCtx.stroke()
                }
                if (closeY !== null && closeY >= 0 && closeY <= H) {
                  bgCtx.strokeStyle = color + 'aa'
                  bgCtx.beginPath()
                  bgCtx.moveTo(left, closeY)
                  bgCtx.lineTo(right, closeY)
                  bgCtx.stroke()
                }
                bgCtx.restore()

                const rangeLabel = rangePips.toFixed(6)
                const lines = [spec.label, rangeLabel]
                bgCtx.font = `bold 9px ${theme.fonts.mono}`
                bgCtx.fillStyle = color + 'cc'
                const lineH = 11
                const labelBase = Math.min(H - (lines.length - 1) * lineH, rectBot + 13)
                for (let li = 0; li < lines.length; li++) {
                  const line = lines[li]
                  if (!line) continue
                  bgCtx.fillText(line, left + 4, labelBase + li * lineH)
                }
              }
            }
          }

          // ── Draw stock exchange vertical lines ───────────────────────────────
          const EXCHANGE_SPECS = [
            { id: 'tse' as keyof typeof showStockExchangesRef.current, label: 'TSE', openH: 3, openM: 0, closeH: 9, closeM: 30, color: '#a78bfa', dstShift: false },
            { id: 'lse' as keyof typeof showStockExchangesRef.current, label: 'LSE', openH: 10, openM: 0, closeH: 18, closeM: 30, color: '#388bfd', dstShift: true },
            { id: 'nyse' as keyof typeof showStockExchangesRef.current, label: 'NYSE', openH: 16, openM: 30, closeH: 23, closeM: 0, color: '#f97316', dstShift: false },
          ]
          const visRange = chart.timeScale().getVisibleRange()
          if (visRange !== null && barsRef.current.length > 0) {
            const visFrom = visRange.from as unknown as number
            const visTo = visRange.to as unknown as number
            const barEnd = barsRef.current[barsRef.current.length - 1].time
            const startDay = new Date(visFrom * 1000)
            startDay.setUTCHours(0, 0, 0, 0)
            const endDay = new Date(Math.min(visTo, barEnd) * 1000)
            endDay.setUTCHours(0, 0, 0, 0)

            const oneDay = 86400000
            for (let dt = startDay.getTime(); dt <= endDay.getTime(); dt += oneDay) {
              const dayDate = new Date(dt)
              const dow = dayDate.getUTCDay()
              if (dow === 0 || dow === 6) continue

              for (const spec of EXCHANGE_SPECS) {
                if (!showStockExchangesRef.current[spec.id]) continue

                const dstShift = spec.dstShift && isLondonDstShift(dayDate) ? 1 : 0
                const y = dayDate.getUTCFullYear()
                const mo = dayDate.getUTCMonth()

                const openTs = (Date.UTC(y, mo, dayDate.getUTCDate(), spec.openH + dstShift, spec.openM, 0) / 1000) | 0
                const closeTs = (Date.UTC(y, mo, dayDate.getUTCDate(), spec.closeH + dstShift, spec.closeM, 0) / 1000) | 0

                if (openTs > barEnd) continue
                const closeVisible = closeTs <= barEnd

                const snappedOpen = snapToBarTime(openTs, barsRef.current) as unknown as Time
                const openX = chart.timeScale().timeToCoordinate(snappedOpen)
                if (openX === null || openX < 0 || openX > paneW) continue

                // Dashed vertical line at open
                bgCtx.save()
                bgCtx.setLineDash([4, 4])
                bgCtx.strokeStyle = spec.color + 'bb'
                bgCtx.lineWidth = 1
                bgCtx.beginPath()
                bgCtx.moveTo(openX, 0)
                bgCtx.lineTo(openX, H)
                bgCtx.stroke()
                bgCtx.restore()

                let closeX: number | null = null
                if (closeVisible) {
                  const snappedClose = snapToBarTime(closeTs, barsRef.current) as unknown as Time
                  closeX = chart.timeScale().timeToCoordinate(snappedClose)
                  if (closeX !== null && closeX >= 0 && closeX <= paneW) {
                    bgCtx.save()
                    bgCtx.setLineDash([4, 4])
                    bgCtx.strokeStyle = spec.color + 'bb'
                    bgCtx.lineWidth = 1
                    bgCtx.beginPath()
                    bgCtx.moveTo(closeX, 0)
                    bgCtx.lineTo(closeX, H)
                    bgCtx.stroke()
                    bgCtx.restore()
                  }
                }

                // Label at top
                const labelX = closeVisible && closeX !== null && closeX >= 0 && closeX <= paneW
                  ? (openX + closeX) / 2
                  : openX + 20
                if (labelX >= 4 && labelX <= paneW - 4) {
                  bgCtx.font = `bold 14px ${theme.fonts.mono}`
                  bgCtx.fillStyle = spec.color + 'cc'
                  bgCtx.textAlign = 'center'
                  bgCtx.fillText(spec.label, labelX, 16)
                  bgCtx.textAlign = 'left'
                }
              }
            }
          }

          // ── Draw user drawings ───────────────────────────────────────────────
          for (const d of drawingsRef.current) {
            bgCtx.save()
            bgCtx.strokeStyle = d.color
            bgCtx.fillStyle = d.color + '33'
            bgCtx.lineWidth = 1.5
            bgCtx.setLineDash([])
            if (d.type === 'hline') {
              const y = series.priceToCoordinate(d.points[0].price)
              if (y !== null && y >= 0 && y <= H) {
                bgCtx.beginPath(); bgCtx.moveTo(0, y); bgCtx.lineTo(paneW, y); bgCtx.stroke()
                if (d.label) {
                  bgCtx.font = `bold 10px ${theme.fonts.mono}`
                  bgCtx.fillStyle = d.color
                  bgCtx.fillText(d.label, 4, y - 3)
                }
              }
            } else if (d.type === 'trendline' && d.points.length >= 2) {
              const x1 = chart.timeScale().timeToCoordinate(d.points[0].time as unknown as Time)
              const y1 = series.priceToCoordinate(d.points[0].price)
              const x2 = chart.timeScale().timeToCoordinate(d.points[1].time as unknown as Time)
              const y2 = series.priceToCoordinate(d.points[1].price)
              if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
                bgCtx.beginPath(); bgCtx.moveTo(x1, y1); bgCtx.lineTo(x2, y2); bgCtx.stroke()
              }
            } else if (d.type === 'rect' && d.points.length >= 2) {
              const x1 = chart.timeScale().timeToCoordinate(d.points[0].time as unknown as Time)
              const y1 = series.priceToCoordinate(d.points[0].price)
              const x2 = chart.timeScale().timeToCoordinate(d.points[1].time as unknown as Time)
              const y2 = series.priceToCoordinate(d.points[1].price)
              if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
                const rx = Math.min(x1, x2), ry = Math.min(y1, y2)
                const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1)
                bgCtx.fillRect(rx, ry, rw, rh); bgCtx.strokeRect(rx, ry, rw, rh)
              }
            } else if (d.type === 'fib' && d.points.length >= 2) {
              const p1 = d.points[0]
              const p2 = d.points[1]
              if (p1.price !== p2.price) {
                const x1 = chart.timeScale().timeToCoordinate(p1.time as unknown as Time)
                const x2 = chart.timeScale().timeToCoordinate(p2.time as unknown as Time)
                const y1 = series.priceToCoordinate(p1.price)
                const y2 = series.priceToCoordinate(p2.price)
                if (x1 !== null && x2 !== null && y1 !== null && y2 !== null) {
                  const fibSettings = fibSettingsRef.current
                  // Diagonal line: left anchor = 100% level startTime, right anchor = 0% level endTime
                  let idx100 = -1, idx0 = -1
                  for (let li = 0; li < fibSettings.levels.length; li++) {
                    if (fibSettings.levels[li].value === 1) idx100 = li
                    if (fibSettings.levels[li].value === 0) idx0 = li
                  }
                  const lt100 = idx100 >= 0 ? d.fibLevelTimes?.[idx100] : undefined
                  const lt0 = idx0 >= 0 ? d.fibLevelTimes?.[idx0] : undefined
                  const diagX1 = lt100 ? (chart.timeScale().timeToCoordinate(lt100.startTime as unknown as Time) ?? x1) : x1
                  const diagX2 = lt0 ? (chart.timeScale().timeToCoordinate(lt0.endTime as unknown as Time) ?? x2) : x2
                  // Diagonal line
                  bgCtx.strokeStyle = d.color + '88'
                  bgCtx.lineWidth = 1
                  bgCtx.setLineDash([4, 4])
                  bgCtx.beginPath()
                  bgCtx.moveTo(diagX1, y1)
                  bgCtx.lineTo(diagX2, y2)
                  bgCtx.stroke()
                  bgCtx.setLineDash([])
                  // Horizontal level lines
                  const anchorMinX = Math.min(x1, x2)
                  const anchorMaxX = fibSettings.extendLines ? paneW : Math.max(x1, x2)
                  for (let li = 0; li < fibSettings.levels.length; li++) {
                    const level = fibSettings.levels[li]
                    if (!level.visible) continue
                    const levelPrice = p2.price + (p1.price - p2.price) * level.value
                    const levelY = series.priceToCoordinate(levelPrice)
                    if (levelY === null || levelY < 0 || levelY > H) continue
                    const lt = d.fibLevelTimes?.[li]
                    const leftX = lt ? (chart.timeScale().timeToCoordinate(lt.startTime as unknown as Time) ?? anchorMinX) : anchorMinX
                    const rightX = lt ? (chart.timeScale().timeToCoordinate(lt.endTime as unknown as Time) ?? anchorMaxX) : anchorMaxX
                    const isAnchor = level.value === 0 || level.value === 1
                    bgCtx.strokeStyle = d.color
                    bgCtx.lineWidth = isAnchor ? 1.5 : 1
                    bgCtx.setLineDash(isAnchor ? [2, 2] : [])
                    bgCtx.beginPath()
                    bgCtx.moveTo(leftX, levelY)
                    bgCtx.lineTo(rightX, levelY)
                    bgCtx.stroke()
                    bgCtx.setLineDash([])
                    if (fibSettings.showLabels) {
                      bgCtx.font = `bold 9px ${theme.fonts.mono}`
                      bgCtx.fillStyle = d.color
                      const pct = level.value * 100
                      const pctFmt = isAnchor ? pct.toFixed(0) : pct.toFixed(1)
                      const label = `${pctFmt}% · ${levelPrice.toFixed(5)}`
                      const metrics = bgCtx.measureText(label)
                      const lx = Math.min(rightX - metrics.width - 6, paneW - metrics.width - 4)
                      bgCtx.fillText(label, lx, levelY - 3)
                    }
                  }
                }
              }
            }
            bgCtx.restore()
          }

          bgCtx.restore()
        }
      }
      bgDirtyRef.current = false
      fgDirtyRef.current = true   // always re-composite after a background redraw
    }

    // ── LAYER 2: foreground — only runs when fgDirtyRef is true ──────────────────
    //
    // Composites the background layer (one fast drawImage GPU blit) then draws
    // the cheap interactive elements on top: trade arrows + hover/select lines.
    //
    if (!fgDirtyRef.current) return
    fgDirtyRef.current = false

    const ctx = overlay.getContext('2d')
    if (!ctx) return

    // Blit background layer (trends/levels) — fast GPU copy
    ctx.clearRect(0, 0, W, H)
    if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0)

    // ── Ghost drawing (in-progress, dashed) ──────────────────────────────────
    const ghost = drawingInProgressRef.current
    const ghostXY = drawingGhostRef.current

    // Measure tool: finalized (2 points) — render overlay that survives panning/zooming
    if (ghost && ghost.type === 'measure' && ghost.points.length === 2) {
      const pt1 = ghost.points[0]
      const pt2 = ghost.points[1]
      const x1 = chart.timeScale().timeToCoordinate(pt1.time as unknown as Time)
      const y1 = series.priceToCoordinate(pt1.price)
      const x2 = chart.timeScale().timeToCoordinate(pt2.time as unknown as Time)
      const y2 = series.priceToCoordinate(pt2.price)
      if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        const rx = Math.min(x1, x2), ry = Math.min(y1, y2)
        const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1)
        const priceDiff = pt2.price - pt1.price
        const pctChange = (priceDiff / pt1.price) * 100
        const isUp = priceDiff >= 0
        const measureColor = isUp ? theme.colors.chart.up : theme.colors.chart.down
        // Count bars between the two timestamps
        const bars = barsRef.current
        const tMin = Math.min(pt1.time, pt2.time)
        const tMax = Math.max(pt1.time, pt2.time)
        const barCount = bars.filter(b => b.time >= tMin && b.time <= tMax).length

        ctx.save()
        ctx.strokeStyle = measureColor
        ctx.fillStyle = measureColor + '22'
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 3])
        ctx.fillRect(rx, ry, rw, rh)
        ctx.strokeRect(rx, ry, rw, rh)
        ctx.setLineDash([])

        // Info box
        const arrow = isUp ? '▲' : '▼'
        const line1 = `${arrow} ${Math.abs(priceDiff).toFixed(5)}`
        const line2 = `${isUp ? '+' : ''}${pctChange.toFixed(2)}%`
        const line3 = `${barCount} bar${barCount !== 1 ? 's' : ''}`
        const pad = 6
        const lineH = 14
        const boxW = 100
        const boxH = pad * 2 + lineH * 3
        const boxX = Math.min(Math.max(rx + rw / 2 - boxW / 2, 4), W - boxW - 4)
        const boxY = ry > boxH + 8 ? ry - boxH - 6 : ry + rh + 6
        ctx.fillStyle = 'rgba(10,12,18,0.88)'
        ctx.strokeStyle = measureColor + 'aa'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(boxX, boxY, boxW, boxH, 4)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = measureColor
        ctx.font = `bold 11px ${theme.fonts.mono}`
        ctx.textAlign = 'center'
        ctx.fillText(line1, boxX + boxW / 2, boxY + pad + lineH * 0.8)
        ctx.fillStyle = theme.colors.text.axisText
        ctx.font = `10px ${theme.fonts.mono}`
        ctx.fillText(line2, boxX + boxW / 2, boxY + pad + lineH * 1.8)
        ctx.fillStyle = theme.colors.text.muted
        ctx.fillText(line3, boxX + boxW / 2, boxY + pad + lineH * 2.8)
        ctx.restore()
      }
    } else if (ghost && ghost.points.length > 0 && ghostXY) {
      // Other tools dragging ghost
      const pt1 = ghost.points[0]
      const x1 = chart.timeScale().timeToCoordinate(pt1.time as unknown as Time)
      const y1 = series.priceToCoordinate(pt1.price)
      if (x1 !== null && y1 !== null) {
        ctx.save()
        ctx.strokeStyle = ghost.color
        ctx.fillStyle = ghost.color + '33'
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 3])
        if (ghost.type === 'measure') {
          // measure drag ghost — draw rect + live info box
          const rx = Math.min(x1, ghostXY.x), ry = Math.min(y1, ghostXY.y)
          const rw = Math.abs(ghostXY.x - x1), rh = Math.abs(ghostXY.y - y1)
          ctx.fillRect(rx, ry, rw, rh)
          ctx.strokeRect(rx, ry, rw, rh)
          ctx.setLineDash([])

          const ghostPrice = series.coordinateToPrice(ghostXY.y)
          const ghostTime = chart.timeScale().coordinateToTime(ghostXY.x) as unknown as number | null
          if (ghostPrice !== null && ghostTime !== null) {
            const priceDiff = ghostPrice - pt1.price
            const pctChange = (priceDiff / pt1.price) * 100
            const isUp = priceDiff >= 0
            const measureColor = isUp ? theme.colors.chart.up : theme.colors.chart.down
            const tMin = Math.min(pt1.time, ghostTime)
            const tMax = Math.max(pt1.time, ghostTime)
            const barCount = barsRef.current.filter(b => b.time >= tMin && b.time <= tMax).length
            const arrow = isUp ? '▲' : '▼'
            const line1 = `${arrow} ${Math.abs(priceDiff).toFixed(5)}`
            const line2 = `${isUp ? '+' : ''}${pctChange.toFixed(2)}%`
            const line3 = `${barCount} bar${barCount !== 1 ? 's' : ''}`
            const pad = 6, lineH = 14, boxW = 100
            const boxH = pad * 2 + lineH * 3
            const boxX = Math.min(Math.max(rx + rw / 2 - boxW / 2, 4), W - boxW - 4)
            const boxY = ry > boxH + 8 ? ry - boxH - 6 : ry + rh + 6
            ctx.fillStyle = 'rgba(10,12,18,0.88)'
            ctx.strokeStyle = measureColor + 'aa'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.roundRect(boxX, boxY, boxW, boxH, 4)
            ctx.fill()
            ctx.stroke()
            ctx.fillStyle = measureColor
            ctx.font = `bold 11px ${theme.fonts.mono}`
            ctx.textAlign = 'center'
            ctx.fillText(line1, boxX + boxW / 2, boxY + pad + lineH * 0.8)
            ctx.fillStyle = theme.colors.text.axisText
            ctx.font = `10px ${theme.fonts.mono}`
            ctx.fillText(line2, boxX + boxW / 2, boxY + pad + lineH * 1.8)
            ctx.fillStyle = theme.colors.text.muted
            ctx.fillText(line3, boxX + boxW / 2, boxY + pad + lineH * 2.8)
          }
        } else if (ghost.type === 'trendline') {
          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ghostXY.x, ghostXY.y); ctx.stroke()
        } else if (ghost.type === 'rect') {
          const rx = Math.min(x1, ghostXY.x), ry = Math.min(y1, ghostXY.y)
          ctx.fillRect(rx, ry, Math.abs(ghostXY.x - x1), Math.abs(ghostXY.y - y1))
          ctx.strokeRect(rx, ry, Math.abs(ghostXY.x - x1), Math.abs(ghostXY.y - y1))
        } else if (ghost.type === 'fib') {
          const ghostPrice = series.coordinateToPrice(ghostXY.y)
          const ghostTime = chart.timeScale().coordinateToTime(ghostXY.x) as unknown as number | null
          if (ghostPrice !== null && ghostTime !== null && pt1.price !== ghostPrice) {
            const fibSettings = fibSettingsRef.current
            // Dashed diagonal line
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ghostXY.x, ghostXY.y); ctx.stroke()
            ctx.setLineDash([4, 4])
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(ghostXY.x, ghostXY.y)
            ctx.stroke()
            ctx.setLineDash([])
            // Ghost level lines
            const leftX = Math.min(x1, ghostXY.x)
            const rightX = fibSettings.extendLines ? W - PRICE_AXIS_W : Math.max(x1, ghostXY.x)
            for (const level of fibSettings.levels) {
              if (!level.visible) continue
              const levelPrice = ghostPrice + (pt1.price - ghostPrice) * level.value
              const levelY = series.priceToCoordinate(levelPrice)
              if (levelY === null || levelY < 0 || levelY > H) continue
              const isAnchor = level.value === 0 || level.value === 1
              ctx.strokeStyle = ghost.color
              ctx.lineWidth = isAnchor ? 1.5 : 1
              if (isAnchor) ctx.setLineDash([2, 2])
              else ctx.setLineDash([4, 4])
              ctx.beginPath()
              ctx.moveTo(leftX, levelY)
              ctx.lineTo(rightX, levelY)
              ctx.stroke()
              ctx.setLineDash([])
            }
          }
        }
        ctx.restore()
      }
    }

    // ── Fib hover/drag (post-creation interaction) ─────────────────────────
    const fibDrag = fibDragStateRef.current
    const mouseX = lastMouseXRef.current
    const mouseY = lastMouseYRef.current
    const fpaneW = W - PRICE_AXIS_W

    // Hit detection — only when no drawing tool is active and no ghost in progress
    if (!drawingToolRef.current && !drawingInProgressRef.current && mouseX >= 0 && mouseX <= fpaneW && mouseY >= 0 && mouseY <= H && !fibDrag) {
      let bestHover: typeof fibHoverRef.current = null
      let bestDist = Infinity
      const fSettings = fibSettingsRef.current

      for (let di = 0; di < drawingsRef.current.length; di++) {
        const d = drawingsRef.current[di]
        if (d.type !== 'fib' || d.points.length < 2) continue
        if (d.points[0].price === d.points[1].price) continue

        const x1 = chart.timeScale().timeToCoordinate(d.points[0].time as unknown as Time)
        const x2 = chart.timeScale().timeToCoordinate(d.points[1].time as unknown as Time)
        const y1 = series.priceToCoordinate(d.points[0].price)
        const y2 = series.priceToCoordinate(d.points[1].price)
        if (x1 === null || x2 === null || y1 === null || y2 === null) continue

        // Check anchor points first (closer threshold = higher priority)
        const d1 = Math.hypot(mouseX - x1, mouseY - y1)
        const d2 = Math.hypot(mouseX - x2, mouseY - y2)
        if (d1 < HIT_ANCHOR && d1 < bestDist) {
          bestHover = { drawingId: d.id, anchor: 'anchor1' }
          bestDist = d1
        }
        if (d2 < HIT_ANCHOR && d2 < bestDist) {
          bestHover = { drawingId: d.id, anchor: 'anchor2' }
          bestDist = d2
        }
        // Left end of diagonal (100% level startTime)
        {
          const idx100 = fSettings.levels.findIndex(l => l.value === 1)
          if (idx100 >= 0) {
            const lt100 = d.fibLevelTimes?.[idx100]
            const lx = lt100 ? (chart.timeScale().timeToCoordinate(lt100.startTime as unknown as Time) ?? x1) : Math.min(x1, x2)
            const dl = Math.hypot(mouseX - lx, mouseY - y1)
            if (dl < HIT_ANCHOR && dl < bestDist) {
              bestHover = { drawingId: d.id, anchor: 'diagLeft' }
              bestDist = dl
            }
          }
        }
        // Right end of diagonal (0% level endTime) — override 40-candle limit
        {
          const idx0 = fSettings.levels.findIndex(l => l.value === 0)
          if (idx0 >= 0) {
            const lt0 = d.fibLevelTimes?.[idx0]
            const rx = lt0 ? (chart.timeScale().timeToCoordinate(lt0.endTime as unknown as Time) ?? x2) : Math.max(x1, x2)
            const dr = Math.hypot(mouseX - rx, mouseY - y2)
            if (dr < HIT_ANCHOR && dr < bestDist) {
              bestHover = { drawingId: d.id, anchor: 'diagRight' }
              bestDist = dr
            }
          }
        }
        // Diagonal line hit check (only if no anchor is closer)
        const dd = distanceToSegment(mouseX, mouseY, x1, y1, x2, y2)
        if (dd < HIT_DIAGONAL && dd < bestDist) {
          bestHover = { drawingId: d.id, anchor: 'diagonal' }
          bestDist = dd
        }
      }
      fibHoverRef.current = bestHover
    } else if (fibDrag || drawingToolRef.current) {
      fibHoverRef.current = null
    }

    // Render highlight / dragged fib
    {
      const hover = fibHoverRef.current
      const draggedFibIdx = fibDrag ? fibDrag.drawingIndex : -1

      for (let di = 0; di < drawingsRef.current.length; di++) {
        const d = drawingsRef.current[di]
        if (d.type !== 'fib' || d.points.length < 2) continue

        const isDragged = di === draggedFibIdx
        const isHovered = hover && hover.drawingId === d.id
        if (!isDragged && !isHovered) continue

        let p1 = { ...d.points[0] }
        let p2 = { ...d.points[1] }
        let dragDTime = 0
        let dragDPrice = 0
        if (isDragged && fibDrag) {
          if (fibDrag.anchor === 'diagonal') {
            dragDTime = (mouseX >= 0 ? ((chart.timeScale().coordinateToTime(mouseX) as unknown as number) ?? fibDrag.clickTime) : fibDrag.clickTime) - fibDrag.clickTime
            dragDPrice = (series.coordinateToPrice(mouseY) ?? 0) - fibDrag.clickPrice
            p1.time = fibDrag.origPoints[0].time + dragDTime
            p1.price = fibDrag.origPoints[0].price + dragDPrice
            p2.time = fibDrag.origPoints[1].time + dragDTime
            p2.price = fibDrag.origPoints[1].price + dragDPrice
          } else if (fibDrag.anchor === 'diagLeft') {
            dragDTime = (mouseX >= 0 ? ((chart.timeScale().coordinateToTime(mouseX) as unknown as number) ?? fibDrag.clickTime) : fibDrag.clickTime) - fibDrag.clickTime
            dragDPrice = (series.coordinateToPrice(mouseY) ?? 0) - fibDrag.clickPrice
            p1.time = fibDrag.origPoints[0].time + dragDTime
            p1.price = fibDrag.origPoints[0].price + dragDPrice
          } else if (fibDrag.anchor === 'diagRight') {
            dragDTime = (mouseX >= 0 ? ((chart.timeScale().coordinateToTime(mouseX) as unknown as number) ?? fibDrag.clickTime) : fibDrag.clickTime) - fibDrag.clickTime
            dragDPrice = (series.coordinateToPrice(mouseY) ?? 0) - fibDrag.clickPrice
            p2.time = fibDrag.origPoints[1].time + dragDTime
            p2.price = fibDrag.origPoints[1].price + dragDPrice
          } else {
            const idx = fibDrag.anchor === 'anchor1' ? 0 : 1
            const rt = mouseX >= 0 ? (chart.timeScale().coordinateToTime(mouseX) as unknown as number) : null
            const rp = series.coordinateToPrice(mouseY)
            if (idx === 0) { if (rt !== null) p1.time = rt; if (rp !== null) p1.price = rp }
            else { if (rt !== null) p2.time = rt; if (rp !== null) p2.price = rp }
          }
        }

        if (p1.price === p2.price) continue
        const fx1 = chart.timeScale().timeToCoordinate(p1.time as unknown as Time)
        const fx2 = chart.timeScale().timeToCoordinate(p2.time as unknown as Time)
        const fy1 = series.priceToCoordinate(p1.price)
        const fy2 = series.priceToCoordinate(p2.price)
        if (fx1 === null || fx2 === null || fy1 === null || fy2 === null) continue

        const fSettings = fibSettingsRef.current
        const color = isDragged ? d.color : d.color + 'cc'
        const alpha = isDragged ? '44' : ''

        // Diagonal line
        {
          let idx100 = -1, idx0 = -1
          for (let li = 0; li < fSettings.levels.length; li++) {
            if (fSettings.levels[li].value === 1) idx100 = li
            if (fSettings.levels[li].value === 0) idx0 = li
          }
          let dfx1 = fx1, dfx2 = fx2
          if (idx100 >= 0) {
            let lt = d.fibLevelTimes?.[idx100]
            if (isDragged && fibDrag && fibDrag.anchor === 'diagonal' && lt)
              dfx1 = chart.timeScale().timeToCoordinate((lt.startTime + dragDTime) as unknown as Time) ?? fx1
            else if (isDragged && fibDrag && fibDrag.anchor === 'diagLeft' && lt)
              dfx1 = chart.timeScale().timeToCoordinate((lt.startTime + dragDTime) as unknown as Time) ?? fx1
            else if (lt)
              dfx1 = chart.timeScale().timeToCoordinate(lt.startTime as unknown as Time) ?? fx1
          }
          if (idx0 >= 0) {
            let lt = d.fibLevelTimes?.[idx0]
            if (isDragged && fibDrag && fibDrag.anchor === 'diagonal' && lt)
              dfx2 = chart.timeScale().timeToCoordinate((lt.endTime + dragDTime) as unknown as Time) ?? fx2
            else if (isDragged && fibDrag && fibDrag.anchor === 'diagRight' && lt)
              dfx2 = chart.timeScale().timeToCoordinate((lt.endTime + dragDTime) as unknown as Time) ?? fx2
            else if (lt)
              dfx2 = chart.timeScale().timeToCoordinate(lt.endTime as unknown as Time) ?? fx2
          }
          ctx.strokeStyle = color
          ctx.lineWidth = isHovered && !isDragged ? 3 : 1.5
          ctx.setLineDash(isDragged ? [5, 3] : (isHovered ? [] : [4, 4]))
          ctx.beginPath()
          ctx.moveTo(dfx1, fy1)
          ctx.lineTo(dfx2, fy2)
          ctx.stroke()
          ctx.setLineDash([])
        }

        // Anchor circles
        if (isHovered) {
          const hAnchor = hover?.anchor
          ctx.fillStyle = color
          if (!hAnchor || hAnchor === 'anchor1') {
            ctx.beginPath()
            ctx.arc(fx1, fy1, 5, 0, Math.PI * 2)
            ctx.fill()
          }
          if (!hAnchor || hAnchor === 'anchor2') {
            ctx.beginPath()
            ctx.arc(fx2, fy2, 5, 0, Math.PI * 2)
            ctx.fill()
          }
          // diagLeft handle at 100% level startTime
          if (hAnchor === 'diagLeft') {
            const idx100 = fSettings.levels.findIndex(l => l.value === 1)
            if (idx100 >= 0) {
              const lt100 = d.fibLevelTimes?.[idx100]
              const lx = lt100 ? chart.timeScale().timeToCoordinate(lt100.startTime as unknown as Time) : fx1
              if (lx !== null) {
                ctx.fillStyle = color
                ctx.fillRect(lx - 4, fy1 - 4, 8, 8)
              }
            }
          }
          // diagRight handle at 0% level endTime
          if (hAnchor === 'diagRight') {
            const idx0 = fSettings.levels.findIndex(l => l.value === 0)
            if (idx0 >= 0) {
              const lt0 = d.fibLevelTimes?.[idx0]
              const rx = lt0 ? chart.timeScale().timeToCoordinate(lt0.endTime as unknown as Time) : fx2
              if (rx !== null) {
                ctx.fillStyle = color
                ctx.fillRect(rx - 4, fy2 - 4, 8, 8)
              }
            }
          }
        }

        // Levels (only for dragged fib)
        if (isDragged) {
          const anchorMinX = Math.min(fx1, fx2)
          const anchorMaxX = fSettings.extendLines ? fpaneW : Math.max(fx1, fx2)
          for (let li = 0; li < fSettings.levels.length; li++) {
            const level = fSettings.levels[li]
            if (!level.visible) continue
            const levelPrice = p2.price + (p1.price - p2.price) * level.value
            const levelY = series.priceToCoordinate(levelPrice)
            if (levelY === null || levelY < 0 || levelY > H) continue
            const isAnchor = level.value === 0 || level.value === 1
            ctx.strokeStyle = color
            ctx.lineWidth = isAnchor ? 1.5 : 1
            ctx.setLineDash(isAnchor ? [2, 2] : [4, 4])
            const lt = d.fibLevelTimes?.[li]
            let lx1 = lt ? chart.timeScale().timeToCoordinate(lt.startTime as unknown as Time) : anchorMinX
            let lx2 = lt ? chart.timeScale().timeToCoordinate(lt.endTime as unknown as Time) : anchorMaxX
            if (fibDrag && fibDrag.anchor === 'diagonal' && lt) {
              lx1 = chart.timeScale().timeToCoordinate((lt.startTime + dragDTime) as unknown as Time) ?? lx1
              lx2 = chart.timeScale().timeToCoordinate((lt.endTime + dragDTime) as unknown as Time) ?? lx2
            } else if (fibDrag && fibDrag.anchor === 'diagLeft' && lt) {
              lx1 = chart.timeScale().timeToCoordinate((lt.startTime + dragDTime) as unknown as Time) ?? lx1
            } else if (fibDrag && fibDrag.anchor === 'diagRight' && lt) {
              lx2 = chart.timeScale().timeToCoordinate((lt.endTime + dragDTime) as unknown as Time) ?? lx2
            }
            if (lx1 !== null && lx2 !== null) {
              ctx.beginPath()
              ctx.moveTo(lx1, levelY)
              ctx.lineTo(lx2, levelY)
              ctx.stroke()
            }
            ctx.setLineDash([])
          }
        }

        // Cursor style (update on hover)
        if (isHovered && !isDragged) {
          if (wrapperRef.current) wrapperRef.current.style.cursor = 'grab'
        }
      }

      // Reset cursor if not hovering
      if (!hover && !fibDrag && !drawingToolRef.current) {
        if (wrapperRef.current) wrapperRef.current.style.cursor = ''
      }
    }

    const range = chart.timeScale().getVisibleRange()
    if (!range) return   // nothing to draw on the interactive layer either

    {
      const paneW = W - PRICE_AXIS_W

      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, paneW, H)
      ctx.clip()

      // ── Draw trigger arrows + price lines ─────────────────────────────────
      //
      // For each visible trigger we draw a triangle arrow at the detection bar:
      //   • BUY  → green ▲ arrow just below the bar's low at that timestamp
      //   • SELL → red   ▼ arrow just above the bar's high at that timestamp
      //
      // Entry price line is drawn only when the trigger is:
      //   • selected in the Triggers panel (selectedTriggerIdxRef), OR
      //   • the cursor is within HOVER_RADIUS pixels of the arrow (hoveredTriggerIdxRef)
      //
      // Lines are time-bounded: they start at the detection bar and extend
      // forward by 12 bars (bar duration depends on the trigger's timeframe).
      //
      const HOVER_RADIUS = 12   // pixels — how close the cursor must be to count as a hover
      const ARROW_SIZE = 7    // half-width of the triangle in pixels
      const ARROW_OFFSET = 10  // distance from the bar high/low to the arrow tip

      // How far forward each timeframe's entry line extends (in seconds).
      // Each extends by 12 bars of the respective timeframe duration.
      const LINE_DURATION_SECS: Record<string, number> = {
        'M5': 12 * 300,
        'M15': 12 * 900,
        'H1': 12 * 3600,
        'H4': 12 * 14400,
      }

      const triggers = triggersRef.current

      // --- Pass 1: compute each arrow's X pixel and update hover state -----
      // We need to do this every frame because the user may be scrolling.
      let newHovered = -1

      const arrowXCache: number[] = []   // arrowXCache[ti] = pixel X of opp ti's arrow

      for (let ti = 0; ti < triggers.length; ti++) {
        const tr = triggers[ti]
        // An opportunity's arrow is drawn when ANY of these are true:
        //   1. Global filter: "Show All" is on AND passes direction + system filters
        //   2. The user pinned this row via the VIS toggle in the bottom panel
        //   3. The row is currently selected (clicked) in the bottom panel
        //      → guarantees the arrow is always visible when a row is selected,
        //        even if "Show All" is off in the Toolbox.
        const isVisible = (
          (showTriggersRef.current &&
            (tr.dir === 'buy' ? showBuyRef.current : showSellRef.current) &&
            (tr.timeframe === 'M1' ? showM1Ref.current :
             tr.timeframe === 'M5' ? showM5Ref.current :
             tr.timeframe === 'M15' ? showM15Ref.current :
             tr.timeframe === 'H1' ? showH1Ref.current :
             tr.timeframe === 'H4' ? showH4Ref.current : true)) ||
          pinnedTriggersRef.current.has(ti) ||
          ti === selectedTriggerIdxRef.current
        )
        if (!isVisible) { arrowXCache.push(-1); continue }
        const detectionTs = Math.floor(new Date(tr.datetime).getTime() / 1000)
        // Snap to the nearest loaded bar before calling timeToCoordinate.
        // LWC returns null for timestamps that don't exactly match a loaded bar
        // (e.g. an M15 timestamp when the chart is on D1).
        const snappedTs = snapToBarTime(detectionTs, barsRef.current)
        const arrowX = chart.timeScale().timeToCoordinate(snappedTs as unknown as Time)
        arrowXCache.push(arrowX ?? -1)

        // Hover: is the cursor within HOVER_RADIUS px of this arrow's X?
        if (arrowX !== null) {
          const dx = Math.abs(lastMouseXRef.current - arrowX)
          if (dx <= HOVER_RADIUS && (newHovered === -1 || dx < Math.abs(lastMouseXRef.current - arrowXCache[newHovered]))) {
            newHovered = ti
          }
        }
      }
      hoveredTriggerIdxRef.current = newHovered

      // --- Pass 2: draw arrows and (if selected/hovered) price lines -------
      for (let ti = 0; ti < triggers.length; ti++) {
        if (arrowXCache[ti] < 0) continue
        const tr = triggers[ti]
        const arrowX = arrowXCache[ti]
        if (arrowX < 0 || arrowX > paneW) continue   // arrow is off-screen

        const isBuy = tr.dir === 'buy'
        const entryColor = isBuy ? theme.colors.chart.up : theme.colors.chart.down
        const detectionTs = Math.floor(new Date(tr.datetime).getTime() / 1000)

        // Find the matching bar in barsRef to get the bar's high/low for arrow Y.
        // Binary search: find the bar whose time is closest to detectionTs.
        let arrowBarY: number | null = null
        const bars = barsRef.current
        if (bars.length > 0) {
          let lo = 0, hi = bars.length - 1
          while (lo < hi - 1) {
            const mid = (lo + hi) >> 1
            if (bars[mid].time <= detectionTs) lo = mid
            else hi = mid
          }
          const bar = bars[lo]
          // Place the arrow tip at the bar's low (buy) or high (sell), offset outward
          const priceForArrow = isBuy ? bar.low : bar.high
          const coordForArrow = series.priceToCoordinate(priceForArrow)
          if (coordForArrow !== null) {
            arrowBarY = isBuy
              ? coordForArrow + ARROW_OFFSET   // below the bar → positive Y
              : coordForArrow - ARROW_OFFSET   // above the bar → negative Y
          }
        }

        // Fallback: if bar not found (not loaded), place arrow at mid-chart height
        if (arrowBarY === null) arrowBarY = H * 0.5

        // Draw the trigger marker (triangle for trigger, square for post_trigger)
        const isActive = (ti === selectedTriggerIdxRef.current || ti === hoveredTriggerIdxRef.current)
        ctx.fillStyle = isActive ? entryColor : entryColor + 'aa'   // dimmer when inactive
        const isPostTrigger = tr.row_type === 'post_trigger'
        if (isPostTrigger) {
          const sq = ARROW_SIZE * 1.3
          ctx.fillRect(arrowX - sq, arrowBarY - sq, sq * 2, sq * 2)
        } else {
          ctx.beginPath()
          if (isBuy) {
            // ▲ pointing up: tip at arrowBarY, base at arrowBarY + ARROW_SIZE*1.5
            ctx.moveTo(arrowX, arrowBarY)
            ctx.lineTo(arrowX - ARROW_SIZE, arrowBarY + ARROW_SIZE * 1.5)
            ctx.lineTo(arrowX + ARROW_SIZE, arrowBarY + ARROW_SIZE * 1.5)
          } else {
            // ▼ pointing down: tip at arrowBarY, base at arrowBarY - ARROW_SIZE*1.5
            ctx.moveTo(arrowX, arrowBarY)
            ctx.lineTo(arrowX - ARROW_SIZE, arrowBarY - ARROW_SIZE * 1.5)
            ctx.lineTo(arrowX + ARROW_SIZE, arrowBarY - ARROW_SIZE * 1.5)
          }
          ctx.closePath()
          ctx.fill()
        }

        // Only draw price lines when this trade is selected or hovered
        if (!isActive) continue

        // Compute the end timestamp for the lines (detection time + forward window)
        const lineDuration = LINE_DURATION_SECS[tr.timeframe] ?? 7 * 86400
        const lineEndTs = detectionTs + lineDuration

        const lineStartX = arrowX   // lines start exactly at the arrow
        // Snap the end timestamp too — same reason as the arrow X above.
        const snappedEndTs = snapToBarTime(lineEndTs, barsRef.current)
        const lineEndX = chart.timeScale().timeToCoordinate(snappedEndTs as unknown as Time)
          ?? paneW   // if the end date is off-screen to the right, clip to edge

        const entryY = series.priceToCoordinate(tr.entry)

        ctx.font = `9px ${theme.fonts.mono}`

        // Entry line — solid
        if (entryY !== null && entryY >= 0 && entryY <= H) {
          ctx.strokeStyle = entryColor
          ctx.lineWidth = 1.5
          ctx.setLineDash([])
          ctx.beginPath()
          ctx.moveTo(lineStartX, entryY)
          ctx.lineTo(Math.min(lineEndX, paneW), entryY)
          ctx.stroke()
          ctx.fillStyle = entryColor
          ctx.fillText(`E ${tr.entry.toFixed(5)}`, lineStartX + 4, entryY - 3)
        }

        ctx.setLineDash([])
      }

      ctx.restore()

      // ── Draw highlight arrow (cross-chart navigate marker) ──────────────────
      const hl = highlightMarkerRef.current
      if (hl && Date.now() < hl.expiresAt) {
        const hlSnapTs = snapToBarTime(hl.ts, barsRef.current)
        const hlX = chart.timeScale().timeToCoordinate(hlSnapTs as unknown as Time)
        if (hlX !== null && hlX >= 0 && hlX <= paneW) {
          let hlY = H * 0.5
          const hlBars = barsRef.current
          if (hlBars.length > 0) {
            let lo = 0, hi = hlBars.length - 1
            while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (hlBars[mid].time <= hlSnapTs) lo = mid; else hi = mid }
            const bar = hlBars[lo]
            const coord = series.priceToCoordinate(bar.high)
            if (coord !== null) hlY = coord - 14
          }
          const remain = Math.max(0, hl.expiresAt - Date.now()) / 5000
          const alpha = 0.6 + 0.4 * remain
          const hlColor = `rgba(88,166,255,${alpha.toFixed(2)})`

          ctx.save()
          ctx.strokeStyle = hlColor
          ctx.fillStyle = hlColor
          ctx.lineWidth = 2

          const ARROW_H = 10, ARROW_HW = 7
          ctx.beginPath()
          ctx.moveTo(hlX, hlY - ARROW_H)
          ctx.lineTo(hlX - ARROW_HW, hlY)
          ctx.lineTo(hlX + ARROW_HW, hlY)
          ctx.closePath()
          ctx.fill()

          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.moveTo(hlX, hlY)
          ctx.lineTo(hlX, hlY + 30)
          ctx.stroke()
          ctx.setLineDash([])

          ctx.restore()
          fgDirtyRef.current = true
        }
      }
    }

    // ── Sync crosshair from other chart instances (vertical + horizontal) ────────
    // Drawn outside the clipping region above so it spans the full canvas.
    const syncTime = syncCrosshairTimeRef.current
    const syncPrice = syncCrosshairPriceRef.current
    if (syncTime !== null) {
      const snappedSyncTime = barsRef.current.length > 0 ? snapToBarTime(syncTime, barsRef.current) : syncTime
      const syncX = chart.timeScale().timeToCoordinate(snappedSyncTime as unknown as Time)
      if (syncX !== null && syncX >= 0 && syncX <= W - PRICE_AXIS_W) {
        ctx.save()
        ctx.strokeStyle = 'rgba(88,166,255,0.8)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([3, 3])
        // Vertical line
        ctx.beginPath()
        ctx.moveTo(syncX, 0)
        ctx.lineTo(syncX, H)
        ctx.stroke()
        // Horizontal line (uses source chart's price converted to this chart's Y)
        if (syncPrice !== null) {
          const syncY = series.priceToCoordinate(syncPrice)
          if (syncY !== null && syncY >= 0 && syncY <= H) {
            ctx.beginPath()
            ctx.moveTo(0, syncY)
            ctx.lineTo(W - PRICE_AXIS_W, syncY)
            ctx.stroke()
          }
        }
        ctx.setLineDash([])
        ctx.restore()
      }
    }

  }, [])  // [] — only reads refs; won't trigger chart re-initialization on TF change

  // ── Initialize LWC chart + start rAF draw loop ────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    // Use the persisted settings captured at mount time so the chart is created
    // with the user's colors immediately. The settings useEffect (which calls
    // applyOptions) would be a no-op before the chart exists, so we read the
    // value directly here. chartState.settings is already loaded from localStorage
    // via PersistenceManager.load() before this effect runs.
    const chart = createChart(containerRef.current, {
      layout: { background: { color: initSettings.chartBg }, textColor: theme.colors.chart.axisText },
      grid: { vertLines: { color: initSettings.gridColor, visible: initSettings.gridVisible }, horzLines: { color: initSettings.gridColor, visible: initSettings.gridVisible } },
      timeScale: { timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },  // free cursor — no bar snapping
    })
    chartRef.current = chart

    const priceFormat = { type: 'price' as const, precision: 5, minMove: 0.00001 }

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: initSettings.candleUp,
      downColor: initSettings.candleDown,
      borderUpColor: initSettings.candleUp,
      borderDownColor: initSettings.candleDown,
      wickUpColor: initSettings.candleUp,
      wickDownColor: initSettings.candleDown,
      priceFormat,
    })
    candleRef.current = candles

    // BB% sub-pane — three series in LWC pane 1 (pane auto-created).
    // Render order back→front: green zone, red zone, BB% line.
    // BB sub-pane series are created lazily in the BB fetch effect (when a BB
    // dataset folder is selected and the TF is M15 or M5).  They are removed
    // via chart.removeSeries() when hidden so LWC auto-removes the empty pane.

    // Resize all canvases + chart when the wrapper div changes size.
    // bgCanvas must be resized alongside overlayCanvas — otherwise the blit
    // (ctx.drawImage) would scale the background to the wrong dimensions.
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect
        chart.resize(width, height)
        if (overlayRef.current) {
          overlayRef.current.width = Math.floor(width)
          overlayRef.current.height = Math.floor(height)
        }
        if (bgCanvasRef.current) {
          bgCanvasRef.current.width = Math.floor(width)
          bgCanvasRef.current.height = Math.floor(height)
        }
        bgDirtyRef.current = true   // canvas resized → redraw background at new size
      }
    })
    if (wrapperRef.current) {
      ro.observe(wrapperRef.current)
      if (overlayRef.current) {
        overlayRef.current.width = wrapperRef.current.clientWidth
        overlayRef.current.height = wrapperRef.current.clientHeight
      }
    }

    // Create the off-screen background canvas (same size as the overlay).
    // Trends/levels are drawn here; blitted to overlay each fg frame.
    const bgCanvas = document.createElement('canvas')
    bgCanvas.width = wrapperRef.current?.clientWidth ?? 0
    bgCanvas.height = wrapperRef.current?.clientHeight ?? 0
    bgCanvasRef.current = bgCanvas

    // Start the 60 FPS overlay draw loop
    const loop = () => { drawOverlay(); animRef.current = requestAnimationFrame(loop) }
    animRef.current = requestAnimationFrame(loop)

    // Lazy load: fires when user scrolls within 10 bars of the left edge.
    // The throttle inside loadOlderChunk (150 ms) prevents flood of requests.
    // bgDirty is set here because scroll/zoom changes which bars are visible,
    // so the background layer (trend rects, level lines) must be repositioned.
    chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (range && range.from < 10) loadOlderChunk()
      bgDirtyRef.current = true   // scroll/zoom → background positions changed
    })

    // Tooltip: update the fixed info panel by writing directly to DOM nodes.
    // This avoids a React setState + full re-render on every crosshair move
    // (which was the main source of CPU usage on fast panning / scrolling).
    // ── Cross-chart crosshair sync listener ──────────────────────────────────
    const handleSyncCrosshair = (e: Event) => {
      const { time, price, chartId: srcId } = (e as CustomEvent<{ time: number | null; price: number | null; chartId: string }>).detail
      if (srcId === chartId) return   // ignore own broadcast
      syncCrosshairPriceRef.current = price
      fgDirtyRef.current = true

      // Also update the OHLC tooltip so all synced charts show the same candle data
      const el = tooltipElRef.current
      if (!el) { syncCrosshairTimeRef.current = time; return }
      if (time === null) { syncCrosshairTimeRef.current = null; el.style.display = 'none'; hideIndicatorStrip(); return }

      // Snap source-TF timestamp to the nearest bar in this chart's TF
      const bars = barsRef.current
      if (bars.length === 0) { syncCrosshairTimeRef.current = time; el.style.display = 'none'; hideIndicatorStrip(); return }
      const snappedTime = snapToBarTime(time, bars)
      syncCrosshairTimeRef.current = snappedTime

      // Find the bar at the snapped timestamp (always succeeds)
      let lo = 0, hi = bars.length - 1, bar: OHLCVBar | null = null
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (bars[mid].time === snappedTime) { bar = bars[mid]; break }
        else if (bars[mid].time < snappedTime) lo = mid + 1
        else hi = mid - 1
      }
      if (!bar) { el.style.display = 'none'; hideIndicatorStrip(); return }

      const fmt5 = (n: number) => n.toFixed(5)
      const iso = new Date(snappedTime * 1000).toISOString()
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      if (tooltipDateRef.current) tooltipDateRef.current.textContent = `${iso.slice(8,10)} ${months[parseInt(iso.slice(5,7),10)-1]} ${iso.slice(0,4)}  ${iso.slice(11,16)}`
      if (tooltipORef.current) tooltipORef.current.textContent = fmt5(bar.open)
      if (tooltipHRef.current) tooltipHRef.current.textContent = fmt5(bar.high)
      if (tooltipLRef.current) tooltipLRef.current.textContent = fmt5(bar.low)
      if (tooltipCRef.current) {
        tooltipCRef.current.textContent = fmt5(bar.close)
        tooltipCRef.current.style.color = bar.close >= bar.open ? theme.colors.chart.up : theme.colors.chart.down
      }
      const barRange = bar.high - bar.low
      const safeRange = barRange === 0 ? 1 : barRange
      const UW = ((bar.high - Math.max(bar.open, bar.close)) / safeRange) * 100
      const LW = ((Math.min(bar.open, bar.close) - bar.low) / safeRange) * 100
      const Body = (Math.abs(bar.open - bar.close) / safeRange) * 100
      if (tooltipUWRef.current) tooltipUWRef.current.textContent = UW.toFixed(2) + '%'
      if (tooltipBDRef.current) tooltipBDRef.current.textContent = Body.toFixed(2) + '%'
      if (tooltipLWRef.current) tooltipLWRef.current.textContent = LW.toFixed(2) + '%'
      if (tooltipBBRowRef.current) tooltipBBRowRef.current.style.display = 'none'
      hideIndicatorStrip()
      el.style.display = ''
    }
    window.addEventListener('apollo:crosshair', handleSyncCrosshair)

    chart.subscribeCrosshairMove(param => {
      const el = tooltipElRef.current
      if (!el) return

      if (!param.time || !param.point) {
        window.dispatchEvent(new CustomEvent('apollo:crosshair', { detail: { time: null, price: null, chartId } }))
        hideIndicatorStrip()
        el.style.display = 'none'; return
      }
      const raw = param.seriesData.get(candles) as any
      if (!raw) { hideIndicatorStrip(); el.style.display = 'none'; return }

      const ts = param.time as unknown as number

      // ── Date line ──────────────────────────────────────────────────────────
      if (tooltipDateRef.current) {
        const iso = new Date(ts * 1000).toISOString()
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const day   = iso.slice(8,  10)
        const mon   = months[parseInt(iso.slice(5, 7), 10) - 1]
        const year  = iso.slice(0,  4)
        const time  = iso.slice(11, 16)
        tooltipDateRef.current.textContent = `${day} ${mon} ${year}  ${time}`
      }

      // ── OHLC ───────────────────────────────────────────────────────────────
      const fmt5 = (n: number) => n.toFixed(5)
      if (tooltipORef.current) tooltipORef.current.textContent = fmt5(raw.open)
      if (tooltipHRef.current) tooltipHRef.current.textContent = fmt5(raw.high)
      if (tooltipLRef.current) tooltipLRef.current.textContent = fmt5(raw.low)
      if (tooltipCRef.current) {
        tooltipCRef.current.textContent = fmt5(raw.close)
        tooltipCRef.current.style.color = raw.close >= raw.open ? theme.colors.chart.up : theme.colors.chart.down
      }

      // ── WMF (wick / body / wick ratios) ────────────────────────────────────
      const barRange = raw.high - raw.low
      const safeRange = barRange === 0 ? 1 : barRange
      const UW = ((raw.high - Math.max(raw.open, raw.close)) / safeRange) * 100
      const LW = ((Math.min(raw.open, raw.close) - raw.low) / safeRange) * 100
      const Body = (Math.abs(raw.open - raw.close) / safeRange) * 100
      if (tooltipUWRef.current) tooltipUWRef.current.textContent = UW.toFixed(2) + '%'
      if (tooltipBDRef.current) tooltipBDRef.current.textContent = Body.toFixed(2) + '%'
      if (tooltipLWRef.current) tooltipLWRef.current.textContent = LW.toFixed(2) + '%'

      // Optional legacy pane stays absent without an admitted configuration.
      const bbPct = BB_TF_CONFIG[tfRef.current]
        ? findNearestBBPct(ts, bbPointsRef.current)
        : null
      if (tooltipBBRowRef.current) {
        tooltipBBRowRef.current.style.display = bbPct !== null ? '' : 'none'
      }
      if (tooltipBBValRef.current && bbPct !== null) {
        tooltipBBValRef.current.textContent = bbPct.toFixed(3)
        tooltipBBValRef.current.style.color = bbPct < 0 ? theme.colors.chart.up : bbPct > 1 ? theme.colors.chart.down : theme.colors.text.dimmer
      }
      if (bbPaneLabelRef.current) {
        if (bbPct !== null && BB_TF_CONFIG[tfRef.current]) {
          bbPaneLabelRef.current.textContent = `BB% : ${bbPct.toFixed(2)}`
          bbPaneLabelRef.current.style.color = bbPct < 0 ? theme.colors.chart.up : bbPct > 1 ? theme.colors.chart.down : theme.colors.text.dimmer
          bbPaneLabelRef.current.style.display = ''
        } else {
          bbPaneLabelRef.current.style.display = 'none'
        }
      }

      renderIndicatorStrip(ts, param.point.y)

      // Broadcast this chart's crosshair time + price so other slots can sync
      const syncPrice = candles.coordinateToPrice(param.point.y)
      window.dispatchEvent(new CustomEvent('apollo:crosshair', { detail: { time: ts, price: syncPrice, chartId } }))

      el.style.display = ''   // make the panel visible
    })

    // Track the raw mouse X pixel inside the chart wrapper.
    // drawOverlay reads this every frame to detect which trade arrow the cursor
    // is near (hover detection). We don't use the crosshair for this because
    // LWC's crosshair snaps to bar centres, but we need pixel-exact X for arrows.
    const onMouseMove = (e: MouseEvent) => {
      if (!wrapperRef.current) return
      const rect = wrapperRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      lastMouseXRef.current = x
      lastMouseYRef.current = y
      // Update ghost position if a drawing is in progress
      if (drawingInProgressRef.current) {
        drawingGhostRef.current = { x, y }
      }
      // Fib drag: set bgDirty on each move so the fg layer handles rendering
      if (fibDragStateRef.current) bgDirtyRef.current = true
      fgDirtyRef.current = true
    }
    const onMouseLeave = () => {
      lastMouseXRef.current = -1
      lastMouseYRef.current = -1
      hideIndicatorStrip()
      fgDirtyRef.current = true
    }

    const onMouseDown = (e: MouseEvent) => {
      const tool = drawingToolRef.current
      if (!tool) {
        // Check if clicking on an existing fib to start drag
        const hover = fibHoverRef.current
        if (hover) {
          const di = drawingsRef.current.findIndex(d => d.id === hover.drawingId)
          if (di >= 0) {
            e.stopPropagation()
            if (!wrapperRef.current) return
            const rect = wrapperRef.current.getBoundingClientRect()
            const px = e.clientX - rect.left
            const py = e.clientY - rect.top
            const rt = chart.timeScale().coordinateToTime(px) as unknown as number
            const rp = candles.coordinateToPrice(py)
            if (rt !== null && rp !== null) {
              const d = drawingsRef.current[di]
              const origLevelTimes = d.fibLevelTimes ? Object.fromEntries(Object.entries(d.fibLevelTimes).map(([k, v]) => [k, { startTime: v.startTime, endTime: v.endTime }])) : null
              fibDragStateRef.current = {
                drawingId: hover.drawingId,
                anchor: hover.anchor,
                origPoints: d.points.map(p => ({ time: p.time, price: p.price })),
                clickTime: rt,
                clickPrice: rp,
                drawingIndex: di,
                origLevelTimes,
              }
              drawingToolRef.current = null
              bgDirtyRef.current = true
              fgDirtyRef.current = true
            }
          }
          return
        }
        return
      }
      if (!wrapperRef.current) return
      const rect = wrapperRef.current.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const rawTime = chart.timeScale().coordinateToTime(px)
      const price = candles.coordinateToPrice(py)
      if (rawTime === null || price === null) return
      const ts = rawTime as unknown as number

      if (tool === 'measure') {
        // Don't start a new measure when clicking an overlay button (e.g. the navigate button)
        if ((e.target as HTMLElement).closest('button')) return
        e.stopPropagation()
        drawingInProgressRef.current = { id: `${Date.now()}`, type: 'measure', points: [{ time: ts, price }], color: theme.colors.accent.blue }
        drawingGhostRef.current = { x: px, y: py }
        fgDirtyRef.current = true
      } else if (tool === 'hline') {
        const d: Drawing = { id: `${Date.now()}`, type: 'hline', points: [{ time: ts, price }], color: drawingColorRef.current }
        drawingsRef.current = [...drawingsRef.current, d]
        saveDrawings(symbolRef.current, drawingsRef.current)
        bgDirtyRef.current = true
      } else if (tool === 'text') {
        window.dispatchEvent(new CustomEvent('apollo:textdraw', { detail: { time: ts, price, screenX: e.clientX, screenY: e.clientY } }))
      } else {
        // trendline / rect / fib — block LWC from seeing mousedown so it won't start panning
        e.stopPropagation()
        drawingInProgressRef.current = { id: `${Date.now()}`, type: tool, points: [{ time: ts, price }], color: drawingColorRef.current }
        drawingGhostRef.current = { x: px, y: py }
        fgDirtyRef.current = true
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      // Finalize fib drag
      const fibDrag = fibDragStateRef.current
      if (fibDrag) {
        e.stopPropagation()
        if (e.button === 2) return // right-click — let contextmenu handle deletion
        if (wrapperRef.current) {
          const rect = wrapperRef.current.getBoundingClientRect()
          const px = e.clientX - rect.left
          const py = e.clientY - rect.top
          const rt = chart.timeScale().coordinateToTime(px) as unknown as number
          const rp = candles.coordinateToPrice(py)
          const di = fibDrag.drawingIndex
          if (di >= 0 && di < drawingsRef.current.length && rt !== null && rp !== null) {
            const d = drawingsRef.current[di]
            if (fibDrag.anchor === 'diagonal') {
              // Translate entire fib
              const dTime = rt - fibDrag.clickTime
              const dPrice = rp - fibDrag.clickPrice
              d.points[0].time = fibDrag.origPoints[0].time + dTime
              d.points[0].price = fibDrag.origPoints[0].price + dPrice
              d.points[1].time = fibDrag.origPoints[1].time + dTime
              d.points[1].price = fibDrag.origPoints[1].price + dPrice
              const origLT = fibDrag.origLevelTimes
              if (origLT && d.fibLevelTimes) {
                for (const [liStr, orig] of Object.entries(origLT)) {
                  const li = Number(liStr)
                  if (d.fibLevelTimes[li]) {
                    d.fibLevelTimes[li].startTime = orig.startTime + dTime
                    d.fibLevelTimes[li].endTime = orig.endTime + dTime
                  }
                }
              }
            } else if (fibDrag.anchor === 'diagLeft') {
              // Move left anchor + shift all levelTimes.startTime
              d.points[0].time = rt
              d.points[0].price = rp
              const dTime = rt - fibDrag.clickTime
              const origLT = fibDrag.origLevelTimes
              if (origLT && d.fibLevelTimes) {
                for (const [liStr, orig] of Object.entries(origLT)) {
                  const li = Number(liStr)
                  if (d.fibLevelTimes[li]) {
                    d.fibLevelTimes[li].startTime = orig.startTime + dTime
                  }
                }
              }
            } else if (fibDrag.anchor === 'diagRight') {
              // Move right anchor + extend/shorten all levelTimes.endTime
              d.points[1].time = rt
              d.points[1].price = rp
              const dTime = rt - fibDrag.clickTime
              const origLT = fibDrag.origLevelTimes
              if (origLT && d.fibLevelTimes) {
                for (const [liStr, orig] of Object.entries(origLT)) {
                  const li = Number(liStr)
                  if (d.fibLevelTimes[li]) {
                    d.fibLevelTimes[li].endTime = orig.endTime + dTime
                  }
                }
              }
            } else {
              const idx = fibDrag.anchor === 'anchor1' ? 0 : 1
              d.points[idx].time = rt
              d.points[idx].price = rp
            }
            saveDrawings(symbolRef.current, drawingsRef.current)
          }
        }
        fibDragStateRef.current = null
        bgDirtyRef.current = true
        fgDirtyRef.current = true
        return
      }

      const ghost = drawingInProgressRef.current
      if (!ghost) return
      // Stop LWC from seeing this mouseup (it didn't get the mousedown either)
      e.stopPropagation()
      if (!wrapperRef.current) return
      const rect = wrapperRef.current.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const rawTime = chart.timeScale().coordinateToTime(px)
      const price = candles.coordinateToPrice(py)
      if (rawTime !== null && price !== null) {
        const ts = rawTime as unknown as number
        if (ghost.type === 'measure') {
          // Finalize measure in-place (not saved to drawings, stays until tool is toggled off)
          const finalized = { ...ghost, points: [ghost.points[0], { time: ts, price }] }
          drawingInProgressRef.current = finalized
          drawingGhostRef.current = null
          fgDirtyRef.current = true
          window.dispatchEvent(new CustomEvent('apollo:measurefinalized', { detail: { chartId, drawing: finalized } }))
          return
        }
        if (ghost.type === 'fib') {
          const barSecs = TF_BAR_SECS[tfRef.current] ?? 86400
          const rightTime = Math.max(ghost.points[0].time, ts) + 40 * barSecs
          const levelTimes: Record<number, FibLevelTime> = {}
          const fSettings = fibSettingsRef.current
          for (let li = 0; li < fSettings.levels.length; li++) {
            if (fSettings.levels[li].visible) {
              levelTimes[li] = { startTime: Math.min(ghost.points[0].time, ts), endTime: rightTime }
            }
          }
          const finalized: Drawing = { ...ghost, points: [ghost.points[0], { time: ts, price }], fibLevelTimes: levelTimes }
          drawingsRef.current = [...drawingsRef.current, finalized]
          saveDrawings(symbolRef.current, drawingsRef.current)
          bgDirtyRef.current = true
        } else {
          const finalized: Drawing = { ...ghost, points: [ghost.points[0], { time: ts, price }] }
          drawingsRef.current = [...drawingsRef.current, finalized]
          saveDrawings(symbolRef.current, drawingsRef.current)
          bgDirtyRef.current = true
        }
      }
      drawingInProgressRef.current = null
      drawingGhostRef.current = null
      fgDirtyRef.current = true
    }

    // Right-click in measure/fib mode exits the tool without showing the browser context menu
    const onContextMenu = (e: MouseEvent) => {
      if (drawingToolRef.current === 'measure' || drawingToolRef.current === 'fib') {
        e.preventDefault()
        drawingInProgressRef.current = null
        drawingGhostRef.current = null
        fgDirtyRef.current = true
        window.dispatchEvent(new CustomEvent('apollo:deactivate-tool', { detail: { chartId } }))
        return
      }
      // Right-click on a fib → delete it
      const fibDrag = fibDragStateRef.current
      const hover = fibHoverRef.current
      const targetId = fibDrag?.drawingId ?? hover?.drawingId
      if (targetId && !drawingInProgressRef.current) {
        e.preventDefault()
        if (fibDrag) {
          const d = drawingsRef.current[fibDrag.drawingIndex]
          if (d) {
            d.points[0].time = fibDrag.origPoints[0].time
            d.points[0].price = fibDrag.origPoints[0].price
            d.points[1].time = fibDrag.origPoints[1].time
            d.points[1].price = fibDrag.origPoints[1].price
          }
          fibDragStateRef.current = null
        }
        drawingsRef.current = drawingsRef.current.filter(d => d.id !== targetId)
        saveDrawings(symbolRef.current, drawingsRef.current)
        fibHoverRef.current = null
        bgDirtyRef.current = true
        fgDirtyRef.current = true
      }
    }

    if (wrapperRef.current) {
      wrapperRef.current.addEventListener('mousemove', onMouseMove)
      wrapperRef.current.addEventListener('mouseleave', onMouseLeave)
      // Capture phase so our handler fires before LWC's child listeners
      wrapperRef.current.addEventListener('mousedown', onMouseDown, { capture: true })
      wrapperRef.current.addEventListener('mouseup', onMouseUp, { capture: true })
      wrapperRef.current.addEventListener('contextmenu', onContextMenu)
    }

    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
      wrapperRef.current?.removeEventListener('mousemove', onMouseMove)
      wrapperRef.current?.removeEventListener('mouseleave', onMouseLeave)
      wrapperRef.current?.removeEventListener('mousedown', onMouseDown, { capture: true })
      wrapperRef.current?.removeEventListener('mouseup', onMouseUp, { capture: true })
      wrapperRef.current?.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('apollo:crosshair', handleSyncCrosshair)
      chart.remove()
      chartRef.current = null; candleRef.current = null
      bgCanvasRef.current = null; bbLineRef.current = null; bbGreenRef.current = null; bbRedRef.current = null
    }
  }, [drawOverlay, loadOlderChunk])  // both have [] deps → runs only once
}
