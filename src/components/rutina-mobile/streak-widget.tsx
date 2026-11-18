'use client'

import { motion } from 'motion/react'
import { Flame } from 'lucide-react'

import { Counter } from './counter'
import { bestStreak, todayISO, useRutina } from './store'

/**
 * Kartu bento setengah kolom (espresso gelap): streak aktif terpanjang.
 * Angka dihitung NYATA dari histori penyelesaian (completions) —
 * konsisten dengan layar Statistik.
 */
export function StreakWidget() {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)

  const best = bestStreak(habits, completions, todayISO())
  const streak = best.streak

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{
        duration: 0.45,
        delay: 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      aria-label={`Streak terpanjang aktif, ${streak} hari`}
      className="flex flex-col rounded-[16px] border border-[#4A3B3214] bg-[#4A3B32] p-4 text-[#F5F3EE] shadow-soft"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/70">
        Streak Terpanjang
      </p>

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="min-w-0">
          <p className="flex items-baseline gap-1">
            <span className="text-[30px] font-semibold leading-none tracking-tight text-[#F5F3EE]">
              <Counter to={streak} />
            </span>
            <span className="text-[11px] font-medium text-[#F5F3EE]/70">
              hari
            </span>
          </p>
          <p className="mt-1.5 line-clamp-2 pr-1 text-[11px] font-medium leading-snug text-[#F5F3EE]/75">
            {best.habit?.title ?? 'Mulai kebiasaan pertamamu'}
          </p>
        </div>
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#749B58] text-white shadow-[0_6px_16px_rgba(35,31,30,0.35)]"
        >
          <Flame className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
      </div>
    </motion.div>
  )
}
