import { useEffect, useRef, useState } from 'react'
import { theme } from '../../design-system'
import type { TabRecord, TabType } from '../../store/persistedState'

// ── SVG icons for non-chart tab types (14×14, stroke-based) ──────────────────

const TAB_ICONS: Partial<Record<TabType, JSX.Element>> = {
  workspace: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  engine: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <line x1="4"  y1="21" x2="4"  y2="14" /><line x1="4"  y1="10" x2="4"  y2="3"  />
      <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8"  x2="12" y2="3"  />
      <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3"  />
      <line x1="1"  y1="14" x2="7"  y2="14" /><line x1="9"  y1="8"  x2="15" y2="8"  />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  ),
  data: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  storage: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
}

const ADD_MENU_ITEMS: { type: TabType; label: string }[] = [
  { type: 'workspace',  label: 'Workspace' },
  { type: 'engine',     label: 'Engine' },
  { type: 'data',       label: 'Data' },
  { type: 'storage',    label: 'Storage' },
]

interface Props {
  tabs: TabRecord[]
  activeTabId: string
  onSwitch: (id: string) => void
  onAdd: (type?: TabType) => void
  onClose: (id: string) => void
  onRename: (id: string, name: string) => void
}

export default function ChartTabBar({ tabs, activeTabId, onSwitch, onAdd, onClose, onRename }: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const cancelledRef = useRef(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const addBtnRef = useRef<HTMLDivElement>(null)

  const isWorkspaceTab = (tab: TabRecord) => tab.type === 'workspace'

  const startRename = (tab: TabRecord) => {
    if (!isWorkspaceTab(tab)) return  // only workspace tabs are renamable
    cancelledRef.current = false
    setRenamingId(tab.id)
    setRenameVal(tab.name)
  }

  const confirmRename = (id: string) => {
    if (cancelledRef.current) return
    const name = renameVal.trim()
    if (name) onRename(id, name)
    setRenamingId(null)
  }

  const cancelRename = () => {
    cancelledRef.current = true
    setRenamingId(null)
  }

  // Keyboard shortcuts — always active (Ctrl+T, Ctrl+W, Ctrl+1-9)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      if (e.key === 't') { e.preventDefault(); onAdd() }
      else if (e.key === 'w') { e.preventDefault(); onClose(activeTabId) }
      else if (e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1
        if (tabs[idx]) { e.preventDefault(); onSwitch(tabs[idx].id) }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [tabs, activeTabId, onAdd, onClose, onSwitch])

  // Focus + select all text in rename input when it appears
  useEffect(() => {
    if (renamingId) {
      cancelledRef.current = false
      renameInputRef.current?.select()
    }
  }, [renamingId])

  // Check which singleton types are already open (for greying out in menu)
  const openSingletons = new Set(tabs.filter(t => t.type !== 'workspace').map(t => t.type))

  return (
    <div style={{
      display: 'flex',
      alignItems: 'stretch',
      height: 32,
      background: theme.colors.bg.secondary,
      borderTop: `1px solid ${theme.colors.border.default}`,
      flexShrink: 0,
      overflowX: 'auto',
      overflowY: 'hidden',
      scrollbarWidth: 'none',
      position: 'relative',
      zIndex: 9500,
    }}>

      {tabs.map(tab => {
        const isActive = tab.id === activeTabId
        const isRenaming = renamingId === tab.id
        const icon = TAB_ICONS[tab.type]

        return (
          <div
            key={tab.id}
            onClick={() => !isRenaming && onSwitch(tab.id)}
            onDoubleClick={() => startRename(tab)}
            onContextMenu={e => {
              if (!isWorkspaceTab(tab)) return
              e.preventDefault()
              onSwitch(tab.id)
              startRename(tab)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 10px 0 12px',
              minWidth: 80,
              maxWidth: 160,
              cursor: isRenaming ? 'default' : 'pointer',
              flexShrink: 0,
              borderRight: `1px solid ${theme.colors.border.default}`,
              borderBottom: isActive ? `2px solid ${theme.colors.text.link}` : '2px solid transparent',
              background: isActive ? theme.colors.bg.primary : 'transparent',
              position: 'relative',
            }}
            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = theme.colors.bg.hover }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            {/* Icon for non-chart tabs */}
            {icon && <span style={{ display: 'flex', alignItems: 'center', opacity: isActive ? 1 : 0.6 }}>{icon}</span>}

            {isRenaming ? (
              <input
                ref={renameInputRef}
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); confirmRename(tab.id) }
                  if (e.key === 'Escape') { e.preventDefault(); cancelRename() }
                }}
                onBlur={() => confirmRename(tab.id)}
                onClick={e => e.stopPropagation()}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${theme.colors.text.link}`,
                  outline: 'none',
                  color: theme.colors.text.primary,
                  fontSize: theme.fonts.size.sm,
                  fontFamily: theme.fonts.sans,
                  padding: '0 2px',
                  minWidth: 0,
                }}
              />
            ) : (
              <span style={{
                flex: 1,
                fontSize: theme.fonts.size.sm,
                color: isActive ? theme.colors.text.primary : theme.colors.text.muted,
                fontWeight: isActive ? theme.fonts.weight.medium : theme.fonts.weight.normal,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}>
                {tab.name}
              </span>
            )}

            {tabs.length > 1 && !isRenaming && (
              <button
                onClick={e => { e.stopPropagation(); onClose(tab.id) }}
                style={{
                  flexShrink: 0,
                  background: 'none',
                  border: 'none',
                  color: theme.colors.text.dimmer,
                  fontSize: 11,
                  lineHeight: 1,
                  padding: '0 2px',
                  cursor: 'pointer',
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = theme.colors.accent.red)}
                onMouseLeave={e => (e.currentTarget.style.color = theme.colors.text.dimmer)}
              >
                ×
              </button>
            )}
          </div>
        )
      })}

      {/* Add tab button with dropup */}
      <div ref={addBtnRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setShowAddMenu(v => !v)}
          title="New tab (Ctrl+T)"
          style={{
            background: 'none',
            border: 'none',
            color: theme.colors.text.dimmer,
            fontSize: 16,
            lineHeight: 1,
            padding: '0 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = theme.colors.text.muted)}
          onMouseLeave={e => (e.currentTarget.style.color = theme.colors.text.dimmer)}
        >
          +
        </button>

        {showAddMenu && (
          <>
            <div
              onClick={() => setShowAddMenu(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            />
            <div style={{
              position:      'fixed',
              bottom:        36,
              left:          addBtnRef.current?.getBoundingClientRect().left ?? 0,
              zIndex:        100,
              background:    theme.colors.bg.secondary,
              border:        `1px solid ${theme.colors.border.default}`,
              borderRadius:  theme.radii.sm,
              padding:       4,
              display:       'flex',
              flexDirection: 'column',
              gap:           2,
              minWidth:      130,
              boxShadow:     theme.shadows.dropdown,
            }}>
              {ADD_MENU_ITEMS.map(item => {
                const alreadyOpen = item.type !== 'workspace' && openSingletons.has(item.type)
                return (
                  <button
                    key={item.type}
                    onClick={() => {
                      setShowAddMenu(false)
                      onAdd(item.type)
                    }}
                    style={{
                      display:        'flex',
                      alignItems:     'center',
                      gap:            8,
                      padding:        '5px 10px',
                      fontSize:       theme.fonts.size.sm,
                      color:          alreadyOpen ? theme.colors.text.muted : theme.colors.text.secondary,
                      background:     'transparent',
                      border:         'none',
                      borderRadius:   theme.radii.sm,
                      cursor:         'pointer',
                      textAlign:      'left',
                      width:          '100%',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = theme.colors.bg.hover)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {TAB_ICONS[item.type] && <span style={{ display: 'flex' }}>{TAB_ICONS[item.type]}</span>}
                    {item.label}
                    {alreadyOpen && <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 'auto' }}>open</span>}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

    </div>
  )
}
