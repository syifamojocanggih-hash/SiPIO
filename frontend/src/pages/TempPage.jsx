import React, { useState, useMemo } from 'react'
import {
  TrendingUp,
  Thermometer,
  CheckCircle2,
  Info,
  Droplets,
  Activity,
  Check,
  ArrowDown,
  ArrowUp
} from 'lucide-react'
import { TempChart } from '../components/TempChart'
import { AQUARIUM_FISH_PRESETS } from '../utils/formatters'

export function TempPage({ telemetry, thresholds, tempHistory, onApplyThresholds }) {
  const [appliedPresetMsg, setAppliedPresetMsg] = useState('')
  const currentTemp = telemetry.temp
  const isTempCold = currentTemp < thresholds.temp_min
  const isTempHot = currentTemp > thresholds.temp_max

  let tempStatusClass = 'success'
  let tempStatusLabel = 'Suhu Optimal'
  let tempDescription = 'Metabolisme dan nafsu makan ikan hias berada pada kondisi ideal di dalam ruangan.'

  if (isTempCold) {
    tempStatusClass = 'warning'
    tempStatusLabel = 'Suhu Terlalu Dingin'
    tempDescription = 'Suhu air rendah (kemungkinan pengaruh AC kamar). Pencernaan ikan melambat, pertimbangkan menyalakan heater akuarium atau kurangi takaran pelet.'
  } else if (isTempHot) {
    tempStatusClass = 'danger'
    tempStatusLabel = 'Suhu Terlalu Panas'
    tempDescription = 'Oksigen terlarut menurun saat air hangat. Nyalakan aerasi tambahan, buka tutup atas akuarium, dan tunda pemberian pakan berlebih.'
  }

  // Hitung statistik nyata (rata-rata, min & jam terjadinya, max & jam terjadinya) dari dataset 24 jam
  const stats24h = useMemo(() => {
    const list = tempHistory?.['24h'] || []
    if (list.length === 0) {
      return {
        avg: currentTemp.toFixed(1),
        minVal: currentTemp.toFixed(1),
        minTime: null,
        maxVal: currentTemp.toFixed(1),
        maxTime: null,
        inSafeCount: 0,
        totalCount: 0
      }
    }

    let minItem = list[0]
    let maxItem = list[0]
    let sum = 0
    let inSafeCount = 0

    for (const pt of list) {
      sum += pt.temp
      if (pt.temp < minItem.temp) minItem = pt
      if (pt.temp > maxItem.temp) maxItem = pt
      if (pt.temp >= thresholds.temp_min && pt.temp <= thresholds.temp_max) {
        inSafeCount += 1
      }
    }

    return {
      avg: (sum / list.length).toFixed(1),
      minVal: minItem.temp.toFixed(1),
      minTime: minItem.time,
      maxVal: maxItem.temp.toFixed(1),
      maxTime: maxItem.time,
      inSafeCount,
      totalCount: list.length
    }
  }, [tempHistory, currentTemp, thresholds.temp_min, thresholds.temp_max])

  const activePreset = AQUARIUM_FISH_PRESETS.find(
    (p) => Number(thresholds.temp_min) === p.min && Number(thresholds.temp_max) === p.max
  )

  const handleApplyPreset = (preset) => {
    if (!onApplyThresholds) return
    onApplyThresholds({
      ...thresholds,
      temp_min: preset.min,
      temp_max: preset.max
    })
    setAppliedPresetMsg(`Batas aman disetel untuk ${preset.name} (${preset.min}°-${preset.max}°C)`)
    setTimeout(() => setAppliedPresetMsg(''), 3500)
  }

  return (
    <div className="page-view animate-fade-in" id="page-temp">
      {/* 1. Page Header */}
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-title-row">
            <div className="page-icon-badge temp">
              <TrendingUp size={20} />
            </div>
            <h1 className="page-title">Tren & Analisis Suhu Air</h1>
            <span className={`page-status-badge ${tempStatusClass}`}>
              <span className="pulse-indicator" />
              {tempStatusLabel}
            </span>
          </div>
          <p className="page-subtitle">
            Pemantauan fluktuasi suhu air akuarium terhadap perubahan suhu ruangan sepanjang hari
          </p>
        </div>

        <div className="page-header-stats">
          <div className="header-stat-chip">
            <span className="stat-chip-label">Batas Aman</span>
            <span className="stat-chip-val font-mono">{thresholds.temp_min}°C - {thresholds.temp_max}°C</span>
          </div>
          <div className="header-stat-chip">
            <span className="stat-chip-label">Profil Akuarium</span>
            <span className="stat-chip-val text-cyan">
              {activePreset ? activePreset.name.split(' (')[0] : 'Kustom'}
            </span>
          </div>
        </div>
      </div>

      {appliedPresetMsg && (
        <div className="save-success-toast" role="status" aria-live="polite" style={{ alignSelf: 'flex-start' }}>
          <CheckCircle2 size={16} />
          <span>{appliedPresetMsg}</span>
        </div>
      )}

      {/* 2. Temperature Highlight Cards */}
      <div className="temp-summary-grid">
        <div className="card temp-stat-card primary">
          <div className="temp-stat-header">
            <span className="temp-stat-label">Suhu Air Saat Ini</span>
            <Thermometer size={20} className="text-cyan" />
          </div>
          <div className="temp-stat-num-row">
            <span className="temp-stat-num">{currentTemp.toFixed(1)}</span>
            <span className="temp-stat-unit">°C</span>
          </div>
          <div className="temp-stat-badge-row">
            <span className={`status-tag ${tempStatusClass}`}>{tempStatusLabel}</span>
          </div>
        </div>

        <div className="card temp-stat-card">
          <div className="temp-stat-header">
            <span className="temp-stat-label">Rata-rata 24 Jam</span>
            <Activity size={18} className="text-dim" />
          </div>
          <div className="temp-stat-num-row">
            <span className="temp-stat-num">{stats24h.avg}</span>
            <span className="temp-stat-unit">°C</span>
          </div>
          <span className="temp-stat-sub">
            {stats24h.totalCount > 0
              ? `${stats24h.inSafeCount} dari ${stats24h.totalCount} titik dalam batas aman`
              : 'Menunggu data riwayat'}
          </span>
        </div>

        <div className="card temp-stat-card">
          <div className="temp-stat-header">
            <span className="temp-stat-label">Suhu Minimum (24 Jam)</span>
            <ArrowDown size={16} className="text-cyan" />
          </div>
          <div className="temp-stat-num-row">
            <span className="temp-stat-num text-cyan">{stats24h.minVal}</span>
            <span className="temp-stat-unit">°C</span>
          </div>
          <span className="temp-stat-sub">
            {stats24h.minTime ? `Tercatat pukul ${stats24h.minTime}` : 'Belum ada data historis'}
          </span>
        </div>

        <div className="card temp-stat-card">
          <div className="temp-stat-header">
            <span className="temp-stat-label">Suhu Maksimum (24 Jam)</span>
            <ArrowUp size={16} className="text-amber" />
          </div>
          <div className="temp-stat-num-row">
            <span className="temp-stat-num text-amber">{stats24h.maxVal}</span>
            <span className="temp-stat-unit">°C</span>
          </div>
          <span className="temp-stat-sub">
            {stats24h.maxTime ? `Tercatat pukul ${stats24h.maxTime}` : 'Belum ada data historis'}
          </span>
        </div>
      </div>

      {/* 3. Main Chart */}
      <div className="temp-chart-wrapper">
        <TempChart thresholds={thresholds} historyData={tempHistory} />
      </div>

      {/* 4. Profil Suhu Ikan Hias Akuarium (Interaktif 1-Klik) & Panduan Pakan */}
      <div className="temp-guide-grid">
        <div className="card guide-card">
          <div className="guide-card-header">
            <Droplets size={18} className="text-cyan" />
            <div>
              <h3 className="guide-title">Profil Ikan Hias Akuarium</h3>
              <p className="card-subtitle">Klik "Terapkan" untuk langsung menyetel batas suhu alarm sesuai ikan Anda</p>
            </div>
          </div>

          <div className="fish-preset-list">
            {AQUARIUM_FISH_PRESETS.map((preset) => {
              const isActive = activePreset?.id === preset.id
              return (
                <div key={preset.id} className={`fish-preset-row ${isActive ? 'active' : ''}`}>
                  <div className="fish-preset-info">
                    <div className="fish-preset-title">
                      <strong>{preset.name}</strong>
                      <span className="fish-preset-range font-mono">
                        {preset.min}° - {preset.max}°C (Ideal {preset.ideal})
                      </span>
                    </div>
                    <p className="fish-preset-note">{preset.note}</p>
                  </div>

                  <button
                    type="button"
                    className={`fish-preset-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleApplyPreset(preset)}
                    disabled={isActive}
                    aria-label={`Terapkan batas suhu ${preset.name}`}
                  >
                    {isActive ? (
                      <>
                        <Check size={14} />
                        <span>Aktif</span>
                      </>
                    ) : (
                      <span>Terapkan</span>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card guide-card">
          <div className="guide-card-header">
            <Info size={18} className="text-cyan" />
            <h3 className="guide-title">Dampak Suhu Ruangan Terhadap Pakan</h3>
          </div>
          <p className="guide-desc" style={{ marginBottom: '12px' }}>
            {tempDescription}
          </p>
          <ul className="guide-list">
            <li>
              <CheckCircle2 size={16} className="text-emerald guide-icon" />
              <div>
                <strong>Suhu &lt; {thresholds.temp_min}°C (Terlalu Dingin):</strong> Sistem SiPIO memberi peringatan dini agar Anda memeriksa suhu AC atau heater akuarium, serta mencegah penumpukan pakan tidak tercerna.
              </div>
            </li>
            <li>
              <CheckCircle2 size={16} className="text-emerald guide-icon" />
              <div>
                <strong>Suhu &gt; {thresholds.temp_max}°C (Terlalu Panas):</strong> Kadar oksigen dalam air berkurang. Disarankan menambah aerasi atau membuka tutup atas akuarium dan menunda pakan tambahan.
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
