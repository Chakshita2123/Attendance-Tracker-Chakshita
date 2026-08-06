import { useRef, useState } from 'react'
import { KeyRound, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { useAurora, useNeural } from '../hooks/useBackground'
import FloatingShapes from '../components/effects/FloatingShapes'
import { getApiBaseUrl } from '../utils/api'

const API = getApiBaseUrl()


/**
 * Shown when the URL contains ?resetToken=<token>.
 * On success clears the query string so the user can't reuse the link.
 */
export default function ResetPasswordPage({ token, onDone }) {
  const auroraRef = useRef(null)
  const neuralRef = useRef(null)
  useAurora(auroraRef)
  useNeural(neuralRef)

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [status,    setStatus]    = useState('idle') // 'idle' | 'loading' | 'success' | 'error'
  const [error,     setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setStatus('loading')
    try {
      const res  = await fetch(`${getApiBaseUrl()}/api/auth/reset-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, newPassword: password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }

      setStatus('success')
      // Remove the token from the URL so the link can't be reused accidentally
      window.history.replaceState({}, '', window.location.pathname)
    } catch {
      setError('Network error. Please check your connection and try again.')
      setStatus('error')
    }
  }

  const Backgrounds = () => (
    <>
      <div className="auth-canvas-layer">
        <canvas ref={auroraRef} />
        <canvas ref={neuralRef} style={{ zIndex: 1 }} />
      </div>
      <FloatingShapes />
      <div className="auth-glows">
        <div className="glow-tl" /><div className="glow-br" />
      </div>
    </>
  )

  /* ── Success state ── */
  if (status === 'success') {
    return (
      <div className="auth-screen">
        <Backgrounds />
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <CheckCircle size={44} color="var(--teal)" style={{ margin: '0 auto 16px' }} />
          <div className="auth-logo" style={{ fontSize: '1.5rem', marginBottom: 12 }}>
            PASSWORD UPDATED
          </div>
          <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.8, marginBottom: 24 }}>
            Your password has been changed successfully.
            You can now sign in with your new password.
          </p>
          <button className="btn btn-primary btn-lg btn-full" onClick={onDone}>
            GO TO SIGN IN
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <Backgrounds />

      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">MARKD</div>
          <div className="auth-tagline">Set a new password</div>
        </div>

        {error && (
          <div className="error-box">
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-wrap">
            <label className="input-label">New Password</label>
            <input
              id="reset-password"
              type="password"
              className="input"
              placeholder="Min 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
            />
          </div>
          <div className="input-wrap" style={{ marginBottom: 18 }}>
            <label className="input-label">Confirm Password</label>
            <input
              id="reset-password-confirm"
              type="password"
              className="input"
              placeholder="Re-enter password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={status === 'loading'}
          >
            <KeyRound size={14} />
            {status === 'loading' ? 'UPDATING…' : 'SET NEW PASSWORD'}
          </button>
        </form>
      </div>
    </div>
  )
}
