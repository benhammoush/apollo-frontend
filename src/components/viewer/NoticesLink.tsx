import { theme } from '../../design-system'

/** The dedicated page carries full notices without loading them into the app bundle. */
export default function NoticesLink() {
  return <a href="/notices.html" target="_blank" rel="noopener noreferrer" aria-label="Notices (opens in a new tab)" style={{
    color: theme.colors.text.secondary, fontSize: 10, fontFamily: theme.fonts.mono,
    whiteSpace: 'nowrap', textUnderlineOffset: 3, flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', minHeight: 24, padding: '0 2px',
  }}>Notices</a>
}
