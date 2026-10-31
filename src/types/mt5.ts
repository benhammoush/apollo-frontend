// ── MT5 Terminal Manager ──────────────────────────────────────────────────────

/** A discovered MT5 terminal installation on this machine. */
export interface MT5TerminalInfo {
  id: string          // folder hash, e.g. "D1DE6D885835A8E4A8C9659F3EB5B0A9"
  exe_path: string    // full path to terminal64.exe
  data_path: string   // APPDATA/MetaQuotes/Terminal/{id}/
  label?: string      // install folder name, e.g. "MT5-Admin"
}

/** Worker tier status (live or history subprocess). */
export interface WorkerTier {
  running: boolean
  pid: number | null
  port: number | null
}

/** Ephemeral worker (agent-specific subprocess). */
export interface EphemeralWorker {
  pid: number
  port: number
  job_id: string
  agent: string
  alive: boolean
}

/** A configured and registered MT5 terminal entry (from GET /mt5/terminals_list). */
export interface TerminalEntry {
  id: string
  terminal_path: string
  label: string
  active: boolean
  created_at: string
  worker_running: boolean
  worker_pid: number | null
  worker_port: number | null
  workers: {
    live: WorkerTier
    history: WorkerTier
    ephemeral: EphemeralWorker[]
  } | null
  status: Record<string, unknown> | null
  mql5_source: string
  watchdog: 'healthy' | 'respawning' | 'inactive'
  market_open: boolean
}

export type MT5Phase =
  | 'idle' | 'connecting' | 'syncing_history' | 'live_feed'
  | 'error' | 'stopped' | 'paused' | 'weekend'

export interface MT5SymbolDataStatus {
  history: 'up_to_date' | 'updating' | 'missing' | 'error'
  progress_pct?: number       // 0-100 during updating
  last_tick_time?: string     // ISO timestamp
  last_tick_bid?: number
  error?: string
}

export interface MT5MainStatus {
  phase: MT5Phase
  broker: string
  connected: boolean
  sync_running: boolean       // history sync in progress
  feed_running: boolean       // live tick feed in progress
  data_status: Record<string, MT5SymbolDataStatus>
  last_update: string | null
  errors: string[]
  current_symbol?: string     // symbol being synced right now
  sync_from?: string          // date range start (YYYY-MM-DD)
  sync_to?: string            // date range end (YYYY-MM-DD)
}

export interface MT5MainResponse {
  configured: boolean
  terminal_path: string | null
  worker_running: boolean
  worker_pid: number | null
  worker_port: number | null
  status: MT5MainStatus
}

export interface MT5SecondaryConfig {
  id: string
  name: string
  terminal_path: string
  active: boolean
  created_at: string
}

export interface MT5SecondaryStatus {
  phase: MT5Phase
  broker: string
  connected: boolean
  ticks: Record<string, { time: string; bid: number; ask: number }>
  last_update: string | null
  errors: string[]
  mql5_source?: string
}

export interface MT5DataRange {
  from: string
  to: string
  bars: number
}

export interface MT5SecondaryResponse extends MT5SecondaryConfig {
  worker_running: boolean
  worker_pid: number | null
  worker_port: number | null
  status: MT5SecondaryStatus
  mql5_source: string
  data_range: MT5DataRange | null
}
