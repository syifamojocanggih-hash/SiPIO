import React, { useState } from 'react'
import { Play, Check, Info } from 'lucide-react'

export function FeedActionCard({ 
  telemetry, 
  thresholds, 
  lastFeed, 
  onTriggerFeed, 
  triggerHaptic 
}) {
  const [duration, setDuration] = useState(thresholds.default_duration_ms || 2000)
  const [feedingState, setFeedingState] = useState('idle') // idle | sending | active | completed
  const [remainingTime, setRemainingTime] = useState(0)

  // Safety checks
  const isWaterLow = !telemetry.level_ok
  const isTempOutOfRange = telemetry.temp < thresholds.temp_min || telemetry.temp > thresholds.temp_max
  
  // Calculate time gap since last feed in minutes
  const now = Date.now()
  const minutesSinceLastFeed = lastFeed ? Math.floor((now - lastFeed.timestamp) / 60000) : 999
  const isGapTooShort = minutesSinceLastFeed < thresholds.min_gap_min

  const handleFeedClick = () => {
    if (isWaterLow) {
      alert('Tindakan Dibatalkan: Level air kolam terdeteksi rendah. Untuk keselamatan ikan dan peralatan, pakan ditunda.')
      return
    }

    if (isGapTooShort) {
      const confirmForce = window.confirm(
        `Perhatian: Baru ${minutesSinceLastFeed} menit sejak pakan terakhir (batas minimal ${thresholds.min_gap_min} menit). Tetap lanjutkan pemberian pakan?`
      )
      if (!confirmForce) return
    }

    if (isTempOutOfRange) {
      const confirmTemp = window.confirm(
        `Perhatian: Suhu air saat ini ${telemetry.temp.toFixed(1)}°C di luar batas ideal (${thresholds.temp_min}-${thresholds.temp_max}°C). Tetap berikan pakan?`
      )
      if (!confirmTemp) return
    }

    // Trigger feeding sequence
    setFeedingState('sending')
    triggerHaptic(60)

    // Simulate MQTT send & response
    setTimeout(() => {
      setFeedingState('active')
      const totalSeconds = duration / 1000
      setRemainingTime(totalSeconds)

      const interval = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 0.2) {
            clearInterval(interval)
            setFeedingState('completed')
            triggerHaptic(100)
            
            // Record to log
            onTriggerFeed({
              source: 'Manual (Dashboard)',
              duration_ms: duration,
              result: 'done',
              reason: 'Diberikan manual via tombol'
            })

            setTimeout(() => {
              setFeedingState('idle')
            }, 2500)
            return 0
          }
          return +(prev - 0.2).toFixed(1)
        })
      }, 200)
    }, 600)
  }

  return (
    <article className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Play size={18} className="text-cyan" />
            Kontrol Manual Feeder
          </h2>
          <p className="card-subtitle">Picukan putaran servo untuk memberi pelet langsung</p>
        </div>
      </div>

      <div className="feed-action-box">
        {/* Duration selector */}
        <div>
          <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
            Durasi Buka Servo Feeder:
          </label>
          <div className="duration-selector" role="radiogroup" aria-label="Pilih durasi putaran servo">
            {[1000, 2000, 3000].map((dur) => (
              <button
                key={dur}
                type="button"
                className={`duration-btn ${duration === dur ? 'active' : ''}`}
                onClick={() => setDuration(dur)}
                disabled={feedingState !== 'idle'}
              >
                {dur} ms (~{(dur / 400).toFixed(0)}g)
              </button>
            ))}
          </div>
        </div>

        {/* Primary CTA Button */}
        <button
          type="button"
          id="btn-feed-now"
          className={`btn-feed-now ${feedingState === 'active' ? 'active-feeding' : ''}`}
          onClick={handleFeedClick}
          disabled={feedingState !== 'idle' || isWaterLow}
          aria-label="Tombol Beri Pakan Sekarang"
        >
          {feedingState === 'idle' && (
            <>
              <Play size={20} fill="currentColor" />
              <span>Beri Pakan Sekarang ({duration}ms)</span>
            </>
          )}

          {feedingState === 'sending' && (
            <span>Mengirim perintah ke ESP8266...</span>
          )}

          {feedingState === 'active' && (
            <span>Servo Aktif: {remainingTime}s tersisa</span>
          )}

          {feedingState === 'completed' && (
            <>
              <Check size={20} />
              <span>Pemberian Pakan Selesai!</span>
            </>
          )}
        </button>

        {/* Safety rule message */}
        <div className="feed-rules-notice">
          <Info size={16} className="text-cyan" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>
            {isWaterLow 
              ? 'Tombol dinonaktifkan secara otomatis karena sensor float switch mendeteksi level air rendah.' 
              : `Sistem keselamatan: jeda minimal ${thresholds.min_gap_min} menit antar pakan. Sensor float switch aktif.`}
          </span>
        </div>
      </div>
    </article>
  )
}
