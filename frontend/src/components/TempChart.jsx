import React, { useState, useId } from 'react'
import { TrendingUp, AlertCircle, ArrowUpRight } from 'lucide-react'
import { INITIAL_TEMP_HISTORY } from '../data/mockIoT'

/**
 * Menghasilkan path kurva SVG halus (Catmull-Rom to Cubic Bezier) agar grafik tren suhu mengalir mulus.
 */
function buildSmoothCurvePath(coords, minY, maxY) {
  if (!coords || coords.length === 0) return ''
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`

  const clampY = (y) => Math.max(minY, Math.min(maxY, y))
  let d = `M ${coords[0].x} ${coords[0].y}`

  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[Math.max(0, i - 1)]
    const p1 = coords[i]
    const p2 = coords[i + 1]
    const p3 = coords[Math.min(coords.length - 1, i + 2)]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = clampY(p1.y + (p2.y - p0.y) / 6)
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = clampY(p2.y - (p3.y - p1.y) / 6)

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }

  return d
}

export function TempChart({
  thresholds,
  historyData = INITIAL_TEMP_HISTORY,
  variant = 'default',
  onOpenFull
}) {
  const [range, setRange] = useState('24h') // '1h' | '24h' | '7d'
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const rawUid = useId()
  const gradId = `tempAreaGrad-${rawUid.replace(/[^a-zA-Z0-9_-]/g, '')}`

  const currentData = historyData?.[range] || []
  const isHubVariant = variant === 'hub'

  // Dimensi SVG
  const width = 620
  const height = isHubVariant ? 172 : 185
  const paddingX = 38
  const paddingY = 22

  const minTempAxis = 20
  const maxTempAxis = 36

  const getX = (index) => {
    if (currentData.length <= 1) return width / 2
    return paddingX + (index / (currentData.length - 1)) * (width - 2 * paddingX)
  }

  const getY = (val) =>
    height - paddingY - ((val - minTempAxis) / (maxTempAxis - minTempAxis)) * (height - 2 * paddingY)

  // Zona aman dinamis dari konfigurasi
  const safeZoneTop = getY(thresholds.temp_max)
  const safeZoneBottom = getY(thresholds.temp_min)
  const safeZoneHeight = Math.abs(safeZoneBottom - safeZoneTop)

  const coords = currentData.map((pt, idx) => ({
    x: getX(idx),
    y: getY(pt.temp)
  }))

  const pathD = buildSmoothCurvePath(coords, paddingY - 10, height - paddingY)
  const areaD =
    coords.length > 0
      ? `${pathD} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`
      : ''

  // Statistik ringkas dari dataset aktif
  const temps = currentData.map((d) => d.temp)
  const avgTemp = temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '-'
  const maxTemp = temps.length > 0 ? Math.max(...temps).toFixed(1) : '-'
  const minTemp = temps.length > 0 ? Math.min(...temps).toFixed(1) : '-'

  return (
    <article
      id="sec-temp"
      className={isHubVariant ? 'hub-temp-panel' : 'card chart-container'}
    >
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <TrendingUp size={18} className="text-cyan" />
            <span>Tren Suhu Air</span>
          </h2>
          <p className="card-subtitle">
            Rentang aman {thresholds.temp_min}°C - {thresholds.temp_max}°C ditandai area hijau lembut
          </p>
        </div>

        <div className="temp-header-controls">
          <div className="chart-filters" role="group" aria-label="Filter rentang waktu suhu">
            <button
              type="button"
              className={`filter-chip ${range === '1h' ? 'active' : ''}`}
              onClick={() => setRange('1h')}
            >
              1 Jam
            </button>
            <button
              type="button"
              className={`filter-chip ${range === '24h' ? 'active' : ''}`}
              onClick={() => setRange('24h')}
            >
              24 Jam
            </button>
            <button
              type="button"
              className={`filter-chip ${range === '7d' ? 'active' : ''}`}
              onClick={() => setRange('7d')}
            >
              7 Hari
            </button>
          </div>

          {isHubVariant && onOpenFull && (
            <button
              type="button"
              className="hub-text-link-btn"
              onClick={onOpenFull}
              aria-label="Buka halaman detail analisis tren suhu"
            >
              <span>Detail</span>
              <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* SVG Chart atau Empty State */}
      {currentData.length === 0 ? (
        <div className="chart-empty-state">
          <AlertCircle size={26} style={{ margin: '0 auto 8px auto', color: 'var(--accent-primary)', display: 'block' }} />
          <span>Tidak ada data riwayat suhu air untuk rentang waktu ini.</span>
        </div>
      ) : (
        <div className="svg-chart-wrapper">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', height: '100%', overflow: 'visible' }}
            role="img"
            aria-label="Grafik kurva tren suhu air terhadap waktu"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.34" />
                <stop offset="85%" stopColor="var(--accent-primary)" stopOpacity="0.04" />
                <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Zona suhu aman */}
            <rect
              x={paddingX}
              y={safeZoneTop}
              width={width - 2 * paddingX}
              height={safeZoneHeight}
              fill="rgba(16, 185, 129, 0.07)"
              stroke="rgba(16, 185, 129, 0.22)"
              strokeDasharray="4 4"
              rx="6"
            />

            {/* Garis referensi suhu */}
            {[24, 28, 32].map((tempLine) => {
              const y = getY(tempLine)
              return (
                <g key={tempLine}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    stroke="var(--border-color)"
                    strokeOpacity="0.45"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={paddingX - 10}
                    y={y + 4}
                    fill="var(--text-dim)"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="var(--font-sans)"
                  >
                    {tempLine}°
                  </text>
                </g>
              )
            })}

            {/* Gradasi area ke bawah di bawah kurva */}
            <path d={areaD} fill={`url(#${gradId})`} />

            {/* Garis kurva suhu halus */}
            <path
              d={pathD}
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Titik data interaktif & tooltip */}
            {currentData.map((pt, idx) => {
              const x = coords[idx].x
              const y = coords[idx].y
              const isHovered = hoveredPoint === idx
              const tooltipX = Math.max(paddingX + 32, Math.min(width - paddingX - 32, x))

              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoveredPoint(idx)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onClick={() => setHoveredPoint(isHovered ? null : idx)}
                >
                  {/* Target area hover lebih luas agar nyaman disentuh */}
                  <circle cx={x} cy={y} r={12} fill="transparent" style={{ cursor: 'pointer' }} />

                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 5.5 : 3.5}
                    fill={isHovered ? '#ffffff' : 'var(--accent-primary)'}
                    stroke={isHovered ? 'var(--accent-primary)' : 'var(--bg-base)'}
                    strokeWidth="2"
                    style={{ cursor: 'pointer', transition: 'r 150ms ease' }}
                  />

                  {/* Label sumbu X */}
                  <text
                    x={x}
                    y={height - 4}
                    fill="var(--text-dim)"
                    fontSize="10"
                    textAnchor="middle"
                    fontFamily="var(--font-sans)"
                  >
                    {pt.time}
                  </text>

                  {/* Hover / Tap Tooltip */}
                  {isHovered && (
                    <g>
                      <rect
                        x={tooltipX - 30}
                        y={Math.max(2, y - 28)}
                        width="60"
                        height="20"
                        rx="6"
                        fill="var(--bg-card)"
                        stroke="var(--accent-primary)"
                        strokeWidth="1.2"
                      />
                      <text
                        x={tooltipX}
                        y={Math.max(15, y - 14)}
                        fill="var(--text-main)"
                        fontSize="10.5"
                        fontWeight="700"
                        textAnchor="middle"
                        fontFamily="var(--font-sans)"
                      >
                        {pt.temp}°C
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      )}

      {/* Footer Statistik */}
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: 'var(--accent-primary)' }} />
          <span>Suhu Terbaca</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: 'rgba(16, 185, 129, 0.6)' }} />
          <span>Zona Aman ({thresholds.temp_min}°-{thresholds.temp_max}°C)</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span>Rerata: <strong className="text-main">{avgTemp}°C</strong></span>
          <span>Tertinggi: <strong className="text-main">{maxTemp}°C</strong></span>
          <span>Terendah: <strong className="text-main">{minTemp}°C</strong></span>
        </div>
      </div>
    </article>
  )
}
