/**
 * Adds ngrok's nonsecret warning bypass only for reads to the configured hosted API.
 * @packageDocumentation
 */

/**
 * Preserves request options and caller-owned headers; localhost and other origins are unchanged.
 * @param url - Fully resolved request URL.
 * @param apiUrl - Build-configured visitor API origin, or a relative localhost prefix.
 * @param init - Fetch options, including cancellation and cache policy.
 * @returns Original options unless a GET targets the configured HTTPS ngrok origin.
 */
export function ngrokRequestInit(url: string, apiUrl: string, init?: RequestInit): RequestInit | undefined {
  if ((init?.method ?? 'GET').toUpperCase() !== 'GET') return init
  let api: URL
  let target: URL
  try {
    api = new URL(apiUrl)
    target = new URL(url)
  } catch {
    return init
  }
  if (api.protocol !== 'https:' || api.port || api.username || api.password
    || api.pathname !== '/' || api.search || api.hash
    || !/^[a-z0-9-]+\.ngrok-free\.(?:dev|app)$/.test(api.hostname)
    || target.origin !== api.origin || target.username || target.password) return init
  const headers = new Headers(init?.headers)
  headers.set('ngrok-skip-browser-warning', '1')
  return { ...init, headers }
}
