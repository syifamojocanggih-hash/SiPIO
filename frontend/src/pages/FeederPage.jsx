import React from 'react'
import { PlayCircle } from 'lucide-react'
import { FeedActionCard } from '../components/FeedActionCard'
import { ScheduleManager } from '../components/ScheduleManager'
import { FeedLogs } from '../components/FeedLogs'

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
  triggerHaptic
}) {
  const activeSchedulesCount = schedules?.filter((s) => s.enabled)?.length || 0
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
            <span className="stat-chip-label">Jadwal Aktif</span>
            <span className="stat-chip-val">{activeSchedulesCount} / {schedules?.length || 0}</span>
          </div>
          <div className="header-stat-chip">
            <span className="stat-chip-label">Level Air</span>
            <span className={`stat-chip-val ${isWaterLow ? 'text-rose' : 'text-emerald'}`}>
              {isWaterLow ? 'Rendah (Hold)' : 'Normal (Aman)'}
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

      {/* 3. Two-Column Grid: Schedule Manager & Feeding Logs */}
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
          />
        </div>

        <div className="feeder-logs-col">
          <FeedLogs logs={feedLogs} />
        </div>
      </div>
    </div>
  )
}
