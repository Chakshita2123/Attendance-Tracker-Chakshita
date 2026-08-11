import { describe, it, expect } from 'vitest'
import {
  calcSubjectStats,
  attendancePct,
  classesNeeded,
  canMiss,
  overallPct,
  calcStreak,
} from './stats'

describe('calcSubjectStats', () => {
  it('returns zero stats when attendance is empty', () => {
    const stats = calcSubjectStats(['Math', 'Physics'], {})
    expect(stats.Math).toMatchObject({ P: 0, A: 0, L: 0, total: 0 })
    expect(stats.Physics).toMatchObject({ P: 0, A: 0, L: 0, total: 0 })
  })

  it('correctly tallies P, A, L across multiple days', () => {
    const attendance = {
      '2025-03-18': { Math: 'P', Physics: 'A' },
      '2025-03-19': { Math: 'L', Physics: 'P' },
      '2025-03-20': { Math: 'A', Physics: 'P' },
    }
    const stats = calcSubjectStats(['Math', 'Physics'], attendance)
    expect(stats.Math).toMatchObject({ P: 1, A: 1, L: 1, total: 3 })
    expect(stats.Physics).toMatchObject({ P: 2, A: 1, L: 0, total: 3 })
  })

  it('ignores attendance entries for unknown subjects', () => {
    const attendance = {
      '2025-03-18': { Math: 'P', UnknownSubject: 'A' },
    }
    const stats = calcSubjectStats(['Math'], attendance)
    expect(stats.Math).toMatchObject({ P: 1, A: 0, L: 0, total: 1 })
    expect(stats.UnknownSubject).toBeUndefined()
  })

  it('handles single subject single day', () => {
    const stats = calcSubjectStats(['Math'], { '2025-03-18': { Math: 'P' } })
    expect(stats.Math).toMatchObject({ P: 1, A: 0, L: 0, total: 1 })
  })

  it('merges tracked attendance with historical baseline data', () => {
    const attendance = {
      '2025-03-18': { Math: 'P' },
      '2025-03-19': { Math: 'A' },
    }
    const historicalAttendance = {
      Math: { P: 8, A: 2, L: 0, total: 10 },
    }

    const stats = calcSubjectStats(['Math'], attendance, historicalAttendance)
    expect(stats.Math).toMatchObject({ P: 9, A: 3, L: 0, total: 12 })
  })

  it('correctly factors in manualStats (Delivered, Attended, DL, ML)', () => {
    const attendance = {
      '2025-03-18': { Math: 'P' },
    }
    const manualStats = {
      Math: { delivered: 10, attended: 6, dl: 1, ml: 1 },
    }

    const stats = calcSubjectStats(['Math'], attendance, {}, manualStats)
    // P = 1 (tracked P) + 6 (manual attended) + 1 (DL) + 1 (ML) = 9
    // total = 1 (tracked total) + 10 (delivered) = 11
    expect(stats.Math.P).toBe(9)
    expect(stats.Math.total).toBe(11)
    expect(attendancePct(stats.Math)).toBe(82)
  })
})

describe('attendancePct', () => {
  it('returns 0 when total is 0', () => {
    expect(attendancePct({ P: 0, A: 0, L: 0, total: 0 })).toBe(0)
  })

  it('counts P and L as present', () => {
    expect(attendancePct({ P: 3, A: 1, L: 1, total: 5 })).toBe(80)
  })

  it('returns 100 for perfect attendance', () => {
    expect(attendancePct({ P: 5, A: 0, L: 0, total: 5 })).toBe(100)
  })

  it('returns 0 when all absent', () => {
    expect(attendancePct({ P: 0, A: 5, L: 0, total: 5 })).toBe(0)
  })
})

describe('classesNeeded', () => {
  it('returns 0 or negative when already above 75%', () => {
    expect(classesNeeded({ P: 4, A: 1, L: 0, total: 5 })).toBeLessThanOrEqual(0)
  })

  it('returns positive value when below 75%', () => {
    expect(classesNeeded({ P: 1, A: 3, L: 0, total: 4 })).toBeGreaterThan(0)
  })

  it('returns 0 when exactly at 75%', () => {
    expect(classesNeeded({ P: 3, A: 1, L: 0, total: 4 })).toBeLessThanOrEqual(0)
  })

  it('handles custom target threshold (e.g. 80%)', () => {
    expect(classesNeeded({ P: 3, A: 1, L: 0, total: 4 }, 80)).toBe(1)
  })

  it('returns 0 for stats with total 0', () => {
    expect(classesNeeded({ P: 0, A: 0, L: 0, total: 0 })).toBe(0)
  })
})

describe('canMiss', () => {
  it('returns 0 when at exactly 75%', () => {
    expect(canMiss({ P: 3, A: 1, L: 0, total: 4 })).toBe(0)
  })

  it('returns positive count when above 75%', () => {
    expect(canMiss({ P: 10, A: 0, L: 0, total: 10 })).toBe(3)
  })

  it('returns 0 when below 75%', () => {
    expect(canMiss({ P: 1, A: 3, L: 0, total: 4 })).toBe(0)
  })
})

describe('overallPct', () => {
  it('returns 0 for empty attendance', () => {
    expect(overallPct({})).toBe(0)
  })

  it('calculates across all subjects and days', () => {
    const attendance = {
      '2025-03-18': { Math: 'P', Physics: 'A' },
      '2025-03-19': { Math: 'P', Physics: 'P' },
    }
    expect(overallPct(attendance)).toBe(75)
  })

  it('counts L as present', () => {
    const attendance = {
      '2025-03-18': { Math: 'L' },
    }
    expect(overallPct(attendance)).toBe(100)
  })

  it('includes historical attendance totals and manualStats', () => {
    const attendance = {
      '2025-03-18': { Math: 'P', Physics: 'A' },
    }
    const manualStats = {
      Math: { delivered: 10, attended: 7, dl: 1, ml: 0 },
      Physics: { delivered: 5, attended: 3, dl: 0, ml: 1 },
    }

    // Math: 1 tracked P + 7 attended + 1 DL = 9 out of 11
    // Physics: 1 tracked A + 3 attended + 1 ML = 4 out of 6
    // Total present = 13, Total delivered = 17 -> 13/17 = 76.47% -> 76%
    expect(overallPct(attendance, {}, manualStats)).toBe(76)
  })
})

describe('calcStreak', () => {
  it('returns 0 for empty attendance', () => {
    expect(calcStreak({})).toBe(0)
  })

  it('returns streak of consecutive days', () => {
    const today = new Date()
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset())
    const todayKey = today.toISOString().split('T')[0]

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = yesterday.toISOString().split('T')[0]

    const attendance = {
      [todayKey]: { Math: 'P' },
      [yesterdayKey]: { Math: 'P' },
    }
    expect(calcStreak(attendance)).toBe(2)
  })

  it('handles today having no data (starts from yesterday)', () => {
    const today = new Date()
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset())

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = yesterday.toISOString().split('T')[0]

    const attendance = {
      [yesterdayKey]: { Math: 'P' },
    }
    expect(calcStreak(attendance)).toBe(1)
  })
})
