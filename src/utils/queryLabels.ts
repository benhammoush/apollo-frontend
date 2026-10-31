function extractSymbol(path: string): string {
  const m = path.match(/\/([A-Z]{3}[A-Z0-9]{0,3})(?:\/|\?|$)/)
  return m ? m[1] : ''
}

function extractTf(url: string): string {
  try {
    const params = new URL(url, 'http://x').searchParams
    return params.get('tf') || ''
  } catch { return '' }
}

interface LabelRule {
  pattern: RegExp
  key: string
  groupLabel: string
  label: (match: RegExpMatchArray, url: string, method: string) => string
}

const RULES: LabelRule[] = [
{ pattern: /^\/agents\/([^/]+)\/([^/]+)\/series(\?.*)?$/, key: 'agent_series',        groupLabel: 'Agent series',          label: (m, u) => `${m[2]} ${m[1]} ${extractTf(u)}`.trim() },
{ pattern: /^\/agents\/([^/]+)\/folders\/(.+)$/,         key: 'agent_folders_path',  groupLabel: 'Agent folder',          label: (m) => `${m[1]} / ${decodeURIComponent(m[2])}` },
{ pattern: /^\/agents\/folders\/list$/,                   key: 'agent_folders_list',  groupLabel: 'Agent folders',         label: () => 'Agent folders' },
{ pattern: /^\/market\/([^?]+)/,                          key: 'market',              groupLabel: 'Market data',           label: (m, u) => {
    const sym = extractSymbol('/' + m[1])
    const tf = extractTf(u)
    return [sym, tf].filter(Boolean).join(' ') || m[1].split('/')[0]
  }},
{ pattern: /^\/data\/brokers$/,                           key: 'brokers',             groupLabel: 'Brokers',               label: () => 'Brokers' },
{ pattern: /^\/pairs$/,                                    key: 'pairs',               groupLabel: 'Pairs',                 label: () => 'Pairs' },
{ pattern: /^\/levels\/([^?]+)/,                          key: 'levels',              groupLabel: 'Levels',                label: (m) => `${m[1]} levels` },
{ pattern: /^\/storage\/tree$/,                            key: 'storage_tree',        groupLabel: 'Storage tree',          label: () => 'Storage tree' },
{ pattern: /^\/storage\/file(\?.*)?$/,                     key: 'storage_file',        groupLabel: 'Storage file',          label: (_, u) => `File ${new URL(u, 'http://x').searchParams.get('path') || '...'}` },
{ pattern: /^\/storage\/meta(\?.*)?$/,                     key: 'storage_meta',        groupLabel: 'Storage meta',          label: () => 'Storage meta' },
{ pattern: /^\/health$/,                                   key: 'health',              groupLabel: 'Health',                label: () => 'Health' }
]

export function pathToGroup(url: string, method: string): { key: string; label: string } {
  let path: string
  try {
    const u = new URL(url, window.location.origin)
    path = u.pathname + u.search
  } catch {
    path = url
  }

  const normalized = path.replace(/^\/api/, '')

  for (const rule of RULES) {
    const match = normalized.match(rule.pattern)
    if (match) return { key: rule.key, label: rule.groupLabel }
  }

  const segments = path.split('?')[0].split('/').filter(Boolean)
  if (segments.length === 0) return { key: `${method}_root`, label: `${method} /` }
  const last = segments[segments.length - 1]
  return { key: `${method}_${last.replace(/_/g, '_')}`, label: `${method} ${last.replace(/_/g, ' ')}` }
}

export function pathToLabel(url: string, method: string): string {
  let path: string
  try {
    const u = new URL(url, window.location.origin)
    path = u.pathname + u.search
  } catch {
    path = url
  }

  const normalized = path.replace(/^\/api/, '')

  for (const rule of RULES) {
    const match = normalized.match(rule.pattern)
    if (match) {
      const label = rule.label(match, url, method)
      if (label) return label
    }
  }

  const segments = path.split('?')[0].split('/').filter(Boolean)
  if (segments.length === 0) return `${method} /`
  const last = segments[segments.length - 1]
  return `${method} ${last.replace(/_/g, ' ')}`
}
