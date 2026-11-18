'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { BadgeCheck, Leaf, Sparkles } from 'lucide-react'

import {
  addDaysISO,
  doneCountOn,
  fromISO,
  todayISO,
  useRutina,
  WEEKDAY_MIN,
} from './store'

/**
 * Kartu Stempel Pekan — pattern "punch card" ala kartu loyalti kafe:
 * satu pekan = 7 lubang; hari dengan target misi tercapai mendapat
 * stempel (lubang berisi daun). SEMUA hari — lampau maupun hari ini —
 * dihitung dari histori penyelesaian NYATA.
 */

interface PunchDay {
  key: string
  label: string
  stamped: boolean
  isToday: boolean
}

function buildPunchWeek(
  completions: Parameters<typeof doneCountOn>[0],
  goal: number,
): { days: PunchDay[]; stampedCount: number } {
  const today = todayISO()
  const days: PunchDay[] = []
  let stampedCount = 0
  for (let i = 6; i >= 0; i--) {
    const iso = addDaysISO(today, -i)
    const isToday = i === 0
    /* Stempel = jumlah selesai NYATA pada hari itu mencapai target. */
    const stamped = doneCountOn(completions, iso) >= goal
    if (stamped) stampedCount++
    days.push({
      key: iso,
      label: WEEKDAY_MIN[fromISO(iso).getDay()],
      stamped,
      isToday,
    })
  }
  return { days, stampedCount }
}

export function PunchCard() {
  const completions = useRutina((s) => s.completions)
  const dailyGoal = useRutina((s) => s.dailyGoal)

  const { days, stampedCount } = useMemo(
    () => buildPunchWeek(completions, Math.max(dailyGoal, 1)),
    [completions, dailyGoal],
  )
  const perfect = stampedCount === 7

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Kartu stempel pekan"
      className="relative mt-3 overflow-hidden rounded-[20px] border-2 border-dashed border-[#749B58]/35 bg-white p-5 shadow-card"
    >
      {/* Kepingan polos khas kartu loyalti: lingkaran lembut di sudut */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-[#E4EFE0]/70"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#4A3B32]/70">
            <BadgeCheck className="h-3.5 w-3.5 text-[#749B58]" />
            Kartu Stempel Pekan
          </p>
          <p className="mt-1 text-[15px] font-bold text-[#231F1E]">
            {stampedCount} dari 7 hari tuntas
          </p>
          <p className="mt-0.5 text-[12px] font-medium text-[#4A3B32]/75">
            {perfect
              ? 'Pekan sempurna — pertahankan!'
              : 'Selesaikan target misi untuk stempel baru'}
          </p>
        </div>
        {perfect && (
          <motion.span
            initial={{ scale: 0.5, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 16 }}
            className="flex shrink-0 items-center gap-1 rounded-full bg-[#749B58] px-2.5 py-1 text-[11px] font-bold text-white shadow-leaf"
          >
            <Sparkles className="h-3 w-3" />
            Sempurna
          </motion.span>
        )}
      </div>

      {/* Baris lubang stempel */}
      <div
        role="img"
        aria-label={`Progres stempel pekan: ${stampedCount} dari 7 hari, ${days
          .filter((d) => d.stamped)
          .map((d) => d.label)
          .join(', ')} telah dicap`}
        className="relative mt-4 grid grid-cols-7 gap-2"
      >
        {days.map((d, i) => (
          <div key={d.key} className="flex flex-col items-center gap-1.5">
            {/* Lubang: stempel = lingkaran berisi daun; kosong = putus-putus */}
            <motion.div
              aria-hidden="true"
              initial={false}
              animate={
                d.stamped
                  ? { scale: [1.7, 0.92, 1], rotate: [-14, 5, 0], opacity: 1 }
                  : { scale: 1, rotate: 0, opacity: 1 }
              }
              transition={{
                delay: 0.3 + i * 0.09,
                type: 'spring',
                stiffness: 320,
                damping: 15,
              }}
              className={
                'flex h-11 w-full items-center justify-center rounded-full ' +
                (d.stamped
                  ? 'bg-[#749B58] text-[#FAF9F6] shadow-[inset_0_-2px_4px_rgba(35,31,30,0.18),0_4px_10px_rgba(116,155,88,0.35)]'
                  : 'border-2 border-dashed border-[#4A3B32]/25 text-transparent')
              }
            >
              {d.stamped ? (
                <Leaf className="h-4 w-4" strokeWidth={2.2} />
              ) : (
                <Leaf className="h-4 w-4 text-[#4A3B32]/15" strokeWidth={2} />
              )}
            </motion.div>
            <span
              className={
                'text-[10px] font-bold uppercase leading-tight tracking-tight ' +
                (d.isToday
                  ? 'whitespace-nowrap text-[#658A4C]'
                  : d.stamped
                    ? 'text-[#4A3B32]/75'
                    : 'text-[#4A3B32]/40')
              }
            >
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </motion.section>
  )
}
