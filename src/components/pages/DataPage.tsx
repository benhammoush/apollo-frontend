/** Public presentation only; private operational implementation is excluded. */
import { useState } from 'react'
import { TerminalEntry } from '../../types'
import { useApi } from '../../hooks/useApi'
import { apiPost, apiDelete } from '../../utils/viewerApi'
import { Dot, theme } from '../../design-system'
import OhlcExportModal from '../datasets/OhlcExportModal'
import AddTerminalModal from '../modals/AddTerminalModal'
import { useIsMobile } from '../../hooks/useIsMobile'
import { timeUntilMarketOpen } from '../../utils/time'

const readOnly = import.meta.env.MODE === 'public'

function terminalDisplayName(t: { label?: string; terminal_path?: string; id: string }): string {
  const pathName = t.terminal_path?.split(/[\\/]/).slice(-2, -1)[0]
  const name = t.label || pathName || t.id.slice(0, 8)
  return `${name}  (${t.id.slice(0, 8)}…)`
}

// ── Stat cell ─────────────────────────────────────────────────────────────────

function StatCell({ label, value, valueColor, sub, subColor }: {
  label: string
  value: string
  valueColor?: string
  sub?: string
  subColor?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 9, color: theme.colors.text.disabled, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: theme.fonts.mono, fontWeight: 700, color: valueColor ?? theme.colors.text.primary }}>{value}</span>
      {sub && <span style={{ fontSize: 9, fontFamily: theme.fonts.mono, color: subColor ?? theme.colors.text.disabled }}>{sub}</span>}
    </div>
  )
}

// ── Terminal Card ─────────────────────────────────────────────────────────────

