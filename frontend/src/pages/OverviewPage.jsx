import React, { useState, useEffect, useId } from 'react'
import {
  Camera,
  CameraOff,
  RefreshCw,
  Maximize2,
  Thermometer,
  Waves,
  Clock,
  Play,
  ArrowUpRight,
  Wifi,
  WifiOff,
  Luggage,
  X,
  AlertTriangle,
  Sparkles,
  Eye
} from 'lucide-react'
import { AlertBanner } from '../components/AlertBanner'
import { TempChart } from '../components/TempChart'
import { INITIAL_TEMP_HISTORY } from '../data/mockIoT'

/**
 * Circular Radial Arc Gauge SVG untuk Suhu Air (terinspirasi panel Climate Control pada referensi)
 */
function WaterTempArcGauge({ temp, thresholds }) {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const arcGradId = `tempArcGrad-${rawId}`

  const minAxis = 18
  const maxAxis = 38
  const clampedTemp = Math.max(minAxis, Math.min(maxAxis, Number(temp) || 26))
  const ratio = (clampedTemp - minAxis) / (maxAxis - minAxis)

  const isCold = temp < thresholds.temp_min
  const isHot = temp > thresholds.temp_max

  // Geometri busur 240 derajat (dari 150° ke 390°)
  const cx = 110
  const cy = 96
  const r = 74
  const startDeg = 150
  const sweepDeg = 240
  const endDeg = startDeg + sweepDeg
  const activeDeg = startDeg + sweepDeg * ratio

  const polarToCartesian = (angleDeg, radius = r) => {
    const rad = (angleDeg * Math.PI) / 180
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad)
    }
  }

  const describeArc = (startAngle, endAngle, radius = r) => {
    const start = polarToCartesian(startAngle, radius)
    const end = polarToCartesian(endAngle, radius)
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
  }

  const bgPath = describeArc(startDeg, endDeg)
  const activePath = ratio > 0.01 ? describeArc(startDeg, activeDeg) : ''
  const knob = polarToCartesian(activeDeg)

  // Titik penanda skala (ticks) sepanjang busur
  const tickCount = 24
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const deg = startDeg + (sweepDeg * i) / tickCount
    const isMajor = i % 6 === 0
    const outer = polarToCartesian(deg, r + 13)
    const inner = polarToCartesian(deg, isMajor ? r + 5 : r + 8)
    const isPassed = deg <= activeDeg
    return { outer, inner, isMajor, isPassed, key: i }
  })

  const activeStartColor = isHot ? '#f59e0b' : isCold ? '#38bdf8' : '#10b981'
  const activeEndColor = isHot ? '#f43f5e' : isCold ? '#0284c7' : '#38bdf8'

  return (
    <div className="hub-arc-gauge-wrap">
      <svg viewBox="0 0 220 156" className="hub-arc-svg" role="img" aria-label={`Pengukur suhu air ${temp.toFixed(1)} derajat Celsius`}>
        <defs>
          <linearGradient id={arcGradId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={activeStartColor} />
            <stop offset="100%" stopColor={activeEndColor} />
          </linearGradient>
        </defs>

        {/* Ticks radial skala */}
        {ticks.map((t) => (
          <line
            key={t.key}
            x1={t.inner.x}
            y1={t.inner.y}
            x2={t.outer.x}
            y2={t.outer.y}
            stroke={t.isPassed ? activeEndColor : 'var(--border-color)'}
            strokeWidth={t.isMajor ? 1.8 : 1.1}
            strokeOpacity={t.isPassed ? 0.85 : 0.45}
            strokeLinecap="round"
          />
        ))}

        {/* Track latar busur */}
        <path
          d={bgPath}
          fill="none"
          stroke="var(--border-color)"
          strokeOpacity="0.35"
          strokeWidth="9"
          strokeLinecap="round"
        />

        {/* Busur aktif gradasi */}
        {activePath && (
          <path
            d={activePath}
            fill="none"
            stroke={`url(#${arcGradId})`}
            strokeWidth="9"
            strokeLinecap="round"
          />
        )}

        {/* Titik penunjuk suhu terkini */}
        <circle
          cx={knob.x}
          cy={knob.y}
          r="5"
          fill="#ffffff"
          stroke={activeEndColor}
          strokeWidth="2.5"
        />

        {/* Angka utama di tengah */}
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          className="hub-gauge-num"
          fontFamily="var(--font-sans)"
        >
          {temp.toFixed(1)}°
        </text>
        <text
          x={cx}
          y={cy + 24}
          textAnchor="middle"
          className="hub-gauge-sub"
          fontFamily="var(--font-sans)"
        >
          Celsius
        </text>
      </svg>
    </div>
  )
}

