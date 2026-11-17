'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import {
  Check,
  Flame,
  Medal,
  Sparkles,
  Star,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { StatusBar } from '../status-bar'
import { ComposeSheet } from '../compose-sheet'
import { ReadingSheet } from '../reading-sheet'
import { CelebrationOverlay } from '../celebration'
import { Counter } from '../counter'
import { useRutina } from '../store'

/* ===== Ekonomi XP (deterministik, aman SSR) ===== */

const XP_BASE = 1840
const XP_PER_QUEST = 80
const XP_BONUS = 120
const XP_TARGET = 2400

/* ===== Lencana pencapaian ===== */

const BADGES: {
  icon: LucideIcon
  name: string
  desc: string
  unlocked: boolean
}[] = [
  {
    icon: Trophy,
    name: 'Pagi Sempurna',
    desc: 'Selesaikan semua misi sebelum jam 9 pagi.',
    unlocked: true,
  },
  {
    icon: Zap,
    name: 'Speed Run',
    desc: 'Tuntaskan tiga misi dalam satu jam.',
    unlocked: true,
  },
  {
    icon: Flame,
    name: 'Api 30 Hari',
    desc: 'Jaga streak 30 hari tanpa putus.',
    unlocked: false,
  },
  {
    icon: Medal,
    name: 'Kolektor',
    desc: 'Kumpulkan 100 catatan di jurnal.',
    unlocked: false,
  },
]

/* ===== Geometri ring XP ===== */

const R = 86
const CIRC = 2 * Math.PI * R
const EASE = [0.22, 1, 0.36, 1] as const

/* ===== Varian 02 — Gamified & Interactive Hero =====
   Palet dibalik: Espresso (#4A3B32) menjadi kanvas utama,
   kartu memakai Deep Espresso, aksen Matcha & #A3C489. */

