import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

import { theme } from '../theme'

export function LaunchCard({
  borderColor,
  badgeLabel,
  badgeBg,
  badgeColor,
  subtitle,
  headerMeta,
  hint,
  message,
  children,
  footer,
  minWidth = 170,
}: {
  borderColor: string
  badgeLabel: string
  badgeBg: string
  badgeColor: string
  subtitle?: string
  headerMeta?: ReactNode
  hint?: ReactNode
  message?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  minWidth?: number
}) {
  return (
    <div style={{
      background: theme.colors.bg.surface,
      border: `1px solid ${borderColor}40`,
      borderRadius: 8,
      padding: '12px 14px',
      minWidth,
      flex: '0 0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 4,
          background: badgeBg,
          color: badgeColor,
          display: 'inline-block',
          marginBottom: 6,
        }}>
          {badgeLabel}
        </span>
        {subtitle && <div style={{ fontSize: 10, color: theme.colors.text.muted }}>{subtitle}</div>}
        {headerMeta}
      </div>

      {hint && (
        <div style={{ fontSize: 9, color: theme.colors.text.dimmer, fontStyle: 'italic' }}>
          {hint}
        </div>
      )}

      {message}
      {children}
      {footer}
    </div>
  )
}

export function LaunchField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <div style={{ fontSize: 9, color: theme.colors.text.dimmer, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2, fontWeight: 300 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

export function LaunchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        background: theme.colors.bg.input,
        border: `1px solid ${theme.colors.border.muted}`,
        color: theme.colors.text.primary,
        borderRadius: 4,
        padding: '3px 6px',
        fontSize: 11,
        boxSizing: 'border-box',
        ...(props.style ?? {}),
      }}
    />
  )
}

export function LaunchSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        width: '100%',
        background: theme.colors.bg.input,
        border: `1px solid ${theme.colors.border.muted}`,
        color: theme.colors.text.primary,
        borderRadius: 4,
        padding: '3px 6px',
        fontSize: 11,
        boxSizing: 'border-box',
        ...(props.style ?? {}),
      }}
    />
  )
}

export function LaunchActionButton({
  label,
  disabled,
  color,
  hoverColor,
  onClick,
}: {
  label: string
  disabled?: boolean
  color?: string
  hoverColor?: string
  onClick?: () => void
}) {
  const c = color ?? theme.colors.text.link
  const h = hoverColor ?? theme.colors.accent.blue
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? theme.colors.bg.surface : c,
        border: `1px solid ${disabled ? theme.colors.border.muted : c}`,
        color: disabled ? theme.colors.text.muted : theme.colors.bg.card,
        borderRadius: 6,
        padding: '4px 10px',
        fontSize: 11,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 700,
        marginTop: 'auto',
      }}
      onMouseEnter={e => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = h
      }}
      onMouseLeave={e => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = c
      }}
    >
      {label}
    </button>
  )
}

export function LaunchProgress({
  current,
  total,
  color,
  statusLabel,
}: {
  current: number
  total: number
  color: string
  statusLabel: string
}) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: theme.fonts.mono }}>
          {current}/{total}
        </span>
        <span style={{ fontSize: 10, color: theme.colors.text.muted }}>{statusLabel}</span>
      </div>
      <div style={{ height: 2, background: theme.colors.bg.surface, borderRadius: 1, marginTop: 4 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 1, transition: 'width 0.3s' }} />
      </div>
    </>
  )
}
