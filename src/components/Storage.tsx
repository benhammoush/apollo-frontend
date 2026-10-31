/** Public presentation only; private operational implementation is excluded. */
import { useState, useEffect, useCallback, useRef } from 'react'
import { theme } from '../design-system'
import DatasetViewerModal, { DatasetViewerTarget } from './shared/DatasetViewerModal'
import ChartNavigatePopover from './shared/ChartNavigatePopover'
import { fmtDate } from '../utils/date'
import { fetchWithMeta } from '../utils/fetchWithMeta'
import { API_URL } from '../utils/viewerApi'
import { usePersistedState } from '../store/PersistedContext'
import { getLayoutSlotCount } from '../store/persistedState'
import { selectWorkspaceDataset } from '../utils/workspaceDataset'

export interface TreeItem {
  id: string
  name: string
  path: string
  type: 'folder' | 'file'
  createdAt?: string
  children?: TreeItem[]
}

const ROOT_LABELS: Record<string, string> = {
  Indicators: 'Indicators',
}

const ROOT_COLORS: Record<string, { color: string; bg: string }> = {
  Indicators: { color: theme.colors.accent.blue, bg: `${theme.colors.accent.blue}22` },
}

const UPLOAD_BASE_PATH = ''

function isUploadableFolder(path: string) { return false; }

/** Feature flag: set to true to enable CSV export (ZIP) and import (upload) in the Storage browser. */
const IMPORT_EXPORT_ENABLED = false

