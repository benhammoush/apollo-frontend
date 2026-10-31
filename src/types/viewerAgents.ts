/** Viewer presentation compatibility only; private configuration structure is opaque. */
export type AgentName = 'bb' | 'trends' | 'families' | 'trigger_bt' | 'nbl' | 'session_levels' | 'divergence_analysis' | 'score'

export interface AgentStatusInfo {
  status: 'idle' | 'running' | 'done' | 'error'
  job_id?: string
  error?: string
  finished_at?: string
}

export interface AgentsStatusResponse {
  agents: Record<string, AgentStatusInfo>
  symbols: string[]
}

// Retained UI callback signatures do not grant execution or disclose schemas.
export type TriggerBtSystemConfig = unknown
export type TriggerBtRunConfig = unknown
export type NblCloseConfig = unknown
