/** Viewer presentation compatibility: selected symbols, no private jobs or event transport. */
import { createContext, useContext, useMemo } from 'react'
import { useApi } from '../hooks/useApi'
import type { UnifiedJobStatus } from '../utils/viewerApi'
import type { AgentsStatusResponse, AgentStatusInfo } from '../types/viewerAgents'

export type { AgentsStatusResponse, AgentStatusInfo }
export type HistoricalJobStatus = {
  job_id: string
  status: string
  progress?: { sections_done: number; sections_total: number; active_sections?: Record<string, string> } | null
  started_at?: string | null
}
export type UnitTestJobStatus = {
  job_id: string
  status: string
  progress?: { pairs_done?: number; pairs_total?: number } | null
  started_at?: string | null
  source?: string | null
  unit_test?: string | null
}
export type CompletedJob = { agent: string; status: 'done' | 'error' | 'cancelled'; timestamp: number } | null

interface SystemStatusState {
  agentOverview: Record<string, AgentStatusInfo>
  symbols: string[]
  activeJobs: UnifiedJobStatus[]
  runningAgent: string | null
  activeHistorical: HistoricalJobStatus | null
  activeUnitTest: UnitTestJobStatus | null
  handleKillJob: () => Promise<void>
  lastCompletedJob: CompletedJob
  consumeCompletedJob: () => void
  lastCompletedHistorical: { status: string; timestamp: number } | null
  consumeCompletedHistorical: () => void
  lastCompletedUnitTest: { status: string; timestamp: number } | null
  consumeCompletedUnitTest: () => void
}

const SystemStatusContext = createContext<SystemStatusState>(null!)
const noop = () => {}
const unavailable = async () => {}

export function SystemStatusProvider({ children }: { children: React.ReactNode }) {
  const { data } = useApi<{ symbol: string }[]>('/pairs')
  const value = useMemo<SystemStatusState>(() => ({
    agentOverview: {}, symbols: Array.isArray(data) ? data.map(row => row.symbol) : [], activeJobs: [],
    runningAgent: null, activeHistorical: null, activeUnitTest: null, handleKillJob: unavailable,
    lastCompletedJob: null, consumeCompletedJob: noop,
    lastCompletedHistorical: null, consumeCompletedHistorical: noop,
    lastCompletedUnitTest: null, consumeCompletedUnitTest: noop,
  }), [data])
  return <SystemStatusContext.Provider value={value}>{children}</SystemStatusContext.Provider>
}

export function useSystemStatus() {
  return useContext(SystemStatusContext)
}
