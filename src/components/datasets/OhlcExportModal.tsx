import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { theme } from '../../design-system'
import { OhlcExportRequest, OhlcExportStatus, PairState } from '../../types'
import { ALL_TFS } from '../../types/timeframes'
import { fetchWithMeta } from '../../utils/fetchWithMeta'
import { useBrokers } from '../../contexts/BrokerDataContext'

function toInputDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toIsoOrEmpty(value: string): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString()
}

export default function OhlcExportModal({ onClose }: { onClose: () => void }) {
  const now = useMemo(() => new Date(), [])
  const defaultStart = useMemo(() => {
    const d = new Date(now)
    d.setDate(d.getDate() - 90)
    return d
  }, [now])

  const { brokers, loading: brokersLoading } = useBrokers()

  const [selectedBroker, setSelectedBroker] = useState<string>('')
  const [selectedTf, setSelectedTf] = useState<string>('M15')
  const [start, setStart] = useState<string>(() => toInputDateTime(defaultStart))
  const [end, setEnd] = useState<string>(() => toInputDateTime(now))
  const [symbols, setSymbols] = useState<string[]>([])
  const [symbol, setSymbol] = useState<string>('ALL')
  const [loadingSymbols, setLoadingSymbols] = useState<boolean>(true)
  const [error, setError] = useState<string>('')

  const [phase, setPhase] = useState<'idle' | 'submitting' | 'polling' | 'done' | 'error'>('idle')
  const [jobId, setJobId] = useState<string>('')
  const [progress, setProgress] = useState<{ pairs_done: number; pairs_total: number } | null>(null)
  const [statusMsg, setStatusMsg] = useState<string>('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let active = true
    setLoadingSymbols(true)
    fetchWithMeta('/pairs', undefined, { trigger: 'manual' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((rows: PairState[]) => {
        if (!active) return
        const unique = Array.from(new Set((rows ?? []).map(r => (r.symbol || '').toUpperCase()).filter(Boolean))).sort()
        setSymbols(unique)
      })
      .catch(() => {
        if (!active) return
        setSymbols([])
      })
      .finally(() => {
        if (!active) return
        setLoadingSymbols(false)
      })
    return () => { active = false }
  }, [])

  const startPolling = useCallback((id: string) => { return; }, [selectedBroker, selectedTf, symbol])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const submit = async () => { setError('Unavailable in this interface'); setPhase('idle'); }

  const isBusy = phase === 'submitting' || phase === 'polling'

  const inputStyle = {
    background: theme.colors.bg.input,
    border: `1px solid ${theme.colors.border.default}`,
    borderRadius: 4,
    color: theme.colors.text.primary,
    fontSize: 11,
    padding: '6px 10px',
    width: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: theme.fonts.mono,
  }

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none' as const,
  }

  return (
    <div
      onClick={isBusy ? undefined : onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: theme.colors.bg.scrim,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          background: theme.colors.bg.card,
          border: `1px solid ${theme.colors.border.default}`,
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: theme.shadows.dropdown,
        }}
      >
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.colors.border.default}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: theme.colors.text.primary }}>Export OHLC CSV</span>
          <button
            onClick={onClose}
            disabled={isBusy}
            style={{ background: 'transparent', border: 'none', color: theme.colors.text.disabled, fontSize: 20, cursor: isBusy ? 'not-allowed' : 'pointer', lineHeight: 1, opacity: isBusy ? 0.5 : 1 }}
          >
            x
          </button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Broker dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: theme.colors.text.secondary }}>Broker</span>
            <select
              value={selectedBroker}
              onChange={e => setSelectedBroker(e.target.value)}
              disabled={isBusy || brokersLoading}
              style={{
                ...selectStyle,
                color: selectedBroker ? theme.colors.text.link : theme.colors.text.axisText,
                borderColor: selectedBroker ? `${theme.colors.text.link}66` : theme.colors.border.muted,
                opacity: isBusy ? 0.6 : 1,
              }}
            >
              <option value="">Auto (primary)</option>
              {brokers.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Timeframe dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: theme.colors.text.secondary }}>Timeframe</span>
            <select
              value={selectedTf}
              onChange={e => setSelectedTf(e.target.value)}
              disabled={isBusy}
              style={{ ...selectStyle, opacity: isBusy ? 0.6 : 1 }}
            >
              {ALL_TFS.map(tf => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: theme.colors.text.secondary }}>Start</span>
              <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} disabled={isBusy} style={{ ...inputStyle, opacity: isBusy ? 0.6 : 1 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, color: theme.colors.text.secondary }}>End</span>
              <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} disabled={isBusy} style={{ ...inputStyle, opacity: isBusy ? 0.6 : 1 }} />
            </div>
          </div>

          {/* Symbol */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, color: theme.colors.text.secondary }}>Symbol</span>
            {symbols.length > 0 ? (
              <select value={symbol} onChange={e => setSymbol(e.target.value)} disabled={isBusy} style={{ ...selectStyle, opacity: isBusy ? 0.6 : 1 }}>
                <option value="ALL">ALL</option>
                {symbols.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input
                value={symbol}
                onChange={e => setSymbol(e.target.value.toUpperCase())}
                placeholder={loadingSymbols ? 'Loading symbols...' : 'e.g. EURUSD'}
                disabled={isBusy}
                style={{ ...inputStyle, opacity: isBusy ? 0.6 : 1 }}
              />
            )}
          </div>

          {/* Progress */}
          {phase !== 'idle' && (
            <div style={{
              background: theme.colors.bg.deep,
              border: `1px solid ${theme.colors.border.default}`,
              borderRadius: 6,
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {phase === 'polling' && (
                  <span style={{ fontSize: 11, color: theme.colors.accent.blue }}>Exporting...</span>
                )}
                {phase === 'done' && (
                  <span style={{ fontSize: 11, color: theme.colors.accent.green }}>Done</span>
                )}
                {phase === 'error' && (
                  <span style={{ fontSize: 11, color: theme.colors.accent.red }}>Error</span>
                )}
                {phase === 'submitting' && (
                  <span style={{ fontSize: 11, color: theme.colors.text.secondary }}>{statusMsg}</span>
                )}
              </div>
              {progress && phase === 'polling' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    flex: 1,
                    height: 4,
                    background: theme.colors.border.default,
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${progress.pairs_total > 0 ? (progress.pairs_done / progress.pairs_total) * 100 : 0}%`,
                      background: theme.colors.accent.blue,
                      borderRadius: 2,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 10, fontFamily: theme.fonts.mono, color: theme.colors.text.secondary, whiteSpace: 'nowrap' }}>
                    {progress.pairs_done}/{progress.pairs_total}
                  </span>
                </div>
              )}
              {phase === 'done' && statusMsg && (
                <span style={{ fontSize: 10, color: theme.colors.text.secondary }}>{statusMsg}</span>
              )}
            </div>
          )}

          {error && <div style={{ fontSize: 11, color: theme.colors.accent.red }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={onClose}
              disabled={isBusy}
              style={{ background: 'transparent', border: `1px solid ${theme.colors.border.default}`, borderRadius: 4, color: theme.colors.text.secondary, fontSize: 11, padding: '6px 16px', cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.6 : 1 }}
            >
              {phase === 'done' ? 'Close' : 'Cancel'}
            </button>
            {phase === 'idle' && (
              <button
                onClick={submit}
                disabled={isBusy}
                style={{ background: `${theme.colors.accent.green}22`, border: `1px solid ${theme.colors.accent.green}`, borderRadius: 4, color: theme.colors.accent.green, fontSize: 11, fontWeight: 700, padding: '6px 16px', cursor: isBusy ? 'not-allowed' : 'pointer', opacity: isBusy ? 0.6 : 1 }}
              >
                Export CSV
              </button>
            )}
            {phase === 'error' && (
              <button
                onClick={() => { setPhase('idle'); setError(''); setProgress(null); }}
                style={{ background: `${theme.colors.accent.blue}22`, border: `1px solid ${theme.colors.accent.blue}`, borderRadius: 4, color: theme.colors.accent.blue, fontSize: 11, fontWeight: 700, padding: '6px 16px', cursor: 'pointer' }}
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
