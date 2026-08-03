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
    expect(stats).toEqual({
      Math: { P: 0, A: 0, L: 0, total: 0 },
      Physics: { P: 0, A: 0, L: 0, total: 0 },
    })
  })

  it('correctly tallies P, A, L across multiple days', () => {
    const attendance = {
      '2025-03-18': { Math: 'P', Physics: 'A' },
      '2025-03-19': { Math: 'L', Physics: 'P' },
      '2025-03-20': { Math: 'A', Physics: 'P' },
    }
    const stats = calcSubjectStats(['Math', 'Physics'], attendance)
    expect(stats.Math).toEqual({ P: 1, A: 1, L: 1, total: 3 })
    expect(stats.Physics).toEqual({ P: 2, A: 1, L: 0, total: 3 })
  })

  it('ignores attendance entries for unknown subjects', () => {
    const attendance = {
      '2025-03-18': { Math: 'P', UnknownSubject: 'A' },
    }
    const stats = calcSubjectStats(['Math'], attendance)
    expect(stats.Math).toEqual({ P: 1, A: 0, L: 0, total: 1 })
    expect(stats.UnknownSubject).toBeUndefined()
  })

  it('handles single subject single day', () => {
    const stats = calcSubjectStats(['Math'], { '2025-03-18': { Math: 'P' } })
    expect(stats.Math).toEqual({ P: 1, A: 0, L: 0, total: 1 })
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
    expect(stats.Math).toEqual({ P: 9, A: 3, L: 0, total: 12 })
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
    // 4 out of 5 = 80%, already above 75%
    expect(classesNeeded({ P: 4, A: 1, L: 0, total: 5 })).toBeLessThanOrEqual(0)
  })

  it('returns positive value when below 75%', () => {
    // 1 out of 4 = 25%, needs more classes
    expect(classesNeeded({ P: 1, A: 3, L: 0, total: 4 })).toBeGreaterThan(0)
  })

  it('returns 0 when exactly at 75%', () => {
    // 3 out of 4 = 75%
    expect(classesNeeded({ P: 3, A: 1, L: 0, total: 4 })).toBeLessThanOrEqual(0)
  })

  it('handles custom target threshold (e.g. 80%)', () => {
    // 3 out of 4 = 75%, below 80% target
    expect(classesNeeded({ P: 3, A: 1, L: 0, total: 4 }, 80)).toBe(1)
  })

  it('returns 0 for stats with total 0', () => {
    expect(classesNeeded({ P: 0, A: 0, L: 0, total: 0 })).toBe(0)
  })
})

describe('canMiss', () => {
  it('returns 0 when at exactly 75%', () => {
    // 3 out of 4 = 75%, floor(3/0.75) - 4 = 4 - 4 = 0
    expect(canMiss({ P: 3, A: 1, L: 0, total: 4 })).toBe(0)
  })

  it('returns positive count when above 75%', () => {
    // 10 out of 10 = 100%, floor(10/0.75) - 10 = 13 - 10 = 3
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
    // 3 present out of 4 = 75%
    expect(overallPct(attendance)).toBe(75)
  })

  it('counts L as present', () => {
    const attendance = {
      '2025-03-18': { Math: 'L' },
    }
    expect(overallPct(attendance)).toBe(100)
  })

  it('includes historical attendance totals', () => {
    const attendance = {
      '2025-03-18': { Math: 'P', Physics: 'A' },
    }
    const historicalAttendance = {
      Math: { P: 8, A: 2, L: 0, total: 10 },
      Physics: { P: 3, A: 1, L: 0, total: 4 },
    }

    expect(overallPct(attendance, historicalAttendance)).toBe(75)
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
    // Should allow skipping today and still count yesterday
    expect(calcStreak(attendance)).toBe(1)
  })
})
