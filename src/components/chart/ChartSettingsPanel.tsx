import { type RefObject, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { type ChartSettings, DEFAULT_CHART_SETTINGS } from '../../store/persistedState'

import { type LevelPeriod } from '../../types'
import { PERIOD_SETTING_KEY } from './constants'
import { theme } from '../../design-system'
import { useIsMobile } from '../../hooks/useIsMobile'

interface Props {
  showSettings: boolean
  settingsPanelRef: RefObject<HTMLDivElement>
  settings: ChartSettings
  setSettings: (u: ChartSettings | ((p: ChartSettings) => ChartSettings)) => void
  onClose: () => void
}

export default function ChartSettingsPanel({
  showSettings, settingsPanelRef, settings, setSettings, onClose,
}: Props) {
  const isMobile = useIsMobile()
  if (!showSettings) return null

  return createPortal(
    <div
      ref={settingsPanelRef}
      style={{
        position: 'fixed',
        top: 52,   // just below the navbar (48px) + a small gap
        ...(isMobile
          ? { left: 8, right: 8, width: 'auto' }
          : { right: 12, width: 260 }),
        zIndex: 4000,
        maxHeight: 'calc(100vh - 72px)',
        display: 'flex',
        flexDirection: 'column',
        background: theme.colors.bg.overlay,
        backdropFilter: 'blur(14px)',
        border: `1px solid ${theme.colors.border.muted}`,
        borderRadius: theme.radii.xl,
        boxShadow: theme.shadows.dropdown,
        fontFamily: theme.fonts.mono,
        fontSize: theme.fonts.size.sm,
        color: theme.colors.text.axisText,
      }}
    >
      {/* Header — fixed, never scrolls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 10px', flexShrink: 0 }}>
        <span style={{ fontSize: theme.fonts.size.md, fontWeight: theme.fonts.weight.bold, color: theme.colors.text.primary, letterSpacing: 0.3 }}>
          Chart Settings
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: theme.colors.text.dimmer, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
        >×</button>
      </div>

      {/* Scrollable content */}
      <div style={{ overflowY: 'auto', padding: '0 16px 14px', flex: 1 }}>

      {/* ── Section: Candles ── */}
      <SettingsSection label="Candles">
        <ColorRow
          label="Up (buy)"
          value={settings.candleUp}
          onChange={v => setSettings(s => ({ ...s, candleUp: v }))}
        />
        <ColorRow
          label="Down (sell)"
          value={settings.candleDown}
          onChange={v => setSettings(s => ({ ...s, candleDown: v }))}
        />
      </SettingsSection>

      {/* ── Section: Chart ── */}
      <SettingsSection label="Chart">
        <SettingsInfoRow label="Background" value="Follows app theme" />
        <ToggleRow
          label="Grid"
          value={settings.gridVisible}
          onChange={v => setSettings(s => ({ ...s, gridVisible: v }))}
        />
        <ColorRow
          label="Grid color"
          value={settings.gridColor}
          onChange={v => setSettings(s => ({ ...s, gridColor: v }))}
        />
      </SettingsSection>

      {/* ── Section: Period lines ── */}
      <SettingsSection label="Period lines">
        {(Object.entries(PERIOD_SETTING_KEY) as [LevelPeriod, keyof ChartSettings][]).map(([period, key]) => (
          <ColorRow
            key={period}
            label={period}
            value={settings[key] as string}
            onChange={v => setSettings(s => ({ ...s, [key]: v }))}
          />
        ))}
      </SettingsSection>

      {/* ── Section: Family lines ── */}
      <SettingsSection label="Family lines">
        <ColorRow
          label="A"
          value={settings.familyLineA}
          onChange={v => setSettings(s => ({ ...s, familyLineA: v }))}
        />
        <ColorRow
          label="B"
          value={settings.familyLineB}
          onChange={v => setSettings(s => ({ ...s, familyLineB: v }))}
        />
        <ColorRow
          label="C"
          value={settings.familyLineC}
          onChange={v => setSettings(s => ({ ...s, familyLineC: v }))}
        />
        <ColorRow
          label="D"
          value={settings.familyLineD}
          onChange={v => setSettings(s => ({ ...s, familyLineD: v }))}
        />
      </SettingsSection>

      {/* Reset button */}
      <button
        onClick={() => setSettings({ ...DEFAULT_CHART_SETTINGS })}
        style={{
          marginTop: 12,
          width: '100%',
          background: theme.colors.bg.hover,
          border: `1px solid ${theme.colors.border.muted}`,
          borderRadius: theme.radii.md,
          color: theme.colors.text.axisText,
          fontSize: theme.fonts.size.sm,
          padding: '5px 0',
          cursor: 'pointer',
        }}
      >
        Reset to defaults
      </button>
      </div>{/* end scrollable content */}
    </div>
    ,
    document.body,
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** A collapsible section group with a subtle label. */
function SettingsSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 9, color: theme.colors.text.dimmer, textTransform: 'uppercase',
        letterSpacing: 0.8, marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {children}
      </div>
    </div>
  )
}

/** A single labeled color picker row. */
function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 8,
    }}>
      <span style={{ color: theme.colors.text.axisText, fontSize: theme.fonts.size.sm, flex: 1 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Hex value — shows current color as text */}
        <span style={{
          color: theme.colors.text.dimmer, fontSize: theme.fonts.size.xs,
          fontFamily: theme.fonts.mono,
        }}>
          {value}
        </span>
        {/* Native color picker — styled as a small swatch */}
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: 22, height: 22,
            border: `1px solid ${theme.colors.border.muted}`,
            borderRadius: 4,
            padding: 1,
            background: 'transparent',
            cursor: 'pointer',
          }}
        />
      </div>
    </div>
  )
}

function SettingsInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ color: theme.colors.text.axisText, fontSize: theme.fonts.size.sm, flex: 1 }}>{label}</span>
      <span style={{ color: theme.colors.text.dimmer, fontSize: theme.fonts.size.xs, fontFamily: theme.fonts.mono }}>
        {value}
      </span>
    </div>
  )
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ color: theme.colors.text.axisText, fontSize: theme.fonts.size.sm, flex: 1 }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 32, height: 18,
          borderRadius: 9,
          border: 'none',
          background: value ? theme.colors.chart.up : theme.colors.border.muted,
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.15s',
        }}
      >
        <span style={{
          position: 'absolute',
          top: 2,
          left: value ? 16 : 2,
          width: 14, height: 14,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.15s',
        }} />
      </button>
    </div>
  )
}
