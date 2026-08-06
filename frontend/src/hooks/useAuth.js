import { useState, useEffect } from 'react'
import { getApiBaseUrl } from '../utils/api'

const TOKEN_KEY = 'markd_auth_token'
const getBaseUrl = () => getApiBaseUrl()




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

const isFetchError = (msg) => (
  msg.includes('Failed to fetch') ||
  msg.includes('NetworkError') ||
  msg.includes('Network request failed') ||
  msg.includes('Load failed')
)

async function executeWithRetry(url, fetchOptions, onRetryNotice) {
  try {
    return await fetch(url, fetchOptions)
  } catch (firstErr) {
    const firstMsg = firstErr instanceof Error ? firstErr.message : String(firstErr)
    if (isFetchError(firstMsg)) {
      if (onRetryNotice) onRetryNotice()
      // Wait 2.5 seconds for Render server cold start spin-up
      await new Promise((r) => setTimeout(r, 2500))
      return await fetch(url, fetchOptions)
    }
    throw firstErr
  }
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [signUpDone, setSignUpDone] = useState(false)

  useEffect(() => {
    let active = true

    // Light-weight background request to wake up Render instance on app launch
    const warmUpBackend = async () => {
      try {
        const baseUrl = getBaseUrl()
        if (baseUrl) {
          fetch(`${baseUrl}/health`).catch(() => {})
        }
      } catch {}
    }
    warmUpBackend()

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
        const response = await fetch(`${getBaseUrl()}/api/auth/me`, {
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

    const url = `${getBaseUrl()}/api/auth/signin`
    try {
      const response = await executeWithRetry(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        },
        () => {
          setAuthError('Server is waking up (Render free tier), retrying connection...')
        }
      )
      const data = await parseResponse(response)
      storeToken(data.token)
      setUser({ ...data.user, authToken: data.token })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (isFetchError(msg)) {
        setAuthError('Server is waking up, please wait a moment and try again.')
      } else {
        setAuthError(msg || 'Failed to sign in. Please check your credentials and try again.')
      }
    }
  }

  const signUp = async (email, password) => {
    setAuthError(null)

    const url = `${getBaseUrl()}/api/auth/signup`
    try {
      const response = await executeWithRetry(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        },
        () => {
          setAuthError('Server is waking up (Render free tier), retrying connection...')
        }
      )
      const data = await parseResponse(response)
      storeToken(data.token)
      setUser({ ...data.user, authToken: data.token })
      setSignUpDone(true)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (isFetchError(msg)) {
        setAuthError('Server is waking up, please wait a moment and try again.')
      } else {
        setAuthError(msg || 'Failed to create account. Please check your information and try again.')
      }
    }
  }

  const signOut = async () => {
    setAuthError(null)
    const token = getStoredToken()

    try {
      if (token) {
        await fetch(`${getBaseUrl()}/api/auth/logout`, {
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
