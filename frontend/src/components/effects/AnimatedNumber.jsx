import { useState, useEffect, useRef } from 'react'

export default function AnimatedNumber({ value, suffix = '' }) {
  const [count, setCount] = useState(0)
  const prevRef = useRef(0)

  useEffect(() => {
    const diff = value - prevRef.current
    if (diff === 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(value); prevRef.current = value; return
    }
    let startTime = null, raf
    const prev = prevRef.current
    const ease = t => 1 - Math.pow(1 - t, 3)
    const step = (ts) => {
      if (!startTime) startTime = ts
      const p = Math.min((ts - startTime) / 700, 1)
      setCount(Math.round(prev + diff * ease(p)))
      if (p < 1) raf = requestAnimationFrame(step)
      else prevRef.current = value
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <span>{count}{suffix}</span>
}
