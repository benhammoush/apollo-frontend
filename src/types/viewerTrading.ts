/** Transport/display compatibility; no private strategy-parameter declaration. */
export interface OHLCVBar {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type OhlcExportTimeframe = 'M1' | 'M5' | 'M15' | 'H1' | 'H4' | 'H9' | 'D1' | 'W1' | 'MN1' | 'MN3' | 'MN6' | 'MN12'

export interface OhlcExportRequest {
  source?: string
  timeframe: string
  start: string
  end: string
  symbol_mode: 'all' | 'selected'
  symbols?: string[]
}

export interface OhlcExportStatus {
  job_id: string
  status: 'pending' | 'running' | 'done' | 'error' | 'not_found'
  error?: string
  progress?: { pairs_done: number; pairs_total: number }
  filename?: string
  rows?: number
}

export interface PairState {
  symbol: string
  bid: number
  trend_weekly: string
  trend_daily: string
  trend_4h: string
  trend_monthly: string
  trend_3m: string
  trend_6m: string
  trend_12m: string
  pending_trades: number
}

export interface OpenTrade {
  ticket: number
  symbol: string
  direction: string
  open_price: number
  volume: number
  stop_loss: number
  profit: number
  open_time: string | null
  tf_atr: string
  scenario: string
  comment: string
}

export interface PendingTrade {
  num: number
  symbol: string
  direction: string
  open_price: number
  exit_price: number
  volume: number
  risk: number
  tf_atr: string
  scenario: string
  created_at: string | null
}

export interface AccountInfo {
  name: string
  broker: string
  balance: number
  equity: number
  margin: number
  free_margin: number
  profit: number
  leverage: number
  currency: string
}
