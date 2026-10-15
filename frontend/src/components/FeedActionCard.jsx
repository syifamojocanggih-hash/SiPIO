import React, { useState, useEffect } from 'react'
import { Play, Check, Info, Clock, AlertCircle } from 'lucide-react'

export function FeedActionCard({ 
  telemetry, 
  thresholds, 
  lastFeed, 
  lastFeedTimestamp,
  onTriggerFeed, 
  onResetCooldown,
  triggerHaptic 
}) {
  const [duration, setDuration] = useState(thresholds.default_duration_ms || 2000)
  const [feedingState, setFeedingState] = useState('idle') // idle | sending | active | completed
  const [remainingTime, setRemainingTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(Date.now())

  // Timer tick setiap 1 detik untuk menghitung sisa waktu jeda secara presisi
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Safety checks
  const isWaterLow = !telemetry.level_ok
  const isTempOutOfRange = telemetry.temp < thresholds.temp_min || telemetry.temp > thresholds.temp_max
  
  // Perhitungan jeda waktu (cooldown) minimal 30 menit dari pemberian pakan terakhir
  const minGapMinutes = thresholds.min_gap_min || 30
  const totalCooldownSeconds = minGapMinutes * 60

  // Timestamp pakan terakhir (prioritaskan lastFeedTimestamp dari state/localStorage)
  const effectiveLastFeedTime = lastFeedTimestamp || (lastFeed && lastFeed.timestamp ? lastFeed.timestamp : 0)
  const elapsedSeconds = effectiveLastFeedTime > 0 ? Math.floor((currentTime - effectiveLastFeedTime) / 1000) : 999999
  const remainingCooldownSeconds = Math.max(0, totalCooldownSeconds - elapsedSeconds)
  const isCooldownActive = remainingCooldownSeconds > 0
  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / totalCooldownSeconds) * 100))

  // Format countdown string MM:SS
  const remMinutes = Math.floor(remainingCooldownSeconds / 60)
  const remSeconds = remainingCooldownSeconds % 60
  const formattedCountdown = `${String(remMinutes).padStart(2, '0')}:${String(remSeconds).padStart(2, '0')}`

  const handleFeedClick = () => {
    if (isWaterLow) {
      alert('Tindakan Dibatalkan: Level air kolam terdeteksi rendah. Untuk keselamatan ikan dan peralatan, pakan ditunda.')
      return
    }

    if (isCooldownActive) {
      alert(`Pemberian pakan ditolak: Jeda pengaman ${minGapMinutes} menit masih aktif (${formattedCountdown} tersisa). Harap tunggu demi mencegah overfeeding ikan.`)
      return
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
            
            // Record to log & start the 30-minute cooldown
            onTriggerFeed({
              source: 'Manual (Dashboard)',
              duration_ms: duration,
              result: 'done',
              reason: 'Diberikan manual via tombol feeder'
            })

            setTimeout(() => {
              setFeedingState('idle')
            }, 1000)
            return 0
          }
          return +(prev - 0.2).toFixed(1)
        })
      }, 200)
    }, 600)
  }

  return (
    <article id="sec-feeder" className="card">
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
                disabled={feedingState !== 'idle' || isCooldownActive}
              >
                <span className="duration-btn-ms">{dur} ms</span>
                <span className="duration-btn-g">~{(dur / 400).toFixed(0)}g</span>
              </button>
            ))}
          </div>
        </div>

        {/* Primary CTA Button with Cooldown Lock & Countdown */}
        {isCooldownActive && feedingState === 'idle' ? (
          <button
            type="button"
            id="btn-feed-now"
            className="btn-feed-now cooldown-active"
            disabled={true}
            aria-label={`Jeda pengaman 30 menit aktif, sisa waktu ${formattedCountdown}`}
          >
            <Clock size={18} />
            <span className="btn-feed-text">Jeda Pengaman:</span>
            <span className="cooldown-timer-badge">{formattedCountdown}</span>
            <span className="btn-feed-chip">Terkunci {minGapMinutes}m</span>
            <div 
              className="cooldown-progress-bar" 
              style={{ width: `${100 - progressPercent}%` }} 
              title={`Progress jeda: ${progressPercent.toFixed(0)}%`}
            />
          </button>
        ) : (
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
                {isWaterLow ? (
                  <>
                    <AlertCircle size={18} />
                    <span className="btn-feed-text">Level Air Rendah — Feeder Terkunci</span>
                  </>
                ) : (
                  <>
                    <Play size={18} fill="currentColor" />
                    <span className="btn-feed-text">Beri Pakan Sekarang</span>
                    <span className="btn-feed-chip">{duration}ms</span>
                  </>
                )}
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
        )}

        {/* Safety rule message / Cooldown notice */}
        {isCooldownActive ? (
          <div className="feed-rules-notice cooldown-notice">
            <AlertCircle size={16} className="text-amber" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span>
                <strong>Jeda Pengaman Aktif ({formattedCountdown} tersisa):</strong> Waktu jeda {minGapMinutes} menit dihitung sejak pakan terakhir untuk mencegah overfeeding dan menjaga kualitas air.
              </span>
              {onResetCooldown && (
                <button
                  type="button"
                  className="btn-link-reset-cooldown"
                  onClick={onResetCooldown}
                  title="Lewati jeda untuk keperluan pengujian simulasi"
                >
                  ⚡ Lewati Jeda (Uji Coba)
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="feed-rules-notice">
            <Info size={16} className="text-cyan" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>
              {isWaterLow 
                ? 'Tombol dinonaktifkan secara otomatis karena sensor float switch mendeteksi level air rendah.' 
                : `Sistem keselamatan: jeda minimal ${minGapMinutes} menit antar pakan. Sensor float switch aktif.`}
            </span>
          </div>
        )}
      </div>
    </article>
  )
}
