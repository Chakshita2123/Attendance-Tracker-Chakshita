import { useState, useMemo } from 'react'
import { Calculator, ArrowRight, TrendingUp, TrendingDown, CheckCircle, AlertCircle, Sparkles } from 'lucide-react'
import TiltCard from '../effects/TiltCard'
import AnimatedNumber from '../effects/AnimatedNumber'
import NumberInput from '../ui/NumberInput'
import { attendancePct, canMiss, classesNeeded } from '../../utils/stats'

export default function WhatIfCalculator({ subjects, subStats, attendance, historicalAttendance }) {
  const [selectedSubject, setSelectedSubject] = useState('ALL')
  const [futureAttend, setFutureAttend] = useState(1)
  const [futureMiss, setFutureMiss] = useState(0)

  // Calculate base & predicted stats
  const prediction = useMemo(() => {
    let baseP = 0
    let baseTotal = 0

    if (selectedSubject === 'ALL') {
      // Sum up across all subjects
      subjects.forEach(sub => {
        const s = subStats[sub]
        if (s) {
          baseP += (s.P || 0) + (s.L || 0)
          baseTotal += (s.total || 0)
        }
      })
    } else {
      const s = subStats[selectedSubject] || { P: 0, L: 0, total: 0 }
      baseP = (s.P || 0) + (s.L || 0)
      baseTotal = s.total || 0
    }

    const currentPct = baseTotal === 0 ? 0 : Math.round((baseP / baseTotal) * 100)

    const addAttend = Math.max(0, parseInt(futureAttend, 10) || 0)
    const addMiss = Math.max(0, parseInt(futureMiss, 10) || 0)

    const newP = baseP + addAttend
    const newTotal = baseTotal + addAttend + addMiss
    const projectedPct = newTotal === 0 ? 0 : Math.round((newP / newTotal) * 100)

    const projectedStats = { P: newP, A: newTotal - newP, L: 0, total: newTotal }
    const neededAfter = classesNeeded(projectedStats)
    const canMissAfter = canMiss(projectedStats)
    const delta = projectedPct - currentPct

    return {
      currentPct,
      projectedPct,
      delta,
      baseTotal,
      newTotal,
      neededAfter,
      canMissAfter,
    }
  }, [selectedSubject, futureAttend, futureMiss, subjects, subStats])

  if (!subjects || subjects.length === 0) return null

  const { currentPct, projectedPct, delta, newTotal, neededAfter, canMissAfter } = prediction

  const getStatusBadge = (pct) => {
    if (pct >= 75) {
      return {
        label: 'SAFE',
        color: 'var(--teal)',
        icon: <CheckCircle size={14} color="var(--teal)" />,
        bannerClass: 'banner-ok',
      }
    }
    if (pct >= 50) {
      return {
        label: 'AT RISK',
        color: 'var(--amber)',
        icon: <AlertCircle size={14} color="var(--amber)" />,
        bannerClass: 'banner-mid',
      }
    }
    return {
      label: 'CRITICAL',
      color: 'var(--red)',
      icon: <AlertCircle size={14} color="var(--red)" />,
      bannerClass: 'banner-warn',
    }
  }

  const status = getStatusBadge(projectedPct)

  return (
    <TiltCard
      className="card mb-md mt-sm"
      style={{
        border: '1px solid rgba(0, 242, 254, 0.35)',
        boxShadow: '0 0 24px rgba(0, 242, 254, 0.09)',
        background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.06) 0%, var(--bg-surface) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow accent */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          background: 'radial-gradient(circle, rgba(0, 242, 254, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
          borderRadius: '50%',
        }}
      />

      <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calculator size={20} color="var(--teal)" />
          <span style={{ fontFamily: 'var(--font-head)', letterSpacing: '0.06em', fontSize: '1.05rem', fontWeight: 800, color: 'var(--teal)' }}>
            WHAT-IF PREDICTION CALCULATOR
          </span>
        </div>
        <span
          style={{
            fontSize: 10,
            color: 'var(--teal)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            background: 'rgba(0, 242, 254, 0.1)',
            padding: '2px 8px',
            borderRadius: 10,
            border: '1px solid rgba(0, 242, 254, 0.25)',
          }}
        >
          INTERACTIVE TOOL
        </span>
      </div>

      <div className="text-dimmed" style={{ fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>
        Simulate future class attendance to predict percentage changes and attendance buffer before making decisions.
      </div>

      {/* Controls Grid */}
      <div className="whatif-controls-grid mb-md">
        {/* Subject Select */}
        <div className="input-wrap" style={{ marginBottom: 0 }}>
          <label className="input-label" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
            Select Scope
          </label>
          <select
            className="input"
            style={{ marginBottom: 0, fontWeight: 600, width: '100%' }}
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="ALL">All Subjects Combined</option>
            {subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        {/* Future Attend Input */}
        <div className="input-wrap" style={{ marginBottom: 0 }}>
          <label className="input-label" style={{ fontSize: 11, color: 'var(--teal)' }}>
            + Attend Upcoming
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <NumberInput
              min={0}
              max={365}
              fallback={0}
              style={{ marginBottom: 0, textAlign: 'center', fontWeight: 700, borderColor: 'rgba(0, 242, 254, 0.3)', flex: 1, minWidth: 70 }}
              value={futureAttend}
              onChange={setFutureAttend}
            />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>classes</span>
          </div>
        </div>

        {/* Future Miss Input */}
        <div className="input-wrap" style={{ marginBottom: 0 }}>
          <label className="input-label" style={{ fontSize: 11, color: 'var(--red)' }}>
            + Miss Upcoming
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <NumberInput
              min={0}
              max={365}
              fallback={0}
              style={{ marginBottom: 0, textAlign: 'center', fontWeight: 700, borderColor: 'rgba(255, 75, 110, 0.3)', flex: 1, minWidth: 70 }}
              value={futureMiss}
              onChange={setFutureMiss}
            />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>classes</span>
          </div>
        </div>
      </div>

      {/* Prediction Output Box */}
      <div
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          padding: '18px 20px',
        }}
      >
        <div className="flex-between mb-sm" style={{ flexWrap: 'wrap', gap: 12 }}>
          {/* Comparison strip */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--text-2)' }}>
                {currentPct}%
              </div>
            </div>

            <ArrowRight size={18} color="var(--text-3)" style={{ marginTop: 8 }} />

            <div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projected</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-head)', color: status.color }}>
                <AnimatedNumber value={projectedPct} suffix="%" />
              </div>
            </div>

            {/* Delta pill */}
            {delta !== 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  background: delta > 0 ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255, 75, 110, 0.12)',
                  color: delta > 0 ? 'var(--teal)' : 'var(--red)',
                  border: `1px solid ${delta > 0 ? 'rgba(0, 242, 254, 0.25)' : 'rgba(255, 75, 110, 0.25)'}`,
                  marginTop: 10,
                }}
              >
                {delta > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {delta > 0 ? `+${delta}%` : `${delta}%`}
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 'var(--r-sm)',
              background: 'var(--bg-surface)',
              border: `1px solid ${status.color}`,
              fontFamily: 'var(--font-head)',
              fontSize: 12,
              fontWeight: 700,
              color: status.color,
              letterSpacing: '0.06em',
            }}
          >
            {status.icon}
            {status.label}
          </div>
        </div>

        {/* Actionable insight text */}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
          {newTotal === 0 ? (
            <span>Add historical baseline or attendance data to generate accurate predictions.</span>
          ) : projectedPct >= 75 ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Sparkles size={16} color="var(--teal)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                With this plan, your total will be <strong>{newTotal}</strong> classes and you can still miss{' '}
                <strong style={{ color: 'var(--teal)' }}>{canMissAfter}</strong> more classes while staying above 75%.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertCircle size={16} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                With this plan, your total will be <strong>{newTotal}</strong> classes and you will need to attend{' '}
                <strong style={{ color: 'var(--amber)' }}>{neededAfter}</strong> consecutive additional classes to reach 75%.
              </div>
            </div>
          )}
        </div>
      </div>
    </TiltCard>
  )
}
