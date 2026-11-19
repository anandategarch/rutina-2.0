'use client'

import { useEffect, useRef } from 'react'
import { useInView, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { animate } from 'animejs'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'

import { dayCounts, todayISO, useRutina } from './store'

import { motionTokens } from '@/lib/motion/tokens'
/* ===== Geometri grafik ===== */

const W = 320
const H = 110
const PAD_X = 18
const TOP = 18
const BOTTOM = 96

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

/** Format angka satu desimal gaya Indonesia ("2,1"). */
const fmt1 = (n: number) =>
  n.toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

export default function TrendLine() {
  const completions = useRutina((s) => s.completions)
  const today = todayISO()

  /* Tujuh hari terakhir (diakhiri hari ini) + tujuh hari sebelumnya
     untuk perbandingan antar pekan. */
  const week = dayCounts(completions, today, 7)
  const fortnight = dayCounts(completions, today, 14)

  const weekTotal = week.reduce((a, b) => a + b.count, 0)
  const prevTotal = fortnight.slice(0, 7).reduce((a, b) => a + b.count, 0)
  const avg = weekTotal / (week.length || 1)
  const deltaPct =
    prevTotal === 0
      ? weekTotal > 0
        ? 100
        : 0
      : Math.round(((weekTotal - prevTotal) / prevTotal) * 100)

  /* Skala maks dinamis — guard pembagian nol bila semua nilai 0. */
  const maxValue = Math.max(...week.map((d) => d.count), 1)
  const POINTS = week.map((d, i) => ({
    x: PAD_X + (i * (W - PAD_X * 2)) / (week.length - 1),
    y: BOTTOM - (d.count / maxValue) * (BOTTOM - TOP),
  }))

  const LINE_PATH = smoothPath(POINTS)
  const AREA_PATH = `${LINE_PATH} L ${POINTS[POINTS.length - 1].x},${BOTTOM} L ${POINTS[0].x},${BOTTOM} Z`

  const svgRef = useRef<SVGSVGElement>(null)
  const lineRef = useRef<SVGPathElement>(null)
  const lineInView = useInView(svgRef, { once: true, margin: '-40px' })

  // anime.js — garis digambar (stroke draw-in) saat terlihat.
  // Kebijakan reduced-motion: garis langsung tampil penuh.
  const reducedMotion = useReducedMotion()
  useEffect(() => {
    if (!lineInView || !lineRef.current) return
    const el = lineRef.current
    if (reducedMotion) {
      /* Bersihkan dash manual (sisa run sebelumnya) agar garis utuh. */
      el.style.strokeDasharray = ''
      el.style.strokeDashoffset = ''
      return
    }
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
  }, [lineInView, reducedMotion])

  const deltaLabel =
    deltaPct > 0
      ? `+${deltaPct}%`
      : deltaPct < 0
        ? `−${Math.abs(deltaPct)}%`
        : 'stabil'
  const DeltaIcon =
    deltaPct > 0 ? TrendingUp : deltaPct < 0 ? TrendingDown : Minus
  const compareLabel =
    deltaPct > 0
      ? `naik ${deltaPct}% dibanding pekan lalu`
      : deltaPct < 0
        ? `turun ${Math.abs(deltaPct)}% dibanding pekan lalu`
        : 'stabil seperti pekan lalu'

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-24px' }}
      transition={{ duration: 0.5, delay: 0.06, ease: motionTokens.easing.standard }}
      className="rounded-[16px] border border-border bg-cocoa p-5 shadow-soft"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-body font-semibold tracking-tight text-content-inverse/80">
            Tren Aktivitas
          </p>
          <p className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-kpi-hero font-semibold leading-none tracking-tight text-content-inverse">
              {fmt1(avg)}
            </span>
            <span className="text-sm font-medium text-content-inverse/70">
              misi / hari rata-rata
            </span>
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/20 px-2.5 py-1 text-eyebrow font-semibold text-pistachio">
          <DeltaIcon className="h-3.5 w-3.5" />
          {deltaLabel}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="mt-4 w-full"
        role="img"
        aria-label="Grafik garis aktivitas tujuh hari terakhir, jumlah misi per hari"
      >
        <defs>
          <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-4)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="var(--chart-4)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <m.path
          d={AREA_PATH}
          fill="url(#activityGrad)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-24px' }}
          transition={{ duration: 0.6, delay: 0.55 }}
        />
        <path
          ref={lineRef}
          d={LINE_PATH}
          fill="none"
          stroke="var(--chart-4)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {POINTS.map((p, i) => (
          <m.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === POINTS.length - 1 ? 5 : 3.5}
            fill={i === POINTS.length - 1 ? 'var(--chart-4)' : 'var(--surface-inverse)'}
            stroke="var(--chart-4)"
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
        {week.map((d) => (
          <span
            key={d.date}
            className="text-eyebrow font-semibold text-content-inverse/70"
          >
            {d.label}
          </span>
        ))}
      </div>

      <p className="mt-3 text-eyebrow font-medium text-content-inverse/70">
        Rata-rata {fmt1(avg)} misi/hari pekan ini — {compareLabel}.
      </p>
    </m.div>
  )
}
