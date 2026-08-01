import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { DEFAULT_DATA } from '../constants'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = value }),
    removeItem: vi.fn((key) => { delete store[key] }),
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const { useAttendance } = await import('./useAttendance')

describe('useAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not fetch when user is null', async () => {
    const { result } = renderHook(() => useAttendance(null))

    await waitFor(() => {
      expect(result.current.dataLoading).toBe(false)
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('loads data from backend on mount when user is present', async () => {
    const remoteData = {
      subjects: ['Math'],
      timetable: DEFAULT_DATA.timetable,
      attendance: {},
      dailyLog: {},
      historicalAttendance: { Math: { P: 8, A: 2, L: 0, total: 10 } },
      phase: 'active',
      lectureSettings: { durationMinutes: 60 },
      _version: 5,
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(remoteData),
    })

    const user = { id: 'uuid-123', authToken: 'token-123' }
    const { result } = renderHook(() => useAttendance(user))

    await waitFor(() => {
      expect(result.current.dataLoading).toBe(false)
    })
    expect(result.current.data.subjects).toEqual(['Math'])
    expect(result.current.data.historicalAttendance.Math).toEqual({ P: 8, A: 2, L: 0, total: 10 })
    expect(result.current.data.phase).toBe('active')
    // syncStatus may be 'synced' or 'syncing' (debounced save triggers on data change)
    expect(['synced', 'syncing']).toContain(result.current.syncStatus)
  })

  it('falls back to DEFAULT_DATA when backend returns null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(null),
    })

    const user = { id: 'uuid-123', authToken: 'token-123' }
    const { result } = renderHook(() => useAttendance(user))

    await waitFor(() => {
      expect(result.current.dataLoading).toBe(false)
    })
    expect(result.current.data).toEqual(DEFAULT_DATA)
  })

  it('sets syncStatus to error on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const user = { id: 'uuid-123', authToken: 'token-123' }
    const { result } = renderHook(() => useAttendance(user))

    await waitFor(() => {
      expect(result.current.dataLoading).toBe(false)
    })
    expect(result.current.syncStatus).toBe('error')
  })

  it('falls back to localStorage on fetch error', async () => {
    const savedData = { ...DEFAULT_DATA, subjects: ['Physics'], phase: 'active' }
    localStorageMock.setItem('markd_v1', JSON.stringify(savedData))

    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const user = { id: 'uuid-123', authToken: 'token-123' }
    const { result } = renderHook(() => useAttendance(user))

    await waitFor(() => {
      expect(result.current.dataLoading).toBe(false)
    })
    expect(result.current.data.subjects).toEqual(['Physics'])
  })

  it('calls fetch with correct userId', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(null),
    })

    const user = { id: 'my-uuid-456', authToken: 'token-123' }
    renderHook(() => useAttendance(user))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/data',
        { headers: { Authorization: 'Bearer token-123' } }
      )
    })
  })

  it('resetData sends POST with DEFAULT_DATA and clears localStorage', async () => {
    // Initial load
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ...DEFAULT_DATA, subjects: ['Math'], phase: 'active' }),
    })
    // Reset POST
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'saved' }),
    })

    const user = { id: 'uuid-123', authToken: 'token-123' }
    const { result } = renderHook(() => useAttendance(user))

    await waitFor(() => {
      expect(result.current.dataLoading).toBe(false)
    })

    await act(async () => {
      await result.current.resetData()
    })

    expect(result.current.data).toEqual(DEFAULT_DATA)
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('markd_v1')
  })

  it('sets syncStatus to error when fetch returns non-ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const user = { id: 'uuid-123', authToken: 'token-123' }
    const { result } = renderHook(() => useAttendance(user))

    await waitFor(() => {
      expect(result.current.dataLoading).toBe(false)
    })
    expect(result.current.syncStatus).toBe('error')
  })

  it('exposes setToastFn for wiring conflict toasts', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(null),
    })

    const user = { id: 'uuid-123', authToken: 'token-123' }
    const { result } = renderHook(() => useAttendance(user))

    await waitFor(() => expect(result.current.dataLoading).toBe(false))
    expect(typeof result.current.setToastFn).toBe('function')
  })

  it('handles 409 conflict by re-fetching fresh data instead of overwriting', async () => {
    vi.useFakeTimers()

    // Initial load
    const initialData = {
      ...DEFAULT_DATA,
      subjects: ['Math'],
      phase: 'active',
      _version: 2,
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(initialData),
    })

    const toastFn = vi.fn()
    const user = { id: 'uuid-123', authToken: 'token-123' }
    const { result } = renderHook(() => useAttendance(user))

    await waitFor(() => expect(result.current.dataLoading).toBe(false))

    // Inject toast function
    act(() => { result.current.setToastFn(toastFn) })

    // The debounced save will trigger with stale _version; server returns 409
    const freshData = { ...DEFAULT_DATA, subjects: ['Math', 'Physics'], phase: 'active', _version: 3 }
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 409, json: () => Promise.resolve({ error: 'conflict' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(freshData) })

    // Trigger a data change to start the debounced save
    act(() => {
      result.current.setData(d => ({ ...d, phase: 'ready' }))
    })

    // Advance debounce timer
    await act(async () => { vi.advanceTimersByTime(1100) })

    // Should have re-fetched and applied fresh data
    await waitFor(() => {
      expect(result.current.data.subjects).toContain('Physics')
    })

    // Toast should have been called with a conflict message
    expect(toastFn).toHaveBeenCalledWith(
      expect.stringContaining('Conflict'),
      'error'
    )

    vi.useRealTimers()
  })
})
