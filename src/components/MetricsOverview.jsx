import React from 'react'
import { Thermometer, Waves, Clock } from 'lucide-react'

export function MetricsOverview({ telemetry, thresholds, lastFeed }) {
  // Temperature evaluation based on thresholds
  const isTempCold = telemetry.temp < thresholds.temp_min
  const isTempHot = telemetry.temp > thresholds.temp_max

  let tempStatusClass = 'success'
  let tempStatusLabel = 'Optimal'
  if (isTempCold) {
    tempStatusClass = 'warning'
    tempStatusLabel = 'Dingin (Pakan Berkurang)'
  } else if (isTempHot) {
    tempStatusClass = 'danger'
    tempStatusLabel = 'Panas (Nafsu Makan Turun)'
  }

  // Water level evaluation
  const isWaterOk = telemetry.level_ok

  return (
    <section id="sec-overview" className="metrics-row" aria-label="Ringkasan Metrik Kolam">
      {/* 1. Suhu Air (DS18B20) */}
      <article className="metric-card">
        <div className="metric-header">
          <span className="metric-label">Suhu Air (DS18B20)</span>
          <div className="metric-icon-box" aria-hidden="true">
            <Thermometer size={20} />
          </div>
        </div>

        <div className="metric-value-row">
          <span className="metric-big-num">{telemetry.temp.toFixed(1)}</span>
          <span className="metric-unit">°C</span>
        </div>

        <div className="metric-footer">
          <span className={`status-tag ${tempStatusClass}`}>
            {tempStatusLabel}
          </span>
          <span className="text-dim">Batas: {thresholds.temp_min}°-{thresholds.temp_max}°C</span>
        </div>
      </article>

      {/* 2. Level Air Kolam (Float Switch) */}
      <article className="metric-card">
        <div className="metric-header">
          <span className="metric-label">Level Air (Float Switch)</span>
          <div className="metric-icon-box" aria-hidden="true">
            <Waves size={20} />
          </div>
        </div>

        <div className="metric-value-row">
          <span className="metric-big-num" style={{ fontSize: '1.6rem', color: isWaterOk ? 'var(--status-emerald)' : 'var(--status-rose)' }}>
            {isWaterOk ? 'Normal' : 'Rendah'}
          </span>
        </div>

        <div className="metric-footer">
          <span className={`status-tag ${isWaterOk ? 'success' : 'danger'}`}>
            {isWaterOk ? 'Aman Beri Pakan' : 'Pakan Ditunda'}
          </span>
          <span className="text-dim">Pin: GPIO14</span>
        </div>
      </article>

      {/* 3. Pemberian Pakan Terakhir */}
      <article className="metric-card">
        <div className="metric-header">
          <span className="metric-label">Pakan Terakhir</span>
          <div className="metric-icon-box" aria-hidden="true">
            <Clock size={20} />
          </div>
        </div>

        <div className="metric-value-row">
          <span className="metric-big-num" style={{ fontSize: '1.5rem' }}>
            {lastFeed ? lastFeed.time : '--:--'}
          </span>
          <span className="metric-unit">{lastFeed ? lastFeed.relative : 'Belum ada'}</span>
        </div>

        <div className="metric-footer">
          <span className="status-tag success">
            {lastFeed ? `${lastFeed.source} (${lastFeed.duration_ms}ms)` : 'Siap'}
          </span>
          <span className="text-dim">Hasil: {lastFeed ? lastFeed.result : '-'}</span>
        </div>
      </article>
    </section>
  )
}
