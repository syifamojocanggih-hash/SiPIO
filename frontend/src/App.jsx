import React, { useState, useEffect } from 'react'
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
import { SimulationBar } from './components/SimulationBar'
import { usePWA } from './hooks/usePWA'
import {
  INITIAL_TELEMETRY,
  INITIAL_THRESHOLDS,
  INITIAL_SCHEDULES,
  INITIAL_FEED_LOGS,
  INITIAL_TEMP_HISTORY
} from './data/mockIoT'

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

  // Schedules (PRD Section 13 & D-04)
  const [schedules, setSchedules] = useState(INITIAL_SCHEDULES)

  // Feed Logs (PRD Section 13 & D-05)
  const [feedLogs, setFeedLogs] = useState(INITIAL_FEED_LOGS)

  // Temperature Historical Dataset (D-02)
  const [tempHistory, setTempHistory] = useState(INITIAL_TEMP_HISTORY)

  // Last feed info
  const lastFeed = feedLogs.length > 0 ? {
    time: feedLogs[0].timestamp.split(' ')[2] || feedLogs[0].timestamp || '07:00',
    relative: 'Terkini',
    source: feedLogs[0].source,
    duration_ms: feedLogs[0].duration_ms,
    result: feedLogs[0].result === 'done' ? 'Sukses' : 'Ditunda',
    timestamp: Date.now() - 3600000 // 1 hour ago
  } : null

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

  // Simulate subtle real-time telemetry fluctuations (like live DS18B20 stream)
  useEffect(() => {
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
  }, [])

  // Generate dynamic alerts based on conditions
  const activeAlerts = []
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

  // Handler for manual feed trigger
  const handleTriggerFeed = (newFeedEvent) => {
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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
    setFeedLogs(INITIAL_FEED_LOGS)
    setTempHistory(INITIAL_TEMP_HISTORY)
    setDismissedAlertIds([])
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
      />

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
            onTriggerFeed={handleTriggerFeed}
            triggerHaptic={pwaState.triggerHaptic}
          />

          {/* Schedule Manager (D-04) */}
          <ScheduleManager
            schedules={schedules}
            onUpdateSchedules={setSchedules}
            triggerHaptic={pwaState.triggerHaptic}
          />

          {/* Feeding Audit Trail / Logs (D-05, D-09) */}
          <FeedLogs logs={feedLogs} />
        </div>

        {/* Right Column: Camera Monitor (D-10) & Temperature Analytics (D-02) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Camera Monitor Panel (ESP32-CAM) */}
          <CameraMonitor camStatus={camStatus} />

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
