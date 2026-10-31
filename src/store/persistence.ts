/**
 * Loads and migrates viewer preferences and debounces localStorage snapshots.
 * @packageDocumentation
 */
//
// Design decisions:
//   - load() is synchronous — called once at startup before React renders.
//   - save() is debounced 400 ms — never blocks the render loop.
//   - A single key 'apollo_v2' holds the full state as one JSON blob.
//     Simple to inspect in devtools; atomic writes prevent partial-state issues.
//   - Missing keys in stored JSON are filled with DEFAULT_PERSISTED values,
//     so adding new persisted fields in future batches is backwards-compatible.
//
import { PersistedState, DEFAULT_PERSISTED, TabRecord, SlotState, SlotContentType, WorkspaceTabRecord, PersistedChartState, migrateSettingsKeys, migrateLevelVisibleKeys, migrateChartStates, snapshotActiveTab } from './persistedState'

/** Slot types that have active rendering — anything else resets to 'empty' */
const VALID_SLOT_TYPES = new Set<SlotContentType>(['chart', 'dataset', 'logs', 'empty'])

/** Clear retired panel types and supply missing chart symbols without changing saved selections. */
function sanitizeSlot(slot: SlotState, fallbackSymbol: string): SlotState {
  if (!VALID_SLOT_TYPES.has(slot.type)) return { type: 'empty' }
  if (slot.type === 'chart') {
    return { type: 'chart', symbol: slot.symbol || fallbackSymbol }
  }
  return slot
}

const STORAGE_KEY = 'apollo_v2'

// Debounce timer — module-level so it survives re-renders
let saveTimer: ReturnType<typeof setTimeout> | null = null

/** Keep startup restoration and debounced writes behind the same storage boundary. */
export const PersistenceManager = {
  /** Restore saved state synchronously at startup; unreadable storage falls back to defaults. */
  load(): PersistedState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return { ...DEFAULT_PERSISTED }
      const parsed = JSON.parse(raw) as Partial<PersistedState>
      // Shallow merge with defaults so new top-level keys always exist
      const slotSymbols: PersistedState['slotSymbols'] = (() => {
        const saved = parsed.slotSymbols ?? []
        const base  = [...DEFAULT_PERSISTED.slotSymbols]
        saved.forEach((s, i) => { if (s) base[i] = s })
        return base as PersistedState['slotSymbols']
      })()

      // Migrate: if no tabs saved yet, fabricate one from the existing flat fields
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawTabs: any[] = (parsed.tabs && parsed.tabs.length > 0)
        ? parsed.tabs
        : [{
            id: 'tab-1',
            name: 'Chart 1',
            type: 'chart',
            layoutMode: parsed.layoutMode ?? 1,
            activeSlot: parsed.activeSlot ?? 0,
            slotSymbols,
            charts: parsed.charts ?? {},
            symbolSyncEnabled: parsed.symbolSyncEnabled ?? false,
          }]
      // Migrate: add type field to tabs that predate the unified tab system
      const withType = rawTabs.map((t: any) =>
        t.type ? t : { ...t, type: 'chart' }
      )
      // Migrate: convert old type:'chart' tabs to type:'workspace' with slots[]
      const tabs = withType.map(t => {
        if ((t as any).type === 'chart') {
          const old = t as any
          const syms: string[] = old.slotSymbols ?? slotSymbols
          const slots: SlotState[] = syms.map((s: string) => ({ type: 'chart' as const, symbol: s }))
          const ws: WorkspaceTabRecord = {
            id: old.id,
            name: (old.name ?? '').replace(/^Chart/, 'Workspace'),
            type: 'workspace',
            layoutMode: old.layoutMode ?? 4,
            activeSlot: old.activeSlot ?? 0,
            slots,
            panelSizes: old.panelSizes,
            charts: old.charts ?? {},
            symbolSyncEnabled: old.symbolSyncEnabled ?? false,
          }
          return ws as TabRecord
        }
        return t
      })
      const activeTabId = parsed.activeTabId ?? tabs[0].id

      // Sanitize slots inside all workspace tabs (remove stale types like monitor/processes)
      for (const tab of tabs) {
        if (tab.type === 'workspace') {
          ;(tab as WorkspaceTabRecord).slots = (tab as WorkspaceTabRecord).slots.map((slot, i) =>
            sanitizeSlot(slot, slotSymbols[i] ?? DEFAULT_PERSISTED.selectedSymbol)
          )
        }
      }

      // Page tabs retain the last workspace's live slots; symbols are a legacy-only fallback.
      const activeTab = tabs.find(t => t.id === activeTabId)
      const slots: SlotState[] = (activeTab && activeTab.type === 'workspace')
        ? (activeTab as WorkspaceTabRecord).slots.map((slot, i) =>
            sanitizeSlot(slot, slotSymbols[i] ?? DEFAULT_PERSISTED.selectedSymbol)
          )
        : (parsed.slots ?? slotSymbols.map(s => ({ type: 'chart' as const, symbol: s })))
            .map((slot, i) => sanitizeSlot(slot, slotSymbols[i] ?? DEFAULT_PERSISTED.selectedSymbol))

      // Filter out monitoring tabs (endpoints removed)
      const filteredTabs = tabs.filter((t: any) => t.type !== 'monitoring')
      let migratedActiveTabId = activeTabId
      if (!filteredTabs.find((t: any) => t.id === migratedActiveTabId)) {
        migratedActiveTabId = filteredTabs[0]?.id ?? DEFAULT_PERSISTED.activeTabId
      }

      // ── Key-name migration (level3MN → levelMN3, 3MN → MN3, etc.) ──────────
      const chartSettings = migrateSettingsKeys(
        (parsed.chartSettings ?? DEFAULT_PERSISTED.chartSettings) as unknown as Record<string, string>,
      )
      const charts = migrateChartStates(
        (parsed.charts ?? {}) as Record<string, Partial<PersistedChartState> & Record<string, unknown>>,
      )
      // Migrate charts embedded inside workspace tabs
      const migratedTabs = filteredTabs.map((t: any) => {
        if (t.type === 'workspace' && t.charts) {
          return { ...t, charts: migrateChartStates(t.charts as Record<string, Partial<PersistedChartState> & Record<string, unknown>>) }
        }
        return t
      })

      return {
        ...DEFAULT_PERSISTED,
        ...parsed,
        chartSettings,
        // charts is kept as-is from storage with key-migration applied
        charts,
        layoutMode: parsed.layoutMode ?? 4,
        activeSlot: parsed.activeSlot ?? 0,
        // Pad to 8 entries so old 4-slot saves migrate cleanly
        slotSymbols,
        slots,
        tabs: migratedTabs,
        activeTabId: migratedActiveTabId,
      }
    } catch {
      // Corrupted storage — start fresh without crashing
      return { ...DEFAULT_PERSISTED }
    }
  },

  /** Snapshot state after 400 ms of inactivity; unavailable storage leaves in-memory state intact. */
  save(state: PersistedState): void {
    if (saveTimer !== null) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      try {
        const tabs = state.tabs.map(tab => tab.id === state.activeTabId ? snapshotActiveTab(state) : tab)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, tabs }))
      } catch {
        // localStorage quota exceeded — silently ignore, preferences just won't persist
      }
    }, 400)
  },
}
