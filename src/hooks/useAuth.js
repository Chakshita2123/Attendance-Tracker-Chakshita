import { useState, useEffect } from 'react'
import { isStackConfigured, stackApp } from '../lib/stack'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [signUpDone, setSignUpDone] = useState(false)

  useEffect(() => {
    let active = true

    const loadUser = async () => {
      if (!isStackConfigured || !stackApp) {
        if (active) {
          setAuthError('Neon Auth is not configured. Add VITE_STACK_PROJECT_ID and VITE_STACK_PUBLISHABLE_CLIENT_KEY to the root .env file.')
          setLoading(false)
        }
        return
      }

      try {
        const currentUser = await stackApp.getUser()
        if (active) {
          setUser(currentUser ?? null)
        }
      } catch (error) {
        if (active) {
          setAuthError(error instanceof Error ? error.message : 'Failed to initialize Neon Auth')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadUser()

    return () => {
      active = false
    }
  }, [])

  const signIn = async (email, password) => {
    setAuthError(null)
    if (!stackApp) {
      setAuthError('Neon Auth is not configured')
      return
    }

    const result = await stackApp.signInWithCredential({
      email,
      password,
      noRedirect: true,
    })

    if (result.status === 'error') {
      setAuthError(result.error.message)
      return
    }

    setUser(await stackApp.getUser())
  }

  const signUp = async (email, password) => {
    setAuthError(null)
    if (!stackApp) {
      setAuthError('Neon Auth is not configured')
      return
    }

    const result = await stackApp.signUpWithCredential({
      email,
      password,
      noRedirect: true,
    })

    if (result.status === 'error') {
      setAuthError(result.error.message)
      return
    }

    setSignUpDone(true)
  }

  const signInWithGoogle = async () => {
    setAuthError(null)
    if (!stackApp) {
      setAuthError('Neon Auth is not configured')
      return
    }

    try {
      await stackApp.signInWithOAuth('google', {
        returnTo: window.location.origin,
      })
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Google sign-in failed')
    }
  }

  const signOut = async () => {
    setAuthError(null)

    if (!stackApp) {
      setUser(null)
      return
    }

    const currentUser = await stackApp.getUser()
    if (!currentUser) {
      setUser(null)
      return
    }

    await currentUser.signOut({ redirectUrl: window.location.origin })
    setUser(null)
  }

  return {
    user, loading, authError, setAuthError,
    signUpDone, setSignUpDone,
    signIn, signUp, signInWithGoogle, signOut,
  }
}
