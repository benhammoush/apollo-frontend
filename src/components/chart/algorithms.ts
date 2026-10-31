import { OHLCVBar, BBPctPoint } from '../../types'
import { TrendSegment } from './types'

// =============================================================================
// Helper functions
// =============================================================================

// Snap a unix timestamp to the nearest loaded bar (binary search, O(log n)).
//
// LWC's timeToCoordinate() only works for timestamps that exist as loaded bars.
// W1 bars start on Sundays, MN1/MN3/MN6/MN12 bars can start on weekends — none
// of them have a matching bar on lower TFs like M5/M15.  This function rounds
// ts down to the last bar with time <= ts so timeToCoordinate() always succeeds.
//
// Special cases:
//   ts > last bar  → returns last bar's time  (handles "now" beyond last bar)
//   ts < first bar → returns first bar's time
//
export function snapToBarTime(ts: number, bars: OHLCVBar[]): number {
  if (bars.length === 0) return ts
  if (ts >= bars[bars.length - 1].time) return bars[bars.length - 1].time
  if (ts <= bars[0].time) return bars[0].time

  let lo = 0
  let hi = bars.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (bars[mid].time <= ts) lo = mid
    else hi = mid
  }
  return bars[lo].time
}

// Return all bars inside the time range [fromTs, toTs) using binary search.
//
// Replaces the previous .filter() call which was O(n) per segment per cache miss.
// With binary search this is O(log n) to find the boundaries + O(k) to copy
// the k bars in range.  For M5 (25k bars) this is roughly 20x faster.
//
export function findBarsInRange(bars: OHLCVBar[], fromTs: number, toTs: number): OHLCVBar[] {
  if (bars.length === 0) return []

  // Find the first index where bar.time >= fromTs
  let lo = 0, hi = bars.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (bars[mid].time < fromTs) lo = mid + 1
    else hi = mid
  }
  const startIdx = lo

  // Find the first index where bar.time >= toTs
  lo = startIdx; hi = bars.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (bars[mid].time < toTs) lo = mid + 1
    else hi = mid
  }
  const endIdx = lo

  return bars.slice(startIdx, endIdx)
}

// Find the nearest BB%b value for a given timestamp (binary search, O(log n)).
// Returns null if the points array is empty.
export function findNearestBBPct(ts: number, points: BBPctPoint[]): number | null {
  if (points.length === 0) return null

  const first = points[0].time as unknown as number
  const last = points[points.length - 1].time as unknown as number
  if (ts <= first) return points[0].pct
  if (ts >= last) return points[points.length - 1].pct

  let lo = 0, hi = points.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if ((points[mid].time as unknown as number) <= ts) lo = mid
    else hi = mid
  }
  const dlo = Math.abs((points[lo].time as unknown as number) - ts)
  const dhi = Math.abs((points[hi].time as unknown as number) - ts)
  return dlo <= dhi ? points[lo].pct : points[hi].pct
}

// Return all trend segments active at the given unix timestamp.
export function getActiveTrendsAt(ts: number, segments: TrendSegment[]): TrendSegment[] {
  return segments.filter(s => ts >= s.timeFrom && ts <= s.timeTo)
}
