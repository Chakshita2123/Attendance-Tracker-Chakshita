import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle2, AlertTriangle, X, Sparkles, RefreshCw, Layers, ArrowRight } from 'lucide-react'
import { getApiBaseUrl } from '../../utils/api'
import { DAYS } from '../../constants'

export default function TimetableUploadModal({ isOpen, onClose, data, setData }) {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Step state: 'upload' | 'preview'
  const [step, setStep] = useState('upload')

  // Extracted results state
  const [detectedSubjects, setDetectedSubjects] = useState([])
  const [newSubInput, setNewSubInput] = useState('')
  const [extractedSlots, setExtractedSlots] = useState([])

  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return
    const isImage = selectedFile.type.startsWith('image/')
    const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf')

    if (!isImage && !isPdf) {
      setError('Please select a JPG, PNG image or a PDF file.')
      return
    }

    setFile(selectedFile)
    setError(null)

    if (isImage) {
      const url = URL.createObjectURL(selectedFile)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleUploadAndScan = async () => {
    if (!file) return
    setLoading(true)
    setError(null)

    try {
      // Convert file to base64 payload for reliable cross-platform API request
      const reader = new FileReader()
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result)
        reader.onerror = (err) => reject(err)
      })
      reader.readAsDataURL(file)
      const dataUrl = await base64Promise

      const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')
      const apiBase = getApiBaseUrl()
      const token = localStorage.getItem('markd_auth_token')

      const response = await fetch(`${apiBase}/api/timetable/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fileData: dataUrl,
          mimeType,
        }),
      })

      const resData = await response.json()

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to parse timetable file.')
      }

      const { subjects = [], timetable = [] } = resData.data || {}

      // Combine existing data.subjects with newly detected subjects
      const combinedSubjects = Array.from(new Set([
        ...data.subjects,
        ...subjects.map(s => String(s).toUpperCase().trim())
      ])).filter(Boolean)

      setDetectedSubjects(combinedSubjects)

      // Initialize extracted slots with selected flag
      const formattedSlots = timetable.map((slot) => ({
        ...slot,
        selected: true,
        // If ambiguous, user must select a subject option before applying
        chosenSubject: slot.subject || (slot.options && slot.options.length > 0 ? slot.options[0] : ''),
      }))

      setExtractedSlots(formattedSlots)
      setStep('preview')
    } catch (err) {
      console.error('[Scan Error]', err)
      setError(err.message || 'Could not process timetable image. Please try manual entry.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Subject Management in Preview ── */
  const addDetectedSubject = () => {
    const val = newSubInput.trim().toUpperCase()
    if (val && !detectedSubjects.includes(val)) {
      setDetectedSubjects([...detectedSubjects, val])
      setNewSubInput('')
    }
  }

  const removeDetectedSubject = (sub) => {
    setDetectedSubjects(detectedSubjects.filter(s => s !== sub))
  }

  /* ── Slot Overlap Checker ── */
  const getSlotOverlap = (slot) => {
    const existingForDay = data.timetable[slot.day] || []
    if (existingForDay.length === 0) return null

    const parseMinutes = (timeStr) => {
      const [h, m] = String(timeStr || '00:00').split(':').map(Number)
      return (h || 0) * 60 + (m || 0)
    }

    const slotStartMin = parseMinutes(slot.start)
    const slotEndMin = slotStartMin + (parseInt(slot.duration, 10) || 60)

    for (const existing of existingForDay) {
      const exStartMin = parseMinutes(existing.start)
      const exEndMin = exStartMin + (parseInt(existing.duration, 10) || 60)

      // Overlap condition: start < end AND end > start
      if (slotStartMin < exEndMin && slotEndMin > exStartMin) {
        return existing
      }
    }
    return null
  }

  /* ── Confirm & Save to Setup ── */
  const handleConfirmAndApply = () => {
    // 1. Merge subjects
    const finalSubjectsSet = new Set(data.subjects)
    detectedSubjects.forEach(s => finalSubjectsSet.add(s))

    // Collect any subjects assigned in slots
    extractedSlots.forEach(slot => {
      if (slot.selected) {
        const sub = slot.isAmbiguous ? slot.chosenSubject : slot.subject
        if (sub) finalSubjectsSet.add(sub.toUpperCase().trim())
      }
    })

    const updatedSubjects = Array.from(finalSubjectsSet).filter(Boolean)

    // 2. Insert selected timetable slots grouped by day
    const updatedTimetable = { ...data.timetable }

    extractedSlots.forEach(slot => {
      if (!slot.selected) return

      const targetDay = slot.day
      if (!DAYS.includes(targetDay)) return

      const finalSubject = (slot.isAmbiguous ? slot.chosenSubject : slot.subject) || updatedSubjects[0] || 'CLASS'
      if (!finalSubject) return

      const newCls = {
        id: Math.random().toString(36).slice(2, 11),
        subject: finalSubject.toUpperCase().trim(),
        start: slot.start,
        duration: parseInt(slot.duration, 10) || 60,
      }

      const currentDaySlots = updatedTimetable[targetDay] || []
      // Append and sort by start time
      const sorted = [...currentDaySlots, newCls].sort((a, b) => a.start.localeCompare(b.start))
      updatedTimetable[targetDay] = sorted
    })

    setData(prev => ({
      ...prev,
      subjects: updatedSubjects,
      timetable: updatedTimetable,
    }))

    resetAndClose()
  }

  const resetAndClose = () => {
    setFile(null)
    setPreviewUrl(null)
    setLoading(false)
    setError(null)
    setStep('upload')
    setDetectedSubjects([])
    setExtractedSlots([])
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-raised)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="var(--teal)" />
            <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '1rem' }}>
              {step === 'upload' ? 'Upload Timetable (AI Scan)' : 'Review & Confirm Extracted Timetable'}
            </span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={resetAndClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--r-md)',
                background: 'rgba(248,113,113,0.15)',
                border: '1px solid rgba(248,113,113,0.4)',
                color: 'var(--red)',
                fontSize: 13,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: '4px 8px' }}
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* STEP 1: UPLOAD FILE */}
          {step === 'upload' && (
            <div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--r-lg)',
                  padding: '36px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: file ? 'var(--bg-raised)' : 'transparent',
                  transition: 'all 0.2s ease',
                  marginBottom: 16,
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />

                {file ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Timetable Preview"
                        style={{ maxHeight: 160, borderRadius: 8, border: '1px solid var(--border)', objectFit: 'contain' }}
                      />
                    ) : (
                      <FileText size={48} color="var(--teal)" />
                    )}
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{file.name}</div>
                    <div className="text-dimmed" style={{ fontSize: 12 }}>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB · Click to change file
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <Upload size={40} color="var(--teal)" />
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Drag & Drop timetable image or PDF</div>
                    <div className="text-dimmed" style={{ fontSize: 12 }}>
                      Supports JPG, PNG, WEBP, and PDF up to 25MB
                    </div>
                    <button type="button" className="btn btn-primary mt-xs" style={{ pointerEvents: 'none' }}>
                      BROWSE FILE
                    </button>
                  </div>
                )}
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 20 }}>
                💡 <strong>How it works:</strong> Gemini AI reads your timetable image/PDF to detect subject names, days, and timeslots.
                Any elective choices (e.g. AOC/BPC) will be flagged for your review before adding.
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn" onClick={resetAndClose} disabled={loading}>
                  CANCEL
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!file || loading}
                  onClick={handleUploadAndScan}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={14} className="spin" /> Scanning with Gemini AI...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> SCAN TIMETABLE
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & DISAMBIGUATE */}
          {step === 'preview' && (
            <div>
              {/* Subjects Detected Section */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8, color: 'var(--text-2)' }}>
                  1. DETECTED SUBJECTS ({detectedSubjects.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {detectedSubjects.map((sub) => (
                    <div key={sub} className="tag">
                      {sub}
                      <button className="tag-del" onClick={() => removeDetectedSubject(sub)}>
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    style={{ marginBottom: 0, flex: 1 }}
                    placeholder="Add missing subject..."
                    value={newSubInput}
                    onChange={(e) => setNewSubInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addDetectedSubject()}
                  />
                  <button className="btn" onClick={addDetectedSubject}>
                    ADD
                  </button>
                </div>
              </div>

              {/* Schedule Slots Section */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8, color: 'var(--text-2)' }}>
                  2. EXTRACTED CLASSES ({extractedSlots.filter((s) => s.selected).length} selected)
                </div>

                {extractedSlots.length === 0 ? (
                  <div className="text-dimmed" style={{ fontSize: 13, padding: 16, textAlign: 'center' }}>
                    No class slots detected. You can add subjects above or edit manually.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {extractedSlots.map((slot, index) => {
                      const overlap = getSlotOverlap(slot)

                      return (
                        <div
                          key={slot.id || index}
                          style={{
                            padding: 12,
                            borderRadius: 'var(--r-md)',
                            border: slot.isAmbiguous
                              ? '1px solid var(--amber)'
                              : overlap
                              ? '1px solid rgba(248,113,113,0.5)'
                              : '1px solid var(--border)',
                            background: slot.isAmbiguous
                              ? 'rgba(245,158,11,0.06)'
                              : overlap
                              ? 'rgba(248,113,113,0.06)'
                              : 'var(--bg-raised)',
                            opacity: slot.selected ? 1 : 0.5,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input
                                type="checkbox"
                                checked={slot.selected}
                                onChange={(e) => {
                                  const updated = [...extractedSlots]
                                  updated[index].selected = e.target.checked
                                  setExtractedSlots(updated)
                                }}
                              />
                              <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--teal)' }}>
                                {slot.day} · {slot.start} ({slot.duration} min)
                              </span>
                            </div>

                            {/* Ambiguity or Overlap Badges */}
                            {slot.isAmbiguous ? (
                              <span style={{ fontSize: 10, background: 'var(--amber)', color: '#000', fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                                ⚠️ ELECTIVE CHOICE
                              </span>
                            ) : overlap ? (
                              <span style={{ fontSize: 10, background: 'var(--red)', color: '#fff', fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                                OVERLAPS ({overlap.subject})
                              </span>
                            ) : null}
                          </div>

                          {/* Subject Selector or Name */}
                          {slot.isAmbiguous ? (
                            <div style={{ marginTop: 8 }}>
                              <label style={{ fontSize: 11, color: 'var(--amber)', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                                Multiple subject options detected ({slot.rawText}). Please select one:
                              </label>
                              <select
                                className="input"
                                style={{ marginBottom: 0 }}
                                value={slot.chosenSubject}
                                onChange={(e) => {
                                  const updated = [...extractedSlots]
                                  updated[index].chosenSubject = e.target.value
                                  setExtractedSlots(updated)
                                }}
                              >
                                {slot.options && slot.options.length > 0 ? (
                                  slot.options.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))
                                ) : (
                                  detectedSubjects.map((sub) => (
                                    <option key={sub} value={sub}>
                                      {sub}
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Subject:</span>
                              <select
                                className="input"
                                style={{ marginBottom: 0, padding: '4px 8px', height: 'auto', fontSize: 12 }}
                                value={slot.subject || ''}
                                onChange={(e) => {
                                  const updated = [...extractedSlots]
                                  updated[index].subject = e.target.value
                                  setExtractedSlots(updated)
                                }}
                              >
                                {detectedSubjects.map((sub) => (
                                  <option key={sub} value={sub}>
                                    {sub}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {overlap && (
                            <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>
                              Notice: Overlaps with existing class: {overlap.subject} ({overlap.start}).
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <button className="btn btn-ghost" onClick={() => setStep('upload')}>
                  ← Re-upload File
                </button>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn" onClick={resetAndClose}>
                    CANCEL
                  </button>
                  <button className="btn btn-primary" onClick={handleConfirmAndApply}>
                    <CheckCircle2 size={14} /> CONFIRM & APPLY TO TIMETABLE
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
