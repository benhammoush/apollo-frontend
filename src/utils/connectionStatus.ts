/** The header describes browser-to-backend WebSocket connectivity, not market activity. */
export function connectionStatus(connected: boolean): 'CONNECTED' | 'OFFLINE' {
  return connected ? 'CONNECTED' : 'OFFLINE'
}

export const CONNECTION_TITLE = 'Browser-to-Apollo WebSocket connection; not MT5 or market-feed health'
