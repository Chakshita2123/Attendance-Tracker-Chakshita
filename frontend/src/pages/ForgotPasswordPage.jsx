import { useRef, useState } from 'react'
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { useAurora, useNeural } from '../hooks/useBackground'
import FloatingShapes from '../components/effects/FloatingShapes'

const API = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:5000')

export default function ForgotPasswordPage({ onBack }) {
  const auroraRef = useRef(null)
  const neuralRef = useRef(null)
  useAurora(auroraRef)
  useNeural(neuralRef)

  const [email,  setEmail]  = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'loading' | 'sent' | 'error'
  const [error,  setError]  = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    setError('')

    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      })
      // Route always returns 200 — but if rate-limited we get 429
      if (res.status === 429) {
        const data = await res.json()
        setError(data.error || 'Too many attempts. Please try again later.')
        setStatus('error')
        return
      }
      setStatus('sent')
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
  if (status === 'sent') {
    return (
      <div className="auth-screen">
        <Backgrounds />
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <CheckCircle size={44} color="var(--teal)" style={{ margin: '0 auto 16px' }} />
          <div className="auth-logo" style={{ fontSize: '1.5rem', marginBottom: 12 }}>
            CHECK YOUR EMAIL
          </div>
          <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.8, marginBottom: 24 }}>
            If an account with <strong style={{ color: 'var(--text-1)' }}>{email}</strong> exists,
            we've sent a reset link. It expires in <strong style={{ color: 'var(--text-1)' }}>1 hour</strong>.
          </p>
          <p style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 24 }}>
            Don't see it? Check your spam folder.
          </p>
          <button className="btn btn-full" onClick={onBack}>
            <ArrowLeft size={14} /> BACK TO SIGN IN
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
          <div className="auth-tagline">Reset your password</div>
        </div>

        {status === 'error' && (
          <div className="error-box">
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}

        <p style={{ color: 'var(--text-2)', fontSize: 12, marginBottom: 18, lineHeight: 1.7 }}>
          Enter your account email and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-wrap">
            <label className="input-label">Email</label>
            <input
              id="forgot-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={status === 'loading'}
            style={{ marginBottom: 12 }}
          >
            <Mail size={14} />
            {status === 'loading' ? 'SENDING…' : 'SEND RESET LINK'}
          </button>
        </form>

        <button
          className="btn btn-full"
          onClick={onBack}
          style={{ fontSize: 12, color: 'var(--text-2)' }}
        >
          <ArrowLeft size={13} /> BACK TO SIGN IN
        </button>
      </div>
    </div>
  )
}