function TerminalCard({
  term,
  market_open,
  busy,
  deletePending,
  onStart,
  onStop,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  isMobile,
}: {
  term: TerminalEntry
  market_open: boolean
  busy: boolean
  deletePending: boolean
  onStart: () => void
  onStop: () => void
  onDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  isMobile: boolean
}) {
  const running  = term.worker_running
  const broker   = (term.status?.broker as string) || term.label || term.id
  const phase    = (term.status?.phase as string) ?? (running ? 'connected' : 'stopped')
  const errMsg   = term.status?.phase === 'error' ? (term.status.error_message as string) : null

  const watchdog =
    term.watchdog === 'healthy'    ? { label: 'HEALTHY',    color: theme.colors.accent.green  } :
    term.watchdog === 'respawning' ? { label: 'RESPAWNING', color: theme.colors.accent.yellow } :
                                     { label: 'INACTIVE',   color: theme.colors.text.disabled }

  const dotColor =
    !running                                   ? theme.colors.text.disabled :
    phase === 'error'                          ? theme.colors.accent.red    :
    phase === 'live_feed'                      ? theme.colors.accent.green  :
    phase === 'weekend' || phase === 'connecting' ? theme.colors.accent.blue :
                                                 theme.colors.accent.green

  const phaseLabel =
    !running          ? '' :
    phase === 'live_feed'   ? 'LIVE FEED' :
    phase === 'connecting'  ? 'CONNECTING' :
    phase === 'weekend'     ? 'MARKET CLOSED' :
    phase === 'error'       ? 'ERROR' :
                              'CONNECTED'

  const borderColor =
    running && phase === 'error'     ? `${theme.colors.accent.red}66`    :
    running && phase === 'live_feed' ? `${theme.colors.accent.green}44`  :
    running                          ? `${theme.colors.border.default}`  :
                                       theme.colors.border.default

  return (
    <div style={{
      background: theme.colors.bg.card,
      border: `1px solid ${borderColor}`,
      borderRadius: 8,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: isMobile ? 'wrap' : undefined }}>
        <Dot color={dotColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: theme.colors.text.primary }}>{broker}</span>
            {phaseLabel && (
              <span style={{ fontSize: 10, fontFamily: theme.fonts.mono, color: dotColor, fontWeight: 700 }}>{phaseLabel}</span>
            )}
          </div>
          {!isMobile && (
            <div style={{ fontSize: 10, fontFamily: theme.fonts.mono, color: theme.colors.text.disabled, marginTop: 2 }}>
              {term.mql5_source}
              {running && term.worker_pid != null && (
                <span style={{ marginLeft: 10 }}>pid {term.worker_pid} · :{term.worker_port}</span>
              )}
            </div>
          )}
        </div>

        {/* Start / Stop */}
        <button
          onClick={readOnly ? undefined : running ? onStop : onStart}
          disabled={busy || readOnly}
          title={readOnly ? 'Worker controls are available only from localhost' : undefined}
          style={{
            background: 'transparent',
            border: `1px solid ${busy || readOnly ? theme.colors.border.default : running ? theme.colors.accent.red : theme.colors.accent.green}`,
            borderRadius: 4,
            color: busy || readOnly ? theme.colors.text.disabled : running ? theme.colors.accent.red : theme.colors.accent.green,
            fontSize: 11, fontWeight: 700,
            padding: '4px 14px',
            cursor: busy || readOnly ? 'not-allowed' : 'pointer',
            opacity: busy || readOnly ? 0.5 : 1,
          }}
        >
          {busy ? '…' : running ? 'Stop' : 'Start'}
        </button>

        {deletePending ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: theme.colors.accent.red }}>Confirm delete?</span>
            <button
              onClick={onConfirmDelete}
              disabled={busy || readOnly}
              style={{
                background: `${theme.colors.accent.red}22`,
                border: `1px solid ${theme.colors.accent.red}`,
                borderRadius: 4,
                color: theme.colors.accent.red,
                fontSize: 10, fontWeight: 700,
                padding: '3px 8px',
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              Yes
            </button>
            <button
              onClick={onCancelDelete}
              disabled={busy || readOnly}
              style={{
                background: 'transparent',
                border: `1px solid ${theme.colors.border.default}`,
                borderRadius: 4,
                color: theme.colors.text.disabled,
                fontSize: 10,
                padding: '3px 8px',
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={onDelete}
            disabled={busy || readOnly}
            style={{
              background: 'transparent',
              border: `1px solid ${theme.colors.border.default}`,
              borderRadius: 4,
              color: theme.colors.text.disabled,
              fontSize: 11, padding: '4px 10px',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.4 : 0.7,
            }}
          >
            Delete
          </button>
        )}
      </div>

      {/* ── Error message ── */}
      {errMsg && (
        <div style={{ fontSize: 11, color: theme.colors.accent.red, fontFamily: theme.fonts.mono, padding: '4px 8px', background: `${theme.colors.accent.red}11`, borderRadius: 4 }}>
          {errMsg}
        </div>
      )}

      {/* ── Stats row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr',
        gap: isMobile ? 8 : 0,
        borderTop: `1px solid ${theme.colors.border.default}`,
        paddingTop: 12,
      }}>
        {(() => {
          const isOpen = market_open
          const marketState =
            !running ? { label: 'OFFLINE', color: theme.colors.text.disabled } :
            isOpen   ? { label: 'OPEN',    color: theme.colors.accent.green  } :
                       { label: 'CLOSED',  color: theme.colors.accent.blue   }
          return (
            <StatCell
              label="Market"
              value={marketState.label}
              valueColor={marketState.color}
              sub={!running ? '' : isOpen ? 'live feed active' : timeUntilMarketOpen(term.status?.utc_offset as number ?? 0)}
              subColor={theme.colors.text.disabled}
            />
          )
        })()}

        <StatCell
          label="Watchdog"
          value={watchdog.label}
          valueColor={watchdog.color}
          sub={term.watchdog === 'healthy' ? 'monitoring' : term.watchdog === 'respawning' ? 'will respawn…' : 'start to activate'}
          subColor={theme.colors.text.disabled}
        />
      </div>

      {/* ── Worker tiers ── */}
      {term.workers && (
        <div style={{
          borderTop: `1px solid ${theme.colors.border.default}`, paddingTop: 10,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 9, color: theme.colors.text.disabled, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Workers</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Dot color={term.workers.live.running ? theme.colors.accent.green : theme.colors.text.disabled} />
            <span style={{ fontSize: 10, fontFamily: theme.fonts.mono, color: theme.colors.text.secondary }}>Live</span>
            {term.workers.live.port && (
              <span style={{ fontSize: 9, color: theme.colors.text.disabled }}>:{term.workers.live.port}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Dot color={term.workers.history.running ? theme.colors.accent.blue : theme.colors.text.disabled} />
            <span style={{ fontSize: 10, fontFamily: theme.fonts.mono, color: theme.colors.text.secondary }}>History</span>
            {term.workers.history.port && (
              <span style={{ fontSize: 9, color: theme.colors.text.disabled }}>:{term.workers.history.port}</span>
            )}
          </div>
          {term.workers.ephemeral.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Dot color={theme.colors.accent.yellow} />
              <span style={{ fontSize: 10, fontFamily: theme.fonts.mono, color: theme.colors.text.secondary }}>
                {term.workers.ephemeral.length} agent{term.workers.ephemeral.length > 1 ? 's' : ''} running
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── UTC offset ── */}
      {(() => {
        const offset = term.status?.utc_offset as number | undefined
        if (offset == null) return null
        const label = offset === 0 ? 'UTC' : offset > 0 ? `UTC+${offset}` : `UTC${offset}`
        return (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            borderTop: `1px solid ${theme.colors.border.default}`, paddingTop: 10,
          }}>
            <span style={{ fontSize: 9, color: theme.colors.text.disabled, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Broker TZ</span>
            <span style={{ fontSize: 11, fontFamily: theme.fonts.mono, fontWeight: 700, color: theme.colors.text.primary }}>{label}</span>
            <span style={{ fontSize: 10, color: theme.colors.text.disabled }}>auto-detected</span>
          </div>
        )
      })()}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DataPage() {
  const isMobile = useIsMobile()
  const [showAdd,      setShowAdd]      = useState(false)
  const [busyId,       setBusyId]       = useState<string | null>(null)
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null)
  const [showOhlcExport, setShowOhlcExport] = useState(false)

  const { data: terminalsData, refetch: refetchTerminals } = useApi<{ terminals: TerminalEntry[] }>('', readOnly ? 0 : 2000)

  const terminals = terminalsData?.terminals ?? []

  async function handleAdd(terminal_path: string, label: string) { return; }

  async function handleStart(id: string) { return; }

  async function handleStop(id: string) { return; }

  async function handleDelete(id: string) { return; }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 10px' : '24px', background: theme.colors.bg.primary }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: theme.colors.text.primary }}>MT5 Terminals</div>
          <div style={{ fontSize: 11, color: theme.colors.text.disabled, marginTop: 2 }}>
            {readOnly ? 'Dev / prod is view-only. Manage workers from localhost.' : terminals.length === 0 ? 'No terminals configured' : `${terminals.filter(t => t.worker_running).length} / ${terminals.length} running`}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowOhlcExport(true)}
            disabled={readOnly}
            style={{ background: `${theme.colors.accent.blue}22`, border: `1px solid ${theme.colors.accent.blue}`, borderRadius: 5, color: theme.colors.accent.blue, fontSize: 11, fontWeight: 700, padding: '6px 14px', cursor: 'pointer' }}
          >
            Export OHLC
          </button>
          <button
            onClick={() => setShowAdd(true)}
            disabled={readOnly}
            style={{ background: `${theme.colors.accent.green}22`, border: `1px solid ${theme.colors.accent.green}`, borderRadius: 5, color: theme.colors.accent.green, fontSize: 11, fontWeight: 700, padding: '6px 14px', cursor: 'pointer' }}
          >
            + Add Terminal
          </button>
        </div>
      </div>

      {/* Terminal cards */}
      {terminals.length === 0 ? (
        <div style={{ background: theme.colors.bg.deep, border: `1px solid ${theme.colors.border.default}`, borderRadius: 8, padding: '32px', textAlign: 'center', color: theme.colors.text.disabled, fontSize: 12 }}>
          {readOnly ? 'Worker controls are disabled in dev / prod. Market data uses the shared Windows backend.' : <>No terminals configured. Click <strong style={{ color: theme.colors.text.secondary }}>+ Add Terminal</strong> to connect an MT5 instance.</>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {terminals.map(term => (
            <TerminalCard
              key={term.id}
              term={term}
              market_open={term.market_open}
              busy={busyId === term.id}
              deletePending={deletePendingId === term.id}
              onStart={() => handleStart(term.id)}
              onStop={() => handleStop(term.id)}
              onDelete={() => setDeletePendingId(term.id)}
              onConfirmDelete={() => handleDelete(term.id)}
              onCancelDelete={() => setDeletePendingId(null)}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}

      {showAdd && !readOnly && (
        <AddTerminalModal onAdd={handleAdd} onCancel={() => setShowAdd(false)} />
      )}

      {showOhlcExport && !readOnly && (
        <OhlcExportModal onClose={() => setShowOhlcExport(false)} />
      )}
    </div>
  )
}
