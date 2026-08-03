import { useRef } from 'react'
import { Shield, ArrowLeft } from 'lucide-react'
import { useAurora, useNeural } from '../hooks/useBackground'
import FloatingShapes from '../components/effects/FloatingShapes'

export default function PrivacyPolicyPage({ onBack }) {
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
          <Shield size={24} color="var(--teal)" />
          <div>
            <div className="auth-logo" style={{ fontSize: '1.2rem' }}>PRIVACY POLICY</div>
            <div className="auth-tagline" style={{ fontSize: 11 }}>Last updated August 2026</div>
          </div>
        </div>

        <div style={{ color: 'var(--text-2)', fontSize: 13, lineHeight: 1.9 }}>

          <Section title="What we collect">
            <p>MARKD collects and stores:</p>
            <ul style={{ paddingLeft: 18, marginTop: 6 }}>
              <li><strong style={{ color: 'var(--text-1)' }}>Email address</strong> — used to create your account and send password reset emails.</li>
              <li><strong style={{ color: 'var(--text-1)' }}>Password</strong> — stored as a salted hash (we never store the plaintext password).</li>
              <li><strong style={{ color: 'var(--text-1)' }}>Attendance records</strong> — subject names, timetable, and daily attendance marks you enter.</li>
            </ul>
            <p style={{ marginTop: 8 }}>We do <em>not</em> collect your name, phone number, location, or any other personal information.</p>
          </Section>

          <Section title="How we use it">
            <ul style={{ paddingLeft: 18 }}>
              <li>To authenticate you and show you your own attendance data.</li>
              <li>To send password reset emails when you request them.</li>
              <li>We do <em>not</em> use your data for marketing, profiling, or any automated decision-making.</li>
            </ul>
          </Section>

          <Section title="Third-party services">
            <p>We use the following third-party services:</p>
            <ul style={{ paddingLeft: 18, marginTop: 6 }}>
              <li><strong style={{ color: 'var(--text-1)' }}>MongoDB Atlas</strong> — cloud database where your data is stored.</li>
              <li><strong style={{ color: 'var(--text-1)' }}>Brevo</strong> — used solely to send password reset emails. Only your email address is shared, and only when you request a reset.</li>
              <li><strong style={{ color: 'var(--text-1)' }}>Render</strong> — the cloud platform that hosts the app.</li>
            </ul>
            <p style={{ marginTop: 8 }}>We do not share your data with any other third parties.</p>
          </Section>

          <Section title="Data retention">
            <p>Your data is retained for as long as your account exists. You can request deletion of your account and all associated data by emailing us. We will delete it within 7 days.</p>
          </Section>

          <Section title="Security">
            <p>Passwords are hashed with <code style={{ background: 'var(--bg-raised)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>scrypt</code> before storage. Connections are encrypted over HTTPS. We keep software dependencies up to date.</p>
          </Section>

          <Section title="Your rights">
            <p>You have the right to access, correct, or delete the data we hold about you. Contact us through the app or at your registered email address to exercise these rights.</p>
          </Section>

          <Section title="Contact">
            <p>If you have any questions about this policy, open a GitHub issue on the MARKD repository or reach out through your account email.</p>
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
