/**
 * Utility Formatters & Helpers for SiPIO Dashboard
 */

const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
  jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11
}

/**
 * Parses timestamp string from feed log (supports Indonesian format and ISO date)
 */
export function parseFeedLogTimestamp(timestampStr) {
  if (!timestampStr) return null
  if (typeof timestampStr === 'number') {
    const d = new Date(timestampStr)
    return isNaN(d.getTime()) ? null : d
  }
  const str = String(timestampStr).trim()
  const parts = str.split(/\s+/)
  if (parts.length >= 4) {
    const day = parseInt(parts[0], 10)
    const mKey = parts[1].toLowerCase().slice(0, 3)
    const month = MONTH_MAP[mKey] ?? 0
    const year = parseInt(parts[2], 10)
    const timeParts = parts[3].replace('.', ':').split(':')
    const hours = parseInt(timeParts[0], 10) || 0
    const mins = parseInt(timeParts[1], 10) || 0
    const secs = parseInt(timeParts[2], 10) || 0
    const parsed = new Date(year, month, day, hours, mins, secs)
    if (!isNaN(parsed.getTime())) return parsed
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Sorts array of schedule objects chronologically by time HH:MM
 */
export function sortSchedulesByTime(scheds) {
  if (!Array.isArray(scheds)) return []
  return [...scheds].sort((a, b) => {
    const toMinutes = (timeStr) => {
      if (!timeStr) return 0
      const [h, m] = String(timeStr).split(':').map(Number)
      return (h || 0) * 60 + (m || 0)
    }
    return toMinutes(a.time) - toMinutes(b.time)
  })
}
