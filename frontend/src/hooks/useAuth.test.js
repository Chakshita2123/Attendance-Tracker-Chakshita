import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const mockFetch = vi.fn()
global.fetch = mockFetch

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

const { useAuth } = await import('./useAuth')

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts with loading=true and user=null', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
  })

  it('restores user from a stored token', async () => {
    localStorageMock.setItem('markd_auth_token', 'token-123')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ user: { id: 'uuid-123', email: 'test@test.com' } }),
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.user).toEqual({
        id: 'uuid-123',
        email: 'test@test.com',
        authToken: 'token-123',
      })
      expect(result.current.loading).toBe(false)
    })
  })

  it('sets user to null when no session exists', async () => {
    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.user).toBeNull()
      expect(result.current.loading).toBe(false)
    })
  })

  it('signIn stores the backend token and user', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        token: 'token-123',
        user: { id: 'uuid-123', email: 'user@test.com' },
      }),
    })

    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.signIn('user@test.com', 'password123')
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/auth/signin',
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.current.user).toEqual({
      id: 'uuid-123',
      email: 'user@test.com',
      authToken: 'token-123',
    })
  })

  it('signIn sets authError on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid email or password' }),
    })

    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.signIn('bad@test.com', 'wrong')
    })

    expect(result.current.authError).toBe('Invalid email or password')
  })

  it('signUp sets signUpDone and stores the token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        token: 'token-123',
        user: { id: 'uuid-123', email: 'new@test.com' },
      }),
    })

    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.signUp('new@test.com', 'password123')
    })

    expect(result.current.signUpDone).toBe(true)
    expect(result.current.user?.email).toBe('new@test.com')
  })

  it('signOut clears the user and stored token', async () => {
    localStorageMock.setItem('markd_auth_token', 'token-123')
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: { id: 'uuid-123', email: 'user@test.com' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Logged out successfully' }),
      })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.signOut()
    })

    expect(result.current.user).toBeNull()
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('markd_auth_token')
  })
})
