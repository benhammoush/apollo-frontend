import { useMemo, useState } from 'react'
import { theme } from '../../design-system'
import type { ChartIndicatorId } from '../../store/persistedState'

interface ActiveIndicatorItem {
  id: ChartIndicatorId
  label: string
}

interface Props {
  activeIndicators: ActiveIndicatorItem[]
  selectedIndicatorId: ChartIndicatorId | null
  onSelectIndicator: (id: ChartIndicatorId) => void
}

export default function ChartActiveIndicators({ activeIndicators, selectedIndicatorId, onSelectIndicator }: Props) {
  const [expanded, setExpanded] = useState(false)

  const title = useMemo(() => `Indicators ${activeIndicators.length}`, [activeIndicators.length])

  if (activeIndicators.length === 0) return null

  return (
    <div style={{ position: 'absolute', left: 8, bottom: 72, zIndex: 22, pointerEvents: 'auto' }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          borderRadius: theme.radii.sm,
          border: `1px solid ${theme.colors.border.default}`,
          background: theme.colors.bg.secondary + 'cc',
          color: theme.colors.text.primary,
          fontSize: 10,
          fontFamily: theme.fonts.mono,
          cursor: 'pointer',
          boxShadow: theme.shadows.dropdown,
          backdropFilter: 'blur(4px)',
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: 8, opacity: 0.6 }}>{expanded ? '▴' : '▾'}</span>
      </button>

      {expanded && (
        <div style={{
          marginTop: 4,
          minWidth: 132,
          padding: 4,
          borderRadius: theme.radii.sm,
          border: `1px solid ${theme.colors.border.default}`,
          background: theme.colors.bg.secondary + 'ee',
          boxShadow: theme.shadows.dropdown,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          {activeIndicators.map(indicator => {
            const active = indicator.id === selectedIndicatorId
            return (
              <button
                key={indicator.id}
                onClick={() => onSelectIndicator(indicator.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  width: '100%',
                  padding: '3px 6px',
                  borderRadius: theme.radii.sm,
                  border: `1px solid ${active ? theme.colors.text.link + '55' : theme.colors.border.grid}`,
                  background: active ? theme.colors.text.link + '18' : 'transparent',
                  color: active ? theme.colors.text.primary : theme.colors.text.secondary,
                  cursor: 'pointer',
                  fontSize: 10,
                  fontFamily: theme.fonts.mono,
                  textAlign: 'left',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{indicator.label}</span>
                <span style={{ fontSize: 8, opacity: 0.6 }}>⚙</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
