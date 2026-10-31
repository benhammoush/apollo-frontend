import { useCallback, useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from 'react'
import type { IChartApi } from 'lightweight-charts'
import { Time } from 'lightweight-charts'
import type { FamilyLetter, FamilySnapshot, OHLCVBar } from '../../types'
import { theme } from '../../design-system'
import { findBarsInRange, snapToBarTime } from './algorithms'
import {
  buildFamilyRowByTfYm,
  resolveFamilyForBar,
  ymForFamilyLookup,
  ymFromBarTime,
} from './familyBarResolve'
import type { FamilyTF } from './types'

/** Floated above the letter grid — same language as `ChartTooltip` BB pane label / indicator strip. */
const FAMILY_TITLE_CHIP_STYLE: CSSProperties = {
  position: 'absolute',
  left: 8,
  bottom: 'calc(100% + 6px)',
  zIndex: 16,
  pointerEvents: 'none',
  background: theme.colors.bg.overlay,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: `1px solid ${theme.colors.border.muted}`,
  borderRadius: theme.radii.md,
  padding: '4px 9px',
  fontSize: 10,
  fontFamily: theme.fonts.mono,
  fontWeight: 600,
  letterSpacing: '0.04em',
  color: theme.colors.text.axisText,
  textTransform: 'uppercase',
  boxShadow: theme.shadows.dropdown,
}

const ROW_H = 22
const GAP = 6
const LABEL_MIN_WIDTH = 2

type FamilyGlyph = 'A' | 'B' | 'C' | 'D' | '-'

interface CandleCell {
  left: number
  width: number
  buyLetter: FamilyGlyph
  sellLetter: FamilyGlyph
  buyBg: string
  sellBg: string
  bandYm: string
  lookupYm: string
}

function letterGlyph(raw: string): FamilyGlyph {
  const u = raw.trim().toUpperCase()
  return (u === 'A' || u === 'B' || u === 'C' || u === 'D') ? u : '-'
}

function letterBg(letter: FamilyGlyph, colors: Record<FamilyLetter, string>, emptyColor: string): string {
  if (letter === '-') return emptyColor
  return colors[letter]
}

function letterTextColor(
  letter: FamilyGlyph,
  side: 'buy' | 'sell',
  colors: Record<FamilyLetter, string>,
  emptyColor: string,
): string {
  if (letter === 'D') return '#6e7681'
  if (side === 'buy') {
    if (letter === 'B') return '#22c55e'
    if (letter === 'A') return '#f59e0b'
    if (letter === 'C') return '#3b82f6'
  } else {
    if (letter === 'B') return '#ef4444'
    if (letter === 'A') return '#f97316'
    if (letter === 'C') return '#a855f7'
  }
  // Fallback to user-configured letter colors if an unexpected value appears.
  if (letter !== '-') return colors[letter]
  return emptyColor
}

function parseVisibleTime(t: unknown): number | null {
  if (typeof t === 'number' && Number.isFinite(t)) return t
  if (typeof t === 'string') {
    const ms = Date.parse(t)
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : null
  }
  if (t && typeof t === 'object' && 'year' in t && 'month' in t && 'day' in t) {
    const o = t as { year: number; month: number; day: number }
    if (![o.year, o.month, o.day].every(Number.isFinite)) return null
    return Math.floor(Date.UTC(o.year, o.month - 1, o.day) / 1000)
  }
  return null
}

function visibleExtent(chart: IChartApi, barsSorted: OHLCVBar[]): { from: number; to: number } | null {
  if (barsSorted.length === 0) return null
  const vr = chart.timeScale().getVisibleRange()
  if (vr) {
    let fromSec = parseVisibleTime(vr.from)
    let toSec = parseVisibleTime(vr.to)
    if (fromSec !== null && toSec !== null) {
      if (fromSec > toSec) [fromSec, toSec] = [toSec, fromSec]
      return { from: fromSec, to: toSec }
    }
  }
  return { from: barsSorted[0].time, to: barsSorted[barsSorted.length - 1].time }
}

function computeCells(
  chart: IChartApi,
  barsSorted: OHLCVBar[],
  rowByTfYm: Map<string, FamilySnapshot>,
  selectedFamilyTF: FamilyTF,
  letterColors: Record<FamilyLetter, string>,
  emptyColor: string,
): CandleCell[] {
  const extent = visibleExtent(chart, barsSorted)
  if (!extent) return []

  const padSeconds = 7 * 86400
  const visibleBars = findBarsInRange(barsSorted, extent.from - padSeconds, extent.to + padSeconds)
  if (visibleBars.length === 0) return []

  const coords = visibleBars.map(bar => {
    const snapped = snapToBarTime(bar.time, barsSorted) as unknown as Time
    return chart.timeScale().timeToCoordinate(snapped)
  })

  const out: CandleCell[] = []
  for (let i = 0; i < visibleBars.length; i++) {
    const x = coords[i]
    if (x === null) continue

    const prevX = i > 0 ? coords[i - 1] : null
    const nextX = i + 1 < coords.length ? coords[i + 1] : null
    const leftGap = prevX !== null ? Math.max(3, x - prevX) : (nextX !== null ? Math.max(3, nextX - x) : 6)
    const rightGap = nextX !== null ? Math.max(3, nextX - x) : (prevX !== null ? Math.max(3, x - prevX) : 6)
    const left = x - leftGap / 2
    const width = Math.max(2, (leftGap + rightGap) / 2)

    const bar = visibleBars[i]
    const row = resolveFamilyForBar(rowByTfYm, bar.time, selectedFamilyTF)
    const buyLetter = letterGlyph(row?.family_buy || '')
    const sellLetter = letterGlyph(row?.family_sell || '')
    const bandYm = ymFromBarTime(bar.time)
    const lookupYm = ymForFamilyLookup(bar.time, selectedFamilyTF)

    out.push({
      left,
      width,
      buyLetter,
      sellLetter,
      buyBg: letterBg(buyLetter, letterColors, emptyColor),
      sellBg: letterBg(sellLetter, letterColors, emptyColor),
      bandYm,
      lookupYm,
    })
  }
  return out
}

interface Props {
  chartRef: MutableRefObject<IChartApi | null>
  barsRef: MutableRefObject<OHLCVBar[]>
  familyRowsRef: MutableRefObject<FamilySnapshot[]>
  selectedFamilyTF: FamilyTF
  letterColors: Record<FamilyLetter, string>
  barsVersion: number
  isLoading: boolean
  hasFamilyData: boolean
}

/** Dedicated panel under the chart: one cell per visible candle (buy/sell rows). */
export default function FamilyMonthStrip(props: Props) {
  const {
    chartRef, barsRef, familyRowsRef, selectedFamilyTF, letterColors,
    barsVersion, isLoading, hasFamilyData,
  } = props

  const rootRef = useRef<HTMLDivElement>(null)
  const [cells, setCells] = useState<CandleCell[]>([])
  const [crosshairX, setCrosshairX] = useState<number | null>(null)

  const recompute = useCallback(() => {
    const chart = chartRef.current
    const rows = familyRowsRef.current
    const barsSorted = [...barsRef.current].sort((a, b) => a.time - b.time)
    if (!chart || rows.length === 0 || barsSorted.length === 0) {
      setCells([])
      return
    }
    const emptyColor = theme.colors.border.muted + '99'
    const rowByTfYm = buildFamilyRowByTfYm(rows)
    setCells(computeCells(chart, barsSorted, rowByTfYm, selectedFamilyTF, letterColors, emptyColor))
  }, [chartRef, barsRef, familyRowsRef, selectedFamilyTF, letterColors])

  useEffect(() => {
    if (isLoading) return
    const chart = chartRef.current
    if (!chart) return

    const run = () => {
      requestAnimationFrame(recompute)
    }
    run()
    requestAnimationFrame(() => requestAnimationFrame(recompute))

    const ts = chart.timeScale()
    ts.subscribeVisibleLogicalRangeChange(run)
    ts.subscribeVisibleTimeRangeChange(run)

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(run) : null
    if (ro && rootRef.current) ro.observe(rootRef.current)

    window.addEventListener('resize', run)
    return () => {
      ts.unsubscribeVisibleLogicalRangeChange(run)
      ts.unsubscribeVisibleTimeRangeChange(run)
      window.removeEventListener('resize', run)
      if (ro) ro.disconnect()
    }
  }, [chartRef, recompute, barsVersion, isLoading, selectedFamilyTF, letterColors])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const onCrosshairMove = (param: any) => {
      if (!param || !param.point || typeof param.point.x !== 'number') {
        setCrosshairX(null)
        return
      }
      const x = Number(param.point.x)
      if (!Number.isFinite(x)) {
        setCrosshairX(null)
        return
      }
      setCrosshairX(x)
    }
    chart.subscribeCrosshairMove(onCrosshairMove)
    return () => chart.unsubscribeCrosshairMove(onCrosshairMove)
  }, [chartRef, barsVersion])

  const rowsHeight = ROW_H * 2 + GAP
  const neutralCellBg = theme.colors.bg.deep + 'bb'
  const emptyTextColor = theme.colors.text.dimmer

  return (
    <div
      ref={rootRef}
      style={{
        position: 'relative',
        flexShrink: 0,
        borderTop: `1px solid ${theme.colors.border.strong}`,
        background: theme.colors.bg.secondary,
        padding: '0 0 8px',
        boxShadow: `inset 0 1px 0 ${theme.colors.border.muted}`,
      }}
    >
      <div style={FAMILY_TITLE_CHIP_STYLE}>
        Family · {selectedFamilyTF}
      </div>

      {cells.length === 0 ? (
        <div style={{
          fontSize: 10,
          color: theme.colors.text.muted,
          fontFamily: theme.fonts.mono,
          padding: '6px 10px 2px',
        }}
        >
          {isLoading
            ? 'Loading…'
            : !hasFamilyData
              ? 'No family data loaded.'
              : 'No visible family cells in current range.'}
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', height: rowsHeight }}>
          {crosshairX !== null && (
            <div
              style={{
                position: 'absolute',
                left: crosshairX,
                top: 0,
                bottom: 0,
                width: 1,
                transform: 'translateX(-0.5px)',
                background: theme.colors.text.axisText + 'aa',
                pointerEvents: 'none',
                zIndex: 5,
              }}
            />
          )}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 4 }}>
            <div style={{ position: 'relative', height: ROW_H }}>
              {cells.map((c, idx) => (
                <div
                  key={`buy-${idx}`}
                  title={`BUY ${c.buyLetter} | candle ${c.bandYm} | lookup ${c.lookupYm}`}
                  style={{
                    position: 'absolute',
                    left: c.left,
                    width: c.width,
                    top: 0,
                    height: ROW_H,
                    background: neutralCellBg,
                    borderRight: `1px solid ${theme.colors.bg.deep}99`,
                    color: letterTextColor(c.buyLetter, 'buy', letterColors, emptyTextColor),
                    fontFamily: theme.fonts.mono,
                    fontSize: c.width < 4 ? 8 : 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    pointerEvents: 'auto',
                    userSelect: 'none',
                    textShadow: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {c.width >= LABEL_MIN_WIDTH ? c.buyLetter : ''}
                </div>
              ))}
              <div
                style={{
                  position: 'absolute',
                  left: 4,
                  top: 2,
                  fontSize: 8,
                  fontFamily: theme.fonts.mono,
                  fontWeight: 700,
                  color: theme.colors.text.axisText,
                  pointerEvents: 'none',
                  textTransform: 'uppercase',
                  background: theme.colors.bg.overlay,
                  padding: '1px 3px',
                  borderRadius: 3,
                }}
              >
                Buy
              </div>
            </div>
            <div style={{ position: 'relative', height: ROW_H, marginTop: GAP }}>
              {cells.map((c, idx) => (
                <div
                  key={`sell-${idx}`}
                  title={`SELL ${c.sellLetter} | candle ${c.bandYm} | lookup ${c.lookupYm}`}
                  style={{
                    position: 'absolute',
                    left: c.left,
                    width: c.width,
                    top: 0,
                    height: ROW_H,
                    background: neutralCellBg,
                    borderRight: `1px solid ${theme.colors.bg.deep}99`,
                    color: letterTextColor(c.sellLetter, 'sell', letterColors, emptyTextColor),
                    fontFamily: theme.fonts.mono,
                    fontSize: c.width < 4 ? 8 : 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    pointerEvents: 'auto',
                    userSelect: 'none',
                    textShadow: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {c.width >= LABEL_MIN_WIDTH ? c.sellLetter : ''}
                </div>
              ))}
              <div
                style={{
                  position: 'absolute',
                  left: 4,
                  top: 2,
                  fontSize: 8,
                  fontFamily: theme.fonts.mono,
                  fontWeight: 700,
                  color: theme.colors.text.axisText,
                  pointerEvents: 'none',
                  textTransform: 'uppercase',
                  background: theme.colors.bg.overlay,
                  padding: '1px 3px',
                  borderRadius: 3,
                }}
              >
                Sell
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
