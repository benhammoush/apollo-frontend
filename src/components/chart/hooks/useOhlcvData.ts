/** @packageDocumentation Loads selected candle history and applies only the current chart's results. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { IChartApi, ISeriesApi, Time } from 'lightweight-charts'
import { OHLCVBar } from '../../../types'
import { TF_DEFAULT_DAYS, NAV_TARGET_BARS, MIN_HISTORY_DATE, MIN_HISTORY_TS } from '../constants'
import { fetchWithMeta } from '../../../utils/fetchWithMeta'
import { readOhlcvResponse } from '../../../utils/readOhlcvResponse'

interface Params {
  symbol: string
  tf: string
  broker: string | null
  reloadCounter: number

  pendingNavTsRef: React.MutableRefObject<number | null>
  candleRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>
  chartRef: React.MutableRefObject<IChartApi | null>
  tooltipElRef: React.MutableRefObject<HTMLDivElement | null>
  tfRef: React.MutableRefObject<string>
  symbolRef: React.MutableRefObject<string>
  brokerRef: React.MutableRefObject<string | null>

  barsRef: React.MutableRefObject<OHLCVBar[]>
  loadedFromRef: React.MutableRefObject<number>
  isFetchingMoreRef: React.MutableRefObject<boolean>
  lastLoadAttemptRef: React.MutableRefObject<number>
  trendHLCacheRef: React.MutableRefObject<Map<string, { high: number; low: number }>>
  bgDirtyRef: React.MutableRefObject<boolean>
}

interface Result {
  isLoading: boolean
  barsVersion: number
  loadOlderChunk: () => void
  navigateToDate: (targetTs: number) => void
}

/** Own initial/history navigation requests and live candle updates without applying cancelled results. */
export function useOhlcvData(p: Params): Result {
  const [isLoading, setIsLoading] = useState(false)
  const [barsVersion, setBarsVersion] = useState(0)

  // ── Load OHLCV bars on symbol / TF change ────────────────────────────────────
  useEffect(() => {
    if (!p.candleRef.current || !p.broker) return

    p.barsRef.current = []
    p.loadedFromRef.current = 0
    p.isFetchingMoreRef.current = false
    p.trendHLCacheRef.current.clear()
    if (p.tooltipElRef.current) p.tooltipElRef.current.style.display = 'none'

    const days = TF_DEFAULT_DAYS[p.tf] ?? Infinity
    const navTs = p.pendingNavTsRef.current
    p.pendingNavTsRef.current = null
    const navDays = navTs && isFinite(days) ? Math.max(days, 30) : days
    const startDate = navTs && isFinite(navDays)
      ? new Date(Math.max(
          new Date(MIN_HISTORY_DATE).getTime(),
          (navTs - (navDays / 2) * 86400) * 1000,
        )).toISOString().slice(0, 10)
      : isFinite(navDays)
        ? new Date(Date.now() - navDays * 86400_000).toISOString().slice(0, 10)
        : MIN_HISTORY_DATE
    const endDate = navTs && isFinite(navDays)
      ? new Date(Math.min(
          Date.now(),
          (navTs + (navDays / 2) * 86400) * 1000,
        )).toISOString().slice(0, 10)
      : undefined

    const controller = new AbortController()
    setIsLoading(true)
    let timedOut = false
    const timeoutId = setTimeout(() => { timedOut = true; controller.abort() }, 60_000)

    const brokerQ = p.broker ? `&source=${encodeURIComponent(p.broker)}` : ''
    const endQ = endDate ? `&end=${endDate}` : ''

    const applyBars = (bars: OHLCVBar[]) => {
      p.barsRef.current = bars
      setBarsVersion(v => v + 1)
      p.loadedFromRef.current = bars.length > 0 ? bars[0].time : -1
      p.bgDirtyRef.current = true
      p.candleRef.current?.setData(bars.map(b => ({
        time: b.time as unknown as Time,
        open: b.open, high: b.high, low: b.low, close: b.close,
      })))
      const ts = p.chartRef.current?.timeScale()
      if (ts && bars.length > 0) {
        if (navTs) {
          const targetBars = NAV_TARGET_BARS[p.tf] ?? 100
          const halfCount = Math.floor(targetBars / 2)
          let targetIdx = bars.length - 1
          for (let i = 0; i < bars.length; i++) {
            if (bars[i].time <= navTs) targetIdx = i
            else break
          }
          const fromIdx = Math.max(0, targetIdx - halfCount)
          const toIdx = Math.min(bars.length - 1, fromIdx + targetBars - 1)
          ts.setVisibleRange({
            from: bars[fromIdx].time as unknown as Time,
            to: bars[toIdx].time as unknown as Time,
          })
        } else {
          ts.fitContent()
        }
      }
      p.chartRef.current?.priceScale('right').applyOptions({ autoScale: true })
    }

    const fetchWithTimeout = (url: string, timeout = 30_000) => {
      const ctrl = new AbortController()
      const abort = () => ctrl.abort()
      controller.signal.addEventListener('abort', abort, { once: true })
      if (controller.signal.aborted) ctrl.abort()
      const tid = setTimeout(() => ctrl.abort(), timeout)
      return fetchWithMeta(url, { signal: ctrl.signal }).then(readOhlcvResponse).finally(() => {
        clearTimeout(tid)
        controller.signal.removeEventListener('abort', abort)
      })
    }

    fetchWithMeta(`/market/${p.symbol}?tf=${p.tf}&start=${startDate}${endQ}${brokerQ}`, { signal: controller.signal }, { trigger: 'manual' })
      .then(readOhlcvResponse)
      .then((bars: OHLCVBar[]) => {
        if (!controller.signal.aborted && bars.length === 0 && isFinite(days) && !navTs) {
          const fallbackStart = days <= 50
            ? new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
            : MIN_HISTORY_DATE
          // Fallback uses its own abort controller to avoid cancelling on the same signal
          return fetchWithTimeout(`/market/${p.symbol}?tf=${p.tf}&start=${fallbackStart}${brokerQ}`, 30_000)
        }
        return bars
      })
      .then(bars => { if (!controller.signal.aborted) applyBars(bars) })
      .catch(err => {
        if (!controller.signal.aborted && err.name !== 'AbortError') console.error('[Chart] OHLCV fetch failed:', err)
      })
      .finally(() => {
        clearTimeout(timeoutId)
        if (!controller.signal.aborted || timedOut) setIsLoading(false)
      })

    return () => { clearTimeout(timeoutId); controller.abort() }
  }, [p.symbol, p.tf, p.broker, p.reloadCounter])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live bar updates via WebSocket events ────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent).detail as {
        symbols?: string[]
        source?: string
        bars?: Array<{ symbol: string; time: number; open: number; high: number; low: number; close: number; volume: number }>
      }
      if (!msg?.symbols?.includes(p.symbolRef.current)) return
      if (p.brokerRef.current && msg.source && msg.source !== p.brokerRef.current) return
      const candle = p.candleRef.current
      if (!candle) return

      if (p.tfRef.current === 'M1' && msg.bars?.length) {
        const sym = p.symbolRef.current.toUpperCase()
        const bar = msg.bars.find(b => b.symbol.toUpperCase() === sym)
        if (bar) {
          const lastTs = p.barsRef.current.length > 0
            ? p.barsRef.current[p.barsRef.current.length - 1].time
            : 0
          if (bar.time >= lastTs) {
            try {
              candle.update({ time: bar.time as unknown as Time, open: bar.open, high: bar.high, low: bar.low, close: bar.close })
              const last = p.barsRef.current
              if (last.length && last[last.length - 1].time === bar.time) {
                last[last.length - 1] = { time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume }
              } else if (!last.length || bar.time > last[last.length - 1].time) {
                last.push({ time: bar.time, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume })
              }
              setBarsVersion(v => v + 1)
              p.bgDirtyRef.current = true
            } catch { /* LWC rejects duplicate or out-of-order updates — safe to ignore */ }
          }
          return
        }
      }

      const capturedSymbol = p.symbolRef.current
      const capturedTf = p.tfRef.current
      const capturedBroker = p.brokerRef.current
      const lookbackSec = capturedTf === 'D1' ? 86400 * 2
                        : capturedTf === 'W1' ? 86400 * 14
                        : 14400
      const since = Math.floor(Date.now() / 1000) - lookbackSec
      const startDate = new Date(since * 1000).toISOString().slice(0, 10)
      const bq = p.brokerRef.current ? `&source=${encodeURIComponent(p.brokerRef.current)}` : ''
      fetchWithMeta(`/market/${capturedSymbol}?tf=${capturedTf}&start=${startDate}${bq}`, undefined, { trigger: 'manual' })
        .then(readOhlcvResponse)
        .then((bars: OHLCVBar[]) => {
          if (p.symbolRef.current !== capturedSymbol || p.tfRef.current !== capturedTf || p.brokerRef.current !== capturedBroker) return
          if (!bars.length) return
          const lastTs = p.barsRef.current.length > 0
            ? p.barsRef.current[p.barsRef.current.length - 1].time
            : 0
          const recentBars = bars.filter(b => b.time >= lastTs)
          for (const b of recentBars) {
            candle.update({ time: b.time as unknown as Time, open: b.open, high: b.high, low: b.low, close: b.close })
            const last = p.barsRef.current
            if (last.length && last[last.length - 1].time === b.time) {
              last[last.length - 1] = b
            } else if (!last.length || b.time > last[last.length - 1].time) {
              last.push(b)
            }
          }
          if (recentBars.length > 0) setBarsVersion(v => v + 1)
          p.bgDirtyRef.current = true
        })
        .catch(() => { })
    }
    window.addEventListener('apollo:live_bar', handler)
    return () => window.removeEventListener('apollo:live_bar', handler)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Live forming bar — update current candle for ANY timeframe ──────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent).detail as {
        source: string; symbol: string; bar_open_time: number;
        open: number; high: number; low: number; close: number; volume: number
      }
      if (msg.symbol?.toUpperCase() !== p.symbolRef.current.toUpperCase()) return
      if (p.brokerRef.current && msg.source && msg.source !== p.brokerRef.current) return
      const candle = p.candleRef.current
      if (!candle) return

      const last = p.barsRef.current
      if (!last.length) return
      const lastBar = last[last.length - 1]

      if (p.tfRef.current === 'M1') {
        if (msg.bar_open_time >= lastBar.time) {
          try {
            candle.update({
              time: msg.bar_open_time as unknown as Time,
              open: msg.open, high: msg.high, low: msg.low, close: msg.close,
            })
          } catch { /* LWC rejects out-of-order updates */ }
        }
      } else {
        const price = msg.close
        try {
          candle.update({
            time: lastBar.time as unknown as Time,
            open: lastBar.open,
            high: Math.max(lastBar.high, price),
            low: Math.min(lastBar.low, price),
            close: price,
          })
          lastBar.high = Math.max(lastBar.high, price)
          lastBar.low = Math.min(lastBar.low, price)
          lastBar.close = price
        } catch { /* LWC rejects out-of-order updates */ }
      }
    }
    window.addEventListener('apollo:forming_bar', handler)
    return () => window.removeEventListener('apollo:forming_bar', handler)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Lazy-load older bars when user scrolls to the left edge ──────────────────
  const loadOlderChunk = useCallback(() => {
    const currentTf = p.tfRef.current
    const currentSymbol = p.symbolRef.current
    const currentBroker = p.brokerRef.current

    const days = TF_DEFAULT_DAYS[currentTf] ?? Infinity
    if (!isFinite(days)) return

    if (p.isFetchingMoreRef.current) return
    if (p.loadedFromRef.current <= 0) return
    if (p.loadedFromRef.current <= MIN_HISTORY_TS) return

    const now = Date.now()
    if (now - p.lastLoadAttemptRef.current < 150) return
    p.lastLoadAttemptRef.current = now

    const chunkEndTs = p.loadedFromRef.current
    const chunkStartTs = Math.max(chunkEndTs - days * 86400, MIN_HISTORY_TS)
    const endDate = new Date((chunkEndTs - 1) * 1000).toISOString().slice(0, 10)
    const startDate = new Date(chunkStartTs * 1000).toISOString().slice(0, 10)

    p.isFetchingMoreRef.current = true

    const bqOlder = p.brokerRef.current ? `&source=${encodeURIComponent(p.brokerRef.current)}` : ''
    fetchWithMeta(`/market/${currentSymbol}?tf=${currentTf}&start=${startDate}&end=${endDate}${bqOlder}`, undefined, { trigger: 'manual' })
      .then(readOhlcvResponse)
      .then((olderBars: OHLCVBar[]) => {
        if (p.tfRef.current !== currentTf || p.symbolRef.current !== currentSymbol || p.brokerRef.current !== currentBroker) return
        if (!p.candleRef.current || !p.chartRef.current) return

        if (olderBars.length === 0) { p.loadedFromRef.current = -1; return }

        const existingTimes = new Set(p.barsRef.current.map(b => b.time))
        // Date-only responses can overlap the loaded day; only prepend earlier candles.
        const prependBefore = Math.min(chunkEndTs, p.barsRef.current[0]?.time ?? chunkEndTs)
        const newBars = olderBars.filter(b => b.time < prependBefore && !existingTimes.has(b.time))
        if (newBars.length === 0) { p.loadedFromRef.current = -1; return }
        p.loadedFromRef.current = newBars[0].time

        const visibleRange = p.chartRef.current.timeScale().getVisibleLogicalRange()

        const merged = [...newBars, ...p.barsRef.current]
        p.barsRef.current = merged
        p.trendHLCacheRef.current.clear()
        p.bgDirtyRef.current = true

        p.candleRef.current.setData(merged.map(b => ({
          time: b.time as unknown as Time,
          open: b.open, high: b.high, low: b.low, close: b.close,
        })))

        if (visibleRange) {
          p.chartRef.current.timeScale().setVisibleLogicalRange({
            from: visibleRange.from + newBars.length,
            to: visibleRange.to + newBars.length,
          })
        }
      })
      .catch(err => console.error('[Chart] Lazy load failed:', err))
      .finally(() => { p.isFetchingMoreRef.current = false })
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigate to a target timestamp by reloading centered data ────────────────
  const navigateToDate = useCallback((targetTs: number) => {
    const currentTf = p.tfRef.current
    const currentSymbol = p.symbolRef.current
    const currentBroker = p.brokerRef.current
    const chart = p.chartRef.current
    const candle = p.candleRef.current
    if (!chart || !candle) return

    const days = TF_DEFAULT_DAYS[currentTf] ?? Infinity
    const targetBars = NAV_TARGET_BARS[currentTf] ?? 100

    if (!isFinite(days)) {
      const bars = p.barsRef.current
      if (bars.length > 0) {
        const halfCount = Math.floor(targetBars / 2)
        let targetIdx = bars.length - 1
        for (let i = 0; i < bars.length; i++) {
          if (bars[i].time <= targetTs) targetIdx = i
          else break
        }
        const fromIdx = Math.max(0, targetIdx - halfCount)
        const toIdx = Math.min(bars.length - 1, fromIdx + targetBars - 1)
        chart.timeScale().setVisibleRange({
          from: bars[fromIdx].time as unknown as Time,
          to: bars[toIdx].time as unknown as Time,
        })
      }
      return
    }

    const halfSecs = (days / 2) * 86400
    const startTs = Math.max(MIN_HISTORY_TS, targetTs - halfSecs)
    const endTs = Math.min(Math.floor(Date.now() / 1000), targetTs + halfSecs)
    const startDate = new Date(startTs * 1000).toISOString().slice(0, 10)
    const endDate = new Date(endTs * 1000).toISOString().slice(0, 10)

    const bqNav = p.brokerRef.current ? `&source=${encodeURIComponent(p.brokerRef.current)}` : ''
    fetchWithMeta(`/market/${currentSymbol}?tf=${currentTf}&start=${startDate}&end=${endDate}${bqNav}`, undefined, { trigger: 'manual' })
      .then(readOhlcvResponse)
      .then((bars: OHLCVBar[]) => {
        if (p.tfRef.current !== currentTf || p.symbolRef.current !== currentSymbol || p.brokerRef.current !== currentBroker) return
        if (!p.candleRef.current || !p.chartRef.current) return

        if (bars.length === 0) return
        p.barsRef.current = bars
        setBarsVersion(v => v + 1)
        p.loadedFromRef.current = bars.length > 0 ? bars[0].time : startTs
        p.trendHLCacheRef.current.clear()
        p.bgDirtyRef.current = true

        p.candleRef.current.setData(bars.map(b => ({
          time: b.time as unknown as Time,
          open: b.open, high: b.high, low: b.low, close: b.close,
        })))

        const halfCount = Math.floor(targetBars / 2)
        let targetIdx = bars.length - 1
        for (let i = 0; i < bars.length; i++) {
          if (bars[i].time <= targetTs) targetIdx = i
          else break
        }
        const fromIdx = Math.max(0, targetIdx - halfCount)
        const toIdx = Math.min(bars.length - 1, fromIdx + targetBars - 1)
        p.chartRef.current.timeScale().setVisibleRange({
          from: bars[fromIdx].time as unknown as Time,
          to: bars[toIdx].time as unknown as Time,
        })
      })
      .catch(err => console.error('[Chart] navigateToDate fetch failed:', err))
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return { isLoading, barsVersion, loadOlderChunk, navigateToDate }
}
