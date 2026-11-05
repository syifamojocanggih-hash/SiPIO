import React from 'react'
import {
  LayoutDashboard,
  PlayCircle,
  Camera,
  TrendingUp,
  Settings,
  Sun,
  Moon,
  Contrast,
  SlidersHorizontal,
  Download,
  CheckCircle
} from 'lucide-react'

export function DesktopSidebar({
  activeTab = 'overview',
  onTabChange,
  onOpenSettings,
  theme,
  toggleTheme,
  contrast = 'normal',
  toggleContrast,
  pwaState,
  triggerHaptic
}) {
  const navItems = [
    {
      id: 'overview',
      label: 'Ringkasan',
      icon: LayoutDashboard
    },
    {
      id: 'feeder',
      label: 'Pakan & Jadwal',
      icon: PlayCircle
    },
    {
      id: 'camera',
      label: 'Kamera Kolam',
      icon: Camera
    },
    {
      id: 'temp',
      label: 'Tren Suhu',
      icon: TrendingUp
    },
    {
      id: 'settings',
      label: 'Konfigurasi',
      icon: Settings
    }
  ]

  const handleItemClick = (item) => {
    if (triggerHaptic) triggerHaptic(30)
    if (item.id === 'settings' && onOpenSettings) {
      onOpenSettings()
    } else if (onTabChange) {
      onTabChange(item.id)
    }
  }

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

      {/* 3. Pengaturan Khusus Tampilan (Mode Gelap & Kontras) */}
      <div className="sidebar-footer">
        <div className="sidebar-display-settings">
          <div className="sidebar-settings-header">
            <SlidersHorizontal size={13} className="text-cyan" />
            <span>Pengaturan Tampilan</span>
          </div>

          <div className="sidebar-settings-list">
            {/* Setting: Mode Gelap */}
            <div className="sidebar-setting-row">
              <div className="sidebar-setting-label">
                {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
                <span>Mode Gelap</span>
              </div>
              <label 
                className="switch switch-sm" 
                title={theme === 'dark' ? 'Nonaktifkan Mode Gelap' : 'Aktifkan Mode Gelap'}
              >
                <input
                  type="checkbox"
                  checked={theme === 'dark'}
                  onChange={() => {
                    if (triggerHaptic) triggerHaptic(30)
                    toggleTheme()
                  }}
                  aria-label="Mode Gelap"
                />
                <span className="slider" />
              </label>
            </div>

            {/* Setting: Kontras Tinggi */}
            <div className="sidebar-setting-row">
              <div className="sidebar-setting-label">
                <Contrast size={15} />
                <span>Kontras</span>
              </div>
              <label 
                className="switch switch-sm" 
                title={contrast === 'high' ? 'Kembalikan Kontras Normal' : 'Aktifkan Kontras Tinggi (Luar Ruangan)'}
              >
                <input
                  type="checkbox"
                  checked={contrast === 'high'}
                  onChange={() => {
                    if (triggerHaptic) triggerHaptic(30)
                    if (toggleContrast) toggleContrast()
                  }}
                  aria-label="Kontras Tinggi"
                />
                <span className="slider" />
              </label>
            </div>
          </div>
        </div>

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
