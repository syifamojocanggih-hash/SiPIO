import React, { useState, useEffect, useMemo } from 'react'
import { Palmtree, Luggage, CheckCircle2, AlertTriangle, Sparkles, ShieldCheck, Clock, CheckSquare, Square, ArrowRight } from 'lucide-react'

export function VacationModeCard({
  vacationMode,
  onUpdateVacationMode,
  schedules,
  telemetry,
  triggerHaptic,
  liveHopperGrams
}) {
  // Local temporary form states when configuring
  const [days, setDays] = useState(vacationMode?.days || 4)
  const [ecoMode, setEcoMode] = useState(vacationMode?.ecoMode ?? true)
  const [hopperStock, setHopperStock] = useState(liveHopperGrams ?? vacationMode?.hopperStockGrams ?? 120)
  const [waterChecked, setWaterChecked] = useState(vacationMode?.waterCheckConfirmed ?? true)
  const [filterChecked, setFilterChecked] = useState(true)
  const [coverChecked, setCoverChecked] = useState(true)

  useEffect(() => {
    if (liveHopperGrams !== undefined) {
      setHopperStock(liveHopperGrams)
    }
  }, [liveHopperGrams])

  // Hitung perkiraan konsumsi harian dari jadwal pakan aktif
  const dailyFeedStats = useMemo(() => {
    const activeSchedules = schedules?.filter((s) => s.enabled) || []
    const totalDailyGramsNormal = activeSchedules.reduce((acc, s) => {
      const dur = Number(s.duration_ms) || 2000
      return acc + dur / 400 // ~400ms per gram
    }, 0) || 12 // Default fallback jika belum ada jadwal

    const multiplier = ecoMode ? 0.8 : 1.0
    const totalDailyGrams = Math.round(totalDailyGramsNormal * multiplier * 10) / 10
    const totalTripGrams = Math.round(totalDailyGrams * days)
    const isStockSufficient = hopperStock >= totalTripGrams
    const stockDeficit = Math.max(0, totalTripGrams - hopperStock)

    return {
      activeSchedulesCount: activeSchedules.length,
      totalDailyGramsNormal: Math.round(totalDailyGramsNormal * 10) / 10,
      totalDailyGrams,
      totalTripGrams,
      isStockSufficient,
      stockDeficit
    }
  }, [schedules, days, ecoMode, hopperStock])

  // Hitung tanggal kepulangan otomatis
  const returnDateStr = useMemo(() => {
    const returnDate = new Date()
    returnDate.setDate(returnDate.getDate() + Number(days))
    const idMonths = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    return `${dayNames[returnDate.getDay()]}, ${returnDate.getDate()} ${idMonths[returnDate.getMonth()]} ${returnDate.getFullYear()}`
  }, [days])

  // Aktifkan mode liburan
  const handleEnableVacation = () => {
    if (triggerHaptic) triggerHaptic(50)
    onUpdateVacationMode({
      enabled: true,
      days: Number(days),
      returnDate: returnDateStr,
      hopperStockGrams: Number(hopperStock),
      ecoMode,
      waterCheckConfirmed: waterChecked,
      activatedAt: new Date().toISOString()
    })
  }

  // Nonaktifkan mode liburan (sudah pulang)
  const handleDisableVacation = () => {
    if (triggerHaptic) triggerHaptic(40)
    onUpdateVacationMode({
      ...vacationMode,
      enabled: false
    })
  }

  const isWaterLow = !telemetry?.level_ok

  return (
    <article className={`card vacation-mode-card ${vacationMode?.enabled ? 'active-mode' : ''}`}>
      {/* 1. Header Card */}
      <div className="card-header vacation-card-header">
        <div className="vacation-header-left">
          <div className="vacation-icon-box">
            {vacationMode?.enabled ? <Palmtree size={20} className="text-emerald" /> : <Luggage size={20} className="text-cyan" />}
          </div>
          <div>
            <h2 className="card-title">
              <span>Mode Liburan Akuarium</span>
              {vacationMode?.enabled ? (
                <span className="vacation-badge active">Sedang Aktif</span>
              ) : (
                <span className="vacation-badge inactive">Siaga</span>
              )}
            </h2>
            <p className="card-subtitle">
              Pemeriksaan otomatis ketersediaan pakan & pengaman kualitas air saat bepergian keluar kota
            </p>
          </div>
        </div>

        {vacationMode?.enabled && (
          <button
            type="button"
            className="btn-vacation-stop"
            onClick={handleDisableVacation}
            title="Nonaktifkan mode liburan dan kembalikan porsi pakan ke 100%"
          >
            <span>Saya Sudah Pulang (Selesai)</span>
          </button>
        )}
      </div>

      {/* 2. Kondisi AKTIF: Tampilan Ringkasan Saat Ditinggal Liburan */}
      {vacationMode?.enabled ? (
        <div className="vacation-active-panel">
          <div className="vacation-active-grid">
            <div className="vacation-stat-box">
              <span className="vacation-stat-label">Durasi Ditinggal</span>
              <span className="vacation-stat-val font-mono">{vacationMode.days} Hari</span>
              <span className="vacation-stat-sub">Pulang: {vacationMode.returnDate}</span>
            </div>

            <div className="vacation-stat-box">
              <span className="vacation-stat-label">Porsi Hemat Liburan</span>
              <span className={`vacation-stat-val ${vacationMode.ecoMode ? 'text-emerald' : 'text-main'}`}>
                {vacationMode.ecoMode ? '-20% Porsi Hemat' : 'Normal (100%)'}
              </span>
              <span className="vacation-stat-sub">
                {vacationMode.ecoMode ? 'Air akuarium terlindungi dari keruh' : 'Porsi pakan standar harian'}
              </span>
            </div>

            <div className="vacation-stat-box">
              <span className="vacation-stat-label">Kebutuhan Pakan Total</span>
              <span className="vacation-stat-val font-mono">
                ~{dailyFeedStats.totalTripGrams} g
              </span>
              <span className="vacation-stat-sub">
                Dari stok wadah {vacationMode.hopperStockGrams}g (Aman ✅)
              </span>
            </div>

            <div className="vacation-stat-box">
              <span className="vacation-stat-label">Status Level Air</span>
              <span className={`vacation-stat-val ${isWaterLow ? 'text-rose' : 'text-emerald'}`}>
                {isWaterLow ? 'Surut (Pakan Di-Hold)' : 'Aman (Normal)'}
              </span>
              <span className="vacation-stat-sub">
                {isWaterLow ? 'Sensor float switch aktif menahan pakan' : 'Float switch mendeteksi air cukup'}
              </span>
            </div>
          </div>

          <div className="vacation-active-alert">
            <ShieldCheck size={18} className="text-emerald flex-shrink-0" />
            <p>
              <strong>Mode Liburan Berjalan Lancar:</strong> Jadwal otomatis tetap berjalan mandiri di memori lokal perangkat. Porsi pakan dikurangi 20% secara otomatis agar air akuarium tetap jernih dan kadar amonia stabil selama Anda tidak ada di rumah.
            </p>
          </div>
        </div>
      ) : (
        /* 3. Kondisi BELUM AKTIF: Formulir Perencanaan & Pre-Trip Checklist */
        <div className="vacation-config-panel">
          {/* Baris 1: Pilihan Durasi Liburan & Porsi Hemat */}
          <div className="vacation-form-row">
            <div className="vacation-form-group">
              <label className="vacation-label">
                <Clock size={15} className="text-cyan" />
                <span>Berapa hari Anda akan meninggalkan akuarium?</span>
              </label>
              <div className="vacation-days-selector">
                {[2, 3, 4, 5, 7, 10].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`vacation-day-pill ${days === d ? 'selected' : ''}`}
                    onClick={() => {
                      if (triggerHaptic) triggerHaptic(20)
                      setDays(d)
                    }}
                  >
                    {d} Hari
                  </button>
                ))}
                <div className="vacation-custom-days">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={days}
                    onChange={(e) => setDays(Math.max(1, Number(e.target.value)))}
                    className="form-input"
                    style={{ width: '80px', padding: '6px 8px', textAlign: 'center' }}
                    aria-label="Jumlah hari kustom"
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Hari</span>
                </div>
              </div>
              <p className="vacation-help-text">Perkiraan pulang: <strong>{returnDateStr}</strong></p>
            </div>

            <div className="vacation-form-group">
              <label className="vacation-label">
                <Sparkles size={15} className="text-cyan" />
                <span>Porsi Pakan Selama Liburan</span>
              </label>
              <div className="vacation-eco-box" onClick={() => setEcoMode(!ecoMode)}>
                <label className="switch" style={{ pointerEvents: 'none' }}>
                  <input type="checkbox" checked={ecoMode} readOnly />
                  <span className="slider" />
                </label>
                <div className="vacation-eco-text">
                  <strong>Porsi Hemat Liburan (-20%)</strong>
                  <p>Sangat disarankan menurunkan porsi 20% agar air akuarium tidak cepat keruh saat tidak ada orang di rumah.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Baris 2: Estimasi Ketersediaan Pelet Hopper */}
          <div className="vacation-calc-box">
            <div className="vacation-calc-header">
              <div className="vacation-calc-title">
                <Luggage size={16} className="text-cyan" />
                <strong>Kalkulasi Otomatis Pakan Liburan ({days} Hari)</strong>
              </div>
              <div className="vacation-stock-input-row">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Perkiraan stok pelet di wadah:</span>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={hopperStock}
                  onChange={(e) => setHopperStock(Math.max(0, Number(e.target.value)))}
                  className="form-input"
                  style={{ width: '75px', padding: '4px 8px', textAlign: 'center', fontWeight: 'bold' }}
                />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>gram</span>
              </div>
            </div>

            <div className="vacation-calc-result">
              <div className="calc-result-text">
                Kebutuhan pakan <strong>{days} hari</strong> = <strong>~{dailyFeedStats.totalTripGrams} gram</strong> (rata-rata {dailyFeedStats.totalDailyGrams}g/hari).
                Sisa pakan di wadah = <strong>{hopperStock} gram</strong>.
              </div>

              {dailyFeedStats.isStockSufficient ? (
                <div className="vacation-calc-badge success">
                  <CheckCircle2 size={16} />
                  <span>Aman ✅ (Stok pelet cukup, tersisa ~{hopperStock - dailyFeedStats.totalTripGrams}g saat pulang)</span>
                </div>
              ) : (
                <div className="vacation-calc-badge warning">
                  <AlertTriangle size={16} />
                  <span>Peringatan ⚠️ (Stok pakan kurang {dailyFeedStats.stockDeficit} gram! Segera isi wadah sebelum berangkat)</span>
                </div>
              )}
            </div>
          </div>

          {/* Baris 3: Pre-Trip Safety Checklist Khusus Akuarium Indoor */}
          <div className="vacation-checklist-card">
            <h4 className="checklist-heading">
              <ShieldCheck size={16} className="text-cyan" />
              <span>Daftar Pemeriksaan Sebelum Berangkat (Pre-Trip Checklist)</span>
            </h4>
            <div className="checklist-items">
              <div 
                className={`checklist-item ${waterChecked ? 'checked' : ''}`}
                onClick={() => setWaterChecked(!waterChecked)}
              >
                {waterChecked ? <CheckSquare size={18} className="text-emerald" /> : <Square size={18} className="text-dim" />}
                <div>
                  <strong>Pastikan air akuarium sudah diisi penuh</strong>
                  <p>Ruangan ber-AC atau lampu LED membuat air cepat menguap. Isi penuh agar pompa dan filter tidak kering saat ditinggal.</p>
                </div>
              </div>

              <div 
                className={`checklist-item ${filterChecked ? 'checked' : ''}`}
                onClick={() => setFilterChecked(!filterChecked)}
              >
                {filterChecked ? <CheckSquare size={18} className="text-emerald" /> : <Square size={18} className="text-dim" />}
                <div>
                  <strong>Pastikan filter akuarium dan aerator berjalan lancar</strong>
                  <p>Oksigen dan sirkulasi air harus tetap aktif selama Anda keluar kota.</p>
                </div>
              </div>

              <div 
                className={`checklist-item ${coverChecked ? 'checked' : ''}`}
                onClick={() => setCoverChecked(!coverChecked)}
              >
                {coverChecked ? <CheckSquare size={18} className="text-emerald" /> : <Square size={18} className="text-dim" />}
                <div>
                  <strong>Tutup wadah pakan feeder dengan rapat</strong>
                  <p>Mencegah uap air akuarium masuk ke corong dispenser agar pelet tidak menggumpal.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tombol Aksi Utama */}
          <div className="vacation-action-row">
            <button
              type="button"
              className="btn-primary vacation-enable-btn"
              onClick={handleEnableVacation}
              disabled={!dailyFeedStats.isStockSufficient && hopperStock === 0}
            >
              <Palmtree size={18} />
              <span>Aktifkan Mode Liburan ({days} Hari)</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
