import { useRef, useState, useEffect, useCallback } from 'react'
import { theme } from '../design-system'

interface Props {
  value: string
  symbols: string[]
  onChange: (symbol: string) => void
  compact?: boolean   // true = narrower input for 4-chart layout
}

const RECENT_KEY = 'apollo_recent_symbols'
const MAX_RECENT = 8

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}
function saveRecent(symbol: string): void {
  const prev = loadRecent().filter(s => s !== symbol)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([symbol, ...prev].slice(0, MAX_RECENT))) } catch { /* quota */ }
}

export default function SymbolPicker({ value, symbols, onChange, compact }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const recent = loadRecent().filter(s => symbols.includes(s))

  const filtered = query.trim()
    ? symbols.filter(s => s.toLowerCase().includes(query.toLowerCase()))
    : []

  const suggestions = query.trim() ? filtered : recent

  useEffect(() => { setHighlighted(0) }, [query])

  const commit = useCallback((sym: string) => {
    if (!sym) return
    saveRecent(sym)
    onChange(sym)
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }, [onChange])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commit(suggestions[highlighted] || query.toUpperCase())
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function highlight(text: string) {
    if (!query.trim()) return <>{text}</>
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return <>{text}</>
    return (
      <>
        {text.slice(0, idx)}
        <span style={{ color: theme.colors.accent.primary, fontWeight: 700 }}>
          {text.slice(idx, idx + query.length)}
        </span>
        {text.slice(idx + query.length)}
      </>
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <input
        ref={inputRef}
        value={open ? query : value}
        placeholder={value}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => { setOpen(true); setQuery('') }}
        onKeyDown={handleKeyDown}
        style={{
          width: 'calc(7ch + 8px)',
          background: open ? theme.colors.bg.hover : 'transparent',
          border: `1px solid ${open ? theme.colors.border.strong : 'transparent'}`,
          borderRadius: theme.radii.sm,
          color: theme.colors.text.primary,
          fontSize: theme.fonts.size.md,
          fontWeight: theme.fonts.weight.bold,
          fontFamily: theme.fonts.mono,
          padding: '1px 4px',
          outline: 'none',
          cursor: open ? 'text' : 'pointer',
          transition: 'border-color 0.1s',
          boxSizing: 'border-box',
        }}
        spellCheck={false}
        autoComplete="off"
      />

      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          zIndex: 1000,
          width: 'calc(7ch + 8px)',
          background: theme.colors.bg.secondary,
          border: `1px solid ${theme.colors.border.strong}`,
          borderRadius: theme.radii.md,
          boxShadow: theme.shadows.dropdown,
          marginTop: 2,
          overflow: 'hidden',
        }}>
          {!query.trim() && recent.length > 0 && (
            <div style={{ padding: '2px 6px 1px', fontSize: 9, color: theme.colors.text.muted, borderBottom: `1px solid ${theme.colors.border.default}` }}>
              Recent
            </div>
          )}
          {suggestions.map((sym, i) => (
            <div
              key={sym}
              onMouseDown={() => commit(sym)}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                padding: '2px 6px',
                fontSize: theme.fonts.size.sm,
                fontFamily: theme.fonts.mono,
                fontWeight: theme.fonts.weight.medium,
                background: i === highlighted ? theme.colors.bg.hover : 'transparent',
                color: theme.colors.text.primary,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {highlight(sym)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
