import { useState } from 'react'
import { Settings, CheckSquare, BarChart2, LogOut, User, X } from 'lucide-react'

const ICONS = { setup: Settings, tracker: CheckSquare, analytics: BarChart2, account: User }

export default function MobileNav({
  user,
  activeTab,
  setActiveTab,
  phase,
  syncStatus,
  currentTerm,
  onLogout,
  onReset
}) {
  const [showProfile, setShowProfile] = useState(false)

  const tabs = [
    { id: 'setup',     label: phase === 'ready' ? 'EDIT' : 'SETUP' },
    { id: 'tracker',   label: 'TRACKER' },
    { id: 'analytics', label: 'STATS' },
    { id: 'account',   label: 'ACCOUNT' },
  ]

  const initials = (user?.name || user?.email || '?')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const syncLabel = syncStatus === 'synced' ? 'SYNCED' :
                    syncStatus === 'syncing' ? 'SYNCING…' : 'OFFLINE'

  const handleTabClick = (tabId) => {
    if (tabId === 'account') {
      setShowProfile(true)
    } else {
      setActiveTab(tabId)
    }
  }

  return (
    <>
      {/* ── Top Mobile Header ── */}
      <header className="mobile-header">
        <span className="mobile-logo">MARKD //</span>

        {currentTerm && (
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'var(--teal)',
            background: 'rgba(0, 242, 254, 0.08)',
            border: '1px solid rgba(0, 242, 254, 0.22)',
            padding: '4px 10px',
            borderRadius: 12,
            letterSpacing: '0.03em',
            whiteSpace: 'nowrap',
            maxWidth: '60%',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            🗓️ {currentTerm.name.toUpperCase()}
          </span>
        )}
      </header>

      {/* ── Profile & Actions Sheet (Modal) ── */}
      {showProfile && (
        <div className="mobile-sheet-overlay" onClick={() => setShowProfile(false)}>
          <div className="mobile-sheet-card" onClick={e => e.stopPropagation()}>
            <div className="mobile-sheet-header">
              <div className="mobile-sheet-title">ACCOUNT & SETTINGS</div>
              <button className="mobile-sheet-close" onClick={() => setShowProfile(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="mobile-sheet-user">
              <div className="mobile-sheet-avatar">{initials}</div>
              <div>
                <div className="mobile-sheet-user-name">{user?.name || user?.email?.split('@')[0]}</div>
                <div className="mobile-sheet-user-email">{user?.email}</div>
              </div>
            </div>

            <div className="mobile-sheet-info">
              <div className="sync-badge">
                <span className={`sync-dot ${syncStatus}`} />
                {syncLabel}
              </div>
              {currentTerm && (
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--teal)' }}>
                  Active Term: <strong>{currentTerm.name}</strong>
                </div>
              )}
            </div>

            <div className="mobile-sheet-actions">
              <button
                className="btn btn-primary btn-full btn-lg flex-center gap-xs"
                style={{ justifyContent: 'center', marginBottom: 10 }}
                onClick={() => {
                  setShowProfile(false)
                  if (onLogout) onLogout()
                }}
              >
                <LogOut size={16} /> LOG OUT
              </button>

              <button
                className="btn btn-danger btn-full flex-center gap-xs"
                style={{ justifyContent: 'center', fontSize: 12 }}
                onClick={() => {
                  setShowProfile(false)
                  if (onReset) onReset()
                }}
              >
                <Settings size={14} /> RESET ALL DATA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Mobile Tab Bar ── */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {tabs.map(tab => {
            const Icon = ICONS[tab.id]
            const locked = tab.id !== 'setup' && phase === 'setup'
            const isActive = tab.id === 'account' ? showProfile : activeTab === tab.id
            return (
              <button
                key={tab.id}
                className={`mob-nav-item ${isActive ? 'active' : ''}`}
                disabled={locked}
                onClick={() => handleTabClick(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
