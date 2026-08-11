import { useRef, useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { AlertCircle } from 'lucide-react'
import { useAurora, useNeural } from '../hooks/useBackground'
import FloatingShapes from '../components/effects/FloatingShapes'

export default function AuthPage({ authError, signInWithGoogle, signInWithGoogleNative, onPrivacy, onTerms }) {
  const auroraRef = useRef(null)
  const neuralRef = useRef(null)
  const googleBtnRef = useRef(null)
  const [nativeLoading, setNativeLoading] = useState(false)

  useAurora(auroraRef)
  useNeural(neuralRef)

  const isNative = Capacitor.isNativePlatform()
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (isNative || !clientId) return

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
  }, [clientId, isNative, signInWithGoogle])

  const handleNativeSignIn = async () => {
    setNativeLoading(true)
    try {
      if (signInWithGoogleNative) {
        await signInWithGoogleNative()
      }
    } finally {
      setNativeLoading(false)
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
          {isNative ? (
            <button
              type="button"
              onClick={handleNativeSignIn}
              disabled={nativeLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                width: 280,
                height: 44,
                borderRadius: 22,
                background: '#131314',
                color: '#e3e3e3',
                border: '1px solid #8e918f',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'var(--font-sans, system-ui, sans-serif)',
                cursor: nativeLoading ? 'wait' : 'pointer',
                opacity: nativeLoading ? 0.7 : 1,
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                transition: 'background 0.2s, opacity 0.2s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.41-1.57-5.13-3.72l-2.9 2.24C2.43 15.98 5.45 18 9 18z"/>
                <path fill="#FBBC05" d="M3.87 10.8c-.18-.53-.28-1.09-.28-1.8s.1-1.27.28-1.8l-2.9-2.24C.36 6.3 0 7.59 0 9s.36 2.7 1.05 4.04l2.82-2.24z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.34l2.58-2.58C13.46.89 11.43 0 9 0 5.45 0 2.43 2.02 1.05 4.96l2.9 2.24C4.59 5.05 6.62 3.58 9 3.58z"/>
              </svg>
              <span>{nativeLoading ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          ) : clientId ? (
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
