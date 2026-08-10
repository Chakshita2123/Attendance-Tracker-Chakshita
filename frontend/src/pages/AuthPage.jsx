import { useRef, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { useAurora, useNeural } from '../hooks/useBackground'
import FloatingShapes from '../components/effects/FloatingShapes'

export default function AuthPage({ authError, signInWithGoogle, onPrivacy, onTerms }) {
  const auroraRef = useRef(null)
  const neuralRef = useRef(null)
  const googleBtnRef = useRef(null)

  useAurora(auroraRef)
  useNeural(neuralRef)

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId) return

    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              signInWithGoogle(response.credential)
            }
          },
        })

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = ''
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            width: 280,
            text: 'continue_with',
            shape: 'pill',
          })
        }
      }
    }

    if (window.google?.accounts?.id) {
      initGoogle()
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval)
          initGoogle()
        }
      }, 200)
      return () => clearInterval(interval)
    }
  }, [clientId, signInWithGoogle])

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

  return (
    <div className="auth-screen">
      <Backgrounds />

      <div className="auth-card" style={{ textAlign: 'center', padding: '36px 28px' }}>
        <div className="auth-brand" style={{ marginBottom: 28 }}>
          <div className="auth-logo" style={{ fontSize: '2.2rem', letterSpacing: 2 }}>MARKD</div>
          <div className="auth-tagline" style={{ marginTop: 6, fontSize: 12 }}>Mark · Track · Analyse</div>
        </div>

        {authError && (
          <div className="error-box" style={{ marginBottom: 20, textAlign: 'left' }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            {authError}
          </div>
        )}

        <div style={{ marginBottom: 24, color: 'var(--text-2)', fontSize: 13 }}>
          Sign in to access your attendance tracker, schedule, and analytics.
        </div>

        {/* Google OAuth Button Container */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, minHeight: 44 }}>
          {clientId ? (
            <div ref={googleBtnRef} />
          ) : (
            <div style={{
              background: 'var(--card-bg-2, rgba(255,255,255,0.05))',
              border: '1px dashed var(--border)',
              borderRadius: 24,
              padding: '12px 20px',
              fontSize: 12,
              color: 'var(--amber)',
            }}>
              Please set <strong>VITE_GOOGLE_CLIENT_ID</strong> in frontend/.env to enable Google Sign-In.
            </div>
          )}
        </div>

        {/* Footer links */}
        <div style={{
          marginTop: 28,
          paddingTop: 16,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'center',
          gap: 20,
        }}>
          <FooterLink onClick={onPrivacy}>Privacy Policy</FooterLink>
          <FooterLink onClick={onTerms}>Terms of Service</FooterLink>
        </div>
      </div>
    </div>
  )
}

function FooterLink({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        color: 'var(--text-3)',
        fontSize: 11,
        cursor: 'pointer',
        padding: 0,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em',
        textDecoration: 'underline',
        textDecorationColor: 'var(--border)',
        transition: 'color 0.15s',
      }}
      onMouseEnter={e => e.target.style.color = 'var(--text-2)'}
      onMouseLeave={e => e.target.style.color = 'var(--text-3)'}
    >
      {children}
    </button>
  )
}
