const emptyStats = () => ({
  P: 0,
  A: 0,
  L: 0,
  total: 0,
  manualDelivered: 0,
  manualAttended: 0,
  manualDL: 0,
  manualML: 0,
})

const normalizeHistoricalEntry = (entry = {}) => {
  const P = Math.max(0, Number(entry.P) || 0)
  const A = Math.max(0, Number(entry.A) || 0)
  const L = Math.max(0, Number(entry.L) || 0)
  const total = Math.max(P + A + L, Number(entry.total) || 0)
  return { P, A, L, total }
}

const normalizeManualEntry = (entry = {}) => {
  const delivered = Math.max(0, Number(entry.delivered) || 0)
  const attended  = Math.max(0, Number(entry.attended)  || 0)
  const dl        = Math.max(0, Number(entry.dl)        || 0)
  const ml        = Math.max(0, Number(entry.ml)        || 0)
  return { delivered, attended, dl, ml }
}

/** Per-subject stats from tracked attendance plus any historical baseline and manual starting balance */
export const calcSubjectStats = (subjects, attendance, historicalAttendance = {}, manualStats = {}) => {
  const stats = Object.fromEntries(subjects.map(s => [s, emptyStats()]))

  subjects.forEach(subject => {
    const hist   = normalizeHistoricalEntry(historicalAttendance[subject])
    const manual = normalizeManualEntry(manualStats[subject])

    stats[subject] = {
      P: hist.P + manual.attended + manual.dl + manual.ml, // DL and ML count as present equivalent
      A: hist.A,
      L: hist.L,
      total: hist.total + manual.delivered, // Total delivered lectures
      manualDelivered: manual.delivered,
      manualAttended: manual.attended,
      manualDL: manual.dl,
      manualML: manual.ml,
    }
  })

  Object.values(attendance).forEach(day => {
    Object.entries(day).forEach(([sub, status]) => {
      if (stats[sub]) { stats[sub][status]++; stats[sub].total++ }
    })
  })
  return stats
}

/** Attendance % for a subject (P+L count as present) */
export const attendancePct = (stats) =>
  stats.total === 0 ? 0 : Math.round(((stats.P + stats.L) / stats.total) * 100)

/** How many more classes needed to reach target percentage (defaults to 75%) */
export const classesNeeded = (stats, targetPct = 75) => {
  if (!stats || stats.total === 0) return 0
  const target = targetPct > 1 ? targetPct / 100 : targetPct
  const present = stats.P + stats.L
  if (present / stats.total >= target) return 0
  return Math.max(0, Math.ceil((target * stats.total - present) / (1 - target)))
}

/** How many classes can be missed while staying at/above 75% */
export const canMiss = (stats) =>
  Math.max(0, Math.floor((stats.P + stats.L) / 0.75) - stats.total)

/** Overall % across all subjects */
export const overallPct = (attendance, historicalAttendance = {}, manualStats = {}) => {
  let total = 0
  let present = 0

  Object.values(historicalAttendance).forEach(entry => {
    const normalized = normalizeHistoricalEntry(entry)
    total += normalized.total
    present += normalized.P + normalized.L
  })

  Object.values(manualStats).forEach(entry => {
    const manual = normalizeManualEntry(entry)
    total += manual.delivered
    present += manual.attended + manual.dl + manual.ml
  })

  Object.values(attendance).forEach(day => {
    Object.values(day).forEach(s => {
      total++
      if (s === 'P' || s === 'L') present++
    })
  })

  return total === 0 ? 0 : Math.round((present / total) * 100)
}

/** Consecutive-day streak */
export const calcStreak = (attendance) => {
  const today = new Date()
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset())
  let streak = 0
  const d = new Date(today)
  while (true) {
    const key = d.toISOString().split('T')[0]
    const hasData = attendance[key] && Object.keys(attendance[key]).length > 0
    if (hasData) { streak++; d.setDate(d.getDate() - 1) }
    else if (key === today.toISOString().split('T')[0] && streak === 0) { d.setDate(d.getDate() - 1) }
    else break
  }
  return streak
}
