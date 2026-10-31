import { type RefObject } from 'react'
import { theme } from '../../design-system'

interface Props {
  liveBidRef: RefObject<HTMLSpanElement>
  liveAskRef: RefObject<HTMLSpanElement>
}

/** Live bid/ask price overlay — top-right of the chart canvas.
 *  Content is written directly via DOM refs (no React re-renders on every tick). */
export default function ChartLivePrice({ liveBidRef, liveAskRef }: Props) {
  return (
    <div style={{
      position: 'absolute',
      top: 18,
      right: 100,
      zIndex: 40,
      pointerEvents: 'none',
      background: theme.colors.bg.overlay,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: `1px solid ${theme.colors.border.default}`,
      borderRadius: theme.radii.lg,
      padding: '8px 12px',
      fontFamily: theme.fonts.mono,
      boxShadow: theme.shadows.dropdown,
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
      minWidth: 110,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <span style={{ color: theme.colors.text.dim, fontSize: 9, fontWeight: 300 }}>BID</span>
        <span ref={liveBidRef} style={{ color: theme.colors.chart.down, fontSize: 11, transition: 'color 0.35s ease', fontWeight: 500 }}>—</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <span style={{ color: theme.colors.text.dim, fontSize: 9, fontWeight: 300 }}>ASK</span>
        <span ref={liveAskRef} style={{ color: theme.colors.chart.up, fontSize: 11, transition: 'color 0.35s ease', fontWeight: 500 }}>—</span>
      </div>
    </div>
  )
}
