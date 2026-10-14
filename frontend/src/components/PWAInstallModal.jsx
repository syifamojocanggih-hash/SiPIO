import React, { useEffect } from 'react'
import { Download, X, Share, PlusSquare, CheckCircle, WifiOff, Zap } from 'lucide-react'

export function PWAInstallModal({ pwaState, onClose }) {
  const { platform, promptInstall, triggerHaptic } = pwaState

  // Keyboard accessibility: Escape closes modal (R-32)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleAction = () => {
    triggerHaptic(50)
    promptInstall()
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="pwa-install-title">
      <div className="modal-box pwa-install-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="pwa-install-title" className="card-title">
            <Download size={20} className="text-cyan" />
            Pasang Aplikasi SiPio (PWA)
          </h2>
          <button
            type="button"
            className="alert-dismiss-btn"
            onClick={onClose}
            aria-label="Tutup petunjuk pemasangan"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* App Preview Card */}
          <div className="pwa-preview-card">
            <div className="pwa-preview-icon">
              <img src="/sipio-icon.svg" alt="SiPio Logo" width="48" height="48" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>SiPio IoT</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sistem Pemberi Pakan Ikan Otomatis</p>
              <span className="pwa-badge-offline">
                <CheckCircle size={12} /> Siap Digunakan Offline di Kolam
              </span>
            </div>
          </div>

          {/* Benefits */}
          <div className="pwa-benefits-list">
            <div className="pwa-benefit-item">
              <Zap size={16} className="text-cyan" />
              <span>Akses instan dari Layar Utama ponsel tanpa perlu membuka peramban web.</span>
            </div>
            <div className="pwa-benefit-item">
              <WifiOff size={16} className="text-cyan" />
              <span>Dapat dibuka di area tambak/kolam dengan sinyal internet minim (cache mandiri).</span>
            </div>
          </div>

          {/* Platform Specific Instructions */}
          {platform === 'ios' ? (
            <div className="pwa-steps-box">
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
                Langkah Pemasangan di iPhone / iPad (Safari):
              </h4>
              <ol className="pwa-steps-list">
                <li>
                  <Share size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Tekan tombol <strong>Bagikan (Share)</strong> di bilah bawah peramban Safari.
                </li>
                <li>
                  <PlusSquare size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Gulir ke bawah dan pilih <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.
                </li>
                <li>
                  Tekan <strong>"Tambah" (Add)</strong> di pojok kanan atas. SiPio siap digunakan!
                </li>
              </ol>
            </div>
          ) : (
            <div className="pwa-steps-box">
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
                Langkah Pemasangan di Android / Chrome:
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Klik tombol <strong>"Pasang Sekarang"</strong> di bawah untuk menambahkan ikon SiPio langsung ke layar aplikasi ponsel Anda.
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Nanti Saja
          </button>
          {platform !== 'ios' && (
            <button type="button" className="btn-primary" onClick={handleAction}>
              Pasang Sekarang
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
