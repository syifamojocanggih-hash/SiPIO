import React, { useState, useEffect } from 'react'
import { Settings, X, Save, AlertCircle } from 'lucide-react'

export function SettingsModal({ thresholds, onSave, onClose, triggerHaptic }) {
  const [formData, setFormData] = useState({ ...thresholds })

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

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: Number(value)
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    triggerHaptic(50)
    onSave(formData)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} className="text-cyan" />
            <h3 id="settings-title" style={{ fontSize: '1.05rem', fontWeight: '700' }}>
              Pengaturan Ambang Batas Sistem (D-06)
            </h3>
          </div>
          <button 
            type="button" 
            id="btn-close-settings"
            className="icon-btn" 
            onClick={onClose}
            aria-label="Tutup Pengaturan"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Suhu Min & Max */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="temp_min">Batas Bawah Suhu (°C):</label>
                <input
                  id="temp_min"
                  type="number"
                  step="0.5"
                  className="form-input"
                  value={formData.temp_min}
                  onChange={(e) => handleChange('temp_min', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="temp_max">Batas Atas Suhu (°C):</label>
                <input
                  id="temp_max"
                  type="number"
                  step="0.5"
                  className="form-input"
                  value={formData.temp_max}
                  onChange={(e) => handleChange('temp_max', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Jeda Minimal & Durasi Default */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="min_gap_min">Jeda Minimal Pakan (Menit):</label>
                <input
                  id="min_gap_min"
                  type="number"
                  min="5"
                  max="360"
                  className="form-input"
                  value={formData.min_gap_min}
                  onChange={(e) => handleChange('min_gap_min', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="default_duration_ms">Durasi Buka Default (ms):</label>
                <input
                  id="default_duration_ms"
                  type="number"
                  step="100"
                  min="500"
                  max="10000"
                  className="form-input"
                  value={formData.default_duration_ms}
                  onChange={(e) => handleChange('default_duration_ms', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Timeout Offline & Interval Kamera */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="offline_after_s">Deteksi Offline (Detik):</label>
                <input
                  id="offline_after_s"
                  type="number"
                  min="10"
                  max="300"
                  className="form-input"
                  value={formData.offline_after_s}
                  onChange={(e) => handleChange('offline_after_s', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="camera_interval_s">Interval Kamera (Detik):</label>
                <input
                  id="camera_interval_s"
                  type="number"
                  min="60"
                  max="3600"
                  className="form-input"
                  value={formData.camera_interval_s}
                  onChange={(e) => handleChange('camera_interval_s', e.target.value)}
                  required
                />
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Parameter ini disimpan ke database FastAPI dan disinkronkan langsung via pesan retained MQTT (`fish/feeder01/cfg/thresholds`) ke memori mikrokontroler.
            </p>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              id="btn-cancel-settings"
              className="btn-secondary" 
              onClick={onClose}
            >
              Batal
            </button>
            <button 
              type="submit" 
              id="btn-save-settings"
              className="btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={16} />
              <span>Simpan Parameter</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
