/** Full-column table snapshots are explicit, revision-pinned and never fetched whole. */
export interface TableManifest {
  schema_version: 'apollo-table-v2'
  revision: string
  total: number
  fields: string[]
  page_size: number
  paginated: true
}

/** Legacy metadata retains its existing viewer path; malformed v2 metadata fails closed. */
export function tableManifest(value: unknown): TableManifest | null {
  const meta = value as Partial<TableManifest> | null
  if (meta?.schema_version !== 'apollo-table-v2') return null
  if (meta.paginated !== true || typeof meta.revision !== 'string' || !/^[0-9a-f]{64}$/.test(meta.revision)
    || !Number.isSafeInteger(meta.total) || meta.total! < 0 || meta.total! > 2_000_000
    || !Number.isSafeInteger(meta.page_size) || meta.page_size! < 1 || meta.page_size! > 200
    || !Array.isArray(meta.fields) || meta.fields.length < 1 || meta.fields.length > 4096
    || meta.page_size! * meta.fields.length > 20_000
    || meta.fields.some(field => typeof field !== 'string' || !field || ['__proto__', 'constructor', 'prototype'].includes(field))
    || new Set(meta.fields).size !== meta.fields.length) throw new Error('Invalid table metadata')
  return meta as TableManifest
}

/** Replace paging options instead of appending ambiguous duplicate query parameters. */
export function tablePageUrl(url: string, manifest: TableManifest, offset: number): string {
  const parsed = new URL(url, 'http://dataset.invalid')
  parsed.searchParams.set('format', 'json')
  parsed.searchParams.set('offset', String(offset))
  parsed.searchParams.set('limit', String(manifest.page_size))
  parsed.searchParams.set('revision', manifest.revision)
  return /^https?:\/\//.test(url) ? parsed.href : parsed.pathname + parsed.search
}

/** Validate the entire page before replacing viewer data or advancing coverage. */
export function validateTablePage(value: unknown, manifest: TableManifest, offset: number): void {
  const page = value as Record<string, any> | null
  if (!page || page.__type !== 'columnar_list' || page.paginated !== true
    || page.revision !== manifest.revision || page.total !== manifest.total || page.offset !== offset
    || page.limit !== manifest.page_size || !Array.isArray(page.columns)
    || page.columns.length !== manifest.fields.length || page.columns.some((field: unknown, i: number) => field !== manifest.fields[i])
    || !Array.isArray(page.rows) || page.rows.length > manifest.page_size || offset + page.rows.length > manifest.total
    || (!page.rows.length && offset < manifest.total)
    || page.rows.some((row: unknown) => !Array.isArray(row) || row.length !== manifest.fields.length
      || row.some(cell => cell !== null && !['string', 'number', 'boolean'].includes(typeof cell)
        || typeof cell === 'number' && !Number.isFinite(cell)))
    || page.next_offset !== (offset + page.rows.length < manifest.total ? offset + page.rows.length : null)) {
    throw new Error('Invalid or changed table page; reload the dataset')
  }
}

export interface LoadedTable {
  rows: unknown[][]
  bytes: number
}

/** Bound retained browser data independently of each bounded network request. */
export function appendTablePage(loaded: LoadedTable, value: unknown, manifest: TableManifest): LoadedTable {
  validateTablePage(value, manifest, loaded.rows.length)
  const page = value as { rows: unknown[][] }
  const count = loaded.rows.length + page.rows.length
  // UTF-16 serialized size is accounting, not a claim of total heap usage.
  const bytes = loaded.bytes + JSON.stringify(page.rows).length * 2
  if (count > 25_000 || count * manifest.fields.length > 2_000_000 || bytes > 32_000_000) {
    throw new Error('Browser safety limit reached; only loaded rows are available')
  }
  return { rows: loaded.rows.concat(page.rows), bytes }
}
