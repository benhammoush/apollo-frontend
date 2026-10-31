/** Viewer NBL modal shell: retain its grid without real timeframe/mapping values. */
import { theme, Modal } from '../../design-system'
import { MaskedFooter, type MaskedModalProps } from './MaskedModalControls'

/** No private configuration imports, confirm callback or execution handler. */
export default function MaskedNblModal({ onCancel }: MaskedModalProps) {
  return <Modal title="NBL Closes" subtitle="Configuration values are hidden; labels are masked; execution is unavailable" onClose={onCancel} width={400}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
      {Array.from({ length: 9 }, (_, index) => <button key={index} disabled aria-label={`Hidden option ${index + 1}`} style={{ width: 64, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.colors.bg.deep, border: `1px solid ${theme.colors.border.muted}`, borderRadius: theme.radii.md, fontSize: 14, fontWeight: 700, fontFamily: theme.fonts.mono, color: theme.colors.text.muted }}>xxxx</button>)}
    </div>
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${theme.colors.border.default}` }}><MaskedFooter onCancel={onCancel} /></div>
  </Modal>
}
