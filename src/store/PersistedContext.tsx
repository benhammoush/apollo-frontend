// ── PersistedContext — React context for global persisted state ───────────────
//
// Wraps the entire app (mounted in main.tsx via <PersistedProvider>).
// Any component can call usePersistedState() to read/write the full state,
// or usePersistedChart(chartId) for the convenience chart-scoped slice.
//
// Update flow:
//   component calls update/updateChart
//   → setState runs synchronously (React re-renders with new values)
//   → PersistenceManager.save() fires after 400 ms debounce (localStorage write)
//
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { PersistenceManager } from './persistence'
import {
  PersistedState,
  PersistedChartState,
  DEFAULT_CHART_STATE,
  DEFAULT_TAB,
  LayoutMode,
  getLayoutSlotCount,
  TabRecord,
  TabType,
  WorkspaceTabRecord,
  SlotState,
  withChartStateDefaults,
  snapshotActiveTab,
} from './persistedState'
import type { UiThemeMode } from '../design-system'

// ── Context shape ─────────────────────────────────────────────────────────────

interface PersistedContextValue {
  state: PersistedState
  // Top-level updaters
  setUiThemeMode: (mode: UiThemeMode) => void
  setChartSettings: (settings: PersistedChartState['settings']) => void
  setSelectedSymbol: (symbol: string) => void
  // Multi-chart layout updaters
  setLayoutMode: (mode: LayoutMode) => void
  setActiveSlot: (slot: number) => void
  setSlotSymbol: (slotIndex: number, symbol: string) => void
  setSymbolSyncEnabled: (enabled: boolean) => void
  // Workspace slot updaters
  setSlotContent: (slotIndex: number, content: SlotState) => void
  /** Move a slot by insert/shift (not swap): removes from `from`, inserts at `to`, shifting others */
  moveSlot: (from: number, to: number) => void
  /** Remove a slot, compact remaining slots left, shrink layout by one step */
  removeSlot: (slotIndex: number) => void
  updatePanelSizes: (sizes: { rows: number[]; cols: number[][] }) => void
  // Per-chart updater — used by ChartContainer via usePersistedChart()
  updateChart: (chartId: string, patch: Partial<PersistedChartState>) => void
  // Read a chart's state; returns DEFAULT_CHART_STATE if the chartId is new
  getChart: (chartId: string) => PersistedChartState
  // Tab management
  switchTab: (id: string) => void
  addTab: (type?: TabType) => void
  closeTab: (id: string) => void
  renameTab: (id: string, name: string) => void
  openOrFocusTab: (type: TabType) => void
  /** The currently active tab record */
  activeTab: TabRecord
}

const PersistedContext = createContext<PersistedContextValue | null>(null)

const LAYOUT_SEQ: LayoutMode[] = [1, 2, 3, 4, 6, 8]

// ── Provider ──────────────────────────────────────────────────────────────────

