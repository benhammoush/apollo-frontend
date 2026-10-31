import { Panel, Group, Separator } from 'react-resizable-panels'
import { usePersistedState } from '../../store/PersistedContext'
import type { LayoutMode } from '../../store/persistedState'
import { useIsMobile } from '../../hooks/useIsMobile'
import WorkspaceSlot from './WorkspaceSlot'
import { theme } from '../../design-system'

interface Props {
  symbols: string[]
  visible?: boolean
}

type LayoutNode =
  | { type: 'slot'; slot: number }
  | { type: 'split'; orientation: 'horizontal' | 'vertical'; children: LayoutNode[] }

const SEP_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  flexShrink: 0,
}

const slot = (n: number): LayoutNode => ({ type: 'slot', slot: n })
const row = (...children: LayoutNode[]): LayoutNode => ({ type: 'split', orientation: 'horizontal', children })
const col = (...children: LayoutNode[]): LayoutNode => ({ type: 'split', orientation: 'vertical', children })

function getLayoutTree(mode: LayoutMode): LayoutNode {
  switch (mode) {
    case 1: return slot(0)
    case 2: return row(slot(0), slot(1))
    case 5: return col(slot(0), slot(1))
    case 3: return col(row(slot(0), slot(1)), slot(2))
    case 19: return col(slot(0), row(slot(1), slot(2)))
    case 9: return col(slot(0), slot(1), slot(2))
    case 10: return row(slot(0), slot(1), slot(2))
    case 20: return row(slot(0), col(slot(1), slot(2)))
    case 21: return row(col(slot(0), slot(1)), slot(2))
    case 4: return col(row(slot(0), slot(1)), row(slot(2), slot(3)))
    case 11: return col(slot(0), slot(1), slot(2), slot(3))
    case 12: return row(slot(0), slot(1), slot(2), slot(3))
    case 15: return col(row(slot(0), slot(1), slot(2)), slot(3))
    case 16: return col(slot(0), row(slot(1), slot(2), slot(3)))
    case 17: return row(col(slot(0), slot(1), slot(2)), slot(3))
    case 18: return row(slot(0), col(slot(1), slot(2), slot(3)))
    case 6: return col(row(slot(0), slot(1), slot(2)), row(slot(3), slot(4), slot(5)))
    case 13: return row(col(slot(0), slot(1), slot(2)), col(slot(3), slot(4), slot(5)))
    case 8: return col(row(slot(0), slot(1), slot(2), slot(3)), row(slot(4), slot(5), slot(6), slot(7)))
    case 14: return row(col(slot(0), slot(1), slot(2), slot(3)), col(slot(4), slot(5), slot(6), slot(7)))
    default: return slot(0)
  }
}

export default function WorkspaceLayout({ symbols, visible = true }: Props) {
  const { state } = usePersistedState()
  const isMobile = useIsMobile()
  const effectiveMode: LayoutMode = isMobile ? 1 : state.layoutMode
  const tree = getLayoutTree(effectiveMode)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <RenderNode node={tree} symbols={symbols} single={effectiveMode === 1} path="root" visible={visible} />
    </div>
  )
}

function RenderNode({ node, symbols, single = false, path, visible }: { node: LayoutNode; symbols: string[]; single?: boolean; path: string; visible: boolean }) {
  if (node.type === 'slot') {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', minHeight: 0, minWidth: 0 }}>
        <WorkspaceSlot slotIndex={node.slot} symbols={symbols} single={single} visible={visible} />
      </div>
    )
  }

  return (
    <Group orientation={node.orientation} style={{ height: '100%', width: '100%', flex: 1, minHeight: 0, minWidth: 0 }}>
      {node.children.map((child, index) => (
        <SplitChild
          key={`${path}-${index}`}
          node={child}
          symbols={symbols}
          orientation={node.orientation}
          index={index}
          path={`${path}-${index}`}
          visible={visible}
        />
      ))}
    </Group>
  )
}

function SplitChild({
  node,
  symbols,
  orientation,
  index,
  path,
  visible,
}: {
  node: LayoutNode
  symbols: string[]
  orientation: 'horizontal' | 'vertical'
  index: number
  path: string
  visible: boolean
}) {
  const separatorStyle = orientation === 'horizontal'
    ? { ...SEP_STYLE, width: 3, cursor: 'col-resize' as const }
    : { ...SEP_STYLE, height: 3, cursor: 'row-resize' as const }

  const indicatorStyle = orientation === 'horizontal'
    ? { width: 1, height: '40%', background: theme.colors.border.default, borderRadius: 1 }
    : { height: 1, width: '40%', background: theme.colors.border.default, borderRadius: 1 }

  return (
    <>
      {index > 0 && (
        <Separator style={separatorStyle}>
          <div style={indicatorStyle} />
        </Separator>
      )}
      <Panel id={path} minSize={10}>
        <div style={{ height: '100%', width: '100%', display: 'flex', minHeight: 0, minWidth: 0 }}>
          <RenderNode node={node} symbols={symbols} path={path} visible={visible} />
        </div>
      </Panel>
    </>
  )
}
