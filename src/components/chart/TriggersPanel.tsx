import { useMemo, useState, useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Trigger } from './types'
import { theme } from '../../design-system'
import { fmtDate } from '../../utils/date'

type SortKey = 'datetime' | 'dir' | 'timeframe' | 'entry' | 'bb_trigger' | 'atr_short' | 'atr_long' | 'ref_short' | 'ref_long'

function fmtPrice(p: number | null | undefined) { return p != null ? p.toFixed(5) : '—' }

const ROW_HEIGHT = 28

interface Props {
  triggers: Trigger[]
  showTriggerPanel: boolean
  setShowTriggerPanel: (u: boolean | ((p: boolean) => boolean)) => void
  triggerPanelHeight: number
  setTriggerPanelHeight: (n: number) => void
  selectedTriggerIdx: number
  setSelectedTriggerIdx: (n: number) => void
  pinnedTriggers: Set<number>
  setPinnedTriggers: (u: (prev: Set<number>) => Set<number>) => void
  navigateToDate: (ts: number) => void
}

export default function TriggersPanel({
  triggers, showTriggerPanel, setShowTriggerPanel, triggerPanelHeight, setTriggerPanelHeight,
  selectedTriggerIdx, setSelectedTriggerIdx, pinnedTriggers, setPinnedTriggers, navigateToDate,
}: Props) {
  const [triggerSortKey, setTriggerSortKey] = useState<SortKey>('datetime')
  const [triggerSortDesc, setTriggerSortDesc] = useState(true)
  const [triggerFilter, setTriggerFilter] = useState('')

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!showTriggerPanel) setShowTriggerPanel(true)
    const startY = e.clientY
    const startHeight = triggerPanelHeight
    const onMouseMove = (ev: MouseEvent) => {
      const newHeight = Math.min(600, Math.max(80, startHeight - (ev.clientY - startY)))
      setTriggerPanelHeight(newHeight)
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const filteredWithIdx = useMemo(() => {
    const lc = triggerFilter.toLowerCase()
    return triggers
      .map((tr, i) => ({ trigger: tr, originalIndex: i }))
      .filter(({ trigger: tr }) => {
        if (!lc) return true
        const hay = [
          tr.datetime, tr.dir, tr.timeframe, tr.row_type ?? '',
          String(tr.entry), String(tr.bb_trigger),
          tr.atr_short != null ? String(tr.atr_short) : '',
          tr.atr_long != null ? String(tr.atr_long) : '',
          tr.ref_short != null ? String(tr.ref_short) : '',
          tr.ref_long != null ? String(tr.ref_long) : '',
        ].join(' ').toLowerCase()
        return hay.includes(lc)
      })
  }, [triggers, triggerFilter])

  const sorted = useMemo(() => {
    return [...filteredWithIdx].sort(({ trigger: a }, { trigger: b }) => {
      let av: string | number, bv: string | number
      if (triggerSortKey === 'datetime') { av = a.datetime; bv = b.datetime }
      else if (triggerSortKey === 'dir') { av = a.dir; bv = b.dir }
      else if (triggerSortKey === 'timeframe') { av = a.timeframe; bv = b.timeframe }
      else if (triggerSortKey === 'entry') { av = a.entry; bv = b.entry }
      else if (triggerSortKey === 'bb_trigger') { av = a.bb_trigger; bv = b.bb_trigger }
      else if (triggerSortKey === 'atr_short') { av = a.atr_short ?? 0; bv = b.atr_short ?? 0 }
      else if (triggerSortKey === 'atr_long') { av = a.atr_long ?? 0; bv = b.atr_long ?? 0 }
      else if (triggerSortKey === 'ref_short') { av = a.ref_short ?? 0; bv = b.ref_short ?? 0 }
      else if (triggerSortKey === 'ref_long') { av = a.ref_long ?? 0; bv = b.ref_long ?? 0 }
      else { av = a.entry; bv = b.entry }
      if (av < bv) return triggerSortDesc ? 1 : -1
      if (av > bv) return triggerSortDesc ? -1 : 1
      return 0
    })
  }, [filteredWithIdx, triggerSortKey, triggerSortDesc])

  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 30,
  })

  useEffect(() => {
    if (selectedTriggerIdx < 0) return
    const idx = sorted.findIndex(({ originalIndex }) => originalIndex === selectedTriggerIdx)
    if (idx >= 0) virtualizer.scrollToIndex(idx, { align: 'center' })
  }, [selectedTriggerIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const thStyle = (key: SortKey) => ({
    fontSize: 10, color: triggerSortKey === key ? theme.colors.text.link : theme.colors.text.dimmer,
    textTransform: 'uppercase' as const, letterSpacing: 0.4,
    cursor: 'pointer', userSelect: 'none' as const,
    background: 'none', border: 'none', padding: 0,
    fontWeight: 300 as const,
  })

  const sortToggle = (key: SortKey) => {
    setTriggerSortKey(key)
    setTriggerSortDesc(prev => triggerSortKey === key ? !prev : true)
  }

  const gridCols = '56px 20px 152px 26px 34px 40px 62px 62px 58px 58px 58px 58px'

  return (
    <>
      {/* ── Toggle row ────────────────────────────────────────────────────────── */}
      <div style={{
        background: theme.colors.bg.card, borderTop: `1px solid ${theme.colors.border.grid}`, flexShrink: 0,
        display: 'flex', alignItems: 'center', padding: '0 12px',
        height: 28, position: 'relative',
      }}>
        <div
          onMouseDown={handleDragStart}
          title="Drag to resize"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, cursor: 'ns-resize', zIndex: 10 }}
        />
        <button
          onClick={() => setShowTriggerPanel(v => !v)}
          style={{
            background: 'transparent', border: 'none',
            color: triggers.length > 0 ? theme.colors.text.link : theme.colors.text.dimmer,
            fontSize: 11, cursor: 'pointer', padding: 0,
            letterSpacing: 0.3, display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span>{showTriggerPanel ? '▼' : '▲'}</span>
          <span>Déclencheurs ({triggers.length})</span>
        </button>
      </div>

      {/* ── Table (visible when panel open) ───────────────────────────────────── */}
      {showTriggerPanel && (
        <div ref={scrollRef} style={{
          background: theme.colors.bg.card, borderTop: `1px solid ${theme.colors.border.grid}`,
          flexShrink: 0, height: triggerPanelHeight,
          overflow: 'auto', fontSize: 11, fontFamily: theme.fonts.mono,
        }}>
          {/* Sticky column headers */}
          <div style={{
            display: 'grid', gridTemplateColumns: gridCols,
            background: theme.colors.border.surface, borderBottom: `1px solid ${theme.colors.border.grid}`,
            padding: '4px 10px', alignItems: 'center', gap: 4,
            position: 'sticky', top: 0, zIndex: 5,
          }}>
            <span style={{ fontSize: 10, color: theme.colors.text.dimmer, textTransform: 'uppercase', letterSpacing: 0.4 }}>Visibility</span>
            <span style={{ fontSize: 10, color: theme.colors.text.dimmer }}>#</span>
            <button onClick={() => sortToggle('datetime')} style={thStyle('datetime')}>
              Datetime {triggerSortKey === 'datetime' ? (triggerSortDesc ? '↓' : '↑') : ''}
            </button>
            <span style={{ fontSize: 9, color: theme.colors.text.dimmer, letterSpacing: 0.3 }}>Type</span>
            <button onClick={() => sortToggle('dir')} style={thStyle('dir')}>
              Dir {triggerSortKey === 'dir' ? (triggerSortDesc ? '↓' : '↑') : ''}
            </button>
            <button onClick={() => sortToggle('timeframe')} style={thStyle('timeframe')}>
              TF {triggerSortKey === 'timeframe' ? (triggerSortDesc ? '↓' : '↑') : ''}
            </button>
            <button onClick={() => sortToggle('entry')} style={thStyle('entry')}>
              Entry {triggerSortKey === 'entry' ? (triggerSortDesc ? '↓' : '↑') : ''}
            </button>
            <button onClick={() => sortToggle('bb_trigger')} style={thStyle('bb_trigger')}>
              BB Trigger {triggerSortKey === 'bb_trigger' ? (triggerSortDesc ? '↓' : '↑') : ''}
            </button>
            <button onClick={() => sortToggle('atr_short')} style={thStyle('atr_short')}>
              ATR Short {triggerSortKey === 'atr_short' ? (triggerSortDesc ? '↓' : '↑') : ''}
            </button>
            <button onClick={() => sortToggle('atr_long')} style={thStyle('atr_long')}>
              ATR Long {triggerSortKey === 'atr_long' ? (triggerSortDesc ? '↓' : '↑') : ''}
            </button>
            <button onClick={() => sortToggle('ref_short')} style={thStyle('ref_short')}>
              Ref Short {triggerSortKey === 'ref_short' ? (triggerSortDesc ? '↓' : '↑') : ''}
            </button>
            <button onClick={() => sortToggle('ref_long')} style={thStyle('ref_long')}>
              Ref Long {triggerSortKey === 'ref_long' ? (triggerSortDesc ? '↓' : '↑') : ''}
            </button>
          </div>

          {/* Filter input */}
          <div style={{ padding: '4px 10px', borderBottom: `1px solid ${theme.colors.border.grid}`, background: theme.colors.bg.deep }}>
            <input
              type="text"
              placeholder="Filter…"
              value={triggerFilter}
              onChange={e => setTriggerFilter(e.target.value)}
              style={{
                background: theme.colors.border.surface, border: `1px solid ${theme.colors.border.muted}`, borderRadius: theme.radii.sm,
                color: theme.colors.text.primary, fontSize: 10, padding: '2px 6px', width: '100%',
                fontFamily: theme.fonts.mono, outline: 'none',
              }}
            />
          </div>

          {/* Data rows */}
          {sorted.length === 0 ? (
            <div style={{ padding: '12px 10px', color: theme.colors.text.dimmer, fontSize: 11, textAlign: 'center' }}>
              {triggers.length === 0 ? 'Run the Trigger BT agent to load data.' : 'No results match the filter.'}
            </div>
          ) : (
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map(vRow => {
                const { trigger: tr, originalIndex: triggerIdx } = sorted[vRow.index]
                const isSelected = selectedTriggerIdx === triggerIdx
                const dirColor = tr.dir === 'buy' ? theme.colors.chart.up : theme.colors.chart.down
                const isPinned = pinnedTriggers.has(triggerIdx)
                const isPostTrigger = tr.row_type === 'post_trigger'

                const handleRowClick = () => {
                  if (isSelected) {
                    setSelectedTriggerIdx(-1)
                  } else {
                    setSelectedTriggerIdx(triggerIdx)
                    navigateToDate(Math.floor(new Date(tr.datetime).getTime() / 1000))
                  }
                }

                return (
                  <div
                    key={triggerIdx}
                    onClick={handleRowClick}
                    style={{
                      position: 'absolute',
                      top: vRow.start,
                      width: '100%',
                      height: ROW_HEIGHT,
                      display: 'grid', gridTemplateColumns: gridCols,
                      padding: '4px 10px', gap: 4, alignItems: 'center',
                      background: isSelected ? dirColor + '12'
                        : (vRow.index % 2 === 0 ? theme.colors.bg.deep : theme.colors.bg.alt),
                      borderLeft: isSelected ? `3px solid ${dirColor}` : '3px solid transparent',
                      borderBottom: `1px solid ${theme.colors.border.surface}`, cursor: 'pointer',
                    }}
                  >
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setPinnedTriggers(prev => {
                          const next = new Set(prev)
                          if (next.has(triggerIdx)) next.delete(triggerIdx)
                          else next.add(triggerIdx)
                          return next
                        })
                      }}
                      title={isPinned ? 'Hide arrow on chart' : 'Show arrow on chart'}
                      style={{
                        background: 'none', border: 'none', padding: 0,
                        cursor: 'pointer', fontSize: 10, lineHeight: 1,
                        color: isPinned ? theme.colors.chart.up : theme.colors.text.dimmer,
                        fontFamily: theme.fonts.mono, letterSpacing: 0.2,
                      }}
                    >
                      {isPinned ? 'display' : 'hidden'}
                    </button>
                    <span style={{ color: theme.colors.text.dimmer, fontSize: 9 }}>{triggerIdx + 1}</span>
                    <span style={{ color: theme.colors.text.muted, fontSize: 10 }}>{fmtDate(tr.datetime)}</span>
                    <span style={{ color: isPostTrigger ? theme.colors.chart.down : theme.colors.text.dimmer, fontSize: 9, letterSpacing: 0.3 }}>
                      {tr.row_type === 'post_trigger' ? 'PT' : 'T'}
                    </span>
                    <span style={{ color: dirColor, fontWeight: 700, fontSize: 10 }}>{tr.dir.toUpperCase()}</span>
                    <span style={{ color: theme.colors.text.link, fontSize: 10 }}>{tr.timeframe}</span>
                    <span style={{ color: dirColor }}>{fmtPrice(tr.entry)}</span>
                    <span style={{ color: dirColor }}>{fmtPrice(tr.bb_trigger)}</span>
                    <span style={{ color: theme.colors.chart.down }}>{fmtPrice(tr.atr_short)}</span>
                    <span style={{ color: theme.colors.chart.up }}>{fmtPrice(tr.atr_long)}</span>
                    <span style={{ color: theme.colors.text.link }}>{fmtPrice(tr.ref_short)}</span>
                    <span style={{ color: theme.colors.text.link }}>{fmtPrice(tr.ref_long)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </>
  )
}
