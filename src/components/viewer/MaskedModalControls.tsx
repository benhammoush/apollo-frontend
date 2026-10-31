/** Shared presentation-only controls: never load, edit or submit real configuration. */
import { theme } from '../../design-system'

export interface MaskedModalProps {
  onCancel: () => void
  // Accept the existing caller's prop without importing private configuration types.
  onConfirm?: unknown
}

export const labelStyle = { fontSize: 10, color: theme.colors.text.secondary, letterSpacing: 1, marginBottom: 7 }
const inputStyle = { width: 46, background: theme.colors.bg.input, color: theme.colors.text.primary, border: `1px solid ${theme.colors.border.muted}`, borderRadius: theme.radii.sm, padding: '4px 5px', fontSize: 11, fontFamily: theme.fonts.mono }

/** Retain the familiar field layout, but no numeric/default value or edit handler. */
export function MaskedField({ fieldNumber, select = false, hideLabel = false }: { fieldNumber: number; select?: boolean; hideLabel?: boolean }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 9, color: theme.colors.text.muted }}>
    {!hideLabel && 'xxxx'}{select
      ? <select aria-label={`Hidden field ${fieldNumber}`} disabled value="xxxx" style={inputStyle}><option value="xxxx">xxxx</option></select>
      : <input aria-label={`Hidden field ${fieldNumber}`} type="text" disabled readOnly value="xxxx" style={inputStyle} />}
  </label>
}

/** A neutral placeholder, not the private checked/unchecked configuration state. */
export function MaskedChoice({ choiceNumber }: { choiceNumber: number }) {
  return <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: theme.colors.text.primary }}>
    <input type="checkbox" disabled checked={false} readOnly aria-label={`Hidden option ${choiceNumber}`} />xxxx
    <span style={{ fontFamily: theme.fonts.mono, color: theme.colors.text.muted }}>xxxx</span>
  </label>
}

/** Keep the original footer affordances; only Cancel has an action. */
export function MaskedFooter({ onCancel }: { onCancel: () => void }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <button disabled title="Private defaults are not included in this preview" style={{ background: 'transparent', border: 'none', color: theme.colors.text.secondary, fontSize: 11 }}>Reset defaults</button>
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={onCancel} style={{ background: 'transparent', border: `1px solid ${theme.colors.border.muted}`, borderRadius: theme.radii.md, color: theme.colors.text.secondary, padding: '6px 16px', cursor: 'pointer' }}>Cancel</button>
      <button disabled title="Execution is unavailable in this interface" style={{ background: theme.colors.text.link, border: `1px solid ${theme.colors.text.link}`, borderRadius: theme.radii.md, color: theme.colors.bg.card, padding: '6px 16px', fontWeight: 700 }}>Run</button>
    </div>
  </div>
}
