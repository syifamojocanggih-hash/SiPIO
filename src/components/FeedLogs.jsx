import React, { useState } from 'react'
import { FileText, Download, Filter, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

export function FeedLogs({ logs }) {
  const [filterResult, setFilterResult] = useState('all')

  const filteredLogs = logs.filter((log) => {
    if (filterResult === 'all') return true
    return log.result === filterResult
  })

  // Export CSV handler (D-09)
  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert('Tidak ada log pakan untuk diekspor.')
      return
    }

    const headers = ['ID', 'Waktu', 'Pemicu', 'Durasi_ms', 'Hasil', 'Alasan']
    const rows = logs.map((log) => [
      log.id,
      `"${log.timestamp}"`,
      `"${log.source}"`,
      log.duration_ms,
      `"${log.result}"`,
      `"${log.reason || '-'}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `sipio_feed_logs_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (result) => {
    if (result === 'done') {
      return (
        <span className="status-tag success">
          <CheckCircle2 size={12} />
          <span>Selesai</span>
        </span>
      )
    }
    if (result === 'skipped') {
      return (
        <span className="status-tag warning">
          <AlertTriangle size={12} />
          <span>Ditunda</span>
        </span>
      )
    }
    return (
      <span className="status-tag danger">
        <XCircle size={12} />
        <span>Gagal</span>
      </span>
    )
  }

  return (
    <article className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <FileText size={18} className="text-cyan" />
            Riwayat Pemberian Pakan (D-05)
          </h2>
          <p className="card-subtitle">Log riwayat eksekusi jadwal pakan dan intervensi manual</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Filter dropdown */}
          <select
            className="form-input"
            style={{ minHeight: '38px', padding: '4px 10px', fontSize: '0.8rem' }}
            value={filterResult}
            onChange={(e) => setFilterResult(e.target.value)}
            aria-label="Filter status hasil pakan"
          >
            <option value="all">Semua Status</option>
            <option value="done">Hanya Selesai</option>
            <option value="skipped">Hanya Ditunda</option>
            <option value="failed">Hanya Gagal</option>
          </select>

          {/* Export CSV button (D-09) */}
          <button
            type="button"
            id="btn-export-csv"
            className="camera-btn"
            style={{ minHeight: '38px', padding: '6px 12px' }}
            onClick={handleExportCSV}
            aria-label="Unduh data log ke format CSV"
          >
            <Download size={14} />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="logs-table" aria-label="Tabel Riwayat Pemberian Pakan">
          <thead>
            <tr>
              <th scope="col">Waktu</th>
              <th scope="col">Pemicu</th>
              <th scope="col">Durasi</th>
              <th scope="col">Hasil</th>
              <th scope="col">Alasan / Catatan</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Tidak ada catatan riwayat pemberian pakan sesuai filter.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{log.timestamp}</td>
                  <td>{log.source}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{log.duration_ms} ms</td>
                  <td>{getStatusBadge(log.result)}</td>
                  <td className="text-muted">{log.reason || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  )
}
