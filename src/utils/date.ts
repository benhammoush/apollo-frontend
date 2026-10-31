/**
 * utils/date.ts
 * =============
 * Shared date formatting utilities.
 */

/** Format an ISO date string or null/undefined to a human-readable string. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
  } catch {
    return '—'
  }
}

/** Format a Unix timestamp (seconds) to a human-readable string. */
export function fmtDateFromTs(ts: number): string {
  return fmtDate(new Date(ts * 1000).toISOString())
}
