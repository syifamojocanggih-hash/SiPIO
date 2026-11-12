import React, { useState, useEffect } from 'react'
import {
  Camera,
  CameraOff,
  RefreshCw,
  Maximize2,
  Eye,
  Sparkles,
  X,
  Download,
  Lightbulb,
  Clock,
  History
} from 'lucide-react'
import { formatShortDateTime } from '../utils/formatters'

export function CameraMonitor({
  camStatus,
  cameraUpdate,
  hopperStock,
  onRefillHopper,
  snapshotHistory = [],
  onCaptureSnapshot,
  triggerHaptic
}) {
  const [activeArea, setActiveArea] = useState('kolam') // 'kolam' | 'hopper'
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showFullView, setShowFullView] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('Terbaru')
  const [cacheBuster, setCacheBuster] = useState(() => Date.now())

  // Kontrol tambahan: Auto-Refresh (detik, 0 = manual) & Lampu Flash
  const [autoIntervalSec, setAutoIntervalSec] = useState(0)
  const [nextRefreshIn, setNextRefreshIn] = useState(0)
  const [isFlashOn, setIsFlashOn] = useState(false)

  // Mode pratinjau riwayat thumbnail
  const [selectedSnapshot, setSelectedSnapshot] = useState(null)

  useEffect(() => {
    if (cameraUpdate && cameraUpdate.timestamp_str) {
      setLastUpdated(cameraUpdate.timestamp_str)
      setCacheBuster(cameraUpdate.timestamp || Date.now())
      setImgError(false)
    }
  }, [cameraUpdate])

  useEffect(() => {
    if (!showFullView) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowFullView(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showFullView])

  const triggerRefreshCapture = (label = 'Manual') => {
    if (triggerHaptic) triggerHaptic(25)
    setSelectedSnapshot(null)
    setIsRefreshing(true)
    setImgError(false)
    setTimeout(() => {
      const ts = Date.now()
      const timeLabel = formatShortDateTime(ts)
      setLastUpdated(timeLabel)
      setCacheBuster(ts)
      setIsRefreshing(false)
      if (onCaptureSnapshot) {
        const srcBase = activeArea === 'kolam' ? '/camera/pond_latest.jpg' : '/camera/hopper_latest.jpg'
        onCaptureSnapshot({
          area: activeArea,
          src: `${srcBase}?t=${ts}`,
          label,
          timestamp: ts
        })
      }
    }, 550)
  }

  // Timer Auto-Refresh berkala
  useEffect(() => {
    if (!autoIntervalSec) {
      setNextRefreshIn(0)
      return
    }
    setNextRefreshIn(autoIntervalSec)
    const timer = setInterval(() => {
      setNextRefreshIn((prev) => {
        if (prev <= 1) {
          triggerRefreshCapture('Otomatis')
          return autoIntervalSec
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoIntervalSec, activeArea])

  const baseSrc = activeArea === 'kolam' ? '/camera/pond_latest.jpg' : '/camera/hopper_latest.jpg'
  const liveImageSrc = `${baseSrc}?t=${cacheBuster}`
  const displayedSrc = selectedSnapshot ? selectedSnapshot.src : liveImageSrc

  const currentGrams = Number(hopperStock?.currentGrams ?? 120)
  const capacityGrams = Math.max(10, Number(hopperStock?.capacityGrams) || 200)
  const hopperPercent = Math.min(100, Math.max(0, Math.round((currentGrams / capacityGrams) * 100)))

  const handleDownloadSnapshot = () => {
    if (triggerHaptic) triggerHaptic(30)
    const link = document.createElement('a')
    link.href = displayedSrc
    link.download = `sipio_${selectedSnapshot?.area || activeArea}_${new Date().toISOString().slice(0, 10)}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <article id="sec-camera" className="card camera-container">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 className="card-title">
            <Camera size={18} className="text-cyan" />
            <span>Pemantauan Kamera Akuarium</span>
          </h2>
          <p className="card-subtitle">Pantau kondisi ikan di akuarium serta sisa pakan di wadah hopper</p>
        </div>

        <div className="camera-header-controls">
          {/* Pilihan Auto-Refresh */}
          <div className="cam-auto-wrap">
            <Clock size={14} className="text-dim" />
            <select
              className="form-input"
              aria-label="Interval pembaruan foto otomatis"
              style={{ minHeight: '40px', padding: '4px 10px', fontSize: '0.78rem', width: 'auto' }}
              value={autoIntervalSec}
              onChange={(e) => setAutoIntervalSec(Number(e.target.value))}
            >
              <option value={0}>Refresh Manual</option>
              <option value={30}>Auto 30 dtk</option>
              <option value={60}>Auto 1 mnt</option>
              <option value={300}>Auto 5 mnt</option>
            </select>
            {autoIntervalSec > 0 && (
              <span className="cam-countdown-pill font-mono">{nextRefreshIn}s</span>
            )}
          </div>

          {/* Toggle Lampu Penerangan */}
          <button
            type="button"
            className={`camera-btn ${isFlashOn ? 'flash-active' : ''}`}
            onClick={() => {
              if (triggerHaptic) triggerHaptic(25)
              setIsFlashOn((prev) => !prev)
            }}
            aria-pressed={isFlashOn}
            title="Sakelar lampu pencahayaan akuarium"
          >
            <Lightbulb size={14} />
            <span>{isFlashOn ? 'Lampu: Nyala' : 'Lampu'}</span>
          </button>

          {/* Unduh Snapshot */}
          <button
            type="button"
            className="camera-btn"
            onClick={handleDownloadSnapshot}
            aria-label="Unduh snapshot foto saat ini"
            title="Unduh Foto"
          >
            <Download size={14} />
            <span>Unduh</span>
          </button>

          {/* Perbarui Foto */}
          <button
            type="button"
            id="btn-camera-refresh"
            className="camera-btn"
            onClick={() => triggerRefreshCapture('Manual')}
            disabled={isRefreshing}
            aria-label="Ambil snapshot foto terbaru"
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
            <span>{isRefreshing ? 'Memuat...' : 'Perbarui'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Area */}
      <div className="camera-nav-tabs" role="tablist">
        <button
          type="button"
          id="tab-camera-pond"
          role="tab"
          aria-selected={activeArea === 'kolam'}
          className={`tab-btn ${activeArea === 'kolam' ? 'active' : ''}`}
          onClick={() => {
            setActiveArea('kolam')
            setSelectedSnapshot(null)
            setImgError(false)
          }}
        >
          <Eye size={16} />
          <span>Area Permukaan Akuarium</span>
        </button>

        <button
          type="button"
          id="tab-camera-hopper"
          role="tab"
          aria-selected={activeArea === 'hopper'}
          className={`tab-btn ${activeArea === 'hopper' ? 'active' : ''}`}
          onClick={() => {
            setActiveArea('hopper')
            setSelectedSnapshot(null)
            setImgError(false)
          }}
        >
          <Sparkles size={16} />
          <span>Wadah Pakan (Hopper)</span>
        </button>
      </div>

      {/* Viewport */}
      <div className="camera-viewport">
        {!imgError ? (
          <img
            src={displayedSrc}
            alt={activeArea === 'kolam' ? 'Snapshot permukaan air akuarium' : 'Snapshot isi wadah pakan hopper'}
            className="camera-img"
            onError={() => setImgError(true)}
            style={{
              opacity: isRefreshing ? 0.65 : camStatus.online ? 1 : 0.4,
              filter: `${camStatus.online ? '' : 'grayscale(80%) '}${isFlashOn ? 'brightness(1.16) contrast(1.04)' : ''}`.trim() || 'none'
            }}
          />
        ) : (
          <div className="hub-camera-fallback" style={{ minHeight: '280px' }}>
            <CameraOff size={36} className="text-dim" />
            <p>Snapshot foto belum dapat dimuat</p>
          </div>
        )}

        {/* Lencana Status Atas Kiri saja (pojok kanan bawah dibebaskan agar tidak menumpuk watermark foto) */}
        <div className="camera-overlay-badge">
          <span className={`status-dot ${camStatus.online ? 'online' : 'offline'}`} />
          <span>
            {selectedSnapshot
              ? `Riwayat: ${selectedSnapshot.label}`
              : `${activeArea === 'kolam' ? 'Akuarium' : 'Hopper Pakan'}`}
          </span>
        </div>

        {selectedSnapshot && (
          <button
            type="button"
            className="cam-back-live-btn"
            onClick={() => setSelectedSnapshot(null)}
          >
            Kembali ke Foto Terbaru
          </button>
        )}

        {/* Offline Warning Overlay */}
        {!camStatus.online && (
          <div className="camera-offline-overlay" role="alert">
            <CameraOff size={32} style={{ color: 'var(--status-rose)', marginBottom: '8px' }} />
            <strong style={{ fontSize: '0.95rem' }}>Kamera Sedang Offline</strong>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '4px', textAlign: 'center', maxWidth: '300px' }}>
              Snapshot di atas adalah tangkapan terakhir. Periksa catu daya dan sinyal WiFi modul kamera.
            </p>
          </div>
        )}
      </div>

      {/* Action Bar Bawah dengan Timestamp Bersih + Sisa Stok Dinamis */}
      <div className="camera-action-bar" style={{ flexWrap: 'wrap' }}>
        <div className="camera-bar-info">
          <span className="cam-time-pill">
            <Clock size={13} />
            <span>Diambil: {selectedSnapshot ? formatShortDateTime(selectedSnapshot.timestamp) : lastUpdated}</span>
          </span>

          {activeArea === 'hopper' ? (
            <span className="text-muted" style={{ fontSize: '0.78rem' }}>
              Sisa stok wadah: <strong>{currentGrams}g / {capacityGrams}g ({hopperPercent}%)</strong>
            </span>
          ) : (
            <span className="text-dim" style={{ fontSize: '0.78rem' }}>
              Perhatikan kejernihan air dan respons ikan saat pelet jatuh.
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {activeArea === 'hopper' && onRefillHopper && (
            <button
              type="button"
              className="camera-btn"
              onClick={() => {
                if (triggerHaptic) triggerHaptic(40)
                onRefillHopper()
              }}
            >
              <RefreshCw size={14} />
              <span>Tandai Isi Ulang Penuh</span>
            </button>
          )}

          <button
            type="button"
            id="btn-camera-zoom"
            className="camera-btn"
            onClick={() => setShowFullView(true)}
            aria-label="Tampilkan gambar kamera ukuran penuh"
          >
            <Maximize2 size={14} />
            <span>Perbesar</span>
          </button>
        </div>
      </div>

      {/* Strip Galeri Riwayat Tangkapan (Perbandingan Foto) */}
      <div className="cam-history-strip">
        <div className="cam-history-header">
          <History size={14} className="text-cyan" />
          <span>Riwayat Tangkapan ({snapshotHistory.length})</span>
        </div>

        {snapshotHistory.length === 0 ? (
          <p className="cam-history-empty">
            Belum ada riwayat perbandingan. Klik "Perbarui" atau "Beri Pakan &amp; Pantau" untuk menyimpan foto pembanding.
          </p>
        ) : (
          <div className="cam-thumb-list">
            {snapshotHistory.map((snap) => {
              const isSelected = selectedSnapshot?.id === snap.id
              return (
                <button
                  key={snap.id}
                  type="button"
                  className={`cam-thumb-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedSnapshot(isSelected ? null : snap)
                    setImgError(false)
                  }}
                >
                  <img src={snap.src} alt={snap.label} className="cam-thumb-img" />
                  <div className="cam-thumb-meta">
                    <span className="cam-thumb-label">{snap.label}</span>
                    <span className="cam-thumb-time">{formatShortDateTime(snap.timestamp)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Fullscreen Modal View */}
      {showFullView && (
        <div className="modal-backdrop" onClick={() => setShowFullView(false)} role="dialog" aria-modal="true" aria-label="Snapshot kamera layar penuh">
          <div className="modal-box" style={{ maxWidth: '840px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>
                Snapshot {activeArea === 'kolam' ? 'Permukaan Akuarium' : 'Wadah Hopper'}
              </h3>
              <button
                type="button"
                id="btn-close-camera-zoom"
                className="icon-btn"
                onClick={() => setShowFullView(false)}
                aria-label="Tutup Tampilan Penuh"
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '12px' }}>
              <img
                src={displayedSrc}
                alt="Fullscreen snapshot"
                style={{ width: '100%', borderRadius: '8px', display: 'block' }}
              />
              <p style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Waktu pengambilan: {selectedSnapshot ? formatShortDateTime(selectedSnapshot.timestamp) : lastUpdated}.
              </p>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
