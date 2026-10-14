import React from 'react'
import { Download, X, Smartphone, Zap, WifiOff } from 'lucide-react'

export function MobileInstallBanner({ pwaState }) {
  const {
    canInstall,
    isInstalled,
    isBannerDismissed,
    dismissBanner,
    promptInstall,
    triggerHaptic,
    isOnline
  } = pwaState

  // Do not show if already installed, cannot install, or user dismissed in this session
  if (!canInstall || isInstalled || isBannerDismissed) {
    return null
  }

  const handleInstallClick = () => {
    triggerHaptic(50)
    promptInstall()
  }

  const handleDismiss = () => {
    triggerHaptic(20)
    dismissBanner()
  }

  return (
    <aside 
      className="mobile-install-banner" 
      role="region" 
      aria-label="Banner Pemasangan Aplikasi SiPIO ke Ponsel"
    >
      <div className="install-banner-inner">
        {/* App Icon */}
        <div className="install-banner-icon">
          <img src="/sipio-icon.svg" alt="Ikon Aplikasi SiPIO" width="44" height="44" />
        </div>

        {/* Text Content */}
        <div className="install-banner-text">
          <div className="install-banner-title-row">
            <h3 className="install-banner-title">Pasang SiPIO di Ponsel</h3>
            <span className="install-banner-pill">
              <Zap size={11} /> PWA Siap Offline
            </span>
          </div>
          <p className="install-banner-desc">
            Buka langsung dari layar utama HP tanpa kuota peramban web.
          </p>
          {!isOnline && (
            <span className="install-banner-offline-alert">
              <WifiOff size={11} /> Internet terputus — Fitur offline aktif
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="install-banner-actions">
          <button
            type="button"
            id="btn-banner-install"
            className="btn-banner-primary"
            onClick={handleInstallClick}
            aria-label="Pasang SiPIO ke Layar Utama Ponsel"
          >
            <Download size={15} />
            <span>Pasang</span>
          </button>
          
          <button
            type="button"
            id="btn-banner-dismiss"
            className="btn-banner-close"
            onClick={handleDismiss}
            aria-label="Tutup saran pemasangan"
            title="Tutup banner"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
