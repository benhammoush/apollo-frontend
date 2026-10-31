import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { theme } from '../theme'

interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  width?: number
  children: ReactNode
  footer?: ReactNode
}

export default function Modal({ title, subtitle, onClose, width = 420, children, footer }: ModalProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: theme.colors.bg.scrim,
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: width,
          background: theme.colors.bg.card,
          border: `1px solid ${theme.colors.border.default}`,
          borderRadius: 8,
          boxShadow: theme.shadows.dropdown,
          overflow: 'hidden',
          maxHeight: 'calc(100vh - 32px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${theme.colors.border.default}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: theme.colors.text.primary }}>{title}</span>
            {subtitle && (
              <span style={{ fontSize: 10, color: theme.colors.text.disabled, fontFamily: theme.fonts.mono }}>{subtitle}</span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: theme.colors.text.disabled, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 16, display: 'flex', flex: '1 1 auto', flexDirection: 'column', gap: 14, overflowY: 'auto', minHeight: 0 } as CSSProperties}>
          {children}
        </div>
        {footer && <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: `1px solid ${theme.colors.border.default}` }}>{footer}</div>}
      </div>
    </div>
  )
}
