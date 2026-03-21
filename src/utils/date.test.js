import { describe, it, expect } from 'vitest'
import { todayStr, weekday, lastNDays, addMinutes, shortDate } from './date'

describe('todayStr', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns a valid date', () => {
    const d = new Date(todayStr())
    expect(d.toString()).not.toBe('Invalid Date')
  })
})

describe('weekday', () => {
  it('returns correct day for known dates', () => {
    // 2024-01-01 is a Monday
    expect(weekday('2024-01-01')).toBe('Mon')
  })

  it('returns correct day for a Sunday', () => {
    // 2024-01-07 is a Sunday
    expect(weekday('2024-01-07')).toBe('Sun')
  })

  it('returns correct day for a Saturday', () => {
    // 2024-01-06 is a Saturday
    expect(weekday('2024-01-06')).toBe('Sat')
  })

  it('returns correct day for a Wednesday', () => {
    // 2024-01-03 is a Wednesday
    expect(weekday('2024-01-03')).toBe('Wed')
  })
})

describe('lastNDays', () => {
  it('returns array of length n', () => {
    expect(lastNDays(7)).toHaveLength(7)
  })

  it('returns array of length 3 when n=3', () => {
    expect(lastNDays(3)).toHaveLength(3)
  })

  it('last element is today', () => {
    const days = lastNDays(7)
    expect(days[6]).toBe(todayStr())
  })

  it('elements are in ascending order', () => {
    const days = lastNDays(7)
    for (let i = 1; i < days.length; i++) {
      expect(days[i] > days[i - 1]).toBe(true)
    }
  })

  it('defaults to 7 days', () => {
    expect(lastNDays()).toHaveLength(7)
  })

  it('all elements are valid YYYY-MM-DD strings', () => {
    const days = lastNDays(7)
    days.forEach(d => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/))
  })
})

describe('addMinutes', () => {
  it('adds 60 minutes to 09:00', () => {
    expect(addMinutes('09:00', 60)).toBe('10:00')
  })

  it('adds 90 minutes to 09:00', () => {
    expect(addMinutes('09:00', 90)).toBe('10:30')
  })

  it('wraps past midnight', () => {
    expect(addMinutes('23:30', 60)).toBe('00:30')
  })

  it('handles default values for null input', () => {
    // defaults to "09:00" + 60 = "10:00"
    expect(addMinutes(null, null)).toBe('10:00')
  })

  it('adds 0 minutes correctly', () => {
    expect(addMinutes('14:30', 0)).toBe('14:30')
  })
})

describe('shortDate', () => {
  it('formats as "Day DD"', () => {
    expect(shortDate('2024-01-01')).toBe('Mon 01')
  })

  it('formats another date correctly', () => {
    expect(shortDate('2024-01-15')).toBe('Mon 15')
  })
})
