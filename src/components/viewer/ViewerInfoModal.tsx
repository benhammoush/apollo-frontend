/** Viewer help only: the private help module is not imported or bundled here. */
import { useCallback, useEffect } from 'react'
import { theme } from '../../design-system'

interface Props {
  page: 'dashboard' | 'agents' | 'statistics'
  onClose: () => void
}

const HELP = {
  dashboard: {
    heading: 'Market Analysis', subtitle: 'Chart and dataset viewing',
    sections: [
      { title: 'Charts', icon: '📈', bullets: ['Choose an available symbol and timeframe, then zoom or pan the chart.', 'Market history and live updates depend on the sources approved for this application.'] },
      { title: 'Datasets', icon: '📁', bullets: ['Open a file under Indicators to view its columns and rows.', 'Example templates contain synthetic dates and xxxx placeholders, not original results.'] },
    ],
  },
  agents: {
    heading: 'Agents', subtitle: 'Read-only interface',
    sections: [
      { title: 'Read-only controls', icon: '🔒', bullets: ['Execution and configuration changes are unavailable in this interface.', 'Configuration labels and values are shown as xxxx.'] },
      { title: 'Example data', icon: '📁', bullets: ['Browse the selected templates from the Dataset viewer.', 'The examples do not contain private result rows or original dates.'] },
    ],
  },
  statistics: {
    heading: 'Dataset viewing', subtitle: 'Read-only examples',
    sections: [
      { title: 'Templates', icon: '📋', bullets: ['Each selected template contains 100 generated rows with chronological synthetic dates and xxxx in other cells.', 'These examples are not performance statistics or trading recommendations.'] },
      { title: 'Viewer controls', icon: '📅', bullets: ['Scroll to load more rows. Search, sort, JSON and copy apply to the rows currently loaded.', 'Date navigation requires an open chart and available market history.'] },
    ],
  },
}

/** Preserve the original help card's layout/dismissal, with reviewed generic text. */
export default function ViewerInfoModal({ page, onClose }: Props) {
  const info = HELP[page]
  const handleKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose()
  }, [onClose])
  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, backdropFilter: 'blur(3px)' }}>
    <div onClick={event => event.stopPropagation()} style={{ background: theme.colors.border.surface, border: `1px solid ${theme.colors.border.muted}`, borderRadius: theme.radii.xl, maxWidth: 640, width: 'calc(100vw - 48px)', maxHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.6)' }}>
      <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${theme.colors.border.grid}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: theme.fonts.size.xl, fontWeight: theme.fonts.weight.bold, color: theme.colors.text.primary, marginBottom: 4 }}>{info.heading}</div>
          <div style={{ fontSize: theme.fonts.size.md, color: theme.colors.text.axisText }}>{info.subtitle}</div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: theme.colors.text.axisText, fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
      </div>
      <div style={{ overflowY: 'auto', padding: '16px 22px 22px', flex: 1 }}>
        {info.sections.map((section, index) => <div key={index} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 15 }}>{section.icon}</span>
            <span style={{ fontSize: theme.fonts.size.md, fontWeight: theme.fonts.weight.bold, color: theme.colors.text.link, letterSpacing: 0.3 }}>{section.title}</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>{section.bullets.map((bullet, item) => <li key={item} style={{ fontSize: theme.fonts.size.md, color: theme.colors.text.secondary, lineHeight: 1.65, marginBottom: 5 }}>{bullet}</li>)}</ul>
        </div>)}
      </div>
      <div style={{ padding: '10px 22px', borderTop: `1px solid ${theme.colors.border.grid}`, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: theme.colors.accent.green, border: `1px solid ${theme.colors.accent.green}`, color: theme.colors.accent.primary, borderRadius: theme.radii.md, padding: '5px 18px', fontSize: theme.fonts.size.md, fontWeight: theme.fonts.weight.bold, cursor: 'pointer' }}>Got it</button>
      </div>
    </div>
  </div>
}