/**
 * Indikator Gelombang Air Akuarium (Mini Wave Tank) untuk status biner Float Switch (Aman vs Rendah)
 */
function WaterLevelWaveTankSvg({ isWaterOk }) {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const clipId = `tankClip-${rawId}`
  const frontGradId = `tankFrontGrad-${rawId}`
  const backGradId = `tankBackGrad-${rawId}`

  const levelOffsetY = isWaterOk ? 20 : 56
  const buoyY = isWaterOk ? 24 : 60
  const activeColor = isWaterOk ? '#10b981' : '#f43f5e'

  return (
    <svg viewBox="0 0 92 88" className="hub-level-svg" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <rect x="8" y="8" width="76" height="72" rx="14" ry="14" />
        </clipPath>

        <linearGradient id={frontGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isWaterOk ? '#38bdf8' : '#fb7185'} stopOpacity="0.88" />
          <stop offset="100%" stopColor={isWaterOk ? '#059669' : '#e11d48'} stopOpacity="0.48" />
        </linearGradient>

        <linearGradient id={backGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isWaterOk ? '#0284c7' : '#f43f5e'} stopOpacity="0.38" />
          <stop offset="100%" stopColor={isWaterOk ? '#0d9488' : '#be123c'} stopOpacity="0.18" />
        </linearGradient>
      </defs>

      {/* Bingkai kaca akuarium lembut */}
      <rect
        x="6"
        y="6"
        width="80"
        height="76"
        rx="16"
        ry="16"
        fill="var(--bg-card-subtle)"
        stroke="var(--border-color)"
        strokeWidth="1.4"
      />

      {/* Gelombang air terpotong rapi di dalam tangki */}
      <g clipPath={`url(#${clipId})`}>
        <g
          className="hub-wave-level-group"
          style={{ transform: `translateY(${levelOffsetY}px)` }}
        >
          {/* Lapisan ombak belakang (periode tepat 92px agar mulus berulang) */}
          <path
            className="hub-wave-back"
            d="M 0 4 Q 23 -1, 46 4 T 92 4 T 138 4 T 184 4 L 184 96 L 0 96 Z"
            fill={`url(#${backGradId})`}
          />
          {/* Lapisan ombak depan (fase berlawanan) */}
          <path
            className="hub-wave-front"
            d="M 0 6 Q 23 11, 46 6 T 92 6 T 138 6 T 184 6 L 184 96 L 0 96 Z"
            fill={`url(#${frontGradId})`}
          />
        </g>

        {/* Garis batas aman pelampung float switch */}
        <line
          x1="12"
          y1="48"
          x2="80"
          y2="48"
          stroke="var(--text-dim)"
          strokeOpacity="0.55"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />

        {/* Kilau kaca akuarium tipis di sisi kiri */}
        <rect
          x="13"
          y="14"
          width="4.5"
          height="58"
          rx="2.25"
          fill="#ffffff"
          fillOpacity="0.16"
        />
      </g>

      {/* Indikator pelampung kecil di sisi kanan tangki */}
      <line x1="72" y1="16" x2="72" y2="72" stroke="var(--text-dim)" strokeOpacity="0.28" strokeWidth="1.4" strokeLinecap="round" />
      <circle
        cx="72"
        cy={buoyY}
        r="4.2"
        fill={activeColor}
        stroke="#ffffff"
        strokeWidth="1.6"
        className="hub-wave-buoy"
      />
    </svg>
  )
}

