/**
 * DataTable.tsx — shared virtual table component
 * ------------------------------------------------
 * Features
 * - auto column detection
 * - auto column width inference
 * - virtualized rows
 * - sorting
 * - global search
 * - column visibility selector
 * - per-column value filters (click ▾ on header)
 */

import { useState, useMemo, useRef, useEffect, useCallback, useDeferredValue } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { theme, InfoTip, DatasetSkeleton } from '../../design-system'
import { escape } from 'arquero'
import type { ColumnTable as AqTable } from 'arquero'


const MIN_COL_W = 1
const MAX_COL_W = 320
const CHAR_PX = 7
const MARK_COL_W = 34
const ROW_MARKS_PREFIX = 'dataset_row_marks_v1:'


/* ------------------------------------------------ */
/* helpers */
/* ------------------------------------------------ */

function stringifyValue(v: unknown) {
  if (v == null) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function getRowContentKey(row: Record<string, unknown>): string {
  const keys = Object.keys(row)
  const parts: string[] = []
  for (let i = 0; i < Math.min(10, keys.length); i++) {
    const v = row[keys[i]]
    parts.push(typeof v === 'string' ? v : JSON.stringify(v))
  }
  return parts.join('|')
}

function getRowMarkId(row: Record<string, unknown>, index: number): string {
  const keys = Object.keys(row)
  const parts = [String(index)]
  for (let i = 0; i < Math.min(3, keys.length); i++) {
    const v = row[keys[i]]
    parts.push(typeof v === 'string' ? v : JSON.stringify(v))
  }
  return parts.join('|')
}

function findPairSymbol(row: Record<string, unknown>): string | undefined {
  const keys = Object.keys(row)
  const match = keys.find(k => k.toLowerCase() === 'pair')
    ?? keys.find(k => k.toLowerCase().includes('pair'))
  if (!match) return undefined
  const v = row[match]
  if (v == null) return undefined
  const s = typeof v === 'string' ? v : String(v)
  const trimmed = s.trim()
  return trimmed ? trimmed.toUpperCase() : undefined
}

export function isTimestamp(col: string, v: unknown) {
  return (
    (col === 'time' || col === 'timestamp' || col.endsWith('_time') || col.endsWith('_at') || col.endsWith('_datetime')) &&
    typeof v === 'number' &&
    v > 8e8 && v < 1e11
  )
}

export function isDateString(col: string, v: unknown) {
  if (typeof v !== 'string' || v.length < 8) return false
  const isDateCol = (
    col === 'datetime' || col === 'date' || col === 'time' || col === 'timestamp' ||
    col.endsWith('_time') || col.endsWith('_at') || col.endsWith('_date') || col.endsWith('_datetime')
  )
  if (!isDateCol) return false
  const ts = Date.parse(v)
  return !isNaN(ts) && ts > 8e11 && ts < 1e14
}

export function parseDateTimeValue(col: string, v: unknown): number | null {
  if (isTimestamp(col, v)) return v as number
  if (isDateString(col, v)) {
    const s = v as string
    const utc = /[Zz]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s) ? s : s + 'Z'
    return Math.floor(Date.parse(utc) / 1000)
  }
  if (typeof v === 'number' && v > 8e8 && v < 1e11) return v
  if (typeof v === 'string' && v.length >= 8) {
    const utc = /[Zz]$/.test(v) || /[+-]\d{2}:?\d{2}$/.test(v) ? v : v + 'Z'
    const ts = Date.parse(utc)
    if (!isNaN(ts) && ts > 8e11 && ts < 1e14) return Math.floor(ts / 1000)
  }
  return null
}

export function formatValue(col: string, v: unknown) {
  if (isTimestamp(col, v)) {
    return new Date((v as number) * 1000)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19)
  }
  if (isDateString(col, v)) {
    return v as string
  }
  return stringifyValue(v)
}

function getCellColor(col: string, v: unknown) {
  const s = stringifyValue(v).toLowerCase()
  if (s.includes('allowed')) return theme.colors.accent.green
  if (s.includes('cancel')) return theme.colors.accent.red
  if (isTimestamp(col, v) || isDateString(col, v)) return theme.colors.accent.yellow
  if (typeof v === 'number') return theme.colors.text.link
  return theme.colors.text.primary
}


