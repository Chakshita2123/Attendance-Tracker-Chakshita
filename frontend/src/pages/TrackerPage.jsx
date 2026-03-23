import { useState } from 'react'
import { RotateCcw, CheckSquare, Trash2, TrendingUp } from 'lucide-react'
import { todayStr, weekday, lastNDays, addMinutes } from '../utils/date'
import { calcStreak } from '../utils/stats'
import TiltCard from '../components/effects/TiltCard'
import Confetti from '../components/effects/Confetti'
import AnimatedNumber from '../components/effects/AnimatedNumber'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

export default function TrackerPage({ data, pushUndo, handleUndo, undoStack, showToast }) {
  const today = todayStr()
  const [selectedDate, setSelected] = useState(today)
  const days          = lastNDays(7)
  const dow           = weekday(selectedDate)
  const classes       = data.timetable[dow] || []

  const getStatus = (sub) => data.attendance[selectedDate]?.[sub] ?? null

  const mark = (subject, status) => {
    const next = JSON.parse(JSON.stringify(data))
    next.attendance[selectedDate]           ??= {}
    next.dailyLog                           ??= {}
    next.dailyLog[selectedDate]             ??= {}
    if (next.attendance[selectedDate][subject] === status) {
      delete next.attendance[selectedDate][subject]
      delete next.dailyLog[selectedDate][subject]
    } else {
      next.attendance[selectedDate][subject] = status
      next.dailyLog[selectedDate][subject]   = status
    }
    pushUndo(next)
  }

  const markAllPresent = () => {
    const next = JSON.parse(JSON.stringify(data))
    next.attendance[selectedDate] ??= {}
    next.dailyLog                 ??= {}
    next.dailyLog[selectedDate]   ??= {}
    classes.forEach(c => {
      next.attendance[selectedDate][c.subject] = 'P'
      next.dailyLog[selectedDate][c.subject]   = 'P'
    })
    pushUndo(next)
    showToast('All marked present ✓', 'success')
  }

  const clearDay = () => {
    const next = JSON.parse(JSON.stringify(data))
    delete next.attendance[selectedDate]
    if (next.dailyLog) delete next.dailyLog[selectedDate]
    pushUndo(next)
    showToast('Day cleared', 'info')
  }

  const presentCount = classes.filter(c => getStatus(c.subject) === 'P').length
  const absentCount  = classes.filter(c => getStatus(c.subject) === 'A').length
  const unmarked     = classes.length - presentCount - absentCount
  const is100        = classes.length > 0 && presentCount === classes.length && selectedDate === today

  const pieData = [
    { name:'Present',  value:presentCount, color:'var(--teal)'   },
    { name:'Absent',   value:absentCount,  color:'var(--red)'    },
    { name:'Unmarked', value:unmarked,     color:'var(--border)' },
  ].filter(x => x.value > 0)

  return (
    <div className="page-animate">
      <Confetti trigger={is100} />

      {/* Stat row */}
      <div className="stat-grid mb-md">
        <TiltCard className="stat-card">
          <div className="stat-label">TODAY'S CLASSES</div>
          <div className="stat-value"><AnimatedNumber value={classes.length}/></div>
        </TiltCard>
        <TiltCard className="stat-card">
          <div className="stat-label text-teal">PRESENT</div>
          <div className="stat-value text-teal"><AnimatedNumber value={presentCount}/></div>
        </TiltCard>
        <TiltCard className="stat-card">
          <div className="stat-label text-amber"><TrendingUp size={12}/> STREAK</div>
          <div className="stat-value text-amber"><AnimatedNumber value={calcStreak(data.attendance)}/></div>
          <div className="stat-sub text-amber">days</div>
        </TiltCard>
      </div>

      {/* Date strip */}
      <div className="card mb-md" style={{ padding:'14px 16px' }}>
        <div className="date-strip">
          {days.map(d => {
            const dNum = d.slice(8)
            const dDay = d === today ? 'TODAY' : weekday(d).toUpperCase()
            return (
              <button key={d} className={`date-pill ${selectedDate===d?'active':''}`} onClick={()=>setSelected(d)}>
                <span className="date-pill-day">{dDay}</span>
                <span className="date-pill-num">{dNum}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="tracker-toolbar">
        <div className="tracker-toolbar-left">
          <button className="btn btn-primary" onClick={markAllPresent} disabled={!classes.length}>
            <CheckSquare size={13}/> ALL PRESENT
          </button>
          <button className="btn" onClick={clearDay} disabled={!classes.length}>
            <Trash2 size={13}/> CLEAR
          </button>
        </div>
        <div className="tracker-toolbar-right">
          <button className="btn" onClick={handleUndo} disabled={!undoStack.length}>
            <RotateCcw size={13}/> UNDO ({undoStack.length})
          </button>
        </div>
      </div>

      {/* Subject rows */}
      {classes.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-text">No classes scheduled for {dow}.<br/>
            <span style={{fontSize:11,color:'var(--text-3)'}}>Go to Setup to add classes to your timetable.</span>
          </div>
        </div>
      ) : (
        <div>
          {classes.map(cls => {
            const st = getStatus(cls.subject)
            return (
              <div key={cls.id} className={`subject-row ${st ? `status-${st}` : ''}`}>
                <div className="subject-row-left">
                  <div className="subject-time">{cls.start} – {addMinutes(cls.start,cls.duration)}</div>
                  <div className="subject-name">{cls.subject}</div>
                </div>
                <div className="mark-group">
                  {['P','A','L'].map(s => (
                    <button key={s} className={`mark-btn ${st===s?`active-${s}`:''}`}
                      onClick={()=>mark(cls.subject,s)}>{s}</button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pie summary — only when something is marked */}
      {classes.length > 0 && pieData.length > 0 && pieData[0].name !== 'Unmarked' && (
        <TiltCard className="card mt-md flex-between" style={{ gap:24 }}>
          <div>
            <div className="section-title">TODAY'S BREAKDOWN</div>
            <div style={{ fontSize:12, color:'var(--text-2)' }}>{selectedDate}</div>
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
              {pieData.map(d=>(
                <div key={d.name} className="flex-center gap-xs">
                  <div style={{ width:8,height:8,borderRadius:'50%',background:d.color,flexShrink:0 }}/>
                  <span style={{ fontSize:11,color:'var(--text-2)' }}>{d.name}</span>
                  <span style={{ fontSize:11,fontWeight:700,color:'var(--text-1)',marginLeft:'auto' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ width:140,height:140,flexShrink:0 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={38} outerRadius={56} stroke="none" paddingAngle={2}>
                  {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip contentStyle={{ background:'var(--bg-raised)',border:'1px solid var(--border)',fontFamily:'var(--font-mono)',fontSize:11 }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </TiltCard>
      )}
    </div>
  )
}
