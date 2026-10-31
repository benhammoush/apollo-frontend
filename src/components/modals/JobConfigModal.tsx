/** Public presentation only; private operational implementation is excluded. */
import { useEffect, useState, type CSSProperties } from 'react'
import JsonView from '@uiw/react-json-view'
import { Modal, theme } from '../../design-system'
import { fetchWithMeta } from '../../utils/fetchWithMeta'

interface JobConfigModalProps {
  job: { job_id: string; label: string }
  onClose: () => void
}

const JSON_VIEW_STYLE = {
  fontSize: 11,
  fontFamily: theme.fonts.mono,
  lineHeight: 1.6,
  background: 'transparent',
  '--w-rjv-font-family': theme.fonts.mono,
  '--w-rjv-color': theme.colors.text.primary,
  '--w-rjv-background-color': theme.colors.bg.card,
  '--w-rjv-line-color': `${theme.colors.border.default}88`,
  '--w-rjv-arrow-color': theme.colors.text.muted,
  '--w-rjv-info-color': theme.colors.text.dimmer,
  '--w-rjv-curlybraces-color': theme.colors.text.dim,
  '--w-rjv-colon-color': theme.colors.text.dimmer,
  '--w-rjv-brackets-color': theme.colors.text.dim,
  '--w-rjv-key-string': theme.colors.accent.green,
  '--w-rjv-quotes-color': theme.colors.accent.green,
  '--w-rjv-type-string-color': theme.colors.text.link,
  '--w-rjv-type-int-color': theme.colors.accent.green,
  '--w-rjv-type-float-color': theme.colors.accent.green,
  '--w-rjv-type-bigint-color': theme.colors.accent.green,
  '--w-rjv-type-boolean-color': theme.colors.accent.orange,
  '--w-rjv-type-null-color': theme.colors.text.muted,
  '--w-rjv-type-undefined-color': theme.colors.text.muted,
} as CSSProperties

export default function JobConfigModal({ job, onClose }: JobConfigModalProps) {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setLoading(false); setError('Unavailable in this interface'); }, [job.job_id])

  return (
    <Modal title="Worker Config" subtitle={job.label} onClose={onClose} width={640}>
      {loading && (
        <div style={{ color: theme.colors.text.muted, fontSize: theme.fonts.size.sm, textAlign: 'center', padding: 24 }}>
          Loading…
        </div>
      )}
      {error && (
        <div style={{ color: theme.colors.accent.red, fontSize: theme.fonts.size.sm, textAlign: 'center', padding: 24 }}>
          {error}
        </div>
      )}
      {!loading && !error && config && (
        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          <JsonView value={config} style={JSON_VIEW_STYLE} collapsed={2} enableClipboard={false} />
        </div>
      )}
    </Modal>
  )
}
