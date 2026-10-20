import React, { useState, useEffect } from 'react'
import {
  Download,
  X,
  Share,
  PlusSquare,
  CheckCircle,
  WifiOff,
  Zap,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react'

export function PWAInstallModal({ pwaState, onClose }) {
  const {
    platform,
    browserInfo,
    hasNativePrompt,
    promptInstall,
    triggerHaptic,
    isInstalled
  } = pwaState

  const [feedback, setFeedback] = useState(null)
  const [copied, setCopied] = useState(false)
  const [isAttempting, setIsAttempting] = useState(false)

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

  const handleAction = async () => {
    triggerHaptic(50)
    setIsAttempting(true)
    const result = await promptInstall()
    setIsAttempting(false)

    if (result?.triggered) {
      if (result.outcome === 'accepted') {
        setFeedback({
          type: 'success',
          message: 'Pemasangan berhasil disetujui. SiPIO sedang ditambahkan ke perangkat Anda.'
        })
      } else {
        setFeedback({
          type: 'info',
          message: 'Pemasangan ditunda. Anda dapat memasang aplikasi kapan saja melalui menu ini.'
        })
      }
    } else {
      // Browser did not expose native prompt directly, show precise visual instruction
      setFeedback({
        type: 'warn',
        message:
          platform === 'desktop'
            ? 'Peramban web Anda memerlukan pemasangan manual: Klik ikon pasang (panah ⬇ atau monitor 🖥) di ujung kanan bilah alamat (URL bar) atas, atau menu titik tiga (⋮) lalu pilih Pasang SiPIO.'
            : 'Peramban web Anda memerlukan pemasangan manual: Ketuk menu titik tiga (⋮) di pojok kanan atas browser Chrome lalu pilih Pasang Aplikasi.'
      })
    }
  }

  const handleCopyLink = () => {
    triggerHaptic(30)
    try {
      navigator.clipboard.writeText(window.location.origin)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
    >
      <div className="modal-box pwa-install-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="pwa-install-title" className="card-title">
            <Download size={20} className="text-cyan" />
            {platform === 'desktop' ? 'Pasang SiPIO di Komputer / Laptop' : 'Pasang Aplikasi SiPIO (PWA)'}
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
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>SiPIO IoT</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Sistem Pemantau & Pemberi Pakan Ikan Otomatis
              </p>
              <span className="pwa-badge-offline">
                <CheckCircle size={12} /> Siap Digunakan Offline di Kolam
              </span>
            </div>
          </div>

          {/* Benefits */}
          <div className="pwa-benefits-list">
            <div className="pwa-benefit-item">
              <Zap size={16} className="text-cyan" />
              <span>
                {platform === 'desktop'
                  ? 'Akses cepat langsung dari Desktop atau Taskbar tanpa perlu membuka peramban web.'
                  : 'Akses instan dari Layar Utama ponsel tanpa perlu membuka peramban web.'}
              </span>
            </div>
            <div className="pwa-benefit-item">
              <WifiOff size={16} className="text-cyan" />
              <span>
                Dapat dibuka di area tambak atau kolam dengan sinyal internet minim (cache lokal mandiri).
              </span>
            </div>
          </div>

          {/* Feedback Alert if user clicked or status changed */}
          {feedback && (
            <div className={`pwa-feedback-alert ${feedback.type}`} role="status">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{feedback.message}</div>
            </div>
          )}

          {/* Platform Specific Instructions */}
          {isInstalled ? (
            <div className="pwa-steps-box" style={{ borderColor: 'var(--status-emerald)' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--status-emerald)', marginBottom: '4px' }}>
                Aplikasi SiPIO Sudah Terpasang!
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                SiPIO sudah terpasang di perangkat ini dan siap digunakan dalam mode mandiri (standalone).
              </p>
            </div>
          ) : platform === 'ios' ? (
            <div className="pwa-steps-box">
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
                Langkah Pemasangan di iPhone / iPad (Safari):
              </h4>
              <ol className="pwa-steps-list">
                <li>
                  <Share size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Tekan tombol <strong>Bagikan (Share)</strong> di bilah bawah peramban Safari.
                </li>
                <li>
                  <PlusSquare size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Gulir ke bawah dan pilih <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.
                </li>
                <li>
                  Tekan <strong>"Tambah" (Add)</strong> di pojok kanan atas. SiPIO siap digunakan di ponsel Anda!
                </li>
              </ol>
            </div>
          ) : platform === 'desktop' ? (
            <div className="pwa-steps-box">
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>
                {hasNativePrompt
                  ? 'Konfirmasi Pemasangan Desktop:'
                  : 'Langkah Pemasangan di PC / Laptop (Chrome / Edge):'}
              </h4>

              {hasNativePrompt ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                  Peramban Anda siap memasang SiPIO ke Desktop. Klik tombol <strong>"Pasang Sekarang"</strong> di bawah untuk membuka dialog konfirmasi peramban.
                </p>
              ) : (
                <>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginBottom: '8px' }}>
                    Di peramban desktop seperti Google Chrome atau Microsoft Edge, pasang aplikasi melalui bilah alamat:
                  </p>

                  {/* Visual mockup of the URL bar install button */}
                  <div className="pwa-url-bar-mockup" title="Contoh lokasi ikon pasang di bilah alamat browser Anda">
                    <div className="pwa-url-bar-left">
                      <span>🔒</span>
                      <span>localhost:5173</span>
                    </div>
                    <div className="pwa-url-bar-actions">
                      <span className="pwa-mock-install-pill">
                        <Download size={12} />
                        <span>Pasang / Install</span>
                      </span>
                      <span>⭐</span>
                      <span>⋮</span>
                    </div>
                  </div>

                  <ol className="pwa-steps-list">
                    <li>
                      Perhatikan bagian kanan <strong>Bilah Alamat (URL Bar)</strong> browser Anda di bagian atas layar.
                    </li>
                    <li>
                      Klik ikon <strong>Pasang / Install</strong> (ikon komputer dengan panah ke bawah atau tombol <em>Install SiPIO</em>).
                    </li>
                    <li>
                      <em>Atau</em> klik menu <strong>Titik Tiga (⋮)</strong> di pojok kanan atas browser lalu pilih <strong>"Pasang SiPIO..."</strong> (Install SiPIO).
                    </li>
                    <li>
                      Klik <strong>"Pasang" (Install)</strong> pada pop-up konfirmasi. SiPIO akan terbuka di jendela mandiri!
                    </li>
                  </ol>
                </>
              )}

              {browserInfo?.isFirefox && (
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Catatan: Firefox desktop belum mendukung pemasangan aplikasi PWA secara langsung. Buka tautan ini di Chrome atau Edge untuk memasang aplikasi.
                </p>
              )}
            </div>
          ) : (
            <div className="pwa-steps-box">
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
                Langkah Pemasangan di Android (Chrome):
              </h4>
              {hasNativePrompt ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                  Klik tombol <strong>"Pasang Sekarang"</strong> di bawah untuk menambahkan ikon SiPIO langsung ke layar aplikasi ponsel Anda.
                </p>
              ) : (
                <ol className="pwa-steps-list">
                  <li>
                    Ketuk menu <strong>Titik Tiga (⋮)</strong> di pojok kanan atas peramban Chrome.
                  </li>
                  <li>
                    Pilih menu <strong>"Pasang Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.
                  </li>
                  <li>
                    Ketuk <strong>"Pasang"</strong> untuk mengonfirmasi penambahan ikon ke layar ponsel.
                  </li>
                </ol>
              )}
            </div>
          )}

          {/* Copy Link Utility for convenience */}
          <div className="pwa-actions-row">
            <button
              type="button"
              className="pwa-copy-btn"
              onClick={handleCopyLink}
              title="Salin alamat web SiPIO ke papan klip"
            >
              {copied ? <Check size={14} style={{ color: 'var(--status-emerald)' }} /> : <Copy size={14} />}
              <span>{copied ? 'Link Tersalin!' : 'Salin Alamat SiPIO'}</span>
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {isInstalled || platform === 'ios' ? 'Tutup' : 'Nanti Saja'}
          </button>

          {!isInstalled && platform !== 'ios' && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleAction}
              disabled={isAttempting}
            >
              <Download size={15} />
              <span>
                {isAttempting
                  ? 'Menghubungkan...'
                  : hasNativePrompt
                  ? 'Pasang Sekarang'
                  : 'Coba Pasang Otomatis'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
