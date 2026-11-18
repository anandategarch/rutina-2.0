'use client'

import * as m from 'motion/react-m'
import { Flame } from 'lucide-react'

import { Counter } from './counter'
import { bestStreak, todayISO, useRutina } from './store'
import { useAnimePop } from './anime-kit'

import { motionTokens } from '@/lib/motion/tokens'
/**
 * Kartu bento setengah kolom (espresso gelap): streak aktif terpanjang.
 * Angka dihitung NYATA dari histori penyelesaian (completions) —
 * konsisten dengan layar Statistik.
 *
 * v2.6: api streak "bernapas" pelan (animate-breathe) dan MELEDAK
 * elastis (anime.js) setiap kali angka streak bertambah/berkurang.
 */
export function StreakWidget() {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)

  const best = bestStreak(habits, completions, todayISO())
  const streak = best.streak

  /* Pop elastis pada lencana api saat streak berubah. */
  const flameRef = useAnimePop<HTMLSpanElement>(null, streak, {
    scale: 1.45,
    rotate: -10,
    duration: 780,
    back: 2.6,
  })

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{
        duration: 0.45,
        delay: 0.06,
        ease: motionTokens.easing.standard,
      }}
      aria-label={`Streak terpanjang aktif, ${streak} hari`}
      className="flex flex-col rounded-[16px] border border-border bg-surface-inverse p-4 text-content-inverse shadow-soft"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-content-inverse/70">
        Streak Terpanjang
      </p>

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="min-w-0">
          <p className="flex items-baseline gap-1">
            <span className="text-[30px] font-semibold leading-none tracking-tight text-content-inverse">
              <Counter to={streak} />
            </span>
            <span className="text-[11px] font-medium text-content-inverse/70">
              hari
            </span>
          </p>
          <p className="mt-1.5 line-clamp-2 pr-1 text-[11px] font-medium leading-snug text-content-inverse/75">
            {best.habit?.title ?? 'Mulai kebiasaan pertamamu'}
          </p>
        </div>
        <span
          ref={flameRef}
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-ink"
        >
          <Flame
            className="h-[18px] w-[18px] motion-safe:animate-breathe"
            strokeWidth={1.8}
          />
        </span>
      </div>
    </m.div>
  )
}
