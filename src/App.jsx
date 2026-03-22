import { useState, useCallback } from 'react'
import { StackHandler, StackProvider, StackTheme } from '@stackframe/react'
import { useAuth }       from './hooks/useAuth'
import { useAttendance } from './hooks/useAttendance'
import { useToast }      from './hooks/useToast'
import { stackApp }      from './lib/stack'

import AuthPage      from './pages/AuthPage'
import SetupPage     from './pages/SetupPage'
import TrackerPage   from './pages/TrackerPage'
import AnalyticsPage from './pages/AnalyticsPage'

import Sidebar   from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import Toast     from './components/ui/Toast'

export default function App() {
  const { user, loading: authLoading, authError, setAuthError, signUpDone, setSignUpDone, signIn, signUp, signInWithGoogle, signOut } = useAuth()
  const { data, setData, syncStatus, dataLoading, resetData } = useAttendance(user)
  const { toast, showToast } = useToast()

  const [activeTab,  setActiveTab]  = useState('setup')
  const [undoStack,  setUndoStack]  = useState([])
  const path = typeof window !== 'undefined' ? window.location.pathname : '/'

  if (stackApp && path.startsWith('/handler')) {
    return (
      <StackProvider app={stackApp}>
        <StackTheme>
          <StackHandler app={stackApp} location={path} fullPage />
        </StackTheme>
      </StackProvider>
    )
  }

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

  /* ── Login ── */
  if (!user) {
    return (
      <>
        <AuthPage
          authError={authError}
          signUpDone={signUpDone}
          setSignUpDone={setSignUpDone}
          signIn={async (e, p) => { try { await signIn(e, p) } catch {} }}
          signUp={async (e, p) => { try { await signUp(e, p) } catch {} }}
          signInWithGoogle={async () => { try { await signInWithGoogle() } catch {} }}
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
        onLogout={signOut}
        onReset={handleReset}
      />

      {/* ── Mobile nav ── */}
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} phase={data.phase}/>

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
            <SetupPage data={data} setData={setData} setActiveTab={setActiveTab}/>
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
