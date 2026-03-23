import { useRef, useEffect } from 'react'

export default function Confetti({ trigger }) {
  const ref  = useRef(null)
  const done = useRef(false)

  useEffect(() => {
    if (!trigger || done.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    done.current = true
    const canvas = ref.current
    const ctx    = canvas.getContext('2d')
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const colors  = ['#22d3a5','#f87171','#f59e0b','#38bdf8','#a78bfa']
    const parts   = Array.from({ length: 110 }, () => ({
      x:  canvas.width/2  + (Math.random()-.5)*180,
      y:  canvas.height/2 - 80 - Math.random()*180,
      vx: (Math.random()-.5)*14, vy: Math.random()*-12-4,
      color: colors[Math.floor(Math.random()*colors.length)],
      size: Math.random()*5+3,
      rot: Math.random()*Math.PI*2, rs: (Math.random()-.5)*.18,
    }))
    const start = Date.now(); let raf
    const step = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height)
      if (Date.now()-start > 2800) return
      parts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy; p.vy+=.45; p.rot+=p.rs
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot)
        ctx.fillStyle=p.color; ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size)
        ctx.restore()
      })
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [trigger])

  return <canvas ref={ref} style={{ position:'fixed',top:0,left:0,zIndex:999,pointerEvents:'none' }} />
}
