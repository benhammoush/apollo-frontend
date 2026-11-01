import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import JsonView from '@uiw/react-json-view'

import { JsonTableViewer } from '../datasets/DataTable'
import { hexWithAlpha, theme, DatasetSkeleton } from '../../design-system'
import { extractTableDataFromCSV, isColumnarList } from './datasetUtils'
import { fetchWithMeta } from '../../utils/fetchWithMeta'
import { parseCSVWithTypes, parseColumnarJSON, columnarToArquero } from '../../utils/csvParser'
import type { ColumnTable as AqTable } from 'arquero'
import { appendTablePage, tableManifest, tablePageUrl, type LoadedTable, type TableManifest } from '../../utils/datasetPaging'

export interface DatasetViewerTarget {
  title: string
  filePath: string
  url: string
}

const JSON_VIEW_STYLE = {
  fontSize: 11,
  fontFamily: theme.fonts.mono,
  lineHeight: 1.6,
  background: 'transparent',
  '--w-rjv-font-family': theme.fonts.mono,
  '--w-rjv-color': theme.colors.text.primary,
  '--w-rjv-background-color': theme.colors.bg.card,
  '--w-rjv-line-color': `${theme.colors.border.default}88`,
  '--w-rjv-arrow-color': theme.colors.text.muted,
  '--w-rjv-info-color': theme.colors.text.dimmer,
  '--w-rjv-curlybraces-color': theme.colors.text.dim,
  '--w-rjv-colon-color': theme.colors.text.dimmer,
  '--w-rjv-brackets-color': theme.colors.text.dim,
  '--w-rjv-key-string': theme.colors.accent.green,
  '--w-rjv-quotes-color': theme.colors.accent.green,
  '--w-rjv-type-string-color': theme.colors.text.link,
  '--w-rjv-type-int-color': theme.colors.accent.green,
  '--w-rjv-type-float-color': theme.colors.accent.green,
  '--w-rjv-type-bigint-color': theme.colors.accent.green,
  '--w-rjv-type-boolean-color': theme.colors.accent.orange,
  '--w-rjv-type-null-color': theme.colors.text.muted,
  '--w-rjv-type-undefined-color': theme.colors.text.muted,
} as CSSProperties

