import { useState } from 'react'
import { Calendar, Plus, Trash2, CheckCircle2, Clock } from 'lucide-react'
import TiltCard from '../effects/TiltCard'

export default function TermManager({ terms, currentTerm, createTerm, updateTerm, deleteTerm }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
  })
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name || !form.startDate || !form.endDate) return

    setSubmitting(true)
    try {
      await createTerm({
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        isCurrent: form.isCurrent || terms.length === 0, // Auto-set current if first term
      })
      setForm({ name: '', startDate: '', endDate: '', isCurrent: false })
      setShowForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetCurrent = async (id) => {
    await updateTerm(id, { isCurrent: true })
  }

  const handleDelete = async (id, name) => {
    if (window.confirm(`Delete term "${name}"?`)) {
      await deleteTerm(id)
    }
  }

  return (
    <TiltCard className="card mb-md">
      <div className="flex-between mb-sm" style={{ alignItems: 'center' }}>
        <div className="setup-step-label" style={{ marginBottom: 0 }}>
          <Calendar size={16} color="var(--teal)" style={{ marginRight: 6 }} /> ACADEMIC TERMS / SEMESTERS
        </div>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 11, padding: '4px 10px' }}
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={13} /> {showForm ? 'CANCEL' : 'ADD TERM'}
        </button>
      </div>

      <div className="text-dimmed" style={{ fontSize: 11, marginBottom: 14 }}>
        Organize your subjects and attendance by semester or term.
      </div>

      {/* Add Term Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="add-class-form mb-md" style={{ background: 'var(--bg-raised)', padding: 14, borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
          <div className="input-wrap mb-xs">
            <label className="input-label">Term / Semester Name</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Fall 2026 / Semester 5"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid-2 gap-sm mb-xs">
            <div className="input-wrap mb-0">
              <label className="input-label">Start Date</label>
              <input
                type="date"
                className="input"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div className="input-wrap mb-0">
              <label className="input-label">End Date</label>
              <input
                type="date"
                className="input"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex-between mt-sm">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text-2)' }}>
              <input
                type="checkbox"
                checked={form.isCurrent}
                onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })}
              />
              Set as active term
            </label>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'SAVING…' : 'SAVE TERM'}
            </button>
          </div>
        </form>
      )}

      {/* Terms List */}
      {terms.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '12px 0', textAlign: 'center' }}>
          No academic terms added yet. Click "Add Term" above to get started.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {terms.map((t) => {
            const isActive = t._id === currentTerm?._id || t.isCurrent
            const startStr = new Date(t.startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
            const endStr = new Date(t.endDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

            return (
              <div
                key={t._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: isActive ? 'rgba(0, 242, 254, 0.05)' : 'var(--bg-surface)',
                  border: `1px solid ${isActive ? 'rgba(0, 242, 254, 0.3)' : 'var(--border)'}`,
                  borderRadius: 'var(--r-sm)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-1)' }}>{t.name}</span>
                    {isActive && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 10,
                          background: 'var(--teal)',
                          color: '#000',
                          letterSpacing: '0.04em',
                        }}
                      >
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} /> {startStr} – {endStr}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {!isActive && (
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 10, padding: '4px 8px' }}
                      onClick={() => handleSetCurrent(t._id)}
                    >
                      <CheckCircle2 size={12} /> SET ACTIVE
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ color: 'var(--red)' }}
                    onClick={() => handleDelete(t._id, t.name)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </TiltCard>
  )
}
