import React from 'react'
import {
  TrendingUp,
  Thermometer,
  CheckCircle2,
  Info,
  Droplets,
  Activity
} from 'lucide-react'
import { TempChart } from '../components/TempChart'

export function TempPage({ telemetry, thresholds, tempHistory }) {
  const currentTemp = telemetry.temp
  const isTempCold = currentTemp < thresholds.temp_min
  const isTempHot = currentTemp > thresholds.temp_max

  let tempStatusClass = 'success'
  let tempStatusLabel = 'Suhu Optimal'
  let tempDescription = 'Metabolisme dan nafsu makan ikan berada pada kondisi optimal.'

  if (isTempCold) {
    tempStatusClass = 'warning'
    tempStatusLabel = 'Suhu Terlalu Dingin'
    tempDescription = 'Pencernaan ikan melambat. Kurangi takaran pakan harian untuk mencegah sisa pakan membusuk.'
  } else if (isTempHot) {
    tempStatusClass = 'danger'
    tempStatusLabel = 'Suhu Terlalu Panas'
    tempDescription = 'Kadar oksigen terlarut (DO) menurun. Nyalakan aerasi tambahan dan tunda pakan.'
  }

  // Calculate stats from tempHistory '24h'
  const history24h = tempHistory?.['24h'] || []
  const temps = history24h.map((d) => d.temp)
  const avgTemp = temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : currentTemp.toFixed(1)
  const maxTemp = temps.length > 0 ? Math.max(...temps).toFixed(1) : currentTemp.toFixed(1)
  const minTemp = temps.length > 0 ? Math.min(...temps).toFixed(1) : currentTemp.toFixed(1)

  return (
    <div className="page-view animate-fade-in" id="page-temp">
      {/* 1. Page Header */}
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-title-row">
            <div className="page-icon-badge temp">
              <TrendingUp size={20} />
            </div>
            <h1 className="page-title">Tren & Analisis Suhu Air (DS18B20)</h1>
            <span className={`page-status-badge ${tempStatusClass}`}>
              <span className="pulse-indicator" />
              {tempStatusLabel}
            </span>
          </div>
          <p className="page-subtitle">
            Sensor waterproof Dallas DS18B20 memantau fluktuasi suhu air kolam sepanjang hari demi menjaga kesehatan ikan
          </p>
        </div>

        <div className="page-header-stats">
          <div className="header-stat-chip">
            <span className="stat-chip-label">Batas Aman</span>
            <span className="stat-chip-val font-mono">{thresholds.temp_min}°C - {thresholds.temp_max}°C</span>
          </div>
          <div className="header-stat-chip">
            <span className="stat-chip-label">Sensor Pin</span>
            <span className="stat-chip-val font-mono">ESP8266 GPIO12</span>
          </div>
        </div>
      </div>

      {/* 2. Temperature Highlight Cards */}
      <div className="temp-summary-grid">
        <div className="card temp-stat-card primary">
          <div className="temp-stat-header">
            <span className="temp-stat-label">Suhu Air Saat Ini</span>
            <Thermometer size={20} className="text-cyan" />
          </div>
          <div className="temp-stat-num-row">
            <span className="temp-stat-num">{currentTemp.toFixed(1)}</span>
            <span className="temp-stat-unit">°C</span>
          </div>
          <div className="temp-stat-badge-row">
            <span className={`status-tag ${tempStatusClass}`}>{tempStatusLabel}</span>
          </div>
        </div>

        <div className="card temp-stat-card">
          <div className="temp-stat-header">
            <span className="temp-stat-label">Rata-rata 24 Jam</span>
            <Activity size={18} className="text-dim" />
          </div>
          <div className="temp-stat-num-row">
            <span className="temp-stat-num">{avgTemp}</span>
            <span className="temp-stat-unit">°C</span>
          </div>
          <span className="temp-stat-sub">Stabil di rentang ideal</span>
        </div>

        <div className="card temp-stat-card">
          <div className="temp-stat-header">
            <span className="temp-stat-label">Suhu Minimum (24 Jam)</span>
            <span className="text-dim text-xs font-mono">Lowest</span>
          </div>
          <div className="temp-stat-num-row">
            <span className="temp-stat-num text-cyan">{minTemp}</span>
            <span className="temp-stat-unit">°C</span>
          </div>
          <span className="temp-stat-sub">Tercatat dini hari (04:00)</span>
        </div>

        <div className="card temp-stat-card">
          <div className="temp-stat-header">
            <span className="temp-stat-label">Suhu Maksimum (24 Jam)</span>
            <span className="text-dim text-xs font-mono">Highest</span>
          </div>
          <div className="temp-stat-num-row">
            <span className="temp-stat-num text-amber">{maxTemp}</span>
            <span className="temp-stat-unit">°C</span>
          </div>
          <span className="temp-stat-sub">Tercatat siang hari (13:30)</span>
        </div>
      </div>

      {/* 3. Main Chart */}
      <div className="temp-chart-wrapper">
        <TempChart thresholds={thresholds} historyData={tempHistory} />
      </div>

      {/* 4. Temperature & Fish Species Guidelines */}
      <div className="temp-guide-grid">
        <div className="card guide-card">
          <div className="guide-card-header">
            <Droplets size={18} className="text-cyan" />
            <h3 className="guide-title">Tabel Toleransi Suhu Ikan Air Tawar</h3>
          </div>
          <div className="species-table">
            <div className="species-row">
              <span className="species-name">Ikan Nila (Oreochromis niloticus):</span>
              <span className="species-range font-mono">25.0°C – 32.0°C (Ideal: 28°C)</span>
            </div>
            <div className="species-row">
              <span className="species-name">Ikan Lele (Clarias gariepinus):</span>
              <span className="species-range font-mono">26.0°C – 32.0°C (Ideal: 29°C)</span>
            </div>
            <div className="species-row">
              <span className="species-name">Ikan Patin (Pangasius sp.):</span>
              <span className="species-range font-mono">26.0°C – 31.0°C (Ideal: 28.5°C)</span>
            </div>
            <div className="species-row">
              <span className="species-name">Ikan Gurame (Osphronemus goramy):</span>
              <span className="species-range font-mono">25.0°C – 30.0°C (Ideal: 27.5°C)</span>
            </div>
          </div>
        </div>

        <div className="card guide-card">
          <div className="guide-card-header">
            <Info size={18} className="text-cyan" />
            <h3 className="guide-title">Dampak Suhu Terhadap Pemberian Pakan</h3>
          </div>
          <p className="guide-desc" style={{ marginBottom: '12px' }}>
            {tempDescription}
          </p>
          <ul className="guide-list">
            <li>
              <CheckCircle2 size={16} className="text-emerald guide-icon" />
              <div>
                <strong>Suhu &lt; {thresholds.temp_min}°C:</strong> Sistem SiPIO memberi peringatan penurunan metabolisme.
              </div>
            </li>
            <li>
              <CheckCircle2 size={16} className="text-emerald guide-icon" />
              <div>
                <strong>Suhu &gt; {thresholds.temp_max}°C:</strong> Nafsu makan ikan drop drastis, disarankan membatalkan pakan otomatis.
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
