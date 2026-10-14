import React from 'react'
import { Wifi, WifiOff, Camera, Sun, Moon, Settings, Download, CheckCircle } from 'lucide-react'

export function Navbar({ 
  theme, 
  toggleTheme, 
  onOpenSettings, 
  pwaState, 
  espStatus, 
  camStatus 
}) {
  return (
    <header className="top-header" role="banner">
      <div className="brand-section">
        <div className="brand-logo" aria-hidden="true">
          <img src="/sipio-icon.svg" alt="SiPio Logo" width="38" height="38" />
        </div>
        <div className="brand-info">
          <h1>
            SiPio
            <span className="brand-badge">IoT v1.3</span>
          </h1>
          <p className="brand-subtitle">Smart Fish Feeder & Pond Monitoring</p>
        </div>
      </div>

      <div className="header-status-pills" aria-label="Status Konektivitas Perangkat">
        {/* ESP8266 Feeder Status */}
        <div className="status-pill" title={`ESP8266 Feeder: ${espStatus.online ? 'Online' : 'Offline'}, Sinyal: ${espStatus.rssi} dBm`}>
          <span className={`status-dot ${espStatus.online ? 'online' : 'offline'}`} />
          {espStatus.online ? <Wifi size={14} style={{ color: 'var(--status-emerald)' }} /> : <WifiOff size={14} style={{ color: 'var(--status-rose)' }} />}
          <span>Feeder: {espStatus.online ? `${espStatus.rssi} dBm` : 'Offline'}</span>
        </div>

        {/* ESP32-CAM Status */}
        <div className="status-pill" title={`Kamera ESP32-CAM: ${camStatus.online ? 'Online' : 'Offline'}`}>
          <span className={`status-dot ${camStatus.online ? 'online' : 'offline'}`} />
          <Camera size={14} />
          <span>Kamera: {camStatus.online ? 'Aktif' : 'Mati'}</span>
        </div>

        {/* PWA Offline indicator */}
        {!pwaState.isOnline && (
          <div className="offline-mode-pill" role="status">
            <span>Mode Offline (Cache)</span>
          </div>
        )}
      </div>

      <div className="header-actions">
        {/* PWA Install Button or Installed Badge */}
        {pwaState.isInstalled ? (
          <span className="pwa-installed-pill" title="Aplikasi berjalan dalam mode PWA Standalone">
            <CheckCircle size={13} style={{ color: 'var(--status-emerald)' }} />
            <span>PWA Aktif</span>
          </span>
        ) : (
          <button 
            type="button" 
            id="btn-pwa-install"
            className="pwa-install-btn" 
            onClick={pwaState.promptInstall}
            aria-label="Pasang Aplikasi SiPio ke Perangkat (PWA)"
          >
            <Download size={15} />
            <span>Pasang App</span>
          </button>
        )}

        {/* Light / Dark Mode Toggle */}
        <button 
          type="button" 
          id="btn-theme-toggle"
          className="icon-btn" 
          onClick={toggleTheme} 
          aria-label={theme === 'dark' ? 'Ganti ke tema terang (Mode Siang Kolam)' : 'Ganti ke tema gelap'}
          title={theme === 'dark' ? 'Mode Siang' : 'Mode Malam'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Settings Button */}
        <button 
          type="button" 
          id="btn-settings-open"
          className="icon-btn" 
          onClick={onOpenSettings} 
          aria-label="Pengaturan Ambang Batas Sensor & Feeder"
          title="Pengaturan Sistem"
        >
          <Settings size={20} />
        </button>
      </div>
    </header>
  )
}
