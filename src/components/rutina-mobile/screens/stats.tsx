'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { animate, stagger } from 'animejs'
import { BatteryLow, Flame, Laugh, Meh, Smile, TrendingUp } from 'lucide-react'

import { Counter } from '../counter'
import Heatmap from '../heatmap'
import { DAYS, FOCUS, MOODS, useRutina } from '../store'
import TrendLine from '../trend-line'

/** Keliling ring progres (r = 42 pada viewBox 96). */
const RING_CIRCUMFERENCE = 2 * Math.PI * 42

/** Ikon suasana hati — padanan MOODS di store. */
const MOOD_ICONS: Record<string, typeof Laugh> = {
  Ceria: Laugh,
  Baik: Smile,
  Biasa: Meh,
  Lelah: BatteryLow,
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#4A3B32]">
        {title}
      </h2>
      {hint ? (
        <span className="text-xs font-medium text-[#4A3B32]/70">{hint}</span>
      ) : null}
    </div>
  )
}

export default function StatsScreen() {
  const tasks = useRutina((s) => s.tasks)
  const mood = useRutina((s) => s.mood)
  const setMood = useRutina((s) => s.setMood)

  const chartRef = useRef<HTMLDivElement>(null)
  const chartInView = useInView(chartRef, { once: true, margin: '-40px' })

  // anime.js — batang grafik tumbuh saat terlihat
  useEffect(() => {
    if (!chartInView || !chartRef.current) return
    const anim = animate(chartRef.current.querySelectorAll('[data-bar]'), {
      scaleY: [0, 1],
      delay: stagger(55),
      duration: 850,
      ease: 'outBack(1.3)',
    })
    return () => {
      anim.revert()
    }
  }, [chartInView])

  const doneCount = tasks.filter((t) => t.done).length
  const total = tasks.length
  const pct = Math.round((doneCount / total) * 100)

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-4 pb-28 pt-5">
      <header>
        <h1 className="text-[19px] font-bold tracking-tight text-[#231F1E]">
          Statistik
        </h1>
        <p className="mt-0.5 text-xs font-medium text-[#4A3B32]/70">
          Ringkasan pekan ini
        </p>
      </header>

      {/* Ring penyelesaian tugas */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-24px' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-4 flex items-center gap-5 rounded-[16px] border border-[#4A3B321F] bg-white p-5"
      >
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 96 96" className="h-24 w-24 -rotate-90" aria-hidden="true">
            <circle cx="48" cy="48" r="42" fill="none" stroke="#E4EFE0" strokeWidth="9" />
            <motion.circle
              cx="48"
              cy="48"
              r="42"
              fill="none"
              stroke="#749B58"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
              whileInView={{
                strokeDashoffset: RING_CIRCUMFERENCE * (1 - pct / 100),
              }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-semibold text-[#231F1E]">
              <Counter to={pct} />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A3B32]/60">
              selesai
            </span>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/65">
            Tugas Selesai
          </p>
          <p className="mt-1 text-[14px] font-medium text-[#231F1E]">
            {doneCount} dari {total} tugas hari ini
          </p>
          <p className="mt-2 text-xs font-medium text-[#4A3B32]/70">
            Terus jaga ritmenya — sedikit tapi konsisten.
          </p>
        </div>
      </motion.div>

      {/* Ringkasan pekan */}
      <section className="mt-6" aria-label="Ringkasan pekan">
        <SectionTitle title="Ringkasan Pekan" />
        <div className="grid grid-cols-2 gap-3">
          {/* Suasana hati */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-24px' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[16px] border border-[#4A3B321F] bg-white p-4"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/65">
              Suasana Hati
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {MOODS.map((m) => {
                const MoodIcon = MOOD_ICONS[m]
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mood === m}
                    aria-label={`Catat suasana hati: ${m}`}
                    onClick={() => setMood(mood === m ? null : m)}
                    className={
                      'flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] ' +
                      (mood === m
                        ? 'border-[#749B58] bg-[#749B58] text-white'
                        : 'border-[#4A3B321F] bg-[#F5F3EE] text-[#4A3B32] hover:bg-[#E4EFE0]')
                    }
                  >
                    <MoodIcon className="h-4 w-4" />
                    <span className="text-[11px] font-bold">{m}</span>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-[11px] font-medium text-[#4A3B32]/70">
              {mood
                ? `Kamu merasa ${mood.toLowerCase()} hari ini`
                : 'Bagaimana perasaanmu?'}
            </p>
          </motion.div>

          {/* Streak terpanjang */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-24px' }}
            transition={{
              duration: 0.5,
              delay: 0.06,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex flex-col rounded-[16px] border border-[#4A3B321F] bg-white p-4"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/65">
              Streak Terpanjang
            </p>
            <div className="mt-2 flex items-start justify-between gap-2">
              <div>
                <p className="flex items-baseline gap-1">
                  <span className="text-[44px] font-semibold leading-none tracking-tight text-[#749B58]">
                    <Counter to={21} />
                  </span>
                  <span className="text-sm font-medium text-[#4A3B32]/60">hari</span>
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-[#4A3B32]/70">
                  Belajar kosakata baru
                </p>
              </div>
              <Flame
                className="h-9 w-9 shrink-0 text-[#4A3B32]/15"
                strokeWidth={1.5}
              />
            </div>
            <p className="mt-auto pt-3 text-[11px] font-medium text-[#4A3B32]/70">
              Rekor pribadi: 34 hari
            </p>
          </motion.div>

          {/* Grafik fokus mingguan */}
          <motion.div
            ref={chartRef}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-24px' }}
            transition={{
              duration: 0.5,
              delay: 0.12,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="col-span-2 rounded-[16px] border border-[#4A3B321F] bg-white p-5"
          >
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/65">
                  Fokus Minggu Ini
                </p>
                <p className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-[40px] font-semibold leading-none tracking-tight text-[#231F1E]">
                    <Counter to={14.5} decimals={1} />
                  </span>
                  <span className="text-sm font-medium text-[#4A3B32]/60">
                    jam total
                  </span>
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#E4EFE0] px-2.5 py-1 text-[11px] font-bold text-[#4A3B32]">
                <TrendingUp className="h-3.5 w-3.5" />
                +2,1 jam
              </span>
            </div>
            <div
              className="mt-5 flex items-end justify-between gap-2"
              role="img"
              aria-label="Grafik batang waktu fokus tujuh hari terakhir, hari ini paling tinggi"
            >
              {FOCUS.map((f, i) => {
                const isToday = i === FOCUS.length - 1
                return (
                  <div
                    key={i}
                    className="flex flex-1 flex-col items-center gap-1.5"
                  >
                    <div
                      data-bar
                      className={`w-full origin-bottom rounded-full ${
                        isToday ? 'bg-[#749B58]' : 'bg-[#E4EFE0]'
                      }`}
                      style={{ height: `${Math.round((f / 2.6) * 84)}px` }}
                    />
                    <span
                      className={`text-[10px] font-bold ${
                        isToday ? 'text-[#749B58]' : 'text-[#4A3B32]/55'
                      }`}
                    >
                      {DAYS[i]}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-[11px] font-medium text-[#4A3B32]/70">
              Hari ini kamu fokus 2,6 jam — tertinggi minggu ini.
            </p>
          </motion.div>
        </div>

        {/* Konsistensi & tren fokus */}
        <div className="mt-3 space-y-3">
          <Heatmap />
          <TrendLine />
        </div>
      </section>
    </div>
  )
}
