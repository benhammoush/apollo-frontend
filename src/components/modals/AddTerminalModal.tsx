import { useState, useEffect } from 'react'
import { MT5TerminalInfo } from '../../types'
import { theme, Modal, inputStyleLg, selectStyleLg, buttonPrimaryStyle, buttonSecondaryStyle, labelStyle, labelTextStyle, optionalTextStyle } from '../../design-system'

import { API_URL as API } from '../../utils/viewerApi'
import { fetchWithMeta } from '../../utils/fetchWithMeta'

function terminalDisplayName(t: { label?: string; exe_path?: string; terminal_path?: string; id: string }): string {
  const path = t.terminal_path ?? t.exe_path ?? ''
  const pathName = path.split(/[\\/]/).slice(-2, -1)[0]
  const name = t.label || pathName || t.id.slice(0, 8)
  return `${name}  (${t.id.slice(0, 8)}…)`
}

interface AddTerminalModalProps {
  onAdd: (path: string, label: string) => Promise<void>
  onCancel: () => void
}

export default function AddTerminalModal({ onAdd, onCancel }: AddTerminalModalProps) {
  const [terminals, setTerminals] = useState<MT5TerminalInfo[]>([])
  const [path,  setPath]  = useState('')
  const [label, setLabel] = useState('')
  const [busy,  setBusy]  = useState(false)
  const [err,   setErr]   = useState('')

  useEffect(() => {  }, [])

  async function handleAdd() {
    if (!path) { setErr('Select a terminal'); return }
    setBusy(true); setErr('')
    try { await onAdd(path, label) }
    catch (e) { setErr(String(e)) }
    finally { setBusy(false) }
  }

  return (
    <Modal title="Add MT5 Terminal" onClose={onCancel} width={420}>
      <div style={labelStyle}>
        <span style={labelTextStyle}>Terminal</span>
        <select value={path} onChange={e => setPath(e.target.value)} style={selectStyleLg}>
          <option value="">— Select terminal —</option>
          {terminals.map(t => <option key={t.id} value={t.exe_path}>{terminalDisplayName(t)}</option>)}
        </select>
        {terminals.length === 0 && <span style={{ fontSize: 10, color: theme.colors.text.disabled }}>Unavailable in this interface</span>}
      </div>

      <div style={labelStyle}>
        <span style={labelTextStyle}>Label <span style={optionalTextStyle}>(optional)</span></span>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. IC Markets Live" style={inputStyleLg} />
      </div>

      {err && <div style={{ fontSize: 11, color: theme.colors.accent.red }}>{err}</div>}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={buttonSecondaryStyle(busy)}>Cancel</button>
        <button onClick={handleAdd} disabled={!path || busy} style={buttonPrimaryStyle(!path || busy)}>
          {busy ? 'Adding…' : 'Add & Start'}
        </button>
      </div>
    </Modal>
  )
}

export { terminalDisplayName }
