// Centralized API Client for SiPIO FastAPI Backend

const isLocalEnv = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]'
)

const API_BASE = import.meta.env.VITE_API_URL || (
  isLocalEnv ? 'http://127.0.0.1:8000/api' : '/api'
)

export const WS_URL = import.meta.env.VITE_WS_URL || (
  isLocalEnv
    ? 'ws://127.0.0.1:8000/ws/telemetry'
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/telemetry`
)

/**
 * Helper to perform fetch with JSON handling and timeout
 */
async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 5000)

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    })

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}))
      throw new Error(errorBody.detail || errorBody.message || `HTTP ${res.status}: ${res.statusText}`)
    }

    return await res.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  // 1. Healthcheck & Hardware Status
  async getHealth() {
    return fetchJson('/health')
  },

  // 2. Telemetry (Sensor Suhu DS18B20 & Float Switch)
  async getTelemetry() {
    return fetchJson('/telemetry')
  },

  // 3. Trigger Feeding (Servo Motor)
  async triggerFeed(duration_ms = 2000, source = 'Manual (Dashboard)') {
    return fetchJson('/feed', {
      method: 'POST',
      body: JSON.stringify({ duration_ms, source })
    })
  },

  async resetFeedCooldown() {
    return fetchJson('/feed/reset-cooldown', {
      method: 'POST'
    })
  },

  // 4. Schedules CRUD
  async getSchedules() {
    return fetchJson('/schedules')
  },

  async createSchedule(scheduleData) {
    return fetchJson('/schedules', {
      method: 'POST',
      body: JSON.stringify(scheduleData)
    })
  },

  async updateSchedule(id, scheduleData) {
    return fetchJson(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(scheduleData)
    })
  },

  async deleteSchedule(id) {
    return fetchJson(`/schedules/${id}`, {
      method: 'DELETE'
    })
  },

  // 5. System Thresholds
  async getThresholds() {
    return fetchJson('/thresholds')
  },

  async updateThresholds(thresholdsData) {
    return fetchJson('/thresholds', {
      method: 'PUT',
      body: JSON.stringify(thresholdsData)
    })
  },

  // 6. Audit Trail Logs
  async getLogs() {
    return fetchJson('/logs')
  },

  // 7. Telemetry History (DS18B20 Temperature Curves for 1h, 24h, 7d)
  async getTelemetryHistory(range = 'all') {
    return fetchJson(`/telemetry/history?range=${encodeURIComponent(range)}`)
  },

  // 8. Camera Status & Upload (ESP32-CAM)
  async getCameraStatus() {
    return fetchJson('/camera/latest')
  },

  async uploadCameraPhoto(file, area = 'kolam') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('area', area)

    const url = `${API_BASE}/camera/upload`
    const res = await fetch(url, {
      method: 'POST',
      body: formData
    })

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}))
      throw new Error(errorBody.detail || `Upload failed: ${res.statusText}`)
    }

    return await res.json()
  },

  // 9. Device Status (PRD Section 12: GET /api/status)
  async getDeviceStatus() {
    return fetchJson('/status')
  },

  // 10. Safety Alerts & Interlocks (PRD Section 13: alert table)
  async getAlerts() {
    return fetchJson('/alerts')
  },

  async acknowledgeAlert(alertId) {
    return fetchJson(`/alerts/${alertId}/ack`, {
      method: 'PUT'
    })
  }
}
