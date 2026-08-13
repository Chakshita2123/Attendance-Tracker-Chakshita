import { useState } from 'react'
import { Trash2, Plus, Play, CheckSquare, Clock, AlertTriangle, Sparkles, Upload } from 'lucide-react'
import { DAYS } from '../constants'
import { addMinutes } from '../utils/date'
import TermManager from '../components/terms/TermManager'
import NumberInput from '../components/ui/NumberInput'
import TimetableUploadModal from '../components/setup/TimetableUploadModal'

export default function SetupPage({
  data,
  setData,
  setActiveTab,
  terms = [],
  currentTerm = null,
  createTerm,
  updateTerm,
  deleteTerm,
}) {
  const [subInput,  setSubInput]  = useState('')
  const [form, setForm] = useState({ day:null, subject:'', start:'09:00', duration: data.lectureSettings?.durationMinutes || 60 })
  const [activeDayFilter, setActiveDayFilter] = useState('ALL')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

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
    // Warn before deleting a subject that already has tracked attendance
    const hasTrackedAttendance = Object.values(data.attendance || {}).some(dayMarks => sub in dayMarks)

    if (hasTrackedAttendance) {
      const confirmed = window.confirm(
        `"${sub}" has recorded attendance data that will be permanently deleted.\n\nAre you sure you want to remove it?`
      )
      if (!confirmed) return
    }

    const tt = Object.fromEntries(DAYS.map(day => [day, (data.timetable[day]||[]).filter(c=>c.subject!==sub)]))
    setData(d => {
      const nextHistorical = { ...(d.historicalAttendance || {}) }
      delete nextHistorical[sub]

      const nextManualStats = { ...(d.manualStats || {}) }
      delete nextManualStats[sub]

      // Remove the subject's columns from tracked attendance and daily log
      const nextAttendance = {}
      Object.entries(d.attendance || {}).forEach(([date, dayMarks]) => {
        const filtered = { ...dayMarks }
        delete filtered[sub]
        if (Object.keys(filtered).length > 0) nextAttendance[date] = filtered
      })

      const nextDailyLog = {}
      Object.entries(d.dailyLog || {}).forEach(([date, dayMarks]) => {
        const filtered = { ...dayMarks }
        delete filtered[sub]
        if (Object.keys(filtered).length > 0) nextDailyLog[date] = filtered
      })

      return {
        ...d,
        subjects:              d.subjects.filter(s => s !== sub),
        timetable:             tt,
        historicalAttendance:  nextHistorical,
        manualStats:           nextManualStats,
        attendance:            nextAttendance,
        dailyLog:              nextDailyLog,
      }
    })
  }

  const updateManualStats = (subject, field, value) => {
    const numericValue = Math.max(0, parseInt(value, 10) || 0)

    setData(current => {
      const currentEntry = current.manualStats?.[subject] || { delivered: 0, attended: 0, dl: 0, ml: 0 }
      const nextEntry = { ...currentEntry, [field]: numericValue }

      return {
        ...current,
        manualStats: {
          ...(current.manualStats || {}),
          [subject]: nextEntry,
        },
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

  const isEditing  = data.phase === 'ready'   // already set up, editing existing config
  const canStart   = data.subjects.length > 0

  return (
    <div className="page-animate">

      {/* Academic Term Manager */}
      <TermManager
        terms={terms}
        currentTerm={currentTerm}
        createTerm={createTerm}
        updateTerm={updateTerm}
        deleteTerm={deleteTerm}
      />

      {/* Step 1 — Subjects */}
      <div className="card mb-md">
        <div className="setup-step-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div><span className="step-num">1</span> SUBJECTS</div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 11, color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={() => setIsUploadModalOpen(true)}
          >
            <Sparkles size={13} /> UPLOAD TIMETABLE (AI SCAN)
          </button>
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
          {/* Step 2 — Starting Balance (Portal Imports) */}
          <div className="card mb-md">
            <div className="setup-step-label"><span className="step-num">2</span> STARTING BALANCE (PORTAL IMPORT)</div>
            <div className="text-dimmed" style={{ fontSize:11, marginBottom:14 }}>
              Enter lectures completed before using the tracker (e.g. copied from your college portal).
              Day-to-day marked attendance will add on top of these baseline counts.
            </div>

            <div className="historical-attendance-list">
              {data.subjects.map(subject => {
                const ms = data.manualStats?.[subject] || { delivered: 0, attended: 0, dl: 0, ml: 0 }

                return (
                  <div key={subject} className="historical-attendance-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                    <div className="historical-attendance-subject">
                      <div className="historical-attendance-name" style={{ fontSize: '0.95rem', fontWeight: 700 }}>{subject}</div>
                      <div className="text-dimmed" style={{ fontSize:11 }}>
                        Effective Attended: {(ms.attended || 0) + (ms.dl || 0) + (ms.ml || 0)} / {ms.delivered || 0} Delivered
                      </div>
                    </div>

                    <div className="starting-balance-grid">
                      <div className="input-wrap" style={{ marginBottom:0 }}>
                        <label className="input-label">Delivered</label>
                        <NumberInput
                          min={0}
                          fallback={0}
                          style={{ marginBottom:0, textAlign:'center' }}
                          value={ms.delivered || 0}
                          onChange={val => updateManualStats(subject, 'delivered', val)}
                        />
                      </div>

                      <div className="input-wrap" style={{ marginBottom:0 }}>
                        <label className="input-label">Attended</label>
                        <NumberInput
                          min={0}
                          fallback={0}
                          style={{ marginBottom:0, textAlign:'center' }}
                          value={ms.attended || 0}
                          onChange={val => updateManualStats(subject, 'attended', val)}
                        />
                      </div>

                      <div className="input-wrap" style={{ marginBottom:0 }}>
                        <label className="input-label">DL (Duty Leave)</label>
                        <NumberInput
                          min={0}
                          fallback={0}
                          style={{ marginBottom:0, textAlign:'center' }}
                          value={ms.dl || 0}
                          onChange={val => updateManualStats(subject, 'dl', val)}
                        />
                      </div>

                      <div className="input-wrap" style={{ marginBottom:0 }}>
                        <label className="input-label">ML (Medical Leave)</label>
                        <NumberInput
                          min={0}
                          fallback={0}
                          style={{ marginBottom:0, textAlign:'center' }}
                          value={ms.ml || 0}
                          onChange={val => updateManualStats(subject, 'ml', val)}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step 3 / 2 — Class settings */}
          <div className="card mb-md">
            <div className="setup-step-label"><span className="step-num">{isEditing ? 2 : 3}</span> CLASS SETTINGS</div>
            <div className="flex-between mb-sm" style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontFamily:'var(--font-head)', fontSize:'0.9rem', fontWeight:700 }}>Default Lecture Duration</div>
                <div className="text-dimmed" style={{ fontSize:11, marginTop:3 }}>Used to calculate time spent in class.</div>
              </div>
              <div className="flex-center gap-xs">
                <NumberInput
                  min={1}
                  max={720}
                  fallback={60}
                  style={{ width:72, marginBottom:0, textAlign:'center' }}
                  value={data.lectureSettings?.durationMinutes || 60}
                  onChange={val => setData(d => ({ ...d, lectureSettings: { ...d.lectureSettings, durationMinutes: val } }))}
                />
                <Clock size={13} color="var(--text-3)"/>
                <span className="text-dimmed" style={{ fontSize:11 }}>min</span>
              </div>
            </div>

            <div className="flex-between" style={{ flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontFamily:'var(--font-head)', fontSize:'0.9rem', fontWeight:700 }}>Target Attendance Threshold</div>
                <div className="text-dimmed" style={{ fontSize:11, marginTop:3 }}>Minimum attendance percentage target (triggers recovery warnings).</div>
              </div>
              <div className="flex-center gap-xs">
                <NumberInput
                  min={1}
                  max={100}
                  fallback={75}
                  style={{ width:72, marginBottom:0, textAlign:'center' }}
                  value={data.targetThreshold ?? 75}
                  onChange={val => setData(d => ({ ...d, targetThreshold: val }))}
                />
                <span className="text-dimmed" style={{ fontSize:11 }}>%</span>
              </div>
            </div>
          </div>

          {/* Step 4 — Timetable */}
          <div className="card mb-md">
            <div className="setup-step-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div><span className="step-num">{isEditing ? 3 : 4}</span> WEEKLY TIMETABLE</div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 11, color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => setIsUploadModalOpen(true)}
              >
                <Upload size={13} /> AI TIMETABLE SCAN
              </button>
            </div>
            
            {/* Day Filter Pills for focused editing */}
            <div className="timetable-day-pills mb-sm">
              <button
                type="button"
                className={`timetable-pill ${activeDayFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setActiveDayFilter('ALL')}
              >
                ALL
              </button>
              {DAYS.map(day => (
                <button
                  type="button"
                  key={day}
                  className={`timetable-pill ${activeDayFilter === day ? 'active' : ''}`}
                  onClick={() => setActiveDayFilter(day)}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="grid-2" style={{ gap:10 }}>
              {DAYS.filter(day => activeDayFilter === 'ALL' || activeDayFilter === day).map(day => (
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
                        <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                          <div className="class-slot-time">{cls.start} – {addMinutes(cls.start,cls.duration)}</div>
                          <div className="class-slot-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.subject}</div>
                        </div>
                        <button className="btn btn-ghost btn-icon" style={{ color:'var(--red)', flexShrink: 0 }}
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
                          <NumberInput
                            min={1}
                            max={720}
                            fallback={data.lectureSettings?.durationMinutes || 60}
                            style={{ marginBottom:0 }}
                            value={form.duration}
                            onChange={val => setForm(f => ({ ...f, duration: val }))}
                          />
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
          <div style={{ textAlign:'center', paddingTop:8, paddingBottom:8 }}>
            {isEditing ? (
              /* Edit mode — changes are already syncing; just go back to Tracker */
              <button
                className="btn btn-primary btn-lg"
                style={{ padding:'14px 40px', fontSize:'1rem', letterSpacing:1 }}
                onClick={() => setActiveTab('tracker')}
              >
                <CheckSquare size={18}/> SAVE CHANGES
              </button>
            ) : (
              /* First-time setup — promote phase to 'ready' and open Tracker */
              <button
                className="btn btn-primary btn-lg"
                style={{ padding:'14px 40px', fontSize:'1rem', letterSpacing:1 }}
                onClick={() => { setData(d=>({...d,phase:'ready'})); setActiveTab('tracker') }}
              >
                <Play size={18}/> START TRACKING
              </button>
            )}
          </div>
        </>
      )}

      {/* Timetable AI Scan Modal */}
      <TimetableUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        data={data}
        setData={setData}
      />
    </div>
  )
}
