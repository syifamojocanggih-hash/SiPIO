import React, { useState, useMemo } from 'react'
import {
  Package,
  Droplets,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  ClipboardList
} from 'lucide-react'
import { durationToGrams, formatShortDateTime } from '../utils/formatters'

const CARE_CATEGORIES = ['Ganti Air 30%', 'Cuci Filter', 'Tambah Air (Top-Off)', 'Vitamin / Obat', 'Observasi']

export function AquariumCareCard({
  hopperStock,
  onRefillHopper,
  onUpdateHopperCapacity,
  aquariumCare,
  onMarkWaterChange,
  onUpdateCareInterval,
  onAddCareNote,
  onDeleteCareNote,
  schedules,
  vacationMode,
  triggerHaptic
}) {
  const [noteCategory, setNoteCategory] = useState('Cuci Filter')
  const [noteText, setNoteText] = useState('')

  // Hitung perkiraan konsumsi pakan harian dari jadwal aktif
  const dailyGrams = useMemo(() => {
    const active = schedules?.filter((s) => s.enabled) || []
    if (active.length === 0) return 0
    const base = active.reduce((sum, s) => sum + durationToGrams(s.duration_ms), 0)
    const factor = vacationMode?.enabled && vacationMode?.ecoMode ? 0.8 : 1
    return Math.round(base * factor * 10) / 10
  }, [schedules, vacationMode])

  const currentGrams = Number(hopperStock?.currentGrams) || 0
  const capacityGrams = Math.max(10, Number(hopperStock?.capacityGrams) || 200)
  const stockPercent = Math.min(100, Math.max(0, Math.round((currentGrams / capacityGrams) * 100)))
  const isStockLow = stockPercent <= 20
  const daysRemaining = dailyGrams > 0 ? Math.floor(currentGrams / dailyGrams) : null

  // Hitung status jadwal ganti air rutin
  const waterChangeStatus = useMemo(() => {
    const intervalDays = Number(aquariumCare?.intervalDays) || 7
    const lastTs = aquariumCare?.lastWaterChangeAt

    if (!lastTs) {
      return {
        hasRecord: false,
        statusClass: 'warning',
        headline: 'Belum Tercatat',
        subtext: 'Tekan tombol di bawah jika baru menguras atau mengganti air 20-30%'
      }
    }

    const diffMs = Math.max(0, Date.now() - lastTs)
    const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const daysLeft = intervalDays - daysElapsed

    if (daysLeft > 1) {
      return {
        hasRecord: true,
        statusClass: 'success',
        headline: `${daysLeft} Hari Lagi`,
        subtext: daysElapsed === 0
          ? `Baru saja diganti (${formatShortDateTime(lastTs)})`
          : `Terakhir ganti air ${daysElapsed} hari lalu (${formatShortDateTime(lastTs)})`
      }
    }
    if (daysLeft === 1 || daysLeft === 0) {
      return {
        hasRecord: true,
        statusClass: 'warning',
        headline: daysLeft === 0 ? 'Jadwal Hari Ini' : 'Besok Waktunya',
        subtext: `Sudah ${daysElapsed} hari sejak ganti air terakhir (${formatShortDateTime(lastTs)})`
      }
    }
    return {
      hasRecord: true,
      statusClass: 'danger',
      headline: `Terlambat ${Math.abs(daysLeft)} Hari`,
      subtext: `Segera kuras & ganti 20-30% air (terakhir ${daysElapsed} hari lalu)`
    }
  }, [aquariumCare])

  const handleNoteSubmit = (e) => {
    e.preventDefault()
    if (!noteText.trim()) return
    if (triggerHaptic) triggerHaptic(30)
    onAddCareNote({
      category: noteCategory,
      note: noteText.trim()
    })
    setNoteText('')
  }

  return (
    <section className="care-grid" aria-label="Stok Pelet dan Perawatan Akuarium">
      {/* Panel 1: Pelacak Stok Pelet Harian */}
      <article className="card care-card">
        <div className="card-header" style={{ flexWrap: 'wrap' }}>
          <div>
            <h2 className="card-title">
              <Package size={18} className="text-cyan" />
              <span>Stok Pelet Wadah Pakan</span>
            </h2>
            <p className="card-subtitle">Berkurang otomatis setiap sesi pemberian pakan dijalankan</p>
          </div>
          <span className={`status-tag ${isStockLow ? 'warning' : 'success'}`}>
            {isStockLow ? 'Stok Menipis' : `${stockPercent}% Terisi`}
          </span>
        </div>

        <div className="hopper-stock-hero">
          <div className="hopper-stock-numbers">
            <span className="hopper-grams-big font-mono">{currentGrams}</span>
            <span className="hopper-grams-cap">/ {capacityGrams} gram</span>
          </div>
          <div className="hopper-days-est">
            {dailyGrams > 0 ? (
              <span>
                Konsumsi <strong>{dailyGrams}g/hari</strong> · Cukup untuk{' '}
                <strong>~{daysRemaining} hari</strong>
              </span>
            ) : (
              <span>Aktifkan minimal 1 jadwal untuk estimasi harian</span>
            )}
          </div>
        </div>

        <div className="hopper-progress-track" role="progressbar" aria-valuenow={stockPercent} aria-valuemin={0} aria-valuemax={100}>
          <div
            className={`hopper-progress-fill ${isStockLow ? 'low' : 'ok'}`}
            style={{ width: `${stockPercent}%` }}
          />
        </div>

        {isStockLow && (
          <div className="hopper-low-hint">
            <AlertTriangle size={15} />
            <span>Sisa pelet di bawah 20%. Segera isi ulang wadah agar jadwal tidak kehabisan pakan.</span>
          </div>
        )}

        <div className="hopper-controls-row">
          <div className="hopper-capacity-group">
            <label htmlFor="select-hopper-cap" className="hopper-cap-label">Kapasitas Wadah:</label>
            <select
              id="select-hopper-cap"
              className="form-input"
              style={{ minHeight: '44px', padding: '6px 12px', fontSize: '0.82rem', width: 'auto' }}
              value={capacityGrams}
              onChange={(e) => {
                if (triggerHaptic) triggerHaptic(20)
                onUpdateHopperCapacity(Number(e.target.value))
              }}
            >
              <option value={100}>100 gram (Mini)</option>
              <option value={200}>200 gram (Standar)</option>
              <option value={300}>300 gram (Sedang)</option>
              <option value={500}>500 gram (Besar)</option>
            </select>
          </div>

          <button
            type="button"
            className="btn-primary hopper-refill-btn"
            onClick={() => {
              if (triggerHaptic) triggerHaptic(45)
              onRefillHopper()
            }}
          >
            <RefreshCw size={15} />
            <span>Isi Ulang Penuh ({capacityGrams}g)</span>
          </button>
        </div>

        {hopperStock?.lastRefillAt && (
          <p className="care-meta-footnote">
            Terakhir diisi penuh: {formatShortDateTime(hopperStock.lastRefillAt)}
          </p>
        )}
      </article>

      {/* Panel 2: Pengingat Ganti Air Rutin & Catatan Perawatan */}
      <article className="card care-card">
        <div className="card-header" style={{ flexWrap: 'wrap' }}>
          <div>
            <h2 className="card-title">
              <Droplets size={18} className="text-cyan" />
              <span>Jadwal Ganti Air & Perawatan</span>
            </h2>
            <p className="card-subtitle">Pengingat siklus ganti air 20-30% agar air akuarium tetap sehat</p>
          </div>

          <select
            className="form-input"
            aria-label="Interval pengingat ganti air"
            style={{ minHeight: '40px', padding: '4px 10px', fontSize: '0.8rem', width: 'auto' }}
            value={aquariumCare?.intervalDays || 7}
            onChange={(e) => {
              if (triggerHaptic) triggerHaptic(20)
              onUpdateCareInterval(Number(e.target.value))
            }}
          >
            <option value={7}>Tiap 7 Hari</option>
            <option value={10}>Tiap 10 Hari</option>
            <option value={14}>Tiap 14 Hari</option>
          </select>
        </div>

        <div className={`wc-status-banner ${waterChangeStatus.statusClass}`}>
          <div className="wc-status-text">
            <strong>{waterChangeStatus.headline}</strong>
            <p>{waterChangeStatus.subtext}</p>
          </div>
          <button
            type="button"
            className="wc-mark-btn"
            onClick={() => {
              if (triggerHaptic) triggerHaptic(50)
              onMarkWaterChange()
            }}
          >
            <CheckCircle2 size={15} />
            <span>Sudah Ganti Air</span>
          </button>
        </div>

        {/* Form Catatan Perawatan Singkat */}
        <form onSubmit={handleNoteSubmit} className="care-note-form">
          <div className="care-note-inputs">
            <select
              className="form-input"
              aria-label="Kategori catatan perawatan"
              style={{ minHeight: '44px', padding: '6px 10px', fontSize: '0.8rem', flex: '0 0 auto', width: 'auto' }}
              value={noteCategory}
              onChange={(e) => setNoteCategory(e.target.value)}
            >
              {CARE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <input
              type="text"
              className="form-input"
              placeholder="Catat perawatan (misal: bersihkan kapas filter)"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              style={{ minHeight: '44px', flex: 1, minWidth: '140px' }}
              aria-label="Isi catatan perawatan akuarium"
            />

            <button
              type="submit"
              className="btn-primary"
              style={{ minHeight: '44px', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              disabled={!noteText.trim()}
            >
              <Plus size={15} />
              <span>Catat</span>
            </button>
          </div>
        </form>

        {/* Daftar Catatan Terbaru atau Empty State (R-27) */}
        <div className="care-notes-list">
          {!aquariumCare?.notes || aquariumCare.notes.length === 0 ? (
            <div className="care-notes-empty">
              <ClipboardList size={18} className="text-dim" />
              <span>Belum ada catatan perawatan tersimpan.</span>
            </div>
          ) : (
            aquariumCare.notes.slice(0, 4).map((item) => (
              <div key={item.id} className="care-note-row">
                <div className="care-note-content">
                  <span className="care-note-badge">{item.category}</span>
                  <span className="care-note-desc">{item.note}</span>
                  <span className="care-note-date">{formatShortDateTime(item.timestamp)}</span>
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: '36px', height: '36px', flexShrink: 0 }}
                  onClick={() => onDeleteCareNote(item.id)}
                  aria-label="Hapus catatan perawatan ini"
                  title="Hapus catatan"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </article>
    </section>
  )
}

