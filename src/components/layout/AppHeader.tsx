import { useCallback, useState, useEffect } from 'react'
import { getLayoutSlotCount, type LayoutMode, type PersistedChartState, type TabType } from '../../store/persistedState'
import { usePersistedState } from '../../store/PersistedContext'
import { applySlotToChartState, type ChartTemplate } from '../../store/templateStore'
import { theme } from '../../design-system'
import { APP_DISPLAY_VERSION } from '../../appVersion'
import ApolloLogo from './ApolloLogo'
import TemplatePicker from '../TemplatePicker'
import { connectionStatus, CONNECTION_TITLE } from '../../utils/connectionStatus'

const NAV_ITEMS: { type: TabType; label: string }[] = [
  { type: 'workspace',  label: 'Workspace' },
  { type: 'engine',     label: 'Engine' },
  { type: 'storage',    label: 'Storage' },
  { type: 'data',       label: 'Data' },
]

const NAVBAR_UTC_OFFSET: number = 3

// Session hours in broker server time (UTC+2/+3 — aligned with MT5 charts)
const MARKET_SESSIONS: {
  name: string
  open: readonly [number, number]
  close: readonly [number, number]
  accent: keyof typeof theme.colors.accent
}[] = [
  { name: 'Sydney',   open: [0,  0], close: [9,  0], accent: 'purple' },
  { name: 'Tokyo',    open: [2,  0], close: [11, 0], accent: 'yellow' },
  { name: 'London',   open: [10, 0], close: [19, 0], accent: 'blue' },
  { name: 'New York', open: [15, 0], close: [0,  0], accent: 'green' },
]

function marketIsOpen(open: readonly number[], close: readonly number[], h: number, m: number) {
  const t = h * 60 + m
  const o = open[0] * 60 + open[1]
  const c = close[0] * 60 + close[1]
  if (o > c) return t >= o || t < c  // wraps midnight (e.g. Sydney 22:00–07:00)
  return t >= o && t < c
}

interface Props {
  wsConnected: boolean
}

const LAYOUT_SEQUENCE: LayoutMode[] = [1, 2, 3, 4, 6]

