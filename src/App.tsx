import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { WsMessage, PairState } from './types'
import { useWebSocket } from './hooks/useWebSocket'
import { useApi } from './hooks/useApi'
import { useSystemStatus } from './contexts/ViewerSystemStatusContext'
import { BrokerDataProvider } from './contexts/BrokerDataContext'
import { usePersistedState } from './store/PersistedContext'
import AppHeader from './components/layout/AppHeader'
import MobileHeader from './components/layout/MobileHeader'
import MobileBottomNav from './components/layout/MobileBottomNav'
import WorkspaceLayout from './components/workspace/WorkspaceLayout'
import ChartTabBar from './components/layout/ChartTabBar'
import ActivityTracker from './components/viewer/ViewerActivityTracker'
import QueryPanel from './components/QueryPanel'
import LogoLoader from './components/shared/LogoLoader'
import EngineContent from './components/pages/EngineContent'
const Storage = lazy(() => import('./components/Storage'))
import { useIsMobile } from './hooks/useIsMobile'
import { applyThemeMode, getThemeMode, theme } from './design-system'
import { getLayoutSlotCount, type TabType } from './store/persistedState'

const DataPage = lazy(() => import('./components/pages/DataPage'))

function LoadingScreen() {
  return <LogoLoader />
}

/** Map initial URL path to a tab type (for deep-link / bookmark support) */
function pathToTabType(pathname: string): TabType | null {
  if (pathname === '/')                   return 'workspace'
  if (pathname.startsWith('/engine'))     return 'engine'
  if (pathname.startsWith('/data') || pathname.startsWith('/account')) return 'data'
  return null
}

export default function App() {
  const { state, openOrFocusTab, switchTab, addTab, closeTab, renameTab } = usePersistedState()
  const isMobile  = useIsMobile()
  const location  = useLocation()

  const [livePairs, setLivePairs] = useState<Record<string, PairState>>({})

  // One-time fetch for initial symbol list — live updates come via WebSocket 'pair' messages
  const { data: pairsData } = useApi<PairState[]>('/pairs')

  const handleWsMessage = useCallback((msg: WsMessage) => {
    if (msg.type === 'pair') setLivePairs(prev => ({ ...prev, [msg.data.symbol]: msg.data }))
    if (msg.type === 'live_bar') {
      window.dispatchEvent(new CustomEvent('apollo:live_bar',          { detail: msg }))
    }
    if (msg.type === 'live_tick')        window.dispatchEvent(new CustomEvent('apollo:live_tick',         { detail: msg }))
    if (msg.type === 'tick')             window.dispatchEvent(new CustomEvent('apollo:tick',              { detail: msg }))

    if (msg.type === 'forming_bar')      window.dispatchEvent(new CustomEvent('apollo:forming_bar',      { detail: msg }))


    if (msg.type === 'brokers_changed')  window.dispatchEvent(new CustomEvent('apollo:brokers_changed'))
  }, [])
  const { connected: wsConnected, subscribe } = useWebSocket(handleWsMessage)

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('apollo:ws_connected', { detail: wsConnected }))
  }, [wsConnected])

  // Keep server-side WS subscription in sync with visible chart slots.
  // Re-subscribe on reconnect (wsConnected) and whenever the visible set changes.
  useEffect(() => {
    if (!wsConnected) return
    // Extract symbols from chart-type slots visible in the current layout
    const visibleSlots = state.slots.slice(0, getLayoutSlotCount(state.layoutMode))
    const visibleSymbols = visibleSlots
      .filter(s => s.type === 'chart')
      .map(s => (s as { symbol: string }).symbol)
    subscribe(visibleSymbols)
  }, [wsConnected, state.slots, state.layoutMode, subscribe])

  const pairs = useMemo<PairState[]>(() => [
    ...(pairsData || []).map(p => livePairs[p.symbol] || p),
    ...Object.values(livePairs).filter(p => !pairsData?.find(x => x.symbol === p.symbol)),
  ], [pairsData, livePairs])

  const symbols = useMemo(() => pairs.map(p => p.symbol),
    // Only recompute when the set of symbol names changes, not on every PairState update
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pairs.map(p => p.symbol).join(',')])

  // Deep-link support: on initial load, translate URL path to the right tab
  const [initialRouteHandled, setInitialRouteHandled] = useState(false)
  useEffect(() => {
    if (initialRouteHandled) return
    setInitialRouteHandled(true)
    const tabType = pathToTabType(location.pathname)
    if (tabType && tabType !== 'workspace') {
      openOrFocusTab(tabType)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (getThemeMode() !== state.uiThemeMode) {
    applyThemeMode(state.uiThemeMode)
  }

  return (
    <div
      key={state.uiThemeMode}
      style={{ fontFamily: theme.fonts.sans, background: theme.colors.bg.primary, color: theme.colors.text.primary, height: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <BrokerDataProvider>
      {/* ── Header ── desktop vs mobile ───────────────────────────────────── */}
      {isMobile
        ? <MobileHeader wsConnected={wsConnected} />
        : <AppHeader wsConnected={wsConnected} />
      }

      <main style={{
        flex:       1,
        display:    'flex',
        overflow:   'hidden',
        // On mobile, reserve space above bottom nav
        paddingBottom: isMobile ? 56 : 0,
      }}>
        {/* ── Keep-alive tab renderer: all tabs stay mounted, hidden with display:none ── */}
        <div style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden', position: 'relative' }}>
          {state.tabs.map(tab => (
            <div
              key={tab.id}
              style={{
                display:       tab.id === state.activeTabId ? 'flex' : 'none',
                flex:          1,
                flexDirection: 'column',
                overflow:      'hidden',
              }}
            >
              {tab.type === 'workspace'  && <WorkspaceLayout symbols={symbols} visible={tab.id === state.activeTabId} />}
              {tab.type === 'engine'     && <EngineContent visible={tab.id === state.activeTabId} />}
              {tab.type === 'storage'   && <Suspense fallback={<LoadingScreen />}><Storage /></Suspense>}
              {tab.type === 'data'       && <Suspense fallback={<LoadingScreen />}><DataPage /></Suspense>}

            </div>
          ))}
        </div>
      </main>

      {/* ── Global tab bar (desktop only) ────────────────────────────────── */}
      {!isMobile && (
        <ChartTabBar
          tabs={state.tabs}
          activeTabId={state.activeTabId}
          onSwitch={switchTab}
          onAdd={addTab}
          onClose={closeTab}
          onRename={renameTab}
        />
      )}

      {/* ── Mobile bottom nav ───────────────────────────────────────────── */}
      {isMobile && <MobileBottomNav />}

      <QueryPanel />
      <ActivityTracker />
      </BrokerDataProvider>
    </div>
  )
}
