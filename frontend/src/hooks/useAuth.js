import { useState, useEffect } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const TOKEN_KEY = 'markd_auth_token'

function shouldForceLogin() {
  if (typeof window === 'undefined') return false

  const params = new URLSearchParams(window.location.search)
  return params.get('forceLogin') === '1'
}

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

function storeToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Authentication request failed')
  }

  return data
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [signUpDone, setSignUpDone] = useState(false)

  useEffect(() => {
    let active = true

    const loadUser = async () => {
      if (shouldForceLogin()) {
        clearToken()
        if (active) {
          setUser(null)
          setSignUpDone(false)
          setLoading(false)
        }
        return
      }

      const token = getStoredToken()
      if (!token) {
        if (active) setLoading(false)
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const data = await parseResponse(response)

        if (active) {
          setUser({ ...data.user, authToken: token })
        }
      } catch (error) {
        clearToken()
        if (active) {
          setAuthError(error instanceof Error ? error.message : 'Failed to restore session')
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

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await parseResponse(response)
      storeToken(data.token)
      setUser({ ...data.user, authToken: data.token })
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to sign in')
    }
  }

  const signUp = async (email, password) => {
    setAuthError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await parseResponse(response)
      storeToken(data.token)
      setUser({ ...data.user, authToken: data.token })
      setSignUpDone(true)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to create account')
    }
  }

  const signOut = async () => {
    setAuthError(null)
    const token = getStoredToken()

    try {
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      }
    } finally {
      clearToken()
      setUser(null)
      setSignUpDone(false)
    }
  }

  return {
    user, loading, authError, setAuthError,
    signUpDone, setSignUpDone,
    signIn, signUp, signOut,
  }
}