export function PersistedProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage on the very first render (synchronous read)
  const [state, setState] = useState<PersistedState>(() => PersistenceManager.load())

  // Generic top-level patch — merges and schedules a save
  const update = useCallback((patch: Partial<PersistedState>) => {
    setState(prev => {
      const next = { ...prev, ...patch }
      PersistenceManager.save(next)
      return next
    })
  }, [])

  const setSelectedSymbol = useCallback(
    (symbol: string) => update({ selectedSymbol: symbol }),
    [update],
  )

  const setUiThemeMode = useCallback(
    (mode: UiThemeMode) => update({ uiThemeMode: mode }),
    [update],
  )

  const setChartSettings = useCallback(
    (settings: PersistedChartState['settings']) => update({ chartSettings: settings }),
    [update],
  )

  const setLayoutMode = useCallback(
    (mode: LayoutMode) => {
      setState(prev => {
        // Ensure slots array is long enough for the new layout mode
        const needed = getLayoutSlotCount(mode)
        const slots = [...prev.slots]
        while (slots.length < needed) slots.push({ type: 'empty' })
        const next: PersistedState = { ...prev, layoutMode: mode, slots }
        PersistenceManager.save(next)
        return next
      })
    },
    [],
  )

  const setActiveSlot = useCallback(
    (slot: number) => update({ activeSlot: slot }),
    [update],
  )

  const setSlotSymbol = useCallback(
    (slotIndex: number, symbol: string) => {
      setState(prev => {
        const nextSymbols = prev.symbolSyncEnabled
          ? (prev.slotSymbols.map(() => symbol) as PersistedState['slotSymbols'])
          : (prev.slotSymbols.map((s, i) => i === slotIndex ? symbol : s) as PersistedState['slotSymbols'])
        // Also update the slots array for chart-type slots
        const nextSlots = prev.slots.map((slot, i) => {
          if (prev.symbolSyncEnabled || i === slotIndex) {
            if (slot.type === 'chart') return { ...slot, symbol }
          }
          return slot
        })
        const nextState: PersistedState = { ...prev, slotSymbols: nextSymbols, slots: nextSlots }
        PersistenceManager.save(nextState)
        return nextState
      })
    },
    [],
  )

  const setSymbolSyncEnabled = useCallback(
    (enabled: boolean) => update({ symbolSyncEnabled: enabled }),
    [update],
  )

  const setSlotContent = useCallback(
    (slotIndex: number, content: SlotState) => {
      setState(prev => {
        const nextSlots = [...prev.slots]
        // Grow the array if needed
        while (nextSlots.length <= slotIndex) nextSlots.push({ type: 'empty' })
        nextSlots[slotIndex] = content
        // Keep slotSymbols in sync for chart slots
        const nextSymbols = [...prev.slotSymbols] as PersistedState['slotSymbols']
        if (content.type === 'chart' && slotIndex < nextSymbols.length) {
          nextSymbols[slotIndex] = content.symbol
        }
        const nextState: PersistedState = { ...prev, slots: nextSlots, slotSymbols: nextSymbols }
        PersistenceManager.save(nextState)
        return nextState
      })
    },
    [],
  )

  const moveSlot = useCallback((from: number, to: number) => {
    if (from === to) return
    setState(prev => {
      // Move element in slots array (remove from `from`, insert at `to`)
      const nextSlots = [...prev.slots]
      const [movedSlot] = nextSlots.splice(from, 1)
      nextSlots.splice(to, 0, movedSlot)

      // Same move on slotSymbols
      const nextSymbols = [...prev.slotSymbols] as PersistedState['slotSymbols']
      const [movedSym] = nextSymbols.splice(from, 1)
      nextSymbols.splice(to, 0, movedSym)

      // Remap charts Record: build the index order produced by the array move
      // order[newIdx] = origIdx  (which original slot is now at position newIdx)
      const len = Math.max(nextSlots.length, from + 1, to + 1)
      const order = Array.from({ length: len }, (_, i) => i)
      order.splice(from, 1)
      order.splice(to, 0, from)
      const nextCharts: Record<string, typeof prev.charts[string]> = {}
      order.forEach((origIdx, newIdx) => {
        const c = prev.charts[String(origIdx)]
        if (c) nextCharts[String(newIdx)] = c
      })

      // Keep activeSlot tracking the moved content
      let nextActiveSlot = prev.activeSlot
      if (prev.activeSlot === from) {
        nextActiveSlot = to
      } else if (from < to && prev.activeSlot > from && prev.activeSlot <= to) {
        nextActiveSlot = prev.activeSlot - 1
      } else if (from > to && prev.activeSlot >= to && prev.activeSlot < from) {
        nextActiveSlot = prev.activeSlot + 1
      }

      const next: PersistedState = {
        ...prev,
        slots: nextSlots,
        slotSymbols: nextSymbols,
        charts: nextCharts,
        activeSlot: nextActiveSlot,
      }
      PersistenceManager.save(next)
      return next
    })
  }, [])

  const removeSlot = useCallback((slotIndex: number) => {
    setState(prev => {
      const n = getLayoutSlotCount(prev.layoutMode)
      if (n <= 1) return prev // cannot remove the last slot
      // Compact: shift remaining visible slots left over the removed index
      const newSlots = [...prev.slots]
      while (newSlots.length < n) newSlots.push({ type: 'empty' }) // ensure no undefined gaps
      for (let i = slotIndex; i < n - 1; i++) {
        newSlots[i] = newSlots[i + 1]
      }
      newSlots[n - 1] = { type: 'empty' }
      // Shrink layout by one step based on slot count, even for alternate shapes
      const effectiveLayoutMode: LayoutMode =
        n === 1 ? 1 :
        n === 2 ? 2 :
        n === 3 ? 3 :
        n === 4 ? 4 :
        n === 6 ? 6 :
        8
      const seqIdx = LAYOUT_SEQ.indexOf(effectiveLayoutMode)
      const newMode = LAYOUT_SEQ[Math.max(seqIdx - 1, 0)]
      const newActiveSlot = Math.min(prev.activeSlot, (newMode as number) - 1)
      const next: PersistedState = { ...prev, slots: newSlots, layoutMode: newMode, activeSlot: newActiveSlot }
      PersistenceManager.save(next)
      return next
    })
  }, [])

  const updatePanelSizes = useCallback(
    (sizes: { rows: number[]; cols: number[][] }) => update({ panelSizes: sizes }),
    [update],
  )

  // Deep-merge a partial patch into a specific chart's state
  const updateChart = useCallback(
    (chartId: string, patch: Partial<PersistedChartState>) => {
      setState(prev => {
        const current = withChartStateDefaults(prev.charts[chartId] ?? DEFAULT_CHART_STATE)
        const next: PersistedState = {
          ...prev,
          charts: {
            ...prev.charts,
            [chartId]: { ...current, ...patch },
          },
        }
        PersistenceManager.save(next)
        return next
      })
    },
    [],
  )

  // Read a chart's state; fall back to defaults for first-time chartIds
  const getChart = useCallback(
    (chartId: string): PersistedChartState => ({
      ...withChartStateDefaults(state.charts[chartId] ?? DEFAULT_CHART_STATE),
      settings: { ...state.chartSettings },
    }),
    [state.charts, state.chartSettings],
  )

  // ── Tab management ─────────────────────────────────────────────────────────

  /** Apply a workspace tab's state to the live fields */
  const applyWorkspaceTab = (prev: PersistedState, tab: WorkspaceTabRecord): Partial<PersistedState> => {
    // Derive slotSymbols from slots for backward compat
    const slotSymbols = [...prev.slotSymbols] as PersistedState['slotSymbols']
    tab.slots.forEach((slot, i) => {
      if (slot.type === 'chart' && i < slotSymbols.length) slotSymbols[i] = slot.symbol
    })
    return {
      layoutMode: tab.layoutMode,
      activeSlot: tab.activeSlot,
      slots: tab.slots,
      panelSizes: tab.panelSizes,
      slotSymbols,
      charts: tab.charts,
      symbolSyncEnabled: tab.symbolSyncEnabled,
    }
  }

  const switchTab = useCallback((id: string) => {
    setState(prev => {
      if (id === prev.activeTabId) return prev
      const target = prev.tabs.find(t => t.id === id)
      if (!target) return prev
      const updatedTabs = prev.tabs.map(t =>
        t.id === prev.activeTabId ? snapshotActiveTab(prev) : t
      )
      const next: PersistedState = {
        ...prev,
        tabs: updatedTabs,
        activeTabId: id,
        // Restore workspace live fields only when switching TO a workspace tab
        ...(target.type === 'workspace' ? applyWorkspaceTab(prev, target) : {}),
      }
      PersistenceManager.save(next)
      return next
    })
  }, [])

  const addTab = useCallback((type: TabType = 'workspace') => {
    setState(prev => {
      const id = `tab-${Date.now()}`
      let newTab: TabRecord

      if (type === 'workspace') {
        const nums = prev.tabs
          .map(t => { const m = t.name.match(/^Workspace (\d+)$/); return m ? parseInt(m[1]) : 0 })
        const nextN = Math.max(0, ...nums) + 1
        newTab = { ...DEFAULT_TAB, id, name: `Workspace ${nextN}` }
      } else if (type === 'engine') {
        newTab = { id, name: 'Engine', type: 'engine' }
      } else if (type === 'data') {
        newTab = { id, name: 'Data', type: 'data' }
      } else if (type === 'storage') {
        newTab = { id, name: 'Storage', type: 'storage' }
      } else {
        const nums = prev.tabs
          .map(t => { const m = t.name.match(/^Workspace (\d+)$/); return m ? parseInt(m[1]) : 0 })
        const nextN = Math.max(0, ...nums) + 1
        newTab = { ...DEFAULT_TAB, id, name: `Workspace ${nextN}` }
      }

      const updatedTabs = [
        ...prev.tabs.map(t => t.id === prev.activeTabId ? snapshotActiveTab(prev) : t),
        newTab,
      ]
      const next: PersistedState = {
        ...prev,
        tabs: updatedTabs,
        activeTabId: id,
        ...(newTab.type === 'workspace' ? applyWorkspaceTab(prev, newTab) : {}),
      }
      PersistenceManager.save(next)
      return next
    })
  }, [])

  const openOrFocusTab = useCallback((type: TabType) => {
    setState(prev => {
      // For singleton types (engine, data), focus existing tab
      if (type !== 'workspace') {
        const existing = prev.tabs.find(t => t.type === type)
        if (existing) {
          if (existing.id === prev.activeTabId) return prev
          const updatedTabs = prev.tabs.map(t =>
            t.id === prev.activeTabId ? snapshotActiveTab(prev) : t
          )
          const next: PersistedState = {
            ...prev,
            tabs: updatedTabs,
            activeTabId: existing.id,
            ...(existing.type === 'workspace' ? applyWorkspaceTab(prev, existing) : {}),
          }
          PersistenceManager.save(next)
          return next
        }
      }
      // No existing tab of this type — create one
      const id = `tab-${Date.now()}`
      let newTab: TabRecord
      if (type === 'workspace') {
        const nums = prev.tabs
          .map(t => { const m = t.name.match(/^Workspace (\d+)$/); return m ? parseInt(m[1]) : 0 })
        const nextN = Math.max(0, ...nums) + 1
        newTab = { ...DEFAULT_TAB, id, name: `Workspace ${nextN}` }
      } else if (type === 'engine') {
        newTab = { id, name: 'Engine', type: 'engine' }
      } else if (type === 'data') {
        newTab = { id, name: 'Data', type: 'data' }
      } else if (type === 'storage') {
        newTab = { id, name: 'Storage', type: 'storage' }
      } else {
        const nums = prev.tabs
          .map(t => { const m = t.name.match(/^Workspace (\d+)$/); return m ? parseInt(m[1]) : 0 })
        const nextN = Math.max(0, ...nums) + 1
        newTab = { ...DEFAULT_TAB, id, name: `Workspace ${nextN}` }
      }
      const updatedTabs = [
        ...prev.tabs.map(t => t.id === prev.activeTabId ? snapshotActiveTab(prev) : t),
        newTab,
      ]
      const next: PersistedState = {
        ...prev,
        tabs: updatedTabs,
        activeTabId: id,
        ...(newTab.type === 'workspace' ? applyWorkspaceTab(prev, newTab) : {}),
      }
      PersistenceManager.save(next)
      return next
    })
  }, [])

  const closeTab = useCallback((id: string) => {
    setState(prev => {
      if (prev.tabs.length <= 1) return prev  // never close the last tab
      const idx = prev.tabs.findIndex(t => t.id === id)
      if (idx === -1) return prev
      const remaining = prev.tabs.filter(t => t.id !== id)
      // If closing a non-active tab, just remove it
      if (id !== prev.activeTabId) {
        const next: PersistedState = { ...prev, tabs: remaining }
        PersistenceManager.save(next)
        return next
      }
      // Closing the active tab — switch to adjacent
      const newActive = remaining[Math.min(idx, remaining.length - 1)]
      const next: PersistedState = {
        ...prev,
        tabs: remaining,
        activeTabId: newActive.id,
        ...(newActive.type === 'workspace' ? applyWorkspaceTab(prev, newActive) : {}),
      }
      PersistenceManager.save(next)
      return next
    })
  }, [])

  const renameTab = useCallback((id: string, name: string) => {
    setState(prev => {
      const next: PersistedState = {
        ...prev,
        tabs: prev.tabs.map(t => t.id === id ? { ...t, name } : t),
      }
      PersistenceManager.save(next)
      return next
    })
  }, [])

  const activeTab = useMemo(
    () => state.tabs.find(t => t.id === state.activeTabId) ?? state.tabs[0],
    [state.tabs, state.activeTabId],
  )

  const ctxValue = useMemo(
    () => ({ state, setUiThemeMode, setChartSettings, setSelectedSymbol, setLayoutMode, setActiveSlot, setSlotSymbol, setSymbolSyncEnabled, setSlotContent, moveSlot, removeSlot, updatePanelSizes, updateChart, getChart, switchTab, addTab, closeTab, renameTab, openOrFocusTab, activeTab }),
    [state, setUiThemeMode, setChartSettings, setSelectedSymbol, setLayoutMode, setActiveSlot, setSlotSymbol, setSymbolSyncEnabled, setSlotContent, moveSlot, removeSlot, updatePanelSizes, updateChart, getChart, switchTab, addTab, closeTab, renameTab, openOrFocusTab, activeTab],
  )

  return (
    <PersistedContext.Provider value={ctxValue}>
      {children}
    </PersistedContext.Provider>
  )
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

/** Full persisted state + all updaters. Used by App.tsx and multi-chart components. */
export function usePersistedState() {
  const ctx = useContext(PersistedContext)
  if (!ctx) throw new Error('usePersistedState must be used inside PersistedProvider')
  return ctx
}

/**
 * Scoped hook for a single chart instance.
 * Returns the chart's current persisted state and a patch updater.
 *
 * Usage:
 *   const { chartState, updateChart } = usePersistedChart('default')
 *   const { tf, settings, showBB } = chartState
 *   updateChart({ tf: 'H1' })          // update one field
 *   updateChart({ settings: { ...settings, candleUp: '#fff' } })
 */
export function usePersistedChart(chartId: string) {
  const { getChart, updateChart: updateChartCtx } = usePersistedState()
  const chartState = getChart(chartId)
  const updateChart = useCallback(
    (patch: Partial<PersistedChartState>) => updateChartCtx(chartId, patch),
    [chartId, updateChartCtx],
  )
  return { chartState, updateChart }
}
