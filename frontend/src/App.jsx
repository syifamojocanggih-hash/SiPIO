import React, { useState, useEffect, useCallback, useRef } from 'react'
import { DesktopSidebar } from './components/DesktopSidebar'
import { MobileBottomNav } from './components/MobileBottomNav'
import { PWAInstallModal } from './components/PWAInstallModal'
import { OverviewPage } from './pages/OverviewPage'
import { FeederPage } from './pages/FeederPage'
import { CameraPage } from './pages/CameraPage'
import { TempPage } from './pages/TempPage'
import { SettingsPage } from './pages/SettingsPage'
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

import { parseFeedLogTimestamp, sortSchedulesByTime, durationToGrams } from './utils/formatters'
import {
  playAlertSound,
  isBrowserNotificationSupported,
  requestBrowserNotificationPermission,
  sendBrowserNotification
} from './utils/notifications'

function readStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (Array.isArray(fallback)) {
      return Array.isArray(parsed) ? parsed : fallback
    }
    if (fallback && typeof fallback === 'object') {
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? { ...fallback, ...parsed }
        : fallback
    }
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export default function App() {
  // Theme state: 'light' by default for optimal outdoor sunlight readability (SiPIO White & Blue)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('sipio-theme') || 'light'
  })

  // Contrast state: 'normal' | 'high' (Optimasi keterbacaan di luar ruangan / outdoor sunlight)
  const [contrast, setContrast] = useState(() => {
    return localStorage.getItem('sipio-contrast') || 'normal'
  })

  // Navigation tab state (synced across desktop sidebar & mobile bottom bar)
  const [activeTab, setActiveTab] = useState('overview')

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

  // System Thresholds (PRD Section 13.1) with localStorage caching
  const [thresholds, setThresholds] = useState(() =>
    readStoredJson('sipio_thresholds', INITIAL_THRESHOLDS)
  )

  useEffect(() => {
    try {
      localStorage.setItem('sipio_thresholds', JSON.stringify(thresholds))
    } catch {}
  }, [thresholds])

  // Schedules (PRD Section 13 & D-04) with localStorage caching, sorted chronologically
  const [schedules, setSchedules] = useState(() =>
    sortSchedulesByTime(readStoredJson('sipio_schedules', INITIAL_SCHEDULES))
  )

  // Persist schedules to localStorage whenever they change
  useEffect(() => {
    try {
      if (Array.isArray(schedules) && schedules.length > 0) {
        localStorage.setItem('sipio_schedules', JSON.stringify(schedules))
      }
    } catch {}
  }, [schedules])

  // Feed Logs (PRD Section 13 & D-05) with localStorage caching
  const [feedLogs, setFeedLogs] = useState(() =>
    readStoredJson('sipio_feed_logs', INITIAL_FEED_LOGS)
  )

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

  // Mode Liburan Akuarium (Vacation Safe Mode)
  const [vacationMode, setVacationMode] = useState(() =>
    readStoredJson('sipio_vacation_mode', {
      enabled: false,
      days: 4,
      returnDate: '',
      hopperStockGrams: 120,
      ecoMode: true,
      waterCheckConfirmed: true
    })
  )

  // Persist status mode liburan ke localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sipio_vacation_mode', JSON.stringify(vacationMode))
    } catch {}
  }, [vacationMode])

  // Pelacak Stok Pelet Harian (Hopper Stock)
  const [hopperStock, setHopperStock] = useState(() =>
    readStoredJson('sipio_hopper_stock', {
      currentGrams: 120,
      capacityGrams: 200,
      lastRefillAt: null
    })
  )

  useEffect(() => {
    try {
      localStorage.setItem('sipio_hopper_stock', JSON.stringify(hopperStock))
    } catch {}
  }, [hopperStock])

  // Pelacak Ganti Air & Buku Catatan Perawatan Akuarium
  const [aquariumCare, setAquariumCare] = useState(() =>
    readStoredJson('sipio_aquarium_care', {
      intervalDays: 7,
      lastWaterChangeAt: null,
      notes: []
    })
  )

  useEffect(() => {
    try {
      localStorage.setItem('sipio_aquarium_care', JSON.stringify(aquariumCare))
    } catch {}
  }, [aquariumCare])

  // Riwayat Galeri Snapshot Kamera (Hanya diisi dari tangkapan nyata)
  const [snapshotHistory, setSnapshotHistory] = useState(() =>
    readStoredJson('sipio_snapshots', [])
  )

  useEffect(() => {
    try {
      localStorage.setItem('sipio_snapshots', JSON.stringify(snapshotHistory))
    } catch {}
  }, [snapshotHistory])

  // Preferensi Notifikasi Browser & Alarm Suara
  const [alertPrefs, setAlertPrefs] = useState(() =>
    readStoredJson('sipio_alert_prefs', { browserNotif: false, soundAlert: false })
  )

  useEffect(() => {
    try {
      localStorage.setItem('sipio_alert_prefs', JSON.stringify(alertPrefs))
    } catch {}
  }, [alertPrefs])

  const [notifPermission, setNotifPermission] = useState(() => {
    if (!isBrowserNotificationSupported()) return 'unsupported'
    return Notification.permission
  })

  const lastNotifiedRef = useRef({})

  // Real-time camera snapshot updates from camera stream/upload
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

  const processedFeedIdsRef = useRef(new Set())

  const consumeHopperGrams = useCallback((durationMs, feedId) => {
    if (feedId && processedFeedIdsRef.current.has(feedId)) return
    if (feedId) processedFeedIdsRef.current.add(feedId)
    const gramsUsed = durationToGrams(durationMs)
    setHopperStock((prev) => {
      const nextGrams = Math.max(0, (Number(prev.currentGrams) || 0) - gramsUsed)
      return { ...prev, currentGrams: nextGrams }
    })
  }, [])

  const handleCaptureSnapshot = useCallback((snap) => {
    setSnapshotHistory((prev) => {
      const entry = {
        id: snap.id || `${snap.area}-${snap.timestamp || Date.now()}`,
        area: snap.area || 'kolam',
        src: snap.src,
        label: snap.label || 'Snapshot',
        timestamp: snap.timestamp || Date.now()
      }
      return [entry, ...prev].slice(0, 8)
    })
  }, [])

  const handleRefillHopper = useCallback(() => {
    const nowTs = Date.now()
    setHopperStock((prev) => ({
      ...prev,
      currentGrams: prev.capacityGrams,
      lastRefillAt: nowTs
    }))
    setAquariumCare((prev) => ({
      ...prev,
      notes: [
        {
          id: nowTs,
          category: 'Isi Ulang Pakan',
          note: 'Wadah pakan hopper diisi penuh kembali',
          timestamp: nowTs
        },
        ...(prev.notes || [])
      ].slice(0, 20)
    }))
  }, [])

  const handleUpdateHopperCapacity = useCallback((newCapacity) => {
    const cap = Math.max(10, Number(newCapacity) || 200)
    setHopperStock((prev) => ({
      ...prev,
      capacityGrams: cap,
      currentGrams: Math.min(prev.currentGrams, cap)
    }))
  }, [])

  const handleMarkWaterChange = useCallback(() => {
    const nowTs = Date.now()
    setAquariumCare((prev) => ({
      ...prev,
      lastWaterChangeAt: nowTs,
      notes: [
        {
          id: nowTs,
          category: 'Ganti Air 30%',
          note: 'Penggantian air rutin akuarium selesai dilaksanakan',
          timestamp: nowTs
        },
        ...(prev.notes || [])
      ].slice(0, 20)
    }))
  }, [])

  const handleUpdateCareInterval = useCallback((days) => {
    setAquariumCare((prev) => ({
      ...prev,
      intervalDays: Number(days) || 7
    }))
  }, [])

  const handleAddCareNote = useCallback(({ category, note }) => {
    const nowTs = Date.now()
    setAquariumCare((prev) => ({
      ...prev,
      notes: [
        { id: nowTs, category, note, timestamp: nowTs },
        ...(prev.notes || [])
      ].slice(0, 20)
    }))
  }, [])

  const handleDeleteCareNote = useCallback((id) => {
    setAquariumCare((prev) => ({
      ...prev,
      notes: (prev.notes || []).filter((n) => n.id !== id)
    }))
  }, [])

  const handleToggleBrowserNotif = useCallback(async () => {
    pwaState.triggerHaptic(30)
    if (!alertPrefs.browserNotif) {
      const perm = await requestBrowserNotificationPermission()
      setNotifPermission(perm)
      if (perm === 'granted') {
        setAlertPrefs((prev) => ({ ...prev, browserNotif: true }))
        sendBrowserNotification('Notifikasi SiPIO Aktif', 'SiPIO akan mengingatkan bila suhu atau level air tidak aman.', 'sipio-perm')
      } else if (perm === 'denied') {
        alert('Izin notifikasi ditolak di browser. Silakan izinkan notifikasi untuk situs ini di setelan browser.')
      }
    } else {
      setAlertPrefs((prev) => ({ ...prev, browserNotif: false }))
    }
  }, [alertPrefs.browserNotif, pwaState])

  const handleToggleSoundAlert = useCallback(() => {
    pwaState.triggerHaptic(30)
    setAlertPrefs((prev) => {
      const nextVal = !prev.soundAlert
      if (nextVal) playAlertSound('test')
      return { ...prev, soundAlert: nextVal }
    })
  }, [pwaState])

  const handleTestAlertNotification = useCallback(async () => {
    pwaState.triggerHaptic(40)
    playAlertSound('test')
    let perm = notifPermission
    if (perm !== 'granted' && isBrowserNotificationSupported()) {
      perm = await requestBrowserNotificationPermission()
      setNotifPermission(perm)
    }
    if (perm === 'granted') {
      sendBrowserNotification(
        'Uji Peringatan Akuarium SiPIO',
        `Suhu saat ini ${telemetry.temp.toFixed(1)}°C, Level air: ${telemetry.level_ok ? 'Normal' : 'Rendah'}.`,
        'sipio-test'
      )
    }
  }, [notifPermission, pwaState, telemetry.level_ok, telemetry.temp])

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
      consumeHopperGrams(feedEntry.duration_ms, feedEntry.id)
    }
  }, [consumeHopperGrams])

  const handleSchedulesUpdate = useCallback((newSchedules) => {
    if (Array.isArray(newSchedules)) {
      const sorted = sortSchedulesByTime(newSchedules)
      setSchedules(sorted)
      try {
        localStorage.setItem('sipio_schedules', JSON.stringify(sorted))
      } catch {}
    }
  }, [])

  const handleThresholdsUpdate = useCallback((newThresholds) => {
    setThresholds(newThresholds)
  }, [])

  const handleCameraUpdate = useCallback((camData) => {
    setCameraUpdate(camData)
    setCamStatus({ online: true })
    if (camData?.area) {
      const ts = camData.timestamp || Date.now()
      const baseSrc = camData.area === 'hopper' ? '/camera/hopper_latest.jpg' : '/camera/pond_latest.jpg'
      handleCaptureSnapshot({
        area: camData.area,
        src: `${baseSrc}?t=${ts}`,
        label: 'Live Upload',
        timestamp: ts
      })
    }
  }, [handleCaptureSnapshot])

  const iotConnection = useIoTConnection({
    onTelemetryUpdate: handleTelemetryUpdate,
    onFeedEvent: handleFeedEvent,
    onSchedulesUpdate: handleSchedulesUpdate,
    onThresholdsUpdate: handleThresholdsUpdate,
    onCameraUpdate: handleCameraUpdate
  })

  const handleSaveThresholds = useCallback(async (newThresholds) => {
    setThresholds(newThresholds)
    try {
      localStorage.setItem('sipio_thresholds', JSON.stringify(newThresholds))
    } catch {}
    if (iotConnection?.backendOnline) {
      try {
        await api.updateThresholds(newThresholds)
      } catch (err) {
        console.warn('[SiPIO] Gagal sinkron ambang batas ke backend:', err)
      }
    }
  }, [iotConnection?.backendOnline])

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
        const updated = sortSchedulesByTime([...prev, created])
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
        const updated = sortSchedulesByTime([...prev, localItem])
        try { localStorage.setItem('sipio_schedules', JSON.stringify(updated)) } catch {}
        return updated
      })
      pwaState.triggerHaptic(40)
      return localItem
    }
  }, [iotConnection.backendOnline, pwaState])

  const handleEditSchedule = useCallback(async (id, scheduleData) => {
    setSchedules((prev) => {
      const updated = sortSchedulesByTime(prev.map((s) => (s.id === id ? { ...s, ...scheduleData } : s)))
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
        const sorted = sortSchedulesByTime(scheds)
        setSchedules(sorted)
        try {
          localStorage.setItem('sipio_schedules', JSON.stringify(sorted))
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

  // Apply contrast mode to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-contrast', contrast)
  }, [contrast])

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

  const toggleContrast = () => {
    setContrast((prev) => {
      const next = prev === 'high' ? 'normal' : 'high'
      try {
        localStorage.setItem('sipio-contrast', next)
      } catch {}
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
      title: 'Level Air Akuarium Rendah',
      message: 'Ketinggian air terdeteksi di bawah batas aman. Pemberian pakan otomatis ditunda.'
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
      title: 'Dispenser Pakan Tidak Terhubung',
      message: 'Perangkat tidak mengirim sinyal status melebihi batas waktu.'
    })
  }

  if (hopperStock.currentGrams <= Math.max(10, Math.round(hopperStock.capacityGrams * 0.15)) && !dismissedAlertIds.includes('alert_hopper_low')) {
    activeAlerts.push({
      id: 'alert_hopper_low',
      type: 'warning',
      title: 'Stok Pelet Wadah Hampir Habis',
      message: `Sisa pakan tinggal ~${hopperStock.currentGrams}g dari kapasitas ${hopperStock.capacityGrams}g. Segera isi ulang wadah feeder.`
    })
  }

  // Picu Notifikasi Browser & Alarm Suara (dengan cooldown 5 menit agar tidak mengganggu berulang-ulang)
  useEffect(() => {
    if (!alertPrefs.browserNotif && !alertPrefs.soundAlert) return
    const nowTs = Date.now()
    const notifyAlerts = activeAlerts.filter((a) => a.id !== 'alert_pwa_offline')
    if (notifyAlerts.length === 0) return

    const topAlert = notifyAlerts[0]
    const lastFired = lastNotifiedRef.current[topAlert.id] || 0
    if (nowTs - lastFired < 5 * 60 * 1000) return

    lastNotifiedRef.current[topAlert.id] = nowTs
    if (alertPrefs.soundAlert) {
      playAlertSound(topAlert.type === 'danger' ? 'danger' : 'warning')
    }
    if (alertPrefs.browserNotif) {
      sendBrowserNotification(`SiPIO: ${topAlert.title}`, topAlert.message, topAlert.id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telemetry.level_ok, telemetry.temp, espStatus.online, hopperStock.currentGrams, alertPrefs.browserNotif, alertPrefs.soundAlert])

  const handleDismissAlert = (id) => {
    setDismissedAlertIds((prev) => [...prev, id])
  }

  // Handler for feed trigger (dispatches to FastAPI REST endpoint or local fallback)
  const handleTriggerFeed = async (newFeedEvent) => {
    pwaState.triggerHaptic(40)

    // Modulasi Mode Liburan: kurangi porsi pakan 20% jika opsi porsi hemat aktif
    let finalFeedEvent = { ...newFeedEvent }
    if (vacationMode?.enabled && vacationMode?.ecoMode) {
      const originalDuration = Number(finalFeedEvent.duration_ms) || 2000
      const ecoDuration = Math.max(800, Math.round(originalDuration * 0.8))
      finalFeedEvent.duration_ms = ecoDuration
      if (!finalFeedEvent.source?.includes('Liburan')) {
        finalFeedEvent.source = `${finalFeedEvent.source} (Hemat -20%)`
      }
      finalFeedEvent.reason = 'Eksekusi porsi pakan hemat 20% selama masa liburan akuarium'
    }

    // Catat waktu pakan terkini untuk memulai countdown 30 menit
    const now = Date.now()
    setLastFeedTimestamp(now)
    try {
      localStorage.setItem('sipio_last_feed_time', now.toString())
    } catch {}

    if (iotConnection.backendOnline) {
      try {
        const res = await iotConnection.triggerRemoteFeed(finalFeedEvent.duration_ms, finalFeedEvent.source)
        if (res.log) {
          setFeedLogs((prev) => {
            if (prev.some((p) => p.id === res.log.id)) return prev
            return [res.log, ...prev]
          })
          if (res.log.result === 'done') {
            consumeHopperGrams(res.log.duration_ms, res.log.id)
          }
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
      ...finalFeedEvent
    }
    setFeedLogs((prev) => [newEntry, ...prev])
    if (newEntry.result === 'done') {
      consumeHopperGrams(newEntry.duration_ms, newEntry.id)
    }
  }

  // Handler to reset all simulation data back to initial state
  const handleResetData = () => {
    setTelemetry(INITIAL_TELEMETRY)
    setEspStatus({ online: true, rssi: -61 })
    setCamStatus({ online: true })
    setThresholds(INITIAL_THRESHOLDS)
    setSchedules(INITIAL_SCHEDULES)
    setFeedLogs(INITIAL_FEED_LOGS)
    setHopperStock({ currentGrams: 120, capacityGrams: 200, lastRefillAt: null })
    setAquariumCare({ intervalDays: 7, lastWaterChangeAt: null, notes: [] })
    setSnapshotHistory([])
    setVacationMode({
      enabled: false,
      days: 4,
      returnDate: '',
      hopperStockGrams: 120,
      ecoMode: true,
      waterCheckConfirmed: true
    })
    try {
      localStorage.removeItem('sipio_thresholds')
      localStorage.removeItem('sipio_schedules')
      localStorage.removeItem('sipio_feed_logs')
      localStorage.removeItem('sipio_hopper_stock')
      localStorage.removeItem('sipio_aquarium_care')
      localStorage.removeItem('sipio_snapshots')
      localStorage.removeItem('sipio_vacation_mode')
    } catch {}
    setTempHistory(INITIAL_TEMP_HISTORY)
    setDismissedAlertIds([])
    handleResetCooldown()
    pwaState.triggerHaptic(50)
  }

  return (
    <div className="app-layout">
      {/* Desktop Sidebar (visible on desktop >= 1024px) */}
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setActiveTab('settings')}
        theme={theme}
        toggleTheme={toggleTheme}
        contrast={contrast}
        toggleContrast={toggleContrast}
        pwaState={pwaState}
        triggerHaptic={pwaState.triggerHaptic}
      />

      {/* Main Content Area */}
      <main className="app-main-content">
        {/* Distinct Page Views */}
        {activeTab === 'overview' && (
          <OverviewPage
            telemetry={telemetry}
            thresholds={thresholds}
            lastFeed={lastFeed}
            lastFeedTimestamp={lastFeedTimestamp}
            activeAlerts={activeAlerts}
            onDismissAlert={handleDismissAlert}
            espStatus={espStatus}
            camStatus={camStatus}
            backendConnection={iotConnection}
            onNavigate={setActiveTab}
            onTriggerFeed={handleTriggerFeed}
            triggerHaptic={pwaState.triggerHaptic}
            vacationMode={vacationMode}
            tempHistory={tempHistory}
            cameraUpdate={cameraUpdate}
            hopperStock={hopperStock}
          />
        )}

        {activeTab === 'feeder' && (
          <FeederPage
            telemetry={telemetry}
            thresholds={thresholds}
            lastFeed={lastFeed}
            lastFeedTimestamp={lastFeedTimestamp}
            schedules={schedules}
            feedLogs={feedLogs}
            onTriggerFeed={handleTriggerFeed}
            onResetCooldown={handleResetCooldown}
            onAddSchedule={handleAddSchedule}
            onEditSchedule={handleEditSchedule}
            onToggleSchedule={handleToggleSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onUpdateSchedules={setSchedules}
            triggerHaptic={pwaState.triggerHaptic}
            vacationMode={vacationMode}
            onUpdateVacationMode={setVacationMode}
            hopperStock={hopperStock}
            onRefillHopper={handleRefillHopper}
            onUpdateHopperCapacity={handleUpdateHopperCapacity}
            aquariumCare={aquariumCare}
            onMarkWaterChange={handleMarkWaterChange}
            onUpdateCareInterval={handleUpdateCareInterval}
            onAddCareNote={handleAddCareNote}
            onDeleteCareNote={handleDeleteCareNote}
          />
        )}

        {activeTab === 'camera' && (
          <CameraPage
            camStatus={camStatus}
            cameraUpdate={cameraUpdate}
            telemetry={telemetry}
            thresholds={thresholds}
            lastFeedTimestamp={lastFeedTimestamp}
            onTriggerFeed={handleTriggerFeed}
            hopperStock={hopperStock}
            onRefillHopper={handleRefillHopper}
            snapshotHistory={snapshotHistory}
            onCaptureSnapshot={handleCaptureSnapshot}
            onAddCareNote={handleAddCareNote}
            triggerHaptic={pwaState.triggerHaptic}
          />
        )}

        {activeTab === 'temp' && (
          <TempPage
            telemetry={telemetry}
            thresholds={thresholds}
            tempHistory={tempHistory}
            onApplyThresholds={handleSaveThresholds}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsPage
            thresholds={thresholds}
            onSaveThresholds={handleSaveThresholds}
            theme={theme}
            toggleTheme={toggleTheme}
            contrast={contrast}
            toggleContrast={toggleContrast}
            espStatus={espStatus}
            camStatus={camStatus}
            backendConnection={iotConnection}
            onResetCooldown={handleResetCooldown}
            onResetData={handleResetData}
            triggerHaptic={pwaState.triggerHaptic}
            alertPrefs={alertPrefs}
            notifPermission={notifPermission}
            onToggleBrowserNotif={handleToggleBrowserNotif}
            onToggleSoundAlert={handleToggleSoundAlert}
            onTestAlertNotification={handleTestAlertNotification}
          />
        )}
      </main>

      {/* 5. Settings Modal (D-06) */}
      {isSettingsOpen && (
        <SettingsModal
          thresholds={thresholds}
          onSave={handleSaveThresholds}
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
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setActiveTab('settings')}
        triggerHaptic={pwaState.triggerHaptic}
      />
    </div>
  )
}
