import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const mockGetUser = vi.fn()
const mockSignInWithCredential = vi.fn()
const mockSignUpWithCredential = vi.fn()
const mockSignInWithOAuth = vi.fn()
const mockSignOut = vi.fn()

const mockStackApp = {
  getUser: mockGetUser,
  signInWithCredential: mockSignInWithCredential,
  signUpWithCredential: mockSignUpWithCredential,
  signInWithOAuth: mockSignInWithOAuth,
}

vi.mock('../lib/stack', () => ({
  isStackConfigured: true,
  stackApp: mockStackApp,
}))

const { useAuth } = await import('./useAuth')

describe('useAuth', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue(null)
    mockSignInWithCredential.mockResolvedValue({ status: 'ok' })
    mockSignUpWithCredential.mockResolvedValue({ status: 'ok' })
    mockSignInWithOAuth.mockResolvedValue()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('starts with loading=true and user=null', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
  })

  it('sets user after getUser resolves with a user', async () => {
    const fakeUser = { id: 'uuid-123', primaryEmail: 'test@test.com' }
    mockGetUser.mockResolvedValue(fakeUser)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.user).toEqual(fakeUser)
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

  it('signIn calls stackApp.signInWithCredential', async () => {
    const fakeUser = { id: 'uuid-123' }
    mockGetUser.mockResolvedValue(fakeUser)

    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.signIn('user@test.com', 'password123')
    })

    expect(mockSignInWithCredential).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'password123',
      noRedirect: true,
    })
  })

  it('signIn sets authError on failure', async () => {
    mockSignInWithCredential.mockResolvedValue({
      status: 'error',
      error: { message: 'Invalid credentials' },
    })

    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.signIn('bad@test.com', 'wrong')
    })

    expect(result.current.authError).toBe('Invalid credentials')
  })

  it('signUp calls stackApp.signUpWithCredential and sets signUpDone', async () => {

    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.signUp('new@test.com', 'password123')
    })

    expect(mockSignUpWithCredential).toHaveBeenCalledWith({
      email: 'new@test.com',
      password: 'password123',
      noRedirect: true,
    })
    expect(result.current.signUpDone).toBe(true)
  })

  it('signUp sets authError on failure', async () => {
    mockSignUpWithCredential.mockResolvedValue({
      status: 'error',
      error: { message: 'Email already taken' },
    })

    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.signUp('exists@test.com', 'password')
    })

    expect(result.current.authError).toBe('Email already taken')
    expect(result.current.signUpDone).toBe(false)
  })

  it('signOut signs out the current user', async () => {
    mockGetUser.mockResolvedValue({ id: 'uuid-123', signOut: mockSignOut })

    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.signOut()
    })

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('signInWithGoogle delegates to stackApp', async () => {
    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.signInWithGoogle()
    })

    expect(mockSignInWithOAuth).toHaveBeenCalledWith('google', {
      returnTo: window.location.origin,
    })
  })
})