/** Browse admitted datasets, restoring a workspace selection or selecting its one-time default example. */
export default function Storage({ embedded, slotIndex, visible = true }: { embedded?: boolean; slotIndex?: number; visible?: boolean }) {
  const [tree, setTree] = useState<TreeItem[]>([])
  const visibleTree = tree.filter(item => item.path !== 'unit_tests')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [viewerTarget, setViewerTarget] = useState<DatasetViewerTarget | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)
  const [exportJobId, setExportJobId] = useState<string | null>(null)
  const [exportProgress, setExportProgress] = useState<{ files_done: number; files_total: number } | null>(null)
  const exportPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [navigateTs, setNavigateTs] = useState<number | null>(null)
  const [navigateAnchor, setNavigateAnchor] = useState<DOMRect | null>(null)
  const [navigateSymbol, setNavigateSymbol] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadDragOver, setUploadDragOver] = useState(false)
  const [selectedUploadFolder, setSelectedUploadFolder] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { state: workspaceState, setSlotContent } = usePersistedState()
  const slot = embedded && slotIndex !== undefined ? workspaceState.slots[slotIndex] : undefined

  const handleNavigateToDate = useCallback((ts: number, anchorEl: HTMLElement, symbol?: string) => {
    const slotCount = getLayoutSlotCount(workspaceState.layoutMode)
    const hasCharts = workspaceState.slots.slice(0, slotCount).some(s => s.type === 'chart')
    if (!hasCharts) return
    setNavigateTs(ts)
    setNavigateAnchor(anchorEl.getBoundingClientRect())
    setNavigateSymbol(symbol ?? null)
  }, [workspaceState.layoutMode, workspaceState.slots])

  const refreshTree = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetchWithMeta('/storage/tree', undefined, { trigger: 'manual' })
      if (!r.ok) throw new Error(String(r.status))
      const d = await r.json()
      setTree(d.tree ?? [])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refreshTree() }, [refreshTree])

  useEffect(() => {
    return () => {
      if (exportPollRef.current) clearInterval(exportPollRef.current)
    }
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleFileClick = useCallback((item: Pick<TreeItem, 'name' | 'path'>) => {
    setViewerTarget({
      title: item.name,
      filePath: item.path,
      url: `/storage/file?path=${encodeURIComponent(item.path)}`,
    })
    if (visible && slot?.type === 'dataset' && slotIndex !== undefined) {
      setSlotContent(slotIndex, { ...slot, selectedFile: item.path, openRandom: false })
    }
  }, [visible, slot, slotIndex, setSlotContent])

  useEffect(() => {
    if (!visible || loading || viewerTarget || slot?.type !== 'dataset') return
    const item = selectWorkspaceDataset(tree, slot.selectedFile, slot.openRandom === true)
    if (item) handleFileClick(item)
  }, [visible, tree, loading, viewerTarget, slot, handleFileClick])

  /** Return to the browser without rerolling a random example or reopening a closed saved viewer. */
  const closeViewer = useCallback(() => {
    setViewerTarget(null)
    if (visible && slot?.type === 'dataset' && slotIndex !== undefined) {
      setSlotContent(slotIndex, { ...slot, selectedFile: undefined, openRandom: false })
    }
  }, [visible, slot, slotIndex, setSlotContent])

  const handleDelete = useCallback(async (item: TreeItem) => { return; }, [])

  const startRename = useCallback((item: TreeItem) => {
    setRenaming(item.path)
    setRenameValue(item.name)
    setRenameError('')
  }, [])

  const cancelRename = useCallback(() => {
    setRenaming(null)
    setRenameValue('')
    setRenameError('')
  }, [])

  const confirmRename = useCallback(async (oldPath: string) => { setRenameError('Unavailable in this interface'); }, [renameValue, cancelRename])

  const handleExport = useCallback(async (item: TreeItem) => { return; }, [])

  const handleUpload = useCallback(async (files: FileList | File[]) => { return; }, [selectedUploadFolder])

  const handleUploadDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy'
      setUploadDragOver(true)
    }
  }, [])

  const handleUploadDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setUploadDragOver(false)
    }
  }, [])

  const handleUploadDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setUploadDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  }, [handleUpload])

  const handleFolderClickForUpload = useCallback((folderPath: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedUploadFolder(folderPath)
    if (!expanded.has(folderPath)) {
      toggleExpand(folderPath)
    }
  }, [expanded, toggleExpand])

  const openFilePicker = useCallback(() => {
    if (!IMPORT_EXPORT_ENABLED) return
    fileInputRef.current?.click()
  }, [])

  const renderTreeItem = (item: TreeItem, depth: number): React.ReactNode => {
    if (item.type === 'file') {
      return renderFileItem(item, depth)
    }
    return renderFolderItem(item, depth)
  }

  const renderFileItem = (item: TreeItem, depth: number) => {
    return (
      <div
        key={item.path}
        onClick={() => handleFileClick(item)}
        title={item.path}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 8px 3px 28px',
          paddingLeft: 28 + depth * 16,
          cursor: 'pointer',
          borderBottom: `1px solid ${theme.colors.border.subtle}`,
          fontSize: theme.fonts.size.xs,
          fontFamily: theme.fonts.mono,
          color: theme.colors.text.link,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = theme.colors.bg.hover }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <span style={{ fontSize: 9, color: theme.colors.text.muted, width: 14, textAlign: 'center', flexShrink: 0 }}>
          📄
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </span>
        {item.createdAt && (
          <span style={{ fontSize: 9, color: theme.colors.text.dimmer, marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {fmtDate(item.createdAt)}
          </span>
        )}
      </div>
    )
  }

  const renderFolderItem = (item: TreeItem, depth: number) => {
    const isExpanded = expanded.has(item.path)
    const isRenaming = renaming === item.path
    const isDeleting = deleting === item.path
    const isExporting = exporting === item.path
    const childCount = item.children?.length ?? 0
    const isUploadTarget = selectedUploadFolder === item.path

    return (
      <div key={item.path}>
        <div
          onClick={() => !isRenaming && toggleExpand(item.path)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            paddingLeft: 12 + depth * 16,
            cursor: isRenaming ? 'default' : 'pointer',
            background: isExpanded ? theme.colors.bg.hover : isUploadTarget ? `${theme.colors.accent.blue}10` : 'transparent',
            borderBottom: `1px solid ${theme.colors.border.subtle}`,
          }}
          onMouseEnter={e => {
            if (!isExpanded && !isRenaming) e.currentTarget.style.background = theme.colors.bg.hover
          }}
          onMouseLeave={e => {
            if (!isExpanded && !isRenaming) {
              e.currentTarget.style.background = isUploadTarget ? `${theme.colors.accent.blue}10` : 'transparent'
            }
          }}
        >
          <span style={{ fontSize: 9, color: theme.colors.text.dimmer, width: 10, flexShrink: 0, textAlign: 'center' }}>
            {isExpanded ? '▼' : '▶'}
          </span>

          {isRenaming ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
              <input
                autoFocus
                value={renameValue}
                onChange={e => { setRenameValue(e.target.value); setRenameError('') }}
                onKeyDown={e => {
                  if (e.key === 'Enter') confirmRename(item.path)
                  if (e.key === 'Escape') cancelRename()
                }}
                style={{
                  flex: 1,
                  background: theme.colors.bg.input,
                  border: `1px solid ${theme.colors.text.link}`,
                  color: theme.colors.text.primary,
                  borderRadius: 4,
                  padding: '2px 6px',
                  fontSize: 10,
                  fontFamily: theme.fonts.mono,
                }}
              />
              {renameError && <span style={{ fontSize: 9, color: theme.colors.accent.red, whiteSpace: 'nowrap' }}>{renameError}</span>}
              <button onClick={() => confirmRename(item.path)}
                style={{ background: theme.colors.accent.green, border: 'none', borderRadius: 3, color: theme.colors.bg.primary, fontSize: 11, padding: '1px 6px', cursor: 'pointer' }}>✓</button>
              <button onClick={cancelRename}
                style={{ background: 'transparent', border: `1px solid ${theme.colors.border.muted}`, borderRadius: 3, color: theme.colors.text.muted, fontSize: 11, padding: '1px 6px', cursor: 'pointer' }}>✗</button>
            </div>
          ) : (
            <span style={{
              fontSize: theme.fonts.size.xs,
              color: theme.colors.text.primary,
              fontFamily: theme.fonts.mono,
              flex: 1,
              fontWeight: theme.fonts.weight.medium,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {item.name}
            </span>
          )}

          {childCount > 0 && (
            <span style={{ fontSize: 9, color: theme.colors.text.dimmer, whiteSpace: 'nowrap' }}>
              {childCount}
            </span>
          )}

          {!isRenaming && (
            <>
              {isUploadableFolder(item.path) && (
                <button
                  onClick={e => handleFolderClickForUpload(item.path, e)}
                  disabled={!IMPORT_EXPORT_ENABLED}
                  title={isUploadTarget ? 'Current upload target' : 'Set as upload target'}
                  style={{
                    background: isUploadTarget ? `${theme.colors.accent.blue}30` : 'transparent',
                    border: `1px solid ${isUploadTarget ? theme.colors.accent.blue : theme.colors.border.muted}`,
                    borderRadius: 4,
                    color: !IMPORT_EXPORT_ENABLED ? theme.colors.text.dimmer : isUploadTarget ? theme.colors.accent.blue : theme.colors.text.muted,
                    cursor: !IMPORT_EXPORT_ENABLED ? 'default' : 'pointer',
                    fontSize: 10,
                    padding: '2px 6px',
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >⬆</button>
              )}
              <button
                onClick={e => { e.stopPropagation(); handleExport(item) }}
                disabled={!IMPORT_EXPORT_ENABLED || isExporting}
                title="Export ZIP"
                style={{
                  background: 'transparent',
                  border: `1px solid ${theme.colors.border.muted}`,
                  borderRadius: 4,
                  color: !IMPORT_EXPORT_ENABLED || isExporting ? theme.colors.text.dimmer : theme.colors.text.muted,
                  cursor: !IMPORT_EXPORT_ENABLED || isExporting ? 'default' : 'pointer',
                  fontSize: 10,
                  padding: '2px 8px',
                  lineHeight: 1.2,
                  flexShrink: 0,
                }}
              >
                {isExporting
                  ? (exportProgress && exportProgress.files_total > 0
                    ? `Export ${exportProgress.files_done}/${exportProgress.files_total}`
                    : 'Export…')
                  : 'Export'}
              </button>
              <button
                onClick={e => { e.stopPropagation(); startRename(item) }}
                title="Rename"
                style={{
                  background: 'transparent',
                  border: `1px solid ${theme.colors.border.muted}`,
                  borderRadius: 4,
                  color: theme.colors.text.muted,
                  cursor: 'pointer',
                  fontSize: 10,
                  padding: '2px 6px',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >✎</button>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(item) }}
                disabled={isDeleting}
                title="Delete"
                style={{
                  background: 'transparent',
                  border: `1px solid ${theme.colors.border.muted}`,
                  borderRadius: 4,
                  color: isDeleting ? theme.colors.text.dimmer : theme.colors.chart.down,
                  cursor: isDeleting ? 'default' : 'pointer',
                  fontSize: 10,
                  padding: '2px 6px',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >×</button>
            </>
          )}
        </div>

        {/* Render children when expanded */}
        {isExpanded && item.children && (
          <div>
            {item.children.map(child => renderTreeItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const renderRootSection = (rootItem: TreeItem) => {
    const isExpanded = expanded.has(rootItem.path)
    const rootMeta = ROOT_COLORS[rootItem.name] ?? { color: theme.colors.text.primary, bg: 'transparent' }

    return (
      <div key={rootItem.path}>
        <button
          onClick={() => toggleExpand(rootItem.path)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            background: 'none',
            border: 'none',
            padding: '8px 0',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 9, color: theme.colors.text.dimmer }}>{isExpanded ? '▼' : '▶'}</span>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 4,
            background: rootMeta.bg,
            color: rootMeta.color,
            fontFamily: theme.fonts.mono,
            letterSpacing: 0.3,
          }}>
            {ROOT_LABELS[rootItem.name] ?? rootItem.name}
          </span>
          <span style={{ fontSize: 11, color: theme.colors.text.dimmer }}>
            {(rootItem.children?.length ?? 0)} {rootItem.children?.length === 1 ? 'folder' : 'folders'}
          </span>
        </button>

        {isExpanded && rootItem.children && (
          <div>
            {rootItem.children.map(child => renderTreeItem(child, 0))}
          </div>
        )}
      </div>
    )
  }

  const viewerContent = viewerTarget ? (
    embedded ? (
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <DatasetViewerModal target={viewerTarget} onClose={closeViewer} embedded onNavigateToDate={handleNavigateToDate} />
      </div>
    ) : (
      <DatasetViewerModal target={viewerTarget} onClose={closeViewer} />
    )
  ) : null

  const treeContent = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: theme.colors.bg.primary, color: theme.colors.text.primary }}>
      <div style={{ padding: '10px 20px', borderBottom: `1px solid ${theme.colors.border.default}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.colors.text.primary, flex: 1 }}>Storage</span>
        <span style={{ fontSize: 9, color: theme.colors.text.dimmer, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
          Upload to: {selectedUploadFolder}
        </span>
        <button
          onClick={openFilePicker}
          disabled={!IMPORT_EXPORT_ENABLED || uploading.length > 0}
          title="Upload CSV files"
          style={{
            background: !IMPORT_EXPORT_ENABLED || uploading.length > 0 ? theme.colors.border.default : theme.colors.bg.hover,
            border: `1px solid ${theme.colors.border.muted}`,
            borderRadius: 4,
            color: !IMPORT_EXPORT_ENABLED || uploading.length > 0 ? theme.colors.text.dimmer : theme.colors.accent.blue,
            cursor: !IMPORT_EXPORT_ENABLED || uploading.length > 0 ? 'default' : 'pointer',
            fontSize: 12,
            padding: '2px 8px',
            lineHeight: 1.4,
          }}
        >
          ⬆
        </button>
        <button
          onClick={refreshTree}
          disabled={loading}
          title="Refresh"
          style={{
            background: 'transparent',
            border: `1px solid ${theme.colors.border.muted}`,
            borderRadius: 4,
            color: loading ? theme.colors.text.dimmer : theme.colors.text.muted,
            cursor: loading ? 'default' : 'pointer',
            fontSize: 12,
            padding: '2px 8px',
            lineHeight: 1.4,
          }}
        >
          ↻
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          multiple
          onChange={e => { if (e.target.files?.length) { handleUpload(e.target.files); e.target.value = '' } }}
          style={{ display: 'none' }}
        />
      </div>
      {uploading.length > 0 && (
        <div style={{ padding: '4px 20px', borderBottom: `1px solid ${theme.colors.border.subtle}`, background: theme.colors.bg.hover, fontSize: 10, color: theme.colors.accent.blue, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Uploading: {uploading.join(', ')}</span>
          <span style={{ fontSize: 10, opacity: 0.7 }}>...</span>
        </div>
      )}
      {uploadError && (
        <div style={{ padding: '4px 20px', borderBottom: `1px solid ${theme.colors.border.subtle}`, background: theme.colors.bg.hover, fontSize: 10, color: theme.colors.chart.down, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} style={{ background: 'transparent', border: 'none', color: theme.colors.text.muted, cursor: 'pointer', fontSize: 12, lineHeight: 1 }}>×</button>
        </div>
      )}
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', position: 'relative' }}
        onDragOver={IMPORT_EXPORT_ENABLED ? handleUploadDragOver : undefined}
        onDragLeave={IMPORT_EXPORT_ENABLED ? handleUploadDragLeave : undefined}
        onDrop={IMPORT_EXPORT_ENABLED ? handleUploadDrop : undefined}
      >
        {uploadDragOver && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${theme.colors.accent.blue}18`,
            border: `2px dashed ${theme.colors.accent.blue}`,
            borderRadius: 8, margin: 8,
          }}>
            <span style={{ fontSize: 14, color: theme.colors.accent.blue, fontWeight: 700 }}>
              Drop CSV files here
            </span>
          </div>
        )}
        {loading && <div style={{ color: theme.colors.text.muted, fontSize: 12 }}>Loading…</div>}
        {!loading && visibleTree.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: theme.colors.text.muted, gap: 10, paddingTop: 40 }}>
            <span style={{ fontSize: 28 }}>🗂</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: theme.colors.text.primary }}>No data yet</span>
            <span style={{ fontSize: 12 }}>Run agents to see results here.</span>
          </div>
        )}
        {!loading && visibleTree.map(rootItem => renderRootSection(rootItem))}
      </div>
    </div>
  )

  if (embedded && viewerTarget) {
    return (
      <>
        {viewerContent}
        {navigateTs && navigateAnchor && (
          <ChartNavigatePopover targetTs={navigateTs} anchorRect={navigateAnchor} targetSymbol={navigateSymbol ?? undefined} onClose={() => { setNavigateTs(null); setNavigateSymbol(null) }} />
        )}
      </>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {treeContent}
      {!embedded && viewerContent}
      {navigateTs && navigateAnchor && (
        <ChartNavigatePopover targetTs={navigateTs} anchorRect={navigateAnchor} targetSymbol={navigateSymbol ?? undefined} onClose={() => { setNavigateTs(null); setNavigateSymbol(null) }} />
      )}
    </div>
  )
}