export default function AppHeader({ wsConnected }: Props) {
  const { state, activeTab, openOrFocusTab, setLayoutMode, setSymbolSyncEnabled, setUiThemeMode, updateChart, getChart } = usePersistedState()
  const [settingsActive, setSettingsActive] = useState(false)

  const isChartActive = activeTab.type === 'workspace'

  // Reset settings panel when switching away from charts
  useEffect(() => { if (!isChartActive) setSettingsActive(false) }, [isChartActive])

  // ── Layout controls (chart tabs only) ───────────────────────────────────────
  const { layoutMode } = state

  const currentSlots: PersistedChartState[] = Array.from({ length: 8 }, (_, i) => getChart(String(i)))

  const handleApplyTemplate = useCallback((t: ChartTemplate) => {
    setLayoutMode(t.layoutMode)
    t.slots.forEach((slot, i) => {
      updateChart(String(i), applySlotToChartState(getChart(String(i)), slot))
    })
  }, [setLayoutMode, updateChart, getChart])

  // ── Add slot handler — expand layout by one step ─────────────────────────────
  const handleAddSlot = useCallback(() => {
    const slotCount = getLayoutSlotCount(state.layoutMode)
    const effectiveMode: LayoutMode =
      slotCount === 1 ? 1 :
      slotCount === 2 ? 2 :
      slotCount === 3 ? 3 :
      slotCount === 4 ? 4 :
      6
    const curIdx = LAYOUT_SEQUENCE.indexOf(effectiveMode)
    const nextMode = LAYOUT_SEQUENCE[Math.min(curIdx + 1, LAYOUT_SEQUENCE.length - 1)]
    if (nextMode !== state.layoutMode) setLayoutMode(nextMode)
  }, [state.layoutMode, setLayoutMode])

  // ── Layout picker dropdown ────────────────────────────────────────────────────
  const [showLayoutMenu, setShowLayoutMenu] = useState(false)

  // ── Nav dropdown ─────────────────────────────────────────────────────────────
  const [showNavMenu, setShowNavMenu] = useState(false)
  const currentNavItem = NAV_ITEMS.find(t => t.type === activeTab.type) ?? NAV_ITEMS[0]

  // ── Fixed navbar timezone ──────────────────────────────────────────────────
  const brokerOffset = NAVBAR_UTC_OFFSET
  const tzLabel = brokerOffset === 0 ? 'UTC' : brokerOffset > 0 ? `UTC+${brokerOffset}` : `UTC${brokerOffset}`

  // ── Server-time clock ────────────────────────────────────────────────────────
  const [clockTime, setClockTime] = useState('')
  const [serverHM, setServerHM] = useState({ h: 0, m: 0 })
  const [showMarkets, setShowMarkets] = useState(false)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const h = ((now.getUTCHours() + brokerOffset) % 24 + 24) % 24
      const m = now.getUTCMinutes()
      const s = now.getUTCSeconds()
      setClockTime(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      )
      setServerHM({ h, m })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [brokerOffset])

  return (
    <header style={{
      background:   theme.colors.bg.secondary,
      borderBottom: `1px solid ${theme.colors.border.default}`,
      padding:      '0 14px',
      display:      'flex',
      position:     'relative',
      zIndex:       3000,
      alignItems:   'stretch',
      height:       46,
      flexShrink:   0,
      gap:          0,
    }}>

      {/* ── Brand ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 14, flexShrink: 0 }}>
        <ApolloLogo size={26} />
        <span style={{
          fontFamily:    theme.fonts.serif,
          fontSize:      14,
          fontWeight:    700,
          letterSpacing: '0.4px',
          color:         theme.colors.text.primary,
          whiteSpace:    'nowrap',
        }}>
          M&A Capital
        </span>
        <span
          title="Dashboard version (src/appVersion.ts)"
          style={{
            fontSize:      theme.fonts.size.xs,
            fontFamily:    theme.fonts.mono,
            color:          theme.colors.text.dimmer,
            fontWeight:     300,
            letterSpacing:  '0.04em',
            userSelect:     'none',
            whiteSpace:     'nowrap',
          }}
        >
          {APP_DISPLAY_VERSION}
        </span>
      </div>

      <Divider />

      {/* ── Nav dropdown ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setShowNavMenu(v => !v)}
          style={{
            background:   showNavMenu ? theme.colors.bg.hover : 'transparent',
            border:       `1px solid ${showNavMenu ? theme.colors.border.strong : 'transparent'}`,
            borderRadius: theme.radii.sm,
            color:        theme.colors.text.primary,
            cursor:       'pointer',
            fontSize:     theme.fonts.size.md,
            fontWeight:   theme.fonts.weight.medium,
            padding:      '3px 10px',
            whiteSpace:   'nowrap',
            display:      'flex',
            alignItems:   'center',
            gap:          6,
          }}
        >
          {currentNavItem.label}
          <span style={{ fontSize: 9, opacity: 0.55 }}>▾</span>
        </button>

        {showNavMenu && (
          <>
            <div
              onClick={() => setShowNavMenu(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            />
            <div style={{
              position:      'absolute',
              top:           'calc(100% + 4px)',
              left:          0,
              zIndex:        100,
              background:    theme.colors.bg.secondary,
              border:        `1px solid ${theme.colors.border.default}`,
              borderRadius:  theme.radii.sm,
              padding:       4,
              display:       'flex',
              flexDirection: 'column',
              gap:           2,
              minWidth:      150,
              boxShadow:     theme.shadows.dropdown,
            }}>
              {NAV_ITEMS.map(item => {
                const isActive = item.type === activeTab.type
                return (
                  <button
                    key={item.type}
                    onClick={() => {
                      setShowNavMenu(false)
                      openOrFocusTab(item.type)
                    }}
                    style={{
                      display:        'flex',
                      alignItems:     'center',
                      padding:        '5px 10px',
                      fontSize:       theme.fonts.size.sm,
                      fontWeight:     isActive ? theme.fonts.weight.medium : theme.fonts.weight.normal,
                      color:          isActive ? theme.colors.text.link : theme.colors.text.secondary,
                      textDecoration: 'none',
                      borderRadius:   theme.radii.sm,
                      background:     isActive ? `${theme.colors.text.link}11` : 'transparent',
                      border:         'none',
                      cursor:         'pointer',
                      width:          '100%',
                      textAlign:      'left',
                    }}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      <Divider />

      {/* ── Layout controls (chart tabs only) ─────────────────────────────── */}
      {isChartActive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px', flexShrink: 0, position: 'relative' }}>
          <button
            onClick={() => setShowLayoutMenu(v => !v)}
            title="Change layout"
            style={{
              background:   showLayoutMenu ? theme.colors.bg.hover : 'transparent',
              border:       `1px solid ${showLayoutMenu ? theme.colors.border.strong : 'transparent'}`,
              borderRadius: theme.radii.sm,
              color:        showLayoutMenu ? theme.colors.text.primary : theme.colors.text.muted,
              cursor:       'pointer',
              padding:      '3px 6px',
              display:      'flex',
              alignItems:   'center',
              gap:          5,
            }}
          >
            <LayoutIcon mode={layoutMode} size={15} />
            <span style={{ fontSize: 9, opacity: 0.55 }}>▾</span>
          </button>

          {showLayoutMenu && (
            <>
              <div onClick={() => setShowLayoutMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
              <div style={{
                position:     'absolute',
                top:          'calc(100% + 4px)',
                left:         0,
                zIndex:       100,
                background:   theme.colors.bg.secondary,
                border:       `1px solid ${theme.colors.border.default}`,
                borderRadius: theme.radii.sm,
                padding:      8,
                boxShadow:    theme.shadows.dropdown,
              }}>
                <div style={{ fontSize: 9, color: theme.colors.text.dimmer, fontFamily: theme.fonts.mono, letterSpacing: '0.5px', marginBottom: 6, fontWeight: 300 }}>
                  LAYOUT
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 292 }}>
                  {([1, 2, 5, 3, 19, 20, 21, 9, 10, 4, 11, 12, 15, 16, 17, 18, 6, 13] as LayoutMode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => { setLayoutMode(m); setShowLayoutMenu(false) }}
                      title={layoutTitle(m)}
                      style={{
                        background:   layoutMode === m ? theme.colors.bg.hover : 'transparent',
                        border:       `1px solid ${layoutMode === m ? theme.colors.border.strong : theme.colors.border.default}`,
                        borderRadius: theme.radii.sm,
                        color:        layoutMode === m ? theme.colors.text.primary : theme.colors.text.muted,
                        cursor:       'pointer',
                        padding:      6,
                        display:      'flex',
                        flexDirection:'column',
                        alignItems:   'center',
                        gap:          4,
                      }}
                    >
                      <LayoutIcon mode={m} size={28} />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div style={{ width: 1, height: 12, background: theme.colors.border.default, margin: '0 1px' }} />
          <TemplatePicker layoutMode={layoutMode} currentSlots={currentSlots} onApply={handleApplyTemplate} />
          <div style={{ width: 1, height: 12, background: theme.colors.border.default, margin: '0 1px' }} />

          {/* + Slot button — expands layout by one step */}
          {getLayoutSlotCount(state.layoutMode) < 6 && (
            <button
              onClick={handleAddSlot}
              title="Add a slot"
              style={{
                background:   'transparent',
                border:       '1px solid transparent',
                borderRadius: theme.radii.sm,
                color:        theme.colors.text.muted,
                cursor:       'pointer',
                padding:      '2px 7px',
                fontSize:     theme.fonts.size.sm,
                fontWeight:   theme.fonts.weight.medium,
                fontFamily:   theme.fonts.mono,
                display:      'flex',
                alignItems:   'center',
                gap:          3,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = theme.colors.bg.hover
                e.currentTarget.style.borderColor = theme.colors.border.strong
                e.currentTarget.style.color = theme.colors.text.primary
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.color = theme.colors.text.muted
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
              <span>Slot</span>
            </button>
          )}

          {layoutMode !== 1 && (<>
            <div style={{ width: 1, height: 12, background: theme.colors.border.default, margin: '0 1px' }} />
            <button
              onClick={() => setSymbolSyncEnabled(!state.symbolSyncEnabled)}
              title={state.symbolSyncEnabled ? 'Symbol sync ON — click to disable' : 'Symbol sync OFF — click to enable'}
              style={{
                background:   state.symbolSyncEnabled ? theme.colors.bg.hover : 'transparent',
                border:       `1px solid ${state.symbolSyncEnabled ? theme.colors.border.strong : 'transparent'}`,
                borderRadius: theme.radii.sm,
                color:        state.symbolSyncEnabled ? theme.colors.text.primary : theme.colors.text.muted,
                cursor:       'pointer',
                padding:      '3px 6px',
                display:      'flex',
                alignItems:   'center',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>
          </>)}
        </div>
      )}

      {/* ── Spacer ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── Right: server-time clock + WS indicator + settings ────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

        {/* Server-time clock with market hours hover */}
        <div
          style={{ position: 'relative' }}
          onMouseEnter={() => setShowMarkets(true)}
          onMouseLeave={() => setShowMarkets(false)}
        >
          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        5,
            cursor:     'default',
            padding:    '0 4px',
          }}>
            <span style={{
              fontSize:      theme.fonts.size.sm,
              color:         theme.colors.text.primary,
              fontFamily:    theme.fonts.mono,
              letterSpacing: '1px',
              fontWeight:    500,
            }}>
              {clockTime}
            </span>
            <span style={{
              fontSize:   9,
              color:      theme.colors.text.dimmer,
              fontFamily: theme.fonts.mono,
              fontWeight: 300,
            }}>
              {tzLabel}
            </span>
          </div>

          {showMarkets && (
            <div style={{
              position:     'absolute',
              top:          'calc(100% + 8px)',
              right:        0,
              zIndex:       200,
              background:   theme.colors.bg.secondary,
              border:       `1px solid ${theme.colors.border.default}`,
              borderRadius: theme.radii.sm,
              padding:      '8px 10px',
              minWidth:     190,
              boxShadow:    theme.shadows.dropdown,
            }}>
              <div style={{
                fontSize:      9,
                color:         theme.colors.text.dimmer,
                marginBottom:  6,
                letterSpacing: '0.5px',
                fontFamily:    theme.fonts.mono,
                fontWeight:    300,
              }}>
                MARKET SESSIONS ({tzLabel})
              </div>
              {MARKET_SESSIONS.map(mkt => {
                const open = marketIsOpen(mkt.open, mkt.close, serverHM.h, serverHM.m)
                const sessionColor = theme.colors.accent[mkt.accent]
                return (
                  <div key={mkt.name} style={{
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'space-between',
                    gap:            12,
                    padding:        '3px 0',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width:        6,
                        height:       6,
                        borderRadius: '50%',
                        background:   open ? sessionColor : theme.colors.text.disabled,
                        boxShadow:    open ? `0 0 5px ${sessionColor}88` : 'none',
                        flexShrink:   0,
                      }} />
                      <span style={{
                        fontSize:   theme.fonts.size.xs,
                        color:      open ? theme.colors.text.secondary : theme.colors.text.muted,
                        fontFamily: theme.fonts.mono,
                      }}>
                        {mkt.name}
                      </span>
                    </div>
                    <span style={{
                      fontSize:   theme.fonts.size.xs,
                      color:      theme.colors.text.dimmer,
                      fontFamily: theme.fonts.mono,
                    }}>
                      {String(mkt.open[0]).padStart(2, '0')}:{String(mkt.open[1]).padStart(2, '0')}
                      –
                      {String(mkt.close[0]).padStart(2, '0')}:{String(mkt.close[1]).padStart(2, '0')}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <Divider />

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ThemeModeButton
            active={state.uiThemeMode === 'light'}
            label="Jour"
            onClick={() => setUiThemeMode('light')}
          />
          <ThemeModeButton
            active={state.uiThemeMode === 'dark'}
            label="Nuit"
            onClick={() => setUiThemeMode('dark')}
          />
        </div>

        <Divider />

        {/* Browser-to-backend connection indicator, independent of market activity. */}
        <div role="status" aria-label={`Backend ${connectionStatus(wsConnected)}`} title={CONNECTION_TITLE} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width:        5,
            height:       5,
            borderRadius: '50%',
            background:   wsConnected ? theme.colors.accent.green : theme.colors.accent.red,
            boxShadow:    wsConnected ? `0 0 5px ${theme.colors.accent.green}88` : 'none',
          }} />
          <span style={{ fontSize: theme.fonts.size.xs, color: theme.colors.text.dimmer, fontFamily: theme.fonts.mono, fontWeight: 300 }}>
            {connectionStatus(wsConnected)}
          </span>
        </div>

        {/* Chart settings */}
        {isChartActive && (
          <>
            <Divider />
            <button
              data-chart-settings-trigger
              onClick={() => {
                setSettingsActive(v => !v)
                window.dispatchEvent(new CustomEvent('apollo:toggle-chart-settings'))
              }}
              title="Chart settings"
              style={{
                background:   settingsActive ? theme.colors.bg.hover : 'transparent',
                border:       `1px solid ${settingsActive ? theme.colors.border.strong : 'transparent'}`,
                borderRadius: theme.radii.sm,
                color:        settingsActive ? theme.colors.text.primary : theme.colors.text.muted,
                cursor:       'pointer',
                fontSize:     theme.fonts.size.md,
                lineHeight:   1,
                padding:      '3px 6px',
              }}
            >
              ⚙
            </button>
          </>
        )}

      </div>
    </header>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div style={{ width: 1, alignSelf: 'stretch', background: theme.colors.border.default, margin: '9px 2px' }} />
  )
}

function ThemeModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? theme.colors.bg.hover : 'transparent',
        border: `1px solid ${active ? theme.colors.border.strong : 'transparent'}`,
        borderRadius: theme.radii.sm,
        color: active ? theme.colors.text.primary : theme.colors.text.muted,
        cursor: 'pointer',
        padding: '3px 8px',
        fontSize: 10,
        fontFamily: theme.fonts.mono,
        letterSpacing: '0.04em',
      }}
    >
      {label}
    </button>
  )
}

function LayoutIcon({ mode, size = 16 }: { mode: LayoutMode; size?: number }) {
  const p = size * 0.07
  const g = size * 0.07
  const r = size * 0.08
  const W = size - p * 2
  const H = size - p * 2
  const hw = (W - g) / 2
  const hh = (H - g) / 2
  const tw = (W - g * 2) / 3
  const qw = (W - g * 3) / 4
  const th = (H - g * 2) / 3
  const qh = (H - g * 3) / 4

  type R = [number, number, number, number]
  // [x, y, w, h] in pixels
  const rects: R[] = (({
    1: [[p, p, W, H]],
    2: [[p, p, hw, H], [p+hw+g, p, hw, H]],
    5: [[p, p, W, hh], [p, p+hh+g, W, hh]],
    3: [
      [p,      p,      hw, hh],
      [p+hw+g, p,      hw, hh],
      [p,      p+hh+g, W,  hh],   // full-width bottom
    ],
    19: [
      [p,      p,      W,  hh],
      [p,      p+hh+g, hw, hh],
      [p+hw+g, p+hh+g, hw, hh],
    ],
    9: [
      [p, p, W, th],
      [p, p+th+g, W, th],
      [p, p+(th+g)*2, W, th],
    ],
    10: [[p, p, tw, H], [p+tw+g, p, tw, H], [p+(tw+g)*2, p, tw, H]],
    20: [
      [p,      p,      hw, H],
      [p+hw+g, p,      hw, hh],
      [p+hw+g, p+hh+g, hw, hh],
    ],
    21: [
      [p,      p,      hw, hh],
      [p,      p+hh+g, hw, hh],
      [p+hw+g, p,      hw, H],
    ],
    4: [
      [p,      p,      hw, hh], [p+hw+g, p,      hw, hh],
      [p,      p+hh+g, hw, hh], [p+hw+g, p+hh+g, hw, hh],
    ],
    11: [
      [p, p, W, qh],
      [p, p+qh+g, W, qh],
      [p, p+(qh+g)*2, W, qh],
      [p, p+(qh+g)*3, W, qh],
    ],
    12: [
      [p, p, qw, H], [p+(qw+g), p, qw, H], [p+(qw+g)*2, p, qw, H], [p+(qw+g)*3, p, qw, H],
    ],
    6: [
      [p,         p,      tw, hh], [p+tw+g,     p,      tw, hh], [p+(tw+g)*2, p,      tw, hh],
      [p,         p+hh+g, tw, hh], [p+tw+g,     p+hh+g, tw, hh], [p+(tw+g)*2, p+hh+g, tw, hh],
    ],
    13: [
      [p,      p,          hw, th], [p+hw+g, p,          hw, th],
      [p,      p+th+g,     hw, th], [p+hw+g, p+th+g,     hw, th],
      [p,      p+(th+g)*2, hw, th], [p+hw+g, p+(th+g)*2, hw, th],
    ],
    15: [
      [p,          p,          tw, hh], [p+tw+g,     p,          tw, hh], [p+(tw+g)*2, p,          tw, hh],
      [p,          p+hh+g,     W,  hh],
    ],
    16: [
      [p,          p,          W,  hh],
      [p,          p+hh+g,     tw, hh], [p+tw+g,     p+hh+g,     tw, hh], [p+(tw+g)*2, p+hh+g,     tw, hh],
    ],
    17: [
      [p,          p,          hw, th], [p,          p+th+g,     hw, th], [p,          p+(th+g)*2, hw, th],
      [p+hw+g,     p,          hw, H],
    ],
    18: [
      [p,          p,          hw, H],
      [p+hw+g,     p,          hw, th], [p+hw+g,     p+th+g,     hw, th], [p+hw+g,     p+(th+g)*2, hw, th],
    ],
    8: [
      [p,         p,      qw, hh], [p+(qw+g),   p,      qw, hh], [p+(qw+g)*2, p,      qw, hh], [p+(qw+g)*3, p,      qw, hh],
      [p,         p+hh+g, qw, hh], [p+(qw+g),   p+hh+g, qw, hh], [p+(qw+g)*2, p+hh+g, qw, hh], [p+(qw+g)*3, p+hh+g, qw, hh],
    ],
    14: [
      [p,      p,          hw, qh], [p+hw+g, p,          hw, qh],
      [p,      p+qh+g,     hw, qh], [p+hw+g, p+qh+g,     hw, qh],
      [p,      p+(qh+g)*2, hw, qh], [p+hw+g, p+(qh+g)*2, hw, qh],
      [p,      p+(qh+g)*3, hw, qh], [p+hw+g, p+(qh+g)*3, hw, qh],
    ],
  } as Record<number, R[]>)[mode]) ?? []

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', flexShrink: 0 }}>
      {rects.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx={r} fill="currentColor" opacity={0.75} />
      ))}
    </svg>
  )
}

function layoutTitle(mode: LayoutMode): string {
  switch (mode) {
    case 1: return '1 chart'
    case 2: return '2 charts (horizontal)'
    case 5: return '2 charts (vertical)'
    case 3: return '3 charts (2 top, 1 bottom)'
    case 19: return '3 charts (1 top, 2 bottom)'
    case 20: return '3 charts (1 left, 2 right)'
    case 21: return '3 charts (2 left, 1 right)'
    case 9: return '3 charts (vertical stack)'
    case 10: return '3 charts (horizontal row)'
    case 4: return '4 charts (2x2)'
    case 11: return '4 charts (vertical stack)'
    case 12: return '4 charts (horizontal row)'
    case 15: return '4 charts (3 top, 1 bottom)'
    case 16: return '4 charts (1 top, 3 bottom)'
    case 17: return '4 charts (3 left, 1 right)'
    case 18: return '4 charts (1 left, 3 right)'
    case 6: return '6 charts (3x2)'
    case 13: return '6 charts (2x3)'
    case 8: return '8 charts (4x2)'
    case 14: return '8 charts (2x4)'
    default: return 'Layout'
  }
}
