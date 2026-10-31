import { fetchWithMeta } from '../../../utils/fetchWithMeta'

export async function fetchAgentFolderData<T extends object>(
  agent: string,
  symbol: string,
  arrayKey: string,
  folderName: string,
  signal?: AbortSignal,
  broker?: string | null,
  start?: number,
  end?: number,
): Promise<T[] | null> {
  const params: string[] = []
  let path = `/agents/${agent}/folders/${encodeURIComponent(folderName)}/${symbol}/data`
  if (broker) params.push(`broker=${encodeURIComponent(broker)}`)
  if (start !== undefined) params.push(`start=${start}`)
  if (end !== undefined) params.push(`end=${end}`)
  if (params.length > 0) path += `?${params.join('&')}`

  const res = await fetchWithMeta(path, { signal }, { trigger: 'manual' })
  if (!res.ok) return null

  const data = await res.json() as Record<string, unknown>
  const rows = data[arrayKey]
  return Array.isArray(rows) ? rows as T[] : null
}
