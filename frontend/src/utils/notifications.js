import { calcSubjectStats, attendancePct, classesNeeded } from './stats'

/**
 * Checks all subjects in `data` against the attendance threshold (75% or custom).
 * Filters attendance records by `currentTerm` date bounds if an active term is provided.
 * Skips subjects with 0 total classes recorded.
 * 
 * @param {Object} data - Attendance tracker data object (subjects, attendance, historicalAttendance, targetThreshold)
 * @param {Object|null} currentTerm - Active term object ({ startDate, endDate }) or null
 * @returns {Array<{ subject: string, pct: number, classesNeeded: number, targetThreshold: number }>} List of low-attendance subjects
 */
export function checkLowAttendance(data, currentTerm = null) {
  if (!data || !Array.isArray(data.subjects) || data.subjects.length === 0) {
    return []
  }

  const threshold = data.targetThreshold || data.threshold || 75
  let attendanceToUse = data.attendance || {}

  // Filter attendance by active term dates if currentTerm exists with valid boundaries
  if (currentTerm?.startDate && currentTerm?.endDate) {
    const startStr = new Date(currentTerm.startDate).toISOString().split('T')[0]
    const endStr = new Date(currentTerm.endDate).toISOString().split('T')[0]

    const filtered = {}
    Object.entries(attendanceToUse).forEach(([dateStr, dayMarks]) => {
      const dateOnly = dateStr.split('T')[0]
      if (dateOnly >= startStr && dateOnly <= endStr) {
        filtered[dateStr] = dayMarks
      }
    })
    attendanceToUse = filtered
  }

  const subStats = calcSubjectStats(data.subjects, attendanceToUse, data.historicalAttendance)

  const lowSubjects = []

  data.subjects.forEach(subject => {
    const stats = subStats[subject]
    if (!stats || stats.total === 0) {
      // Skip subjects with no recorded attendance data
      return
    }

    const pct = attendancePct(stats)
    if (pct < threshold) {
      const needed = classesNeeded(stats, threshold)
      lowSubjects.push({
        subject,
        pct,
        classesNeeded: Math.max(1, needed),
        targetThreshold: threshold,
      })
    }
  })

  return lowSubjects
}

/**
 * Formats low attendance subjects into a user-friendly notification message.
 * 
 * @param {Array<{ subject: string, pct: number, classesNeeded: number }>} lowSubjects
 * @returns {string} Formatted notification message
 */
export function formatLowAttendanceMessage(lowSubjects) {
  if (!lowSubjects || lowSubjects.length === 0) return ''

  if (lowSubjects.length === 1) {
    const item = lowSubjects[0]
    return `Your ${item.subject} attendance is at ${item.pct}% — attend the next ${item.classesNeeded} ${item.classesNeeded === 1 ? 'class' : 'classes'} to recover.`
  }

  const listStr = lowSubjects
    .map(s => `${s.subject} (${s.pct}% — attend ${s.classesNeeded} ${s.classesNeeded === 1 ? 'class' : 'classes'})`)
    .join(', ')

  return `Low attendance warning: ${listStr} to recover.`
}
