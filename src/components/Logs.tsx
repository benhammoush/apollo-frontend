/** Public presentation only; private operational implementation is excluded. */
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { hexWithAlpha, theme } from '../design-system'
import { useIsMobile } from '../hooks/useIsMobile'
import { formatBrokerTime } from '../utils/time'
import { EXAMPLE_JOB_LOGS } from '../data/exampleJobLogs'

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  queued:  { text: 'QUEUED',  color: theme.colors.text.muted },
  running: { text: 'RUNNING', color: theme.colors.accent.orange },
  done:    { text: 'DONE',    color: theme.colors.chart.up },
  error:   { text: 'ERROR',   color: theme.colors.accent.red },
  unknown: { text: '—',       color: theme.colors.text.muted },
}

export default function Logs({ visible = true }: { visible?: boolean }) {
  const files = EXAMPLE_JOB_LOGS
  const [selected, setSelected] = useState<string | null>(files[0].name)
  const content = useMemo(() => files.find(file => file.name === selected)?.lines ?? [], [files, selected])
  const [search, setSearch] = useState('')
  const [autoScroll, setAutoScroll] = useState(false)
  const [matchIdx, setMatchIdx] = useState(0)
  const [mobileTab, setMobileTab] = useState<'files' | 'log'>('files')
  const isMobile = useIsMobile()
  const scrollRef = useRef<HTMLDivElement>(null)

  const searchLc = search.toLowerCase()

  const matches = useMemo(() => {
    if (!search) return []
    return content.reduce<number[]>((acc, line, i) => {
      if (line.toLowerCase().includes(searchLc)) acc.push(i)
      return acc
    }, [])
  }, [content, searchLc])

  // Build a set of matching line indices for O(1) lookup during render
  const matchSet = useMemo(() => new Set(matches), [matches])

  // Map from content index → match position (for current-match highlighting)
  const matchPosMap = useMemo(() => {
    const m = new Map<number, number>()
    matches.forEach((lineIdx, pos) => m.set(lineIdx, pos))
    return m
  }, [matches])

  // Parse a log line: try JSONL first, fall back to raw text.
  // ts can be a unix number OR an ISO string ("2026-03-07T15:08:43.718+00:00").
  function parseLine(raw: string): { ts?: string; level?: string; msg: string } {
    try {
      const obj = JSON.parse(raw)
      let ts: string | undefined
      if (obj.ts) {
        const d = typeof obj.ts === 'number'
          ? new Date(obj.ts * 1000)
          : new Date(obj.ts)
        ts = isNaN(d.getTime()) ? undefined : formatBrokerTime(d)
      }
      return { ts, level: obj.level, msg: obj.msg ?? raw }
    } catch {
      // Bracket-prefixed: [HH:MM:SS] …
      const m = raw.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.*)$/)
      if (m) return { ts: m[1], msg: m[2] }
      return { msg: raw }
    }
  }

  const LEVEL_COLOR: Record<string, string> = {
    DEBUG: theme.colors.text.muted,
    INFO: theme.colors.accent.primary,
    WARNING: theme.colors.accent.yellow,
    ERROR: theme.colors.accent.red,
    CRITICAL: theme.colors.accent.red,
  }

  // Virtualizer for log lines
  const virtualizer = useVirtualizer({
    count: content.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 17,
    overscan: 50,
  })

  // Auto-scroll to bottom when content changes and autoScroll is on
  useEffect(() => {
    if (autoScroll && content.length > 0) {
      virtualizer.scrollToIndex(content.length - 1, { align: 'end' })
    }
  }, [content.length, autoScroll])

  const jumpMatch = useCallback((delta: number) => {
    if (!matches.length) return
    const next = (matchIdx + delta + matches.length) % matches.length
    setMatchIdx(next)
    virtualizer.scrollToIndex(matches[next], { align: 'center' })
  }, [matches, matchIdx, virtualizer])

  const panel = (children: React.ReactNode, flex?: string | number) => (
    <div style={{ flex: flex ?? 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, minHeight: 0 }}>
      {children}
    </div>
  )

  // Auto-switch to log tab when a file is selected on mobile
  const selectFileMobile = (fileName: string) => {
    setSelected(fileName)
    setMatchIdx(0)
    if (isMobile) setMobileTab('log')
  }

  const exampleNotice = (
    <div role="note" style={{ padding: '6px 12px', background: theme.colors.bg.secondary, color: theme.colors.text.muted, fontSize: theme.fonts.size.xs, flexShrink: 0 }}>
      Synthetic example logs — 10 fixed snapshots, not live jobs. These examples do not execute computations.
    </div>
  )

  if (isMobile) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: theme.fonts.sans }}>
      {exampleNotice}
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${theme.colors.border.default}`, flexShrink: 0 }}>
        {(['files', 'log'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            style={{
              flex:         1,
              padding:      '10px 0',
              background:   mobileTab === tab ? theme.colors.bg.hover : 'transparent',
              border:       'none',
              borderBottom: mobileTab === tab ? `2px solid ${theme.colors.accent.primary}` : '2px solid transparent',
              color:        mobileTab === tab ? theme.colors.text.primary : theme.colors.text.muted,
              cursor:       'pointer',
              fontSize:     theme.fonts.size.sm,
              fontWeight:   mobileTab === tab ? theme.fonts.weight.bold : theme.fonts.weight.normal,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {tab === 'files' ? 'Jobs' : 'Log'}
          </button>
        ))}
      </div>

      {/* Active panel */}
      {mobileTab === 'files'
        ? panel(
            <>
              <div style={{ padding: '8px 12px', background: theme.colors.bg.secondary, borderBottom: `1px solid ${theme.colors.border.default}`, fontSize: theme.fonts.size.xs, color: theme.colors.text.muted, fontWeight: theme.fonts.weight.bold, letterSpacing: 1 }}>JOB LOGS</div>
              <div style={{ flex: 1, overflowY: 'auto', background: theme.colors.bg.primary }}>
                {files.length === 0 && <div style={{ padding: 16, color: theme.colors.text.muted, fontSize: theme.fonts.size.sm }}>No log files found.</div>}
                {files.map(f => {
                  const statusInfo = STATUS_LABEL[f.status] ?? STATUS_LABEL.unknown
                  const [jobType, ...dateParts] = f.label.split(' · ')
                  const datePart = dateParts.join(' · ')
                  return (
                    <div
                      key={f.job_id}
                      onClick={() => selectFileMobile(f.name)}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selected === f.name}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          selectFileMobile(f.name)
                        }
                      }}
                      style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.colors.border.default}`, cursor: 'pointer', background: selected === f.name ? theme.colors.bg.hover : 'transparent' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 8, fontWeight: 700, fontFamily: theme.fonts.mono, color: statusInfo.color, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>{statusInfo.text}</span>
                        <span style={{ fontSize: theme.fonts.size.sm, color: theme.colors.text.primary, flex: 1 }}>{jobType}</span>
                      </div>
                      <div style={{ fontSize: theme.fonts.size.xs, color: theme.colors.text.muted, marginTop: 2, paddingLeft: 14 }}>{datePart} · {fmtSize(f.size)}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )
        : panel(<>
            <div style={{ padding: '5px 10px', background: theme.colors.bg.secondary, borderBottom: `1px solid ${theme.colors.border.default}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setMobileTab('files')} style={{ background: 'transparent', border: 'none', color: theme.colors.text.muted, cursor: 'pointer', fontSize: 12, padding: '2px 6px', marginRight: 4 }}>← Jobs</button>
              <input type="text" aria-label="Search example job logs" placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setMatchIdx(0) }} style={{ flex: 1, background: theme.colors.bg.input, border: `1px solid ${theme.colors.border.strong}`, borderRadius: theme.radii.sm, color: theme.colors.text.primary, fontSize: theme.fonts.size.sm, padding: '4px 8px', outline: 'none', fontFamily: theme.fonts.mono }} />
            </div>
            {!selected
              ? <div style={{ padding: 20, color: theme.colors.text.muted, fontSize: theme.fonts.size.sm }}>Select a job to view its log.</div>
              : <div style={{ flex: 1, overflowY: 'auto', fontFamily: theme.fonts.mono, fontSize: 11, padding: '8px 10px', background: theme.colors.bg.primary, lineHeight: 1.6 }}>
                  {content.map((line, i) => {
                    const { ts, level, msg } = parseLine(line)
                    return <div key={i} style={{ color: level ? LEVEL_COLOR[level] : theme.colors.text.secondary, background: matchSet.has(i) ? hexWithAlpha(theme.colors.accent.yellow, 0.08) : undefined, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{ts} {level && `[${level}] `}{msg}</div>
                  })}
                </div>
            }
          </>)
      }
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: theme.fonts.sans }}>
      {exampleNotice}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

      {/* ── LEFT: file browser ──────────────────────────────────────────── */}
      {panel(
        <>
          <div style={{ padding: '8px 12px', background: theme.colors.bg.secondary, borderBottom: `1px solid ${theme.colors.border.default}`, fontSize: theme.fonts.size.xs, color: theme.colors.text.muted, fontWeight: theme.fonts.weight.bold, letterSpacing: 1 }}>
            JOB LOGS
          </div>
          <div style={{ flex: 1, overflowY: 'auto', background: theme.colors.bg.primary }}>
            {files.length === 0 && (
              <div style={{ padding: 16, color: theme.colors.text.muted, fontSize: theme.fonts.size.sm }}>No log files found.</div>
            )}
            {files.map(f => {
              const statusInfo = STATUS_LABEL[f.status] ?? STATUS_LABEL.unknown
              const [jobType, ...dateParts] = f.label.split(' · ')
              const datePart = dateParts.join(' · ')
              return (
                <div
                  key={f.name}
                  onClick={() => selectFileMobile(f.name)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected === f.name}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      selectFileMobile(f.name)
                    }
                  }}
                  style={{
                    padding: '7px 12px',
                    cursor: 'pointer',
                    background: selected === f.name ? theme.colors.bg.hover : 'transparent',
                    borderLeft: `2px solid ${selected === f.name ? theme.colors.accent.primary : 'transparent'}`,
                    borderBottom: `1px solid ${theme.colors.border.subtle}`,
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, fontFamily: theme.fonts.mono, color: statusInfo.color, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>{statusInfo.text}</span>
                    <span style={{ fontSize: theme.fonts.size.sm, color: theme.colors.text.primary, fontWeight: theme.fonts.weight.bold, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{jobType}</span>
                  </div>
                  <div style={{ fontSize: theme.fonts.size.xs, color: theme.colors.text.muted, marginTop: 2, display: 'flex', gap: 8, paddingLeft: 13 }}>
                    <span>{datePart}</span>
                    <span>{fmtSize(f.size)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>,
        '0 0 220px',
      )}

      <div style={{ width: 1, background: theme.colors.border.default, flexShrink: 0 }} />

      {/* ── RIGHT: log viewer ────────────────────────────────────────────── */}
      {panel(
        <>
          {/* Toolbar */}
          <div style={{ padding: '5px 10px', background: theme.colors.bg.secondary, borderBottom: `1px solid ${theme.colors.border.default}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <input
              type="text"
              aria-label="Search example job logs"
              placeholder="Search…"
              value={search}
              onChange={e => { setSearch(e.target.value); setMatchIdx(0) }}
              style={{ flex: 1, background: theme.colors.bg.input, border: `1px solid ${theme.colors.border.strong}`, borderRadius: theme.radii.sm, color: theme.colors.text.primary, fontSize: theme.fonts.size.sm, padding: '2px 8px', outline: 'none', fontFamily: theme.fonts.mono }}
            />
            {search && (
              <>
                <span style={{ fontSize: theme.fonts.size.xs, color: theme.colors.text.muted, whiteSpace: 'nowrap' }}>{matches.length} match{matches.length !== 1 ? 'es' : ''}</span>
                <button onClick={() => jumpMatch(-1)} aria-label="Previous match" style={navBtnStyle}>↑</button>
                <button onClick={() => jumpMatch(1)} aria-label="Next match" style={navBtnStyle}>↓</button>
              </>
            )}
            <label style={{ fontSize: theme.fonts.size.xs, color: theme.colors.text.secondary, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} />
              Auto-scroll
            </label>
            {selected && (() => {
              const meta = files.find(f => f.name === selected)
              return (
                <>
                  {meta && <span style={{ fontSize: theme.fonts.size.xs, color: theme.colors.text.secondary, whiteSpace: 'nowrap' }}>{meta.label}</span>}
                </>
              )
            })()}
          </div>

          {/* Content — virtualized */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', background: theme.colors.bg.primary, fontFamily: theme.fonts.mono, fontSize: theme.fonts.size.sm, lineHeight: '17px' }}>
            {!selected && (
              <div style={{ padding: 16, color: theme.colors.text.muted }}>Select a file to view its contents.</div>
            )}
            {selected && content.length > 0 && (
              <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
                {virtualizer.getVirtualItems().map(vRow => {
                  const i = vRow.index
                  const raw = content[i]
                  const { ts, level, msg } = parseLine(raw)
                  const isMatch = matchSet.has(i)
                  const matchPos = isMatch ? matchPosMap.get(i) ?? -1 : -1
                  const isCurrentMatch = matchPos === matchIdx

                  return (
                    <div
                      key={vRow.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: vRow.size,
                        transform: `translateY(${vRow.start}px)`,
                        padding: '0 12px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        boxSizing: 'border-box',
                        background: isCurrentMatch
                          ? hexWithAlpha(theme.colors.accent.yellow, 0.18)
                          : isMatch
                            ? hexWithAlpha(theme.colors.accent.yellow, 0.08)
                            : 'transparent',
                        color: level ? (LEVEL_COLOR[level] ?? theme.colors.text.primary) : theme.colors.text.primary,
                      }}
                    >
                      {ts && <span style={{ color: theme.colors.text.muted, userSelect: 'none', marginRight: 8 }}>{ts}</span>}
                      {level && <span style={{ color: LEVEL_COLOR[level] ?? theme.colors.text.muted, userSelect: 'none', marginRight: 6 }}>[{level.slice(0, 4)}]</span>}
                      {msg}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>,
      )}
      </div>
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  background: theme.colors.bg.hover,
  border: `1px solid ${theme.colors.border.strong}`,
  borderRadius: theme.radii.sm,
  color: theme.colors.text.primary,
  cursor: 'pointer',
  fontSize: theme.fonts.size.sm,
  padding: '1px 6px',
  lineHeight: 1,
}
