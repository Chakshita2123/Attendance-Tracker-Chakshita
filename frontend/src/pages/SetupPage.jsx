import { useState } from 'react'
import { Trash2, Plus, Play, Clock } from 'lucide-react'
import { DAYS } from '../constants'
import { addMinutes } from '../utils/date'

export default function SetupPage({ data, setData, setActiveTab }) {
  const [subInput,  setSubInput]  = useState('')
  const [form, setForm] = useState({ day:null, subject:'', start:'09:00', duration: data.lectureSettings?.durationMinutes || 60 })

  const updateHistoricalAttendance = (subject, field, value) => {
    const numericValue = Math.max(0, parseInt(value, 10) || 0)

    setData(current => {
      const currentEntry = current.historicalAttendance?.[subject] || { P: 0, A: 0, L: 0, total: 0 }
      const nextEntry = { ...currentEntry }

      if (field === 'P') {
        nextEntry.P = numericValue
      } else {
        nextEntry.total = numericValue
      }

      nextEntry.total = Math.max(nextEntry.total || 0, nextEntry.P || 0)
      nextEntry.A = Math.max(0, nextEntry.total - nextEntry.P)
      nextEntry.L = 0

      return {
        ...current,
        historicalAttendance: {
          ...(current.historicalAttendance || {}),
          [subject]: nextEntry,
        },
      }
    })
  }

  /* ── Subjects ── */
  const addSubject = () => {
    const v = subInput.trim().toUpperCase()
    if (v && !data.subjects.includes(v)) {
      setData(d => ({ ...d, subjects:[...d.subjects, v] }))
      setSubInput('')
    }
  }

  const removeSubject = (sub) => {
    const tt = Object.fromEntries(DAYS.map(day => [day, (data.timetable[day]||[]).filter(c=>c.subject!==sub)]))
    setData(d => {
      const nextHistorical = { ...(d.historicalAttendance || {}) }
      delete nextHistorical[sub]

      return {
        ...d,
        subjects:d.subjects.filter(s=>s!==sub),
        timetable:tt,
        historicalAttendance: nextHistorical,
      }
    })
  }

  /* ── Classes ── */
  const openForm = (day) => setForm({ day, subject:data.subjects[0]||'', start:'09:00', duration:data.lectureSettings?.durationMinutes||60 })

  const saveClass = (day) => {
    if (!form.subject) return
    const cls = { id:Math.random().toString(36).slice(2,11), subject:form.subject, start:form.start, duration:parseInt(form.duration)||60 }
    const sorted = [...(data.timetable[day]||[]), cls].sort((a,b)=>a.start.localeCompare(b.start))
    setData(d => ({ ...d, timetable:{ ...d.timetable, [day]:sorted } }))
    setForm(f => ({ ...f, day:null }))
  }

  const removeClass = (day, id) =>
    setData(d => ({ ...d, timetable:{ ...d.timetable, [day]:d.timetable[day].filter(c=>c.id!==id) } }))

  const canStart = data.subjects.length > 0

  return (
    <div className="page-animate">

      {/* Step 1 — Subjects */}
      <div className="card mb-md">
        <div className="setup-step-label">
          <span className="step-num">1</span> SUBJECTS
        </div>
        <div className="flex gap-sm mb-sm" style={{ alignItems:'flex-start' }}>
          <input
            className="input" style={{ marginBottom:0, flex:1 }}
            placeholder="e.g. PHYSICS 101"
            value={subInput}
            onChange={e => setSubInput(e.target.value)}
            onKeyDown={e => e.key==='Enter' && addSubject()}
          />
          <button className="btn btn-primary" onClick={addSubject}><Plus size={14}/>ADD</button>
        </div>
        <div className="tag-list">
          {data.subjects.length === 0
            ? <span className="text-dimmed" style={{ fontSize:12 }}>No subjects added yet.</span>
            : data.subjects.map(s => (
              <div key={s} className="tag">
                {s}
                <button className="tag-del" onClick={() => removeSubject(s)}><Trash2 size={11}/></button>
              </div>
            ))
          }
        </div>
      </div>

      {canStart && (
        <>
          {/* Step 2 — Previous attendance */}
          <div className="card mb-md">
            <div className="setup-step-label"><span className="step-num">2</span> PREVIOUS ATTENDANCE</div>
            <div className="text-dimmed" style={{ fontSize:11, marginBottom:14 }}>
              Add the classes you already completed before using the tracker. New entries you mark later will continue from these totals.
            </div>

            <div className="historical-attendance-list">
              {data.subjects.map(subject => {
                const existing = data.historicalAttendance?.[subject] || { P: 0, total: 0 }

                return (
                  <div key={subject} className="historical-attendance-row">
                    <div className="historical-attendance-subject">
                      <div className="historical-attendance-name">{subject}</div>
                      <div className="text-dimmed" style={{ fontSize:11 }}>
                        {Math.max(0, (existing.total || 0) - (existing.P || 0))} missed so far
                      </div>
                    </div>

                    <div className="historical-attendance-inputs">
                      <div className="input-wrap" style={{ marginBottom:0 }}>
                        <label className="input-label">Attended</label>
                        <input
                          type="number"
                          min="0"
                          className="input"
                          style={{ marginBottom:0, width:96, textAlign:'center' }}
                          value={existing.P || 0}
                          onChange={e => updateHistoricalAttendance(subject, 'P', e.target.value)}
                        />
                      </div>

                      <div className="input-wrap" style={{ marginBottom:0 }}>
                        <label className="input-label">Total</label>
                        <input
                          type="number"
                          min="0"
                          className="input"
                          style={{ marginBottom:0, width:96, textAlign:'center' }}
                          value={Math.max(existing.total || 0, existing.P || 0)}
                          onChange={e => updateHistoricalAttendance(subject, 'total', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step 3 — Class settings */}
          <div className="card mb-md">
            <div className="setup-step-label"><span className="step-num">3</span> CLASS SETTINGS</div>
            <div className="flex-between">
              <div>
                <div style={{ fontFamily:'var(--font-head)', fontSize:'0.9rem', fontWeight:700 }}>Default Lecture Duration</div>
                <div className="text-dimmed" style={{ fontSize:11, marginTop:3 }}>Used to calculate time spent in class.</div>
              </div>
              <div className="flex-center gap-xs">
                <input
                  type="number" min="1" className="input"
                  style={{ width:72, marginBottom:0, textAlign:'center' }}
                  value={data.lectureSettings?.durationMinutes||60}
                  onChange={e => setData(d => ({ ...d, lectureSettings:{ ...d.lectureSettings, durationMinutes:parseInt(e.target.value)||0 } }))}
                />
                <Clock size={13} color="var(--text-3)"/>
                <span className="text-dimmed" style={{ fontSize:11 }}>min</span>
              </div>
            </div>
          </div>

          {/* Step 4 — Timetable */}
          <div className="card mb-md">
            <div className="setup-step-label"><span className="step-num">4</span> WEEKLY TIMETABLE</div>
            <div className="grid-2" style={{ gap:10 }}>
              {DAYS.map(day => (
                <div key={day} className="day-card">
                  <div className="day-card-header">
                    <span className="day-label">{day}</span>
                    <button className="btn btn-ghost" style={{ fontSize:10, padding:'4px 8px' }} onClick={()=>openForm(day)}>
                      <Plus size={11}/> CLASS
                    </button>
                  </div>

                  {data.timetable[day].length === 0
                    ? <div style={{ fontSize:11, color:'var(--text-3)', padding:'8px 0', textAlign:'center' }}>No classes.</div>
                    : data.timetable[day].map(cls => (
                      <div key={cls.id} className="class-slot">
                        <div>
                          <div className="class-slot-time">{cls.start} – {addMinutes(cls.start,cls.duration)}</div>
                          <div className="class-slot-name">{cls.subject}</div>
                        </div>
                        <button className="btn btn-ghost btn-icon" style={{ color:'var(--red)' }}
                          onClick={()=>removeClass(day,cls.id)}><Trash2 size={13}/></button>
                      </div>
                    ))
                  }

                  {form.day === day && (
                    <div className="add-class-form">
                      <div className="input-wrap" style={{ marginBottom:8 }}>
                        <label className="input-label">Subject</label>
                        <select className="input" style={{ marginBottom:0 }}
                          value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))}>
                          <option value="" disabled>Select…</option>
                          {data.subjects.map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="grid-2" style={{ gap:8, marginBottom:8 }}>
                        <div>
                          <label className="input-label">Start</label>
                          <input type="time" className="input" style={{ marginBottom:0 }}
                            value={form.start} onChange={e=>setForm(f=>({...f,start:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="input-label">Duration (min)</label>
                          <input type="number" className="input" style={{ marginBottom:0 }}
                            value={form.duration} onChange={e=>setForm(f=>({...f,duration:e.target.value}))}/>
                        </div>
                      </div>
                      <div className="grid-2" style={{ gap:8 }}>
                        <button className="btn btn-primary btn-full" onClick={()=>saveClass(day)}>SAVE</button>
                        <button className="btn btn-full" onClick={()=>setForm(f=>({...f,day:null}))}>CANCEL</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ textAlign:'center', paddingTop:8 }}>
            <button className="btn btn-primary btn-lg" style={{ padding:'14px 40px', fontSize:'1rem', letterSpacing:1 }}
              onClick={() => { setData(d=>({...d,phase:'ready'})); setActiveTab('tracker') }}>
              <Play size={18}/> START TRACKING
            </button>
          </div>
        </>
      )}
    </div>
  )
}