export default function DatasetViewerModal({
  target,
  onClose,
  embedded = false,
  onNavigateToDate,
}: {
  target: DatasetViewerTarget
  onClose: () => void
  embedded?: boolean
  onNavigateToDate?: (ts: number, anchorEl: HTMLElement, symbol?: string) => void
}) {
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [aqTable, setAqTable] = useState<AqTable | null>(null)
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [tableMode, setTable] = useState(true)
  const [retry, setRetry] = useState(0)
  const [manifest, setManifest] = useState<TableManifest | null>(null)
  const [nextOffset, setNextOffset] = useState<number | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState<string | null>(null)
  const loadMoreRef = useRef<(() => void) | null>(null)
  const loadMore = useCallback(() => loadMoreRef.current?.(), [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const loadData = useCallback(() => {
    setRetry(value => value + 1)
  }, [target.url])

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    loadMoreRef.current = null
    setTable(true)
    setLoading(true)
    setData([])
    setAqTable(null)
    setMetadata(null)
    setManifest(null)
    setNextOffset(null)
    setCopied(false)
    setError(null)
    setMoreError(null)
    setLoadingMore(false)

    const fetchChecked = async (url: string) => {
      const response = await fetchWithMeta(url, { signal: controller.signal, cache: 'no-store' }, { trigger: 'manual' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response
    }
    const run = async () => {
      let meta: Record<string, unknown> | null = null
      const metaUrl = target.url.replace('/storage/file', '/storage/meta')
      if (metaUrl !== target.url) {
        const response = await fetchWithMeta(metaUrl, { signal: controller.signal, cache: 'no-store' }, { trigger: 'manual' })
        if (response.ok) meta = await response.json()
        else if (response.status !== 404) throw new Error(`HTTP ${response.status}`)
      }
      if (cancelled) return
      const selected = tableManifest(meta)
      if (selected) {
        let loaded: LoadedTable = { rows: [], bytes: 0 }
        let busy = false
        let stopped = false
        const append = async () => {
          if (cancelled || busy || stopped) return
          busy = true
          if (loaded.rows.length) setLoadingMore(true)
          try {
            const response = await fetchChecked(tablePageUrl(target.url, selected, loaded.rows.length))
            const json = await response.json()
            if (cancelled) return
            const combined = appendTablePage(loaded, json, selected)
            const columnar = { __type: 'columnar_list' as const, columns: selected.fields,
              rows: combined.rows, total: selected.total, offset: 0, limit: combined.rows.length }
            const rows = parseColumnarJSON(columnar)
            const table = columnarToArquero(columnar)
            if (cancelled) return
            loaded = combined
            stopped = loaded.rows.length === selected.total
            setAqTable(table)
            setData(rows)
            setCopied(false)
            setMetadata(meta)
            setManifest(selected)
            setNextOffset(stopped ? null : loaded.rows.length)
          } catch (error) {
            if (!cancelled) {
              // Preserve loaded rows; never repeatedly retry a denied/bad page on scroll.
              stopped = true
              if (loaded.rows.length) setMoreError(`Loading stopped: ${(error as Error).message}`)
              else throw error
            }
          } finally {
            busy = false
            if (!cancelled) setLoadingMore(false)
          }
        }
        await append()
        if (!cancelled) loadMoreRef.current = () => { void append() }
        return
      }
      const isCSV = target.filePath.toLowerCase().endsWith('.csv')
      const url = isCSV ? `${target.url}${target.url.includes('?') ? '&' : '?'}format=json` : target.url
      const response = await fetchChecked(url)
      let json: unknown
      try { json = await response.json() } catch (error) {
        if (selected || !isCSV) throw error
      }
      if (cancelled) return
      if (json && typeof json === 'object' && 'paginated' in json && json.paginated === true) {
        throw new Error('Paginated dataset requires valid snapshot metadata')
      }
      if (isColumnarList(json)) {
        const rows = parseColumnarJSON(json)
        const table = columnarToArquero(json)
        if (cancelled) return
        setAqTable(table)
        setData(rows)
        setMetadata(meta ?? json.meta ?? null)
      } else if (isCSV && !selected) {
        // Legacy shape compatibility only: denied/paged requests never fall
        // back to a whole-file CSV request.
        const csv = await fetchChecked(target.url)
        const rows = parseCSVWithTypes(await csv.text())
        if (!cancelled) { setData(rows as Record<string, unknown>[]); setMetadata(meta) }
      } else {
        if (!Array.isArray(json)) throw new Error('Invalid dataset response')
        if (!cancelled) { setData(json); setMetadata(meta) }
      }
    }
    run().catch(error => {
      if (!cancelled && error.name !== 'AbortError') setError(`Error loading data: ${error.message}`)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; loadMoreRef.current = null; controller.abort() }
  }, [target.url, retry])

  const handleCopy = useCallback(() => {
    if (data.length === 0) return
    const str = JSON.stringify(data, null, 2)
    navigator.clipboard.writeText(str).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [data])

  const tableData = useMemo(() => {
    if (data.length === 0) return null
    const extracted = extractTableDataFromCSV(data, metadata || undefined)
    if (!extracted) return null
    return { ...extracted, rows: data }
  }, [data, metadata])

  const headerInfo = useMemo(() => {
    if (manifest) return `${manifest.total.toLocaleString()} rows · ${manifest.fields.length.toLocaleString()} cols`
    if (!tableData) return null
    const total = tableData.totals.rows ?? tableData.rows.length
    const cols = Object.keys(tableData.rows[0] ?? {}).length
    return `${total.toLocaleString()} rows · ${cols} cols`
  }, [tableData, manifest])



  const showTable = tableMode && tableData !== null

  const innerContent = (
    <>
      <div style={{ padding: '12px 16px 10px', borderBottom: `1px solid ${theme.colors.border.grid}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.text.primary }}>{target.title}</div>
          <div style={{ fontSize: 10, color: theme.colors.text.dimmer, fontFamily: theme.fonts.mono, marginTop: 2 }}>
            {target.filePath}
            {headerInfo && <span style={{ marginLeft: 10, color: theme.colors.text.muted }}>{headerInfo}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {tableData && (
            <button onClick={() => setTable(t => !t)} style={{ background: 'transparent', border: `1px solid ${theme.colors.border.strong}`, borderRadius: 4, color: theme.colors.text.muted, fontSize: 10, padding: '3px 10px', cursor: 'pointer' }}>
              {showTable ? 'JSON Tree' : 'Table'}
            </button>
          )}
          <button onClick={handleCopy} disabled={data.length === 0 || loading} style={{ background: 'transparent', border: `1px solid ${copied ? hexWithAlpha(theme.colors.accent.green, 0.6) : theme.colors.border.strong}`, borderRadius: 4, color: copied ? theme.colors.accent.green : theme.colors.text.muted, fontSize: 10, padding: '3px 10px', cursor: 'pointer' }}>
            {copied ? '✓ Copied' : manifest && data.length < manifest.total ? 'Copy loaded' : 'Copy'}
          </button>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: theme.colors.text.muted, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
        </div>
      </div>

      {manifest && !error && (
        <div style={{ padding: '6px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 10, color: theme.colors.text.muted }}>
          <span>{data.length.toLocaleString()} of {manifest.total.toLocaleString()} rows loaded</span>
          {metadata?.masked_preview === true && <span>Synthetic template · no original rows</span>}
          {nextOffset !== null && !moreError && <span>Scroll down to load more.</span>}
          {data.length < manifest.total && <span>Search, sort, JSON and copy use loaded rows only.</span>}
          {moreError && <><span role="alert">{moreError}</span><button onClick={loadData}>Reload dataset</button></>}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'hidden', padding: '10px 14px', display: 'flex', flexDirection: 'column' }}>
        {loading && (
          <div style={{ flex: 1, overflow: 'hidden', border: `1px solid ${theme.colors.border.grid}`, borderRadius: 4 }}>
            <DatasetSkeleton label="Loading dataset" rows={8} />
          </div>
        )}

        {!loading && error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <pre style={{ color: theme.colors.accent.red, fontSize: 11, fontFamily: theme.fonts.mono, margin: 0 }}>{error}</pre>
            <button onClick={loadData} style={{ background: 'transparent', border: `1px solid ${theme.colors.accent.red}`, borderRadius: 4, color: theme.colors.accent.red, fontSize: 11, padding: '4px 14px', cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && showTable && tableData && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <JsonTableViewer
              rows={tableData.rows}
              aqTable={aqTable}
              arrayKeys={[]}
              activeKey={null}
              onKeyChange={() => {}}
              totals={tableData.totals}
              enableRowMarks
              rowMarksKey={manifest ? `${target.filePath}:${manifest.revision}` : target.filePath}
              onNavigateToDate={onNavigateToDate}
              onEndReached={manifest && nextOffset !== null && !loadingMore && !moreError ? loadMore : undefined}
              filterResetKey={manifest ? `${target.url}:${manifest.revision}:${retry}` : undefined}
              virtualizeColumns={manifest !== null}
              loadingMore={loadingMore}
              hasMoreRows={manifest !== null && nextOffset !== null && !moreError}
            />
          </div>
        )}

        {!loading && !error && !showTable && data.length > 0 && (
          <div style={{ flex: 1, overflow: 'auto' }} onScroll={manifest && nextOffset !== null && !loadingMore && !moreError ? event => {
            const el = event.currentTarget
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) loadMore()
          } : undefined}>
            <JsonView value={data as object} style={JSON_VIEW_STYLE} collapsed={2} enableClipboard={false} />
            {nextOffset !== null && !moreError && <div style={{ height: 84 }}>{loadingMore && <DatasetSkeleton label="Loading more rows" />}</div>}
          </div>
        )}
        {!loading && !error && manifest?.total === 0 && <div style={{ color: theme.colors.text.muted, fontSize: 12 }}>No rows in this dataset.</div>}
      </div>
    </>
  )

  if (embedded) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: theme.colors.bg.primary }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {innerContent}
        </div>
      </div>
    )
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: theme.colors.bg.overlay, backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: theme.colors.bg.card, border: `1px solid ${theme.colors.border.strong}`, borderRadius: 10, width: 'calc(100vw - 60px)', maxWidth: 1800, height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', boxShadow: theme.shadows.dropdown }}>
        {innerContent}
      </div>
    </div>
  )
}
