import React, { useState } from 'react'
import { LineChart, TrendingUp, Calendar } from 'lucide-react'

export function TempChart({ thresholds }) {
  const [range, setRange] = useState('24h') // '1h' | '24h' | '7d'
  const [hoveredPoint, setHoveredPoint] = useState(null)

  // Datasets for 1h, 24h, 7d
  const dataMap = {
    '1h': [
      { time: '18:00', temp: 28.2 },
      { time: '18:10', temp: 28.3 },
      { time: '18:20', temp: 28.4 },
      { time: '18:30', temp: 28.4 },
      { time: '18:40', temp: 28.5 },
      { time: '18:50', temp: 28.4 },
    ],
    '24h': [
      { time: '00:00', temp: 26.5 },
      { time: '04:00', temp: 25.8 },
      { time: '08:00', temp: 27.2 },
      { time: '12:00', temp: 30.1 },
      { time: '16:00', temp: 29.4 },
      { time: '18:00', temp: 28.4 },
      { time: '20:00', temp: 27.8 },
    ],
    '7d': [
      { time: 'Kamis', temp: 27.5 },
      { time: 'Jumat', temp: 28.1 },
      { time: 'Sabtu', temp: 28.8 },
      { time: 'Minggu', temp: 29.2 },
      { time: 'Senin', temp: 28.4 },
      { time: 'Selasa', temp: 27.9 },
      { time: 'Rabu', temp: 28.4 },
    ]
  }

  const currentData = dataMap[range]

  // Chart dimensions
  const width = 600
  const height = 180
  const paddingX = 40
  const paddingY = 25

  const minTempAxis = 20
  const maxTempAxis = 36

  // Coordinate mapper
  const getX = (index) => paddingX + (index / (currentData.length - 1)) * (width - 2 * paddingX)
  const getY = (val) => height - paddingY - ((val - minTempAxis) / (maxTempAxis - minTempAxis)) * (height - 2 * paddingY)

  // Safe zone rectangle coordinates
  const safeZoneTop = getY(thresholds.temp_max)
  const safeZoneBottom = getY(thresholds.temp_min)
  const safeZoneHeight = Math.abs(safeZoneBottom - safeZoneTop)

  // Construct SVG path
  const pathD = currentData.reduce((acc, pt, idx) => {
    const x = getX(idx)
    const y = getY(pt.temp)
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`
  }, '')

  // Area under curve
  const areaD = `${pathD} L ${getX(currentData.length - 1)} ${height - paddingY} L ${getX(0)} ${height - paddingY} Z`

  // Summary statistics
  const temps = currentData.map((d) => d.temp)
  const avgTemp = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)
  const maxTemp = Math.max(...temps).toFixed(1)
  const minTemp = Math.min(...temps).toFixed(1)

  return (
    <article className="card chart-container">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <TrendingUp size={18} className="text-cyan" />
            Grafik Tren Suhu Air (DS18B20)
          </h2>
          <p className="card-subtitle">Rentang aman 24°C - 32°C ditandai dengan area hijau transparan</p>
        </div>

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
      </div>

      {/* SVG Chart */}
      <div className="svg-chart-wrapper">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          role="img"
          aria-label="Grafik suhu air terhadap waktu"
        >
          {/* Safe temperature band background */}
          <rect
            x={paddingX}
            y={safeZoneTop}
            width={width - 2 * paddingX}
            height={safeZoneHeight}
            fill="rgba(16, 185, 129, 0.08)"
            stroke="rgba(16, 185, 129, 0.25)"
            strokeDasharray="4 4"
            rx="4"
          />

          {/* Grid lines */}
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
                  strokeDasharray="2 2"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  fill="var(--text-dim)"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="var(--font-mono)"
                >
                  {tempLine}°
                </text>
              </g>
            )
          })}

          {/* Shaded Area Under Line */}
          <path d={areaD} fill="rgba(56, 189, 248, 0.12)" />

          {/* Temperature Trend Line */}
          <path
            d={pathD}
            fill="none"
            stroke="var(--accent-cyan)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points & Tooltips */}
          {currentData.map((pt, idx) => {
            const x = getX(idx)
            const y = getY(pt.temp)
            const isHovered = hoveredPoint === idx

            return (
              <g key={idx} onMouseEnter={() => setHoveredPoint(idx)} onMouseLeave={() => setHoveredPoint(null)}>
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? '#ffffff' : 'var(--accent-cyan)'}
                  stroke="var(--bg-base)"
                  strokeWidth="2"
                  style={{ cursor: 'pointer', transition: 'all 150ms' }}
                />
                {/* X axis labels */}
                <text
                  x={x}
                  y={height - 5}
                  fill="var(--text-dim)"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                >
                  {pt.time}
                </text>

                {/* Hover Tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={x - 30}
                      y={y - 28}
                      width="60"
                      height="20"
                      rx="4"
                      fill="var(--bg-card)"
                      stroke="var(--accent-cyan)"
                    />
                    <text
                      x={x}
                      y={y - 14}
                      fill="var(--text-main)"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="var(--font-mono)"
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

      {/* Summary Footer */}
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: 'var(--accent-cyan)' }} />
          <span>Suhu Terbaca</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: 'rgba(16, 185, 129, 0.6)' }} />
          <span>Zona Aman (24°-32°C)</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          <span>Rerata: <strong className="text-main">{avgTemp}°C</strong></span>
          <span>Tertinggi: <strong className="text-main">{maxTemp}°C</strong></span>
          <span>Terendah: <strong className="text-main">{minTemp}°C</strong></span>
        </div>
      </div>
    </article>
  )
}
