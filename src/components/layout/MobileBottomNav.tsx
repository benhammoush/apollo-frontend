import { usePersistedState } from '../../store/PersistedContext'
import type { TabType } from '../../store/persistedState'
import { theme } from '../../design-system'

const TABS: { type: TabType; label: string; icon: JSX.Element }[] = [
  {
    type: 'workspace',
    label: 'Workspace',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4"  />
        <line x1="6"  y1="20" x2="6"  y2="14" />
      </svg>
    ),
  },
  {
    type: 'engine',
    label: 'Engine',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4"  y1="21" x2="4"  y2="14" />
        <line x1="4"  y1="10" x2="4"  y2="3"  />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8"  x2="12" y2="3"  />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3"  />
        <line x1="1"  y1="14" x2="7"  y2="14" />
        <line x1="9"  y1="8"  x2="15" y2="8"  />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
  },
  {
    type: 'storage',
    label: 'Storage',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    type: 'data',
    label: 'Data',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5"  rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
]

export default function MobileBottomNav() {
  const { activeTab, openOrFocusTab } = usePersistedState()

  return (
    <nav style={{
      position:        'fixed',
      bottom:          0,
      left:            0,
      right:           0,
      zIndex:          1000,
      height:          56,
      paddingBottom:   'env(safe-area-inset-bottom)',
      background:      theme.colors.bg.secondary,
      borderTop:       `1px solid ${theme.colors.border.default}`,
      display:         'flex',
      alignItems:      'stretch',
    }}>
      {TABS.map(tab => {
        const isActive = tab.type === activeTab.type
        return (
          <button
            key={tab.type}
            onClick={() => openOrFocusTab(tab.type)}
            style={{
              flex:           1,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            3,
              background:     'transparent',
              border:         'none',
              color:          isActive ? theme.colors.accent.primary : theme.colors.text.muted,
              cursor:         'pointer',
              padding:        '6px 0',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {tab.icon}
            <span style={{
              fontSize:      9,
              fontWeight:    isActive ? 700 : 400,
              letterSpacing: '0.3px',
              fontFamily:    theme.fonts.sans,
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
