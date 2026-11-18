'use client'

import { useEffect, useMemo, useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { animate, stagger } from 'animejs'

import { Counter } from './counter'
import { dayCounts, todayISO, useRutina } from './store'

/**
 * Kartu bento setengah kolom: aktivitas misi minggu ini + 7 batang mini.
 * Batang & total dihitung NYATA dari histori penyelesaian — bukan jam
 * fokus statis. Tumbuh dengan anime.js saat kartu masuk viewport.
 */
export function FocusWidget() {
  const completions = useRutina((s) => s.completions)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  const week = useMemo(
    () => dayCounts(completions, todayISO(), 7),
    [completions],
  )
  const total = week.reduce((a, b) => a + b.count, 0)
  const max = Math.max(...week.map((d) => d.count), 1)

  useEffect(() => {
    if (!inView || !ref.current) return
    const anim = animate(ref.current.querySelectorAll('[data-mini-bar]'), {
      scaleY: [0, 1],
      delay: stagger(45),
      duration: 700,
      ease: 'outBack(1.2)',
    })
    return () => {
      anim.revert()
    }
  }, [inView])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      aria-label={`Misi selesai pekan ini, total ${total} misi`}
      className="flex flex-col rounded-[16px] border border-[#4A3B321F] bg-white p-4 shadow-soft"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/70">
        Misi Pekan Ini
      </p>
      <p className="mt-1.5 flex items-baseline gap-1">
        <span className="text-[30px] font-semibold leading-none tracking-tight text-[#231F1E]">
          <Counter to={total} />
        </span>
        <span className="text-[11px] font-medium text-[#4A3B32]/70">misi</span>
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
                  isToday ? 'bg-[#749B58]' : 'bg-[#E4EFE0]'
                }`}
                style={{
                  height: `${Math.max(4, Math.round((d.count / max) * 36))}px`,
                }}
              />
              <span
                className={`text-[10px] font-bold ${
                  isToday ? 'text-[#749B58]' : 'text-[#4A3B32]/60'
                }`}
              >
                {d.label}
              </span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
