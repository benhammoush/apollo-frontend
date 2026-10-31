import { useCallback, useEffect, useRef, useState } from 'react'
import { theme } from '../../design-system'

/** Market-specific selection stays outside the reusable presentation layer. */
export function SymbolMultiSelect({
  allSymbols,
  value,
  onChange,
}: {
  allSymbols: string[]
  value: 'all' | string[]
  onChange: (v: 'all' | string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const isAll = value === 'all'
  const selected = isAll ? [] : (value as string[])

  const filtered = query.trim()
    ? allSymbols.filter(s => s.toLowerCase().includes(query.toLowerCase()))
    : allSymbols

  const triggerLabel = isAll
    ? 'All symbols'
    : selected.length <= 3
      ? selected.join(', ')
      : `${selected.length} symbols selected`

  const toggleSymbol = useCallback((sym: string) => {
    if (isAll) {
      onChange([sym])
    } else {
      const next = selected.includes(sym)
        ? selected.filter(s => s !== sym)
        : [...selected, sym]
      onChange(next.length === 0 ? 'all' : next)
    }
  }, [isAll, selected, onChange])

  const selectAll = useCallback(() => {
    onChange('all')
    setOpen(false)
  }, [onChange])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    if (open) {
      document.addEventListener('mousedown', handle)
      return () => document.removeEventListener('mousedown', handle)
    }
  }, [open])

  const selectStyle: React.CSSProperties = {
    width: '100%',
    background: theme.colors.bg.input,
    border: `1px solid ${open ? theme.colors.border.strong : theme.colors.border.muted}`,
    color: theme.colors.text.primary,
    borderRadius: 4,
    padding: '3px 6px',
    fontSize: 11,
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    userSelect: 'none',
  }

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    marginTop: 2,
    background: theme.colors.bg.secondary,
    border: `1px solid ${theme.colors.border.strong}`,
    borderRadius: 4,
    boxShadow: theme.shadows.dropdown,
    overflow: 'hidden',
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={selectStyle} onClick={() => { setOpen(!open); setQuery('') }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {triggerLabel}
        </span>
        <span style={{ fontSize: 9, color: theme.colors.text.muted, flexShrink: 0 }}>▾</span>
      </div>

      {open && (
        <div style={dropdownStyle}>
          <div
            onClick={selectAll}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: isAll ? theme.colors.text.link : theme.colors.text.primary,
              background: isAll ? `${theme.colors.text.link}15` : 'transparent',
            }}
          >
            <span style={{ fontSize: 10, width: 14, textAlign: 'center' }}>
              {isAll ? '●' : '○'}
            </span>
            All symbols
          </div>

          <div style={{ height: 1, background: theme.colors.border.muted }} />

          <div style={{ padding: '4px 6px' }}>
            <input
              placeholder="Search symbols..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                width: '100%',
                background: theme.colors.bg.input,
                border: `1px solid ${theme.colors.border.muted}`,
                color: theme.colors.text.primary,
                borderRadius: 3,
                padding: '2px 6px',
                fontSize: 10,
                boxSizing: 'border-box',
                outline: 'none',
              }}
              onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }}
            />
          </div>

          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '6px 8px', fontSize: 10, color: theme.colors.text.muted }}>
                No symbols match
              </div>
            ) : (
              filtered.map(sym => {
                const checked = isAll ? false : selected.includes(sym)
                return (
                  <div
                    key={sym}
                    onClick={() => toggleSymbol(sym)}
                    style={{
                      padding: '3px 8px',
                      fontSize: 11,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: theme.colors.text.primary,
                      background: checked ? `${theme.colors.text.link}10` : 'transparent',
                    }}
                  >
                    <span style={{ fontSize: 10, width: 14, textAlign: 'center', color: checked ? theme.colors.text.link : theme.colors.text.muted }}>
                      {checked ? '■' : '□'}
                    </span>
                    {sym}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
