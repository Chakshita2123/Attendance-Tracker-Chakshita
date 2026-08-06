import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth }       from './hooks/useAuth'
import { useAttendance } from './hooks/useAttendance'
import { useToast }      from './hooks/useToast'
import { useTerms }      from './hooks/useTerms'

import AuthPage            from './pages/AuthPage'
import ForgotPasswordPage  from './pages/ForgotPasswordPage'
import ResetPasswordPage   from './pages/ResetPasswordPage'
import PrivacyPolicyPage   from './pages/PrivacyPolicyPage'
import TermsPage           from './pages/TermsPage'
import SetupPage           from './pages/SetupPage'
import TrackerPage         from './pages/TrackerPage'
import AnalyticsPage       from './pages/AnalyticsPage'

import Sidebar   from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import Toast     from './components/ui/Toast'
import { checkLowAttendance, formatLowAttendanceMessage } from './utils/notifications'

// ── Detect ?resetToken= in the URL on first render ────────────────────────────
function getResetToken() {
  return new URLSearchParams(window.location.search).get('resetToken') || null
}

export default function App() {
  const { user, loading: authLoading, authError, signUpDone, setSignUpDone, signIn, signUp, signOut } = useAuth()
  const { data, setData, syncStatus, dataLoading, resetData, setToastFn } = useAttendance(user)
  const { terms, currentTerm, createTerm, updateTerm, deleteTerm } = useTerms(user)
  const { toast, showToast } = useToast()

  // Wire conflict-toast from useAttendance to the shared toast system
  useEffect(() => { setToastFn(showToast) }, [setToastFn, showToast])

  const [activeTab,  setActiveTab]  = useState('setup')
  const [undoStack,  setUndoStack]  = useState([])

  // Automatically land on Tracker if setup is complete ('ready'), or Setup if incomplete
  const initialTabSet = useRef(false)
  useEffect(() => {
    if (!dataLoading && !initialTabSet.current) {
      initialTabSet.current = true
      setActiveTab(data.phase === 'ready' ? 'tracker' : 'setup')
    }
  }, [dataLoading, data.phase])

  // Low-Attendance Warning — Fires once per login / session after data loads
  const notifiedSessionRef = useRef(false)
  useEffect(() => {
    if (!user || dataLoading || data.phase !== 'ready') return

    const userKey = user.id || user.email || 'user'
    const sessionStorageKey = `markd_low_att_notified_${userKey}`
    let alreadyNotifiedInStorage = false
    try {
      alreadyNotifiedInStorage = Boolean(sessionStorage.getItem(sessionStorageKey))
    } catch {}

    if (!notifiedSessionRef.current && !alreadyNotifiedInStorage) {
      notifiedSessionRef.current = true
      try {
        sessionStorage.setItem(sessionStorageKey, 'true')
      } catch {}

      const lowSubjects = checkLowAttendance(data, currentTerm)
      if (lowSubjects.length > 0) {
        const msg = formatLowAttendanceMessage(lowSubjects)
        showToast(msg, 'error', 6000)
      }
    }
  }, [user, dataLoading, data, currentTerm, showToast])

  // Reset initial tab & notification flags when user logs out or changes
  useEffect(() => {
    if (!user) {
      initialTabSet.current = false
      notifiedSessionRef.current = false
    }
  }, [user])

  // Pre-auth view: 'signin' | 'forgot-password' | 'reset-password' | 'privacy' | 'terms'
  const [authView,   setAuthView]   = useState(() =>
    getResetToken() ? 'reset-password' : 'signin'
  )
  // Capture the reset token once so it survives history.replaceState
  const [resetToken] = useState(getResetToken)

  /* ── Undo ── */
  const pushUndo = useCallback((nextState) => {
    setUndoStack(prev => {
      const stack = [...prev, JSON.stringify(data)]
      return stack.length > 20 ? stack.slice(-20) : stack
    })
    setData(nextState)
  }, [data, setData])

  const handleUndo = useCallback(() => {
    if (!undoStack.length) return
    setData(JSON.parse(undoStack[undoStack.length - 1]))
    setUndoStack(prev => prev.slice(0, -1))
    showToast('Undo successful', 'success')
  }, [undoStack, setData, showToast])

  /* ── Reset ── */
  const handleReset = useCallback(() => {
    if (!window.confirm('Permanently wipe ALL data from cloud and local? This cannot be undone.')) return
    resetData()
    setActiveTab('setup')
    setUndoStack([])
    showToast('Data reset', 'info')
  }, [resetData, showToast])

  /* ── Loading ── */
  if (authLoading || (user && dataLoading)) {
    return (
      <div className="loading-screen">
        <div className="loading-ring"/>
        <div className="loading-label">LOADING YOUR DATA…</div>
      </div>
    )
  }

  /* ── Pre-auth views ── */
  if (!user) {
    const backToSignIn = () => setAuthView('signin')

    if (authView === 'reset-password' && resetToken) {
      return (
        <>
          <ResetPasswordPage token={resetToken} onDone={backToSignIn} />
          <Toast toast={toast}/>
        </>
      )
    }

    if (authView === 'forgot-password') {
      return (
        <>
          <ForgotPasswordPage onBack={backToSignIn} />
          <Toast toast={toast}/>
        </>
      )
    }

    if (authView === 'privacy') {
      return (
        <>
          <PrivacyPolicyPage onBack={backToSignIn} />
          <Toast toast={toast}/>
        </>
      )
    }

    if (authView === 'terms') {
      return (
        <>
          <TermsPage onBack={backToSignIn} />
          <Toast toast={toast}/>
        </>
      )
    }

    // Default: sign in / sign up
    return (
      <>
        <AuthPage
          authError={authError}
          signUpDone={signUpDone}
          setSignUpDone={setSignUpDone}
          signIn={async (e, p) => { try { await signIn(e, p) } catch {} }}
          signUp={async (e, p) => { try { await signUp(e, p) } catch {} }}
          onForgotPassword={() => setAuthView('forgot-password')}
          onPrivacy={() => setAuthView('privacy')}
          onTerms={() => setAuthView('terms')}
        />
        <Toast toast={toast}/>
      </>
    )
  }

  /* ── Shared page titles ── */
  const pageMeta = {
    setup:     { title:'Setup',     sub:'Configure subjects & timetable' },
    tracker:   { title:'Tracker',   sub:`Marking for ${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short'})}` },
    analytics: { title:'Analytics', sub:'Attendance insights & trends' },
  }
  const meta = pageMeta[activeTab]

  return (
    <div className="app-shell">
      {/* ── Sidebar (desktop) ── */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        phase={data.phase}
        syncStatus={syncStatus}
        currentTerm={currentTerm}
        onLogout={signOut}
        onReset={handleReset}
      />

      {/* ── Mobile nav ── */}
      <MobileNav
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        phase={data.phase}
        syncStatus={syncStatus}
        currentTerm={currentTerm}
        onLogout={signOut}
        onReset={handleReset}
      />

      {/* ── Main content ── */}
      <div className="main-wrap">
        <header className="page-header">
          <div>
            <div className="page-title">{meta.title}</div>
            <div className="page-title-sub">{meta.sub}</div>
          </div>
        </header>

        <div className="page-content">
          {activeTab === 'setup'     && (
            <SetupPage
              data={data}
              setData={setData}
              setActiveTab={setActiveTab}
              terms={terms}
              currentTerm={currentTerm}
              createTerm={createTerm}
              updateTerm={updateTerm}
              deleteTerm={deleteTerm}
            />
          )}
          {activeTab === 'tracker'   && (
            <TrackerPage
              data={data}
              pushUndo={pushUndo}
              handleUndo={handleUndo}
              undoStack={undoStack}
              showToast={showToast}
            />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsPage data={data}/>
          )}
        </div>
      </div>

      <Toast toast={toast}/>
    </div>
  )
}
