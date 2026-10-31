import { useState } from 'react'
import { theme } from '../../design-system'
import type { FibSettings, FibLevelConfig } from '../../store/persistedState'
import { DEFAULT_FIB_SETTINGS } from '../../store/persistedState'

interface Props {
  open: boolean
  settings: FibSettings
  onChange: (settings: FibSettings) => void
  onClose: () => void
}

export default function FibSettingsModal({ open, settings, onChange, onClose }: Props) {
  const [levels, setLevels] = useState<FibLevelConfig[]>(() =>
    settings.levels.map(l => ({ ...l })),
  )
  const [lineColor, setLineColor] = useState(settings.lineColor)
  const [showLabels, setShowLabels] = useState(settings.showLabels)
  const [extendLines, setExtendLines] = useState(settings.extendLines)

  if (!open) return null

  const apply = () => {
    onChange({ levels: levels.map(l => ({ ...l })), lineColor, showLabels, extendLines })
    onClose()
  }

  const toggleVisible = (idx: number) => {
    setLevels(prev => prev.map((l, i) => i === idx ? { ...l, visible: !l.visible } : l))
  }

  const setValue = (idx: number, v: number) => {
    setLevels(prev => prev.map((l, i) => i === idx ? { ...l, value: v } : l))
  }

  const addLevel = () => {
    setLevels(prev => [...prev, { value: 0.5, visible: true }])
  }

  const removeLevel = (idx: number) => {
    if (levels.length <= 2) return
    setLevels(prev => prev.filter((_, i) => i !== idx))
  }

  const reset = () => {
    setLevels(DEFAULT_FIB_SETTINGS.levels.map(l => ({ ...l })))
    setLineColor(DEFAULT_FIB_SETTINGS.lineColor)
    setShowLabels(DEFAULT_FIB_SETTINGS.showLabels)
    setExtendLines(DEFAULT_FIB_SETTINGS.extendLines)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 40,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: theme.colors.bg.overlay,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${theme.colors.border.muted}`,
          borderRadius: theme.radii.lg,
          boxShadow: theme.shadows.dropdown,
          color: theme.colors.text.primary,
          fontFamily: theme.fonts.mono,
          overflow: 'hidden',
          width: 320,
          maxWidth: 'min(320px, calc(100% - 24px))',
          maxHeight: 'min(520px, calc(100vh - 80px))',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px 8px',
          borderBottom: `1px solid ${theme.colors.border.default}`,
          flexShrink: 0,
        }}>
          <div style={{ fontSize: theme.fonts.size.sm, fontWeight: theme.fonts.weight.bold }}>
            Fibonacci Retracement
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.colors.text.secondary,
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          padding: '10px 12px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          flex: 1,
          minHeight: 0,
        }}>
          <div style={{
            color: theme.colors.text.secondary,
            fontSize: theme.fonts.size.xs,
            fontWeight: theme.fonts.weight.medium,
          }}>
            Levels
          </div>

          {levels.map((level, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <button
                onClick={() => toggleVisible(idx)}
                style={{
                  width: 16, height: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent',
                  border: `1px solid ${level.visible ? lineColor : theme.colors.border.muted}`,
                  borderRadius: 3,
                  cursor: 'pointer',
                  color: level.visible ? lineColor : theme.colors.text.dimmer,
                  fontSize: 10,
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                {level.visible ? '✓' : ''}
              </button>
              <span style={{
                color: level.visible ? theme.colors.text.primary : theme.colors.text.dimmer,
                fontSize: theme.fonts.size.xs,
                minWidth: 42,
                flexShrink: 0,
              }}>
                {(level.value * 100).toFixed(1)}%
              </span>
              <input
                type="number"
                value={level.value}
                min={-5}
                max={5}
                step={0.001}
                onChange={e => setValue(idx, Number(e.target.value))}
                style={{
                  width: 60,
                  background: theme.colors.bg.deep,
                  color: level.visible ? theme.colors.text.primary : theme.colors.text.muted,
                  border: `1px solid ${theme.colors.border.muted}`,
                  borderRadius: theme.radii.sm,
                  padding: '3px 6px',
                  fontSize: theme.fonts.size.xs,
                  fontFamily: theme.fonts.mono,
                  outline: 'none',
                }}
              />
              <button
                onClick={() => removeLevel(idx)}
                disabled={levels.length <= 2}
                style={{
                  width: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: levels.length <= 2 ? theme.colors.text.dimmer : theme.colors.text.secondary,
                  cursor: levels.length <= 2 ? 'default' : 'pointer',
                  fontSize: 12,
                  padding: 0,
                  flexShrink: 0,
                  marginLeft: 'auto',
                }}
              >
                ×
              </button>
            </div>
          ))}

          <button
            onClick={addLevel}
            style={{
              padding: '3px 8px',
              borderRadius: theme.radii.sm,
              border: `1px dashed ${theme.colors.border.muted}`,
              background: 'transparent',
              color: theme.colors.text.secondary,
              cursor: 'pointer',
              fontSize: theme.fonts.size.xs,
              fontFamily: theme.fonts.mono,
              marginTop: 2,
            }}
          >
            + Add Level
          </button>

          <button
            onClick={reset}
            style={{
              padding: '3px 8px',
              borderRadius: theme.radii.sm,
              border: `1px solid ${theme.colors.border.muted}`,
              background: 'transparent',
              color: theme.colors.text.secondary,
              cursor: 'pointer',
              fontSize: theme.fonts.size.xs,
              fontFamily: theme.fonts.mono,
            }}
          >
            Reset to Default
          </button>

          <div style={{
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}>
            <span style={{
              color: theme.colors.text.secondary,
              fontSize: theme.fonts.size.xs,
            }}>
              Color
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                color: theme.colors.text.muted,
                fontSize: theme.fonts.size.xs,
              }}>
                {lineColor.replace('#', '')}
              </span>
              <input
                type="color"
                value={lineColor}
                onChange={e => setLineColor(e.target.value)}
                style={{
                  width: 24,
                  height: 20,
                  border: `1px solid ${theme.colors.border.muted}`,
                  borderRadius: theme.radii.sm,
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            marginTop: 4,
          }}>
            <input
              type="checkbox"
              checked={showLabels}
              onChange={e => setShowLabels(e.target.checked)}
              style={{ accentColor: lineColor }}
            />
            <span style={{
              color: theme.colors.text.secondary,
              fontSize: theme.fonts.size.xs,
            }}>
              Show price labels
            </span>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={extendLines}
              onChange={e => setExtendLines(e.target.checked)}
              style={{ accentColor: lineColor }}
            />
            <span style={{
              color: theme.colors.text.secondary,
              fontSize: theme.fonts.size.xs,
            }}>
              Extend lines to right edge
            </span>
          </label>
        </div>

        <div style={{
          flexShrink: 0,
          padding: '6px 10px 8px',
          borderTop: `1px solid ${theme.colors.border.default}`,
          background: theme.colors.bg.surface + 'aa',
          display: 'flex',
          gap: 6,
        }}>
          <button
            onClick={apply}
            style={{
              flex: 1,
              padding: '5px 8px',
              fontSize: theme.fonts.size.xs,
              fontWeight: theme.fonts.weight.medium,
              fontFamily: theme.fonts.mono,
              letterSpacing: '0.02em',
              textTransform: 'uppercase' as const,
              cursor: 'pointer',
              borderRadius: theme.radii.sm,
              border: `1px solid ${theme.colors.accent.blue}`,
              background: theme.colors.accent.blue + '22',
              color: theme.colors.accent.blue,
            }}
          >
            Apply
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '5px 8px',
              fontSize: theme.fonts.size.xs,
              fontWeight: theme.fonts.weight.medium,
              fontFamily: theme.fonts.mono,
              letterSpacing: '0.02em',
              textTransform: 'uppercase' as const,
              cursor: 'pointer',
              borderRadius: theme.radii.sm,
              border: `1px solid ${theme.colors.border.muted}`,
              background: 'transparent',
              color: theme.colors.text.secondary,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
