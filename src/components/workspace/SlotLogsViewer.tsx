/**
 * SlotLogsViewer — responsive log viewer for workspace slots.
 * Wraps the existing Logs component directly.
 */
import Logs from '../Logs'

export default function SlotLogsViewer({ visible = true }: { visible?: boolean }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Logs visible={visible} />
    </div>
  )
}
