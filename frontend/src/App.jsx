import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CheckCircle, Circle, AlertCircle, TrendingUp, LogOut, RotateCcw, Play, CheckSquare, Trash2, Calendar, Settings, Activity } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// All styles are now in index.css (loaded by Vite before React renders)

// Utils
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const getTodayDateStr = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
};
const getDayOfWeek = (dateStr) => {
    const d = new Date(dateStr);
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
};
const getLast7Days = () => {
    const days = [];
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        days.push(d.toISOString().split('T')[0]);
    }
    return days;
};

const DEFAULT_DATA = {
  subjects: [],
  timetable: { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [] },
  attendance: {}, 
  dailyLog: {},
  phase: 'setup',
  lectureSettings: { durationMinutes: 60 }
};

// --- VISUAL ENHANCEMENT COMPONENTS ---

function useCountUp(target, duration = 800) {
    const [count, setCount] = useState(0);
    const prevCountRef = useRef(0);
    
    useEffect(() => {
        let startTime = null;
        const prev = prevCountRef.current;
        const diff = target - prev;
        if (diff === 0) return;
        
        const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (isReduced) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCount(target);
            prevCountRef.current = target;
            return;
        }

        let animationFrame;
        const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
        
        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            setCount(Math.round(prev + diff * easeOutCubic(progress)));
            if (progress < 1) {
                animationFrame = requestAnimationFrame(step);
            } else {
                prevCountRef.current = target;
            }
        };
        animationFrame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(animationFrame);
    }, [target, duration]);
    
    return count;
}

function AnimatedNumber({ value }) {
    const activeValue = useCountUp(value);
    return <span>{activeValue}</span>;
}

function ParticleBackground() {
    const canvasRef = useRef(null);
    useEffect(() => {
        const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (isReduced) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrame;
        let particles = [];
        
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();
        
        for (let i = 0; i < 60; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 1.0,
                vy: (Math.random() - 0.5) * 1.0,
            });
        }
        
        const step = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(34,211,165,0.4)';
            ctx.lineWidth = 1;
            
            for (let i = 0; i < 60; i++) {
                const p = particles[i];
                p.x += p.vx * 0.4;
                p.y += p.vy * 0.4;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                ctx.fill();
                
                for (let j = i + 1; j < 60; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 120) {
                        ctx.strokeStyle = `rgba(34,211,165,${0.2 * (1 - dist/120)})`;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }
            animationFrame = requestAnimationFrame(step);
        };
        animationFrame = requestAnimationFrame(step);
        
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrame);
        };
    }, []);
    return <canvas ref={canvasRef} style={{position: 'fixed', top:0, left:0, zIndex: -1, pointerEvents: 'none'}} />;
}

