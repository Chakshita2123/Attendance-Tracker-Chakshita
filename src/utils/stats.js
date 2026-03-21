/** Per-subject stats from attendance record */
export const calcSubjectStats = (subjects, attendance) => {
  const stats = Object.fromEntries(subjects.map(s => [s, { P: 0, A: 0, L: 0, total: 0 }]))
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

/** How many more classes needed to reach 75% */
export const classesNeeded = (stats) =>
  Math.ceil((0.75 * stats.total - (stats.P + stats.L)) / 0.25)

/** How many classes can be missed while staying at/above 75% */
export const canMiss = (stats) =>
  Math.max(0, Math.floor((stats.P + stats.L) / 0.75) - stats.total)

/** Overall % across all subjects */
export const overallPct = (attendance) => {
  let total = 0, present = 0
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
