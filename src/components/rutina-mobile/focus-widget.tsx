'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { animate, stagger } from 'animejs'

import { Counter } from './counter'
import { DAYS, FOCUS } from './store'

/**
 * Kartu bento setengah kolom: jam fokus mingguan + 7 batang mini.
 * Batang tumbuh dengan anime.js saat kartu masuk viewport.
 */
export function FocusWidget() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

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
      aria-label="Waktu fokus minggu ini, total 14,5 jam"
      className="flex flex-col rounded-[16px] border border-[#4A3B321F] bg-white p-4"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/65">
        Fokus Pekan
      </p>
      <p className="mt-1.5 flex items-baseline gap-1">
        <span className="text-[30px] font-semibold leading-none tracking-tight text-[#231F1E]">
          <Counter to={14.5} decimals={1} />
        </span>
        <span className="text-[11px] font-medium text-[#4A3B32]/60">jam</span>
      </p>

      <div
        className="mt-auto flex items-end justify-between gap-1 pt-4"
        role="img"
        aria-label="Grafik batang waktu fokus tujuh hari terakhir, hari ini paling tinggi"
      >
        {/* Skala mini: baseline 1,2 jam dipangkas agar perbedaan antar hari
            tetap terbaca pada tinggi maksimum 36px. */}
        {FOCUS.map((f, i) => {
          const isToday = i === FOCUS.length - 1
          return (
            <div
              key={i}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                data-mini-bar
                className={`w-full origin-bottom rounded-full ${
                  isToday ? 'bg-[#749B58]' : 'bg-[#E4EFE0]'
                }`}
                style={{
                  height: `${Math.round(8 + ((f - 1.2) / 1.4) * 26)}px`,
                }}
              />
              <span
                className={`text-[9px] font-bold ${
                  isToday ? 'text-[#749B58]' : 'text-[#4A3B32]/55'
                }`}
              >
                {DAYS[i].charAt(0)}
              </span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
