import { useCallback, useEffect, useState } from 'react'
import {
  IChartApi, ISeriesApi,
  AreaSeries, BaselineSeries, LineSeries, LineStyle, Time,
} from 'lightweight-charts'
import { BBPctPoint } from '../../../types'
import { SourceKey } from '../../../store/persistedState'
import { BB_TF_CONFIG, BB_PANE_HEIGHT } from '../constants'
import { theme } from '../../../design-system'
import { fetchWithMeta } from '../../../utils/fetchWithMeta'

interface Params {
  symbol: string
  tf: string
  sources: Record<SourceKey, string | null>
  showBB: boolean
  chartRef: React.MutableRefObject<IChartApi | null>
  bbPointsRef: React.MutableRefObject<BBPctPoint[]>
  bbLineRef: React.MutableRefObject<ISeriesApi<'Line'> | null>
  bbGreenRef: React.MutableRefObject<ISeriesApi<'Area'> | null>
  bbRedRef: React.MutableRefObject<ISeriesApi<'Baseline'> | null>
}

interface Result {
  bbLoading: boolean
  bbPaneHeight: number
  setBbPaneHeight: React.Dispatch<React.SetStateAction<number>>
}

export function useBollingerBandsData(p: Params): Result {
  const [bbLoading, setBbLoading] = useState(false)
  const [bbPaneHeight, setBbPaneHeight] = useState(70)

  const removeBBSeries = useCallback(() => {
    p.bbPointsRef.current = []
    if (p.bbLineRef.current) { p.chartRef.current?.removeSeries(p.bbLineRef.current); p.bbLineRef.current = null }
    if (p.bbGreenRef.current) { p.chartRef.current?.removeSeries(p.bbGreenRef.current); p.bbGreenRef.current = null }
    if (p.bbRedRef.current) { p.chartRef.current?.removeSeries(p.bbRedRef.current); p.bbRedRef.current = null }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const ensureBBSeries = useCallback(() => {
    if (p.bbLineRef.current || !p.chartRef.current) return
    const bbScale = () => ({ priceRange: { minValue: -0.5, maxValue: 2 }, margins: { above: 0, below: 0 } })
    p.bbGreenRef.current = p.chartRef.current.addSeries(AreaSeries, {
      lineColor: 'rgba(0,0,0,0)',
      topColor: 'rgba(63,185,80,0.18)',
      bottomColor: 'rgba(63,185,80,0.06)',
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
      autoscaleInfoProvider: bbScale,
    }, 1)
    p.bbRedRef.current = p.chartRef.current.addSeries(BaselineSeries, {
      baseValue: { type: 'price', price: 1 },
      topLineColor: 'rgba(0,0,0,0)',
      topFillColor1: 'rgba(248,81,73,0.18)',
      topFillColor2: 'rgba(248,81,73,0.06)',
      bottomLineColor: 'rgba(0,0,0,0)',
      bottomFillColor1: 'rgba(0,0,0,0)',
      bottomFillColor2: 'rgba(0,0,0,0)',
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
      autoscaleInfoProvider: bbScale,
    }, 1)
    p.bbLineRef.current = p.chartRef.current.addSeries(LineSeries, {
      color: theme.colors.text.axisText,
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
      autoscaleInfoProvider: bbScale,
    }, 1)
    p.bbLineRef.current.priceScale().applyOptions({ scaleMargins: { top: 0, bottom: 0 } })
    p.bbLineRef.current.createPriceLine({ price: 0, color: 'rgba(63,185,80,0.55)', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' })
    p.bbLineRef.current.createPriceLine({ price: 1, color: 'rgba(248,81,73,0.55)', lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' })
    p.chartRef.current.panes()[1]?.setHeight(BB_PANE_HEIGHT)
    requestAnimationFrame(() => {
      const h = p.chartRef.current?.panes()[1]?.getHeight()
      if (h) setBbPaneHeight(h)
    })
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const config = BB_TF_CONFIG[p.tf]
    if (!config || !p.showBB) {
      removeBBSeries()
      return
    }

    ensureBBSeries()
    setBbLoading(true)
    const controller = new AbortController()
    const tfParam = p.tf === 'M15' ? 'M15' : 'M5'
    fetchWithMeta(`/agents/bb/${p.symbol}/series?tf=${tfParam}`, { signal: controller.signal }, { trigger: 'manual' })
      .then(r => r.ok ? r.json() : null)
      .then((pts: BBPctPoint[] | null) => {
        p.bbPointsRef.current = pts ?? []
        const mapped = p.bbPointsRef.current.map(pt => ({ time: pt.time as unknown as Time, value: pt.pct }))
        const t0 = mapped[0]?.time, t1 = mapped[mapped.length - 1]?.time
        if (t0 && t1) {
          p.bbGreenRef.current?.setData([{ time: t0, value: 0 }, { time: t1, value: 0 }])
          p.bbRedRef.current?.setData([{ time: t0, value: 2 }, { time: t1, value: 2 }])
        }
        p.bbLineRef.current?.setData(mapped)
        if (mapped.length > 0) {
          p.chartRef.current?.panes()[1]?.setHeight(BB_PANE_HEIGHT)
          setBbPaneHeight(BB_PANE_HEIGHT)
        }
      })
      .catch(err => { if (err.name !== 'AbortError') removeBBSeries() })
      .finally(() => { if (!controller.signal.aborted) setBbLoading(false) })
    return () => controller.abort()
  }, [p.symbol, p.tf, p.showBB, removeBBSeries, ensureBBSeries])  // eslint-disable-line react-hooks/exhaustive-deps

  return { bbLoading, bbPaneHeight, setBbPaneHeight }
}
