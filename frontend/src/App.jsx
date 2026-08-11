import { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth }       from './hooks/useAuth'
import { useAttendance } from './hooks/useAttendance'
import { useToast }      from './hooks/useToast'
import { useTerms }      from './hooks/useTerms'

import AuthPage          from './pages/AuthPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsPage         from './pages/TermsPage'
import SetupPage         from './pages/SetupPage'
import TrackerPage       from './pages/TrackerPage'
import AnalyticsPage     from './pages/AnalyticsPage'

import Sidebar   from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import Toast     from './components/ui/Toast'
import { checkLowAttendance, formatLowAttendanceMessage } from './utils/notifications'

export default function App() {
  const { user, loading: authLoading, authError, signInWithGoogle, signInWithGoogleNative, signOut } = useAuth()
  const { data, setData, syncStatus, dataLoading, resetData, setToastFn } = useAttendance(user)
  const { terms, currentTerm, createTerm, updateTerm, deleteTerm } = useTerms(user)
  const { toast, showToast } = useToast()

  // Wire conflict-toast from useAttendance to the shared toast system
  useEffect(() => { setToastFn(showToast) }, [setToastFn, showToast])

  const [activeTab,  setActiveTab]  = useState('setup')
  const [undoStack,  setUndoStack]  = useState([])

  const userManuallyNavigatedRef = useRef(false)
  const landedSessionRef = useRef(null)

  const changeTab = useCallback((tabId, isManual = true) => {
    if (isManual) {
      userManuallyNavigatedRef.current = true
    }
    setActiveTab(tabId)
  }, [])

  // Automatically land on Tracker if setup is complete ('ready' or subjects exist), or Setup if incomplete
  useEffect(() => {
    if (!user || dataLoading) return

    const isReady = data.phase === 'ready' || (data.subjects && data.subjects.length > 0)
    const termKey = currentTerm?._id || currentTerm?.name || 'default'
    const sessionKey = `${user.id || user.email}_${termKey}`

    // If we haven't landed for this user + term session yet
    if (landedSessionRef.current !== sessionKey) {
      landedSessionRef.current = sessionKey
      userManuallyNavigatedRef.current = false
      setActiveTab(isReady ? 'tracker' : 'setup')
    } else if (isReady && !userManuallyNavigatedRef.current) {
      // Asynchronous data payload update (e.g. cloud sync finish)
      setActiveTab('tracker')
    }
  }, [user, dataLoading, data.phase, data.subjects, currentTerm])

  // Low-Attendance Warning — Fires once per login / session after data loads
  const notifiedSessionRef = useRef(false)
  useEffect(() => {
    if (!user || dataLoading || (data.phase !== 'ready' && (!data.subjects || data.subjects.length === 0))) return

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

  // Reset session flags when user logs out
  useEffect(() => {
    if (!user) {
      landedSessionRef.current = null
      userManuallyNavigatedRef.current = false
      notifiedSessionRef.current = false
    }
  }, [user])

  // Pre-auth view: 'signin' | 'privacy' | 'terms'
  const [authView, setAuthView] = useState('signin')

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

    // Default: Google sign in
    return (
      <>
        <AuthPage
          authError={authError}
          signInWithGoogle={signInWithGoogle}
          signInWithGoogleNative={signInWithGoogleNative}
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
        setActiveTab={(tab) => changeTab(tab, true)}
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
        setActiveTab={(tab) => changeTab(tab, true)}
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
              setActiveTab={(tab) => changeTab(tab, true)}
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
