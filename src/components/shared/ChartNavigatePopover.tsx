import { useEffect, useRef } from 'react'
import { theme } from '../../design-system'
import { usePersistedState } from '../../store/PersistedContext'
import { getLayoutSlotCount, DEFAULT_CHART_STATE } from '../../store/persistedState'
import { fmtDateFromTs } from '../../utils/date'

interface Props {
  targetTs: number
  anchorRect: DOMRect
  targetSymbol?: string
  onClose: () => void
}

const POPOVER_W = 260

export default function ChartNavigatePopover({ targetTs, anchorRect, targetSymbol, onClose }: Props) {
  const { state } = usePersistedState()
  const { layoutMode, slots, slotSymbols, charts } = state
  const popoverRef = useRef<HTMLDivElement>(null)

  const chartSlots = Array.from({ length: getLayoutSlotCount(layoutMode) }, (_, i) => i)
    .filter(i => slots[i]?.type === 'chart')
    .map(i => ({
      index: i,
      id: String(i),
      symbol: slots[i]?.type === 'chart' ? (slots[i].symbol || slotSymbols[i] || 'EURUSD') : 'EURUSD',
      tf: (charts[String(i)] ?? DEFAULT_CHART_STATE).tf ?? 'M1',
    }))

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  function navigate(chartId: string) {
    window.dispatchEvent(new CustomEvent('apollo:navigate', {
      detail: {
        targetChartId: chartId,
        targetTs,
        newSymbol: targetSymbol,
        highlightMs: 5000,
      },
    }))
  }

  const leftClamp = Math.max(8, anchorRect.left + anchorRect.width / 2 - POPOVER_W / 2)
  const left = Math.min(leftClamp, window.innerWidth - POPOVER_W - 8)
  const top = anchorRect.bottom + 6 > window.innerHeight - 160
    ? anchorRect.top - 160
    : anchorRect.bottom + 6

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: Math.max(8, top),
        left,
        zIndex: 9100,
        background: theme.colors.bg.secondary,
        border: `1px solid ${theme.colors.border.default}`,
        borderRadius: theme.radii.md,
        padding: '10px 12px',
        width: POPOVER_W,
        boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: theme.colors.text.primary, fontFamily: theme.fonts.mono }}>
          {targetSymbol ? `${targetSymbol} · ` : ''}{fmtDateFromTs(targetTs)}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: theme.colors.text.muted, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
        >
          ×
        </button>
      </div>

      <div style={{ width: '100%', height: 1, background: theme.colors.border.default }} />

      {chartSlots.length === 0 ? (
        <div style={{ fontSize: 11, color: theme.colors.text.muted, textAlign: 'center', padding: '8px 0' }}>
          No charts open
        </div>
      ) : (
        chartSlots.map(slot => (
          <div key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10, color: theme.colors.text.muted, fontFamily: theme.fonts.mono }}>
                Ch {slot.index + 1}
              </span>
              <span style={{ fontSize: 11, color: theme.colors.text.secondary, fontFamily: theme.fonts.mono }}>
                {slot.symbol} / {slot.tf}
              </span>
            </div>
            <button
              onClick={() => navigate(slot.id)}
              title={`Navigate Chart ${slot.index + 1} to ${fmtDateFromTs(targetTs)}`}
              style={{
                background: theme.colors.text.link + '22',
                border: `1px solid ${theme.colors.text.link}55`,
                borderRadius: theme.radii.sm,
                color: theme.colors.text.link,
                padding: '3px 10px',
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
              Go
            </button>
          </div>
        ))
      )}
    </div>
  )
}
