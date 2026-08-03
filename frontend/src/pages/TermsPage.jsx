import { useRef } from 'react'
import { FileText, ArrowLeft } from 'lucide-react'
import { useAurora, useNeural } from '../hooks/useBackground'
import FloatingShapes from '../components/effects/FloatingShapes'

export default function TermsPage({ onBack }) {
  const auroraRef = useRef(null)
  const neuralRef = useRef(null)
  useAurora(auroraRef)
  useNeural(neuralRef)

  return (
    <div className="auth-screen">
      <div className="auth-canvas-layer">
        <canvas ref={auroraRef} />
        <canvas ref={neuralRef} style={{ zIndex: 1 }} />
      </div>
      <FloatingShapes />
      <div className="auth-glows">
        <div className="glow-tl" /><div className="glow-br" />
      </div>

      <div className="auth-card" style={{ maxWidth: 520, overflowY: 'auto', maxHeight: '90vh' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <FileText size={24} color="var(--teal)" />
          <div>
            <div className="auth-logo" style={{ fontSize: '1.2rem' }}>TERMS OF SERVICE</div>
            <div className="auth-tagline" style={{ fontSize: 11 }}>Last updated August 2026</div>
          </div>
        </div>

        <div style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.9 }}>

          <Section title="Acceptance">
            <p>By creating an account and using MARKD, you agree to these terms. If you do not agree, please do not use the service.</p>
          </Section>

          <Section title="What MARKD is">
            <p>MARKD is a personal attendance-tracking tool. It is provided free of charge as a portfolio project. It is <em>not</em> an official academic record and should not be used as one.</p>
          </Section>

          <Section title="Your account">
            <ul style={{ paddingLeft: 18 }}>
              <li>You are responsible for keeping your account credentials secure.</li>
              <li>One person may hold one account. You may not share accounts.</li>
              <li>You must be at least 13 years old to use MARKD.</li>
            </ul>
          </Section>

          <Section title="Acceptable use">
            <p>You agree not to:</p>
            <ul style={{ paddingLeft: 18, marginTop: 6 }}>
              <li>Attempt to access another user's data.</li>
              <li>Probe or attack the service for security vulnerabilities (please report them responsibly instead).</li>
              <li>Use automated scripts to spam the service or circumvent rate limits.</li>
            </ul>
          </Section>

          <Section title="Your data">
            <p>You own your attendance data. You can request a full deletion at any time. See our <strong style={{ color: 'var(--teal)' }}>Privacy Policy</strong> for details on how data is stored and protected.</p>
          </Section>

          <Section title="Service availability">
            <p>MARKD is hosted on Render's free tier. It may occasionally go offline for maintenance or due to resource limits. We do not guarantee uninterrupted availability and are not liable for data loss caused by outages.</p>
          </Section>

          <Section title="No warranties">
            <p>MARKD is provided <strong style={{ color: 'var(--text-1)' }}>as is</strong>, without warranty of any kind. We make no guarantees about accuracy, reliability, or fitness for any particular purpose.</p>
          </Section>

          <Section title="Limitation of liability">
            <p>To the maximum extent permitted by applicable law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
          </Section>

          <Section title="Changes to terms">
            <p>We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the updated terms.</p>
          </Section>

        </div>

        <button className="btn btn-full" onClick={onBack} style={{ marginTop: 24 }}>
          <ArrowLeft size={13} /> BACK
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontFamily: 'var(--font-head)',
        fontSize: '0.8rem',
        fontWeight: 700,
        color: 'var(--teal)',
        letterSpacing: '0.08em',
        marginBottom: 8,
        textTransform: 'uppercase',
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}
