import { type RefObject } from 'react'
import { BB_TF_CONFIG } from './constants'
import { theme } from '../../design-system'

interface Props {
  tf: string
  bbPaneHeight: number
  // BB pane label ref
  bbPaneLabelRef: RefObject<HTMLDivElement>
  // Tooltip refs
  tooltipElRef: RefObject<HTMLDivElement>
  tooltipDateRef: RefObject<HTMLDivElement>
  tooltipORef: RefObject<HTMLSpanElement>
  tooltipHRef: RefObject<HTMLSpanElement>
  tooltipLRef: RefObject<HTMLSpanElement>
  tooltipCRef: RefObject<HTMLSpanElement>
  tooltipUWRef: RefObject<HTMLSpanElement>
  tooltipBDRef: RefObject<HTMLSpanElement>
  tooltipLWRef: RefObject<HTMLSpanElement>
  tooltipBBRowRef: RefObject<HTMLDivElement>
  tooltipBBValRef: RefObject<HTMLSpanElement>
  indicatorValueStripRef: RefObject<HTMLDivElement>
}

export default function ChartTooltip({
  tf, bbPaneHeight,
  bbPaneLabelRef,
  tooltipElRef, tooltipDateRef,
  tooltipORef, tooltipHRef, tooltipLRef, tooltipCRef,
  tooltipUWRef, tooltipBDRef, tooltipLWRef,
  tooltipBBRowRef, tooltipBBValRef,
  indicatorValueStripRef,
}: Props) {
  return (
    <>
      {/* ── BB pane label — top-left of the BB sub-pane ──────────────────────────
          Always in DOM; shown/hidden and written imperatively by the crosshair
          handler to avoid re-renders on every mouse move.                     */}
      {BB_TF_CONFIG[tf] && (
        <div
          ref={bbPaneLabelRef}
          style={{
            display: 'none',
            position: 'absolute',
            bottom: bbPaneHeight,
            left: 8,
            fontSize: 10,
            color: theme.colors.text.dim,
            fontFamily: theme.fonts.mono,
            letterSpacing: 0.3,
            pointerEvents: 'none',
            zIndex: 15,
            background: theme.colors.bg.overlay,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${theme.colors.border.muted}`,
          }}
        />
      )}

      {/* ── Info panel — fixed top-left ─────────────────────────────────────────
          Always rendered in the DOM; shown/hidden via display:none.
          Content is written via DOM refs in the crosshair handler — no React
          setState, so the chart never re-renders on every cursor move.       */}
      <div
        ref={tooltipElRef}
        style={{
          display: 'none',   // hidden until crosshair enters the chart
          position: 'absolute',
          top: 12, left: 12,
          zIndex: 40, pointerEvents: 'none',
          background: theme.colors.bg.overlay,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${theme.colors.border.muted}`,
          borderRadius: theme.radii.lg,
          padding: '10px 12px',
          margin: '5px',
          fontSize: theme.fonts.size.sm,
          fontFamily: theme.fonts.mono,
          minWidth: 185,
          maxWidth: 240,
          boxShadow: theme.shadows.dropdown,
          color: theme.colors.text.bright,
        }}
      >
        {/* Date — filled by crosshair handler */}
        <div ref={tooltipDateRef} style={{ fontSize: 9, color: theme.colors.text.dim, letterSpacing: 0.5, marginBottom: 7, fontWeight: 300 }} />

        {/* OHLC — 2-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', marginBottom: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
            <span style={{ color: theme.colors.text.dim, fontSize: 9, fontWeight: 300 }}>O</span>
            <span ref={tooltipORef} style={{ color: theme.colors.text.axisText, fontSize: 11, fontWeight: 500 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
            <span style={{ color: theme.colors.text.dim, fontSize: 9, fontWeight: 300 }}>H</span>
            <span ref={tooltipHRef} style={{ color: theme.colors.chart.up, fontSize: 11, fontWeight: 500 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
            <span style={{ color: theme.colors.text.dim, fontSize: 9, fontWeight: 300 }}>L</span>
            <span ref={tooltipLRef} style={{ color: theme.colors.chart.down, fontSize: 11, fontWeight: 500 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
            <span style={{ color: theme.colors.text.dim, fontSize: 9, fontWeight: 300 }}>C</span>
            <span ref={tooltipCRef} style={{ fontSize: 11, fontWeight: 500 }} />
          </div>
        </div>

        {/* WMF */}
        <div style={{ borderTop: `1px solid ${theme.colors.border.subtle}`, paddingTop: 6, marginBottom: 6 }}>
          <div style={{ display: 'flex', gap: 10, fontSize: 10 }}>
            <span style={{ color: theme.colors.text.dim, fontWeight: 300 }}>UW <span ref={tooltipUWRef} style={{ color: theme.colors.text.muted, fontWeight: 500 }} /></span>
            <span style={{ color: theme.colors.text.dim, fontWeight: 300 }}>BD <span ref={tooltipBDRef} style={{ color: theme.colors.text.muted, fontWeight: 500 }} /></span>
            <span style={{ color: theme.colors.text.dim, fontWeight: 300 }}>LW <span ref={tooltipLWRef} style={{ color: theme.colors.text.muted, fontWeight: 500 }} /></span>
          </div>
        </div>

        {/* BB% — hidden on TFs without a BB panel */}
        <div ref={tooltipBBRowRef} style={{ display: 'none', borderTop: `1px solid ${theme.colors.border.subtle}`, paddingTop: 6, marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
            <span style={{ color: theme.colors.text.dimmer }}>BB%</span>
            <span ref={tooltipBBValRef} />
          </div>
        </div>
      </div>

      <div
        ref={indicatorValueStripRef}
        style={{
          display: 'none',
          position: 'absolute',
          left: 10,
          bottom: 8,
          zIndex: 22,
          pointerEvents: 'none',
          background: theme.colors.bg.overlay,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: `1px solid ${theme.colors.border.default}`,
          borderRadius: theme.radii.md,
          padding: '5px 9px',
          fontSize: 11,
          lineHeight: 1.1,
          fontFamily: theme.fonts.mono,
          fontWeight: 600,
          letterSpacing: 0.2,
          color: theme.colors.text.primary,
          boxShadow: theme.shadows.dropdown,
          whiteSpace: 'nowrap',
          maxWidth: 'calc(100% - 20px)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      />
    </>
  )
}
