/**
 * DST detection utility — port of `is_london_dst_shift` from
 * `shared/session_boundaries.py`.
 *
 * The broker runs on NY time. When US and UK DST transitions are
 * misaligned, London's local time shifts by 1 h relative to broker time.
 *
 * Periods (inclusive):
 *   Spring — 2nd Sunday of March  … last Sunday of March
 *   Fall  — last Sunday of October … 1st Sunday of November
 */

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1)
  const firstWeekday = firstDay.getDay()
  let day = 1 + ((weekday - firstWeekday + 7) % 7) + 7 * (n - 1)
  if (day > daysInMonth) day -= 7
  return new Date(year, month - 1, day)
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const lastDay = new Date(year, month, 0)
  const offset = (lastDay.getDay() - weekday + 7) % 7
  return new Date(year, month - 1, lastDay.getDate() - offset)
}

export function isLondonDstShift(d: Date): boolean {
  const y = d.getFullYear()

  const springStart = nthWeekdayOfMonth(y, 3, 0, 2)
  const springEnd = lastWeekdayOfMonth(y, 3, 0)
  if (springStart <= d && d <= springEnd) return true

  const fallStart = lastWeekdayOfMonth(y, 10, 0)
  const fallEnd = nthWeekdayOfMonth(y, 11, 0, 1)
  if (fallStart <= d && d <= fallEnd) return true

  return false
}
