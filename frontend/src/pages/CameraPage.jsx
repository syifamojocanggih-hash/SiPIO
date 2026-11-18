import React, { useState, useEffect } from 'react'
import {
  Camera,
  Eye,
  Play,
  CheckCircle2,
  Thermometer,
  Waves,
  Package,
  AlertTriangle,
  Clock
} from 'lucide-react'
import { CameraMonitor } from '../components/CameraMonitor'
import { WaterClarityAnalyzer } from '../components/WaterClarityAnalyzer'

export function CameraPage({
  camStatus,
  cameraUpdate,
  telemetry,
  thresholds,
  lastFeedTimestamp,
  onTriggerFeed,
  hopperStock,
  onRefillHopper,
  snapshotHistory,
  onCaptureSnapshot,
  onAddCareNote,
  triggerHaptic
}) {
  const [monitorCountdown, setMonitorCountdown] = useState(0)
  const [obsToast, setObsToast] = useState('')
  const [nowEpoch, setNowEpoch] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNowEpoch(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Countdown 10 detik untuk tangkapan "Sesudah Pakan"
  useEffect(() => {
    if (monitorCountdown <= 0) return
    const timer = setTimeout(() => {
      if (monitorCountdown === 1) {
        if (onCaptureSnapshot) {
          const ts = Date.now()
          onCaptureSnapshot({
            area: 'kolam',
            src: `/camera/pond_latest.jpg?t=${ts}`,
            label: 'Sesudah Pakan (10 dtk)',
            timestamp: ts
          })
        }
        setObsToast('Foto sesudah pakan tersimpan di galeri tangkapan!')
        setTimeout(() => setObsToast(''), 3500)
      }
      setMonitorCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [monitorCountdown, onCaptureSnapshot])

  const isWaterLow = !telemetry?.level_ok
  const minGapMinutes = thresholds?.min_gap_min || 30
  const totalCooldownSeconds = minGapMinutes * 60
  const elapsedSeconds = lastFeedTimestamp > 0 ? Math.floor((nowEpoch - lastFeedTimestamp) / 1000) : 999999
  const remainingCooldownSeconds = Math.max(0, totalCooldownSeconds - elapsedSeconds)
  const isCooldownActive = remainingCooldownSeconds > 0
  const remMin = Math.floor(remainingCooldownSeconds / 60)
  const remSec = remainingCooldownSeconds % 60
  const formattedCooldown = `${String(remMin).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`

  const handleFeedAndMonitor = () => {
    if (isWaterLow || isCooldownActive || monitorCountdown > 0) return
    if (triggerHaptic) triggerHaptic(50)

    const ts = Date.now()
    if (onCaptureSnapshot) {
      onCaptureSnapshot({
        area: 'kolam',
        src: `/camera/pond_latest.jpg?t=${ts}`,
        label: 'Saat Pakan',
        timestamp: ts
      })
    }

    if (onTriggerFeed) {
      onTriggerFeed({
        source: 'Manual (Kamera)',
        duration_ms: thresholds?.default_duration_ms || 2000,
        result: 'done',
        reason: 'Pemberian pakan & observasi visual dari halaman Kamera'
      })
    }

    setMonitorCountdown(10)
  }

  const handleQuickObservation = (label) => {
    if (triggerHaptic) triggerHaptic(30)
    if (onAddCareNote) {
      onAddCareNote({
        category: 'Observasi',
        note: `Kondisi visual akuarium: ${label}`
      })
    }
    setObsToast(`Tercatat ke riwayat perawatan: "${label}"`)
    setTimeout(() => setObsToast(''), 3000)
  }

  return (
    <div className="page-view animate-fade-in" id="page-camera">
      {/* 1. Page Header */}
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-title-row">
            <div className="page-icon-badge camera">
              <Camera size={20} />
            </div>
            <h1 className="page-title">Pemantauan Kamera Akuarium</h1>
            <span className={`page-status-badge ${camStatus.online ? 'success' : 'danger'}`}>
              <span className="pulse-indicator" />
              {camStatus.online ? 'Kamera Aktif' : 'Kamera Offline'}
            </span>
          </div>
          <p className="page-subtitle">
            Pemantauan visual aktivitas ikan di akuarium, kondisi air, dan perbandingan sebelum serta sesudah pakan
          </p>
        </div>

        <div className="page-header-stats">
          <div className="header-stat-chip">
            <span className="stat-chip-label">Resolusi Foto</span>
            <span className="stat-chip-val font-mono">SVGA (800x600)</span>
          </div>
          <div className="header-stat-chip">
            <span className="stat-chip-label">Status Koneksi</span>
            <span className={`stat-chip-val ${camStatus.online ? 'text-emerald' : 'text-rose'}`}>
              {camStatus.online ? 'Terhubung' : 'Terputus'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Camera Monitor */}
      <div className="camera-main-panel">
        <CameraMonitor
          camStatus={camStatus}
          cameraUpdate={cameraUpdate}
          hopperStock={hopperStock}
          onRefillHopper={onRefillHopper}
          snapshotHistory={snapshotHistory}
          onCaptureSnapshot={onCaptureSnapshot}
          triggerHaptic={triggerHaptic}
        />
      </div>

      {/* 3. Analisis Kejernihan Air Kolam (Computer Vision Optik Tanpa AI Berat) */}
      <WaterClarityAnalyzer
        onAddCareNote={onAddCareNote}
        triggerHaptic={triggerHaptic}
        cameraImageSrc="/camera/pond_latest.jpg"
      />

      {/* 4. Panduan Observasi & Panel Aksi Cepat Kamera */}
      <div className="camera-guide-grid">
        <div className="card guide-card">
          <div className="guide-card-header">
            <Eye size={18} className="text-cyan" />
            <h3 className="guide-title">Panduan Observasi Visual Akuarium</h3>
          </div>
          <ul className="guide-list">
            <li>
              <CheckCircle2 size={16} className="text-emerald guide-icon" />
              <div>
                <strong>Aktivitas Permukaan Saat Pakan:</strong>
                <p>Ikan sehat langsung menyambar pelet dalam 5-10 detik setelah pakan dijatuhkan.</p>
              </div>
            </li>
            <li>
              <CheckCircle2 size={16} className="text-emerald guide-icon" />
              <div>
                <strong>Kejernihan Air &amp; Endapan:</strong>
                <p>Bila air keruh atau pelet tersisa mengendap, kurangi takaran pakan harian dan jadwalkan ganti air.</p>
              </div>
            </li>
            <li>
              <CheckCircle2 size={16} className="text-emerald guide-icon" />
              <div>
                <strong>Pemeriksaan Wadah Hopper:</strong>
                <p>Gunakan tab "Wadah Pakan (Hopper)" untuk mengecek kondisi pelet kering serta sisa stok gram secara visual.</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Kartu Interaktif Pengganti Brosur Spesifikasi Statis */}
        <div className="card guide-card">
          <div className="guide-card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Play size={18} className="text-cyan" />
              <h3 className="guide-title">Pantau Respons Makan &amp; Kondisi Air</h3>
            </div>
            <span className="status-tag success" style={{ fontSize: '0.7rem' }}>Interaktif</span>
          </div>

          {/* Strip Mini Telemetri Akuarium Saat Ini */}
          <div className="cam-mini-telemetry">
            <div className="cam-mini-pill">
              <Thermometer size={14} className="text-cyan" />
              <span>Suhu: <strong>{telemetry?.temp?.toFixed(1) ?? '28.4'}°C</strong></span>
            </div>
            <div className="cam-mini-pill">
              <Waves size={14} className={isWaterLow ? 'text-rose' : 'text-emerald'} />
              <span>Air: <strong>{isWaterLow ? 'Rendah' : 'Normal'}</strong></span>
            </div>
            <div className="cam-mini-pill">
              <Package size={14} className="text-cyan" />
              <span>Stok Pelet: <strong>{hopperStock?.currentGrams ?? 120}g</strong></span>
            </div>
          </div>

          {/* Tombol Aksi Cepat: Beri Pakan & Ambil Foto Sesudah 10 Detik */}
          <div className="cam-feed-watch-box">
            {isWaterLow ? (
              <button type="button" className="btn-feed-watch disabled" disabled>
                <AlertTriangle size={16} />
                <span>Pakan Ditunda (Level Air Rendah)</span>
              </button>
            ) : monitorCountdown > 0 ? (
              <div className="cam-watch-progress">
                <Clock size={16} className="text-cyan" />
                <span>Mengamati reaksi ikan... menangkap foto sesudah pakan dalam <strong>{monitorCountdown} dtk</strong></span>
              </div>
            ) : isCooldownActive ? (
              <button type="button" className="btn-feed-watch disabled" disabled>
                <Clock size={16} />
                <span>Jeda Pengaman Pakan Aktif ({formattedCooldown})</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-feed-watch"
                onClick={handleFeedAndMonitor}
              >
                <Play size={15} fill="currentColor" />
                <span>Beri Pakan &amp; Tangkap Foto (10 dtk)</span>
              </button>
            )}
          </div>

          {/* Catat Kondisi Air Sekali Klik */}
          <div className="cam-quick-obs">
            <span className="cam-obs-label">Catat kondisi visual air hari ini:</span>
            <div className="cam-obs-chips">
              <button
                type="button"
                className="cam-obs-btn"
                onClick={() => handleQuickObservation('Air Jernih & Ikan Aktif')}
              >
                Air Jernih
              </button>
              <button
                type="button"
                className="cam-obs-btn"
                onClick={() => handleQuickObservation('Air Agak Keruh (Perlu WC)')}
              >
                Agak Keruh
              </button>
              <button
                type="button"
                className="cam-obs-btn"
                onClick={() => handleQuickObservation('Ada Sisa Pelet Mengendap')}
              >
                Sisa Pelet
              </button>
            </div>
          </div>

          {obsToast && (
            <div className="save-success-toast" role="status" aria-live="polite">
              <CheckCircle2 size={15} />
              <span>{obsToast}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
