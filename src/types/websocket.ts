// ── WebSocket message types ────────────────────────────────────────────────────

import type { PairState } from './viewerTrading'

export type JobEventData = {
  job_id: string
  status: string
  worker?: string
  progress?: Record<string, unknown>
  error?: string
}

export type WsMessage =
  | { type: 'tick'; data: { symbol: string; bid: number; ask: number; time: string; source?: string } }
  | { type: 'trade'; data: Record<string, unknown> }
  | { type: 'account'; data: { balance: number; equity: number; profit: number } }
  | { type: 'pair'; data: PairState }
  | { type: 'system_status'; component: string; data: Record<string, unknown> }
  | { type: 'live_bar'; source: string; has_bars: boolean; symbols: string[]; bar_time: number | null; bars: Array<{ symbol: string; time: number; open: number; high: number; low: number; close: number; volume: number }>; received_at: string }
  | { type: 'live_tick'; source: string; symbol: string; bid: number; ask: number; time_ms: number }
  | { type: 'history_progress'; source: string; symbol: string; status: 'receiving' | 'complete'; bars?: number; done?: number }
  | { type: 'forming_bar'; source: string; symbol: string; bar_open_time: number; open: number; high: number; low: number; close: number; volume: number }
  | { type: 'job_started'; data: JobEventData }
  | { type: 'job_status'; data: JobEventData }
  | { type: 'job_done'; data: JobEventData }
  | { type: 'job_error'; data: JobEventData }
  | { type: 'job_cancelled'; data: JobEventData }
  | { type: 'agent_status'; data: Record<string, unknown> }
  | { type: 'brokers_changed' }