export function OverviewPage({
  telemetry,
  thresholds,
  lastFeed,
  lastFeedTimestamp,
  activeAlerts,
  onDismissAlert,
  espStatus,
  camStatus,
  backendConnection,
  onNavigate,
  onTriggerFeed,
  triggerHaptic,
  vacationMode,
  tempHistory = INITIAL_TEMP_HISTORY,
  cameraUpdate,
  hopperStock
}) {
  // Camera Hero State
  const [activeArea, setActiveArea] = useState('kolam') // 'kolam' | 'hopper'
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showFullView, setShowFullView] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('Terbaru')
  const [cacheBuster, setCacheBuster] = useState(() => Date.now())

  // Live ticker untuk countdown cooldown pakan
  const [nowEpoch, setNowEpoch] = useState(() => Date.now())
  const [isQuickFeeding, setIsQuickFeeding] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setNowEpoch(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Dengarkan update upload snapshot real-time dari WebSocket ESP32-CAM
  useEffect(() => {
    if (cameraUpdate && cameraUpdate.timestamp_str) {
      setLastUpdated(cameraUpdate.timestamp_str)
      setCacheBuster(cameraUpdate.timestamp || Date.now())
      setImgError(false)
    }
  }, [cameraUpdate])

  // Tutup modal kamera penuh dengan tombol Escape (aksesibilitas R-32)
  useEffect(() => {
    if (!showFullView) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowFullView(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showFullView])

  const handleRefreshCam = () => {
    if (triggerHaptic) triggerHaptic(25)
    setIsRefreshing(true)
    setImgError(false)
    setTimeout(() => {
      const d = new Date()
      setLastUpdated(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WIB`)
      setCacheBuster(Date.now())
      setIsRefreshing(false)
    }, 600)
  }

  const handleSwitchArea = (area) => {
    if (triggerHaptic) triggerHaptic(20)
    setActiveArea(area)
    setImgError(false)
  }

  const baseSrc = activeArea === 'kolam' ? '/camera/pond_latest.jpg' : '/camera/hopper_latest.jpg'
  const currentImageSrc = `${baseSrc}?t=${cacheBuster}`

  // Evaluasi suhu air
  const isTempCold = telemetry.temp < thresholds.temp_min
  const isTempHot = telemetry.temp > thresholds.temp_max
  const isTempOutOfRange = isTempCold || isTempHot
  let tempStatusClass = 'success'
  let tempStatusLabel = 'Optimal'
  if (isTempCold) {
    tempStatusClass = 'warning'
    tempStatusLabel = 'Dingin'
  } else if (isTempHot) {
    tempStatusClass = 'danger'
    tempStatusLabel = 'Panas'
  }

  // Evaluasi level air
  const isWaterOk = Boolean(telemetry.level_ok)

  // Evaluasi cooldown pakan 30 menit
  const minGapMinutes = thresholds.min_gap_min || 30
  const totalCooldownSeconds = minGapMinutes * 60
  const effectiveLastFeedTime = lastFeedTimestamp || 0
  const elapsedSeconds = effectiveLastFeedTime > 0 ? Math.floor((nowEpoch - effectiveLastFeedTime) / 1000) : 999999
  const remainingCooldownSeconds = Math.max(0, totalCooldownSeconds - elapsedSeconds)
  const isCooldownActive = remainingCooldownSeconds > 0
  const remMinutes = Math.floor(remainingCooldownSeconds / 60)
  const remSeconds = remainingCooldownSeconds % 60
  const formattedCountdown = `${String(remMinutes).padStart(2, '0')}:${String(remSeconds).padStart(2, '0')}`
  const cooldownProgress = isCooldownActive
    ? Math.min(100, Math.max(4, ((totalCooldownSeconds - remainingCooldownSeconds) / totalCooldownSeconds) * 100))
    : 100

  const handleQuickFeed = () => {
    if (!onTriggerFeed || isCooldownActive || !isWaterOk || isQuickFeeding) return
    if (triggerHaptic) triggerHaptic(45)
    setIsQuickFeeding(true)
    onTriggerFeed({
      source: 'Manual (Ringkasan)',
      duration_ms: 2000,
      result: 'done',
      reason: 'Pemberian pakan cepat dari halaman ringkasan'
    })
    setTimeout(() => setIsQuickFeeding(false), 1200)
  }

  return (
    <div className="page-view animate-fade-in" id="page-overview">
      {/* 1. Hub Top Header */}
      <header className="hub-topbar">
        <div className="hub-topbar-left">
          <h1 className="hub-greeting-title">Pusat Kontrol Akuarium</h1>
          <p className="hub-greeting-subtitle">
            Pemantauan visual kamera, tren suhu air, dan kendali pakan otomatis
          </p>
        </div>

        <div className="hub-topbar-right">
          <div className="hub-live-pill" title={backendConnection?.isConnected ? 'Terhubung ke FastAPI WebSocket' : 'Mode simulasi browser lokal'}>
            <span className="pulse-indicator" />
            <span>{backendConnection?.isConnected ? 'FastAPI Live' : 'Mode Simulasi'}</span>
          </div>

          <button
            type="button"
            className="hub-hardware-pill"
            onClick={() => {
              if (triggerHaptic) triggerHaptic(20)
              onNavigate('settings')
            }}
            aria-label="Status koneksi perangkat, klik untuk buka konfigurasi"
          >
            {espStatus.online ? (
              <>
                <Wifi size={14} className="text-emerald" />
                <span>Feeder {espStatus.rssi} dBm</span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="text-rose" />
                <span>Feeder Offline</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Mode Liburan Banner jika aktif */}
      {vacationMode?.enabled && (
        <div className="vacation-active-banner">
          <div className="vacation-banner-icon">
            <Luggage size={20} />
          </div>
          <div className="vacation-banner-text">
            <strong>Mode Liburan Akuarium Aktif:</strong> Ditinggal {vacationMode.days} hari (Pulang: {vacationMode.returnDate || 'Sesuai jadwal'}). Porsi pakan hemat (-20%) berjalan otomatis.
          </div>
          <button
            type="button"
            className="vacation-banner-btn"
            onClick={() => onNavigate('feeder')}
            aria-label="Kelola Mode Liburan di Halaman Pakan"
          >
            Kelola Liburan
          </button>
        </div>
      )}

      {/* Peringatan Kritis / Bahaya (Tanpa tombol tutup) */}
      <AlertBanner alerts={activeAlerts} onDismissAlert={onDismissAlert} />

      {/* 2. Asymmetric Hub Grid: Kiri (Cam Kolam + Tren Suhu Air), Kanan (Suhu Air, Level Air, Pakan Terakhir) */}
      <div className="overview-hub-grid">
        {/* KOLOM KIRI: Cam Kolam (Gradasi Kebawah) + Tren Suhu Air */}
        <div className="overview-hub-left">
          {/* A. Hero Cam Kolam dengan Gradasi Menyatu ke Bawah */}
          <section className="hub-camera-hero" aria-label="Tampilan Kamera Akuarium">
            <div className="hub-camera-media-wrap">
              {!imgError ? (
                <img
                  src={currentImageSrc}
                  alt={activeArea === 'kolam' ? 'Tangkapan Kamera Permukaan Akuarium' : 'Tangkapan Kamera Wadah Pakan Hopper'}
                  className="hub-camera-img"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="hub-camera-fallback">
                  <CameraOff size={36} className="text-dim" />
                  <p>Snapshot kamera {activeArea === 'kolam' ? 'kolam' : 'hopper'} belum tersedia</p>
                </div>
              )}

              {/* Lapisan Gradasi ke Bawah (Menyatu Halus ke Canvas Tanpa Garis Kotak) */}
              <div className="hub-camera-fade" aria-hidden="true" />

              {/* Kontrol Melayang Atas pada Kamera */}
              <div className="hub-camera-top-bar">
                <span className="hub-cam-status-chip">
                  <span className={`status-dot ${camStatus.online ? 'online' : 'offline'}`} />
                  <span>{camStatus.online ? 'Kamera Aktif' : 'Kamera Terputus'}</span>
                  <span className="hub-cam-time">· {lastUpdated}</span>
                </span>

                <div className="hub-cam-actions">
                  <div className="hub-cam-switcher" role="tablist" aria-label="Pilih sudut kamera">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeArea === 'kolam'}
                      className={`hub-cam-tab ${activeArea === 'kolam' ? 'active' : ''}`}
                      onClick={() => handleSwitchArea('kolam')}
                    >
                      <Eye size={14} />
                      <span>Kolam</span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeArea === 'hopper'}
                      className={`hub-cam-tab ${activeArea === 'hopper' ? 'active' : ''}`}
                      onClick={() => handleSwitchArea('hopper')}
                    >
                      <Sparkles size={14} />
                      <span>Hopper</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="hub-cam-icon-btn"
                    onClick={handleRefreshCam}
                    disabled={isRefreshing}
                    aria-label="Perbarui snapshot kamera"
                    title="Perbarui Foto"
                  >
                    <RefreshCw size={15} className={isRefreshing ? 'spin-anim' : ''} />
                  </button>

                  <button
                    type="button"
                    className="hub-cam-icon-btn"
                    onClick={() => setShowFullView(true)}
                    aria-label="Perbesar tampilan kamera layar penuh"
                    title="Layar Penuh"
                  >
                    <Maximize2 size={15} />
                  </button>
                </div>
              </div>

              {/* Konten Judul & Chip Telemetri di Area Bawah Gradasi */}
              <div className="hub-camera-bottom-content">
                <div className="hub-camera-title-group">
                  <h2 className="hub-camera-title">
                    {activeArea === 'kolam' ? 'Kamera Kolam' : 'Wadah Pakan (Hopper)'}
                  </h2>
                  <button
                    type="button"
                    className="hub-text-link-btn"
                    onClick={() => onNavigate('camera')}
                  >
                    <span>Halaman Kamera</span>
                    <ArrowUpRight size={14} />
                  </button>
                </div>

                <div className="hub-camera-chips">
                  <span className="hub-inline-chip">
                    <Thermometer size={14} className={isTempOutOfRange ? 'text-amber' : 'text-cyan'} />
                    <span>{telemetry.temp.toFixed(1)}°C</span>
                  </span>
                  <span className="hub-inline-chip">
                    <Waves size={14} className={isWaterOk ? 'text-emerald' : 'text-rose'} />
                    <span>{isWaterOk ? 'Air Normal' : 'Air Rendah'}</span>
                  </span>
                  <span className="hub-inline-chip">
                    <Camera size={14} className="text-cyan" />
                    <span>{activeArea === 'kolam' ? 'Permukaan Air' : 'Isi Pelet'}</span>
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* B. Tren Suhu Air tepat di bawah Cam Kolam */}
          <div className="hub-temp-wrapper">
            <TempChart
              thresholds={thresholds}
              historyData={tempHistory}
              variant="hub"
              onOpenFull={() => {
                if (triggerHaptic) triggerHaptic(25)
                onNavigate('temp')
              }}
            />
          </div>
        </div>

        {/* KOLOM KANAN: 3 Panel Metrik Utama (Suhu Air, Level Air, Pakan Terakhir) */}
        <aside className="overview-hub-rail" aria-label="Panel Metrik Kolam">
          {/* 1. Suhu Air (Circular Arc Dial Gauge) */}
          <article className="hub-rail-card">
            <div className="hub-rail-header">
              <div>
                <h3 className="hub-rail-title">Suhu Air</h3>
                <span className="hub-rail-subtitle">Kondisi termal akuarium</span>
              </div>
              <span className={`status-tag ${tempStatusClass}`}>{tempStatusLabel}</span>
            </div>

            <WaterTempArcGauge temp={telemetry.temp} thresholds={thresholds} />

            <div className="hub-rail-footer">
              <span className="hub-rail-meta">
                Batas aman: <strong>{thresholds.temp_min}° - {thresholds.temp_max}°C</strong>
              </span>
              <button
                type="button"
                className="hub-rail-action-link"
                onClick={() => {
                  if (triggerHaptic) triggerHaptic(25)
                  onNavigate('temp')
                }}
              >
                <span>Detail</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </article>

          {/* 2. Level Air (Mini Wave Tank) */}
          <article className="hub-rail-card">
            <div className="hub-rail-header">
              <div>
                <h3 className="hub-rail-title">Level Air</h3>
                <span className="hub-rail-subtitle">Deteksi ketinggian permukaan</span>
              </div>
              <span className={`status-tag ${isWaterOk ? 'success' : 'danger'}`}>
                {isWaterOk ? 'Aman' : 'Hold'}
              </span>
            </div>

            <div className="hub-level-body">
              <div className="hub-level-readout">
                <span className={`hub-level-val ${isWaterOk ? 'text-emerald' : 'text-rose'}`}>
                  {isWaterOk ? 'Normal' : 'Rendah'}
                </span>
                <span className="hub-level-desc">
                  {isWaterOk
                    ? 'Siap beri pakan otomatis'
                    : 'Pemberian pakan ditunda'}
                </span>
              </div>
              <WaterLevelWaveTankSvg isWaterOk={isWaterOk} />
            </div>
          </article>

          {/* 3. Pakan Terakhir + Aksi Cepat Gradasi */}
          <article className="hub-rail-card">
            <div className="hub-rail-header">
              <div>
                <h3 className="hub-rail-title">Pakan Terakhir</h3>
                <span className="hub-rail-subtitle">Dispenser pakan otomatis</span>
              </div>
              <span className={`status-tag ${lastFeed ? (lastFeed.resultRaw === 'done' || lastFeed.result === 'Sukses' ? 'success' : lastFeed.resultRaw === 'skipped' ? 'warning' : 'danger') : 'success'}`}>
                {lastFeed ? lastFeed.result : 'Siap'}
              </span>
            </div>

            <div className="hub-feed-body">
              <div className="hub-feed-time-row">
                <span className="hub-feed-time">{lastFeed ? lastFeed.time : '--:--'}</span>
                <span className="hub-feed-rel">{lastFeed ? lastFeed.relative : 'Belum ada data'}</span>
              </div>
              <div className="hub-feed-meta-row">
                <Clock size={13} className="text-dim" />
                <span>
                  {lastFeed
                    ? `${lastFeed.source} · ${lastFeed.duration_ms} ms`
                    : 'Menunggu jadwal pakan'}
                  {hopperStock ? ` · Stok ${hopperStock.currentGrams}g` : ''}
                </span>
              </div>
            </div>

            {/* Kontrol Gradasi Bawah (terinspirasi Lighting Slider pada referensi) */}
            <div className="hub-feed-action-wrap">
              {!isWaterOk ? (
                <button
                  type="button"
                  className="hub-feed-pill-btn blocked"
                  disabled
                  aria-label="Pemberian pakan ditunda karena level air rendah"
                >
                  <AlertTriangle size={15} />
                  <span>Ditahan (Air Rendah)</span>
                </button>
              ) : isCooldownActive ? (
                <div className="hub-cooldown-pill" title={`Jeda pengaman ${minGapMinutes} menit aktif`}>
                  <div
                    className="hub-cooldown-fill"
                    style={{ width: `${cooldownProgress}%` }}
                  />
                  <div className="hub-cooldown-content">
                    <Clock size={14} />
                    <span>Jeda Aman · {formattedCountdown}</span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="hub-feed-pill-btn ready"
                  onClick={handleQuickFeed}
                  disabled={isQuickFeeding}
                  aria-label="Beri pakan sekarang takaran 5 gram"
                >
                  <Play size={14} fill="currentColor" />
                  <span>{isQuickFeeding ? 'Memutar Servo...' : 'Beri Pakan (~5g)'}</span>
                </button>
              )}

              <button
                type="button"
                className="hub-rail-action-link"
                onClick={() => {
                  if (triggerHaptic) triggerHaptic(25)
                  onNavigate('feeder')
                }}
              >
                <span>Jadwal</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </article>
        </aside>
      </div>

      {/* Lightbox Modal untuk Kamera Layar Penuh */}
      {showFullView && (
        <div
          className="modal-backdrop"
          onClick={() => setShowFullView(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau kamera layar penuh"
        >
          <div className="modal-box" style={{ maxWidth: '860px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="card-title">
                <Camera size={18} className="text-cyan" />
                <span>{activeArea === 'kolam' ? 'Kamera Kolam Utama' : 'Wadah Pakan (Hopper)'} · {lastUpdated}</span>
              </h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setShowFullView(false)}
                aria-label="Tutup pratinjau penuh"
              >
                <X size={18} />
              </button>
            </div>
            <div className="hub-fullscreen-img-wrap">
              {!imgError ? (
                <img
                  src={currentImageSrc}
                  alt="Snapshot kamera layar penuh"
                  className="hub-fullscreen-img"
                />
              ) : (
                <div className="hub-camera-fallback" style={{ height: '340px' }}>
                  <CameraOff size={40} className="text-dim" />
                  <p>Snapshot kamera belum tersedia</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
