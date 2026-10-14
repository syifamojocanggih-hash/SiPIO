/**
 * SiPIO IoT Simulation & Mock Data Module
 * PRD SiPio v1.3 Standard
 */

export const INITIAL_TELEMETRY = {
  temp: 28.4,
  level_ok: true,
  rssi: -61,
  esp_online: true,
  cam_online: true,
  timestamp: Date.now()
}

export const INITIAL_THRESHOLDS = {
  temp_min: 24,
  temp_max: 32,
  min_gap_min: 30,
  default_duration_ms: 2000,
  offline_after_s: 60,
  camera_interval_s: 300
}

export const INITIAL_SCHEDULES = [
  { 
    id: 1, 
    time: '07:00', 
    duration_ms: 2000, 
    days: 'Setiap Hari', 
    enabled: true, 
    synced: true,
    note: 'Pemberian pakan pagi hari saat nafsu makan ikan tinggi'
  },
  { 
    id: 2, 
    time: '12:30', 
    duration_ms: 1500, 
    days: 'Setiap Hari', 
    enabled: true, 
    synced: true,
    note: 'Pemberian pakan siang hari porsi sedang'
  },
  { 
    id: 3, 
    time: '17:00', 
    duration_ms: 2000, 
    days: 'Setiap Hari', 
    enabled: true, 
    synced: true,
    note: 'Pemberian pakan sore hari sebelum matahari terbenam'
  }
]

export const INITIAL_FEED_LOGS = [
  {
    id: 101,
    timestamp: '14 Okt 2026 07:00:03',
    source: 'Jadwal Otomatis',
    duration_ms: 2000,
    result: 'done',
    reason: 'Selesai tepat waktu (deviasi < 1.2 detik)'
  },
  {
    id: 102,
    timestamp: '14 Okt 2026 12:30:04',
    source: 'Jadwal Otomatis',
    duration_ms: 1500,
    result: 'done',
    reason: 'Selesai tepat waktu (deviasi < 0.8 detik)'
  },
  {
    id: 103,
    timestamp: '14 Okt 2026 14:15:20',
    source: 'Manual (Dashboard)',
    duration_ms: 2000,
    result: 'done',
    reason: 'Diberikan manual via tombol feeder'
  },
  {
    id: 104,
    timestamp: '14 Okt 2026 14:35:10',
    source: 'Manual (Dashboard)',
    duration_ms: 1000,
    result: 'skipped',
    reason: 'Jeda belum cukup (< 30 menit dari pakan sebelumnya)'
  }
]

export const INITIAL_TEMP_HISTORY = {
  '1h': [
    { time: '19:10', temp: 28.3 },
    { time: '19:20', temp: 28.4 },
    { time: '19:30', temp: 28.5 },
    { time: '19:40', temp: 28.4 },
    { time: '19:50', temp: 28.3 },
    { time: '20:00', temp: 28.4 }
  ],
  '24h': [
    { time: '00:00', temp: 26.2 },
    { time: '03:00', temp: 25.8 },
    { time: '06:00', temp: 26.5 },
    { time: '09:00', temp: 27.9 },
    { time: '12:00', temp: 30.4 },
    { time: '15:00', temp: 29.8 },
    { time: '18:00', temp: 28.7 },
    { time: '21:00', temp: 28.1 }
  ],
  '7d': [
    { time: 'Kamis', temp: 27.8 },
    { time: 'Jumat', temp: 28.2 },
    { time: 'Sabtu', temp: 28.9 },
    { time: 'Minggu', temp: 29.4 },
    { time: 'Senin', temp: 28.6 },
    { time: 'Selasa', temp: 28.0 },
    { time: 'Rabu', temp: 28.4 }
  ]
}

export const CAMERA_PREVIEWS = {
  kolam: {
    title: 'Area Permukaan Kolam Ikan',
    src: '/camera/pond_latest.jpg',
    description: 'Memantau aktivitas ikan nila dan kebersihan air',
    resolution: 'VGA 640x480 (OV2640)'
  },
  hopper: {
    title: 'Wadah Pakan Pelet (Hopper)',
    src: '/camera/hopper_latest.jpg',
    description: 'Kapasitas tersisa ~65%, pelet kering bebas jamur',
    resolution: 'VGA 640x480 (OV2640)'
  }
}
