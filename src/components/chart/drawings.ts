// chart/drawings.ts — types + localStorage persistence for user drawings

export type DrawingTool = 'hline' | 'trendline' | 'rect' | 'text' | 'measure' | 'fib'

export interface FibLevelTime {
  startTime: number
  endTime: number
}

export interface Drawing {
  id: string
  type: DrawingTool
  // hline: 1 point (price only matters)
  // trendline / rect / fib: 2 points (from → to)
  // text: 1 point + label
  points: { time: number; price: number }[]
  color: string
  label?: string
  // fib: per-level time overrides (keyed by level index in fibSettings.levels)
  fibLevelTimes?: Record<number, FibLevelTime>
}

export const DEFAULT_DRAWING_COLOR = '#f0c040'

const lsKey = (s: string) => `apollo:drawings:${s}`

export function loadDrawings(symbol: string): Drawing[] {
  try {
    const raw = localStorage.getItem(lsKey(symbol))
    return raw ? (JSON.parse(raw) as Drawing[]) : []
  } catch { return [] }
}

export function saveDrawings(symbol: string, ds: Drawing[]): void {
  try { localStorage.setItem(lsKey(symbol), JSON.stringify(ds)) } catch { /* ignore */ }
}

export function clearStoredDrawings(symbol: string): void {
  localStorage.removeItem(lsKey(symbol))
}