export default function GamifiedHero() {
  const tasks = useRutina((s) => s.tasks)
  const toggleTask = useRutina((s) => s.toggleTask)
  const celebrating = useRutina((s) => s.celebrating)
  const setCelebrating = useRutina((s) => s.setCelebrating)

  const [claimed, setClaimed] = useState(false)
  const leveledRef = useRef(false)
  const allDoneRef = useRef(false)

  const doneCount = tasks.filter((t) => t.done).length
  const xp = XP_BASE + doneCount * XP_PER_QUEST + (claimed ? XP_BONUS : 0)
  const level = xp >= XP_TARGET ? 8 : 7
  const progress = Math.min(xp / XP_TARGET, 1)
  const remaining = Math.max(XP_TARGET - xp, 0)

  // Momen naik level — konfeti + toast, hanya sekali
  useEffect(() => {
    if (level >= 8 && !leveledRef.current) {
      leveledRef.current = true
      setCelebrating(true)
      toast.success('Naik ke Level 8 — petualang sejati!')
    }
  }, [level, setCelebrating])

  // Semua misi tuntas — toast (konfeti disimpan untuk momen naik level)
  useEffect(() => {
    if (tasks.length > 0 && tasks.every((t) => t.done) && !allDoneRef.current) {
      allDoneRef.current = true
      toast.success('Semua misi hari ini tuntas!')
    }
  }, [tasks])

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#4A3B32] text-[#F5F3EE]">
        <StatusBar tone="espresso" />

        <div className="relative min-h-0 flex-1">
          <div className="h-full overflow-y-auto no-scrollbar px-4 pb-6 pt-4">
            {/* Header pemain */}
            <header className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#749B58] text-[11px] font-bold tracking-widest text-[#FAF9F6]">
                AN
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold tracking-tight">
                  Ananda
                </p>
                <p className="text-[11px] font-medium text-[#F5F3EE]/55">
                  Petualang Konsisten
                </p>
              </div>
              <span className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#F5F3EE]/15 bg-[#231F1E] px-3 text-[11px] font-bold text-[#A3C489]">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
                LV {level}
              </span>
            </header>

            {/* Ring XP interaktif */}
            <section
              className="mt-6 flex flex-col items-center"
              aria-label="Progres level pemain"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, ease: EASE }}
                whileTap={{ scale: 0.96 }}
                className="relative cursor-pointer select-none"
              >
                <svg
                  viewBox="0 0 200 200"
                  className="h-48 w-48 -rotate-90"
                  role="img"
                  aria-label={`Progres XP level ${level}: ${Math.round(progress * 100)} persen`}
                >
                  <circle
                    cx="100"
                    cy="100"
                    r={R}
                    fill="none"
                    stroke="#F5F3EE"
                    strokeOpacity="0.12"
                    strokeWidth="13"
                  />
                  <motion.circle
                    cx="100"
                    cy="100"
                    r={R}
                    fill="none"
                    stroke="url(#gam-xp-grad)"
                    strokeWidth="13"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    initial={{ strokeDashoffset: CIRC }}
                    animate={{ strokeDashoffset: CIRC * (1 - progress) }}
                    transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                  />
                  <defs>
                    <linearGradient
                      id="gam-xp-grad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#A3C489" />
                      <stop offset="100%" stopColor="#749B58" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#F5F3EE]/55">
                    Level
                  </p>
                  <p className="text-[44px] font-semibold leading-none tabular-nums">
                    {level}
                  </p>
                  <span className="mt-2.5 rounded-full bg-[#231F1E] px-2.5 py-1 text-[11px] font-bold text-[#A3C489]">
                    <Counter to={xp} /> XP
                  </span>
                </div>

                {/* Kilau dekoratif di sekitar ring */}
                <motion.span
                  aria-hidden="true"
                  className="absolute -right-1 top-4 text-[#A3C489]"
                  animate={{ scale: [1, 1.28, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                </motion.span>
                <motion.span
                  aria-hidden="true"
                  className="absolute -left-1.5 bottom-7 text-[#A3C489]/80"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
                  transition={{
                    duration: 2.9,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.5,
                  }}
                >
                  <Star className="h-3.5 w-3.5" />
                </motion.span>
              </motion.div>

              <p className="mt-3 text-center text-[11px] font-medium text-[#F5F3EE]/60">
                {level >= 8
                  ? 'Level baru terbuka — lanjutkan petualanganmu'
                  : `${remaining} XP lagi menuju Level ${level + 1}`}
              </p>
            </section>

            {/* Daftar misi */}
            <section className="mt-7" aria-label="Misi hari ini">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#F5F3EE]/85">
                  Misi Hari Ini
                </h2>
                <span className="text-xs font-medium text-[#F5F3EE]/55">
                  {doneCount}/{tasks.length} selesai
                </span>
              </div>
              <div className="space-y-2.5">
                {tasks.map((t, i) => (
                  <motion.button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTask(t.id)}
                    aria-pressed={t.done}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: 0.12 + i * 0.05,
                      ease: EASE,
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="relative flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-[#F5F3EE]/10 bg-[#231F1E] p-3.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A3C489]"
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                        t.done
                          ? 'border-[#749B58] bg-[#749B58]'
                          : 'border-[#F5F3EE]/30'
                      }`}
                    >
                      {t.done && (
                        <Check
                          className="h-4 w-4 text-[#FAF9F6]"
                          strokeWidth={3}
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-[14px] font-semibold transition-colors duration-200 ${
                          t.done
                            ? 'text-[#F5F3EE]/45 line-through'
                            : 'text-[#F5F3EE]'
                        }`}
                      >
                        {t.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-[#F5F3EE]/50">
                        {t.streak ? (
                          <>
                            <Flame className="h-3 w-3 text-[#A3C489]" />
                            Streak {t.streak} hari
                          </>
                        ) : (
                          (t.cat ?? 'Misi harian')
                        )}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold tabular-nums transition-colors duration-200 ${
                        t.done
                          ? 'bg-[#F5F3EE]/10 text-[#F5F3EE]/40'
                          : 'bg-[#749B58]/20 text-[#A3C489]'
                      }`}
                    >
                      +{XP_PER_QUEST} XP
                    </span>
                    <AnimatePresence>
                      {t.done && (
                        <motion.span
                          key="xp-pop"
                          aria-hidden="true"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: [0, 1, 1, 0], y: -22 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.9,
                            times: [0, 0.2, 0.75, 1],
                          }}
                          className="pointer-events-none absolute right-4 top-1/2 text-[11px] font-bold text-[#A3C489]"
                        >
                          +{XP_PER_QUEST} XP
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                ))}
              </div>
            </section>

            {/* Kartu streak */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mt-7"
              aria-label="Streak berjalan"
            >
              <div className="flex items-center gap-4 rounded-[20px] bg-[#231F1E] p-4">
                <motion.span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#749B58]/20"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Flame className="h-6 w-6 text-[#A3C489]" />
                </motion.span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5F3EE]/50">
                    Streak Berjalan
                  </p>
                  <p className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-[26px] font-semibold leading-none tabular-nums">
                      21
                    </span>
                    <span className="text-xs font-medium text-[#F5F3EE]/60">
                      hari berturut-turut
                    </span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/45">
                    Rekor
                  </p>
                  <p className="text-sm font-bold text-[#A3C489]">30 hari</p>
                </div>
              </div>
            </motion.section>

            {/* Lencana */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ duration: 0.5, delay: 0.05, ease: EASE }}
              className="mt-7"
              aria-label="Piala dan lencana"
            >
              <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.16em] text-[#F5F3EE]/85">
                Piala &amp; Lencana
              </h2>
              <div className="grid grid-cols-4 gap-2.5">
                {BADGES.map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() =>
                      b.unlocked
                        ? toast.success(`Lencana "${b.name}" sudah terbuka`, {
                            description: b.desc,
                          })
                        : toast.info(`Lencana "${b.name}" masih terkunci`, {
                            description: b.desc,
                          })
                    }
                    aria-label={`Lencana ${b.name} — ${
                      b.unlocked ? 'terbuka' : 'terkunci'
                    }`}
                    className="flex cursor-pointer flex-col items-center rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A3C489]"
                  >
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-full border transition-transform duration-200 hover:scale-105 ${
                        b.unlocked
                          ? 'border-[#749B58]/45 bg-[#749B58]/20 text-[#A3C489]'
                          : 'border-[#F5F3EE]/10 bg-[#231F1E] text-[#F5F3EE]/30'
                      }`}
                    >
                      <b.icon className="h-5 w-5" strokeWidth={1.9} />
                    </span>
                    <span
                      className={`mt-1.5 w-full truncate text-center text-[9px] font-bold ${
                        b.unlocked ? 'text-[#F5F3EE]/80' : 'text-[#F5F3EE]/40'
                      }`}
                    >
                      {b.name}
                    </span>
                  </button>
                ))}
              </div>
            </motion.section>
          </div>
        </div>

        {/* Bar bawah: XP live + klaim bonus */}
        <footer className="z-20 flex shrink-0 items-center justify-between gap-3 border-t border-[#F5F3EE]/10 bg-[#4A3B32] px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-3">
          <div className="flex h-10 items-center gap-2 rounded-full bg-[#231F1E] px-3.5">
            <Zap className="h-3.5 w-3.5 text-[#A3C489]" strokeWidth={2.4} />
            <span className="text-[12px] font-bold tabular-nums text-[#F5F3EE]">
              <Counter to={xp} /> XP
            </span>
          </div>
          <Button
            type="button"
            disabled={claimed}
            onClick={() => {
              setClaimed(true)
              toast.success('Bonus harian diklaim — tambah 120 XP!')
            }}
            className="h-10 rounded-full bg-[#749B58] px-5 text-[13px] font-bold text-[#FAF9F6] shadow-[0_8px_20px_rgba(35,31,30,0.35)] hover:bg-[#658A4C] disabled:opacity-70"
          >
            {claimed ? (
              <>
                <Check className="h-4 w-4" strokeWidth={2.6} />
                Terklaim
              </>
            ) : (
              `Klaim +${XP_BONUS} XP`
            )}
          </Button>
        </footer>

        <ComposeSheet />
        <ReadingSheet />
        <CelebrationOverlay active={celebrating} />

        {/* "Dynamic island" — hanya di mode bingkai (sm+) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-2 z-30 hidden h-[22px] w-24 -translate-x-1/2 rounded-full bg-[#14100D] sm:block"
        />
      </div>
    </MotionConfig>
  )
}
