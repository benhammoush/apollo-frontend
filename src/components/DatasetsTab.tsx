/**
 * Inert engine presentation without private configuration or execution workflows.
 * @packageDocumentation
 */
import { useState, useCallback, useMemo } from 'react'
import {
  AgentName,
  TriggerBtSystemConfig,
  TriggerBtRunConfig,
  NblCloseConfig,
} from '../types'
import { useSystemStatus } from '../hooks/useSystemStatus'
import { theme, type ThemeTokens, LaunchActionButton, LaunchCard, LaunchField, LaunchInput, LaunchSelect } from '../design-system'
import { SymbolMultiSelect } from './shared/SymbolMultiSelect'
import { fetchWithMeta } from '../utils/fetchWithMeta'
import { useBrokers } from '../contexts/BrokerDataContext'
import TriggerBtConfigModal from './viewer/MaskedTriggerBtModal'
import NblConfigModal from './viewer/MaskedNblModal'

// ── Config ────────────────────────────────────────────────────────────────────

const INDICATOR_AGENTS: AgentName[] = ['bb', 'trends', 'families', 'trigger_bt', 'nbl', 'session_levels']

function buildAgentMeta(t: ThemeTokens): Record<AgentName, { label: string; color: string; bg: string; shortLabel: string }> {
  return {
    bb: { label: 'xxxx', shortLabel: 'xxxx', color: t.colors.text.link, bg: `${t.colors.text.link}22` },
    trends: { label: 'xxxx', shortLabel: 'xxxx', color: t.colors.accent.green, bg: `${t.colors.accent.green}22` },
    families: { label: 'xxxx', shortLabel: 'xxxx', color: t.colors.accent.purple, bg: `${t.colors.accent.purple}22` },
    trigger_bt: { label: 'xxxx', shortLabel: 'xxxx', color: t.colors.accent.orange, bg: `${theme.colors.accent.orange}22` },
    nbl: { label: 'xxxx', shortLabel: 'xxxx', color: t.colors.accent.blue, bg: `${t.colors.accent.blue}22` },
    session_levels: { label: 'xxxx', shortLabel: 'xxxx', color: t.colors.accent.blue, bg: `${t.colors.accent.blue}22` },
    divergence_analysis: { label: 'xxxx', shortLabel: 'xxxx', color: t.colors.accent.purple, bg: `${t.colors.accent.purple}22` },
    score: { label: 'xxxx', shortLabel: 'xxxx', color: t.colors.accent.blue, bg: `${t.colors.accent.blue}22` },
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MergedIndicatorsCardProps {
  onRun: (agent: AgentName, symbols: string | string[], dates: { start: string; end: string }, inputFolders?: Record<string, string>, datasetName?: string, source?: string, logFlags?: { logIndicators: boolean; logCdls: boolean }, triggerBtConfig?: TriggerBtSystemConfig[] | null, nblConfig?: NblCloseConfig[] | null, timeframes?: string[], triggerBt?: TriggerBtRunConfig | null) => void
  allSymbols: string[]
  availableBrokers: string[]
}

function MergedIndicatorsCard({ onRun, allSymbols, availableBrokers }: MergedIndicatorsCardProps) {
  const agentMeta = buildAgentMeta(theme)
  const [selectedAgent, setSelectedAgent] = useState<AgentName>('bb')
  const [symbols, setSymbols] = useState<'all' | string[]>('all')
  const [cardStart, setCardStart] = useState('2010-01-01')
  const [cardEnd, setCardEnd] = useState(() => new Date().toISOString().slice(0, 10))
  const [runName, setRunName] = useState('')
  const [selectedBroker, setSelectedBroker] = useState('')
  const [logIndicators, setLogIndicators] = useState(false)
  const [logCdls, setLogCdls] = useState(false)
  const [showTriggerBtConfig, setShowTriggerBtConfig] = useState(false)
  const [triggerBtConfig, setTriggerBtConfig] = useState<TriggerBtRunConfig | null>(null)
  const [showNblConfig, setShowNblConfig] = useState(false)
  const [nblConfig, setNblConfig] = useState<NblCloseConfig[] | null>(null)

  const checkStyle: React.CSSProperties = { accentColor: theme.colors.text.link, width: 13, height: 13 }

  const noBroker = availableBrokers.length === 0
  const meta = agentMeta[selectedAgent]

  const cardDates = { start: cardStart, end: cardEnd }
  const datasetName = runName.trim() || `${meta.shortLabel} - ${cardStart} - ${cardEnd}`

  const handleRunClick = () => {
    const logFlags = { logIndicators, logCdls }
    if (selectedAgent === 'trigger_bt') {
      setShowTriggerBtConfig(true)
    } else if (selectedAgent === 'nbl') {
      setShowNblConfig(true)
    } else {
      onRun(selectedAgent, symbols, cardDates, undefined, datasetName, selectedBroker || undefined, logFlags, undefined)
    }
  }

  const handleTriggerBtConfirm = (config: TriggerBtRunConfig) => {
    setShowTriggerBtConfig(false)
    setTriggerBtConfig(config)
    onRun(selectedAgent, symbols, cardDates, undefined, datasetName, selectedBroker || undefined, { logIndicators, logCdls }, undefined, undefined, undefined, config)
  }

  const handleNblConfirm = (config: NblCloseConfig[]) => {
    setShowNblConfig(false)
    setNblConfig(config)
    onRun(selectedAgent, symbols, cardDates, undefined, datasetName, selectedBroker || undefined, { logIndicators, logCdls }, undefined, config)
  }

  return (
    <>
      <LaunchCard
        borderColor={noBroker ? theme.colors.border.muted + '40' : meta.color + '60'}
        badgeLabel={noBroker ? 'No broker' : 'Indicators'}
        badgeBg={noBroker ? theme.colors.bg.surface : meta.bg}
        badgeColor={noBroker ? theme.colors.text.disabled : meta.color}
        message={noBroker ? <div style={{ fontSize: 10, color: theme.colors.text.muted }}>No broker connected</div> : undefined}
        footer={<LaunchActionButton label="▶ Run" onClick={handleRunClick} disabled />}
        minWidth={200}
      >
        <div style={noBroker ? { opacity: 0.4, pointerEvents: 'none' } : undefined}>
          <LaunchField label="Agent">
            <LaunchSelect value={selectedAgent} onChange={e => setSelectedAgent(e.target.value as AgentName)}>
              {INDICATOR_AGENTS.map(a => (
                <option key={a} value={a}>{agentMeta[a].label}</option>
              ))}
            </LaunchSelect>
          </LaunchField>

          <LaunchField label="Broker">
            <LaunchSelect value={selectedBroker} onChange={e => setSelectedBroker(e.target.value)} disabled={noBroker}>
              {noBroker ? (
                <option value="">No broker connected</option>
              ) : (
                <>
                  <option value="">— Select broker —</option>
                  {availableBrokers.map(b => <option key={b} value={b}>{b}</option>)}
                </>
              )}
            </LaunchSelect>
          </LaunchField>

          <LaunchField label="Symbols">
            <SymbolMultiSelect allSymbols={allSymbols} value={symbols} onChange={setSymbols} />
          </LaunchField>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <LaunchField label="Start">
              <LaunchInput type="text" value={cardStart} onChange={e => setCardStart(e.target.value)} />
            </LaunchField>
            <LaunchField label="Stop">
              <LaunchInput type="text" value={cardEnd} onChange={e => setCardEnd(e.target.value)} />
            </LaunchField>
            <LaunchField label="Run Name">
              <LaunchInput type="text" value={runName} onChange={e => setRunName(e.target.value)} placeholder={datasetName} />
            </LaunchField>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: theme.fonts.size.sm, color: theme.colors.text.axisText, cursor: 'pointer' }}>
              <input type="checkbox" checked={logIndicators} onChange={e => setLogIndicators(e.target.checked)} style={checkStyle} />
              Indicator log
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: theme.fonts.size.sm, color: theme.colors.text.axisText, cursor: 'pointer' }}>
              <input type="checkbox" checked={logCdls} onChange={e => setLogCdls(e.target.checked)} style={checkStyle} />
              Candle log
            </label>
          </div>
        </div>
      </LaunchCard>

      {showTriggerBtConfig && (
        <TriggerBtConfigModal
          onConfirm={handleTriggerBtConfirm}
          onCancel={() => setShowTriggerBtConfig(false)}
        />
      )}
      {showNblConfig && (
        <NblConfigModal
          onConfirm={handleNblConfirm}
          onCancel={() => setShowNblConfig(false)}
        />
      )}
    </>
  )
}