function TiltCard({ children, className = '', style = {} }) {
    const cardRef = useRef(null);
    const [shine, setShine] = useState({ x: 50, y: 50, opacity: 0 });
    const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window;
    
    const onMouseMove = (e) => {
        if (isTouch) return;
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;
        
        card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        setShine({ x: (x / rect.width) * 100, y: (y / rect.height) * 100, opacity: 0.06 });
    };
    
    const onMouseLeave = () => {
        if (isTouch) return;
        const card = cardRef.current;
        if (!card) return;
        card.style.transform = `perspective(600px) rotateX(0deg) rotateY(0deg)`;
        setShine(s => ({ ...s, opacity: 0 }));
    };
    
    return (
        <div ref={cardRef} className={`tilt-card ${className}`} style={style} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
            <div className="tilt-content">
                {children}
            </div>
            <div className="tilt-shine" style={{ background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255,255,255,1) 0%, transparent 60%)`, opacity: shine.opacity }} />
        </div>
    );
}

function RippleButton({ children, onClick, className = '' }) {
    const [ripples, setRipples] = useState([]);
    const handleClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();
        setRipples(prev => [...prev, { x, y, id }]);
        if(onClick) onClick(e);
        setTimeout(() => setRipples(rs => rs.filter(r => r.id !== id)), 400);
    };
    return (
        <div className="pal-btn-wrap">
            <button className={className} onClick={handleClick}>
                {children}
            </button>
            {ripples.map(r => (
                <div key={r.id} className="ripple-circle" style={{left: r.x - 20, top: r.y - 20, width: 40, height: 40}} />
            ))}
        </div>
    );
}

function ConfettiOverlay({ trigger }) {
    const canvasRef = useRef(null);
    const triggeredRef = useRef(false);
    
    useEffect(() => {
        if (!trigger || triggeredRef.current) return;
        const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (isReduced) return;
        
        triggeredRef.current = true;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const colors = ['#22d3a5', '#f87171', '#fbbf24', '#67e8f9', '#a78bfa'];
        let particles = [];
        for(let i=0; i<120; i++) {
            particles.push({
                x: canvas.width/2 + (Math.random()-0.5)*200,
                y: canvas.height/2 - 100 - Math.random()*200,
                vx: (Math.random()-0.5)*15,
                vy: Math.random()*-15 - 5,
                color: colors[Math.floor(Math.random()*colors.length)],
                size: Math.random()*6 + 4,
                rot: Math.random()*Math.PI*2,
                rotSpeed: (Math.random()-0.5)*0.2
            });
        }
        
        let startTime = Date.now();
        let frame;
        
        const step = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let timePassed = Date.now() - startTime;
            if (timePassed > 3000) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                return;
            }
            
            for(let i=0; i<particles.length; i++) {
                let p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.5; // gravity
                p.rot += p.rotSpeed;
                
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                ctx.restore();
            }
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [trigger]);
    
    return <canvas ref={canvasRef} style={{position: 'fixed', top:0, left:0, zIndex: 999, pointerEvents: 'none'}} />;
}

function AnimatedRing({ perc }) {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const [offset, setOffset] = useState(circumference);
    
    useEffect(() => {
        const timer = setTimeout(() => {
            setOffset(circumference * (1 - (perc || 0) / 100));
        }, 50);
        return () => clearTimeout(timer);
    }, [perc, circumference]);
    
    let color = '#f87171';
    if (perc >= 75) color = '#22d3a5';
    else if (perc >= 50) color = '#fbbf24';
    
    return (
        <div style={{position:'relative', width: 48, height: 48, flexShrink: 0}}>
            <svg width="48" height="48" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r={radius} fill="none" stroke="#1e293b" strokeWidth="4" />
                <circle 
                    cx="24" cy="24" r={radius} fill="none" stroke={color} strokeWidth="4" 
                    strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} 
                    style={{transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)', transform: 'rotate(-90deg)', transformOrigin: '50% 50%'}}
                />
            </svg>
            <div style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'10px', color}}>
                <AnimatedNumber value={perc} />%
            </div>
        </div>
    );
}

function RiskMeter({ perc }) {
    const rot = (perc/100)*180 - 90;
    
    let statusText = "SAFE";
    let statusColor = "#22d3a5";
    if (perc < 50) { statusText = "DANGER ZONE"; statusColor = "#f87171"; }
    else if (perc < 75) { statusText = "AT RISK"; statusColor = "#fbbf24"; }
    
    return (
        <TiltCard className="card text-center" style={{padding: '2rem'}}>
            <h3 className="heading-font mb-2">OVERALL RISK METER</h3>
            <div style={{position: 'relative', width: 240, height: 120, margin: '0 auto', overflow: 'hidden'}}>
                <svg width="240" height="120" viewBox="0 0 240 120">
                    <path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="#1e293b" strokeWidth="20" strokeLinecap="round" />
                    <path d="M 20 120 A 100 100 0 0 1 120 20" fill="none" stroke="#f87171" strokeWidth="20" strokeDasharray="157 157" strokeDashoffset="0" />
                    <path d="M 120 20 A 100 100 0 0 1 190.7 49.3" fill="none" stroke="#fbbf24" strokeWidth="20" strokeDasharray="78.5 157" strokeDashoffset="0" />
                    <path d="M 190.7 49.3 A 100 100 0 0 1 220 120" fill="none" stroke="#22d3a5" strokeWidth="20" />
                    <g style={{transition: 'transform 1s cubic-bezier(0.4,0,0.2,1)', transform: `rotate(${rot}deg)`, transformOrigin: '120px 120px'}}>
                        <line x1="120" y1="120" x2="120" y2="35" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="120" cy="120" r="8" fill="#f8fafc" />
                    </g>
                </svg>
                <div style={{position:'absolute', bottom: '10px', left:0, width:'100%', textAlign:'center', fontFamily:'var(--font-heading)', fontSize: '2rem', fontWeight: 800}}>
                    <AnimatedNumber value={perc} />%
                </div>
            </div>
            <div style={{color: statusColor, fontWeight: 'bold', letterSpacing: '2px', marginTop: '1rem'}}>{statusText}</div>
        </TiltCard>
    );
}

function CalendarHeatmap({ dailyLog }) {
    const endStr = getTodayDateStr();
    const endDate = new Date(endStr);
    
    let cursor = new Date(endDate);
    cursor.setDate(cursor.getDate() - (12 * 7)); 
    
    while(cursor.getDay() !== 1) {
        cursor.setDate(cursor.getDate() - 1);
    }
    
    let currentWeek = [];
    const gridCols = [];
    const months = [];
    let lastMonth = -1;
    
    let iterDate = new Date(cursor);
    while (iterDate <= endDate || iterDate.getDay() !== 1) { 
        const dateStr = iterDate.toISOString().split('T')[0];
        const dayIdx = iterDate.getDay(); 
        
        if (dayIdx >= 1 && dayIdx <= 6) { 
            const rec = dailyLog[dateStr];
            let cellColor = '#0f1623';
            let glow = '';
            let val = '-';
            
            if (rec && Object.keys(rec).length > 0) {
                const values = Object.values(rec);
                const pVals = values.filter(v => v === 'P' || v === 'L').length; 
                const perc = Math.round((pVals / values.length)*100);
                val = perc;
                if (perc === 0) cellColor = 'rgba(248,113,113,0.3)';
                else if (perc < 50) cellColor = 'rgba(248,113,113,0.6)';
                else if (perc < 75) cellColor = 'rgba(251,191,36,0.6)';
                else if (perc < 100) cellColor = 'rgba(34,211,165,0.6)';
                else {
                    cellColor = '#22d3a5';
                    glow = '0 0 6px rgba(34,211,165,0.5)';
                }
            }
            
            currentWeek.push({ date: dateStr, color: cellColor, glow, val });
        }
        
        if (dayIdx === 0) { 
            gridCols.push(currentWeek);
            currentWeek = [];
            
            const m = iterDate.getMonth();
            if (m !== lastMonth && gridCols.length > 0) {
                months.push({ text: iterDate.toLocaleString('default', { month: 'short' }), col: gridCols.length - 1 });
                lastMonth = m;
            }
        }
        
        iterDate.setDate(iterDate.getDate() + 1);
        if (iterDate > endDate && currentWeek.length === 0) break;
    }
    if (currentWeek.length > 0) gridCols.push(currentWeek); 

    const dayLabels = ['M','T','W','T','F','S'];

    return (
        <TiltCard className="card">
            <h3 className="heading-font mb-2">ATTENDANCE CALENDAR</h3>
            <div style={{position: 'relative', paddingLeft: '20px', paddingTop: '18px'}}>
                {months.map((m, i) => (
                    <div key={i} style={{position: 'absolute', top: 0, left: 20 + m.col * 17, fontSize: '0.7rem', color: 'var(--text-muted)'}}>
                        {m.text}
                    </div>
                ))}
                
                <div style={{position: 'absolute', top: 18, left: 0, display: 'flex', flexDirection: 'column', gap: '3px'}}>
                    {dayLabels.map((d, i) => <div key={i} className="calendar-day-label">{d}</div>)}
                </div>
                
                <div className="calendar-heatmap">
                    {gridCols.map((col, cIdx) => (
                        <div key={cIdx} className="calendar-col">
                            {col.map(cell => (
                                <div key={cell.date} className="calendar-cell" style={{background: cell.color, boxShadow: cell.glow}}>
                                    <div className="tooltip-content">{cell.date}: {cell.val}{cell.val !== '-' ? '%' : ''}</div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </TiltCard>
    );
}

// ----------------------------------------------------------------------
function useAuroraBackground(canvasRef) {
    useEffect(() => {
        const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (isReduced) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        let frameId;
        let time = 0;
        
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();
        
        const colors = [
            'rgba(34,211,165,0.07)',
            'rgba(103,232,249,0.06)',
            'rgba(167,139,250,0.05)',
            'rgba(34,211,165,0.04)',
            'rgba(251,191,36,0.03)'
        ];
        const speeds = [0.0003, 0.0004, 0.0002, 0.0005, 0.00035];
        
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            time += 16;
            
            for (let i = 0; i < 5; i++) {
                ctx.fillStyle = colors[i];
                ctx.beginPath();
                
                const baseY = canvas.height * (0.2 + i * 0.08);
                ctx.moveTo(0, canvas.height);
                ctx.lineTo(0, baseY);
                
                const segments = 4;
                const segWidth = canvas.width / segments;
                
                for (let j = 0; j < segments; j++) {
                    const x1 = j * segWidth;
                    const x2 = (j + 1) * segWidth;
                    
                    const cp1x = x1 + segWidth / 2;
                    const cp1y = baseY + Math.sin(time * speeds[i] + j + i) * 80;
                    
                    const cp2x = x2 - segWidth / 2;
                    const cp2y = baseY + Math.cos(time * speeds[i] + j + i + 1) * 80;
                    
                    const endY = baseY + Math.sin(time * speeds[i] + (j + 1) + i) * 80;
                    
                    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, endY);
                }
                
                ctx.lineTo(canvas.width, canvas.height);
                ctx.closePath();
                ctx.fill();
            }
            frameId = requestAnimationFrame(draw);
        };
        frameId = requestAnimationFrame(draw);
        
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(frameId);
        };
    }, [canvasRef]);
}

function useNeuralBackground(canvasRef) {
    const nodesRef = useRef([]);
    const pulsesRef = useRef([]);
    const flashRef = useRef({ nodeIndex: -1, startTime: 0, duration: 600 });
    const lastPulseTimeRef = useRef(0);
    const lastFlashTimeRef = useRef(0);

    useEffect(() => {
        const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (isReduced) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        let frameId;
        
        const isMobile = window.innerWidth < 768;
        const numNodes = isMobile ? 30 : 55;
        
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            if (nodesRef.current.length === 0) {
                const nodes = [];
                for (let i = 0; i < numNodes; i++) {
                    nodes.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        vx: (Math.random() - 0.5) * 0.5,
                        vy: (Math.random() - 0.5) * 0.5,
                        radius: 1.8,
                        pulsePhase: Math.random() * Math.PI * 2,
                        pulseSpeed: 0.02 + Math.random() * 0.02
                    });
                }
                nodesRef.current = nodes;
            }
        };
        window.addEventListener('resize', resize);
        resize();
        
        const draw = (timestamp) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const nodes = nodesRef.current;
            const pulses = pulsesRef.current;
            const flash = flashRef.current;
            
            if (!lastPulseTimeRef.current) lastPulseTimeRef.current = timestamp;
            if (!lastFlashTimeRef.current) lastFlashTimeRef.current = timestamp;
            
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                n.x += n.vx;
                n.y += n.vy;
                
                if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
                if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
                n.pulsePhase += n.pulseSpeed;
            }
            
            ctx.lineWidth = 0.8;
            const connectedPairs = [];
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < 130) {
                        ctx.strokeStyle = `rgba(34,211,165,${(1 - dist / 130) * 0.15})`;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.stroke();
                        connectedPairs.push([i, j]);
                    }
                }
            }
            
            if (!isMobile && timestamp - lastPulseTimeRef.current > 2500) {
                lastPulseTimeRef.current = timestamp;
                if (connectedPairs.length > 0 && pulses.length < 6) {
                    const pair = connectedPairs[Math.floor(Math.random() * connectedPairs.length)];
                    pulses.push({
                        aIdx: pair[0],
                        bIdx: pair[1],
                        progress: 0,
                        active: true
                    });
                }
            }
            
            if (timestamp - lastFlashTimeRef.current > 4000) {
                lastFlashTimeRef.current = timestamp;
                flash.nodeIndex = Math.floor(Math.random() * nodes.length);
                flash.startTime = timestamp;
                flash.duration = 600;
            }
            
            for (let i = pulses.length - 1; i >= 0; i--) {
                const p = pulses[i];
                p.progress += 0.016;
                
                if (p.progress >= 1) {
                    pulses.splice(i, 1);
                    continue;
                }
                
                const nA = nodes[p.aIdx];
                const nB = nodes[p.bIdx];
                // Failsafe in case aIdx or bIdx are mysteriously out of bounds due to resize
                if (!nA || !nB) {
                    pulses.splice(i, 1);
                    continue;
                }
                const px = nA.x + (nB.x - nA.x) * p.progress;
                const py = nA.y + (nB.y - nA.y) * p.progress;
                
                ctx.save();
                ctx.fillStyle = 'rgba(103,232,249,0.8)';
                ctx.shadowBlur = 8;
                ctx.shadowColor = '#67e8f9';
                ctx.beginPath();
                ctx.arc(px, py, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                const currentRadius = n.radius + Math.sin(n.pulsePhase) * 0.8;
                const opacity = 0.5 + 0.2 * Math.sin(n.pulsePhase);
                
                ctx.save();
                if (flash.nodeIndex === i && timestamp - flash.startTime < flash.duration) {
                    ctx.fillStyle = 'rgba(34,211,165,0.9)';
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = '#22d3a5';
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, n.radius * 3, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillStyle = `rgba(34,211,165,${opacity})`;
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, Math.max(0, currentRadius), 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
            
            frameId = requestAnimationFrame(draw);
        };
        frameId = requestAnimationFrame(draw);
        
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(frameId);
        };
    }, [canvasRef]);
}

function FloatingShapes() {
    const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) return null;

    const shapes = [
        { id: 1, type: 'cube', left: '15%', speed: '25s', delay: '0s', scale: 0.8 },
        { id: 2, type: 'pyramid', left: '85%', speed: '30s', delay: '4s', scale: 1.2 },
        { id: 3, type: 'cube', left: '50%', speed: '35s', delay: '8s', scale: 0.6 },
        { id: 4, type: 'pyramid', left: '25%', speed: '28s', delay: '12s', scale: 1 },
        { id: 5, type: 'cube', left: '75%', speed: '32s', delay: '16s', scale: 0.9 }
    ];

    return (
        <div className="floating-layer">
            {shapes.map(s => (
                <div key={s.id} className={`geo-shape geo-${s.type}`} style={{ left: s.left, animationDuration: s.speed, animationDelay: s.delay, transform: `scale(${s.scale})` }}>
                    {s.type === 'cube' ? (
                        <>
                            <div className="geo-face front"></div>
                            <div className="geo-face back"></div>
                            <div className="geo-face right"></div>
                            <div className="geo-face left"></div>
                            <div className="geo-face top"></div>
                            <div className="geo-face bottom"></div>
                        </>
                    ) : (
                        <>
                            <div className="geo-pyr-face front"></div>
                            <div className="geo-pyr-face back"></div>
                            <div className="geo-pyr-face right"></div>
                            <div className="geo-pyr-face left"></div>
                            <div className="geo-pyr-face bottom"></div>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}

export default function App() {
  // styles loaded via index.css import in main.jsx

  const [user, setUser] = useState(null);
  const [data, setData] = useState(DEFAULT_DATA);
  const [activeTab, setActiveTab] = useState('setup');
  const [syncStatus, setSyncStatus] = useState('offline');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [undoStack, setUndoStack] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const saveTimeout = useRef(null);
  const isFirstLoad = useRef(true);
  
  const auroraRef = useRef(null);
  const neuralRef = useRef(null);
  useAuroraBackground(auroraRef);
  useNeuralBackground(neuralRef);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast.visible) {
      const t = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2500);
      return () => clearTimeout(t);
    }
  }, [toast.visible]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ visible: true, message, type });
  }, []);

  // Auth Effect
  useEffect(() => {
    // Bypass authentication completely -- default to a local user
    setUser({ id: 1, name: 'Local Dev', email: 'dev@local.com', role: 'student' });
    setIsLoading(false);
  }, []);

  // Load Data Effect
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const local = localStorage.getItem('attendr_v2');
      let loadedData = local ? JSON.parse(local) : DEFAULT_DATA;
      
      if (user && supabase) {
        try {
          const { data: remoteData } = await supabase
            .from('attendance_data')
            .select('*')
            .eq('user_id', user.id)
            .single();
            
          if (remoteData) {
            loadedData = {
              subjects: remoteData.subjects || [],
              timetable: remoteData.timetable || DEFAULT_DATA.timetable,
              attendance: remoteData.attendance || {},
              dailyLog: remoteData.dailyLog || remoteData.attendance || {},
              phase: remoteData.phase || 'setup',
              lectureSettings: remoteData.lectureSettings || DEFAULT_DATA.lectureSettings
            };
          }
          setSyncStatus('synced');
        } catch (err) {
          console.warn('Failed to load remote data, using local fallback if available.', err);
          setSyncStatus('offline');
        }
      } else {
        setSyncStatus('offline');
      }

      if (loadedData.timetable) {
        Object.keys(loadedData.timetable).forEach(day => {
            loadedData.timetable[day] = loadedData.timetable[day].map((item, idx) => {
                if (typeof item === 'string') {
                    return {
                        id: 'legacy_' + day + '_' + idx,
                        subject: item,
                        start: '09:00',
                        duration: loadedData.lectureSettings?.durationMinutes || 60
                    };
                }
                return item;
            });
            loadedData.timetable[day].sort((a,b) => (a.start || '09:00').localeCompare(b.start || '09:00'));
        });
      }

      if (loadedData.subjects && loadedData.subjects.length > 0) {
          loadedData.phase = 'ready';
      }

      setData(loadedData);
      setActiveTab(loadedData.phase === 'ready' ? 'tracker' : 'setup');
      isFirstLoad.current = false;
      setIsLoading(false);
    };

    if (user || !supabase) { // If no supabase, load local directly
        loadData();
    }
  }, [user]);

  // Save Data Effect
  useEffect(() => {
    if (isFirstLoad.current) return;
    
    // Instant local save
    localStorage.setItem('attendr_v2', JSON.stringify(data));
    
    if (user && supabase) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSyncStatus('syncing');
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      
      saveTimeout.current = setTimeout(async () => {
        try {
          // Check if row exists
          const { data: existing } = await supabase.from('attendance_data').select('id').eq('user_id', user.id).single();
          const payload = {
              user_id: user.id,
              subjects: data.subjects,
              timetable: data.timetable,
              attendance: data.attendance,
              dailyLog: data.dailyLog || {},
              phase: data.phase,
              lectureSettings: data.lectureSettings || DEFAULT_DATA.lectureSettings,
              updated_at: new Date().toISOString()
          };
          
          if (existing) {
              await supabase.from('attendance_data').update(payload).eq('id', existing.id);
          } else {
              await supabase.from('attendance_data').insert([payload]);
          }
          setSyncStatus('synced');
        } catch (err) {
          console.error('Sync failed', err);
          setSyncStatus('offline');
          showToast('Cloud sync failed - working offline', 'error');
        }
      }, 1000);
    }
  }, [data, user, showToast]); // Dependency array updated to include all data to ensure any change triggers a sync

  // initAuth is obsolete, removed unused err variables if they existed in prior revisions

  const handleLogin = async () => {
    if (!supabase) {
        showToast('Supabase not configured. App will run offline locally.', 'info');
        setIsLoading(false);
        return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setData(DEFAULT_DATA);
    localStorage.removeItem('attendr_v2');
  };

  const handleReset = useCallback(() => {
    if (window.confirm("Are you sure? This will wipe all data!")) {
      const reset = async () => {
        if (user && supabase) {
          await supabase.from('attendance_data').delete().eq('user_id', user.id);
        }
        localStorage.removeItem('attendr_v2');
        setData(DEFAULT_DATA);
        setActiveTab('setup');
        setUndoStack([]);
        showToast('All data reset', 'info');
      };
      reset();
    }
  }, [user, showToast]);

  const pushUndo = (newStateContent) => {
    setUndoStack(prev => {
        const st = [...prev, JSON.stringify(data)];
        if (st.length > 20) return st.slice(st.length - 20);
        return st;
    });
    setData(newStateContent);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = JSON.parse(undoStack[undoStack.length - 1]);
    setData(previous);
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    showToast('Undo successful', 'success');
  };

  if (!user && supabase && SUPABASE_URL && SUPABASE_KEY && isLoading === false) {
    return (
      <div className="login-container">
        <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
          <canvas ref={auroraRef} id="aurora-canvas" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
          <canvas ref={neuralRef} id="neural-canvas" style={{ position:'absolute', inset:0, width:'100%', height:'100%', zIndex:1 }} />
          <FloatingShapes />
        </div>
        <div className="glow-tl"></div><div className="glow-br"></div>
        <div className="login-box">
          <div className="heading-font title mb-2 text-teal" style={{ fontSize: '2rem' }}>MARKD</div>
          <p className="text-muted mb-2">Industrial grade attendance tracking.</p>
          <button type="button" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} onClick={handleLogin}>
            <Calendar size={20} /> Continue with Google
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
      return <div className="login-container"><div className="heading-font title text-teal" style={{animation: 'pulse 1s infinite'}}>LOAD DATA //_</div></div>;
  }

  return (
    <div className="app-container">
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
        <canvas ref={auroraRef} id="aurora-canvas" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
        <canvas ref={neuralRef} id="neural-canvas" style={{ position:'absolute', inset:0, width:'100%', height:'100%', zIndex:1 }} />
        <FloatingShapes />
      </div>
      <div className="glow-tl"></div><div className="glow-br"></div>
      
      <header className="header">
        <div>
            <div className="heading-font title">MARKD <span className="title-accent">//</span></div>
            <div className="sync-indicator mt-1">
                <span className={`sync-dot ${syncStatus}`}></span>
                {syncStatus === 'synced' ? 'SYNCED TO CLOUD' : syncStatus === 'syncing' ? 'SYNCING...' : 'OFFLINE MODE'}
            </div>
        </div>
        <div className="user-sect">
            {(user || supabase === null) && (
              <button className="btn btn-danger btn-outline" onClick={handleReset} title="Hard Reset">
                <Settings size={16} /> RESET
              </button>
            )}
            {user && (
                <>
                <div className="avatar">
                    {user.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt="avatar" /> : <div className="text-muted">{user.email?.charAt(0).toUpperCase()}</div>}
                </div>
                <button className="btn btn-outline" style={{borderColor: 'transparent', color: 'var(--text-muted)'}} onClick={handleLogout}><LogOut size={18}/></button>
                </>
            )}
        </div>
      </header>

      <div className="nav-tabs">
        <button className={activeTab === 'setup' ? 'active' : ''} onClick={() => setActiveTab('setup')}><Settings size={16} /> SETUP</button>
        <button className={activeTab === 'tracker' ? 'active' : ''} disabled={data.phase === 'setup'} onClick={() => setActiveTab('tracker')}><CheckSquare size={16} /> TRACKER</button>
        <button className={activeTab === 'analytics' ? 'active' : ''} disabled={data.phase === 'setup'} onClick={() => setActiveTab('analytics')}><Activity size={16} /> ANALYTICS</button>
      </div>

      <main className="main-content">
        {activeTab === 'setup' && <SetupTab data={data} setData={setData} setActiveTab={setActiveTab} />}
        {activeTab === 'tracker' && <TrackerTab data={data} pushUndo={pushUndo} handleUndo={handleUndo} undoStack={undoStack} showToast={showToast} />}
        {activeTab === 'analytics' && <AnalyticsTab data={data} />}
      </main>

      <div className={`toast ${toast.visible ? 'visible' : ''} ${toast.type}`}>
        {toast.type === 'success' ? <CheckCircle size={20} /> : toast.type === 'error' ? <AlertCircle size={20} /> : <Circle size={20} />}
        {toast.message}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SETUP TAB
// ----------------------------------------------------------------------
function SetupTab({ data, setData, setActiveTab }) {
  const [subInput, setSubInput] = useState('');
  const [classForm, setClassForm] = useState({ day: null, subject: '', start: '09:00', duration: data.lectureSettings?.durationMinutes || 60 });

  const addSubject = () => {
    const val = subInput.trim().toUpperCase();
    if (val && !data.subjects.includes(val)) {
        setData({ ...data, subjects: [...data.subjects, val] });
        setSubInput('');
    }
  };

  const removeSubject = (sub) => {
    const newSubjects = data.subjects.filter(s => s !== sub);
    const newTimetable = { ...data.timetable };
    Object.keys(newTimetable).forEach(day => {
        newTimetable[day] = newTimetable[day].filter(cls => (typeof cls === 'string' ? cls : cls.subject) !== sub);
    });
    // We do not cleanup attendance history here so old data remains in analytics
    setData({ ...data, subjects: newSubjects, timetable: newTimetable });
  };

  const openClassForm = (day) => {
    setClassForm({ day, subject: data.subjects[0] || '', start: '09:00', duration: data.lectureSettings?.durationMinutes || 60 });
  };

  const saveClass = (day) => {
    if (!classForm.subject) return alert('Select a subject');
    const newClass = {
        id: Math.random().toString(36).substr(2, 9),
        subject: classForm.subject,
        start: classForm.start,
        duration: parseInt(classForm.duration) || 60
    };
    const dayClasses = [...data.timetable[day], newClass].sort((a,b) => a.start.localeCompare(b.start));
    setData({...data, timetable: {...data.timetable, [day]: dayClasses}});
    setClassForm({ day: null, subject: '', start: '09:00', duration: 60 });
  };

  const removeClass = (day, classId) => {
    const dayClasses = data.timetable[day].filter(c => c.id !== classId);
    setData({...data, timetable: {...data.timetable, [day]: dayClasses}});
  };

  const finishSetup = () => {
    if (data.subjects.length === 0) return alert('Add at least one subject');
    setData({ ...data, phase: 'ready' });
    setActiveTab('tracker');
  };

  return (
    <div className="card">
        <h2 className="heading-font mb-2">1. CONFIGURE SUBJECTS</h2>
        <div style={{display:'flex', gap:'0.5rem', marginBottom:'1rem'}}>
            <input 
                className="input-field" 
                style={{marginBottom:0}}
                placeholder="E.g. MATH 101" 
                value={subInput} 
                onChange={e => setSubInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && addSubject()} 
            />
            <button className="btn btn-primary" onClick={addSubject}>ADD</button>
        </div>
        <div className="tag-list mb-2">
            {data.subjects.map(s => (
                <div key={s} className="tag">
                    {s} <button onClick={() => removeSubject(s)}><Trash2 size={14}/></button>
                </div>
            ))}
            {data.subjects.length === 0 && <span className="text-muted">No subjects added.</span>}
        </div>

        {data.subjects.length > 0 && (
            <>
            <h2 className="heading-font mb-2 mt-2">2. CLASS SETTINGS</h2>
            <div className="card" style={{padding: '1.5rem'}}>
                <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                    <div style={{flex:1}}>
                        <div className="heading-font">Default Lecture Duration</div>
                        <div className="text-muted" style={{fontSize:'0.85rem'}}>Used to calculate total hours spent in class.</div>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                        <input 
                            type="number" 
                            className="input-field" 
                            style={{width: '80px', marginBottom: 0, textAlign: 'center'}}
                            value={data.lectureSettings?.durationMinutes || 60} 
                            onChange={e => setData({...data, lectureSettings: {...data.lectureSettings, durationMinutes: parseInt(e.target.value) || 0}})} 
                            min="1"
                        />
                        <span className="text-muted">mins</span>
                    </div>
                </div>
            </div>

            <h2 className="heading-font mb-2 mt-2">3. WEEKLY TIMETABLE</h2>
            <div className="grid-2">
                {DAYS.map(day => (
                    <div key={day} className="card" style={{padding: '1rem', marginBottom:0}}>
                        <div className="flex-between mb-1">
                            <h3 className="heading-font text-teal">{day}</h3>
                            <button className="btn btn-outline" style={{padding: '0.3rem 0.6rem', fontSize: '0.8rem'}} onClick={() => openClassForm(day)}>+ CLASS</button>
                        </div>
                        
                        {data.timetable[day].length === 0 ? (
                            <div className="text-muted text-center" style={{padding: '1.5rem', fontSize: '0.85rem'}}>No classes scheduled.</div>
                        ) : (
                            <div className="mt-1">
                                {data.timetable[day].map(cls => {
                                    const [h, m] = (cls.start || '09:00').split(':').map(Number);
                                    const d = parseInt(cls.duration || 60);
                                    const endTotal = h * 60 + m + d;
                                    const endH = Math.floor(endTotal / 60) % 24;
                                    const endM = endTotal % 60;
                                    const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                                    
                                    return (
                                        <div key={cls.id} className="class-item">
                                            <div>
                                                <div className="class-item-time">{cls.start} - {endStr}</div>
                                                <div className="class-item-sub text-main">{cls.subject}</div>
                                            </div>
                                            <button className="btn btn-outline" style={{padding: '0.4rem', color: 'var(--red)', border: 'none'}} onClick={() => removeClass(day, cls.id)}><Trash2 size={16}/></button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {classForm.day === day && (
                            <div className="class-form">
                                <div style={{display:'flex', flexDirection:'column', gap:'0.4rem', marginBottom:'0.75rem'}}>
                                    <label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Subject</label>
                                    <select className="input-field" style={{marginBottom: 0, padding:'0.6rem'}} value={classForm.subject} onChange={e => setClassForm({...classForm, subject: e.target.value})}>
                                        <option value="" disabled>Select subject...</option>
                                        {data.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="grid-2" style={{gap: '0.5rem', marginBottom:'1rem'}}>
                                    <div style={{display:'flex', flexDirection:'column', gap:'0.4rem'}}>
                                        <label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Start Time</label>
                                        <input type="time" className="input-field" style={{marginBottom: 0, padding:'0.6rem'}} value={classForm.start} onChange={e => setClassForm({...classForm, start: e.target.value})} />
                                    </div>
                                    <div style={{display:'flex', flexDirection:'column', gap:'0.4rem'}}>
                                        <label style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Duration (mins)</label>
                                        <input type="number" className="input-field" style={{marginBottom: 0, padding:'0.6rem'}} value={classForm.duration} onChange={e => setClassForm({...classForm, duration: e.target.value})} />
                                    </div>
                                </div>
                                <div style={{display:'flex', gap:'0.5rem'}}>
                                    <button className="btn btn-primary" style={{flex: 1, padding: '0.5rem'}} onClick={() => saveClass(day)}>SAVE</button>
                                    <button className="btn btn-outline" style={{flex: 1, padding: '0.5rem'}} onClick={() => setClassForm({ day: null, subject: '', start: '09:00', duration: 60 })}>CANCEL</button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            <div className="mt-2 text-center" style={{paddingTop: '2rem', borderTop: '1px solid var(--border)'}}>
                <button className="btn btn-primary" style={{padding: '1rem 3rem', fontSize:'1.2rem'}} onClick={finishSetup}>
                    <Play size={20} /> START TRACKING
                </button>
            </div>
            </>
        )}
    </div>
  );
}

// ----------------------------------------------------------------------
// TRACKER TAB
// ----------------------------------------------------------------------
function TrackerTab({ data, pushUndo, handleUndo, undoStack, showToast }) {
    const todayStr = getTodayDateStr();
    
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const selectedDayOfWeek = getDayOfWeek(selectedDate);
    const subjectsToday = data.timetable[selectedDayOfWeek] || [];

    // Allow selecting past 7 days easily 
    const recentDays = getLast7Days().map(d => ({ date: d, dayName: getDayOfWeek(d) }));

    const getAttendance = (date, subject) => {
        return data.attendance[date]?.[subject] || null;
    };

    const markSingle = (subject, status) => {
        const currentData = JSON.parse(JSON.stringify(data));
        if (!currentData.attendance[selectedDate]) currentData.attendance[selectedDate] = {};
        if (!currentData.dailyLog) currentData.dailyLog = {};
        if (!currentData.dailyLog[selectedDate]) currentData.dailyLog[selectedDate] = {};
        
        // If clicking same status, clear it
        if (currentData.attendance[selectedDate][subject] === status) {
            delete currentData.attendance[selectedDate][subject];
            delete currentData.dailyLog[selectedDate][subject];
        } else {
            currentData.attendance[selectedDate][subject] = status;
            currentData.dailyLog[selectedDate][subject] = status;
        }
        pushUndo(currentData);
        showToast(`Marked ${subject} ${status}`, 'info');
    };

    const markAllPresent = () => {
        const currentData = JSON.parse(JSON.stringify(data));
        if (!currentData.attendance[selectedDate]) currentData.attendance[selectedDate] = {};
        if (!currentData.dailyLog) currentData.dailyLog = {};
        if (!currentData.dailyLog[selectedDate]) currentData.dailyLog[selectedDate] = {};
        subjectsToday.forEach(cls => {
            currentData.attendance[selectedDate][cls.subject] = 'P';
            currentData.dailyLog[selectedDate][cls.subject] = 'P';
        });
        pushUndo(currentData);
        showToast('All present marked', 'success');
    };

    const clearDay = () => {
        const currentData = JSON.parse(JSON.stringify(data));
        if (currentData.attendance[selectedDate]) {
            delete currentData.attendance[selectedDate];
        }
        if (currentData.dailyLog && currentData.dailyLog[selectedDate]) {
            delete currentData.dailyLog[selectedDate];
        }
        pushUndo(currentData);
        showToast('Cleared day', 'info');
    };

    // Calculate Streak (consecutive days tracking at least 1 subject)
    const calculateStreak = () => {
        let streak = 0;
        let checkDate = new Date();
        checkDate.setMinutes(checkDate.getMinutes() - checkDate.getTimezoneOffset());
        
        while(true) {
            const dStr = checkDate.toISOString().split('T')[0];
            const hasData = data.attendance[dStr] && Object.keys(data.attendance[dStr]).length > 0;
            if (hasData) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                if (dStr === todayStr && streak === 0) {
                     // Check yesterday before breaking if today is empty
                     checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
        }
        return streak;
    };

    let totalSubsToday = subjectsToday.length;
    let presentToday = 0;
    let absentToday = 0;
    
    if (data.attendance[selectedDate]) {
        subjectsToday.forEach(cls => {
            if (data.attendance[selectedDate][cls.subject] === 'P') presentToday++;
            if (data.attendance[selectedDate][cls.subject] === 'A') absentToday++;
        });
    }

    const unassigned = totalSubsToday - presentToday - absentToday;
    const todayPie = [
        { name: 'Present', value: presentToday, color: 'var(--teal)' },
        { name: 'Absent', value: absentToday, color: 'var(--red)' },
        { name: 'Unmarked', value: unassigned, color: 'var(--border)' }
    ].filter(x => x.value > 0);

    const is100Percent = totalSubsToday > 0 && presentToday === totalSubsToday && selectedDate === todayStr;

    return (
        <div>
           <ConfettiOverlay trigger={is100Percent} />
           <div className="stat-grid">
               <TiltCard className="stat-box">
                   <div className="stat-label">Total Today</div>
                   <div className="stat-value"><AnimatedNumber value={totalSubsToday} /></div>
               </TiltCard>
               <TiltCard className="stat-box">
                   <div className="stat-label text-teal">Present</div>
                   <div className="stat-value text-teal"><AnimatedNumber value={presentToday} /></div>
               </TiltCard>
               <TiltCard className="stat-box">
                   <div className="stat-label text-amber" style={{gap: '0.2rem'}}><TrendingUp size={14}/> Streak</div>
                   <div className="stat-value text-amber"><AnimatedNumber value={calculateStreak()} /> 🔥</div>
               </TiltCard>
           </div>

           <div className="card" style={{padding: '0'}}>
                <div className="day-tabs">
                    {recentDays.map(rd => (
                        <div key={rd.date} 
                            className={`day-tab ${selectedDate === rd.date ? 'active' : ''}`}
                            onClick={() => setSelectedDate(rd.date)}
                        >
                            {rd.date === todayStr ? 'TODAY' : rd.dayName} <br/>
                            <span style={{fontSize:'0.7rem', fontWeight:'normal'}}>{rd.date.slice(5)}</span>
                        </div>
                    ))}
                </div>

                <div style={{padding: '0 1.5rem 1.5rem 1.5rem'}}>
                    <div className="flex-between mb-2">
                        <div style={{display:'flex', gap:'0.5rem'}}>
                            <button className="btn btn-primary" onClick={markAllPresent} disabled={subjectsToday.length === 0}>✓ ALL PRESENT</button>
                            <button className="btn btn-outline" onClick={clearDay} disabled={subjectsToday.length === 0}>CLEAR</button>
                        </div>
                        <button className="btn btn-outline" onClick={handleUndo} disabled={undoStack.length === 0}>
                            <RotateCcw size={16}/> UNDO ({undoStack.length})
                        </button>
                    </div>

                    {subjectsToday.length === 0 ? (
                        <div className="text-center text-muted py-2" style={{padding: '3rem 0'}}>
                            No subjects scheduled for {selectedDayOfWeek}.
                        </div>
                    ) : (
                        <div>
                            {subjectsToday.map(cls => {
                                const status = getAttendance(selectedDate, cls.subject);
                                const [h, m] = (cls.start || '09:00').split(':').map(Number);
                                const d = parseInt(cls.duration || 60);
                                const endTotal = h * 60 + m + d;
                                const endH = Math.floor(endTotal / 60) % 24;
                                const endM = endTotal % 60;
                                const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

                                return (
                                    <div key={cls.id} className="subject-row">
                                        <div>
                                            <div className="text-teal" style={{fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.2rem'}}>{cls.start} - {endStr}</div>
                                            <div className="heading-font" style={{fontSize:'1.1rem'}}>{cls.subject}</div>
                                        </div>
                                        <div className="status-group">
                                            <RippleButton className={`status-btn ${status === 'P' ? 'selected-P' : ''}`} onClick={() => markSingle(cls.subject, 'P')}>P</RippleButton>
                                            <RippleButton className={`status-btn ${status === 'A' ? 'selected-A' : ''}`} onClick={() => markSingle(cls.subject, 'A')}>A</RippleButton>
                                            <RippleButton className={`status-btn ${status === 'L' ? 'selected-L' : ''}`} onClick={() => markSingle(cls.subject, 'L')}>L</RippleButton>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
           </div>

           {subjectsToday.length > 0 && todayPie.length > 0 && todayPie[0].name !== 'Unmarked' && (
               <TiltCard className="card flex-between" style={{gap: '2rem'}}>
                   <div style={{flex: 1}}>
                        <h3 className="heading-font mb-1">TODAY'S BREAKDOWN</h3>
                        <p className="text-muted">Visual summary of your marked attendance for {selectedDate}.</p>
                   </div>
                   <div style={{width: 150, height: 150}}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={todayPie} dataKey="value" innerRadius={40} outerRadius={60} stroke="none">
                                    {todayPie.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                </Pie>
                                <RechartsTooltip contentStyle={{background: 'var(--card)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)'}} />
                            </PieChart>
                        </ResponsiveContainer>
                   </div>
               </TiltCard>
           )}
        </div>
    );
}

// ----------------------------------------------------------------------
// ANALYTICS TAB
// ----------------------------------------------------------------------
function AnalyticsTab({ data }) {
    // Analytics calculations
    const dates = Object.keys(data.attendance).sort();
    let totalClasses = 0;
    let totalPresent = 0;

    const subStats = {};
    data.subjects.forEach(s => subStats[s] = { P: 0, A: 0, L: 0, total: 0 });

    dates.forEach(d => {
        Object.entries(data.attendance[d]).forEach(([sub, status]) => {
            if(subStats[sub]) {
                subStats[sub][status]++;
                subStats[sub].total++;
                totalClasses++;
                if(status === 'P' || status === 'L') totalPresent++; // Treat Late as present for %? Let's say P is present. 
                // Wait, typically L is counted as half or just let's log them separately.
            }
        });
    });

    const overallPerc = totalClasses === 0 ? 0 : Math.round((totalPresent / totalClasses) * 100);

    // Heatmap Data (Last 30 Days)
    const heatmapDays = [];
    const _d = new Date();
    for(let i=29; i>=0; i--) {
        const d2 = new Date();
        d2.setDate(_d.getDate() - i);
        d2.setMinutes(d2.getMinutes() - d2.getTimezoneOffset());
        const dStr = d2.toISOString().split('T')[0];
        const dayRecord = data.attendance[dStr] || {};
        const values = Object.values(dayRecord);
        const dayTotal = values.length;
        const dayP = values.filter(v => v==='P' || v==='L').length;
        const perc = dayTotal === 0 ? null : (dayP / dayTotal);
        
        let colorClass = 'cell-grey';
        if (perc !== null) {
            if (perc >= 0.75) colorClass = 'cell-green';
            else if (perc >= 0.5) colorClass = 'cell-yellow';
            else colorClass = 'cell-red';
        }
        heatmapDays.push({ date: dStr, perc: perc !== null ? Math.round(perc*100) : '-', colorClass });
    }

    // Chart Data (Last 7 Days Bar)
    const chartData = getLast7Days().reverse().map(d => {
        const rec = data.attendance[d] || {};
        const P = Object.values(rec).filter(v=>v==='P').length;
        const A = Object.values(rec).filter(v=>v==='A').length;
        const L = Object.values(rec).filter(v=>v==='L').length;
        return { name: d.slice(5), Present: P, Absent: A, Late: L };
    });

    return (
        <div>
            <div className="stat-grid">
                <TiltCard className="stat-box">
                    <div className="stat-label">Overall %</div>
                    <div className="stat-value" style={{color: overallPerc >= 75 ? 'var(--teal)' : 'var(--red)'}}>
                        <AnimatedNumber value={overallPerc} />%
                    </div>
                </TiltCard>
                <TiltCard className="stat-box">
                    <div className="stat-label">Days Tracked</div>
                    <div className="stat-value"><AnimatedNumber value={dates.length} /></div>
                </TiltCard>
                <TiltCard className="stat-box">
                    <div className="stat-label">Subjects</div>
                    <div className="stat-value"><AnimatedNumber value={data.subjects.length} /></div>
                </TiltCard>
            </div>

            <CalendarHeatmap dailyLog={data.dailyLog || data.attendance} />
            
            <RiskMeter perc={overallPerc} />

            <TiltCard className="card">
                <h3 className="heading-font mb-2">WEEKLY TREND (LAST 7 DAYS)</h3>
                <div style={{height: 200, width: '100%', marginBottom: '2rem'}}>
                    <ResponsiveContainer>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-main)'}} />
                            <Bar dataKey="Present" stackId="a" fill="var(--teal)" radius={[0,0,0,0]} />
                            <Bar dataKey="Late" stackId="a" fill="var(--amber)" radius={[0,0,0,0]} />
                            <Bar dataKey="Absent" stackId="a" fill="var(--red)" radius={[4,4,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </TiltCard>

            <h2 className="heading-font mb-2" style={{marginTop:'3rem'}}>SUBJECT BREAKDOWN</h2>
            {data.subjects.map(sub => {
                const stats = subStats[sub];
                if (stats.total === 0) return null;
                const perc = Math.round(((stats.P + stats.L) / stats.total) * 100);
                
                let banner = null;
                if (perc >= 75) {
                    const allowedAbsences = Math.floor(stats.P / 0.75) - stats.total;
                    banner = <div className="banner banner-green"><CheckCircle size={16}/> Safe at {perc}%. Can miss {Math.max(0, allowedAbsences)} classes.</div>;
                } else if (perc >= 50) {
                    const needed = Math.ceil(((0.75 * stats.total) - stats.P) / 0.25);
                    banner = <div className="banner banner-red"><AlertCircle size={16}/> Below 75%. Attend {needed} more classes to fix.</div>;
                } else {
                    const needed = Math.ceil(((0.75 * stats.total) - stats.P) / 0.25);
                    banner = <div className="banner banner-red"><AlertCircle size={16}/> Critical below 75%. Attend {needed} more classes to fix.</div>;
                }

                return (
                    <TiltCard key={sub} className="card flex-between" style={{alignItems: 'center', gap: '1.5rem'}}>
                        <div style={{flex: 1}}>
                            <div className="progress-header" style={{alignItems: 'center'}}>
                                <span className="text-teal" style={{fontSize: '1.2rem'}}>{sub}</span>
                            </div>
                            <div className="text-muted" style={{fontSize:'0.85rem', marginBottom:'0.5rem'}}>
                                {stats.P} Present · {stats.A} Absent · {stats.L} Late · {stats.total} Total
                            </div>
                            {banner}
                        </div>
                        <AnimatedRing perc={perc} />
                    </TiltCard>
                );
            })}
        </div>
    );
}
