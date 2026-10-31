/**
 * Shared dataset response helpers — used by DatasetsTab.
 */

export const PAGE_SIZE = 5000

// ── Response shape interfaces ────────────────────────────────────────────────

interface PaginatedList {
  __type: 'paginated_list'
  rows: Record<string, unknown>[]
  total: number
  offset: number
  limit: number
}

interface ObjectWithMeta {
  __meta: { offset: number; limit: number; [key: string]: number }
  [key: string]: unknown
}

export interface ColumnarList {
  __type: 'columnar_list'
  columns: string[]
  rows: unknown[][]
  total: number
  offset: number
  limit: number
  meta?: Record<string, unknown>
}

// ── Type guards ──────────────────────────────────────────────────────────────

export function isPaginatedList(d: unknown): d is PaginatedList {
  return typeof d === 'object' && d !== null && (d as PaginatedList).__type === 'paginated_list'
}

export function hasMetaKey(d: unknown): d is ObjectWithMeta {
  return typeof d === 'object' && d !== null && '__meta' in (d as object)
}

export function isColumnarList(d: unknown): d is ColumnarList {
  return typeof d === 'object' && d !== null && (d as ColumnarList).__type === 'columnar_list'
}

// ── Extract table data ───────────────────────────────────────────────────────

export interface TableData {
  rows: Record<string, unknown>[]
  arrayKey: string | null
  arrayKeys: string[]
  totals: Record<string, number>
  meta: Record<string, string>
}

/**
 * Extract table-able rows from any shape the backend may return.
 *
 *  - paginated_list  → rows directly
 *  - object-of-arrays (BB data: {symbol, series_15m:[…], series_5m:[…], __meta})
 *      → list all array keys; default to first one; tabs let user switch
 *  - plain array of objects → rows directly
 */
export function extractTableData(data: unknown, preferKey?: string): TableData | null {
  if (data == null) return null

  // 1. Plain array of objects
  if (Array.isArray(data)) {
    if (data.length === 0 || typeof data[0] !== 'object' || data[0] === null) return null
    return { rows: data as Record<string, unknown>[], arrayKey: null, arrayKeys: [], totals: {}, meta: {} }
  }

  // 2. Paginated list response
  if (isPaginatedList(data)) {
    const totals: Record<string, number> = { rows: data.total }
    return { rows: data.rows, arrayKey: null, arrayKeys: [], totals, meta: {} }
  }

  // 3. Object (possibly with __meta from backend pagination)
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>
    const rawMeta = hasMetaKey(data) ? data.__meta : null

    const arrayKeys: string[] = []
    const metaFields: Record<string, string> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (k === '__meta') continue
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null) {
        arrayKeys.push(k)
      } else if (!Array.isArray(v) && typeof v !== 'object') {
        metaFields[k] = String(v)
      }
    }

    if (arrayKeys.length === 0) return null

    const activeKey = preferKey && arrayKeys.includes(preferKey) ? preferKey : arrayKeys[0]
    const rows = obj[activeKey] as Record<string, unknown>[]

    const totals: Record<string, number> = {}
    if (rawMeta) {
      for (const [k, v] of Object.entries(rawMeta)) {
        if (k !== 'offset' && k !== 'limit') totals[k] = v as number
      }
    }

    return { rows, arrayKey: activeKey, arrayKeys, totals, meta: metaFields }
  }

  return null
}

/**
 * Extract table data from parsed CSV rows (from csvParser.ts).
 * CSV rows are already flat Record<string, unknown> objects.
 */
export function extractTableDataFromCSV(
  rows: Record<string, unknown>[],
  meta?: Record<string, unknown>
): TableData | null {
  if (!rows || rows.length === 0) return null

  return {
    rows,
    arrayKey: null,
    arrayKeys: [],
    totals: { rows: rows.length },
    meta: meta ? Object.fromEntries(
      Object.entries(meta)
        .filter(([_, v]) => v == null || typeof v !== 'object')
        .map(([k, v]) => [k, String(v)])
    ) : {},
  }
}
