import { useMemo } from 'react'
import { CheckCircle, AlertCircle, Trophy, AlertTriangle, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { calcSubjectStats, attendancePct, overallPct, canMiss, classesNeeded } from '../utils/stats'
import { lastNDays } from '../utils/date'
import TiltCard from '../components/effects/TiltCard'
import AnimatedNumber from '../components/effects/AnimatedNumber'
import AnimatedRing from '../components/charts/AnimatedRing'
import RiskMeter from '../components/charts/RiskMeter'
import CalendarHeatmap from '../components/charts/CalendarHeatmap'
import WhatIfCalculator from '../components/analytics/WhatIfCalculator'

export default function AnalyticsPage({ data }) {
  const { subStats, totalDays, pct, chartData, bestWorst } = useMemo(() => {
    const subStats   = calcSubjectStats(data.subjects, data.attendance, data.historicalAttendance, data.manualStats)
    const totalDays  = Object.keys(data.attendance).length
    const pct        = overallPct(data.attendance, data.historicalAttendance, data.manualStats)
    const chartData  = lastNDays(7).reverse().map(d => {
      const rec = data.attendance[d] || {}
      const vals = Object.values(rec)
      return {
        name:    d.slice(5),
        Present: vals.filter(v=>v==='P').length,
        Late:    vals.filter(v=>v==='L').length,
        Absent:  vals.filter(v=>v==='A').length,
      }
    })

    // Calculate Best & Worst subjects (only for subjects with recorded data)
    const activeSubjects = data.subjects
      .map(sub => {
        const stats = subStats[sub]
        return stats && stats.total > 0 ? { sub, pct: attendancePct(stats) } : null
      })
      .filter(Boolean)
      .sort((a, b) => b.pct - a.pct)

    let bestWorst = null
    if (activeSubjects.length > 0) {
      const best = activeSubjects[0]
      const targetThreshold = data.targetThreshold ?? 75
      const lowest = activeSubjects.length > 1 ? activeSubjects[activeSubjects.length - 1] : null
      // Only highlight as 'Needs attention' if percentage is genuinely below safe threshold (<75%)
      const worst = (lowest && lowest.pct < targetThreshold && lowest.pct < best.pct) ? lowest : null
      bestWorst = { best, worst }
    }

    return { subStats, totalDays, pct, chartData, bestWorst }
  }, [data])

  const tooltipStyle = { background:'var(--bg-raised)', border:'1px solid var(--border)', fontFamily:'var(--font-mono)', fontSize:11 }

  return (
    <div className="page-animate">

      {/* Stat strip */}
      <div className="stat-grid mb-md">
        <TiltCard className="stat-card">
          <div className="stat-label">OVERALL</div>
          <div className="stat-value" style={{ color: pct>=75?'var(--teal)':'var(--red)' }}>
            <AnimatedNumber value={pct} suffix="%"/>
          </div>
        </TiltCard>
        <TiltCard className="stat-card">
          <div className="stat-label">DAYS TRACKED</div>
          <div className="stat-value"><AnimatedNumber value={totalDays}/></div>
        </TiltCard>
        <TiltCard className="stat-card">
          <div className="stat-label">SUBJECTS</div>
          <div className="stat-value"><AnimatedNumber value={data.subjects.length}/></div>
        </TiltCard>
      </div>

      {/* Best / Worst Quick-Insight Banner */}
      {bestWorst && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: '10px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--teal)' }}>
            <Trophy size={14} />
            <span>
              Best: <strong style={{ color: 'var(--text-1)' }}>{bestWorst.best.sub}</strong> ({bestWorst.best.pct}%)
            </span>
          </div>

          {bestWorst.worst && bestWorst.worst.sub !== bestWorst.best.sub && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: bestWorst.worst.pct < 75 ? 'var(--amber)' : 'var(--text-2)' }}>
              <AlertTriangle size={14} />
              <span>
                Needs attention: <strong style={{ color: 'var(--text-1)' }}>{bestWorst.worst.sub}</strong> ({bestWorst.worst.pct}%)
              </span>
            </div>
          )}
        </div>
      )}

      {/* What-If Prediction Calculator (Top Prominent Placement) */}
      {data.subjects.length > 0 && (
        <WhatIfCalculator
          subjects={data.subjects}
          subStats={subStats}
          attendance={data.attendance}
          historicalAttendance={data.historicalAttendance}
        />
      )}

      {/* Heatmap */}
      <CalendarHeatmap dailyLog={data.dailyLog || data.attendance} />

      {/* Risk Meter */}
      <RiskMeter perc={pct} />

      {/* Weekly bar chart */}
      <TiltCard className="card mb-md mt-md">
        <div className="card-title"><span className="card-title-icon">▬</span> WEEKLY TREND</div>
        <div style={{ height:200 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="name" stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false}/>
              <YAxis stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false}/>
              <Tooltip cursor={{ fill:'rgba(255,255,255,.03)' }} contentStyle={tooltipStyle}/>
              <Bar dataKey="Present" stackId="a" fill="var(--teal)"  radius={[0,0,0,0]}/>
              <Bar dataKey="Late"    stackId="a" fill="var(--amber)" radius={[0,0,0,0]}/>
              <Bar dataKey="Absent"  stackId="a" fill="var(--red)"   radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex gap-md mt-sm" style={{ flexWrap:'wrap' }}>
          {[['Present','var(--teal)'],['Late','var(--amber)'],['Absent','var(--red)']].map(([l,c])=>(
            <div key={l} className="flex-center gap-xs">
              <div style={{ width:10,height:10,borderRadius:2,background:c }}/>
              <span style={{ fontSize:10,color:'var(--text-2)' }}>{l}</span>
            </div>
          ))}
        </div>
      </TiltCard>

      {/* Subject breakdown */}
      <div className="section-title mt-lg">SUBJECT BREAKDOWN</div>
      {data.subjects.map(sub => {
        const stats = subStats[sub]
        if (!stats || stats.total === 0) return (
          <div
            key={sub}
            style={{
              padding: '14px 18px',
              background: 'var(--bg-surface)',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--r-lg)',
              marginBottom: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: 0.85,
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                {sub}
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-3)', background: 'var(--bg-raised)', padding: '2px 6px', borderRadius: 4 }}>
                  NOT STARTED YET
                </span>
              </div>
              <div className="text-dimmed" style={{ fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} color="var(--text-3)" /> Mark attendance in Tracker to see stats here.
              </div>
            </div>
            <AnimatedRing perc={0} size={48} />
          </div>
        )

        const pct = attendancePct(stats)
        const banner = pct >= 75
          ? <div className="banner banner-ok"><CheckCircle size={12}/> Safe at {pct}%. Can miss {canMiss(stats)} more.</div>
          : pct >= 50
            ? <div className="banner banner-mid"><AlertCircle size={12}/> At risk. Attend {classesNeeded(stats)} more to reach 75%.</div>
            : <div className="banner banner-warn"><AlertCircle size={12}/> Critical. Need {classesNeeded(stats)} consecutive classes.</div>

        return (
          <TiltCard key={sub} className="subject-breakdown-row">
            <div className="subject-breakdown-info">
              <div className="subject-breakdown-name">{sub}</div>
              <div className="subject-breakdown-stats">
                <span className="text-teal">{stats.P}P</span> ·{' '}
                <span className="text-red">{stats.A}A</span> ·{' '}
                <span className="text-amber">{stats.L}L</span> ·{' '}
                <span className="text-dimmed">{stats.total} total</span>
              </div>
              {banner}
            </div>
            <AnimatedRing perc={pct} size={54}/>
          </TiltCard>
        )
      })}

      {data.subjects.length === 0 && (
        <div className="card empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-text">No data yet. Complete Setup and start marking attendance.</div>
        </div>
      )}
    </div>
  )
}
