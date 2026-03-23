import { useMemo } from 'react'
import TiltCard from '../effects/TiltCard'
import { todayStr } from '../../utils/date'

export default function CalendarHeatmap({ dailyLog }) {
  const { gridCols, months } = useMemo(() => {
    const endStr  = todayStr()
    const endDate = new Date(endStr)
    let cur = new Date(endDate)
    cur.setDate(cur.getDate() - 12 * 7)
    while (cur.getDay() !== 1) cur.setDate(cur.getDate() - 1)

    const gridCols = [], months = []
    let week = [], lastMonth = -1, iter = new Date(cur)

    while (iter <= endDate || iter.getDay() !== 1) {
      const ds  = iter.toISOString().split('T')[0]
      const day = iter.getDay()

      if (day >= 1 && day <= 6) {
        const rec = dailyLog?.[ds]
        let bg = 'var(--bg-raised)', glow = '', val = '—'
        if (rec && Object.keys(rec).length > 0) {
          const vals = Object.values(rec)
          const pct  = Math.round((vals.filter(v => v === 'P' || v === 'L').length / vals.length) * 100)
          val = `${pct}%`
          bg  = pct === 0  ? 'rgba(248,113,113,.25)'
              : pct < 50   ? 'rgba(248,113,113,.5)'
              : pct < 75   ? 'rgba(245,158,11,.55)'
              : pct < 100  ? 'rgba(34,211,165,.55)'
              : '#22d3a5'
          if (pct === 100) glow = '0 0 6px rgba(34,211,165,.45)'
        }
        week.push({ date: ds, bg, glow, val })
      }

      if (day === 0) {
        gridCols.push(week); week = []
        const m = iter.getMonth()
        if (m !== lastMonth && gridCols.length) {
          months.push({ label: iter.toLocaleString('default', { month: 'short' }), col: gridCols.length - 1 })
          lastMonth = m
        }
      }
      iter.setDate(iter.getDate() + 1)
      if (iter > endDate && week.length === 0) break
    }
    if (week.length) gridCols.push(week)
    return { gridCols, months }
  }, [dailyLog])

  const dayLabels = ['M','T','W','T','F','S']

  return (
    <TiltCard className="card mb-md">
      <div className="card-title"><span className="card-title-icon">◫</span> ATTENDANCE CALENDAR</div>
      <div style={{ position:'relative', paddingLeft:18, paddingTop:20 }}>
        {/* Month labels */}
        {months.map((m,i) => (
          <div key={i} style={{ position:'absolute',top:0,left:18+m.col*16,fontSize:9,color:'var(--text-3)',letterSpacing:1 }}>
            {m.label.toUpperCase()}
          </div>
        ))}
        {/* Day labels */}
        <div style={{ position:'absolute',top:20,left:0,display:'flex',flexDirection:'column',gap:3 }}>
          {dayLabels.map((d,i) => <div key={i} className="hm-day-label">{d}</div>)}
        </div>
        {/* Grid */}
        <div className="heatmap-outer">
          <div className="heatmap-grid">
            {gridCols.map((col, ci) => (
              <div key={ci} className="heatmap-col">
                {col.map(cell => (
                  <div key={cell.date} className="heatmap-cell" style={{ background:cell.bg, boxShadow:cell.glow }}>
                    <div className="htip">{cell.date} · {cell.val}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="hm-legend">
        <div className="hm-legend-item"><div className="hm-legend-box" style={{background:'var(--bg-raised)',border:'1px solid var(--border)'}}/>No data</div>
        <div className="hm-legend-item"><div className="hm-legend-box" style={{background:'rgba(248,113,113,.5)'}}/>&lt;50%</div>
        <div className="hm-legend-item"><div className="hm-legend-box" style={{background:'rgba(245,158,11,.55)'}}/>50–75%</div>
        <div className="hm-legend-item"><div className="hm-legend-box" style={{background:'rgba(34,211,165,.55)'}}/>75–99%</div>
        <div className="hm-legend-item"><div className="hm-legend-box" style={{background:'#22d3a5'}}/>100%</div>
      </div>
    </TiltCard>
  )
}
