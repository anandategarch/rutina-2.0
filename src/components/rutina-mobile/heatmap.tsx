'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import { animate, stagger } from 'animejs'

import { DAYS } from './store'

/* ===== Data demo (deterministik, tanpa Math.random) ===== */

const WEEKS = 12
const LEVEL_COLORS = ['#EDEAE3', '#E4EFE0', '#CBE0C2', '#A3C489', '#749B58']

/** level 0-4 per sel; deterministik */
const levelAt = (w: number, d: number): number => (w * 13 + d * 29) % 5

/** kebiasaan selesai per level */
const LEVEL_COUNTS = [0, 1, 2, 4, 5]

export default function Heatmap() {
  const gridRef = useRef<HTMLDivElement>(null)
  const gridInView = useInView(gridRef, { once: true, margin: '-40px' })

  const [sel, setSel] = useState<{ w: number; d: number } | null>(null)

  // anime.js — sel heatmap bermunculan bergelombang saat terlihat
  useEffect(() => {
    if (!gridInView || !gridRef.current) return
    const anim = animate(gridRef.current.querySelectorAll('button'), {
      scale: [0, 1],
      delay: stagger(6, { grid: [7, 12], from: 'first' }),
      duration: 420,
      ease: 'outBack(1.4)',
    })
    return () => {
      anim.revert()
    }
  }, [gridInView])

  const selCount = sel ? LEVEL_COUNTS[levelAt(sel.w, sel.d)] : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-24px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[16px] border border-[#4A3B321F] bg-white p-5"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/65">
        Konsistensi
      </p>
      <p className="mt-1 text-[11px] font-medium text-[#4A3B32]/70">
        12 pekan terakhir
      </p>

      {/* Baris = hari (d), kolom = pekan (w); auto-placement row-major */}
      <div
        ref={gridRef}
        className="mt-3 grid grid-cols-[repeat(12,minmax(0,1fr))] gap-1"
      >
        {Array.from({ length: 7 }, (_, d) =>
          Array.from({ length: WEEKS }, (_, w) => {
            const level = levelAt(w, d)
            const isToday = w === 11 && d === 6
            return (
              <button
                key={`${d}-${w}`}
                type="button"
                aria-label={`Pekan ${12 - w}, ${DAYS[d]} — ${LEVEL_COUNTS[level]} kebiasaan`}
                onClick={() => setSel({ w, d })}
                className={
                  'h-5 w-full cursor-pointer rounded-[5px] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#749B58] ' +
                  (isToday ? 'ring-2 ring-[#749B58] ring-offset-1' : '')
                }
                style={{ backgroundColor: LEVEL_COLORS[level] }}
              />
            )
          }),
        )}
      </div>

      <p className="mt-3 text-[11px] font-medium text-[#4A3B32]/70">
        {sel
          ? `Pekan ${12 - sel.w}, ${DAYS[sel.d]} — ${
              selCount === 0
                ? 'tidak ada aktivitas'
                : `${selCount} kebiasaan selesai`
            }`
          : 'Ketuk sel untuk melihat detail hari.'}
      </p>

      <div className="mt-3 flex items-center justify-end gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#4A3B32]/50">
          Sedikit
        </span>
        {LEVEL_COLORS.map((c) => (
          <span
            key={c}
            className="h-3 w-3 rounded-[3px]"
            style={{ backgroundColor: c }}
          />
        ))}
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#4A3B32]/50">
          Banyak
        </span>
      </div>
    </motion.div>
  )
}
