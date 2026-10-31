/**
 * @file Validates public build endpoints without loading workspace environment files.
 */
/** Select relative local endpoints or an explicit matching hosted HTTPS/WSS pair. */
export function publicEndpoints(env = process.env) {
  const target = env.APOLLO_PUBLIC_TARGET ?? 'local'
  if (!['local', 'hosted'].includes(target) || (env.VERCEL === '1' && target !== 'hosted')) {
    throw new Error('An explicit hosted target is required on Vercel')
  }
  if (target === 'local') return { api: '/api', ws: '/ws', hosted: false }
  const api = env.VITE_API_URL
  const ws = env.VITE_WS_URL
  let url
  try {
    url = new URL(api)
  } catch {
    throw new Error('Hosted visitor HTTPS origin required')
  }
  if (
    url.protocol !== 'https:' ||
    api !== url.origin ||
    url.port ||
    url.username ||
    url.password ||
    !url.hostname.includes('.') ||
    url.hostname.endsWith('.') ||
    url.hostname.includes('*') ||
    url.hostname === 'localhost' ||
    url.hostname.endsWith('.localhost') ||
    /^[\d.]+$/.test(url.hostname) ||
    ws !== api.replace('https:', 'wss:') + '/ws' ||
    (env.VITE_WS_FALLBACK_PORT ?? '') !== ''
  ) {
    throw new Error(
      'Hosted endpoints must be a matching HTTPS origin and WSS /ws URL, without fallback',
    )
  }
  return { api, ws, hosted: true }
}
