import { describe, it, expect } from 'vitest'
import { checkLowAttendance, formatLowAttendanceMessage } from './notifications'

describe('checkLowAttendance', () => {
  it('returns empty array when data or subjects are missing', () => {
    expect(checkLowAttendance(null)).toEqual([])
    expect(checkLowAttendance({})).toEqual([])
    expect(checkLowAttendance({ subjects: [] })).toEqual([])
  })

  it('skips subjects with 0 recorded classes (no false positives)', () => {
    const data = {
      subjects: ['Math', 'Physics'],
      attendance: {},
      historicalAttendance: {
        Math: { P: 0, A: 0, L: 0, total: 0 },
      },
    }
    const result = checkLowAttendance(data)
    expect(result).toEqual([])
  })

  it('detects single subject below 75% default threshold and calculates N classes needed', () => {
    const data = {
      subjects: ['Math', 'Physics'],
      attendance: {
        '2026-08-01': { Math: 'P', Physics: 'P' },
        '2026-08-02': { Math: 'A', Physics: 'P' },
        '2026-08-03': { Math: 'A', Physics: 'P' },
        '2026-08-04': { Math: 'A', Physics: 'P' },
      },
    }
    // Math: 1 P / 4 total = 25% (< 75%)
    // Physics: 4 P / 4 total = 100% (>= 75%)
    const result = checkLowAttendance(data)
    expect(result.length).toBe(1)
    expect(result[0].subject).toBe('Math')
    expect(result[0].pct).toBe(25)
    // 1 P out of 4 total -> needs 8 attended classes: (1+8)/(4+8) = 9/12 = 75%
    expect(result[0].classesNeeded).toBe(8)
  })

  it('respects user-configured custom threshold (e.g. 80%)', () => {
    const data = {
      subjects: ['Math'],
      targetThreshold: 80,
      attendance: {
        '2026-08-01': { Math: 'P' },
        '2026-08-02': { Math: 'P' },
        '2026-08-03': { Math: 'P' },
        '2026-08-04': { Math: 'A' },
      },
    }
    // Math: 3/4 = 75%. Below 80% custom threshold.
    const result = checkLowAttendance(data)
    expect(result.length).toBe(1)
    expect(result[0].subject).toBe('Math')
    expect(result[0].pct).toBe(75)
    // (0.8*4 - 3)/0.2 = (3.2 - 3)/0.2 = 1
    expect(result[0].classesNeeded).toBe(1)
  })

  it('filters attendance records within the active term boundaries', () => {
    const currentTerm = {
      startDate: '2026-08-01',
      endDate: '2026-08-05',
    }

    const data = {
      subjects: ['Math'],
      attendance: {
        // Outside term — old term (10 absences)
        '2026-01-01': { Math: 'A' },
        '2026-01-02': { Math: 'A' },
        '2026-01-03': { Math: 'A' },
        // Inside active term (4 presents out of 4)
        '2026-08-01': { Math: 'P' },
        '2026-08-02': { Math: 'P' },
        '2026-08-03': { Math: 'P' },
        '2026-08-04': { Math: 'P' },
      },
    }

    const result = checkLowAttendance(data, currentTerm)
    // Inside current term, attendance is 100%, so no low attendance warning!
    expect(result).toEqual([])
  })
})

describe('formatLowAttendanceMessage', () => {
  it('returns empty string for empty array', () => {
    expect(formatLowAttendanceMessage([])).toBe('')
    expect(formatLowAttendanceMessage(null)).toBe('')
  })

  it('formats message correctly for single subject', () => {
    const low = [{ subject: 'Math', pct: 60, classesNeeded: 3 }]
    const msg = formatLowAttendanceMessage(low)
    expect(msg).toBe('Your Math attendance is at 60% — attend the next 3 classes to recover.')
  })

  it('formats message correctly for 1 class needed (singular word test)', () => {
    const low = [{ subject: 'Math', pct: 74, classesNeeded: 1 }]
    const msg = formatLowAttendanceMessage(low)
    expect(msg).toBe('Your Math attendance is at 74% — attend the next 1 class to recover.')
  })

  it('formats combined message for multiple subjects', () => {
    const low = [
      { subject: 'Math', pct: 60, classesNeeded: 3 },
      { subject: 'Physics', pct: 50, classesNeeded: 5 },
    ]
    const msg = formatLowAttendanceMessage(low)
    expect(msg).toBe('Low attendance warning: Math (60% — attend 3 classes), Physics (50% — attend 5 classes) to recover.')
  })
})
