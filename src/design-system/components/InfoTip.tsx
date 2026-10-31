import { useState, useRef } from 'react'
import { theme } from '../theme'

export function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 12, height: 12, borderRadius: '50%',
        border: `1px solid ${theme.colors.text.dimmer}`, color: theme.colors.text.dimmer,
        fontSize: 8, cursor: 'default', fontFamily: theme.fonts.sans,
        fontWeight: 700, marginLeft: 4, lineHeight: 1, userSelect: 'none',
      }}>
        i
      </span>
      {show && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: theme.colors.border.surface,
          border: `1px solid ${theme.colors.border.muted}`,
          borderRadius: theme.radii.md,
          padding: '7px 12px',
          fontSize: theme.fonts.size.xs,
          color: theme.colors.text.secondary,
          lineHeight: 1.55,
          width: 'min(95vw, 380px)',
          whiteSpace: 'normal',
          zIndex: 2000,
          pointerEvents: 'none',
          boxShadow: theme.shadows.tooltip,
        }}>
          {text}
        </div>
      )}
    </span>
  )
}
