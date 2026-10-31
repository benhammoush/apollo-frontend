import { useState } from 'react'
import { theme } from '../../design-system'
import { TFS } from './constants'
import { DrawingTool } from './drawings'
import type { FibSettings } from '../../store/persistedState'
import SymbolPicker from '../SymbolPicker'

interface Props {
  symbol: string
  symbols: string[]
  tf: string
  setTf: (t: string) => void
  onSymbolChange?: (symbol: string) => void
  compact?: boolean
  // Measure tool
  drawingTool: DrawingTool | null
  setDrawingTool: (t: DrawingTool | null) => void
  // Broker
  broker: string | null
  setBroker: (b: string | null) => void
  brokers: string[]
  // Indicators modal
  hasActiveIndicators: boolean
  onOpenIndicatorModal: () => void
  // Fib
  fibSettings: FibSettings
  onOpenFibSettings: () => void
  // Clear drawings
  onClearDrawings: () => void
}

function tabBtn(active: boolean, color?: string) {
  return {
    background: active ? (color ? color + '22' : theme.colors.bg.hover) : 'transparent',
    border: `1px solid ${active ? (color || theme.colors.border.strong) : 'transparent'}`,
    color: active ? (color || theme.colors.text.primary) : theme.colors.text.secondary,
    borderRadius: theme.radii.sm,
    padding: '1px 5px',
    fontSize: theme.fonts.size.sm,
    cursor: 'pointer',
    fontWeight: active ? theme.fonts.weight.bold : theme.fonts.weight.normal,
  } as const
}

export default function ChartToolbar({
  symbol, symbols, tf, setTf,
  onSymbolChange, compact,
  drawingTool, setDrawingTool,
  broker, setBroker, brokers,
  hasActiveIndicators, onOpenIndicatorModal,
  fibSettings, onOpenFibSettings,
  onClearDrawings,
}: Props) {
  const [showTfMenu, setShowTfMenu] = useState(false)
  const compactMenu = compact || symbols.length > 6

  return (
    <div style={{
      position: 'relative',
      zIndex: 30,
      padding: '3px 8px',
      background: theme.colors.bg.secondary,
      borderBottom: `1px solid ${theme.colors.border.default}`,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      flexShrink: 0,
    }}>

      {/* Symbol picker */}
      <SymbolPicker
        value={symbol}
        symbols={symbols}
        onChange={onSymbolChange ?? (() => { })}
        compact={compact}
      />

      <div style={{ width: 1, height: 14, background: theme.colors.border.default, flexShrink: 0 }} />

      {/* Timeframe — single button with dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowTfMenu(v => !v)}
          style={tabBtn(showTfMenu)}
        >
          {tf} ▾
        </button>
        {showTfMenu && (
          <>
            <div
              onClick={() => setShowTfMenu(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            />
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 100, marginTop: 2,
              background: theme.colors.bg.secondary,
              border: `1px solid ${theme.colors.border.default}`,
              borderRadius: theme.radii.sm,
              padding: 4,
              display: 'flex', flexDirection: 'column', gap: 2,
              minWidth: 52,
            }}>
              {TFS.map(t => (
                <button
                  key={t}
                  onClick={() => { setTf(t); setShowTfMenu(false) }}
                  style={{ ...tabBtn(tf === t), textAlign: 'left' }}
                >
                  {t}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {brokers.length > 0 && (
        <>
          <div style={{ width: 1, height: 14, background: theme.colors.border.default, flexShrink: 0 }} />
          <select
            value={broker ?? ''}
            onChange={e => setBroker(e.target.value || null)}
            style={{
              background: theme.colors.bg.deep,
              color: broker ? theme.colors.text.link : theme.colors.text.secondary,
              border: `1px solid ${broker ? theme.colors.text.link + '55' : theme.colors.border.default}`,
              borderRadius: theme.radii.sm,
              padding: '2px 6px',
              fontSize: theme.fonts.size.sm,
              fontFamily: theme.fonts.mono,
              cursor: 'pointer',
              maxWidth: 80,
            }}
          >
            {brokers.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </>
      )}

      <div style={{ width: 1, height: 14, background: theme.colors.border.default, flexShrink: 0 }} />

      {/* Indicators — single button that opens modal */}
      <button
        onClick={onOpenIndicatorModal}
        style={{ ...tabBtn(hasActiveIndicators, theme.colors.text.link), padding: compactMenu ? '3px 5px' : '3px 7px', display: 'flex', alignItems: 'center', gap: 5, maxWidth: compactMenu ? 92 : 140 }}
        title="Indicateurs"
      >
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: compactMenu ? 58 : 86,
        }}>
          {compactMenu ? 'Indic.' : 'Indicateurs'}
        </span>
        <span style={{ fontSize: 8, opacity: 0.55, flexShrink: 0 }}>▾</span>
      </button>

      {/* Measure tool */}
      <button
        onClick={() => setDrawingTool(drawingTool === 'measure' ? null : 'measure')}
        title="Measure (drag to measure price range)"
        style={{ ...tabBtn(drawingTool === 'measure', theme.colors.accent.blue), padding: '3px 6px', display: 'flex', alignItems: 'center' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="10" rx="1.5" />
          <line x1="6"  y1="7" x2="6"  y2="13" />
          <line x1="10" y1="7" x2="10" y2="11" />
          <line x1="14" y1="7" x2="14" y2="11" />
          <line x1="18" y1="7" x2="18" y2="13" />
        </svg>
      </button>

      {/* Fib retracement tool */}
      <button
        onClick={() => setDrawingTool(drawingTool === 'fib' ? null : 'fib')}
        title="Fibonacci retracement (drag from swing to swing)"
        style={{ ...tabBtn(drawingTool === 'fib', theme.colors.accent.yellow), padding: '3px 6px', display: 'flex', alignItems: 'center' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="2"  y1="4"  x2="22" y2="4"  />
          <line x1="2"  y1="7.5" x2="22" y2="7.5"  strokeWidth="1.5" strokeDasharray="2 2" />
          <line x1="2"  y1="11" x2="22" y2="11"  />
          <line x1="2"  y1="14.5" x2="22" y2="14.5"  strokeWidth="1.5" strokeDasharray="2 2" />
          <line x1="2"  y1="18" x2="22" y2="18"  />
        </svg>
      </button>

      {/* Fib settings gear */}
      {drawingTool === 'fib' && (
        <button
          onClick={onOpenFibSettings}
          title="Fib settings"
          style={{
            ...tabBtn(false),
            padding: '1px 3px',
            display: 'flex',
            alignItems: 'center',
            marginLeft: -2,
            border: 'none',
            background: 'transparent',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={theme.colors.text.axisText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      )}

      <div style={{ width: 1, height: 14, background: theme.colors.border.default, flexShrink: 0, marginLeft: 2 }} />

      {/* Clear all drawings */}
      <button
        onClick={onClearDrawings}
        title="Clear all drawings"
        style={{ ...tabBtn(false), padding: '3px 5px', display: 'flex', alignItems: 'center' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={theme.colors.accent.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>
    </div>
  )
}
