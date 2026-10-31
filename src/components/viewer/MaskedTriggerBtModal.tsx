/** Viewer presentation of the accepted modal shell, with no private defaults/imports. */
import { useState } from 'react'
import { theme, Modal } from '../../design-system'
import { MaskedChoice, MaskedField, MaskedFooter, labelStyle, type MaskedModalProps } from './MaskedModalControls'

// Preserve presentation shape only, never private labels, identifiers or values.
const GROUP_SIZES = [9, 9, 2]
const COLORS = [theme.colors.accent.yellow, theme.colors.accent.orange, theme.colors.accent.blue, theme.colors.accent.green, theme.colors.accent.purple]

/** Switching placeholder groups is browser-local and never reveals a real system. */
export default function MaskedTriggerBtModal({ onCancel }: MaskedModalProps) {
  const [selected, setSelected] = useState(0)
  const color = COLORS[selected]
  return <Modal title="Trigger BT Configuration" subtitle="Configuration values are hidden; labels are masked; execution is unavailable" onClose={onCancel} width={1040} footer={<MaskedFooter onCancel={onCancel} />}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: 24, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {GROUP_SIZES.map((size, group) => <section key={group}>
          <div style={labelStyle}>xxxx</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 7 }}>{Array.from({ length: size }, (_, index) => <MaskedChoice key={index} choiceNumber={group * 10 + index + 1} />)}</div>
        </section>)}
        <section><div style={labelStyle}>xxxx</div><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{[1, 2, 3].map(index => <MaskedChoice key={index} choiceNumber={30 + index} />)}</div></section>
      </div>
      <section>
        <div style={labelStyle}>xxxx</div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{COLORS.map((tabColor, index) => <button key={index} aria-label={`Hidden group ${index + 1}`} aria-pressed={selected === index} onClick={() => setSelected(index)} style={{ border: `1px solid ${selected === index ? tabColor : theme.colors.border.muted}`, borderRadius: theme.radii.md, padding: '6px 9px', cursor: 'pointer', background: selected === index ? `${tabColor}22` : 'transparent', color: tabColor, fontFamily: theme.fonts.mono }}>xxxx</button>)}</div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><strong style={{ color, fontFamily: theme.fonts.mono }}>xxxx</strong><button disabled style={{ border: 'none', borderRadius: 12, padding: '5px 10px', background: theme.colors.bg.deep, color: theme.colors.text.muted }}>xxxx</button></div>
            <div>
              <div style={labelStyle}>xxxx</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>{Array.from({ length: 8 }, (_, index) => <button key={index} disabled style={{ border: `1px solid ${theme.colors.border.muted}`, borderRadius: theme.radii.sm, padding: '4px 7px', background: 'transparent', color: theme.colors.text.muted }}>xxxx</button>)}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{[1, 2, 3, 4, 5].map(index => <MaskedField key={index} fieldNumber={index} />)}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}><MaskedField fieldNumber={6} select /><MaskedField fieldNumber={7} /><MaskedField fieldNumber={8} select /><MaskedField fieldNumber={9} /></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>{[10, 11, 12].map(index => <MaskedField key={index} fieldNumber={index} />)}</div>
              {[0, 1, 2].map(group => <div key={group} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 10 }}><span style={{ width: 120, fontSize: 9, color: theme.colors.text.muted }}>xxxx</span>{[1, 2, 3].map(index => <MaskedField key={index} fieldNumber={12 + group * 3 + index} hideLabel />)}</div>)}
            </div>
          </div>
        </div>
      </section>
    </div>
  </Modal>
}
