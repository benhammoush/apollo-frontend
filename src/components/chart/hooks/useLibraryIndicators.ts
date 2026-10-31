import { useEffect, useRef } from 'react'
import {
  type IChartApi,
  type ISeriesApi,
  LineSeries,
  LineStyle,
  Time,
} from 'lightweight-charts'
import {
  ADX,
  ATR,
  BBPercentB,
  EMA,
  RSI,
  SMA,
} from 'lightweight-charts-indicators'
import type { Bar as IndicatorBar, IndicatorResult } from 'oakscriptjs'
import type { OHLCVBar } from '../../../types'
import type { ChartIndicatorId, ChartIndicatorsState } from '../../../store/persistedState'
import type { PaneIndicatorId } from '../indicatorLibrary'

interface Params {
  chartRef: React.MutableRefObject<IChartApi | null>
  bars: OHLCVBar[]
  barsVersion: number
  indicators: ChartIndicatorsState
  showBBPane: boolean
  activePaneIndicatorId: PaneIndicatorId | null
  indicatorSnapshotsRef: React.MutableRefObject<IndicatorSnapshots>
}

type ManagedSeries = ISeriesApi<'Line'>[]

export interface IndicatorSnapshotSeries {
  label: string
  values: Array<{ time: number; value: number }>
}

export type IndicatorSnapshots = Partial<Record<ChartIndicatorId, IndicatorSnapshotSeries[]>>

export function useLibraryIndicators({
  chartRef,
  bars,
  barsVersion,
  indicators,
  showBBPane,
  activePaneIndicatorId,
  indicatorSnapshotsRef,
}: Params) {
  const overlaySeriesRef = useRef<ManagedSeries>([])
  const paneSeriesRef = useRef<ManagedSeries>([])
  const lastSizedPaneKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    clearSeries(chart, overlaySeriesRef.current)
    clearSeries(chart, paneSeriesRef.current)
    overlaySeriesRef.current = []
    paneSeriesRef.current = []
    indicatorSnapshotsRef.current = {}

    if (bars.length === 0) return

    const indicatorBars = bars.map<IndicatorBar>(bar => ({
      time: bar.time,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }))

    addMovingAverageIfEnabled(chart, overlaySeriesRef.current, indicatorBars, indicators.ema20.enabled, indicators.ema20.color, 'EMA', 20, 'ema20', 'EMA20', indicatorSnapshotsRef)
    addMovingAverageIfEnabled(chart, overlaySeriesRef.current, indicatorBars, indicators.ema50.enabled, indicators.ema50.color, 'EMA', 50, 'ema50', 'EMA50', indicatorSnapshotsRef)
    addMovingAverageIfEnabled(chart, overlaySeriesRef.current, indicatorBars, indicators.ema200.enabled, indicators.ema200.color, 'EMA', 200, 'ema200', 'EMA200', indicatorSnapshotsRef)
    addMovingAverageIfEnabled(chart, overlaySeriesRef.current, indicatorBars, indicators.sma20.enabled, indicators.sma20.color, 'SMA', 20, 'sma20', 'SMA20', indicatorSnapshotsRef)
    addMovingAverageIfEnabled(chart, overlaySeriesRef.current, indicatorBars, indicators.sma50.enabled, indicators.sma50.color, 'SMA', 50, 'sma50', 'SMA50', indicatorSnapshotsRef)
    addMovingAverageIfEnabled(chart, overlaySeriesRef.current, indicatorBars, indicators.sma200.enabled, indicators.sma200.color, 'SMA', 200, 'sma200', 'SMA200', indicatorSnapshotsRef)

    if (activePaneIndicatorId) {
      const paneIndex = showBBPane ? 2 : 1
      if (activePaneIndicatorId === 'bollingerBands') {
        const result = BBPercentB.calculate(indicatorBars, {
          length: indicators.bollingerBands.length,
          mult: indicators.bollingerBands.mult,
          src: indicators.bollingerBands.src,
        })
        const series = createLineSeries(chart, paneIndex, indicators.bollingerBands.basisColor, normalizePlot(result, 'plot0'), {
          lineWidth: 2,
          priceFormat: { type: 'price', precision: 3, minMove: 0.001 },
        })
        series.createPriceLine({
          price: 1,
          color: indicators.bollingerBands.basisColor + '55',
          lineStyle: LineStyle.Dotted,
          lineWidth: 1,
          axisLabelVisible: false,
          title: '',
        })
        series.createPriceLine({
          price: 0,
          color: indicators.bollingerBands.basisColor + '40',
          lineStyle: LineStyle.Dotted,
          lineWidth: 1,
          axisLabelVisible: false,
          title: '',
        })
        paneSeriesRef.current.push(series)
        indicatorSnapshotsRef.current.bollingerBands = [
          { label: 'BB%', values: normalizeValues(result, 'plot0') },
        ]
      }

      if (activePaneIndicatorId === 'atr') {
        const result = ATR.calculate(indicatorBars, {
          length: indicators.atr.length,
          smoothing: indicators.atr.smoothing,
        })
        paneSeriesRef.current.push(
          createLineSeries(chart, paneIndex, indicators.atr.color, normalizePlot(result, 'plot0'), {
            lineWidth: 2,
            priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
          }),
        )
        indicatorSnapshotsRef.current.atr = [
          { label: 'ATR', values: normalizeValues(result, 'plot0') },
        ]
      }

      if (activePaneIndicatorId === 'adx') {
        const result = ADX.calculate(indicatorBars, {
          adxSmoothing: indicators.adx.adxSmoothing,
          diLength: indicators.adx.diLength,
        })
        const series = createLineSeries(chart, paneIndex, indicators.adx.color, normalizePlot(result, 'plot0'), {
          lineWidth: 2,
          priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        })
        series.createPriceLine({
          price: indicators.adx.threshold,
          color: indicators.adx.color + '77',
          lineStyle: LineStyle.Dotted,
          lineWidth: 1,
          axisLabelVisible: false,
          title: '',
        })
        paneSeriesRef.current.push(series)
        indicatorSnapshotsRef.current.adx = [
          { label: 'ADX', values: normalizeValues(result, 'plot0') },
        ]
      }

      if (activePaneIndicatorId === 'rsi') {
        const result = RSI.calculate(indicatorBars, {
          length: indicators.rsi.length,
          src: indicators.rsi.src,
          calculateDivergence: false,
          maType: 'None',
          maLength: 14,
          bbMult: 2,
        })
        const series = createLineSeries(chart, paneIndex, indicators.rsi.color, normalizePlot(result, 'plot0'), {
          lineWidth: 2,
          priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        })
        series.createPriceLine({
          price: indicators.rsi.upper,
          color: indicators.rsi.color + '66',
          lineStyle: LineStyle.Dotted,
          lineWidth: 1,
          axisLabelVisible: false,
          title: '',
        })
        series.createPriceLine({
          price: indicators.rsi.lower,
          color: indicators.rsi.color + '66',
          lineStyle: LineStyle.Dotted,
          lineWidth: 1,
          axisLabelVisible: false,
          title: '',
        })
        paneSeriesRef.current.push(series)
        indicatorSnapshotsRef.current.rsi = [
          { label: 'RSI', values: normalizeValues(result, 'plot0') },
        ]
      }

      const paneSizeKey = `${activePaneIndicatorId}:${paneIndex}:${showBBPane ? 'bb' : 'plain'}`
      if (lastSizedPaneKeyRef.current !== paneSizeKey) {
        lastSizedPaneKeyRef.current = paneSizeKey
        requestAnimationFrame(() => {
          const pane = chart.panes()[paneIndex]
          if (pane && Math.abs(pane.getHeight() - 88) > 1) {
            pane.setHeight(88)
          }
        })
      }
    } else {
      lastSizedPaneKeyRef.current = null
    }

    return () => {
      clearSeries(chart, overlaySeriesRef.current)
      clearSeries(chart, paneSeriesRef.current)
      overlaySeriesRef.current = []
      paneSeriesRef.current = []
      indicatorSnapshotsRef.current = {}
      if (!activePaneIndicatorId) {
        lastSizedPaneKeyRef.current = null
      }
    }
  }, [activePaneIndicatorId, bars, barsVersion, chartRef, indicatorSnapshotsRef, indicators, showBBPane])
}

