import React, { useState, useEffect, useMemo } from 'react'
import { PlayCircle } from 'lucide-react'
import { FeedActionCard } from '../components/FeedActionCard'
import { ScheduleManager } from '../components/ScheduleManager'
import { FeedLogs } from '../components/FeedLogs'
import { VacationModeCard } from '../components/VacationModeCard'

export function FeederPage({
  telemetry,
  thresholds,
  lastFeed,
  lastFeedTimestamp,
  schedules,
  feedLogs,
  onTriggerFeed,
  onResetCooldown,
  onAddSchedule,
  onEditSchedule,
  onToggleSchedule,
  onDeleteSchedule,
  onUpdateSchedules,
  triggerHaptic,
  vacationMode,
  onUpdateVacationMode
}) {
  const [now, setNow] = useState(() => new Date())

  // Update interval setiap 15 detik agar status 'Sudah' / 'Belum' reaktif tepat waktu
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 15000)
    return () => clearInterval(timer)
  }, [])

  // Hitung jadwal aktif untuk hari ini dan berapa yang sudah terlaksana
  const scheduleTodayStats = useMemo(() => {
    if (!Array.isArray(schedules) || schedules.length === 0) {
      return { totalToday: 0, completedToday: 0, isAllDone: false }
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const currentDayIdx = now.getDay()
    const dayNames = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu']
    const currentDayName = dayNames[currentDayIdx]
    const isWeekend = currentDayIdx === 0 || currentDayIdx === 6

    const activeToday = schedules.filter((s) => {
      if (!s.enabled) return false
      const daysStr = (s.days || 'Setiap Hari').toLowerCase()
      if (daysStr.includes('setiap hari') || daysStr.includes('daily') || daysStr.includes('all')) return true
      if (daysStr.includes('akhir pekan') || daysStr.includes('weekend')) return isWeekend
      if (daysStr.includes('hari kerja') || daysStr.includes('weekday')) return !isWeekend
      return daysStr.includes(currentDayName)
    })

    const completedToday = activeToday.filter((s) => {
      const [h, m] = String(s.time || '00:00').split(':').map(Number)
      const schMinutes = (h || 0) * 60 + (m || 0)
      return currentMinutes >= schMinutes
    }).length

    const totalToday = activeToday.length
    const isAllDone = totalToday > 0 && completedToday >= totalToday

    return {
      totalToday,
      completedToday,
      isAllDone
    }
  }, [schedules, now])

  const isWaterLow = !telemetry.level_ok

  return (
    <div className="page-view animate-fade-in" id="page-feeder">
      {/* 1. Page Header */}
      <div className="page-header">
        <div className="page-header-text">
          <div className="page-title-row">
            <div className="page-icon-badge feeder">
              <PlayCircle size={20} />
            </div>
            <h1 className="page-title">Pakan & Jadwal Otomatis</h1>
            <span className="page-status-badge">
              <span className="pulse-indicator" />
              Servo Feeder Siap
            </span>
          </div>
          <p className="page-subtitle">
            Kontrol servo dispenser pakan secara instan, atur jadwal feeding harian otomatis, dan tinjau riwayat audit log
          </p>
        </div>

        <div className="page-header-stats">
          <div className="header-stat-chip">
            <span className="stat-chip-label">Jadwal Hari Ini</span>
            <span className={`stat-chip-val ${scheduleTodayStats.isAllDone ? 'text-emerald' : 'text-amber'}`}>
              {scheduleTodayStats.totalToday === 0
                ? 'Tidak Ada'
                : scheduleTodayStats.isAllDone
                ? `Sudah (${scheduleTodayStats.completedToday}/${scheduleTodayStats.totalToday})`
                : `Belum (${scheduleTodayStats.completedToday}/${scheduleTodayStats.totalToday})`}
            </span>
          </div>
          <div className="header-stat-chip">
            <span className="stat-chip-label">Level Air</span>
            <span className={`stat-chip-val ${isWaterLow ? 'text-rose' : 'text-emerald'}`}>
              {isWaterLow ? 'Rendah (Hold)' : 'Normal (Aman)'}
            </span>
          </div>
          <div className="header-stat-chip">
            <span className="stat-chip-label">Mode Liburan</span>
            <span className={`stat-chip-val ${vacationMode?.enabled ? 'text-emerald' : 'text-cyan'}`}>
              {vacationMode?.enabled ? `${vacationMode.days} Hari (-20%)` : 'Siaga'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Hero: Feed Action Card (Kontrol Manual & Status Cooldown) */}
      <div className="feeder-hero-section">
        <FeedActionCard
          telemetry={telemetry}
          thresholds={thresholds}
          lastFeed={lastFeed}
          lastFeedTimestamp={lastFeedTimestamp}
          onTriggerFeed={onTriggerFeed}
          onResetCooldown={onResetCooldown}
          triggerHaptic={triggerHaptic}
        />
      </div>

      {/* 3. Mode Liburan Akuarium (Vacation Safe Mode) */}
      <div className="feeder-vacation-section">
        <VacationModeCard
          vacationMode={vacationMode}
          onUpdateVacationMode={onUpdateVacationMode}
          schedules={schedules}
          telemetry={telemetry}
          triggerHaptic={triggerHaptic}
        />
      </div>

      {/* 4. Two Stacked Sections: Schedule Manager & Feeding Logs */}
      <div className="feeder-content-grid">
        <div className="feeder-schedule-col">
          <ScheduleManager
            schedules={schedules}
            onAddSchedule={onAddSchedule}
            onEditSchedule={onEditSchedule}
            onToggleSchedule={onToggleSchedule}
            onDeleteSchedule={onDeleteSchedule}
            onUpdateSchedules={onUpdateSchedules}
            triggerHaptic={triggerHaptic}
            now={now}
            vacationMode={vacationMode}
          />
        </div>

        <div className="feeder-logs-col">
          <FeedLogs logs={feedLogs} />
        </div>
      </div>
    </div>
  )
}
