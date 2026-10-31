/** @packageDocumentation Selects a workspace example only from files in the admitted visible Storage catalog. */

export interface WorkspaceDatasetItem {
  name: string
  path: string
  type: 'folder' | 'file'
  children?: WorkspaceDatasetItem[]
}

/** Restore an explicit file or choose one available example; absent/hidden selections never become guessed URLs. */
export function selectWorkspaceDataset(
  tree: WorkspaceDatasetItem[], selectedFile?: string, openRandom = false, random = Math.random,
): WorkspaceDatasetItem | null {
  const files: WorkspaceDatasetItem[] = []
  /** Flatten admitted tree entries without inferring a filesystem path or reading any dataset body. */
  const visit = (items: WorkspaceDatasetItem[]) => {
    for (const item of items) {
      if (item.type === 'file') files.push(item)
      else if (item.children) visit(item.children)
    }
  }
  visit(tree.filter(item => item.path !== 'unit_tests'))
  if (selectedFile) return files.find(item => item.path === selectedFile) ?? null
  if (!openRandom || files.length === 0) return null
  return files[Math.floor(random() * files.length)] ?? null
}
