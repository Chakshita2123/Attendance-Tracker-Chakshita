import { Settings, CheckSquare, BarChart2 } from 'lucide-react'

const ICONS = { setup: Settings, tracker: CheckSquare, analytics: BarChart2 }

export default function MobileNav({ activeTab, setActiveTab, phase }) {
  const tabs = [
    { id:'setup',     label:'SETUP'    },
    { id:'tracker',   label:'TRACKER'  },
    { id:'analytics', label:'STATS'    },
  ]
  return (
    <>
      <header className="mobile-header">
        <span className="mobile-logo">MARKD //</span>
      </header>
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {tabs.map(tab => {
            const Icon = ICONS[tab.id]
            const locked = tab.id !== 'setup' && phase === 'setup'
            return (
              <button key={tab.id}
                className={`mob-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                disabled={locked}
                onClick={() => setActiveTab(tab.id)}>
                <Icon size={17}/>
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
