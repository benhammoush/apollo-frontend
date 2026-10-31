import { useEffect } from 'react'
import { theme } from '../../design-system'
import type { SourceKey } from '../../store/persistedState'

export interface Dataset {
  name: string
  source: string
  agents: string[]
}

function DatasetDropdown({
  sourceKey, agentName, sources, setSource, availableDatasets,
}: {
  sourceKey: SourceKey
  agentName: string
  sources: Record<SourceKey, string | null>
  setSource: (key: SourceKey, val: string | null) => void
  availableDatasets: Dataset[]
}) {
  const cur = sources[sourceKey]
  const agentDatasets = availableDatasets.filter(d => d.agents.includes(agentName))

  // Auto-select first dataset when source is null and datasets are available
  useEffect(() => {
    if (cur === null && agentDatasets.length > 0) {
      setSource(sourceKey, agentDatasets[0].name)
    }
  }, [cur, agentDatasets.length, sourceKey, setSource, agentDatasets])

  // Reset source if it no longer exists in available datasets (e.g. folder was deleted)
  useEffect(() => {
    if (cur !== null && !agentDatasets.some(d => d.name === cur)) {
      setSource(sourceKey, null)
    }
  }, [cur, agentDatasets, sourceKey, setSource])

  // No datasets available — show disabled placeholder
  if (agentDatasets.length === 0) {
    return (
      <select
        disabled
        style={{
          width: '100%', marginBottom: 8,
          background: theme.colors.bg.deep,
          color: theme.colors.text.dimmer,
          border: `1px solid ${theme.colors.border.grid}`,
          borderRadius: 4, padding: '2px 4px',
          fontSize: 9, fontFamily: theme.fonts.mono, cursor: 'not-allowed',
          opacity: 0.6,
        }}
      >
        <option value="">No dataset found</option>
      </select>
    )
  }

  // Determine effective value: if cur is null (still waiting for auto-select), use first dataset
  const effectiveValue = cur ?? agentDatasets[0]?.name ?? ''

  return (
    <select
      value={effectiveValue}
      onChange={e => setSource(sourceKey, e.target.value || null)}
      style={{
        width: '100%', marginBottom: 8,
        background: theme.colors.bg.deep,
        color: effectiveValue ? theme.colors.text.link : theme.colors.text.axisText,
        border: `1px solid ${effectiveValue ? theme.colors.text.link + '55' : theme.colors.border.grid}`,
        borderRadius: 4, padding: '2px 4px',
        fontSize: 9, fontFamily: theme.fonts.mono, cursor: 'pointer',
      }}
    >
      {agentDatasets.map(d => (
        <option key={d.name} value={d.name}>
          [{d.source === 'Backtest' ? 'BT' : 'AG'}] {d.name.slice(0, 22)}
        </option>
      ))}
    </select>
  )
}

export default DatasetDropdown
