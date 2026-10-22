import React from 'react'
import {
  LayoutDashboard,
  PlayCircle,
  Camera,
  TrendingUp,
  Settings,
  ArrowRight,
  Wifi,
  WifiOff
} from 'lucide-react'
import { MetricsOverview } from '../components/MetricsOverview'
import { AlertBanner } from '../components/AlertBanner'

export function OverviewPage({
  telemetry,
  thresholds,
  lastFeed,
  lastFeedTimestamp,
  activeAlerts,
  onDismissAlert,
  espStatus,
  camStatus,
  backendConnection,
  onNavigate,
  triggerHaptic
}) {
  const isTempOutOfRange = telemetry.temp < thresholds.temp_min || telemetry.temp > thresholds.temp_max

  // Quick cooldown calculation
  const minGapMinutes = thresholds.min_gap_min || 30
  const totalCooldownSeconds = minGapMinutes * 60
  const effectiveLastFeedTime = lastFeedTimestamp || (lastFeed?.timestamp || 0)
  const elapsedSeconds = effectiveLastFeedTime > 0 ? Math.floor((Date.now() - effectiveLastFeedTime) / 1000) : 999999
  const remainingCooldownSeconds = Math.max(0, totalCooldownSeconds - elapsedSeconds)
  const isCooldownActive = remainingCooldownSeconds > 0
  const remMinutes = Math.floor(remainingCooldownSeconds / 60)
  const remSeconds = remainingCooldownSeconds % 60
  const formattedCountdown = `${String(remMinutes).padStart(2, '0')}:${String(remSeconds).padStart(2, '0')}`

  return (
    <div className="page-view animate-fade-in" id="page-overview">
      {/* 1. Page Header */}
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-title-row">
            <div className="page-icon-badge">
              <LayoutDashboard size={20} />
            </div>
            <h1 className="page-title">Ringkasan Kolam & Monitoring</h1>
            <span className="page-status-badge">
              <span className="pulse-indicator" />
              Live Telemetri
            </span>
          </div>
          <p className="page-subtitle">
            Pemantauan terpusat kondisi kolam ikan, status dispenser pakan, citra kamera, dan telemetri suhu real-time
          </p>
        </div>
      </div>

      {/* 2. Alert Banner (jika ada peringatan ambang batas) */}
      <AlertBanner alerts={activeAlerts} onDismissAlert={onDismissAlert} />

      {/* 3. Metrik Utama Kartu (DS18B20, Float Switch, Terakhir Pakan) */}
      <MetricsOverview
        telemetry={telemetry}
        thresholds={thresholds}
        lastFeed={lastFeed}
      />

      {/* 4. Quick Navigation & Status Cards Grid */}
      <div className="overview-modules-grid">
        {/* Module 1: Pakan & Jadwal Quick Widget */}
        <div className="overview-module-card">
          <div className="overview-module-header">
            <div className="overview-module-title-box">
              <div className="module-icon feeder">
                <PlayCircle size={18} />
              </div>
              <div>
                <h3 className="overview-module-title">Pakan & Jadwal</h3>
                <span className="overview-module-caption">Dispenser Servo Kolam</span>
              </div>
            </div>
            <span className={`status-badge-compact ${isCooldownActive ? 'warning' : 'success'}`}>
              {isCooldownActive ? `Jeda ${formattedCountdown}` : 'Siap Beri Pakan'}
            </span>
          </div>

          <div className="overview-module-body">
            <div className="quick-info-row">
              <span className="quick-info-label">Status Cooldown:</span>
              <span className="quick-info-value font-mono">
                {isCooldownActive ? `${formattedCountdown} tersisa` : '00:00 (Aman)'}
              </span>
            </div>
            <div className="quick-info-row">
              <span className="quick-info-label">Pakan Terakhir:</span>
              <span className="quick-info-value">
                {lastFeed ? `${lastFeed.time} (${lastFeed.source})` : 'Belum ada data'}
              </span>
            </div>
            <div className="quick-info-row">
              <span className="quick-info-label">Suhu Ideal Pakan:</span>
              <span className={`quick-info-value ${isTempOutOfRange ? 'text-amber' : 'text-emerald'}`}>
                {isTempOutOfRange ? 'Di Luar Toleransi' : 'Optimal (Nafsu Makan Tinggi)'}
              </span>
            </div>
          </div>

          <div className="overview-module-footer">
            <button
              type="button"
              className="module-action-btn primary"
              onClick={() => {
                if (triggerHaptic) triggerHaptic(30)
                onNavigate('feeder')
              }}
            >
              <span>Kelola Pakan & Jadwal</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Module 2: Kamera Kolam Quick Widget */}
        <div className="overview-module-card">
          <div className="overview-module-header">
            <div className="overview-module-title-box">
              <div className="module-icon camera">
                <Camera size={18} />
              </div>
              <div>
                <h3 className="overview-module-title">Kamera Kolam</h3>
                <span className="overview-module-caption">ESP32-CAM Real-time Stream</span>
              </div>
            </div>
            <span className={`status-badge-compact ${camStatus.online ? 'success' : 'danger'}`}>
              {camStatus.online ? 'Kamera Aktif' : 'Offline'}
            </span>
          </div>

          <div className="overview-module-body">
            <div className="quick-camera-preview">
              <img
                src="/camera/pond_latest.jpg"
                alt="Cuplikan Kolam Terkini"
                className="quick-camera-thumb"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div className="quick-camera-overlay">
                <span className="quick-camera-tag">
                  <span className="pulse-indicator" />
                  Live Preview
                </span>
              </div>
            </div>
          </div>

          <div className="overview-module-footer">
            <button
              type="button"
              className="module-action-btn"
              onClick={() => {
                if (triggerHaptic) triggerHaptic(30)
                onNavigate('camera')
              }}
            >
              <span>Buka Kamera Penuh</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Module 3: Tren Suhu Air Quick Widget */}
        <div className="overview-module-card">
          <div className="overview-module-header">
            <div className="overview-module-title-box">
              <div className="module-icon temp">
                <TrendingUp size={18} />
              </div>
              <div>
                <h3 className="overview-module-title">Tren Suhu Air</h3>
                <span className="overview-module-caption">Sensor Waterproof DS18B20</span>
              </div>
            </div>
            <span className={`status-badge-compact ${isTempOutOfRange ? 'warning' : 'success'}`}>
              {isTempOutOfRange ? 'Peringatan' : 'Rentang Optimal'}
            </span>
          </div>

          <div className="overview-module-body">
            <div className="quick-temp-box">
              <div className="quick-temp-display">
                <span className="quick-temp-val">{telemetry.temp.toFixed(1)}</span>
                <span className="quick-temp-unit">°C</span>
              </div>
              <div className="quick-temp-meter">
                <div className="temp-meter-track">
                  <div
                    className="temp-meter-fill"
                    style={{
                      width: `${Math.min(100, Math.max(10, ((telemetry.temp - 15) / 25) * 100))}%`,
                      backgroundColor: isTempOutOfRange ? 'var(--status-amber)' : 'var(--status-emerald)'
                    }}
                  />
                </div>
                <div className="temp-meter-labels">
                  <span>Min {thresholds.temp_min}°C</span>
                  <span>Max {thresholds.temp_max}°C</span>
                </div>
              </div>
            </div>
          </div>

          <div className="overview-module-footer">
            <button
              type="button"
              className="module-action-btn"
              onClick={() => {
                if (triggerHaptic) triggerHaptic(30)
                onNavigate('temp')
              }}
            >
              <span>Lihat Grafik & Analisis</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Module 4: Hardware & Setelan Quick Widget */}
        <div className="overview-module-card">
          <div className="overview-module-header">
            <div className="overview-module-title-box">
              <div className="module-icon settings">
                <Settings size={18} />
              </div>
              <div>
                <h3 className="overview-module-title">Status IoT & Setelan</h3>
                <span className="overview-module-caption">Hardware & Jaringan</span>
              </div>
            </div>
            <span className="status-badge-compact info">
              {backendConnection?.isConnected ? 'FastAPI Live' : 'Simulasi'}
            </span>
          </div>

          <div className="overview-module-body">
            <div className="quick-info-row">
              <span className="quick-info-label">ESP8266 Feeder:</span>
              <span className="quick-info-value">
                {espStatus.online ? (
                  <span className="inline-status text-emerald">
                    <Wifi size={13} /> {espStatus.rssi} dBm
                  </span>
                ) : (
                  <span className="inline-status text-rose">
                    <WifiOff size={13} /> Offline
                  </span>
                )}
              </span>
            </div>
            <div className="quick-info-row">
              <span className="quick-info-label">ESP32-CAM:</span>
              <span className="quick-info-value">
                {camStatus.online ? (
                  <span className="inline-status text-emerald">Aktif & Siap</span>
                ) : (
                  <span className="inline-status text-rose">Terputus</span>
                )}
              </span>
            </div>
            <div className="quick-info-row">
              <span className="quick-info-label">Level Air Kolam:</span>
              <span className="quick-info-value">
                {telemetry.level_ok ? (
                  <span className="inline-status text-emerald">Normal (Aman)</span>
                ) : (
                  <span className="inline-status text-rose">Rendah (Pakan Hold)</span>
                )}
              </span>
            </div>
          </div>

          <div className="overview-module-footer">
            <button
              type="button"
              className="module-action-btn"
              onClick={() => {
                if (triggerHaptic) triggerHaptic(30)
                onNavigate('settings')
              }}
            >
              <span>Buka Setelan Sistem</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
