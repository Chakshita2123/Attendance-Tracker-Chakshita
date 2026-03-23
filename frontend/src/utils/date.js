/** Returns today as YYYY-MM-DD in local time */
export const todayStr = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().split('T')[0]
}

/** Returns the 3-letter weekday for a YYYY-MM-DD string */
export const weekday = (dateStr) =>
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(dateStr).getUTCDay()]

/** Returns an array of the last N days as YYYY-MM-DD, oldest first */
export const lastNDays = (n = 7) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (n - 1 - i))
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().split('T')[0]
  })

/** "09:00" + 90 min → "10:30" */
export const addMinutes = (timeStr, mins) => {
  const [h, m] = (timeStr || '09:00').split(':').map(Number)
  const total  = h * 60 + m + parseInt(mins || 60)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Short display label for a date, e.g. "Mon 15" */
export const shortDate = (dateStr) => {
  const d = new Date(dateStr)
  return `${weekday(dateStr)} ${String(d.getUTCDate()).padStart(2, '0')}`
}
