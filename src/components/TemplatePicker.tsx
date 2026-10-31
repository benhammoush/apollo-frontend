import { useEffect, useRef, useState } from 'react'
import { theme } from '../design-system'
import {
  type ChartTemplate, TemplateStore, type TemplateSlot,
  BUILT_IN_TEMPLATES,
} from '../store/templateStore'
import { DEFAULT_CHART_INDICATORS, type LayoutMode, type PersistedChartState } from '../store/persistedState'

interface Props {
  // Current layout state for "Save" snapshot
  layoutMode: LayoutMode
  currentSlots: PersistedChartState[]  // 4 entries, indexed by slot
  activeTemplateName?: string
  // Callbacks
  onApply: (t: ChartTemplate) => void
}

export default function TemplatePicker({ layoutMode, currentSlots, activeTemplateName, onApply }: Props) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<ChartTemplate[]>(() => TemplateStore.list())
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveName, setSaveName] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  function refresh() { setTemplates(TemplateStore.list()) }

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSaving(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function snapshotSlots(): TemplateSlot[] {
    return Array.from({ length: 4 }, (_, i) => {
      const cs = currentSlots[i]
      if (!cs) return { timeframe: 'D1', source: {}, showTrends: {}, indicators: { ...DEFAULT_CHART_INDICATORS } }
      return {
        timeframe: cs.tf,
        source: cs.sources as Record<string, string | null>,
        showTrends: cs.showTrends,
        indicators: cs.indicators,
      }
    })
  }

  function handleSave() {
    if (!saveName.trim()) return
    TemplateStore.create(saveName.trim(), layoutMode, snapshotSlots())
    setSaving(false)
    setSaveName('')
    refresh()
  }

  function handleRename(id: string) {
    if (!renameVal.trim()) return
    TemplateStore.rename(id, renameVal.trim())
    setRenaming(null)
    refresh()
  }

  function handleDelete(id: string) {
    TemplateStore.delete(id)
    refresh()
  }

  const userTemplates = templates.filter(t => !t.readonly)
  const builtIn = BUILT_IN_TEMPLATES

  const btn = (label: string, action: () => void, color?: string) => (
    <button
      onMouseDown={e => { e.preventDefault(); action() }}
      style={{
        background: 'transparent',
        border: 'none',
        color: color || theme.colors.text.muted,
        cursor: 'pointer',
        fontSize: theme.fonts.size.xs,
        padding: '0 3px',
        lineHeight: 1,
      }}
    >{label}</button>
  )

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Chart templates"
        style={{
          background: open ? theme.colors.bg.hover : 'transparent',
          border: `1px solid ${open ? theme.colors.border.strong : 'transparent'}`,
          borderRadius: theme.radii.sm,
          color: activeTemplateName ? theme.colors.accent.primary : theme.colors.text.secondary,
          fontSize: theme.fonts.size.sm,
          cursor: 'pointer',
          padding: '2px 7px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor" style={{ display: 'block', flexShrink: 0 }}>
          <rect x="4" y="1" width="9" height="11" rx="1.5" opacity="0.3" />
          <rect x="2" y="3" width="9" height="11" rx="1.5" opacity="0.75" />
        </svg>
        {activeTemplateName && (
          <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeTemplateName}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          zIndex: 1000,
          width: 220,
          background: theme.colors.bg.secondary,
          border: `1px solid ${theme.colors.border.strong}`,
          borderRadius: theme.radii.md,
          boxShadow: theme.shadows.dropdown,
          marginTop: 2,
          overflow: 'hidden',
        }}>

          {/* Save section */}
          {!saving ? (
            <div
              onMouseDown={() => { setSaving(true); setSaveName('') }}
              style={{
                padding: '6px 10px',
                fontSize: theme.fonts.size.sm,
                color: theme.colors.accent.primary,
                cursor: 'pointer',
                borderBottom: `1px solid ${theme.colors.border.default}`,
              }}
            >
              + Save current as template
            </div>
          ) : (
            <div style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.colors.border.default}`, display: 'flex', gap: 4 }}>
              <input
                autoFocus
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setSaving(false) }}
                placeholder="Template name…"
                style={{
                  flex: 1, background: theme.colors.bg.input, border: `1px solid ${theme.colors.border.strong}`,
                  borderRadius: theme.radii.sm, color: theme.colors.text.primary,
                  fontSize: theme.fonts.size.sm, padding: '2px 6px', outline: 'none',
                }}
              />
              <button
                onMouseDown={handleSave}
                style={{ background: theme.colors.accent.primary, border: 'none', borderRadius: theme.radii.sm, color: theme.colors.bg.card, fontSize: theme.fonts.size.xs, padding: '2px 6px', cursor: 'pointer' }}
              >Save</button>
            </div>
          )}

          {/* User templates */}
          {userTemplates.length > 0 && (
            <div style={{ borderBottom: `1px solid ${theme.colors.border.default}` }}>
              {userTemplates.map(t => (
                <div key={t.id} style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {renaming === t.id ? (
                    <input
                      autoFocus
                      value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRename(t.id); if (e.key === 'Escape') setRenaming(null) }}
                      onBlur={() => handleRename(t.id)}
                      style={{ flex: 1, background: theme.colors.bg.input, border: `1px solid ${theme.colors.border.strong}`, borderRadius: theme.radii.sm, color: theme.colors.text.primary, fontSize: theme.fonts.size.sm, padding: '1px 4px', outline: 'none' }}
                    />
                  ) : (
                    <span
                      onMouseDown={() => { onApply(t); setOpen(false) }}
                      style={{ flex: 1, fontSize: theme.fonts.size.sm, color: theme.colors.text.primary, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {t.layoutMode}× {t.name}
                    </span>
                  )}
                  {btn('✎', () => { setRenaming(t.id); setRenameVal(t.name) })}
                  {btn('✕', () => handleDelete(t.id), theme.colors.accent.red)}
                </div>
              ))}
            </div>
          )}

          {/* Built-in templates */}
          <div style={{ padding: '4px 0' }}>
            <div style={{ padding: '2px 10px 4px', fontSize: theme.fonts.size.xs, color: theme.colors.text.muted }}>Built-in</div>
            {builtIn.map(t => (
              <div
                key={t.id}
                onMouseDown={() => { onApply(t); setOpen(false) }}
                style={{
                  padding: '4px 10px',
                  fontSize: theme.fonts.size.sm,
                  color: theme.colors.text.secondary,
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 6,
                }}
              >
                <span style={{ color: theme.colors.text.muted, fontFamily: theme.fonts.mono }}>{t.layoutMode}×</span>
                {t.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
