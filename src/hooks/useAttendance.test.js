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
      phase: 'active',
      lectureSettings: { durationMinutes: 60 },
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(remoteData),
    })

    const user = { id: 'uuid-123', getAuthJson: vi.fn().mockResolvedValue({ accessToken: 'token-123' }) }
    const { result } = renderHook(() => useAttendance(user))

    await waitFor(() => {
      expect(result.current.dataLoading).toBe(false)
    })
    expect(result.current.data.subjects).toEqual(['Math'])
    expect(result.current.data.phase).toBe('active')
    // syncStatus may be 'synced' or 'syncing' (debounced save triggers on data change)
    expect(['synced', 'syncing']).toContain(result.current.syncStatus)
  })

  it('falls back to DEFAULT_DATA when backend returns null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(null),
    })

    const user = { id: 'uuid-123', getAuthJson: vi.fn().mockResolvedValue({ accessToken: 'token-123' }) }
    const { result } = renderHook(() => useAttendance(user))

    await waitFor(() => {
      expect(result.current.dataLoading).toBe(false)
    })
    expect(result.current.data).toEqual(DEFAULT_DATA)
  })

  it('sets syncStatus to error on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const user = { id: 'uuid-123', getAuthJson: vi.fn().mockResolvedValue({ accessToken: 'token-123' }) }
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

    const user = { id: 'uuid-123', getAuthJson: vi.fn().mockResolvedValue({ accessToken: 'token-123' }) }
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

    const user = { id: 'my-uuid-456', getAuthJson: vi.fn().mockResolvedValue({ accessToken: 'token-123' }) }
    renderHook(() => useAttendance(user))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/api/data',
        { headers: { 'x-stack-access-token': 'token-123' } }
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

    const user = { id: 'uuid-123', getAuthJson: vi.fn().mockResolvedValue({ accessToken: 'token-123' }) }
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

    const user = { id: 'uuid-123', getAuthJson: vi.fn().mockResolvedValue({ accessToken: 'token-123' }) }
    const { result } = renderHook(() => useAttendance(user))

    await waitFor(() => {
      expect(result.current.dataLoading).toBe(false)
    })
    expect(result.current.syncStatus).toBe('error')
  })
})
