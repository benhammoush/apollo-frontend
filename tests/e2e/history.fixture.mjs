/**
 * @file Supplies a bounded synthetic candle snapshot for browser history requests.
 */

/** Return a fixed snapshot filtered by inclusive UTC start/end dates and timeframe. */
export function historyBars(url, snapshotTime) {
  const step = url.searchParams.get('tf') === 'H4' ? 14400 : 60
  const end = Math.floor(snapshotTime / 1000 / step) * step
  const startDate = url.searchParams.get('start')
  const endDate = url.searchParams.get('end')
  const from = startDate ? Date.parse(startDate) / 1000 : -Infinity
  const until = endDate ? Date.parse(endDate) / 1000 + 86400 : Infinity
  return Array.from({ length: 120 }, (_, i) => ({
    time: end - (120 - i) * step,
    open: 1.1 + i * 0.0001,
    high: 1.101 + i * 0.0001,
    low: 1.099 + i * 0.0001,
    close: 1.1 + i * 0.0001 + (i % 2 ? -0.0005 : 0.0005),
    volume: i,
  })).filter((bar) => bar.time >= from && bar.time < until)
}
