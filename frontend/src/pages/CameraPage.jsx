import React from 'react'
import { Camera, Eye, Sparkles, CheckCircle2 } from 'lucide-react'
import { CameraMonitor } from '../components/CameraMonitor'

export function CameraPage({ camStatus, cameraUpdate }) {
  return (
    <div className="page-view animate-fade-in" id="page-camera">
      {/* 1. Page Header */}
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-title-row">
            <div className="page-icon-badge camera">
              <Camera size={20} />
            </div>
            <h1 className="page-title">Monitoring Kamera Kolam (ESP32-CAM)</h1>
            <span className={`page-status-badge ${camStatus.online ? 'success' : 'danger'}`}>
              <span className="pulse-indicator" />
              {camStatus.online ? 'Kamera Aktif & Live' : 'Kamera Offline'}
            </span>
          </div>
          <p className="page-subtitle">
            Pemantauan visual langsung aktivitas ikan di kolam dan sisa pakan di wadah hopper via modul ESP32-CAM
          </p>
        </div>

        <div className="page-header-stats">
          <div className="header-stat-chip">
            <span className="stat-chip-label">Resolusi Stream</span>
            <span className="stat-chip-val font-mono">SVGA (800x600)</span>
          </div>
          <div className="header-stat-chip">
            <span className="stat-chip-label">Status Hardware</span>
            <span className={`stat-chip-val ${camStatus.online ? 'text-emerald' : 'text-rose'}`}>
              {camStatus.online ? 'Terhubung' : 'Terputus'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Camera Monitor */}
      <div className="camera-main-panel">
        <CameraMonitor camStatus={camStatus} cameraUpdate={cameraUpdate} />
      </div>

      {/* 3. Observasi & Panduan Kamera Kolam */}
      <div className="camera-guide-grid">
        <div className="card guide-card">
          <div className="guide-card-header">
            <Eye size={18} className="text-cyan" />
            <h3 className="guide-title">Panduan Observasi Visual Ikan Kolam</h3>
          </div>
          <ul className="guide-list">
            <li>
              <CheckCircle2 size={16} className="text-emerald guide-icon" />
              <div>
                <strong>Aktivitas Permukaan Saat Pakan:</strong>
                <p>Ikan sehat akan langsung menyambar pelet pakan dalam waktu 5-10 detik setelah servo berputar.</p>
              </div>
            </li>
            <li>
              <CheckCircle2 size={16} className="text-emerald guide-icon" />
              <div>
                <strong>Kejernihan Air & Endapan:</strong>
                <p>Jika air tampak keruh atau pelet tersisa mengendap di dasar, kurangi porsi pakan harian.</p>
              </div>
            </li>
            <li>
              <CheckCircle2 size={16} className="text-emerald guide-icon" />
              <div>
                <strong>Pemeriksaan Hopper Pakan:</strong>
                <p>Gunakan tombol switch kamera ke "Hopper" untuk memeriksa kelembaban dan sisa stok pelet.</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="card guide-card">
          <div className="guide-card-header">
            <Sparkles size={18} className="text-cyan" />
            <h3 className="guide-title">Spesifikasi Modul ESP32-CAM</h3>
          </div>
          <div className="spec-table">
            <div className="spec-row">
              <span className="spec-name">Sensor Lensa:</span>
              <span className="spec-val">OmniVision OV2640 2 Megapixels</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">Konektivitas:</span>
              <span className="spec-val">Wi-Fi 802.11 b/g/n (2.4 GHz)</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">Pencahayaan Malam:</span>
              <span className="spec-val">High-Brightness Onboard Flash LED (GPIO4)</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">Protokol Stream:</span>
              <span className="spec-val">HTTP MJPEG / WebSocket Realtime Upload</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
