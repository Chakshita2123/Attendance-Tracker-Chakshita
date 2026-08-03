import { Settings, CheckSquare, BarChart2, LogOut } from 'lucide-react'

const ICONS = { Setup: Settings, Tracker: CheckSquare, Analytics: BarChart2 }

export default function Sidebar({ user, activeTab, setActiveTab, phase, syncStatus, currentTerm, onLogout, onReset }) {
  const tabs = [
    { id:'setup',     label: phase === 'ready' ? 'Edit Setup' : 'Setup', icon:'Setup'    },
    { id:'tracker',   label:'Tracker',                                    icon:'Tracker'  },
    { id:'analytics', label:'Analytics',                                  icon:'Analytics'},
  ]

  const syncLabel = syncStatus === 'synced'  ? 'SYNCED'    :
                    syncStatus === 'syncing' ? 'SYNCING…'  : 'OFFLINE'
  const initials = (user?.name || user?.email || '?')
    .split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-text">MARKD<span className="logo-slash"> //</span></div>
        <div className="logo-sub">MARK · TRACK · ANALYSE</div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {tabs.map(tab => {
          const Icon = ICONS[tab.icon]
          const locked = tab.id !== 'setup' && phase === 'setup'
          return (
            <button key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              disabled={locked}
              onClick={() => setActiveTab(tab.id)}>
              <Icon size={15} />
              {tab.label.toUpperCase()}
            </button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        {currentTerm && (
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'var(--teal)',
            background: 'rgba(0, 242, 254, 0.08)',
            border: '1px solid rgba(0, 242, 254, 0.2)',
            padding: '4px 8px',
            borderRadius: 'var(--r-sm)',
            marginBottom: 8,
            textAlign: 'center',
            letterSpacing: '0.04em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            🗓️ {currentTerm.name.toUpperCase()}
          </div>
        )}

        <div className="sync-badge">
          <span className={`sync-dot ${syncStatus}`}/>
          {syncLabel}
        </div>

        <div className="sidebar-user">
          <div className="s-avatar">
            {initials}
          </div>
          <div className="s-user-info">
            <div className="s-user-name">{user?.name || user?.email?.split('@')[0]}</div>
            <div className="s-user-email">{user?.email}</div>
          </div>
          <button className="s-logout-btn" onClick={onLogout} title="Log out"><LogOut size={14}/></button>
        </div>

        <button className="btn btn-danger btn-full" style={{ marginTop:8, fontSize:10 }} onClick={onReset}>
          <Settings size={12}/> RESET ALL DATA
        </button>
      </div>
    </aside>
  )
}
