'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'motion/react'
import * as m from 'motion/react-m'
import { animate, stagger } from 'animejs'

import { dayCounts, todayISO, useRutina } from './store'

/* ===== Konsistensi 12 pekan — dari histori penyelesaian nyata ===== */

const WEEKS = 12
/** Palet level gelap: dari espresso redup ke matcha terang. */
const LEVEL_COLORS = ['#2E2824', '#3E4A34', '#51633F', '#65894C', '#A3C489']

/** Level 0-4 dari jumlah kebiasaan selesai: 0 / 1 / 2 / 3-4 / 5+. */
function levelOf(count: number): number {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

export default function Heatmap() {
  const completions = useRutina((s) => s.completions)
  const today = todayISO()

  /** 84 hari terakhir diakhiri hari ini — kolom terakhir grid adalah
      pekan berjalan dan sel terakhir adalah hari ini. */
  const days = dayCounts(completions, today, WEEKS * 7)

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

  const selEntry = sel ? days[sel.d * WEEKS + sel.w] : null
  const selCount = selEntry?.count ?? 0

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-24px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[16px] border border-[#4A3B3214] bg-[#4A3B32] p-5 shadow-soft"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/70">
        Konsistensi
      </p>
      <p className="mt-1 text-[11px] font-medium text-[#F5F3EE]/70">
        12 pekan terakhir
      </p>

      {/* Baris = hari (d), kolom = pekan (w); auto-placement row-major.
          Data dipetakan berurutan: kolom terakhir = pekan berjalan,
          sel terakhir = hari ini. */}
      <div
        ref={gridRef}
        className="mt-3 grid grid-cols-[repeat(12,minmax(0,1fr))] gap-1"
      >
        {Array.from({ length: 7 }, (_, d) =>
          Array.from({ length: WEEKS }, (_, w) => {
            const cell = days[d * WEEKS + w]
            const level = levelOf(cell.count)
            const isToday = w === WEEKS - 1 && d === 6
            return (
              <button
                key={`${d}-${w}`}
                type="button"
                aria-label={`Pekan ${WEEKS - w}, ${cell.label} — ${
                  cell.count === 0
                    ? 'tidak ada aktivitas'
                    : `${cell.count} kebiasaan selesai`
                }`}
                onClick={() => setSel({ w, d })}
                className={
                  'h-5 w-full cursor-pointer rounded-[5px] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#A3C489] ' +
                  (isToday
                    ? 'ring-2 ring-[#A3C489] ring-offset-1 ring-offset-[#4A3B32]'
                    : '')
                }
                style={{ backgroundColor: LEVEL_COLORS[level] }}
              />
            )
          }),
        )}
      </div>

      <p className="mt-3 text-[11px] font-medium text-[#F5F3EE]/70">
        {sel && selEntry
          ? `Pekan ${WEEKS - sel.w}, ${selEntry.label} — ${
              selCount === 0
                ? 'tidak ada aktivitas'
                : `${selCount} kebiasaan selesai`
            }`
          : 'Ketuk sel untuk melihat detail hari.'}
      </p>

      <div className="mt-3 flex items-center justify-end gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F5F3EE]/70">
          Sedikit
        </span>
        {LEVEL_COLORS.map((c) => (
          <span
            key={c}
            className="h-3 w-3 rounded-[3px]"
            style={{ backgroundColor: c }}
          />
        ))}
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F5F3EE]/70">
          Banyak
        </span>
      </div>
    </m.div>
  )
}
