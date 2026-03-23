import { useRef, useState } from 'react'

export default function TiltCard({ children, className = '', style = {} }) {
  const ref   = useRef(null)
  const [shine, setShine] = useState({ x: 50, y: 50, o: 0 })
  const touch = typeof window !== 'undefined' && 'ontouchstart' in window

  const onMove = (e) => {
    if (touch) return
    const el = ref.current; if (!el) return
    const { left, top, width, height } = el.getBoundingClientRect()
    const x = e.clientX - left, y = e.clientY - top
    el.style.transform = `perspective(700px) rotateX(${((y - height/2)/(height/2))*-6}deg) rotateY(${((x - width/2)/(width/2))*6}deg)`
    setShine({ x: (x/width)*100, y: (y/height)*100, o: 0.05 })
  }
  const onLeave = () => {
    if (!ref.current) return
    ref.current.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)'
    setShine(s => ({ ...s, o: 0 }))
  }

  return (
    <div ref={ref} className={`tilt-card ${className}`} style={style}
         onMouseMove={onMove} onMouseLeave={onLeave}>
      {children}
      <div className="tilt-shine" style={{
        background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,.8) 0%, transparent 60%)`,
        opacity: shine.o,
        transition: 'opacity 0.3s',
      }} />
    </div>
  )
}
