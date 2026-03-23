import AnimatedNumber from '../effects/AnimatedNumber'
import TiltCard from '../effects/TiltCard'

export default function RiskMeter({ perc }) {
  const rot = (perc / 100) * 180 - 90
  const [label, color] =
    perc >= 75 ? ['SAFE',        'var(--teal)']  :
    perc >= 50 ? ['AT RISK',     'var(--amber)'] :
                 ['DANGER ZONE', 'var(--red)']

  return (
    <TiltCard className="card" style={{ textAlign:'center', padding:'24px 20px' }}>
      <div className="card-title" style={{ justifyContent:'center' }}>
        <span className="card-title-icon">◎</span> RISK METER
      </div>
      <div style={{ position:'relative', width:220, height:110, margin:'0 auto', overflow:'hidden' }}>
        <svg width="220" height="110" viewBox="0 0 220 110">
          {/* Track */}
          <path d="M 18 110 A 92 92 0 0 1 202 110" fill="none" stroke="var(--border)" strokeWidth="16" strokeLinecap="round"/>
          {/* Danger */}
          <path d="M 18 110 A 92 92 0 0 1 110 18"     fill="none" stroke="var(--red)"   strokeWidth="16"/>
          {/* Warning */}
          <path d="M 110 18 A 92 92 0 0 1 176 44"     fill="none" stroke="var(--amber)" strokeWidth="16"/>
          {/* Safe */}
          <path d="M 176 44 A 92 92 0 0 1 202 110"    fill="none" stroke="var(--teal)"  strokeWidth="16"/>
          {/* Needle */}
          <g style={{ transition:'transform 1s cubic-bezier(.4,0,.2,1)', transform:`rotate(${rot}deg)`, transformOrigin:'110px 110px' }}>
            <line x1="110" y1="110" x2="110" y2="28" stroke="var(--text-1)" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="110" cy="110" r="7" fill="var(--text-1)"/>
          </g>
        </svg>
        <div style={{ position:'absolute',bottom:6,left:0,right:0,fontFamily:'var(--font-head)',fontSize:'1.9rem',fontWeight:800,textAlign:'center',color }}>
          <AnimatedNumber value={perc} />%
        </div>
      </div>
      <div style={{ color, fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, letterSpacing:3, marginTop:10 }}>
        {label}
      </div>
    </TiltCard>
  )
}