function addMovingAverageIfEnabled(
  chart: IChartApi,
  bucket: ManagedSeries,
  bars: IndicatorBar[],
  enabled: boolean,
  color: string,
  type: 'EMA' | 'SMA',
  length: number,
  indicatorId: ChartIndicatorId,
  label: string,
  indicatorSnapshotsRef: React.MutableRefObject<IndicatorSnapshots>,
) {
  if (!enabled) return
  const result = type === 'EMA'
    ? EMA.calculate(bars, { length, src: 'close', offset: 0, maType: 'None', maLength: 9, bbMult: 2 })
    : SMA.calculate(bars, { len: length, src: 'close', offset: 0, maType: 'None', maLength: 9, bbMult: 2 })
  bucket.push(createLineSeries(chart, 0, color, normalizePlot(result, 'plot0')))
  indicatorSnapshotsRef.current[indicatorId] = [
    { label, values: normalizeValues(result, 'plot0') },
  ]
}

function createLineSeries(
  chart: IChartApi,
  paneIndex: number,
  color: string,
  data: Array<{ time: Time; value: number }>,
  options?: Partial<Parameters<IChartApi['addSeries']>[1]>,
) {
  const series = chart.addSeries(LineSeries, {
    color,
    lineWidth: 2,
    lastValueVisible: false,
    priceLineVisible: false,
    crosshairMarkerVisible: false,
    ...options,
  }, paneIndex)
  series.setData(data)
  series.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.08 } })
  return series
}

function normalizePlot(result: IndicatorResult, key: string): Array<{ time: Time; value: number }> {
  return (result.plots[key] ?? [])
    .filter(point => typeof point.value === 'number' && Number.isFinite(point.value))
    .map(point => ({ time: point.time as Time, value: point.value }))
}

function normalizeValues(result: IndicatorResult, key: string): Array<{ time: number; value: number }> {
  return (result.plots[key] ?? [])
    .filter(point => typeof point.value === 'number' && Number.isFinite(point.value))
    .map(point => ({ time: Number(point.time), value: point.value }))
}

function clearSeries(chart: IChartApi, seriesList: ManagedSeries) {
  for (const series of seriesList) {
    try {
      chart.removeSeries(series)
    } catch {
      // ignore stale series during rapid state changes
    }
  }
}
