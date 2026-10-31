import { useState } from 'react'
import { theme } from '../../design-system'
import { usePersistedState } from '../../store/PersistedContext'
import { DEFAULT_CHART_STATE, getLayoutSlotCount } from '../../store/persistedState'
import { fmtDateFromTs } from '../../utils/date'
import { TFS } from './constants'
import { Drawing } from './drawings'

interface Props {
  drawing: Drawing
  sourceChartId: string
  sourceSymbol: string
  onClose: () => void
}

export default function MeasureNavigateModal({ drawing, sourceChartId, sourceSymbol, onClose }: Props) {
  const { state } = usePersistedState()
  const { layoutMode, slotSymbols, charts } = state

  const oldestTs = Math.min(drawing.points[0].time, drawing.points[1].time)
  const newestTs = Math.max(drawing.points[0].time, drawing.points[1].time)

  // Active chart slots: "0" through "layoutMode - 1", excluding the source chart
  const otherSlots = Array.from({ length: getLayoutSlotCount(layoutMode) }, (_, i) => String(i))
    .filter(id => id !== sourceChartId)

  // Per-row TF selection state, defaulting to each chart's current TF or M1
  const [selectedTfs, setSelectedTfs] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const id of otherSlots) {
      init[id] = (charts[id] ?? DEFAULT_CHART_STATE).tf ?? 'M1'
    }
    return init
  })

  function navigate(targetChartId: string) {
    window.dispatchEvent(new CustomEvent('apollo:navigate', {
      detail: {
        targetChartId,
        targetTs: oldestTs,
        newTf: selectedTfs[targetChartId],
        newSymbol: sourceSymbol,
      },
    }))
  }

  const sourceTf = (charts[sourceChartId] ?? DEFAULT_CHART_STATE).tf ?? '—'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)' }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201,
        background: theme.colors.bg.secondary,
        border: `1px solid ${theme.colors.border.default}`,
        borderRadius: theme.radii.md,
        padding: '14px 16px',
        minWidth: 'min(90vw, 320px)',
        maxWidth: 'min(95vw, 480px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={theme.colors.text.link} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
            <span style={{ fontSize: theme.fonts.size.sm, fontWeight: theme.fonts.weight.bold, color: theme.colors.text.primary }}>
              Navigate to range
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: theme.colors.text.muted, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
          >
            ✕
          </button>
        </div>

        {/* Date range info */}
        <div style={{
          background: theme.colors.bg.deep,
          borderRadius: theme.radii.sm,
          padding: '6px 10px',
          fontSize: theme.fonts.size.sm,
          color: theme.colors.text.secondary,
          fontFamily: theme.fonts.mono,
          display: 'flex', gap: 6, alignItems: 'center',
        }}>
          <span style={{ color: theme.colors.text.primary, fontWeight: theme.fonts.weight.bold }}>{sourceSymbol}</span>
          <span style={{ color: theme.colors.text.muted }}>/</span>
          <span>{sourceTf}</span>
          <span style={{ color: theme.colors.text.muted, marginLeft: 4 }}>{fmtDateFromTs(oldestTs)} – {fmtDateFromTs(newestTs)}</span>
        </div>

        <div style={{ width: '100%', height: 1, background: theme.colors.border.default }} />

        {/* Other chart rows */}
        {otherSlots.length === 0 ? (
          <div style={{ fontSize: theme.fonts.size.sm, color: theme.colors.text.muted, textAlign: 'center', padding: '8px 0' }}>
            No other charts open
          </div>
        ) : (
          otherSlots.map(id => {
            const slotSymbol = slotSymbols[Number(id)] ?? '—'
            const slotTf = (charts[id] ?? DEFAULT_CHART_STATE).tf ?? '—'
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Chart label + current state */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 10, color: theme.colors.text.muted, fontFamily: theme.fonts.mono }}>
                    Chart {Number(id) + 1}
                  </span>
                  <span style={{ fontSize: theme.fonts.size.sm, color: theme.colors.text.secondary, fontFamily: theme.fonts.mono }}>
                    {slotSymbol} / {slotTf}
                  </span>
                </div>

                {/* TF dropdown */}
                <select
                  value={selectedTfs[id] ?? 'M1'}
                  onChange={e => setSelectedTfs(prev => ({ ...prev, [id]: e.target.value }))}
                  style={{
                    background: theme.colors.bg.deep,
                    color: theme.colors.text.primary,
                    border: `1px solid ${theme.colors.border.default}`,
                    borderRadius: theme.radii.sm,
                    padding: '2px 6px',
                    fontSize: theme.fonts.size.sm,
                    fontFamily: theme.fonts.mono,
                    cursor: 'pointer',
                    minWidth: 56,
                  }}
                >
                  {TFS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                {/* Navigate button */}
                <button
                  onClick={() => navigate(id)}
                  title={`Navigate Chart ${Number(id) + 1} to ${fmtDateFromTs(oldestTs)}`}
                  style={{
                    background: theme.colors.text.link + '22',
                    border: `1px solid ${theme.colors.text.link}55`,
                    borderRadius: theme.radii.sm,
                    color: theme.colors.text.link,
                    padding: '3px 10px',
                    fontSize: theme.fonts.size.sm,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6"/>
                  </svg>
                  Go
                </button>
              </div>
            )
          })
        )}

      </div>
    </>
  )
}
