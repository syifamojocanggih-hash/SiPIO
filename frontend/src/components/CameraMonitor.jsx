import React, { useState, useEffect } from 'react'
import { Camera, CameraOff, RefreshCw, Maximize2, Eye, Sparkles, X } from 'lucide-react'

export function CameraMonitor({ camStatus }) {
  const [activeArea, setActiveArea] = useState('kolam') // 'kolam' | 'hopper'
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showFullView, setShowFullView] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('18:45 WIB')

  // Keyboard accessibility: Escape closes modal (R-32)
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

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
      const now = new Date()
      setLastUpdated(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`)
    }, 800)
  }

  const currentImageSrc = activeArea === 'kolam' 
    ? '/camera/pond_latest.jpg' 
    : '/camera/hopper_latest.jpg'

  return (
    <article id="sec-camera" className="card camera-container">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Camera size={18} className="text-cyan" />
            Pemantauan Kamera ESP32-CAM
          </h2>
          <p className="card-subtitle">Pantau kondisi ikan di kolam dan sisa pakan di wadah hopper</p>
        </div>

        <button 
          type="button" 
          id="btn-camera-refresh"
          className="camera-btn" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Ambil snapshot foto terbaru dari ESP32-CAM"
        >
          <RefreshCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
          <span>{isRefreshing ? 'Memuat...' : 'Perbarui'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="camera-nav-tabs" role="tablist">
        <button
          type="button"
          id="tab-camera-pond"
          role="tab"
          aria-selected={activeArea === 'kolam'}
          className={`tab-btn ${activeArea === 'kolam' ? 'active' : ''}`}
          onClick={() => setActiveArea('kolam')}
        >
          <Eye size={16} />
          <span>Area Permukaan Kolam</span>
        </button>

        <button
          type="button"
          id="tab-camera-hopper"
          role="tab"
          aria-selected={activeArea === 'hopper'}
          className={`tab-btn ${activeArea === 'hopper' ? 'active' : ''}`}
          onClick={() => setActiveArea('hopper')}
        >
          <Sparkles size={16} />
          <span>Wadah Pakan (Hopper)</span>
        </button>
      </div>

      {/* Viewport */}
      <div className="camera-viewport">
        <img 
          src={currentImageSrc} 
          alt={activeArea === 'kolam' ? 'Snapshot permukaan air kolam dari ESP32-CAM' : 'Snapshot isi wadah pakan hopper dari ESP32-CAM'} 
          className="camera-img"
          style={{ 
            opacity: isRefreshing ? 0.7 : camStatus.online ? 1 : 0.4,
            filter: camStatus.online ? 'none' : 'grayscale(80%)'
          }}
        />

        {/* Status badges */}
        <div className="camera-overlay-badge">
          <span className={`status-dot ${camStatus.online ? 'online' : 'offline'}`} />
          <span>ESP32-CAM: {activeArea === 'kolam' ? 'Kolam Ikan' : 'Hopper Feeder'}</span>
        </div>

        <div className="camera-timestamp-badge">
          {camStatus.online ? `Diambil: ${lastUpdated}` : 'Kamera Terputus (Offline)'}
        </div>

        {/* Offline Warning Overlay (R-27 UI State) */}
        {!camStatus.online && (
          <div className="camera-offline-overlay" role="alert">
            <CameraOff size={32} style={{ color: 'var(--status-rose)', marginBottom: '8px' }} />
            <strong style={{ fontSize: '0.95rem' }}>ESP32-CAM Sedang Offline</strong>
            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '4px', textAlign: 'center', maxWidth: '300px' }}>
              Snapshot di atas adalah tangkapan terakhir. Periksa catu daya 5V dan sinyal WiFi modul kamera.
            </p>
          </div>
        )}
      </div>

      <div className="camera-action-bar">
        <span className="text-dim" style={{ fontSize: '0.78rem' }}>
          {activeArea === 'hopper' 
            ? 'Catatan: Wadah terisi ~60%. Pengisian ulang pakan dilakukan manual bila hampir habis.' 
            : 'Perhatikan kejernihan air dan respons pergerakan ikan saat pakan jatuh.'}
        </span>

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

      {/* Fullscreen Modal View */}
      {showFullView && (
        <div className="modal-backdrop" onClick={() => setShowFullView(false)}>
          <div className="modal-box" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>
                Snapshot {activeArea === 'kolam' ? 'Kolam Ikan' : 'Wadah Hopper'} (ESP32-CAM)
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
                src={currentImageSrc} 
                alt="Fullscreen snapshot" 
                style={{ width: '100%', borderRadius: '8px', display: 'block' }}
              />
              <p style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Waktu pengambilan: {lastUpdated}. Jalur transmisi: HTTP POST multipart terpisah dari MQTT telemetri.
              </p>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}
