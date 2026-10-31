import type { OHLCVBar } from '../types'

/** Reject unavailable/malformed history before it can replace a chart's bar state. */
export async function readOhlcvResponse(response: Response): Promise<OHLCVBar[]> {
  if (!response.ok) throw new Error(`History request unavailable (HTTP ${response.status})`)
  const bars: unknown = await response.json()
  if (!Array.isArray(bars) || bars.some(bar => !bar ||
    ['time', 'open', 'high', 'low', 'close', 'volume'].some(key =>
      typeof bar[key] !== 'number' || !Number.isFinite(bar[key])))) {
    throw new Error('Invalid history response')
  }
  return bars
}
