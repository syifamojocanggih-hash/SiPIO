import { useState, useEffect, useRef, useCallback } from 'react'
import { api, WS_URL } from '../services/api'

export function useIoTConnection({
  onTelemetryUpdate,
  onFeedEvent,
  onSchedulesUpdate,
  onThresholdsUpdate,
  onCameraUpdate
}) {
  const [isConnected, setIsConnected] = useState(false)
  const [backendOnline, setBackendOnline] = useState(false)
  const [mqttConnected, setMqttConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const isMountedRef = useRef(true)

  // 1. Initial healthcheck to detect FastAPI backend availability
  const checkHealth = useCallback(async () => {
    try {
      const health = await api.getHealth()
      if (isMountedRef.current) {
        setBackendOnline(true)
        setMqttConnected(Boolean(health.mqtt_connected))
      }
      return true
    } catch {
      if (isMountedRef.current) {
        setBackendOnline(false)
        setMqttConnected(false)
      }
      return false
    }
  }, [])

  // 2. Establish and manage WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!isMountedRef.current) return
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return
    }

    try {
      setIsReconnecting(true)
      const socket = new WebSocket(WS_URL)
      wsRef.current = socket

      socket.onopen = () => {
        if (!isMountedRef.current) return
        setIsConnected(true)
        setIsReconnecting(false)
        setBackendOnline(true)
        console.log('[SiPIO] WebSocket ke FastAPI berhasil tersambung:', WS_URL)
      }

      socket.onmessage = (event) => {
        if (!isMountedRef.current) return
        try {
          const msg = JSON.parse(event.data)
          
          if (msg.type === 'telemetry' && msg.data) {
            if (msg.mqtt_connected !== undefined) {
              setMqttConnected(msg.mqtt_connected)
            }
            if (onTelemetryUpdate) {
              onTelemetryUpdate(msg.data)
            }
          } else if (msg.type === 'feed_event' && msg.data) {
            if (onFeedEvent) {
              onFeedEvent(msg.data)
            }
          } else if (msg.type === 'schedules_updated' && msg.data) {
            if (onSchedulesUpdate) {
              onSchedulesUpdate(msg.data)
            }
          } else if (msg.type === 'thresholds_updated' && msg.data) {
            if (onThresholdsUpdate) {
              onThresholdsUpdate(msg.data)
            }
          } else if (msg.type === 'camera_updated' && msg.data) {
            if (onCameraUpdate) {
              onCameraUpdate(msg.data)
            }
          }
        } catch (err) {
          console.warn('[SiPIO] Gagal memparsing pesan WS:', err)
        }
      }

      socket.onerror = () => {
        // Suppress noisy console error when backend is simply offline in simulation mode
      }

      socket.onclose = () => {
        if (!isMountedRef.current) return
        setIsConnected(false)
        wsRef.current = null
        
        // Auto-reconnect after 4 seconds
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connectWebSocket()
          }
        }, 4000)
      }
    } catch {
      setIsConnected(false)
    }
  }, [onTelemetryUpdate, onFeedEvent, onSchedulesUpdate, onThresholdsUpdate])

  useEffect(() => {
    isMountedRef.current = true
    checkHealth().then(() => {
      connectWebSocket()
    })

    const healthInterval = setInterval(checkHealth, 10000)

    return () => {
      isMountedRef.current = false
      clearInterval(healthInterval)
      clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [checkHealth, connectWebSocket])

  // Trigger Feed Action (via REST or WebSocket)
  const triggerRemoteFeed = async (duration_ms = 2000, source = 'Manual (Dashboard)') => {
    if (backendOnline) {
      return await api.triggerFeed(duration_ms, source)
    } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'feed',
        duration_ms
      }))
      return { success: true, message: 'Dikirim via WebSocket' }
    } else {
      // Local simulated response fallback
      return {
        success: true,
        local: true,
        message: 'Mode simulasi offline lokal'
      }
    }
  }

  return {
    isConnected,
    backendOnline,
    mqttConnected,
    isReconnecting,
    triggerRemoteFeed,
    reconnect: connectWebSocket
  }
}
