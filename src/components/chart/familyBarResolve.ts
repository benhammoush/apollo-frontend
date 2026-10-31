import { FamilySnapshot } from '../../types'
import { FamilyTF, FAMILY_TFS } from './types'

/** `YYYY-MM` from bar open time (UTC). */
export function ymFromBarTime(barTimeSec: number): string {
  const d = new Date(barTimeSec * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * Worker `FamilySnapshot.date` is the MN1 bar open that triggered the snapshot
 * (month M); classification describes the month that just completed (M-1).
 * Map rows onto that prior calendar month so MN1 candles line up.
 */
export function ymClosedMonthFromRowDate(rowDateYm: string): string {
  const [yStr, mStr] = rowDateYm.split('-')
  const y = Number(yStr)
  const m = Number(mStr)
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return rowDateYm
  const d = new Date(Date.UTC(y, m - 1, 1))
  d.setUTCMonth(d.getUTCMonth() - 1)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * `YYYY-MM` used to join `buildFamilyRowByTfYm` to a bar for the selected family TF.
 * MN1 rows are keyed by the **prior** calendar month (closed month); intraday bars
 * use the bar’s open month in UTC, then step back one month for the key.
 */
export function ymForFamilyLookup(barTimeSec: number, selTf: FamilyTF): string {
  const ymb = ymFromBarTime(barTimeSec)
  if (selTf === 'MN1') return ymClosedMonthFromRowDate(ymb)
  return ymb
}

/** Resolve one family row for a bar timestamp and selected TF. */
export function resolveFamilyForBar(
  rowByTfYm: Map<string, FamilySnapshot>,
  barTimeSec: number,
  selTf: FamilyTF,
): FamilySnapshot | undefined {
  const key = `${selTf}|${ymForFamilyLookup(barTimeSec, selTf)}`
  return rowByTfYm.get(key)
}

/** Index key `${tf}|${closedYm}` → snapshot (same rules as family overlay). */
export function buildFamilyRowByTfYm(rows: FamilySnapshot[]): Map<string, FamilySnapshot> {
  const famTfSet = new Set<string>(FAMILY_TFS)
  const rowByTfYm = new Map<string, FamilySnapshot>()
  for (const row of rows) {
    if (!famTfSet.has(row.tf)) continue
    const rowYm = row.date.trim().slice(0, 7)
    if (rowYm.length !== 7) continue
    const closedYm = row.tf === 'MN1' ? ymClosedMonthFromRowDate(rowYm) : rowYm
    rowByTfYm.set(`${row.tf}|${closedYm}`, row)
  }
  return rowByTfYm
}
