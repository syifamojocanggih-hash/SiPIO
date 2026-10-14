import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

// Middlewares
app.use(cors())
app.use(express.json())

// In-Memory IoT State (Simulated & Hardware-Bridge Ready)
let telemetryState = {
  temp: 28.4,
  level_ok: true,
  rssi: -61,
  esp_online: true,
  cam_online: true,
  last_heartbeat: Date.now()
}

let thresholds = {
  temp_min: 24,
  temp_max: 32,
  min_gap_min: 30,
  default_duration_ms: 2000,
  offline_after_s: 60,
  camera_interval_s: 300
}

let schedules = [
  { id: 1, time: '07:00', duration_ms: 2000, days: 'Setiap Hari', enabled: true, synced: true },
  { id: 2, time: '17:00', duration_ms: 2000, days: 'Setiap Hari', enabled: true, synced: true }
]

let feedLogs = [
  {
    id: 101,
    timestamp: '14 Okt 2026 07:00:03',
    source: 'Jadwal Otomatis',
    duration_ms: 2000,
    result: 'done',
    reason: 'Selesai tepat waktu (deviasi < 30s)'
  },
  {
    id: 102,
    timestamp: '14 Okt 2026 12:15:10',
    source: 'Manual (Dashboard)',
    duration_ms: 2000,
    result: 'done',
    reason: 'Diberikan manual via tombol'
  }
]

// Simulate periodic sensor fluctuation (DS18B20 stream)
setInterval(() => {
  const delta = (Math.random() - 0.5) * 0.15
  telemetryState.temp = Math.round((telemetryState.temp + delta) * 10) / 10
  telemetryState.last_heartbeat = Date.now()
}, 4000)

// -------------------------------------------------------------
// REST API Endpoints
// -------------------------------------------------------------

// 1. Healthcheck & Hardware connectivity
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'SiPio IoT Backend Service',
    uptime: process.uptime(),
    devices: {
      feeder_esp8266: { online: telemetryState.esp_online, rssi: telemetryState.rssi },
      camera_esp32cam: { online: telemetryState.cam_online }
    }
  })
})

// 2. Telemetry sensor readings (DS18B20 & Float Switch)
app.get('/api/telemetry', (req, res) => {
  res.json({
    temp: telemetryState.temp,
    level_ok: telemetryState.level_ok,
    rssi: telemetryState.rssi,
    timestamp: telemetryState.last_heartbeat
  })
})

// 3. Manual Feeding Trigger (with safety rules)
app.post('/api/feed', (req, res) => {
  const { duration_ms = 2000, source = 'Manual (Dashboard)' } = req.body

  // Safety check 1: Float Switch (Water level low)
  if (!telemetryState.level_ok) {
    const errorEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString('id-ID'),
      source,
      duration_ms,
      result: 'skipped',
      reason: 'Gagal: Level air kolam terdeteksi rendah (Float Switch GPIO14)'
    }
    feedLogs.unshift(errorEntry)
    return res.status(400).json({
      success: false,
      message: 'Level air kolam terlalu rendah. Pakan dibatalkan untuk keselamatan peralatan dan ikan.',
      log: errorEntry
    })
  }

  // Safety check 2: Minimum time gap between feeding
  const lastLog = feedLogs.find((l) => l.result === 'done')
  if (lastLog) {
    // In production, compare timestamps
  }

  // Record successful feed
  const newEntry = {
    id: Date.now(),
    timestamp: new Date().toLocaleTimeString('id-ID'),
    source,
    duration_ms,
    result: 'done',
    reason: 'Selesai: Servo motor berputar sesuai durasi'
  }
  feedLogs.unshift(newEntry)

  res.json({
    success: true,
    message: `Perintah putar servo ${duration_ms}ms berhasil dikirim ke ESP8266`,
    log: newEntry
  })
})

// 4. Schedules Management
app.get('/api/schedules', (req, res) => {
  res.json(schedules)
})

app.post('/api/schedules', (req, res) => {
  const newSchedule = {
    id: Date.now(),
    time: req.body.time || '07:00',
    duration_ms: Number(req.body.duration_ms) || 2000,
    days: req.body.days || 'Setiap Hari',
    enabled: true,
    synced: true
  }
  schedules.push(newSchedule)
  res.status(201).json(newSchedule)
})

app.put('/api/schedules/:id', (req, res) => {
  const id = Number(req.params.id)
  schedules = schedules.map((s) => (s.id === id ? { ...s, ...req.body } : s))
  res.json({ success: true, schedules })
})

app.delete('/api/schedules/:id', (req, res) => {
  const id = Number(req.params.id)
  schedules = schedules.filter((s) => s.id !== id)
  res.json({ success: true, message: `Jadwal ${id} berhasil dihapus` })
})

// 5. Feeding Logs / Audit Trail
app.get('/api/logs', (req, res) => {
  res.json(feedLogs)
})

// 6. System Thresholds
app.get('/api/thresholds', (req, res) => {
  res.json(thresholds)
})

app.put('/api/thresholds', (req, res) => {
  thresholds = { ...thresholds, ...req.body }
  res.json({ success: true, thresholds })
})

// 7. Server-Sent Events (SSE) for Real-Time Telemetry Streaming
app.get('/api/telemetry/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const intervalId = setInterval(() => {
    const data = JSON.stringify({
      temp: telemetryState.temp,
      level_ok: telemetryState.level_ok,
      rssi: telemetryState.rssi,
      timestamp: Date.now()
    })
    res.write(`data: ${data}\n\n`)
  }, 3000)

  req.on('close', () => {
    clearInterval(intervalId)
  })
})

// Start Server
app.listen(PORT, () => {
  console.log(`===============================================`)
  console.log(` SiPIO Backend Server Berjalan!`)
  console.log(` URL: http://localhost:${PORT}`)
  console.log(` API Endpoint: http://localhost:${PORT}/api/health`)
  console.log(`===============================================`)
})
