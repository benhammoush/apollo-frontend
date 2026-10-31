import React from 'react'
import { theme } from './theme'

export const inputStyle: React.CSSProperties = {
  background: 'var(--apollo-colors-bg-deep)', color: 'var(--apollo-colors-text-primary)', border: '1px solid var(--apollo-colors-border-muted)',
  borderRadius: theme.radii.sm, padding: '3px 6px', fontSize: theme.fonts.size.sm,
  fontFamily: theme.fonts.mono, width: '100%',
}

export const inputStyleLg: React.CSSProperties = {
  background: 'var(--apollo-colors-bg-input)', color: 'var(--apollo-colors-text-primary)', border: '1px solid var(--apollo-colors-border-default)',
  borderRadius: 4, padding: '6px 10px', fontSize: 12,
  fontFamily: theme.fonts.mono, width: '100%', boxSizing: 'border-box',
}

export const selectStyleLg: React.CSSProperties = {
  ...inputStyleLg,
  cursor: 'pointer',
}

export const checkStyle: React.CSSProperties = { accentColor: 'var(--apollo-colors-text-link)', width: 13, height: 13 }

export const buttonPrimaryStyle = (disabled?: boolean, color = theme.colors.accent.green): React.CSSProperties => ({
  background: disabled ? theme.colors.bg.surface : `${color}22`,
  border: `1px solid ${color}`,
  borderRadius: 4,
  color: disabled ? theme.colors.text.disabled : color,
  fontSize: 11, fontWeight: 700, padding: '6px 16px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
})

export const buttonSecondaryStyle = (disabled?: boolean): React.CSSProperties => ({
  background: 'transparent',
  border: `1px solid ${theme.colors.border.default}`,
  borderRadius: 4,
  color: theme.colors.text.secondary,
  fontSize: 11, padding: '6px 16px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
})

export const buttonDangerStyle = (disabled?: boolean): React.CSSProperties => ({
  background: 'transparent',
  border: `1px solid ${disabled ? theme.colors.border.default : theme.colors.accent.red}`,
  borderRadius: 4,
  color: disabled ? theme.colors.text.disabled : theme.colors.accent.red,
  fontSize: 11, fontWeight: 700, padding: '6px 16px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
})

export const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 6,
}

export const labelTextStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--apollo-colors-text-secondary)',
}

export const optionalTextStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--apollo-colors-text-disabled)',
}
