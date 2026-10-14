import React, { useState } from 'react'
import { Sliders, RefreshCw, AlertTriangle, CheckCircle, Wifi, WifiOff, Camera, Droplets, Thermometer, Play } from 'lucide-react'

export function SimulationBar({
  telemetry,
  setTelemetry,
  espStatus,
  setEspStatus,
  camStatus,
  setCamStatus,
  onTriggerFeed,
  onResetData,
  triggerHaptic
}) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleOpen = () => {
    triggerHaptic(30)
    setIsOpen(!isOpen)
  }

  // Toggle Float Switch Level
  const handleToggleLevel = () => {
    triggerHaptic(40)
    setTelemetry((prev) => ({
      ...prev,
      level_ok: !prev.level_ok,
      timestamp: Date.now()
    }))
  }

  // Set predefined temperature
  const handleSetTemp = (targetTemp) => {
    triggerHaptic(40)
    setTelemetry((prev) => ({
      ...prev,
      temp: targetTemp,
      timestamp: Date.now()
    }))
  }

  // Toggle ESP8266 Feeder
  const handleToggleEsp = () => {
    triggerHaptic(40)
    const nextState = !espStatus.online
    setEspStatus((prev) => ({
      ...prev,
      online: nextState,
      rssi: nextState ? -61 : -99
    }))
    setTelemetry((prev) => ({
      ...prev,
      esp_online: nextState
    }))
  }

  // Toggle ESP32-CAM
  const handleToggleCam = () => {
    triggerHaptic(40)
    const nextState = !camStatus.online
    setCamStatus({ online: nextState })
    setTelemetry((prev) => ({
      ...prev,
      cam_online: nextState
    }))
  }

  // Trigger simulated automatic feed event
  const handleSimulateAutoFeed = () => {
    triggerHaptic(50)
    onTriggerFeed({
      source: 'Jadwal Otomatis (Simulasi)',
      duration_ms: 2000,
      result: telemetry.level_ok ? 'done' : 'skipped',
      reason: telemetry.level_ok 
        ? 'Eksekusi servo sukses tepat waktu (deviasi 0.5s)' 
        : 'Pakan dibatalkan: Sensor level air mendeteksi air rendah'
    })
  }

  return (
    <div className="simulation-bar-container" aria-label="Panel Simulasi Uji IoT">
      <div className="simulation-bar-header">
        <button
          type="button"
          id="btn-toggle-simulation-bar"
          className="simulation-toggle-btn"
          onClick={toggleOpen}
          aria-expanded={isOpen}
          aria-controls="simulation-controls-body"
        >
          <Sliders size={15} />
          <span>Panel Simulasi IoT Browser</span>
          <span className="simulation-badge-pill">
            {isOpen ? 'Tutup Kontrol' : 'Buka Pengujian Interaktif'}
          </span>
        </button>
      </div>

      {isOpen && (
        <div id="simulation-controls-body" className="simulation-bar-body">
          <p className="simulation-guide-text">
            Gunakan kontrol di bawah ini untuk menguji respons antarmuka (kartu metrik, status proteksi, grafik, & banner peringatan) secara langsung di browser:
          </p>

          <div className="simulation-grid">
            {/* 1. Level Air Simulator */}
            <div className="simulation-card">
              <div className="simulation-card-title">
                <Droplets size={16} className="text-cyan" />
                <span>Sensor Level Air (Float Switch)</span>
              </div>
              <p className="simulation-card-desc">Uji proteksi servo saat air kolam surut.</p>
              <button
                type="button"
                className={`simulation-action-btn ${telemetry.level_ok ? 'active-green' : 'active-red'}`}
                onClick={handleToggleLevel}
              >
                {telemetry.level_ok ? 'Status: Normal (Aman Beri Pakan)' : 'Status: Rendah (Pakan Terkunci!)'}
              </button>
            </div>

            {/* 2. Suhu Air Simulator */}
            <div className="simulation-card">
              <div className="simulation-card-title">
                <Thermometer size={16} className="text-cyan" />
                <span>Sensor Suhu (DS18B20)</span>
              </div>
              <p className="simulation-card-desc">Uji batas ideal (24°-32°C).</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`sim-chip-btn ${telemetry.temp < 24 ? 'active' : ''}`}
                  onClick={() => handleSetTemp(21.5)}
                >
                  Dingin (21.5°C)
                </button>
                <button
                  type="button"
                  className={`sim-chip-btn ${telemetry.temp >= 24 && telemetry.temp <= 32 ? 'active' : ''}`}
                  onClick={() => handleSetTemp(28.4)}
                >
                  Optimal (28.4°C)
                </button>
                <button
                  type="button"
                  className={`sim-chip-btn ${telemetry.temp > 32 ? 'active' : ''}`}
                  onClick={() => handleSetTemp(34.2)}
                >
                  Panas (34.2°C)
                </button>
              </div>
            </div>

            {/* 3. Koneksi Hardware Simulator */}
            <div className="simulation-card">
              <div className="simulation-card-title">
                <Wifi size={16} className="text-cyan" />
                <span>Konektivitas Alat</span>
              </div>
              <p className="simulation-card-desc">Uji deteksi perangkat offline / online.</p>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className={`sim-chip-btn ${espStatus.online ? 'active' : 'warn'}`}
                  onClick={handleToggleEsp}
                >
                  ESP8266: {espStatus.online ? 'Online' : 'Offline'}
                </button>
                <button
                  type="button"
                  className={`sim-chip-btn ${camStatus.online ? 'active' : 'warn'}`}
                  onClick={handleToggleCam}
                >
                  Kamera: {camStatus.online ? 'Online' : 'Offline'}
                </button>
              </div>
            </div>

            {/* 4. Event Simulator */}
            <div className="simulation-card">
              <div className="simulation-card-title">
                <Play size={16} className="text-cyan" />
                <span>Simulasi Pakan Otomatis</span>
              </div>
              <p className="simulation-card-desc">Picukan jadwal pakan tanpa menunggu jamnya.</p>
              <button
                type="button"
                className="simulation-action-btn"
                style={{ backgroundColor: 'var(--accent-primary)', color: '#ffffff', border: 'none' }}
                onClick={handleSimulateAutoFeed}
              >
                Picukan Eksekusi Jadwal Sekarang
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              type="button"
              className="camera-btn"
              onClick={onResetData}
              style={{ fontSize: '0.78rem' }}
            >
              <RefreshCw size={14} />
              <span>Reset Semua Data Simulasi</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
