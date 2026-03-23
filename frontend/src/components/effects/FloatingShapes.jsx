export default function FloatingShapes() {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null
  const shapes = [
    { id:1, left:'12%', dur:'26s', delay:'0s',   scale:.75 },
    { id:2, left:'88%', dur:'31s', delay:'5s',   scale:1.1 },
    { id:3, left:'52%', dur:'38s', delay:'10s',  scale:.6  },
    { id:4, left:'26%', dur:'29s', delay:'15s',  scale:.9  },
    { id:5, left:'74%', dur:'33s', delay:'20s',  scale:.8  },
  ]
  return (
    <div className="float-layer" aria-hidden="true">
      {shapes.map(s => (
        <div key={s.id} className="geo-shape geo-cube"
             style={{ left:s.left, animationDuration:s.dur, animationDelay:s.delay, transform:`scale(${s.scale})` }}>
          <div className="geo-face f-front"/><div className="geo-face f-back"/>
          <div className="geo-face f-right"/><div className="geo-face f-left"/>
          <div className="geo-face f-top"/><div className="geo-face f-bottom"/>
        </div>
      ))}
    </div>
  )
}
