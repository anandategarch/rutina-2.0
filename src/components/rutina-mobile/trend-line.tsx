'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { animate } from 'animejs'
import { TrendingUp } from 'lucide-react'

import { DAYS, FOCUS } from './store'

/* ===== Geometri grafik (deterministik) ===== */

const W = 320
const H = 110
const PAD_X = 18
const TOP = 18
const BOTTOM = 96

const POINTS = FOCUS.map((f, i) => ({
  x: PAD_X + (i * (W - PAD_X * 2)) / (FOCUS.length - 1),
  y: BOTTOM - (f / 2.6) * (BOTTOM - TOP),
}))

/** Path Catmull-Rom → Bezier yang melewati semua titik. */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}

const LINE_PATH = smoothPath(POINTS)
const AREA_PATH = `${LINE_PATH} L ${POINTS[POINTS.length - 1].x},${BOTTOM} L ${POINTS[0].x},${BOTTOM} Z`

export default function TrendLine() {
  const svgRef = useRef<SVGSVGElement>(null)
  const lineRef = useRef<SVGPathElement>(null)
  const lineInView = useInView(svgRef, { once: true, margin: '-40px' })

  // anime.js — garis digambar (stroke draw-in) saat terlihat
  useEffect(() => {
    if (!lineInView || !lineRef.current) return
    const el = lineRef.current
    const len = el.getTotalLength()
    el.style.strokeDasharray = `${len}`
    el.style.strokeDashoffset = `${len}`
    const anim = animate(el, {
      strokeDashoffset: 0,
      duration: 1100,
      ease: 'inOutQuad',
    })
    return () => {
      anim.revert()
    }
  }, [lineInView])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-24px' }}
      transition={{ duration: 0.5, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[16px] border border-[#F5F3EE]/10 bg-[#4A3B32] p-5"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/60">
            Tren Fokus
          </p>
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-[40px] font-semibold leading-none tracking-tight text-[#F5F3EE]">
              2,1
            </span>
            <span className="text-sm font-medium text-[#F5F3EE]/55">
              jam / hari rata-rata
            </span>
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#749B58]/20 px-2.5 py-1 text-[11px] font-bold text-[#A3C489]">
          <TrendingUp className="h-3.5 w-3.5" />
          +12%
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 w-full"
        role="img"
        aria-label="Grafik garis waktu fokus tujuh hari terakhir, tren naik"
      >
        <defs>
          <linearGradient id="focusGradDark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A3C489" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#A3C489" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={AREA_PATH}
          fill="url(#focusGradDark)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-24px' }}
          transition={{ duration: 0.6, delay: 0.55 }}
        />
        <path
          ref={lineRef}
          d={LINE_PATH}
          fill="none"
          stroke="#A3C489"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {POINTS.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === POINTS.length - 1 ? 5 : 3.5}
            fill={i === POINTS.length - 1 ? '#A3C489' : '#231F1E'}
            stroke="#A3C489"
            strokeWidth="2"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true, margin: '-24px' }}
            transition={{
              delay: 0.85 + i * 0.07,
              type: 'spring',
              stiffness: 400,
              damping: 18,
            }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        ))}
      </svg>

      <div className="mt-1 flex justify-between px-1">
        {DAYS.map((d) => (
          <span
            key={d}
            className="text-[10px] font-bold text-[#F5F3EE]/50"
          >
            {d}
          </span>
        ))}
      </div>

      <p className="mt-3 text-[11px] font-medium text-[#F5F3EE]/55">
        Pekan ini naik 12% — Rabu sedikit turun tapi Sabtu–Minggu konsisten
        tinggi.
      </p>
    </motion.div>
  )
}
