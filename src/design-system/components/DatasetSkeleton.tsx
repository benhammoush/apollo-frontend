import { theme } from '../theme'

/** In-content loading placeholders; never part of dataset rows or table operations. */
export default function DatasetSkeleton({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div role="status" aria-label={label} aria-live="polite" style={{ position: 'sticky', left: 0, width: '100%', flexShrink: 0 }}>
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>{label}</span>
      <div aria-hidden="true">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} style={{ height: 28, display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', alignItems: 'center', gap: 16, padding: '0 10px', borderBottom: `1px solid ${theme.colors.border.grid}` }}>
            {Array.from({ length: 6 }, (_, column) => (
              <div key={column} style={{ height: 8, width: `${55 + ((row + column) % 3) * 15}%`, borderRadius: 3, background: theme.colors.border.strong, opacity: 0.65 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
