import { useState, useRef, useEffect } from 'react'
import { theme } from '../../design-system'
import type { SlotContentType } from '../../store/persistedState'

interface Props {
  currentType: SlotContentType
  onSelect: (type: SlotContentType) => void
}

const OPTIONS: { type: SlotContentType; label: string; icon: string }[] = [
  { type: 'chart',        label: 'Chart',        icon: '📊' },
  { type: 'dataset',      label: 'Dataset',      icon: '📁' },
  { type: 'logs',         label: 'Logs',         icon: '📋' },
  { type: 'empty',        label: 'Clear',        icon: '✕' },
]

const CURRENT_ICON: Record<SlotContentType, string> = {
  chart: '📊', dataset: '📁', logs: '📋', empty: '',
}

export default function SlotTypeSwitcher({ currentType, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          background: open ? theme.colors.bg.surface : 'transparent',
          border: `1px solid ${open ? theme.colors.border.strong : theme.colors.border.default}`,
          borderRadius: theme.radii.sm,
          cursor: 'pointer',
          color: theme.colors.text.muted,
          fontSize: theme.fonts.size.xs,
          padding: '1px 5px',
          transition: 'opacity 0.15s, background 0.15s',
          opacity: open ? 1 : 0.5,
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.opacity = '0.5' }}
        title="Change slot type"
      >
        <span style={{ fontSize: 10 }}>{CURRENT_ICON[currentType]}</span>
        <span style={{ fontSize: 8, opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 2,
          background: theme.colors.bg.card,
          border: `1px solid ${theme.colors.border.strong}`,
          borderRadius: theme.radii.md,
          padding: 4,
          minWidth: 140,
          boxShadow: theme.shadows.dropdown,
          zIndex: 50,
        }}>
          {OPTIONS.filter(o => o.type !== currentType).map(opt => (
            <button
              key={opt.type}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(opt.type)
                setOpen(false)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '6px 10px',
                background: 'transparent',
                border: 'none',
                borderRadius: theme.radii.sm,
                cursor: 'pointer',
                color: opt.type === 'empty' ? theme.colors.accent.red : theme.colors.text.primary,
                fontFamily: theme.fonts.mono,
                fontSize: theme.fonts.size.sm,
                textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = theme.colors.bg.hover }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
