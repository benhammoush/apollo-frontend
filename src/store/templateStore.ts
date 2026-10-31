// ── Template Store ────────────────────────────────────────────────────────────
//
// Chart templates save the full layout configuration EXCEPT symbols.
// Stored independently from the main apollo_v2 key so they survive state resets.
//
// Storage key: 'apollo_templates'
//
import { DEFAULT_CHART_INDICATORS, type LayoutMode, type PersistedChartState } from './persistedState'

const STORAGE_KEY = 'apollo_templates'

export interface TemplateSlot {
  timeframe: string
  source: Record<string, string | null>
  showTrends: Record<string, boolean>
  indicators: PersistedChartState['indicators']
}

export interface ChartTemplate {
  id: string
  name: string
  createdAt: number
  layoutMode: LayoutMode
  slots: TemplateSlot[]   // up to 8 entries
  readonly?: boolean       // true = built-in, cannot be deleted
}

// ── Snapshot helpers ──────────────────────────────────────────────────────────

export function slotFromChartState(cs: PersistedChartState): TemplateSlot {
  return {
    timeframe:    cs.tf,
    source:       cs.sources as Record<string, string | null>,
    showTrends:   cs.showTrends,
    indicators:   cs.indicators,
  }
}

export function applySlotToChartState(
  current: PersistedChartState,
  slot: TemplateSlot,
): PersistedChartState {
  return {
    ...current,
    tf:           slot.timeframe,
    sources:      slot.source as PersistedChartState['sources'],
    showTrends:   slot.showTrends,
    indicators:   slot.indicators ?? { ...DEFAULT_CHART_INDICATORS },
  }
}

export const BUILT_IN_TEMPLATES: ChartTemplate[] = []

// ── CRUD ──────────────────────────────────────────────────────────────────────

function loadUserTemplates(): ChartTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ChartTemplate[]) : []
  } catch {
    return []
  }
}

function saveUserTemplates(templates: ChartTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  } catch { /* quota */ }
}

export const TemplateStore = {
  list(): ChartTemplate[] {
    return [...loadUserTemplates(), ...BUILT_IN_TEMPLATES]
  },

  create(name: string, layoutMode: LayoutMode, slots: TemplateSlot[]): ChartTemplate {
    const t: ChartTemplate = {
      id: `t_${Date.now()}`,
      name,
      createdAt: Date.now(),
      layoutMode,
      slots: slots.slice(0, 8),
    }
    const all = loadUserTemplates()
    saveUserTemplates([t, ...all])
    return t
  },

  overwrite(id: string, name: string, layoutMode: LayoutMode, slots: TemplateSlot[]): void {
    const all = loadUserTemplates().map(t =>
      t.id === id ? { ...t, name, layoutMode, slots: slots.slice(0, 8) } : t
    )
    saveUserTemplates(all)
  },

  rename(id: string, name: string): void {
    const all = loadUserTemplates().map(t => t.id === id ? { ...t, name } : t)
    saveUserTemplates(all)
  },

  delete(id: string): void {
    saveUserTemplates(loadUserTemplates().filter(t => t.id !== id))
  },
}