// ── Divergence Analysis Card ─────────────────────────────

/** Preserve the masked card without mounting an unavailable private configuration workflow. */
function DivergenceAnalysisCard() {
  return (
    <LaunchCard
      borderColor={theme.colors.accent.purple}
      badgeLabel="xxxx"
      badgeBg={`${theme.colors.accent.purple}22`}
      badgeColor={theme.colors.accent.purple}
      footer={<LaunchActionButton label="▶ Run" disabled />}
      minWidth={200}
    />
  )
}

// ── Score Card ─────────────────────────────────────────

/** Preserve the masked card without retaining its private pipeline description or inputs. */
function ScoreCard() {
  return (
    <LaunchCard
      borderColor={theme.colors.accent.blue}
      badgeLabel="xxxx"
      badgeBg={`${theme.colors.accent.blue}22`}
      badgeColor={theme.colors.accent.blue}
      footer={<LaunchActionButton label="▶ Run" disabled />}
      minWidth={200}
    />
  )
}

// ── Broker Quality Cards ─────────────────────────────

function BrokerAgentCard({ onRun }: { onRun: (start: string, end: string) => Promise<void> }) {
  const [cardStart, setCardStart] = useState('2010-01-01')
  const [cardEnd, setCardEnd] = useState(() => new Date().toISOString().slice(0, 10))
  const [msg, setMsg] = useState('')
  const [running, setRunning] = useState(false)

  const handleRun = async () => {
    setRunning(true)
    setMsg('')
    try {
      await onRun(cardStart, cardEnd)
      setMsg('✓ started')
    } catch (e) {
      setMsg(`⚠ ${e}`)
    }
    setRunning(false)
    setTimeout(() => setMsg(''), 5000)
  }

  const color = running ? theme.colors.text.link : msg.startsWith('✓') ? theme.colors.accent.green : theme.colors.accent.yellow

  return (
    <LaunchCard
      borderColor={color}
      badgeLabel="xxxx"
      badgeBg={`${theme.colors.accent.yellow}22`}
      badgeColor={theme.colors.accent.yellow}
      subtitle="xxxx"
      message={msg ? <div style={{ fontSize: 10, color: msg.startsWith('✓') ? theme.colors.accent.green : theme.colors.accent.red }}>{msg}</div> : undefined}
      footer={<LaunchActionButton label={running ? '⏳ Running…' : '▶ Run'} disabled onClick={() => void handleRun()} />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <LaunchField label="Start">
          <LaunchInput type="text" value={cardStart} onChange={e => setCardStart(e.target.value)} />
        </LaunchField>
        <LaunchField label="Stop">
          <LaunchInput type="text" value={cardEnd} onChange={e => setCardEnd(e.target.value)} />
        </LaunchField>
      </div>
    </LaunchCard>
  )
}

function LiveBrokerQualityCard({ onRun }: { onRun: (endDate: string) => Promise<void> }) {
  const [endMode, setEndMode] = useState<'next_daily' | 'next_weekly'>('next_daily')
  const [msg, setMsg] = useState('')
  const [running, setRunning] = useState(false)

  const handleRun = async () => {
    setRunning(true)
    setMsg('')
    try {
      await onRun(endMode)
      setMsg('✓ started')
    } catch (e) {
      setMsg(`⚠ ${e}`)
    }
    setRunning(false)
    setTimeout(() => setMsg(''), 5000)
  }

  const color = running ? theme.colors.text.link : msg.startsWith('✓') ? theme.colors.accent.green : theme.colors.accent.purple

  return (
    <LaunchCard
      borderColor={color}
      badgeLabel="xxxx"
      badgeBg={`${theme.colors.accent.purple}22`}
      badgeColor={theme.colors.accent.purple}
      subtitle="xxxx"
      message={msg ? <div style={{ fontSize: 10, color: msg.startsWith('✓') ? theme.colors.accent.green : theme.colors.accent.red }}>{msg}</div> : undefined}
      footer={<LaunchActionButton label={running ? '⏳ Running…' : '▶ Run'} disabled color={theme.colors.accent.purple} hoverColor={theme.colors.accent.purple} onClick={() => void handleRun()} />}
    >
      <LaunchField label="End Date">
        <LaunchSelect value={endMode} onChange={e => setEndMode(e.target.value as typeof endMode)}>
          <option value="next_daily">Next Daily Close</option>
          <option value="next_weekly">Next Weekly Close</option>
        </LaunchSelect>
      </LaunchField>
    </LaunchCard>
  )
}

// ── Merged Unit Tests Card Component ────────────────────────────────

interface MergedUnitTestCardProps {
  onRun: (suite: 'trends' | 'families', params: { start: string; end: string; source?: string; dataset_name?: string }) => Promise<void>
  availableBrokers: string[]
}

function MergedUnitTestCard({ onRun, availableBrokers }: MergedUnitTestCardProps) {
  const [suite, setSuite] = useState<'trends' | 'families'>('trends')
  const [startDate, setStartDate] = useState('2010-01-01')
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [runName, setRunName] = useState('')
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState('')
  const [selectedBroker, setSelectedBroker] = useState('')

  const isFamilies = suite === 'families'
  const scopeText = isFamilies ? 'Scope: MN1/MN3/MN6' : 'Scope: MN1/MN3/MN6/MN12'
  const defaultName = `xxxx - ${startDate} - ${endDate}`

  const handleRun = async () => {
    setRunning(true)
    setMsg('')
    try {
      await onRun(suite, {
        start: startDate,
        end: endDate,
        source: selectedBroker || undefined,
        dataset_name: runName.trim() || defaultName,
      })
      setMsg('✓ started')
    } catch (e) {
      setMsg(`⚠ ${e}`)
    }
    setRunning(false)
    setTimeout(() => setMsg(''), 5000)
  }

  const color = running ? theme.colors.text.link : msg.startsWith('✓') ? theme.colors.accent.green : isFamilies ? theme.colors.accent.purple : theme.colors.accent.green

  return (
    <LaunchCard
      borderColor={color}
      badgeLabel="xxxx"
      badgeBg={isFamilies ? `${theme.colors.accent.purple}22` : `${theme.colors.accent.green}22`}
      badgeColor={isFamilies ? theme.colors.accent.purple : theme.colors.accent.green}
      subtitle={scopeText}
      message={msg ? <div style={{ fontSize: 10, color: msg.startsWith('✓') ? theme.colors.accent.green : theme.colors.accent.red }}>{msg}</div> : undefined}
      footer={<LaunchActionButton label={running ? '⏳ Running…' : '▶ Run'} disabled onClick={() => void handleRun()} />}
      minWidth={200}
    >
      <LaunchField label="Suite">
        <LaunchSelect value={suite} onChange={e => setSuite(e.target.value as 'trends' | 'families')}>
          <option value="trends">xxxx</option>
          <option value="families">xxxx</option>
        </LaunchSelect>
      </LaunchField>

      {availableBrokers.length > 0 && (
        <LaunchField label="Broker">
          <LaunchSelect value={selectedBroker} onChange={e => setSelectedBroker(e.target.value)}>
            <option value="">Default</option>
            {availableBrokers.map(b => <option key={b} value={b}>{b}</option>)}
          </LaunchSelect>
        </LaunchField>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <LaunchField label="Start">
          <LaunchInput type="text" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </LaunchField>
        <LaunchField label="Stop">
          <LaunchInput type="text" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </LaunchField>
        <LaunchField label="Run Name">
          <LaunchInput type="text" value={runName} onChange={e => setRunName(e.target.value)} placeholder={defaultName} />
        </LaunchField>
      </div>
    </LaunchCard>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export type AgentPageFilter = AgentName | 'broker_quality'

export default function DatasetsTab({ agentFilter, children }: { agentFilter?: AgentPageFilter; children?: React.ReactNode } = {}) {
  // ── Broker list ───────────────────────────────────────────────────────────
  const { brokers: availableBrokers } = useBrokers()

  const { agentOverview, symbols: contextSymbols } = useSystemStatus()

  const symbolList = useMemo(() => contextSymbols, [contextSymbols])

  const runAgent = useCallback(async (
    agent: AgentName,
    syms: string | string[],
    dates?: { start: string; end: string },
    inputFolders?: Record<string, string>,
    datasetName?: string,
    source?: string,
    logFlags?: { logIndicators: boolean; logCdls: boolean },
    triggerBtConfig?: TriggerBtSystemConfig[] | null,
    nblConfig?: NblCloseConfig[] | null,
    timeframes?: string[],
    triggerBt?: TriggerBtRunConfig | null,
  ) => { return; }, [])

  const runHistorical = useCallback(async (start: string, end: string) => { return; }, [])

  const runLiveBQ = useCallback(async (endDate: string) => { return; }, [])

  const runUnitTest = useCallback(async (suite: 'trends' | 'families', params: { start: string; end: string; source?: string; dataset_name?: string }) => { return; }, [])

  // Filter agents if agentFilter is provided
  const showBrokerQuality = !agentFilter || agentFilter === 'broker_quality'
  const showDivergenceAnalysis = !agentFilter || agentFilter === 'divergence_analysis'
  const showScore = !agentFilter || agentFilter === 'score'

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <MergedIndicatorsCard
        onRun={runAgent}
        allSymbols={symbolList}
        availableBrokers={availableBrokers}
      />
      {showDivergenceAnalysis && (
        <DivergenceAnalysisCard />
      )}
      {showScore && (
        <ScoreCard />
      )}
      {showBrokerQuality && (
        <>
          <BrokerAgentCard onRun={runHistorical} />
          <LiveBrokerQualityCard onRun={runLiveBQ} />
        </>
      )}
      {!agentFilter && (
        <MergedUnitTestCard onRun={runUnitTest} availableBrokers={availableBrokers} />
      )}
      {children}
    </div>
  )
}
