import React, { useState } from 'react'
import {
  Settings,
  Sliders,
  ShieldCheck,
  Save,
  RotateCcw,
  Sun,
  Moon,
  Wifi,
  CheckCircle2,
  Database
} from 'lucide-react'

export function SettingsPage({
  thresholds,
  onSaveThresholds,
  theme,
  toggleTheme,
  espStatus,
  camStatus,
  backendConnection,
  onResetCooldown,
  onResetData,
  triggerHaptic
}) {
  const [formData, setFormData] = useState({ ...thresholds })
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: Number(value)
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (triggerHaptic) triggerHaptic(50)
    onSaveThresholds(formData)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  return (
    <div className="page-view animate-fade-in" id="page-settings">
      {/* 1. Page Header */}
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-title-row">
            <div className="page-icon-badge settings">
              <Settings size={20} />
            </div>
            <h1 className="page-title">Setelan & Konfigurasi Sistem</h1>
            <span className="page-status-badge">
              <span className="pulse-indicator" />
              SiPIO v1.3
            </span>
          </div>
          <p className="page-subtitle">
            Konfigurasi ambang batas alarm suhu kolam, durasi servo dispenser, preferensi tema, dan integrasi hardware
          </p>
        </div>

        {saveSuccess && (
          <div className="save-success-toast">
            <CheckCircle2 size={16} />
            <span>Pengaturan berhasil disimpan!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="settings-page-form">
        {/* Section 1: Ambang Batas Sensor & Keamanan */}
        <div className="card settings-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Sliders size={18} className="text-cyan" />
                Ambang Batas Suhu Air (DS18B20)
              </h2>
              <p className="card-subtitle">
                Alarm peringatan otomatis akan dipicu jika suhu air kolam melewati batas ini
              </p>
            </div>
          </div>

          <div className="settings-grid-cols">
            <div className="form-group">
              <label className="form-label" htmlFor="set_temp_min">
                Batas Bawah Suhu (°C):
              </label>
              <input
                id="set_temp_min"
                type="number"
                step="0.5"
                className="form-input"
                value={formData.temp_min}
                onChange={(e) => handleChange('temp_min', e.target.value)}
                required
              />
              <span className="form-help-text">Rekomendasi: 24.0°C untuk ikan tropis air tawar</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="set_temp_max">
                Batas Atas Suhu (°C):
              </label>
              <input
                id="set_temp_max"
                type="number"
                step="0.5"
                className="form-input"
                value={formData.temp_max}
                onChange={(e) => handleChange('temp_max', e.target.value)}
                required
              />
              <span className="form-help-text">Rekomendasi: 32.0°C (di atas ini nafsu makan turun drastis)</span>
            </div>
          </div>
        </div>

        {/* Section 2: Parameter Dispenser Pakan (Servo & Cooldown) */}
        <div className="card settings-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <ShieldCheck size={18} className="text-cyan" />
                Parameter Dispenser Pakan (Servo)
              </h2>
              <p className="card-subtitle">
                Atur jeda keselamatan pencegah overfeeding dan durasi putaran katup servo
              </p>
            </div>
          </div>

          <div className="settings-grid-cols">
            <div className="form-group">
              <label className="form-label" htmlFor="set_min_gap_min">
                Jeda Minimal Pakan (Safety Cooldown):
              </label>
              <div className="input-with-suffix">
                <input
                  id="set_min_gap_min"
                  type="number"
                  min="5"
                  max="360"
                  className="form-input"
                  value={formData.min_gap_min}
                  onChange={(e) => handleChange('min_gap_min', e.target.value)}
                  required
                />
                <span className="input-suffix">Menit</span>
              </div>
              <span className="form-help-text">Standar keamanan kolam: 30 menit antar sesi pakan</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="set_default_duration_ms">
                Durasi Buka Servo Default:
              </label>
              <div className="input-with-suffix">
                <input
                  id="set_default_duration_ms"
                  type="number"
                  min="500"
                  max="10000"
                  step="250"
                  className="form-input"
                  value={formData.default_duration_ms}
                  onChange={(e) => handleChange('default_duration_ms', e.target.value)}
                  required
                />
                <span className="input-suffix">ms</span>
              </div>
              <span className="form-help-text">2000 ms ≈ setara 20 gram pelet pakan apung</span>
            </div>
          </div>
        </div>

        {/* Section 3: Preferensi Tema & Tampilan */}
        <div className="card settings-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Sun size={18} className="text-cyan" />
                Preferensi Tampilan & Pengguna
              </h2>
              <p className="card-subtitle">
                Sesuaikan tema kontras tinggi untuk pengamatan di bawah sinar matahari luar ruangan
              </p>
            </div>
          </div>

          <div className="theme-toggle-row">
            <div className="theme-toggle-info">
              <span className="theme-current-label">
                Mode Aktif: <strong>{theme === 'dark' ? 'Mode Malam (Gelap)' : 'Mode Siang Kolam (Terang)'}</strong>
              </span>
              <p className="theme-current-desc">
                {theme === 'dark'
                  ? 'Hemat baterai pada layar AMOLED & nyaman di malam hari'
                  : 'Kontras tinggi WCAG AAA untuk keterbacaan optimal di bawah terik matahari'}
              </p>
            </div>

            <button
              type="button"
              className="theme-switch-btn"
              onClick={() => {
                if (triggerHaptic) triggerHaptic(30)
                toggleTheme()
              }}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === 'dark' ? 'Ganti ke Mode Siang' : 'Ganti ke Mode Malam'}</span>
            </button>
          </div>
        </div>

        {/* Section 4: Konektivitas Hardware & IoT */}
        <div className="card settings-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Wifi size={18} className="text-cyan" />
                Integrasi Jaringan & Perangkat IoT
              </h2>
              <p className="card-subtitle">Status kanal komunikasi ESP8266, ESP32-CAM, dan FastAPI</p>
            </div>
          </div>

          <div className="settings-hw-list">
            <div className="hw-row">
              <div className="hw-info">
                <strong>FastAPI WebSocket Backend</strong>
                <span>ws://localhost:8000/ws</span>
              </div>
              <span className={`status-tag ${backendConnection?.isConnected ? 'success' : 'warning'}`}>
                {backendConnection?.isConnected ? 'Terhubung Live' : 'Mode Simulasi Browser'}
              </span>
            </div>

            <div className="hw-row">
              <div className="hw-info">
                <strong>ESP8266 Feeder Microcontroller</strong>
                <span>Sinyal Wi-Fi: {espStatus.online ? `${espStatus.rssi} dBm` : 'Offline'}</span>
              </div>
              <span className={`status-tag ${espStatus.online ? 'success' : 'danger'}`}>
                {espStatus.online ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="hw-row">
              <div className="hw-info">
                <strong>ESP32-CAM Video Streamer</strong>
                <span>Alamat Stream: /camera/pond_latest.jpg</span>
              </div>
              <span className={`status-tag ${camStatus.online ? 'success' : 'danger'}`}>
                {camStatus.online ? 'Aktif' : 'Mati'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 5: Pemeliharaan Data & Kalibrasi */}
        <div className="card settings-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Database size={18} className="text-cyan" />
                Pemeliharaan & Manajemen Data
              </h2>
              <p className="card-subtitle">Alat reset jeda keamanan dan data simulasi</p>
            </div>
          </div>

          <div className="maintenance-actions-row">
            <button
              type="button"
              className="btn-outline-warning"
              onClick={() => {
                if (window.confirm('Reset status cooldown pakan sekarang? (Tombol beri pakan akan langsung siap digunakan)')) {
                  onResetCooldown()
                }
              }}
            >
              <RotateCcw size={16} />
              <span>Reset Cooldown Pakan Sekarang</span>
            </button>

            <button
              type="button"
              className="btn-outline-danger"
              onClick={() => {
                if (window.confirm('PERINGATAN: Kembalikan semua data ke kondisi simulasi awal pabrik? Log dan jadwal yang tersimpan di localStorage akan di-reset.')) {
                  onResetData()
                }
              }}
            >
              <RotateCcw size={16} />
              <span>Reset Semua Data ke Default</span>
            </button>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="settings-submit-bar">
          <button type="submit" className="save-settings-btn">
            <Save size={18} />
            <span>Simpan Semua Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  )
}
