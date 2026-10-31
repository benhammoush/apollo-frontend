/** Broker timezone offset from UTC (e.g. 3 for UTC+3). */
export const BROKER_UTC_OFFSET: number = 3

/**
 * Countdown string until the next weekly market open (Sunday).
 * `brokerOffset` is the broker's UTC offset (e.g. 3 for UTC+3).
 * Forex opens at Sunday (24 - brokerOffset):00 UTC.
 */
export function timeUntilMarketOpen(brokerOffset: number): string {
  const openHourUTC = (24 - brokerOffset) % 24
  const now = new Date()
  const day = now.getUTCDay()
  const h   = now.getUTCHours()
  const m   = now.getUTCMinutes()
  const s   = now.getUTCSeconds()

  let daysAhead = (7 - day) % 7
  if (day === 0 && (h > openHourUTC || (h === openHourUTC && (m > 0 || s > 0)))) daysAhead = 7

  const target = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead, openHourUTC, 0, 0, 0
  ))
  const diffS = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000))
  if (diffS === 0) return 'opening now'
  const hrs  = Math.floor(diffS / 3600)
  const mins = Math.floor((diffS % 3600) / 60)
  if (hrs >= 24) {
    const days = Math.floor(hrs / 24)
    const remH = hrs % 24
    return `weekend · opens in ${days}d ${remH}h`
  }
  if (hrs > 0) return `weekend · opens in ${hrs}h ${mins}m`
  return `weekend · opens in ${mins}m`
}

/**
 * Format age in seconds to human-readable string.
 */
export function fmtAge(seconds: number | null | undefined): string {
  if (seconds == null) return '—'
  if (seconds < 60)   return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

/**
 * Format a Date to "HH:MM:SS.mmm" in broker timezone (UTC+3).
 */

/** Format an ISO datetime string to "YYYY-MM-DD HH:MM" for display. */
export function fmtDate(iso: string | number | null | undefined): string {
  if (iso == null) return '\u2014'
  if (typeof iso === 'number') {
    return new Date(iso * 1000).toISOString().slice(0, 16).replace('T', ' ')
  }
  return iso.slice(0, 16).replace('T', ' ')
}

export function formatBrokerTime(d: Date): string {
  const h = ((d.getUTCHours() + BROKER_UTC_OFFSET) % 24 + 24) % 24
  const m = d.getUTCMinutes()
  const s = d.getUTCSeconds()
  const ms = d.getUTCMilliseconds()
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}
