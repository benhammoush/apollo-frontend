import ApolloLogo from '../layout/ApolloLogo'
import { theme } from '../../design-system'

interface Props {
  label?: string
  logoSize?: number
}

/** Full-area centered Apollo logo + label — same pattern as App Suspense fallback. */
export default function LogoLoader({ label = 'Loading', logoSize = 44 }: Props) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <ApolloLogo size={logoSize} />
      <span style={{
        fontSize: theme.fonts.size.sm,
        color: theme.colors.text.muted,
        fontFamily: theme.fonts.mono,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        {label}
      </span>
    </div>
  )
}
