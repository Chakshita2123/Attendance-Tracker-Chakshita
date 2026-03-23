import { useRef, useState } from 'react'
import { AlertCircle, Mail } from 'lucide-react'
import { useAurora, useNeural } from '../hooks/useBackground'
import FloatingShapes from '../components/effects/FloatingShapes'

export default function AuthPage({ authError, signUpDone, setSignUpDone, signIn, signUp }) {
  const auroraRef = useRef(null)
  const neuralRef = useRef(null)
  useAurora(auroraRef)
  useNeural(neuralRef)

  const [busy, setBusy] = useState(false)

  const handleSignIn = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await signIn(e.target.email.value, e.target.password.value)
    } finally {
      setBusy(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await signUp(e.target.email.value, e.target.password.value)
    } finally {
      setBusy(false)
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

  /* ── Sign-up success — show email confirmation notice ── */
  if (signUpDone) {
    return (
      <div className="auth-screen">
        <Backgrounds />
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 20 }}>
            <Mail size={40} color="var(--teal)" style={{ margin: '0 auto 12px' }} />
            <div className="auth-logo" style={{ fontSize: '1.8rem' }}>ACCOUNT CREATED</div>
          </div>
          <p style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.7, marginBottom: 24 }}>
            Your account has been created with your own backend auth.<br />
            You can continue straight into the app or sign in again later.
          </p>
          <button
            className="btn btn-primary btn-lg btn-full"
            onClick={() => setSignUpDone(false)}
          >
            CONTINUE
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
          <div className="auth-tagline">Mark · Track · Analyse</div>
        </div>

        {authError && (
          <div className="error-box">
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            {authError}
          </div>
        )}

        {/* Sign In form */}
        <form id="auth-form" onSubmit={handleSignIn}>
          <div className="input-wrap">
            <label className="input-label">Email</label>
            <input
              name="email" type="email" className="input"
              placeholder="you@example.com" required autoComplete="email"
            />
          </div>
          <div className="input-wrap" style={{ marginBottom: 14 }}>
            <label className="input-label">Password</label>
            <input
              name="password" type="password" className="input"
              placeholder="••••••••••" required autoComplete="current-password"
              minLength={6}
            />
          </div>

          {/* Two separate submit buttons — one per action */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={busy}
            >
              {busy ? '…' : 'SIGN IN'}
            </button>
            <button
              type="button"
              className="btn btn-lg"
              disabled={busy}
              onClick={async (e) => {
                // Validate form fields, then trigger sign-up
                const form = document.getElementById('auth-form')
                if (!form.reportValidity()) return
                await handleSignUp({ preventDefault: () => {}, target: form })
              }}
            >
              {busy ? '…' : 'SIGN UP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
