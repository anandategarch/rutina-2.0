'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useInView, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { animate, stagger } from 'animejs'

import { Counter } from './counter'
import { dayCounts, todayISO, useRutina } from './store'

import { motionTokens } from '@/lib/motion/tokens'
/**
 * Kartu bento setengah kolom: aktivitas misi minggu ini + 7 batang mini.
 * Batang & total dihitung NYATA dari histori penyelesaian — bukan jam
 * fokus statis. Tumbuh dengan anime.js saat kartu masuk viewport.
 */
export function FocusWidget() {
  const completions = useRutina((s) => s.completions)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reducedMotion = useReducedMotion()

  const week = useMemo(
    () => dayCounts(completions, todayISO(), 7),
    [completions],
  )
  const total = week.reduce((a, b) => a + b.count, 0)
  const max = Math.max(...week.map((d) => d.count), 1)

  /* SATU observer untuk dua tujuan: `inView` yang sama memicu animasi
     batang anime.js DAN entrance kartu Motion — sebelumnya useInView dan
     whileInView membuat dua IntersectionObserver pada elemen yang sama.
     Kebijakan reduced-motion: batang langsung tampil tanpa animasi tumbuh. */
  useEffect(() => {
    if (!inView || reducedMotion || !ref.current) return
    const anim = animate(ref.current.querySelectorAll('[data-mini-bar]'), {
      scaleY: [0, 1],
      delay: stagger(45),
      duration: 700,
      ease: 'outBack(1.2)',
    })
    return () => {
      anim.revert()
    }
  }, [inView, reducedMotion])

  return (
    <m.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.45, ease: motionTokens.easing.standard }}
      aria-label={`Misi selesai pekan ini, total ${total} misi`}
      className="flex flex-col rounded-[16px] border border-border bg-surface-primary p-4 shadow-soft"
    >
      <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
        Misi Pekan Ini
      </p>
      <p className="mt-1.5 flex items-baseline gap-1">
        <span className="text-kpi-lg font-semibold leading-none tracking-tight text-content-primary">
          <Counter to={total} />
        </span>
        <span className="text-eyebrow font-medium text-content-muted">misi</span>
      </p>

      <div
        className="mt-auto flex items-end justify-between gap-1 pt-4"
        role="img"
        aria-label={`Grafik batang misi selesai tujuh hari terakhir, hari ini ${week[week.length - 1]?.count ?? 0} misi`}
      >
        {/* Skala mini: tinggi batang proporsional terhadap nilai maksimum
            pekan, dengan stub 4px agar hari kosong tetap terbaca. */}
        {week.map((d, i) => {
          const isToday = i === week.length - 1
          return (
            <div
              key={d.date}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                data-mini-bar
                className={`w-full origin-bottom rounded-full ${
                  isToday ? 'bg-primary' : 'bg-secondary'
                }`}
                style={{
                  height: `${Math.max(4, Math.round((d.count / max) * 36))}px`,
                }}
              />
              <span
                className={`text-chart-label font-semibold ${
                  isToday ? 'text-success' : 'text-content-muted'
                }`}
              >
                {d.label}
              </span>
            </div>
          )
        })}
      </div>
    </m.div>
  )
}
