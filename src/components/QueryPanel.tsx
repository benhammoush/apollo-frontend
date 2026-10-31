import { useCallback, useEffect, useMemo, useState } from 'react'
import { getQueryLog, clearQueryLog, type QueryEntry } from '../utils/queryTracker'
import { useIsMobile } from '../hooks/useIsMobile'
import { theme } from '../design-system'

const METHOD_COLOR: Record<string, string> = {
  GET:    theme.colors.accent.blue,
  POST:   theme.colors.chart.up,
  PUT:    theme.colors.accent.yellow,
  DELETE: theme.colors.accent.red,
  PATCH:  theme.colors.accent.yellow,
}

const METHODS = ['ALL', 'GET', 'POST', 'PUT', 'DELETE'] as const
const STATUS_FILTERS = [
  { key: 'ALL',     label: 'ALL' },
  { key: 'pending', label: '\u21BB' },
  { key: 'success', label: '\u2713' },
  { key: 'error',   label: '\u2715' },
] as const
const TRIGGER_FILTERS = [
  { key: 'ALL',     label: 'ALL' },
  { key: 'manual',  label: '\u270D' },
  { key: 'auto',    label: '\u26A1' },
] as const

type SortMode = 'newest' | 'oldest' | 'label' | 'duration'

function statusStyle(entry: QueryEntry): { text: string; color: string; spin: boolean } {
  if (entry.status === 'pending') return { text: '\u21BB', color: theme.colors.accent.blue, spin: true }
  if (entry.status === 'success') return { text: '\u2713', color: theme.colors.chart.up, spin: false }
  return { text: '\u2715', color: theme.colors.accent.red, spin: false }
}

function statusLabel(entry: QueryEntry): string {
  if (entry.status === 'pending') return 'loading'
  if (entry.status === 'success') return 'done'
  return 'failed'
}

