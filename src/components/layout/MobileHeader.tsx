import { useEffect, useState } from 'react'
import ApolloLogo from './ApolloLogo'
import { theme } from '../../design-system'
import { APP_DISPLAY_VERSION } from '../../appVersion'
import { usePersistedState } from '../../store/PersistedContext'
import { connectionStatus, CONNECTION_TITLE } from '../../utils/connectionStatus'

interface Props {
  wsConnected: boolean
}

const NAVBAR_UTC_OFFSET: number = 3

export default function MobileHeader({ wsConnected }: Props) {
  const { state, setUiThemeMode } = usePersistedState()
  const brokerOffset = NAVBAR_UTC_OFFSET
  const tzLabel = brokerOffset === 0 ? 'UTC' : brokerOffset > 0 ? `UTC+${brokerOffset}` : `UTC${brokerOffset}`

  const [clockTime, setClockTime] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const h = ((now.getUTCHours() + brokerOffset) % 24 + 24) % 24
      const m = now.getUTCMinutes()
      const s = now.getUTCSeconds()
      setClockTime(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [brokerOffset])

  return (
    <header style={{
      background:   theme.colors.bg.secondary,
      borderBottom: `1px solid ${theme.colors.border.default}`,
      height:       48,
      display:      'flex',
      position:     'relative',
      zIndex:       3000,
      alignItems:   'center',
      padding:      '0 14px',
      flexShrink:   0,
      gap:          10,
    }}>
      <ApolloLogo size={26} />

      <span style={{
        fontFamily:    theme.fonts.serif,
        fontSize:      13,
        fontWeight:    700,
        color:         theme.colors.text.primary,
        letterSpacing: '0.3px',
        whiteSpace:    'nowrap',
      }}>
        M&A Capital
      </span>
      <span
        title="Dashboard version (appVersion.ts)"
        style={{
          fontSize:      9,
          fontFamily:    theme.fonts.mono,
          color:         theme.colors.text.dimmer,
          fontWeight:    300,
          maxWidth:      import.meta.env.MODE === 'public' ? 48 : 120,
          overflow:      'hidden',
          textOverflow:  'ellipsis',
          whiteSpace:    'nowrap',
          flexShrink:    1,
        }}
      >
        {APP_DISPLAY_VERSION}
      </span>

      <div style={{ flex: 1 }} />

      <button
        onClick={() => setUiThemeMode(state.uiThemeMode === 'dark' ? 'light' : 'dark')}
        style={{
          background: theme.colors.bg.hover,
          border: `1px solid ${theme.colors.border.default}`,
          borderRadius: theme.radii.sm,
          color: theme.colors.text.primary,
          cursor: 'pointer',
          padding: '3px 8px',
          fontSize: 10,
          fontFamily: theme.fonts.mono,
          flexShrink: 0,
        }}
      >
        {state.uiThemeMode === 'dark' ? 'Jour' : 'Nuit'}
      </button>

      {/* Browser-to-backend connection indicator, independent of market activity. */}
      <div role="status" aria-label={`Backend ${connectionStatus(wsConnected)}`} title={CONNECTION_TITLE} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{
          width:        6,
          height:       6,
          borderRadius: '50%',
          background:   wsConnected ? theme.colors.accent.green : theme.colors.accent.red,
          boxShadow:    wsConnected ? `0 0 5px ${theme.colors.accent.green}88` : 'none',
          flexShrink:   0,
        }} />
        <span style={{ fontSize: 10, color: theme.colors.text.dimmer, fontFamily: theme.fonts.mono, fontWeight: 300 }}>
          {connectionStatus(wsConnected)}
        </span>
      </div>

      {/* Server-time clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{
          fontSize:      11,
          color:         theme.colors.text.primary,
          fontFamily:    theme.fonts.mono,
          letterSpacing: '1px',
          flexShrink:    0,
        }}>
          {clockTime}
        </span>
        <span style={{ fontSize: 8, color: theme.colors.text.dimmer, fontFamily: theme.fonts.mono, fontWeight: 300 }}>
          {tzLabel}
        </span>
      </div>
    </header>
  )
}
