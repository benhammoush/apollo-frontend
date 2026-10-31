import { useEffect, useRef, useCallback, useState } from 'react'
import { WsMessage } from '../types'

const WS_URL =
  import.meta.env.VITE_WS_URL.startsWith("ws")
    ? import.meta.env.VITE_WS_URL
    : `${window.location.protocol === "https:" ? "wss://" : "ws://"}${window.location.host}${import.meta.env.VITE_WS_URL}`;

const WS_FALLBACK_URL =
  window.location.protocol === "http:" && import.meta.env.VITE_WS_FALLBACK_PORT
    ? `ws://${window.location.hostname}:${import.meta.env.VITE_WS_FALLBACK_PORT}/ws`
    : null
const WS_URLS = WS_FALLBACK_URL ? [WS_URL, WS_FALLBACK_URL] : [WS_URL]

const RECONNECT_DELAY = 3000

export function useWebSocket(onMessage: (msg: WsMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()
  // Always points to the latest onMessage without being a connect dep
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback((urlIndex = 0) => {
    try {
      const ws = new WebSocket(WS_URLS[urlIndex])
      wsRef.current = ws
      let ping: ReturnType<typeof setInterval> | null = null

      ws.onopen = () => {
        setConnected(true)
        // Keep-alive ping every 25s
        ping = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping')
        }, 25_000)
      }

      // onclose is assigned here (outside onopen) so a reconnect is always
      // scheduled even if the connection fails before onopen fires.
      ws.onclose = () => {
        if (ping) { clearInterval(ping); ping = null }
        setConnected(false)
        reconnectTimer.current = setTimeout(
          () => connect((urlIndex + 1) % WS_URLS.length),
          RECONNECT_DELAY,
        )
      }

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as WsMessage
          onMessageRef.current(msg)
        } catch { }
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      reconnectTimer.current = setTimeout(
        () => connect((urlIndex + 1) % WS_URLS.length),
        RECONNECT_DELAY,
      )
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const subscribe = useCallback((symbols: string[]) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', symbols }))
    }
  }, [])

  const unsubscribe = useCallback((symbols: string[]) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'unsubscribe', symbols }))
    }
  }, [])

  return { connected, subscribe, unsubscribe }
}
