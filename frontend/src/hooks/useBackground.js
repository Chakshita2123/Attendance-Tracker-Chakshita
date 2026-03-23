import { useEffect } from 'react'

export function useAurora(canvasRef) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: false })
    let raf, t = 0
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    window.addEventListener('resize', resize); resize()
    const colors = ['rgba(34,211,165,.07)','rgba(56,189,248,.06)','rgba(167,139,250,.05)','rgba(34,211,165,.04)','rgba(245,158,11,.025)']
    const speeds = [.0003,.0004,.0002,.0005,.00035]
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height); t+=16
      for (let i=0;i<5;i++) {
        ctx.fillStyle=colors[i]; ctx.beginPath()
        const by = canvas.height*(.18+i*.09)
        ctx.moveTo(0,canvas.height); ctx.lineTo(0,by)
        const sw = canvas.width/4
        for (let j=0;j<4;j++) {
          const x2=(j+1)*sw
          ctx.bezierCurveTo(j*sw+sw/2, by+Math.sin(t*speeds[i]+j+i)*85, x2-sw/2, by+Math.cos(t*speeds[i]+j+i+1)*85, x2, by+Math.sin(t*speeds[i]+(j+1)+i)*85)
        }
        ctx.lineTo(canvas.width,canvas.height); ctx.closePath(); ctx.fill()
      }
      raf=requestAnimationFrame(draw)
    }
    raf=requestAnimationFrame(draw)
    return () => { window.removeEventListener('resize',resize); cancelAnimationFrame(raf) }
  }, [canvasRef])
}

export function useNeural(canvasRef) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: false })
    let raf, nodes=[], pulses=[], lastPulse=0, lastFlash=0, flashIdx=-1, flashStart=0
    const isMob = window.innerWidth < 768
    const N = isMob ? 28 : 52
    const resize = () => {
      canvas.width=window.innerWidth; canvas.height=window.innerHeight
      if (!nodes.length) nodes = Array.from({length:N},()=>({
        x:Math.random()*canvas.width, y:Math.random()*canvas.height,
        vx:(Math.random()-.5)*.45, vy:(Math.random()-.5)*.45,
        r:1.7, ph:Math.random()*Math.PI*2, ps:.02+Math.random()*.02
      }))
    }
    window.addEventListener('resize',resize); resize()
    const draw = (ts) => {
      ctx.clearRect(0,0,canvas.width,canvas.height)
      nodes.forEach(n => {
        n.x+=n.vx; n.y+=n.vy
        if(n.x<0||n.x>canvas.width) n.vx*=-1
        if(n.y<0||n.y>canvas.height) n.vy*=-1
        n.ph+=n.ps
      })
      ctx.lineWidth=.7
      const pairs=[]
      for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++) {
        const dx=nodes[i].x-nodes[j].x, dy=nodes[i].y-nodes[j].y
        const d=Math.sqrt(dx*dx+dy*dy)
        if(d<125) {
          ctx.strokeStyle=`rgba(34,211,165,${(1-d/125)*.14})`
          ctx.beginPath(); ctx.moveTo(nodes[i].x,nodes[i].y); ctx.lineTo(nodes[j].x,nodes[j].y); ctx.stroke()
          pairs.push([i,j])
        }
      }
      if(!isMob && ts-lastPulse>2800 && pairs.length && pulses.length<5) {
        lastPulse=ts; const p=pairs[Math.floor(Math.random()*pairs.length)]
        pulses.push({aIdx:p[0],bIdx:p[1],prog:0})
      }
      if(ts-lastFlash>4200) { lastFlash=ts; flashIdx=Math.floor(Math.random()*nodes.length); flashStart=ts }
      for(let i=pulses.length-1;i>=0;i--) {
        const p=pulses[i]; p.prog+=.016; if(p.prog>=1){pulses.splice(i,1);continue}
        const a=nodes[p.aIdx],b=nodes[p.bIdx]; if(!a||!b){pulses.splice(i,1);continue}
        ctx.save(); ctx.fillStyle='rgba(56,189,248,.85)'; ctx.shadowBlur=8; ctx.shadowColor='#38bdf8'
        ctx.beginPath(); ctx.arc(a.x+(b.x-a.x)*p.prog,a.y+(b.y-a.y)*p.prog,2.8,0,Math.PI*2); ctx.fill(); ctx.restore()
      }
      nodes.forEach((n,i) => {
        const cr = n.r+Math.sin(n.ph)*.7
        ctx.save()
        if(flashIdx===i && ts-flashStart<550) {
          ctx.fillStyle='rgba(34,211,165,.9)'; ctx.shadowBlur=18; ctx.shadowColor='#22d3a5'
          ctx.beginPath(); ctx.arc(n.x,n.y,n.r*3,0,Math.PI*2); ctx.fill()
        } else {
          ctx.fillStyle=`rgba(34,211,165,${.45+.2*Math.sin(n.ph)})`
          ctx.beginPath(); ctx.arc(n.x,n.y,Math.max(0,cr),0,Math.PI*2); ctx.fill()
        }
        ctx.restore()
      })
      raf=requestAnimationFrame(draw)
    }
    raf=requestAnimationFrame(draw)
    return () => { window.removeEventListener('resize',resize); cancelAnimationFrame(raf) }
  }, [canvasRef])
}
