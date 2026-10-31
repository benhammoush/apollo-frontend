/**
 * EngineContent — unified engine page with all controls and job logs.
 */
import { lazy, Suspense } from 'react'
import { theme } from '../../design-system'
import ApolloLogo from '../layout/ApolloLogo'

const DatasetsTab = lazy(() => import('../DatasetsTab'))
const Logs = lazy(() => import('../Logs'))

const LOADING = (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
    <ApolloLogo size={44} />
    <span style={{ fontSize: theme.fonts.size.sm, color: theme.colors.text.muted, fontFamily: theme.fonts.mono, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
      Loading
    </span>
  </div>
)

export default function EngineContent({ visible = true }: { visible?: boolean }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Suspense fallback={LOADING}>

        {/* Section 1: scan cards + backtest config */}
        <div style={{
          flex: '0 1 auto',
          overflowY: 'auto',
          padding: '16px 20px',
          borderBottom: `1px solid ${theme.colors.border.default}`,
        }}>
          <DatasetsTab />
        </div>

        {/* Section 2: job logs */}
        <div style={{ flex: '1 1 0', display: 'flex', overflow: 'hidden', minHeight: 200 }}>
          <Logs visible={visible} />
        </div>

      </Suspense>
    </div>
  )
}
