import { useState, useEffect } from 'react'
import AnimatedNumber from '../effects/AnimatedNumber'

export default function AnimatedRing({ perc, size = 52 }) {
  const r    = size * 0.36
  const circ = 2 * Math.PI * r
  const [offset, setOffset] = useState(circ)

  useEffect(() => {
    const t = setTimeout(() => setOffset(circ * (1 - (perc || 0) / 100)), 80)
    return () => clearTimeout(t)
  }, [perc, circ])

  const color = perc >= 75 ? 'var(--teal)' : perc >= 50 ? 'var(--amber)' : 'var(--red)'

  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition:'stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1)', transform:'rotate(-90deg)', transformOrigin:'50% 50%' }}
        />
      </svg>
      <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',
                    fontFamily:'var(--font-head)',fontWeight:700,fontSize:size*0.18,color }}>
        <AnimatedNumber value={perc} />%
      </div>
    </div>
  )
}
