import React, { useState, useEffect, useCallback } from 'react'
import { Navbar } from './components/Navbar'
import { AlertBanner } from './components/AlertBanner'
import { MetricsOverview } from './components/MetricsOverview'
import { FeedActionCard } from './components/FeedActionCard'
import { CameraMonitor } from './components/CameraMonitor'
import { TempChart } from './components/TempChart'
import { ScheduleManager } from './components/ScheduleManager'
import { FeedLogs } from './components/FeedLogs'
import { SettingsModal } from './components/SettingsModal'
import { MobileBottomNav } from './components/MobileBottomNav'
import { PWAInstallModal } from './components/PWAInstallModal'
import { MobileInstallBanner } from './components/MobileInstallBanner'
import { SimulationBar } from './components/SimulationBar'
import { usePWA } from './hooks/usePWA'
import { useIoTConnection } from './hooks/useIoTConnection'
import { api } from './services/api'
import {
  INITIAL_TELEMETRY,
  INITIAL_THRESHOLDS,
  INITIAL_SCHEDULES,
  INITIAL_FEED_LOGS,
  INITIAL_TEMP_HISTORY
} from './data/mockIoT'

const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
  jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11
}

export function parseFeedLogTimestamp(timestampStr) {
  if (!timestampStr) return null
  if (typeof timestampStr === 'number') {
    const d = new Date(timestampStr)
    return isNaN(d.getTime()) ? null : d
  }
  const str = String(timestampStr).trim()
  const parts = str.split(/\s+/)
  if (parts.length >= 4) {
    const day = parseInt(parts[0], 10)
    const mKey = parts[1].toLowerCase().slice(0, 3)
    const month = MONTH_MAP[mKey] ?? 0
    const year = parseInt(parts[2], 10)
    const timeParts = parts[3].replace('.', ':').split(':')
    const hours = parseInt(timeParts[0], 10) || 0
    const mins = parseInt(timeParts[1], 10) || 0
    const secs = parseInt(timeParts[2], 10) || 0
    const parsed = new Date(year, month, day, hours, mins, secs)
    if (!isNaN(parsed.getTime())) return parsed
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

export default function App() {
  // Theme state: 'light' by default for optimal outdoor sunlight readability (SiPIO White & Blue)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('sipio-theme') || 'light'
  })

  // PWA hook
  const pwaState = usePWA()

  // Hardware Statuses (PRD Section 10 & 11)
  const [espStatus, setEspStatus] = useState({
    online: true,
    rssi: -61
  })

  const [camStatus, setCamStatus] = useState({
    online: true
  })

  // Telemetry (PRD Section 11 & 13)
  const [telemetry, setTelemetry] = useState(INITIAL_TELEMETRY)

  // System Thresholds (PRD Section 13.1)
  const [thresholds, setThresholds] = useState(INITIAL_THRESHOLDS)

  // Schedules (PRD Section 13 & D-04) with localStorage caching
  const [schedules, setSchedules] = useState(() => {
    try {
      const saved = localStorage.getItem('sipio_schedules')
      return saved ? JSON.parse(saved) : INITIAL_SCHEDULES
    } catch {
      return INITIAL_SCHEDULES
    }
  })

  // Persist schedules to localStorage whenever they change
  useEffect(() => {
    try {
      if (Array.isArray(schedules) && schedules.length > 0) {
        localStorage.setItem('sipio_schedules', JSON.stringify(schedules))
      }
    } catch {}
  }, [schedules])

  // Feed Logs (PRD Section 13 & D-05) with localStorage caching
  const [feedLogs, setFeedLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('sipio_feed_logs')
      return saved ? JSON.parse(saved) : INITIAL_FEED_LOGS
    } catch {
      return INITIAL_FEED_LOGS
    }
  })

  // Persist feedLogs to localStorage whenever they change
  useEffect(() => {
    try {
      if (Array.isArray(feedLogs) && feedLogs.length > 0) {
        localStorage.setItem('sipio_feed_logs', JSON.stringify(feedLogs))
      }
    } catch {}
  }, [feedLogs])

  // Temperature Historical Dataset (D-02)
  const [tempHistory, setTempHistory] = useState(INITIAL_TEMP_HISTORY)

  // Real-time camera snapshot updates from ESP32-CAM
  const [cameraUpdate, setCameraUpdate] = useState(null)

  // Real-time FastAPI WebSocket & MQTT Bridge Connection
  const handleTelemetryUpdate = useCallback((newTelem) => {
    setTelemetry((prev) => ({
      ...prev,
      ...newTelem
    }))
    if (newTelem.esp_online !== undefined) {
      setEspStatus((prev) => ({ ...prev, online: newTelem.esp_online, rssi: newTelem.rssi ?? prev.rssi }))
    }
    if (newTelem.cam_online !== undefined) {
      setCamStatus({ online: newTelem.cam_online })
    }
  }, [])

  // Persistent tracking of last feed epoch timestamp for 30-minute safety cooldown
  const [lastFeedTimestamp, setLastFeedTimestamp] = useState(() => {
    try {
      const saved = localStorage.getItem('sipio_last_feed_time')
      return saved ? parseInt(saved, 10) : 0
    } catch {
      return 0
    }
  })

  const handleResetCooldown = useCallback(() => {
    setLastFeedTimestamp(0)
    try {
      localStorage.removeItem('sipio_last_feed_time')
    } catch {}
    api.resetFeedCooldown().catch(() => {})
    pwaState.triggerHaptic(40)
  }, [pwaState])

  const handleFeedEvent = useCallback((feedEntry) => {
    setFeedLogs((prev) => {
      if (prev.some((p) => p.id === feedEntry.id)) return prev
      return [feedEntry, ...prev]
    })
    if (feedEntry.result === 'done') {
      const now = Date.now()
      setLastFeedTimestamp(now)
      try {
        localStorage.setItem('sipio_last_feed_time', now.toString())
      } catch {}
    }
  }, [])

  const handleSchedulesUpdate = useCallback((newSchedules) => {
    if (Array.isArray(newSchedules)) {
      setSchedules(newSchedules)
      try {
        localStorage.setItem('sipio_schedules', JSON.stringify(newSchedules))
      } catch {}
    }
  }, [])

  const handleThresholdsUpdate = useCallback((newThresholds) => {
    setThresholds(newThresholds)
  }, [])

  const handleCameraUpdate = useCallback((camData) => {
    setCameraUpdate(camData)
    setCamStatus({ online: true })
  }, [])

  const iotConnection = useIoTConnection({
    onTelemetryUpdate: handleTelemetryUpdate,
    onFeedEvent: handleFeedEvent,
    onSchedulesUpdate: handleSchedulesUpdate,
    onThresholdsUpdate: handleThresholdsUpdate,
    onCameraUpdate: handleCameraUpdate
  })

  // Persistent Schedule Handlers (MySQL REST API + MQTT LittleFS Sync + Local Storage)
  const handleAddSchedule = useCallback(async (scheduleData) => {
    try {
      let created = null
      if (iotConnection.backendOnline) {
        created = await api.createSchedule({
          time: scheduleData.time,
          duration_ms: Number(scheduleData.duration_ms) || 2000,
          days: scheduleData.days || 'Setiap Hari'
        })
      }
      if (!created || !created.id) {
        created = {
          id: Date.now(),
          ...scheduleData,
          synced: false
        }
      }
      setSchedules((prev) => {
        if (prev.some((s) => s.id === created.id)) return prev
        const updated = [...prev, created]
        try { localStorage.setItem('sipio_schedules', JSON.stringify(updated)) } catch {}
        return updated
      })
      pwaState.triggerHaptic(40)
      return created
    } catch (err) {
      console.warn('Backend create schedule error, fallback to local storage:', err)
      const localItem = {
        id: Date.now(),
        ...scheduleData,
        synced: false
      }
      setSchedules((prev) => {
        const updated = [...prev, localItem]
        try { localStorage.setItem('sipio_schedules', JSON.stringify(updated)) } catch {}
        return updated
      })
      pwaState.triggerHaptic(40)
      return localItem
    }
  }, [iotConnection.backendOnline, pwaState])

  const handleEditSchedule = useCallback(async (id, scheduleData) => {
    setSchedules((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...scheduleData } : s))
      try { localStorage.setItem('sipio_schedules', JSON.stringify(updated)) } catch {}
      return updated
    })
    pwaState.triggerHaptic(40)

    try {
      if (iotConnection.backendOnline) {
        await api.updateSchedule(id, scheduleData)
      }
    } catch (err) {
      console.warn('Backend update schedule error:', err)
    }
  }, [iotConnection.backendOnline, pwaState])

  const handleToggleSchedule = useCallback(async (id, newEnabled) => {
    setSchedules((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, enabled: newEnabled } : s))
      try { localStorage.setItem('sipio_schedules', JSON.stringify(updated)) } catch {}
      return updated
    })
    pwaState.triggerHaptic(30)

    try {
      if (iotConnection.backendOnline) {
        await api.updateSchedule(id, { enabled: newEnabled })
      }
    } catch (err) {
      console.warn('Backend toggle schedule error:', err)
    }
  }, [iotConnection.backendOnline, pwaState])

  const handleDeleteSchedule = useCallback(async (id) => {
    setSchedules((prev) => {
      const updated = prev.filter((s) => s.id !== id)
      try { localStorage.setItem('sipio_schedules', JSON.stringify(updated)) } catch {}
      return updated
    })
    pwaState.triggerHaptic(50)

    try {
      if (iotConnection.backendOnline) {
        await api.deleteSchedule(id)
      }
    } catch (err) {
      console.warn('Backend delete schedule error:', err)
    }
  }, [iotConnection.backendOnline, pwaState])

  // Sinkronisasi data awal dari database MySQL / FastAPI backend saat terhubung
  useEffect(() => {
    if (!iotConnection.backendOnline) return

    // 1. Ambil riwayat tren suhu air dari database
    api.getTelemetryHistory().then((hist) => {
      if (hist && (hist['1h'] || hist['24h'] || hist['7d'])) {
        setTempHistory(hist)
      }
    }).catch(() => {})

    // 2. Ambil jadwal pakan aktif
    api.getSchedules().then((scheds) => {
      if (Array.isArray(scheds) && scheds.length > 0) {
        setSchedules(scheds)
        try {
          localStorage.setItem('sipio_schedules', JSON.stringify(scheds))
        } catch {}
      }
    }).catch(() => {})

    // 3. Ambil log riwayat pakan
    api.getLogs().then((logs) => {
      if (Array.isArray(logs) && logs.length > 0) {
        setFeedLogs(logs)
        const lastSuccess = logs.find((l) => l.result === 'done')
        if (lastSuccess) {
          const parsed = parseFeedLogTimestamp(lastSuccess.timestamp)
          if (parsed) {
            setLastFeedTimestamp((prev) => (prev > 0 ? prev : parsed.getTime()))
          }
        }
      }
    }).catch(() => {})

    // 4. Ambil ambang batas sistem
    api.getThresholds().then((th) => {
      if (th && th.temp_min !== undefined) {
        setThresholds(th)
      }
    }).catch(() => {})
  }, [iotConnection.backendOnline])

  // Last feed info: dihitung secara presisi dari entri log pakan terbaru (feedLogs)
  const lastFeed = (() => {
    if (!Array.isArray(feedLogs) || feedLogs.length === 0) return null

    // Ambil riwayat pakan terbaru (utamakan yang berhasil jika ada agar status pakan valid)
    const targetLog = feedLogs.find((l) => l.result === 'done') || feedLogs[0]
    const parsedDate = parseFeedLogTimestamp(targetLog.timestamp)

    let timeStr = '--:--'
    let relativeStr = 'Terkini'
    let epochMs = 0

    if (parsedDate) {
      epochMs = parsedDate.getTime()
      const hours = String(parsedDate.getHours()).padStart(2, '0')
      const mins = String(parsedDate.getMinutes()).padStart(2, '0')
      timeStr = `${hours}:${mins}`

      const now = new Date()
      const isToday =
        now.getFullYear() === parsedDate.getFullYear() &&
        now.getMonth() === parsedDate.getMonth() &&
        now.getDate() === parsedDate.getDate()

      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      const isYesterday =
        yesterday.getFullYear() === parsedDate.getFullYear() &&
        yesterday.getMonth() === parsedDate.getMonth() &&
        yesterday.getDate() === parsedDate.getDate()

      if (isToday) {
        relativeStr = 'Hari ini'
      } else if (isYesterday) {
        relativeStr = 'Kemarin'
      } else {
        const idMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
        relativeStr = `${parsedDate.getDate()} ${idMonths[parsedDate.getMonth()]}`
      }
    } else {
      const parts = String(targetLog.timestamp || '').trim().split(/\s+/)
      if (parts.length >= 4) {
        timeStr = parts[3].replace('.', ':').slice(0, 5)
        relativeStr = `${parts[0]} ${parts[1]}`
      } else if (parts.length === 1 && parts[0].includes(':')) {
        timeStr = parts[0].slice(0, 5)
        relativeStr = 'Hari ini'
      } else {
        timeStr = targetLog.timestamp || '--:--'
      }
    }

    return {
      time: timeStr,
      relative: relativeStr,
      source: targetLog.source || 'Manual (Dashboard)',
      duration_ms: targetLog.duration_ms || 2000,
      result: targetLog.result === 'done' ? 'Sukses' : targetLog.result === 'skipped' ? 'Ditunda' : 'Gagal',
      resultRaw: targetLog.result,
      timestamp: epochMs || Date.now(),
      fullTimestamp: targetLog.timestamp
    }
  })()

  // Active alerts list (D-07)
  const [dismissedAlertIds, setDismissedAlertIds] = useState([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem('sipio-theme', next)
      } catch {
        // ignore in case of private mode restriction
      }
      return next
    })
  }

  // Fallback subtle telemetry fluctuations when disconnected from WebSocket backend
  useEffect(() => {
    if (iotConnection.isConnected) return

    const timer = setInterval(() => {
      setTelemetry((prev) => {
        const delta = (Math.random() - 0.5) * 0.15
        const newTemp = Math.round((prev.temp + delta) * 10) / 10
        return {
          ...prev,
          temp: Math.min(35, Math.max(22, newTemp)),
          timestamp: Date.now()
        }
      })
    }, 5000)

    return () => clearInterval(timer)
  }, [iotConnection.isConnected])

  // Generate dynamic alerts based on conditions
  const activeAlerts = []
  
  if (!pwaState.isOnline && !dismissedAlertIds.includes('alert_pwa_offline')) {
    activeAlerts.push({
      id: 'alert_pwa_offline',
      type: 'warning',
      title: 'PWA Mode Offline Aktif',
      message: 'Koneksi internet terputus. Menampilkan data telemetri dan snapshot tersimpan dari cache Workbox.'
    })
  }

  if (!telemetry.level_ok && !dismissedAlertIds.includes('alert_level_low')) {
    activeAlerts.push({
      id: 'alert_level_low',
      type: 'danger',
      title: 'Level Air Kolam Rendah',
      message: 'Sensor float switch mendeteksi ketinggian air di bawah batas aman. Pemberian pakan otomatis ditunda.'
    })
  }

  if ((telemetry.temp < thresholds.temp_min || telemetry.temp > thresholds.temp_max) && !dismissedAlertIds.includes('alert_temp_abnormal')) {
    activeAlerts.push({
      id: 'alert_temp_abnormal',
      type: 'warning',
      title: 'Suhu Air Abnormal',
      message: `Suhu saat ini (${telemetry.temp}°C) berada di luar batas ideal (${thresholds.temp_min}°-${thresholds.temp_max}°C).`
    })
  }

  if (!espStatus.online && !dismissedAlertIds.includes('alert_esp_offline')) {
    activeAlerts.push({
      id: 'alert_esp_offline',
      type: 'danger',
      title: 'Feeder ESP8266 Tidak Terhubung',
      message: 'Perangkat tidak mengirim heartbeat telemetri melebihi batas waktu.'
    })
  }

  const handleDismissAlert = (id) => {
    setDismissedAlertIds((prev) => [...prev, id])
  }

  // Handler for feed trigger (dispatches to FastAPI REST endpoint or local fallback)
  const handleTriggerFeed = async (newFeedEvent) => {
    pwaState.triggerHaptic(40)

    // Catat waktu pakan terkini untuk memulai countdown 30 menit
    const now = Date.now()
    setLastFeedTimestamp(now)
    try {
      localStorage.setItem('sipio_last_feed_time', now.toString())
    } catch {}

    if (iotConnection.backendOnline) {
      try {
        const res = await iotConnection.triggerRemoteFeed(newFeedEvent.duration_ms, newFeedEvent.source)
        if (res.log) {
          setFeedLogs((prev) => {
            if (prev.some((p) => p.id === res.log.id)) return prev
            return [res.log, ...prev]
          })
        }
        return
      } catch (err) {
        console.warn('[SiPIO] Gagal mengirim pakan ke backend, beralih ke simulasi lokal:', err)
      }
    }

    // Local simulation fallback
    const nowObj = new Date()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const day = String(nowObj.getDate()).padStart(2, '0')
    const month = months[nowObj.getMonth()]
    const year = nowObj.getFullYear()
    const timeStr = nowObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

    const newEntry = {
      id: Date.now(),
      timestamp: `${day} ${month} ${year} ${timeStr}`,
      ...newFeedEvent
    }
    setFeedLogs((prev) => [newEntry, ...prev])
  }

  // Handler to reset all simulation data back to initial state
  const handleResetData = () => {
    setTelemetry(INITIAL_TELEMETRY)
    setEspStatus({ online: true, rssi: -61 })
    setCamStatus({ online: true })
    setThresholds(INITIAL_THRESHOLDS)
    setSchedules(INITIAL_SCHEDULES)
    try {
      localStorage.removeItem('sipio_schedules')
    } catch {}
    setFeedLogs(INITIAL_FEED_LOGS)
    try {
      localStorage.removeItem('sipio_feed_logs')
    } catch {}
    setTempHistory(INITIAL_TEMP_HISTORY)
    setDismissedAlertIds([])
    handleResetCooldown()
    pwaState.triggerHaptic(50)
  }

  return (
    <div className="app-container">
      {/* 1. Header & Top Bar with Connectivity and PWA Installer */}
      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        pwaState={pwaState}
        espStatus={espStatus}
        camStatus={camStatus}
        backendConnection={iotConnection}
      />

      {/* 1.2 Banner PWA Pemasangan ke Smartphone */}
      <MobileInstallBanner pwaState={pwaState} />

      {/* 1.5 Interactive Browser Simulation Bar for Testing IoT States */}
      <SimulationBar
        telemetry={telemetry}
        setTelemetry={setTelemetry}
        espStatus={espStatus}
        setEspStatus={setEspStatus}
        camStatus={camStatus}
        setCamStatus={setCamStatus}
        onTriggerFeed={handleTriggerFeed}
        onResetData={handleResetData}
        triggerHaptic={pwaState.triggerHaptic}
      />

      {/* 2. Alert Banner (D-07) */}
      <AlertBanner
        alerts={activeAlerts}
        onDismissAlert={handleDismissAlert}
      />

      {/* 3. Metrics Overview Cards (D-01) */}
      <MetricsOverview
        telemetry={telemetry}
        thresholds={thresholds}
        lastFeed={lastFeed}
      />

      {/* 4. Main Interactive Grid */}
      <div className="dashboard-grid">
        {/* Left Column: Feeder Action, Schedule Manager, & Feeding Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Feeder Action (D-03) */}
          <FeedActionCard
            telemetry={telemetry}
            thresholds={thresholds}
            lastFeed={lastFeed}
            lastFeedTimestamp={lastFeedTimestamp}
            onTriggerFeed={handleTriggerFeed}
            onResetCooldown={handleResetCooldown}
            triggerHaptic={pwaState.triggerHaptic}
          />

          {/* Schedule Manager (D-04) */}
          <ScheduleManager
            schedules={schedules}
            onAddSchedule={handleAddSchedule}
            onEditSchedule={handleEditSchedule}
            onToggleSchedule={handleToggleSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onUpdateSchedules={setSchedules}
            triggerHaptic={pwaState.triggerHaptic}
          />

          {/* Feeding Audit Trail / Logs (D-05, D-09) */}
          <FeedLogs logs={feedLogs} />
        </div>

        {/* Right Column: Camera Monitor (D-10) & Temperature Analytics (D-02) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Camera Monitor Panel (ESP32-CAM) */}
          <CameraMonitor camStatus={camStatus} cameraUpdate={cameraUpdate} />

          {/* Temperature Trend Analytics (DS18B20) */}
          <TempChart historyData={tempHistory} thresholds={thresholds} />
        </div>
      </div>

      {/* 5. Settings Modal (D-06) */}
      {isSettingsOpen && (
        <SettingsModal
          thresholds={thresholds}
          onSave={setThresholds}
          onClose={() => setIsSettingsOpen(false)}
          triggerHaptic={pwaState.triggerHaptic}
        />
      )}

      {/* 6. PWA Guided Install Modal for iOS & Android */}
      {pwaState.isInstallModalOpen && (
        <PWAInstallModal
          pwaState={pwaState}
          onClose={() => pwaState.setIsInstallModalOpen(false)}
        />
      )}

      {/* 7. Mobile App PWA Bottom Navigation Bar */}
      <MobileBottomNav
        onOpenSettings={() => setIsSettingsOpen(true)}
        triggerHaptic={pwaState.triggerHaptic}
      />
    </div>
  )
}
