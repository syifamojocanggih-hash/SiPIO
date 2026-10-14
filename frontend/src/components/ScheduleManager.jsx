import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, CheckCircle2, Clock, X } from 'lucide-react'

export function ScheduleManager({ schedules, onUpdateSchedules, triggerHaptic }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)

  // Form states
  const [time, setTime] = useState('07:00')
  const [duration, setDuration] = useState(2000)
  const [days, setDays] = useState('Setiap Hari')

  // Keyboard accessibility: Escape closes modal (R-32)
  useEffect(() => {
    if (!isModalOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen])

  const openAddModal = () => {
    setEditingSchedule(null)
    setTime('07:00')
    setDuration(2000)
    setDays('Setiap Hari')
    setIsModalOpen(true)
  }

  const openEditModal = (sch) => {
    setEditingSchedule(sch)
    setTime(sch.time)
    setDuration(sch.duration_ms)
    setDays(sch.days || 'Setiap Hari')
    setIsModalOpen(true)
  }

  const handleToggle = (id) => {
    triggerHaptic(40)
    const updated = schedules.map((s) => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    )
    onUpdateSchedules(updated)
  }

  const handleDelete = (id) => {
    if (window.confirm('Yakin ingin menghapus jadwal pakan ini?')) {
      triggerHaptic(50)
      const updated = schedules.filter((s) => s.id !== id)
      onUpdateSchedules(updated)
    }
  }

  const handleSave = (e) => {
    e.preventDefault()
    triggerHaptic(50)

    if (editingSchedule) {
      // Edit
      const updated = schedules.map((s) => 
        s.id === editingSchedule.id 
          ? { ...s, time, duration_ms: Number(duration), days } 
          : s
      )
      onUpdateSchedules(updated)
    } else {
      // Add new
      const newSchedule = {
        id: Date.now(),
        time,
        duration_ms: Number(duration),
        days,
        enabled: true,
        synced: true
      }
      onUpdateSchedules([...schedules, newSchedule])
    }

    setIsModalOpen(false)
  }

  return (
    <article className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Clock size={18} className="text-cyan" />
            Pengelola Jadwal Pakan (D-04)
          </h2>
          <p className="card-subtitle">Jadwal disimpan mandiri di LittleFS ESP8266, tetap berjalan saat WiFi putus</p>
        </div>

        <button 
          type="button" 
          id="btn-add-schedule"
          className="btn-primary" 
          onClick={openAddModal}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>Tambah Jadwal</span>
        </button>
      </div>

      <div className="schedule-list">
        {schedules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
            Belum ada jadwal pakan yang diatur. Klik "Tambah Jadwal" untuk membuat rutinitas baru.
          </div>
        ) : (
          schedules.map((sch) => (
            <div key={sch.id} className="schedule-item">
              <div className="schedule-time-box">
                <span className="schedule-time">{sch.time}</span>
                <div className="schedule-meta">
                  <span className="schedule-days">{sch.days || 'Setiap Hari'}</span>
                  <span className="schedule-duration">
                    Durasi: {sch.duration_ms} ms (~{(sch.duration_ms / 400).toFixed(0)}g)
                  </span>
                </div>
              </div>

              <div className="schedule-actions">
                {/* Sync badge */}
                <span 
                  className="status-tag success" 
                  title="Tersimpan di memori lokal ESP8266 LittleFS"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <CheckCircle2 size={12} />
                  <span>Tersinkron</span>
                </span>

                {/* Edit Button */}
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: '36px', height: '36px' }}
                  onClick={() => openEditModal(sch)}
                  aria-label={`Ubah jadwal jam ${sch.time}`}
                >
                  <Edit2 size={14} />
                </button>

                {/* Delete Button */}
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: '36px', height: '36px', color: 'var(--status-rose)' }}
                  onClick={() => handleDelete(sch.id)}
                  aria-label={`Hapus jadwal jam ${sch.time}`}
                >
                  <Trash2 size={14} />
                </button>

                {/* Toggle Enable/Disable */}
                <label className="switch" title={sch.enabled ? 'Nonaktifkan Jadwal' : 'Aktifkan Jadwal'}>
                  <input
                    type="checkbox"
                    checked={sch.enabled}
                    onChange={() => handleToggle(sch.id)}
                    aria-label={`Status aktif jadwal jam ${sch.time}`}
                  />
                  <span className="slider" />
                </label>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>
                {editingSchedule ? 'Ubah Jadwal Pakan' : 'Tambah Jadwal Pakan Baru'}
              </h3>
              <button 
                type="button" 
                id="btn-close-schedule-modal"
                className="icon-btn" 
                onClick={() => setIsModalOpen(false)}
                aria-label="Tutup Form Jadwal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="schedule-time">Jam Pemberian (WIB):</label>
                  <input
                    id="schedule-time"
                    type="time"
                    className="form-input"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="schedule-duration">Durasi Buka Servo (Milidetik):</label>
                  <input
                    id="schedule-duration"
                    type="number"
                    step="100"
                    min="500"
                    max="10000"
                    className="form-input"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Estimasi takaran: ~{(duration / 400).toFixed(1)} gram pelet
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="schedule-days">Hari Pengulangan:</label>
                  <select
                    id="schedule-days"
                    className="form-input"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                  >
                    <option value="Setiap Hari">Setiap Hari</option>
                    <option value="Senin - Jumat">Senin - Jumat</option>
                    <option value="Akhir Pekan Saja">Akhir Pekan Saja</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  id="btn-cancel-schedule"
                  className="btn-secondary" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  id="btn-save-schedule"
                  className="btn-primary"
                >
                  Simpan & Sinkronkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </article>
  )
}
