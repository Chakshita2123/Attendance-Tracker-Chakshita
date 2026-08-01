import { useRef, useEffect } from 'react'

const MAX_DPR = 2

export default function Confetti({ trigger }) {
  const ref  = useRef(null)
  const done = useRef(false)

  useEffect(() => {
    if (!trigger || done.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    done.current = true
    const canvas = ref.current
    const ctx    = canvas.getContext('2d')

    // Cap DPR at 2× to avoid over-sampling on high-density screens
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    canvas.width  = window.innerWidth  * dpr
    canvas.height = window.innerHeight * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Reduce particle count on mobile — physics is the same, just fewer squares
    const isMobile     = window.innerWidth < 768
    const PARTICLE_COUNT = isMobile ? 55 : 110

    const colors = ['#22d3a5', '#f87171', '#f59e0b', '#38bdf8', '#a78bfa']
    const parts  = Array.from({ length: PARTICLE_COUNT }, () => ({
      x:     window.innerWidth  / 2 + (Math.random() - .5) * 180,
      y:     window.innerHeight / 2 - 80 - Math.random() * 180,
      vx:    (Math.random() - .5) * 14,
      vy:    Math.random() * -12 - 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size:  Math.random() * 5 + 3,
      rot:   Math.random() * Math.PI * 2,
      rs:    (Math.random() - .5) * .18,
    }))

    const start = Date.now()
    let raf

    const step = () => {
      // Drawing coords are in CSS-pixel space (dpr transform handles the rest)
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

      if (Date.now() - start > 2800) return   // animation finished

      // Pause if tab is hidden — resume on next visible frame automatically
      if (document.hidden) {
        raf = requestAnimationFrame(step)
        return
      }

      parts.forEach(p => {
        p.x  += p.vx
        p.y  += p.vy
        p.vy += .45        // gravity
        p.rot += p.rs
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        ctx.restore()
      })

      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)

    const onVisibility = () => {
      // Nothing extra needed: the step() function already skips a frame when
      // hidden and rescheduling itself, so particles just pause gracefully.
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [trigger])

  return (
    <canvas
      ref={ref}
      style={{ position: 'fixed', top: 0, left: 0, zIndex: 999, pointerEvents: 'none' }}
    />
  )
}
