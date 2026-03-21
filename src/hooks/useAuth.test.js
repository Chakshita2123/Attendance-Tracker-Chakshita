import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock Supabase before importing the hook
const mockUnsubscribe = vi.fn()
let authChangeCallback = null

const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn((cb) => {
      authChangeCallback = cb
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
    }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  },
}

vi.mock('../lib/supabase', () => ({
  supabase: mockSupabase,
}))

const { useAuth } = await import('./useAuth')

describe('useAuth', () => {
  beforeEach(() => {
    authChangeCallback = null
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('starts with loading=true and user=null', () => {
    const { result } = renderHook(() => useAuth())
    // Before getSession resolves, user is null
    expect(result.current.user).toBeNull()
  })

  it('sets user after getSession resolves with a session', async () => {
    const fakeUser = { id: 'uuid-123', email: 'test@test.com' }
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: fakeUser } },
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.user).toEqual(fakeUser)
      expect(result.current.loading).toBe(false)
    })
  })

  it('sets user to null when no session exists', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.user).toBeNull()
      expect(result.current.loading).toBe(false)
    })
  })

  it('signIn calls supabase.auth.signInWithPassword', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.signIn('user@test.com', 'password123')
    })

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'password123',
    })
  })

  it('signIn sets authError on failure', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid credentials' },
    })

    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.signIn('bad@test.com', 'wrong')
    })

    expect(result.current.authError).toBe('Invalid credentials')
  })

  it('signUp calls supabase.auth.signUp and sets signUpDone', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.signUp('new@test.com', 'password123')
    })

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@test.com',
      password: 'password123',
    })
    expect(result.current.signUpDone).toBe(true)
  })

  it('signUp sets authError on failure', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      error: { message: 'Email already taken' },
    })

    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.signUp('exists@test.com', 'password')
    })

    expect(result.current.authError).toBe('Email already taken')
    expect(result.current.signUpDone).toBe(false)
  })

  it('signOut calls supabase.auth.signOut', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.signOut()
    })

    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('cleans up onAuthStateChange subscription on unmount', () => {
    const { unmount } = renderHook(() => useAuth())
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})
