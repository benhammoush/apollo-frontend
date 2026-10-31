import { useCallback, useEffect, useState } from 'react'
import { theme } from '../../design-system'
import { usePersistedState } from '../../store/PersistedContext'
import { isCompactLayoutMode, type SlotState, type SlotContentType } from '../../store/persistedState'
import ChartContainer from '../chart/ChartContainer'
import EmptySlotMenu from './EmptySlotMenu'
import SlotTypeSwitcher from './SlotTypeSwitcher'
import SlotLogsViewer from './SlotLogsViewer'
import Storage from '../Storage'

interface Props {
  slotIndex: number
  symbols: string[]
  single?: boolean
  visible?: boolean
}

// Module-level variable — only one drag operation can be active at a time
let _dragSourceSlot = -1

export default function WorkspaceSlot({ slotIndex, symbols, single, visible = true }: Props) {
  const { state, setActiveSlot, setSlotSymbol, setSlotContent, moveSlot, removeSlot } = usePersistedState()

  const slot: SlotState = state.slots[slotIndex] ?? { type: 'empty' }
  const isActive = state.activeSlot === slotIndex
  const [dragOver, setDragOver] = useState(false)

  // Track which content types have been mounted (for keep-alive)
  const [mounted, setMounted] = useState<Set<SlotContentType>>(() => {
    const s = new Set<SlotContentType>()
    if (slot.type !== 'empty') s.add(slot.type)
    return s
  })

  useEffect(() => {
    if (slot.type !== 'empty') {
      setMounted(prev => prev.has(slot.type) ? prev : new Set(prev).add(slot.type))
    }
  }, [slot.type])

  const handleSelect = useCallback((type: SlotContentType) => {
    let content: SlotState
    switch (type) {
      case 'chart':        content = { type: 'chart', symbol: 'EURUSD' }; break
      case 'dataset':      content = { type: 'dataset' }; break
      case 'logs':         content = { type: 'logs' }; break
      default:             content = { type: 'empty' }; break
    }
    setSlotContent(slotIndex, content)
    if (type !== 'empty') setMounted(prev => new Set(prev).add(type))
  }, [slotIndex, setSlotContent])

  const handleClick = useCallback(() => {
    if (!isActive) setActiveSlot(slotIndex)
  }, [isActive, slotIndex, setActiveSlot])

  const handleSymbolChange = useCallback((sym: string) => {
    setSlotSymbol(slotIndex, sym)
  }, [slotIndex, setSlotSymbol])

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    removeSlot(slotIndex)
  }, [slotIndex, removeSlot])

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.stopPropagation()
    _dragSourceSlot = slotIndex
    e.dataTransfer.effectAllowed = 'move'
  }, [slotIndex])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (_dragSourceSlot >= 0 && _dragSourceSlot !== slotIndex) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOver(true)
    }
  }, [slotIndex])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const src = _dragSourceSlot
    _dragSourceSlot = -1
    if (src < 0 || src === slotIndex) return
    // Pre-mount the content type that will arrive at this position after the move
    const srcState = state.slots[src] ?? { type: 'empty' }
    if (srcState.type !== 'empty') setMounted(prev => new Set(prev).add(srcState.type))
    moveSlot(src, slotIndex)
  }, [slotIndex, state.slots, moveSlot])

  const symbol = slot.type === 'chart' ? (slot.symbol || state.slotSymbols[slotIndex] || 'EURUSD') : 'EURUSD'
  const compact = isCompactLayoutMode(state.layoutMode)

  const slotStyle = (visible: boolean): React.CSSProperties => ({
    flex: 1,
    display: visible ? 'flex' : 'none',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
  })

  const border = single
    ? 'none'
    : dragOver
      ? `1px solid ${theme.colors.accent.blue}`
      : isActive
        ? `1px solid ${theme.colors.border.muted}`
        : `1px solid ${theme.colors.border.default}`

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        flex: 1, minWidth: 0, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        border,
        borderRadius: single ? 0 : theme.radii.sm,
        overflow: 'hidden',
        position: 'relative',
        transition: 'border-color 0.15s',
      }}
    >
      {/* ── Dedicated slot header (drag · type · spacer · num · ×) ─────────── */}
      {slot.type !== 'empty' && (
        <div style={{
          position: 'relative',
          zIndex: 30,
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '0 6px',
          height: 26, flexShrink: 0,
          background: theme.colors.bg.secondary,
          borderBottom: `1px solid ${theme.colors.border.default}`,
        }}>
          {/* Drag handle */}
          <div
            draggable
            onDragStart={handleDragStart}
            onClick={e => e.stopPropagation()}
            title="Drag to move slot"
            style={{
              cursor: 'grab', userSelect: 'none',
              color: theme.colors.text.disabled,
              fontSize: 13, lineHeight: 1,
              padding: '0 2px', opacity: 0.55,
            }}
          >
            ⠿
          </div>

          {/* Type switcher */}
          <SlotTypeSwitcher currentType={slot.type} onSelect={handleSelect} />

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Slot number */}
          {!single && (
            <span style={{
              fontSize: 11, color: theme.colors.text.disabled,
              fontFamily: theme.fonts.mono, fontWeight: theme.fonts.weight.bold,
              letterSpacing: 1,
            }}>
              {slotIndex + 1}
            </span>
          )}

          {/* Close button */}
          <button
            onClick={handleClose}
            title="Close slot"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 16, height: 16, padding: 0,
              background: 'transparent', border: 'none',
              borderRadius: theme.radii.sm, cursor: 'pointer',
              color: theme.colors.text.disabled, fontSize: 15, lineHeight: 1,
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = theme.colors.accent.red
              e.currentTarget.style.background = 'rgba(248,81,73,0.12)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = theme.colors.text.disabled
              e.currentTarget.style.background = 'transparent'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* ── Empty slot menu ──────────────────────────────────────────────────── */}
      {slot.type === 'empty' && (
        <EmptySlotMenu onSelect={handleSelect} />
      )}

      {/* ── Keep-alive content areas ─────────────────────────────────────────── */}
      {mounted.has('chart') && (
        <div style={{ ...slotStyle(slot.type === 'chart'), position: 'relative', zIndex: 0 }}>
          <ChartContainer
            symbol={symbol}
            chartId={String(slotIndex)}
            symbols={symbols}
            onSymbolChange={handleSymbolChange}
            compact={compact}
            isActive={isActive}
          />
        </div>
      )}

      {mounted.has('dataset') && (
        <div style={slotStyle(slot.type === 'dataset')}>
          <Storage embedded slotIndex={slotIndex} visible={visible} />
        </div>
      )}

      {mounted.has('logs') && (
        <div style={slotStyle(slot.type === 'logs')}>
          <SlotLogsViewer visible={isActive && slot.type === 'logs'} />
        </div>
      )}
    </div>
  )
}