/* ------------------------------------------------ */
/* column inference */
/* ------------------------------------------------ */

export function inferColumns(rows: Record<string, unknown>[]): string[] {
  const seen = new Set<string>()
  const sample = rows.length > 200 ? rows.slice(0, 200) : rows
  for (const row of sample) {
    for (const k of Object.keys(row)) seen.add(k)
  }
  return Array.from(seen)
}


/* ------------------------------------------------ */
/* column width inference */
/* ------------------------------------------------ */

function inferColumnWidths(
  rows: Record<string, unknown>[],
  cols: string[]
): Record<string, number> {
  const sample = rows.length > 300 ? rows.slice(0, 300) : rows
  const widths: Record<string, number> = {}
  for (const col of cols) {
    let maxLen = col.length
    for (const row of sample) {
      const v = row[col]
      const str = isTimestamp(col, v) ? '0000-00-00 00:00:00' : stringifyValue(v)
      if (str.length > maxLen) maxLen = str.length
    }
    const px = maxLen * CHAR_PX + 24
    widths[col] = Math.max(MIN_COL_W, Math.min(MAX_COL_W, px))
  }
  return widths
}


/* ------------------------------------------------ */
/* table component */
/* ------------------------------------------------ */

export function JsonTableViewer({ rows, aqTable, arrayKeys, activeKey, onKeyChange, totals, enableRowMarks, rowMarksKey, onNavigateToDate, onEndReached, filterResetKey, virtualizeColumns = false, loadingMore = false, hasMoreRows = false }: {
  rows: Record<string, unknown>[]
  aqTable?: AqTable | null
  arrayKeys?: string[]
  activeKey?: string | null
  onKeyChange?: (k: string) => void
  totals?: Record<string, number>
  enableRowMarks?: boolean
  rowMarksKey?: string
  onNavigateToDate?: (ts: number, anchorEl: HTMLElement, symbol?: string) => void
  onEndReached?: () => void
  filterResetKey?: string
  virtualizeColumns?: boolean
  loadingMore?: boolean
  hasMoreRows?: boolean
}) {

  const [search, setSearch] = useState('')
  const [debSearch, setDebSearch] = useState('')
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Expression filter (typed in f(x) input, applied on Run / Enter)
  const [exprFilter, setExprFilter] = useState('')
  const [activeExpr, setActiveExpr] = useState('')
  const [exprError, setExprError] = useState<string | null>(null)
  const exprInputRef = useRef<HTMLInputElement>(null)

  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({})
  const [showColMenu, setShowColMenu] = useState(false)

  // Per-column value filters: col → Set of allowed display strings (empty = no filter)
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({})
  const [filterCol, setFilterCol] = useState<string | null>(null)
  const [filterPos, setFilterPos] = useState({ top: 0, left: 0 })
  const [filterSearch, setFilterSearch] = useState('')
  const filterMenuRef = useRef<HTMLDivElement>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  // Fill an initially short viewport, but don't exhaust the source just because
  // a local filter hides loaded rows. Further reads follow actual scrolling.
  useEffect(() => {
    if (!onEndReached || search || activeExpr || Object.values(columnFilters).some(values => values.size)) return
    const frame = requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el && el.clientHeight > 0 && el.scrollHeight <= el.clientHeight + 1) onEndReached()
    })
    return () => cancelAnimationFrame(frame)
  }, [rows.length, onEndReached, search, activeExpr, columnFilters])
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const marksStorageKey = enableRowMarks && rowMarksKey ? `${ROW_MARKS_PREFIX}${rowMarksKey}` : null
  const [markedRows, setMarkedRows] = useState<Set<string>>(new Set())


  /* columns */

  const columns = useMemo(
    () => aqTable ? aqTable.columnNames() : inferColumns(rows),
    [rows, aqTable]
  )

  const colWidths = useMemo(
    () => {
      if (aqTable) {
        const sampleRows: Record<string, unknown>[] = []
        const limit = Math.min(300, aqTable.numRows())
        for (let i = 0; i < limit; i++) {
          sampleRows.push(aqTable.object(i) as Record<string, unknown>)
        }
        return inferColumnWidths(sampleRows, columns)
      }
      return inferColumnWidths(rows, columns)
    },
    [rows, aqTable, columns]
  )

  useEffect(() => {
    setVisibleCols(prev => {
      const next: Record<string, boolean> = {}
      for (const c of columns) next[c] = prev[c] ?? true
      return next
    })
  }, [columns])

  const displayedCols = useMemo(
    () => columns.filter(c => visibleCols[c]),
    [columns, visibleCols]
  )

  const tableW = useMemo(
    () => displayedCols.reduce((sum, c) => sum + colWidths[c], enableRowMarks ? MARK_COL_W : 0),
    [displayedCols, colWidths, enableRowMarks]
  )

  // Wide selected tables retain all data/controls, but mount only the columns
  // near the horizontal viewport, using the existing scroll container.
  const virtualColumns = virtualizeColumns && displayedCols.length > 50
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    enabled: virtualColumns,
    count: displayedCols.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: index => colWidths[displayedCols[index]],
    getItemKey: index => displayedCols[index],
    paddingStart: enableRowMarks ? MARK_COL_W : 0,
    overscan: 3,
  })
  useEffect(() => { columnVirtualizer.measure() }, [columnVirtualizer, colWidths, displayedCols])
  const columnItems = columnVirtualizer.getVirtualItems()
  const renderedCols = virtualColumns ? columnItems.map(item => displayedCols[item.index]) : displayedCols
  const leadingWidth = virtualColumns ? Math.max(0, (columnItems[0]?.start ?? 0) - (enableRowMarks ? MARK_COL_W : 0)) : 0
  const trailingWidth = virtualColumns ? Math.max(0, tableW - (columnItems[columnItems.length - 1]?.end ?? 0)) : 0

  const rowMarkIds = useMemo(() => {
    const map = new Map<string, string>()
    for (let i = 0; i < rows.length; i++) {
      const key = getRowContentKey(rows[i])
      map.set(key, getRowMarkId(rows[i], i))
    }
    return map
  }, [rows])

  useEffect(() => {
    if (!marksStorageKey) {
      setMarkedRows(new Set())
      return
    }
    try {
      const raw = localStorage.getItem(marksStorageKey)
      const parsed = raw ? JSON.parse(raw) : []
      setMarkedRows(new Set(Array.isArray(parsed) ? parsed.filter(v => typeof v === 'string') : []))
    } catch {
      setMarkedRows(new Set())
    }
  }, [marksStorageKey])

  useEffect(() => {
    if (!marksStorageKey) return
    try {
      localStorage.setItem(marksStorageKey, JSON.stringify(Array.from(markedRows)))
    } catch {
      // Ignore quota issues for row marks.
    }
  }, [markedRows, marksStorageKey])


  /* unique values per column (lazy — computed on demand when filter dropdown opens) */

  const [uniqueValues, setUniqueValues] = useState<Record<string, string[]>>({})

  useEffect(() => {
    setUniqueValues({})
  }, [rows, aqTable])

  const computeUniqueValues = useCallback((col: string) => {
    if (uniqueValues[col]) return
    if (aqTable) {
      const colData = aqTable.array(col) as unknown[]
      const seen = new Set<string>()
      for (const v of colData) seen.add(formatValue(col, v))
      const arr = Array.from(seen)
      const result = arr.length > 200 ? arr : arr.sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      )
      setUniqueValues(prev => ({ ...prev, [col]: result }))
    } else {
      const seen = new Set<string>()
      for (const row of rows) seen.add(formatValue(col, row[col]))
      const arr = Array.from(seen)
      const result = arr.length > 200 ? arr : arr.sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      )
      setUniqueValues(prev => ({ ...prev, [col]: result }))
    }
  }, [rows, aqTable, uniqueValues])


  /* search debounce */

  const handleSearch = (val: string) => {
    setSearch(val)
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => setDebSearch(val), 150)
  }


  const deferredSearch = useDeferredValue(debSearch)

  /* expression filter */

  const runExpr = () => {
    if (!exprFilter.trim()) {
      setActiveExpr('')
      setExprError(null)
      return
    }
    if (aqTable) {
      try {
        // Test-parse: Arquero throws on invalid expressions
        aqTable.filter(exprFilter.trim()).numRows()
        setActiveExpr(exprFilter.trim())
        setExprError(null)
      } catch (e) {
        setExprError(`f(x) error: ${(e as Error).message}`)
      }
    } else {
      try {
        new Function('d', `return ${exprFilter.trim()}`)
        setActiveExpr(exprFilter.trim())
        setExprError(null)
      } catch (e) {
        setExprError(`f(x) error: ${(e as Error).message}`)
      }
    }
  }

  /* filtering + sorting */

  const filteredRows = useMemo(() => {
    if (aqTable) {
      let t = aqTable
      const cols = aqTable.columnNames()

      // Expression filter (applied first — most selective)
      if (activeExpr) {
        try {
          t = t.filter(activeExpr)
        } catch {
          // If it somehow fails at runtime (shouldn't since runExpr validated), skip
        }
      }

      if (deferredSearch.trim()) {
        const q = deferredSearch.toLowerCase()
        t = t.filter(escape((d: any) => cols.some((c: string) => stringifyValue(d[c]).toLowerCase().includes(q))))
      }

      for (const [col, allowed] of Object.entries(columnFilters)) {
        if (!allowed || allowed.size === 0) continue
        t = t.filter(escape((d: any) => allowed.has(formatValue(col, d[col]))))
      }

      const n = t.numRows()
      const result: Record<string, unknown>[] = []
      for (let i = 0; i < n; i++) {
        result.push(t.object(i) as Record<string, unknown>)
      }

      if (sortCol) {
        const col = sortCol
        const dir = sortDir
        result.sort((a, b) => {
          const av = a[col] ?? ''
          const bv = b[col] ?? ''
          const cmp =
            (typeof av === 'number' && typeof bv === 'number')
              ? av - bv
              : stringifyValue(av).localeCompare(
                stringifyValue(bv),
                undefined,
                { numeric: true }
              )
          return dir === 'asc' ? cmp : -cmp
        })
      }

      return result
    }

    // Fallback: plain arrays
    let r = rows

    // Expression filter (applied first — most selective)
    if (activeExpr) {
      try {
        const fn = new Function('d', `return ${activeExpr}`) as (d: Record<string, unknown>) => boolean
        r = r.filter(row => fn(row))
      } catch {
        // Runtime error — skip expression filter
      }
    }

    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase()
      r = r.filter(row =>
        columns.some(c => stringifyValue(row[c]).toLowerCase().includes(q))
      )
    }

    for (const [col, allowed] of Object.entries(columnFilters)) {
      if (!allowed || allowed.size === 0) continue
      r = r.filter(row => allowed.has(formatValue(col, row[col])))
    }

    if (sortCol) {
      const col = sortCol
      const dir = sortDir
      r = [...r].sort((a, b) => {
        const av = a[col] ?? ''
        const bv = b[col] ?? ''
        const cmp =
          (typeof av === 'number' && typeof bv === 'number')
            ? av - bv
            : stringifyValue(av).localeCompare(
              stringifyValue(bv),
              undefined,
              { numeric: true }
            )
        return dir === 'asc' ? cmp : -cmp
      })
    }

    return r
  }, [rows, aqTable, activeExpr, deferredSearch, columnFilters, sortCol, sortDir, columns])


  /* virtualizer */

  const virtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 28,
    overscan: 20,
  })


  /* sorting */

  const handleColClick = (col: string) => {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortCol(null); setSortDir('asc') }
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }


  /* column toggle */

  const toggleColumn = (col: string) => {
    setVisibleCols(v => ({ ...v, [col]: !v[col] }))
  }


  /* column filter */

  const openFilter = (col: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (filterCol === col) { setFilterCol(null); return }
    computeUniqueValues(col)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setFilterCol(col)
    setFilterPos({ top: rect.bottom + 4, left: rect.left })
    setFilterSearch('')
  }

  const toggleFilterValue = (col: string, val: string) => {
    setColumnFilters(prev => {
      const current = new Set(prev[col] ?? uniqueValues[col] ?? [])
      // On first interaction, start with all selected then deselect clicked
      if (!prev[col]) {
        // first click: deselect only this value (keep all others)
        const all = new Set(uniqueValues[col] ?? [])
        all.delete(val)
        return { ...prev, [col]: all }
      }
      if (current.has(val)) current.delete(val)
      else current.add(val)
      return { ...prev, [col]: new Set(current) }
    })
  }

  const selectAll = (col: string) => {
    setColumnFilters(prev => {
      const next = { ...prev }
      delete next[col]
      return next
    })
  }

  const clearAll = (col: string) => {
    setColumnFilters(prev => ({ ...prev, [col]: new Set() }))
  }

  const hasFilter = (col: string) => {
    const f = columnFilters[col]
    return f !== undefined && f.size < (uniqueValues[col]?.length ?? Infinity)
  }

  // Close filter menu on outside click
  useEffect(() => {
    if (!filterCol) return
    const handler = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setFilterCol(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterCol])

  // Continuous tables append rows within one dataset. Other callers retain
  // their existing row-change reset; explicit dataset keys reset only on reload.
  useEffect(() => {
    setColumnFilters({})
    setFilterCol(null)
    setExprFilter('')
    setActiveExpr('')
    setExprError(null)
  }, [filterResetKey ?? rows])

  const activeFilterCount = Object.values(columnFilters).filter(s => s && s.size > 0).length

  const toggleRowMark = (row: Record<string, unknown>) => {
    if (!enableRowMarks) return
    const contentKey = getRowContentKey(row)
    const markId = rowMarkIds.get(contentKey)
    if (!markId) return
    setMarkedRows(prev => {
      const next = new Set(prev)
      if (next.has(markId)) next.delete(markId)
      else next.add(markId)
      return next
    })
  }

  const clearRowMarks = () => setMarkedRows(new Set())


  return (

    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 6 }}>

      {/* array key tabs */}
      {arrayKeys && arrayKeys.length > 1 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {arrayKeys.map(k => (
            <button
              key={k}
              onClick={() => onKeyChange?.(k)}
              style={{
                background: k === activeKey ? `${theme.colors.accent.green}18` : theme.colors.bg.deep,
                border: `1px solid ${k === activeKey ? theme.colors.accent.green : theme.colors.border.strong}`,
                borderRadius: 4,
                color: k === activeKey ? theme.colors.accent.green : theme.colors.text.muted,
                padding: '3px 10px',
                fontSize: 10,
                cursor: 'pointer'
              }}
            >
              {k}{totals?.[`${k}_total`] != null ? ` (${totals[`${k}_total`]})` : ''}
            </button>
          ))}
        </div>
      )}

      {/* toolbar */}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>

        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder={`Search ${filteredRows.length}${filteredRows.length !== rows.length ? `/${rows.length}` : ''} rows`}
          style={{
            flex: '0 1 220px',
            background: theme.colors.bg.deep,
            border: `1px solid ${theme.colors.border.strong}`,
            borderRadius: 4,
            color: theme.colors.text.primary,
            padding: '4px 10px',
            fontSize: 11,
            fontFamily: theme.fonts.mono,
          }}
        />

        {/* expression filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: theme.colors.text.dimmer, fontFamily: theme.fonts.mono, userSelect: 'none' }}>f(x)</span>
            <InfoTip text={`Filter rows with a JS boolean expression. Column names = variables (e.g. sweep_50, pair, tf, divergence_bb). Press Run or Enter to apply. \u2192 sweep_50 && tf === 'MN1' \u2192 divergence_bb < 0.5 \u2192 pair === 'EURUSD' && dir === 'buy'`} />
            <input
              ref={exprInputRef}
              value={exprFilter}
              onChange={e => { setExprFilter(e.target.value); setExprError(null) }}
              onKeyDown={e => { if (e.key === 'Enter') runExpr() }}
              placeholder={`Filter expression…`}
              style={{
                flex: 1,
                minWidth: 200,
                background: theme.colors.bg.deep,
                border: `1px solid ${exprError ? theme.colors.accent.red : activeExpr ? theme.colors.accent.green : theme.colors.border.strong}`,
                borderRadius: 4,
                color: theme.colors.text.primary,
                padding: '4px 8px',
                fontSize: 11,
                fontFamily: theme.fonts.mono,
              }}
            />
            <button
              onClick={runExpr}
              style={{
                background: activeExpr ? `${theme.colors.accent.green}18` : theme.colors.bg.deep,
                border: `1px solid ${activeExpr ? theme.colors.accent.green : theme.colors.border.strong}`,
                borderRadius: 4,
                color: activeExpr ? theme.colors.accent.green : theme.colors.text.muted,
                padding: '4px 10px',
                fontSize: 10,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Run
            </button>
            {activeExpr && (
              <button
                onClick={() => { setExprFilter(''); setActiveExpr(''); setExprError(null) }}
                title="Clear expression filter"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.colors.text.muted,
                  fontSize: 14,
                  cursor: 'pointer',
                  padding: '0 2px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </div>
          {exprError && (
            <div style={{ fontSize: 9, color: theme.colors.accent.red, fontFamily: theme.fonts.mono, paddingLeft: 0 }}>
              {exprError}
            </div>
          )}
        </div>

        {/* active filter badge */}
        {activeFilterCount > 0 && (
          <button
            onClick={() => setColumnFilters({})}
            title="Clear all column filters"
            style={{
              background: `${theme.colors.accent.green}18`,
              border: `1px solid ${theme.colors.accent.green}66`,
              borderRadius: 4,
              color: theme.colors.accent.green,
              padding: '4px 8px',
              fontSize: 10,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} ×
          </button>
        )}

        {enableRowMarks && markedRows.size > 0 && (
          <button
            onClick={clearRowMarks}
            title="Clear treated marks for this dataset"
            style={{
              background: `${theme.colors.accent.green}18`,
              border: `1px solid ${theme.colors.accent.green}77`,
              borderRadius: 4,
              color: theme.colors.accent.green,
              padding: '4px 8px',
              fontSize: 10,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {markedRows.size} marked ×
          </button>
        )}

        {/* column selector */}

        <div style={{ position: 'relative' }}>

          <button
            onClick={() => setShowColMenu(v => !v)}
            style={{
              background: theme.colors.bg.deep,
              border: `1px solid ${theme.colors.border.strong}`,
              borderRadius: 4,
              color: theme.colors.text.muted,
              padding: '4px 10px',
              fontSize: 11,
              cursor: 'pointer'
            }}
          >
            Columns ▾
          </button>

          {showColMenu && (

            <div
              style={{
                position: 'absolute',
                top: 26,
                right: 0,
                background: theme.colors.bg.deep,
                border: `1px solid ${theme.colors.border.strong}`,
                borderRadius: 6,
                padding: 10,
                width: 240,
                maxHeight: 320,
                overflow: 'auto',
                zIndex: 10,
                boxShadow: theme.shadows.tooltip
              }}
            >

              <div style={{ fontSize: 11, color: theme.colors.text.muted, marginBottom: 8 }}>
                Toggle columns
              </div>

              {columns.map(col => (

                <label
                  key={col}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 0',
                    fontSize: 11,
                    color: theme.colors.text.primary,
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={visibleCols[col] ?? true}
                    onChange={() => toggleColumn(col)}
                  />
                  {col}
                </label>

              ))}

            </div>

          )}

        </div>

      </div>


      {/* table */}

      <div
        ref={scrollRef}
        onScroll={onEndReached ? event => {
          const el = event.currentTarget
          if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) onEndReached()
        } : undefined}
        style={{
          flex: 1,
          overflow: 'auto',
          border: `1px solid ${theme.colors.border.grid}`,
          borderRadius: 4
        }}
      >

        {/* header */}

        <div
          style={{
            position: 'sticky',
            top: 0,
            display: 'flex',
            background: theme.colors.bg.surface,
            borderBottom: `1px solid ${theme.colors.border.strong}`,
            minWidth: tableW,
            zIndex: 2,
          }}
        >

          {enableRowMarks && (
            <div
              style={{
                width: MARK_COL_W,
                minWidth: MARK_COL_W,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: `1px solid ${theme.colors.border.grid}`,
                color: theme.colors.text.muted,
                fontSize: 10,
                fontWeight: 700,
              }}
              title="Treated"
            >
              ✓
            </div>
          )}

          {leadingWidth > 0 && <div aria-hidden="true" style={{ flex: `0 0 ${leadingWidth}px` }} />}
          {renderedCols.map(col => {
            const filtered = hasFilter(col)
            return (
              <div
                key={col}
                style={{
                  width: colWidths[col],
                  minWidth: colWidths[col],
                  display: 'flex',
                  alignItems: 'center',
                  borderRight: `1px solid ${theme.colors.border.grid}`,
                  overflow: 'hidden',
                }}
              >
                {/* sort area */}
                <div
                  onClick={() => handleColClick(col)}
                  style={{
                    flex: 1,
                    padding: '5px 4px 5px 8px',
                    fontSize: 10,
                    fontWeight: 700,
                    color: sortCol === col ? theme.colors.accent.green : theme.colors.text.muted,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                  }}
                >
                  {col}
                  {sortCol === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </div>

                {/* filter toggle */}
                <div
                  onClick={e => openFilter(col, e)}
                  title={filtered ? 'Filter active — click to edit' : 'Filter values'}
                  style={{
                    flexShrink: 0,
                    padding: '4px 5px',
                    fontSize: 9,
                    cursor: 'pointer',
                    color: filtered ? theme.colors.accent.green : theme.colors.text.dimmer,
                    fontWeight: filtered ? 700 : 400,
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                >
                  {filtered ? '⬤' : '▾'}
                </div>
              </div>
            )
          })}

          {trailingWidth > 0 && <div aria-hidden="true" style={{ flex: `0 0 ${trailingWidth}px` }} />}

        </div>


        {/* rows */}

        <div
          style={{
            height: virtualizer.getTotalSize(),
            position: 'relative',
            minWidth: tableW
          }}
        >

          {virtualizer.getVirtualItems().map(vRow => {

            const row = filteredRows[vRow.index]
            const contentKey = getRowContentKey(row)
            const markId = rowMarkIds.get(contentKey)
            const isMarked = !!markId && markedRows.has(markId)

            const zebra =
              vRow.index % 2 === 0
                ? theme.colors.bg.primary
                : theme.colors.bg.secondary

            return (

              <div
                key={vRow.key}
                style={{
                  position: 'absolute',
                  top: vRow.start,
                  left: 0,
                  width: '100%',
                  height: vRow.size,
                  display: 'flex',
                  alignItems: 'center',
                  background: isMarked ? `${theme.colors.accent.green}2e` : zebra,
                  borderBottom: `1px solid ${theme.colors.border.subtle}`,
                  borderLeft: isMarked ? `2px solid ${theme.colors.accent.green}` : '2px solid transparent',
                  minWidth: tableW
                }}
              >

                {enableRowMarks && (
                  <div
                    style={{
                      width: MARK_COL_W,
                      minWidth: MARK_COL_W,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRight: `1px solid ${theme.colors.border.subtle}`,
                    }}
                  >
                    <button
                      onClick={() => toggleRowMark(row)}
                      title={isMarked ? 'Unmark row' : 'Mark row as treated'}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: `1px solid ${isMarked ? `${theme.colors.accent.green}aa` : theme.colors.border.strong}`,
                        background: isMarked ? `${theme.colors.accent.green}18` : 'transparent',
                        color: isMarked ? theme.colors.accent.green : theme.colors.text.axisText,
                        fontSize: 10,
                        lineHeight: 1,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {isMarked ? '✓' : ''}
                    </button>
                  </div>
                )}

                {leadingWidth > 0 && <div aria-hidden="true" style={{ flex: `0 0 ${leadingWidth}px` }} />}
                {renderedCols.map(col => {

                  const v = row[col]
                  const str = formatValue(col, v)
                  const clr = getCellColor(col, v)
                  const ts = onNavigateToDate ? parseDateTimeValue(col, v) : null
                  const showNav = ts !== null && onNavigateToDate

                  return (

                    <div
                      key={col}
                      title={str}
                      style={{
                        width: colWidths[col],
                        minWidth: colWidths[col],
                        padding: '0 8px',
                        fontSize: 10,
                        color: clr,
                        fontFamily: theme.fonts.mono,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        borderRight: `1px solid ${theme.colors.border.subtle}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      {showNav && (
                        <span
                          onClick={e => { e.stopPropagation(); onNavigateToDate!(ts!, e.currentTarget as HTMLElement, findPairSymbol(row)) }}
                          title={`Navigate charts to ${str}`}
                          style={{
                            cursor: 'pointer',
                            fontSize: 11,
                            lineHeight: 1,
                            flexShrink: 0,
                            color: theme.colors.text.link,
                            transition: 'color 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = theme.colors.accent.yellow }}
                          onMouseLeave={e => { e.currentTarget.style.color = theme.colors.text.link }}
                        >
                          ↗
                        </span>
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{str}</span>
                    </div>

                  )

                })}

                {trailingWidth > 0 && <div aria-hidden="true" style={{ flex: `0 0 ${trailingWidth}px` }} />}

              </div>

            )

          })}

        </div>

        {hasMoreRows && <div style={{ height: 84, position: 'sticky', left: 0 }}>{loadingMore && <DatasetSkeleton label="Loading more rows" />}</div>}
      </div>

      {/* ── Column filter dropdown (fixed-position overlay) ── */}
      {filterCol && (
        <div
          ref={filterMenuRef}
          style={{
            position: 'fixed',
            top: filterPos.top,
            left: filterPos.left,
            background: theme.colors.bg.card,
            border: `1px solid ${theme.colors.border.strong}`,
            borderRadius: 6,
            padding: '8px 0',
            width: 220,
            maxHeight: 340,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            boxShadow: theme.shadows.dropdown,
          }}
        >
          {/* header */}
          <div style={{ padding: '0 10px 6px', borderBottom: `1px solid ${theme.colors.border.grid}`, marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: theme.colors.text.muted, marginBottom: 6 }}>
              Filter: <span style={{ color: theme.colors.text.primary }}>{filterCol}</span>
            </div>
            <input
              autoFocus
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              placeholder="Search values…"
              style={{
                width: '100%',
                background: theme.colors.bg.deep,
                border: `1px solid ${theme.colors.border.strong}`,
                borderRadius: 4,
                color: theme.colors.text.primary,
                padding: '3px 7px',
                fontSize: 10,
                fontFamily: theme.fonts.mono,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* select all / clear */}
          <div style={{ display: 'flex', gap: 6, padding: '0 10px 6px', borderBottom: `1px solid ${theme.colors.border.grid}`, marginBottom: 4 }}>
            <button
              onClick={() => selectAll(filterCol)}
              style={{
                flex: 1, background: 'transparent', border: `1px solid ${theme.colors.border.strong}`,
                borderRadius: 4, color: theme.colors.text.muted, fontSize: 10, padding: '2px 0', cursor: 'pointer',
              }}
            >
              Select all
            </button>
            <button
              onClick={() => clearAll(filterCol)}
              style={{
                flex: 1, background: 'transparent', border: `1px solid ${theme.colors.border.strong}`,
                borderRadius: 4, color: theme.colors.text.muted, fontSize: 10, padding: '2px 0', cursor: 'pointer',
              }}
            >
              Clear all
            </button>
          </div>

          {/* value list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {(uniqueValues[filterCol] ?? [])
              .filter(v => !filterSearch || v.toLowerCase().includes(filterSearch.toLowerCase()))
              .map(val => {
                const activeFilter = columnFilters[filterCol]
                const checked = !activeFilter || activeFilter.has(val)
                return (
                  <label
                    key={val}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '3px 10px',
                      fontSize: 10,
                      color: checked ? theme.colors.text.primary : theme.colors.text.dimmer,
                      cursor: 'pointer',
                      fontFamily: theme.fonts.mono,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = theme.colors.bg.hover)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFilterValue(filterCol, val)}
                      style={{ cursor: 'pointer', accentColor: theme.colors.accent.green }}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {val === '' ? <em style={{ color: theme.colors.text.dimmer }}>empty</em> : val}
                    </span>
                  </label>
                )
              })}
          </div>
        </div>
      )}

    </div>

  )
}