function formatInterval(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`
  return `${ms}ms`
}

function timeAgo(timestamp: number): string {
  const diff = Math.round((Date.now() - timestamp) / 1000)
  if (diff < 5) return 'now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

export default function QueryPanel() {
  const isMobile = useIsMobile()
  const [entries, setEntries] = useState<QueryEntry[]>([])
  const [minimised, setMinimised] = useState(true)
  const [filterMethod, setFilterMethod] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterTrigger, setFilterTrigger] = useState<string>('ALL')
  const [sortMode, setSortMode] = useState<SortMode>('oldest')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleSync = useCallback(() => setEntries([...getQueryLog()]), [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Q') {
        e.preventDefault()
        setMinimised(m => !m)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const onUpdate = () => setEntries([...getQueryLog()])
    window.addEventListener('apollo:query:update', onUpdate)
    setEntries([...getQueryLog()])
    return () => window.removeEventListener('apollo:query:update', onUpdate)
  }, [])

  const handleClear = useCallback(() => {
    clearQueryLog()
    setEntries([])
    setExpandedId(null)
  }, [])

  const cycleSort = useCallback(() => {
    const modes: SortMode[] = ['newest', 'oldest', 'label', 'duration']
    const idx = modes.indexOf(sortMode)
    setSortMode(modes[(idx + 1) % modes.length])
    setExpandedId(null)
  }, [sortMode])

  const sortLabel = sortMode === 'newest' ? '\u2193' : sortMode === 'oldest' ? '\u2191' : sortMode === 'label' ? 'AZ' : 'ms'

  const visible = useMemo(() => {
    let list = entries
    if (filterMethod !== 'ALL') list = list.filter(e => e.method === filterMethod)
    if (filterStatus !== 'ALL') list = list.filter(e => e.status === filterStatus)
    if (filterTrigger !== 'ALL') list = list.filter(e => e.trigger === filterTrigger)
    return [...list].sort((a, b) => {
      switch (sortMode) {
        case 'newest': return b.firstSeen - a.firstSeen
        case 'oldest': return a.firstSeen - b.firstSeen
        case 'label': return a.label.localeCompare(b.label)
        case 'duration': return (a.duration ?? 0) - (b.duration ?? 0)
        default: return 0
      }
    })
  }, [entries, filterMethod, filterStatus, filterTrigger, sortMode])

  const pending = entries.filter(e => e.status === 'pending').length
  const hasError = entries.some(e => e.status === 'error')
  const hasContent = entries.length > 0

  if (!hasContent) return null

  return (
    <div style={{
      position:     'fixed',
      bottom:       isMobile ? (minimised ? 96 : 64) : (minimised ? 56 : 20),
      right:        isMobile ? 8  : 20,
      zIndex:       9998,
      width:        minimised ? 140 : (isMobile ? undefined : 420),
      maxHeight:    isMobile ? 260 : undefined,
      transition:   'width 0.2s ease',
      background:   theme.colors.bg.secondary,
      border:       `1px solid ${hasError && minimised ? theme.colors.accent.red : theme.colors.border.strong}`,
      borderRadius: 8,
      overflow:     'hidden',
      boxShadow:    theme.shadows.dropdown,
    }}>
      {/* ── Header ── */}
      <div style={{
        padding:      minimised ? '4px 10px' : '7px 12px',
        borderBottom: minimised ? 'none' : `1px solid ${theme.colors.border.default}`,
        display:      'flex',
        alignItems:   'center',
        gap:          8,
      }}>
        {hasError && minimised && (
          <span style={{
            width:        8,
            height:       8,
            borderRadius: '50%',
            background:   theme.colors.accent.red,
            flexShrink:   0,
          }} />
        )}

        <span
          onClick={() => setMinimised(m => !m)}
          style={{
            fontSize:      10,
            fontWeight:    700,
            color:         theme.colors.text.muted,
            letterSpacing: 1,
            textTransform: 'uppercase',
            flex:          1,
            cursor:        'pointer',
            userSelect:    'none',
          }}
        >
          Queries{!minimised ? ` \u00B7 ${entries.length}` : ''}
        </span>

        {pending > 0 && (
          <span style={{
            fontSize:     10,
            background:   theme.colors.bg.card,
            color:        theme.colors.accent.blue,
            borderRadius: 10,
            padding:      '1px 7px',
            fontFamily:   theme.fonts.mono,
            fontWeight:   500,
          }}>
            {pending}
          </span>
        )}

        {!minimised && (
          <>
            <button onClick={cycleSort} title={sortLabel} style={headerBtn}>
              {sortLabel}
            </button>
            <button onClick={handleClear} title="Reset" style={headerBtn}>
              &#x2327;
            </button>
          </>
        )}

        <button
          onClick={() => setMinimised(m => !m)}
          title={minimised ? 'Show' : 'Minimise'}
          style={headerBtn}
        >
          {minimised ? '\u25B2' : '\u25BC'}
        </button>
      </div>

      {/* ── Filter bar ── */}
      {!minimised && (
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          4,
          padding:       '4px 10px',
          borderBottom: `1px solid ${theme.colors.border.default}`,
          flexWrap:     'wrap',
        }}>
          <span style={{ fontSize: 9, color: theme.colors.text.muted, marginRight: 4, flexShrink: 0 }}>Method</span>
          {METHODS.map(m => (
            <button
              key={m}
              onClick={() => { setFilterMethod(m); setExpandedId(null) }}
              style={{
                ...filterPill(m === filterMethod),
                minWidth: m === 'ALL' ? 24 : 28,
              }}
            >
              {m}
            </button>
          ))}
          <span style={{ width: 6, flexShrink: 0 }} />
          <span style={{ fontSize: 9, color: theme.colors.text.muted, marginRight: 4, flexShrink: 0 }}>Status</span>
          {STATUS_FILTERS.map(s => (
            <button
              key={s.key}
              onClick={() => { setFilterStatus(s.key); setExpandedId(null) }}
              style={filterPill(s.key === filterStatus)}
              title={s.key === 'ALL' ? 'All statuses' : s.key}
            >
              {s.label}
            </button>
          ))}
          <span style={{ width: 6, flexShrink: 0 }} />
          <span style={{ fontSize: 9, color: theme.colors.text.muted, marginRight: 4, flexShrink: 0 }}>Trigger</span>
          {TRIGGER_FILTERS.map(t => (
            <button
              key={t.key}
              onClick={() => { setFilterTrigger(t.key); setExpandedId(null) }}
              style={filterPill(t.key === filterTrigger)}
              title={t.key === 'ALL' ? 'All triggers' : t.key}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      <div style={{
        maxHeight: minimised ? 0 : (isMobile ? 220 : 360),
        overflowY: minimised ? 'hidden' : 'auto',
        overflowX: 'hidden',
        transition: 'max-height 0.2s ease',
      }}>
        {visible.map(entry => (
          <EntryRow
            key={entry.key}
            entry={entry}
            isExpanded={expandedId === entry.key}
            onClick={() => setExpandedId(expandedId === entry.key ? null : entry.key)}
          />
        ))}
        {visible.length === 0 && (
          <div style={{
            padding:      '12px',
            fontSize:     10,
            color:        theme.colors.text.muted,
            textAlign:    'center',
          }}>
            No matching queries
          </div>
        )}
      </div>

      <style>{`
        @keyframes query-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function EntryRow({
  entry,
  isExpanded,
  onClick,
}: {
  entry: QueryEntry
  isExpanded: boolean
  onClick: () => void
}) {
  const icon = statusStyle(entry)
  const methodColor = METHOD_COLOR[entry.method] || theme.colors.text.muted
  const stLabel = statusLabel(entry)
  const statusColor = entry.status === 'pending' ? theme.colors.accent.blue
    : entry.status === 'success' ? theme.colors.chart.up
    : theme.colors.accent.red

  return (
    <div>
      <div
        onClick={onClick}
        style={{
          padding:      '6px 12px',
          borderBottom: `1px solid ${theme.colors.border.default}`,
          display:      'flex',
          alignItems:   'center',
          gap:          6,
          opacity:      entry.status === 'pending' ? 1 : 0.65,
          cursor:       'pointer',
          background:   isExpanded ? theme.colors.bg.card : 'transparent',
          transition:   'background 0.1s ease',
        }}>
        <span style={{
          fontSize:      9,
          fontWeight:    700,
          color:         methodColor,
          background:    `${methodColor}18`,
          borderRadius:  3,
          padding:       '1px 5px',
          fontFamily:    theme.fonts.mono,
          letterSpacing: 0.5,
          flexShrink:    0,
          minWidth:      34,
          textAlign:     'center',
        }}>
          {entry.method}
        </span>

        <span style={{
          fontSize:    11,
          color:       theme.colors.text.primary,
          fontWeight:  500,
          flex:        1,
          overflow:    'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:  'nowrap',
        }}>
          {entry.label}
        </span>

        {entry.trigger !== 'unknown' && (
          <span style={{
            fontSize:      8,
            fontWeight:    600,
            color:         entry.trigger === 'auto' ? theme.colors.accent.blue : theme.colors.text.muted,
            background:    entry.trigger === 'auto' ? `${theme.colors.accent.blue}18` : `${theme.colors.text.muted}12`,
            borderRadius:  3,
            padding:       '1px 4px',
            fontFamily:    theme.fonts.mono,
            flexShrink:    0,
          }}>
            {entry.trigger === 'auto' ? 'auto' : 'man'}
          </span>
        )}

        {entry.trigger === 'auto' && entry.interval != null && (
          <span style={{
            fontSize:    8,
            fontFamily:  theme.fonts.mono,
            color:       theme.colors.text.dimmer,
            flexShrink:  0,
            fontWeight:  500,
          }}>
            {formatInterval(entry.interval)}
          </span>
        )}

        <span style={{
          fontSize:      9,
          fontWeight:    600,
          color:         statusColor,
          background:    `${statusColor}14`,
          borderRadius:  3,
          padding:       '1px 5px',
          fontFamily:    theme.fonts.mono,
          flexShrink:    0,
          display:       'flex',
          alignItems:   'center',
          gap:           3,
        }}>
          <span style={{
            fontSize:      10,
            display:       'inline-block',
            animation:     icon.spin ? 'query-spin 0.8s linear infinite' : 'none',
            lineHeight:    1,
          }}>
            {icon.text}
          </span>
          {stLabel}
        </span>

        {entry.duration != null && (
          <span style={{
            fontSize:    10,
            fontFamily:  theme.fonts.mono,
            color:       theme.colors.text.muted,
            flexShrink:  0,
            fontWeight:  500,
            minWidth:    42,
            textAlign:   'right',
          }}>
            {entry.duration}ms
          </span>
        )}

        {entry.callCount > 1 && (
          <span style={{
            fontSize:    9,
            fontFamily:  theme.fonts.mono,
            color:       theme.colors.text.dimmer,
            flexShrink:  0,
            fontWeight:  500,
          }}>
            &times;{entry.callCount}
          </span>
        )}

        <span style={{
          fontSize:    10,
          color:       theme.colors.text.dimmer,
          flexShrink:  0,
          fontWeight:  500,
        }}>
          {isExpanded ? '\u25B2' : '\u25BC'}
        </span>
      </div>

      {isExpanded && (
        <div style={{
          padding:      '6px 12px 8px 16px',
          borderBottom: `1px solid ${theme.colors.border.default}`,
          background:   theme.colors.bg.card,
          fontSize:     10,
          fontFamily:   theme.fonts.mono,
          color:        theme.colors.text.secondary,
          lineHeight:   '1.5',
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
            <span style={{ color: theme.colors.text.muted, flexShrink: 0 }}>URL</span>
            <span style={{ wordBreak: 'break-all', color: theme.colors.text.primary }}>{entry.path}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span>
              <span style={{ color: theme.colors.text.muted }}>Status </span>
              <span style={{
                color: entry.statusCode
                  ? entry.statusCode < 400
                    ? theme.colors.chart.up
                    : theme.colors.accent.red
                  : theme.colors.text.muted,
              }}>
                {entry.statusCode ?? '\u2014'}
              </span>
            </span>
            <span>
              <span style={{ color: theme.colors.text.muted }}>Duration </span>
              <span>{entry.duration != null ? `${entry.duration}ms` : '\u2014'}</span>
            </span>
            <span>
              <span style={{ color: theme.colors.text.muted }}>Time </span>
              <span>{timeAgo(entry.timestamp)}</span>
            </span>
            <span>
              <span style={{ color: theme.colors.text.muted }}>Calls </span>
              <span>{entry.callCount}</span>
            </span>
            <span>
              <span style={{ color: theme.colors.text.muted }}>Trigger </span>
              <span>{entry.trigger === 'auto' && entry.interval != null ? `auto \u00B7 ${formatInterval(entry.interval)}` : entry.trigger}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function filterPill(active: boolean): React.CSSProperties {
  return {
    fontSize:      9,
    fontWeight:    600,
    fontFamily:    theme.fonts.mono,
    background:    active ? `${theme.colors.accent.blue}22` : 'transparent',
    color:         active ? theme.colors.accent.blue : theme.colors.text.muted,
    border:        active
      ? `1px solid ${theme.colors.accent.blue}44`
      : `1px solid transparent`,
    borderRadius:  3,
    padding:       '1px 5px',
    cursor:        'pointer',
    lineHeight:    '1.4',
  }
}

const headerBtn: React.CSSProperties = {
  background: 'transparent',
  border:     'none',
  color:      theme.colors.text.muted,
  cursor:     'pointer',
  fontSize:   11,
  padding:    0,
  lineHeight: 1,
  flexShrink: 0,
}
