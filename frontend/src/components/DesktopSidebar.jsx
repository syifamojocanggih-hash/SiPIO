import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  PlayCircle,
  Camera,
  TrendingUp,
  Settings,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  Download,
  CheckCircle,
  Activity
} from 'lucide-react'

export function DesktopSidebar({
  activeTab: externalActiveTab,
  onTabChange,
  onOpenSettings,
  espStatus,
  camStatus,
  backendConnection,
  theme,
  toggleTheme,
  pwaState,
  triggerHaptic
}) {
  const [internalActiveTab, setInternalActiveTab] = useState('overview')
  const activeTab = externalActiveTab || internalActiveTab

  const navItems = [
    {
      id: 'overview',
      label: 'Ringkasan',
      icon: LayoutDashboard,
      targetId: 'sec-overview'
    },
    {
      id: 'feeder',
      label: 'Pakan & Jadwal',
      icon: PlayCircle,
      targetId: 'sec-feeder'
    },
    {
      id: 'camera',
      label: 'Kamera Kolam',
      icon: Camera,
      targetId: 'sec-camera'
    },
    {
      id: 'temp',
      label: 'Tren Suhu',
      icon: TrendingUp,
      targetId: 'sec-temp'
    },
    {
      id: 'settings',
      label: 'Setelan',
      icon: Settings,
      action: onOpenSettings
    }
  ]

  const handleItemClick = (item) => {
    if (triggerHaptic) triggerHaptic(30)
    setInternalActiveTab(item.id)
    if (onTabChange) onTabChange(item.id)

    if (item.action) {
      item.action()
      return
    }

    if (item.targetId) {
      const el = document.getElementById(item.targetId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  // Auto-highlight active tab on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['sec-overview', 'sec-feeder', 'sec-camera', 'sec-temp']
      const scrollPos = window.scrollY + 180

      for (const secId of sections) {
        const el = document.getElementById(secId)
        if (el) {
          const top = el.offsetTop
          const height = el.offsetHeight
          if (scrollPos >= top && scrollPos < top + height) {
            const mappedId = secId.replace('sec-', '')
            setInternalActiveTab(mappedId)
            if (onTabChange) onTabChange(mappedId)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [onTabChange])

  return (
    <aside className="desktop-sidebar" aria-label="Navigasi Utama Desktop SiPIO">
      {/* 1. Brand Logo & Title */}
      <div className="sidebar-brand">
        <div className="brand-logo" aria-hidden="true">
          <img src="/sipio-icon.svg" alt="SiPIO Logo" width="36" height="36" />
        </div>
        <div className="sidebar-brand-text">
          <div className="sidebar-brand-title">
            <span>SiPIO</span>
            <span className="brand-badge">IoT v1.3</span>
          </div>
          <p className="sidebar-brand-subtitle">Smart Fish Feeder</p>
        </div>
      </div>

      {/* 2. Navigation Menu */}
      <div className="sidebar-nav-section">
        <span className="sidebar-section-title">Menu Navigasi</span>
        <nav className="sidebar-nav-list" role="navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleItemClick(item)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="sidebar-item-icon">
                  <Icon size={19} />
                </div>
                <span className="sidebar-item-label">{item.label}</span>
                {isActive && <div className="sidebar-active-indicator" />}
              </button>
            )
          })}
        </nav>
      </div>

      {/* 3. Hardware & Telemetry Status Card */}
      <div className="sidebar-status-card">
        <div className="sidebar-status-header">
          <Activity size={14} className="text-cyan" />
          <span>Status Perangkat</span>
        </div>

        <div className="sidebar-status-list">
          {/* Backend / WebSocket */}
          <div className="sidebar-status-row">
            <span className="status-label">FastAPI Backend:</span>
            <span className="status-value">
              <span className={`status-dot ${backendConnection?.isConnected ? 'online' : 'simulated'}`} />
              {backendConnection?.isConnected ? 'Terhubung' : 'Simulasi'}
            </span>
          </div>

          {/* ESP8266 Feeder */}
          <div className="sidebar-status-row">
            <span className="status-label">ESP8266 Feeder:</span>
            <span className="status-value">
              <span className={`status-dot ${espStatus.online ? 'online' : 'offline'}`} />
              {espStatus.online ? (
                <>
                  <Wifi size={12} style={{ color: 'var(--status-emerald)' }} />
                  <span>{espStatus.rssi} dBm</span>
                </>
              ) : (
                <>
                  <WifiOff size={12} style={{ color: 'var(--status-rose)' }} />
                  <span>Offline</span>
                </>
              )}
            </span>
          </div>

          {/* ESP32-CAM */}
          <div className="sidebar-status-row">
            <span className="status-label">ESP32-CAM:</span>
            <span className="status-value">
              <span className={`status-dot ${camStatus.online ? 'online' : 'offline'}`} />
              <span>{camStatus.online ? 'Aktif' : 'Mati'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Footer Tools (Theme & PWA) */}
      <div className="sidebar-footer">
        {/* Theme Toggle */}
        <button
          type="button"
          className="sidebar-tool-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
          title={theme === 'dark' ? 'Mode Siang' : 'Mode Malam'}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          <span>{theme === 'dark' ? 'Mode Siang' : 'Mode Malam'}</span>
        </button>

        {/* PWA Install / Status */}
        {pwaState?.isInstalled ? (
          <div className="sidebar-pwa-badge" title="PWA Standalone Mode Aktif">
            <CheckCircle size={15} style={{ color: 'var(--status-emerald)' }} />
            <span>PWA Terpasang</span>
          </div>
        ) : (
          <button
            type="button"
            className="sidebar-tool-btn primary"
            onClick={pwaState?.promptInstall}
            aria-label="Pasang Aplikasi PWA"
          >
            <Download size={16} />
            <span>Pasang App PWA</span>
          </button>
        )}
      </div>
    </aside>
  )
}
