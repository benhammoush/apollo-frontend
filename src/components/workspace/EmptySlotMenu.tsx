import { theme } from '../../design-system'
import type { SlotContentType } from '../../store/persistedState'

interface Props {
  onSelect: (type: SlotContentType) => void
}

const SLOT_OPTIONS: { type: SlotContentType; label: string; icon: string; desc: string }[] = [
  { type: 'chart',        label: 'Chart',        icon: '📊', desc: 'Candlestick chart with overlays' },
  { type: 'dataset',      label: 'Dataset',      icon: '📁', desc: 'Browse agent output data' },
  { type: 'logs',         label: 'Logs',         icon: '📋', desc: 'Job execution logs' },
]

export default function EmptySlotMenu({ onSelect }: Props) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: theme.colors.bg.primary,
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        padding: 16,
        maxWidth: 480,
      }}>
        {SLOT_OPTIONS.map(opt => (
          <button
            key={opt.type}
            onClick={() => onSelect(opt.type)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '14px 12px',
              background: theme.colors.bg.card,
              border: `1px solid ${theme.colors.border.default}`,
              borderRadius: theme.radii.md,
              cursor: 'pointer',
              color: theme.colors.text.primary,
              fontFamily: theme.fonts.mono,
              fontSize: theme.fonts.size.sm,
              transition: 'border-color 0.15s, background 0.15s',
              minWidth: 100,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = theme.colors.border.strong
              e.currentTarget.style.background = theme.colors.bg.hover
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = theme.colors.border.default
              e.currentTarget.style.background = theme.colors.bg.card
            }}
          >
            <span style={{ fontSize: 22 }}>{opt.icon}</span>
            <span style={{ fontWeight: theme.fonts.weight.medium }}>{opt.label}</span>
            <span style={{
              fontSize: theme.fonts.size.xs,
              color: theme.colors.text.muted,
              textAlign: 'center',
            }}>{opt.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
