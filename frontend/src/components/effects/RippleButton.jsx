import { useState } from 'react'

export default function RippleButton({ children, onClick, className = '', disabled = false }) {
  const [ripples, setRipples] = useState([])

  const handleClick = (e) => {
    if (disabled) return
    const { left, top } = e.currentTarget.getBoundingClientRect()
    const id = Date.now()
    setRipples(p => [...p, { x: e.clientX - left, y: e.clientY - top, id }])
    onClick?.(e)
    setTimeout(() => setRipples(rs => rs.filter(r => r.id !== id)), 450)
  }

  return (
    <div className="ripple-host" style={{ display: 'inline-flex' }}>
      <button className={className} onClick={handleClick} disabled={disabled}>
        {children}
      </button>
      {ripples.map(r => (
        <span key={r.id} className="ripple-circle"
              style={{ left: r.x - 20, top: r.y - 20, width: 40, height: 40 }} />
      ))}
    </div>
  )
}
