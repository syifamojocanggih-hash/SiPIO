import React from 'react'
import { AlertTriangle, X, ShieldAlert } from 'lucide-react'

export function AlertBanner({ alerts, onDismissAlert }) {
  if (!alerts || alerts.length === 0) return null

  // Show the highest priority alert first
  const currentAlert = alerts[0]
  // Jangan tampilkan tombol tutup/hapus jika peringatan bersifat berbahaya (kuning = warning, merah = danger)
  const isDangerous = currentAlert.type === 'warning' || currentAlert.type === 'danger'

  return (
    <div 
      className={`alert-banner ${currentAlert.type}`} 
      role="alert" 
      aria-live="assertive"
    >
      <div className="alert-content">
        {currentAlert.type === 'danger' ? (
          <ShieldAlert size={22} className="flex-shrink-0" />
        ) : (
          <AlertTriangle size={22} className="flex-shrink-0" />
        )}
        <div>
          <strong>{currentAlert.title}:</strong> {currentAlert.message}
        </div>
      </div>

      {!isDangerous && onDismissAlert && (
        <button 
          type="button" 
          className="alert-dismiss-btn" 
          onClick={() => onDismissAlert(currentAlert.id)}
          aria-label="Tutup Peringatan Ini"
          title="Tutup Peringatan"
        >
          <X size={18} />
        </button>
      )}
    </div>
  )
}
