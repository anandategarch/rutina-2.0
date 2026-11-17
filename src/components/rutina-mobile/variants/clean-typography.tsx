'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { motion, MotionConfig } from 'motion/react'
import {
  BookOpen,
  Check,
  Flame,
  Plus,
  Quote,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { StatusBar } from '../status-bar'
import { ComposeSheet } from '../compose-sheet'
import { ReadingSheet } from '../reading-sheet'
import { CelebrationOverlay } from '../celebration'
import { Counter } from '../counter'
import { playfair } from '../serif'
import { useRutina, QUOTE_TEXT, QUOTE_AUTHOR } from '../store'

const EASE = [0.22, 1, 0.36, 1] as const

/* Tanggal & sapaan live — aman hidrasi (snapshot server kosong). */
const emptySubscribe = () => () => {}

function getClientDateLabel(): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

function getClientGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 19) return 'Selamat sore'
  return 'Selamat malam'
}

/* ===== Widget melayang ===== */

function FloatWidget({
  className,
  delay,
  dur,
  icon: Icon,
  value,
  label,
  onTap,
  rotate,
}: {
  className: string
  delay: number
  dur: number
  icon: LucideIcon
  value: string
  label: string
  onTap: () => void
  rotate: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.7 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 240, damping: 16 }}
      className={`absolute z-10 ${className}`}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut', delay }}
        whileTap={{ scale: 0.94 }}
        onClick={onTap}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onTap()
          }
        }}
        aria-label={`${label}: ${value}`}
        className={`flex w-[142px] cursor-pointer select-none items-center gap-2.5 rounded-2xl bg-[#FAF9F6] px-3 py-2.5 shadow-[0_14px_30px_rgba(35,31,30,0.22)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAF9F6] ${rotate}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E4EFE0] text-[#4A3B32]">
          <Icon className="h-4 w-4" strokeWidth={1.9} />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-bold leading-none text-[#231F1E] tabular-nums">
            {value}
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-semibold text-[#4A3B32]/65">
            {label}
          </span>
        </span>
      </motion.div>
    </motion.div>
  )
}

/* ===== Varian 03 — Clean Centered / Typography + Floating Widgets =====
   Palet dibalik: Matcha (#749B58) menjadi kanvas, tipografi editorial
   terpusat sebagai pusat perhatian, widget putih melayang di sekelilingnya. */

export default function CleanTypography() {
  const tasks = useRutina((s) => s.tasks)
  const toggleTask = useRutina((s) => s.toggleTask)
  const openCompose = useRutina((s) => s.openCompose)
  const quoteSaved = useRutina((s) => s.quoteSaved)
  const saveQuote = useRutina((s) => s.saveQuote)
  const celebrating = useRutina((s) => s.celebrating)
  const setCelebrating = useRutina((s) => s.setCelebrating)

  const firedRef = useRef(false)

  const dateLabel = useSyncExternalStore(
    emptySubscribe,
    getClientDateLabel,
    () => '',
  )
  const greeting = useSyncExternalStore(
    emptySubscribe,
    getClientGreeting,
    () => 'Selamat pagi',
  )

  const doneCount = tasks.filter((t) => t.done).length
  const pct =
    tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0

  // Perayaan saat semua tugas selesai — hanya sekali
  useEffect(() => {
    if (tasks.length > 0 && tasks.every((t) => t.done) && !firedRef.current) {
      firedRef.current = true
      setCelebrating(true)
      toast.success('Semua tugas selesai — hari yang produktif!')
    }
  }, [tasks, setCelebrating])

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#749B58] text-[#FAF9F6]">
        <StatusBar tone="matcha" />

        <div className="relative min-h-0 flex-1">
          {/* Cahaya ambien lembut */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 top-20 h-56 w-56 rounded-full bg-[#FAF9F6]/10 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 top-72 h-48 w-48 rounded-full bg-[#231F1E]/10 blur-3xl"
          />

          <div className="h-full overflow-y-auto no-scrollbar px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7">
            {/* Wordmark */}
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="text-center text-[15px] font-bold tracking-tight"
            >
              rutina<span className="text-[#231F1E]/60">.</span>
            </motion.p>

            {/* Blok tipografi terpusat */}
            <section
              className="relative mt-5 flex flex-col items-center text-center"
              aria-label="Sapaan dan ringkasan hari ini"
            >
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
                className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#FAF9F6]/70"
              >
                {dateLabel}
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.14, ease: EASE }}
                className={`${playfair.className} mt-3 text-[30px] italic leading-tight`}
              >
                {greeting},
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
                className={`${playfair.className} text-[42px] font-semibold leading-tight`}
              >
                Ananda.
              </motion.p>

              <motion.p
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
                className="mt-5 flex items-baseline gap-1"
              >
                <span
                  className={`${playfair.className} text-[76px] font-semibold leading-none`}
                >
                  <Counter to={pct} />
                </span>
                <span className="text-[22px] font-medium text-[#FAF9F6]/80">
                  %
                </span>
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.42 }}
                className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#FAF9F6]/65"
              >
                Tugas selesai hari ini
              </motion.p>
            </section>

            {/* Widget melayang — tersebar diagonal di bawah tipografi,
                berlapis dengan rotasi & osilasi lembut (tanpa menutupi teks) */}
            <section
              className="relative mt-5 h-[158px]"
              aria-label="Widget ringkas streak, fokus, dan jurnal"
            >
              <FloatWidget
                className="left-0 top-[6px]"
                rotate="-rotate-[4deg]"
                delay={0.45}
                dur={4.2}
                icon={Flame}
                value="21"
                label="hari streak"
                onTap={() =>
                  toast.info('Streak 21 hari berjalan', {
                    description: 'Rekor terpanjangmu 30 hari.',
                  })
                }
              />
              <FloatWidget
                className="right-0 top-[42px]"
                rotate="rotate-[3deg]"
                delay={0.58}
                dur={4.8}
                icon={Timer}
                value="14,5"
                label="jam fokus"
                onTap={() =>
                  toast.info('14,5 jam fokus pekan ini', {
                    description: 'Rata-rata 2,1 jam per hari.',
                  })
                }
              />
              <FloatWidget
                className="left-[104px] top-[90px]"
                rotate="-rotate-[2deg]"
                delay={0.7}
                dur={5.2}
                icon={BookOpen}
                value="34"
                label="catatan"
                onTap={() =>
                  toast.info('34 catatan tersimpan di jurnal', {
                    description: '4 folder aktif: Kerja, Ide, Bacaan, Pribadi.',
                  })
                }
              />
            </section>

            {/* Daftar tugas — kartu putih tipis */}
            <section className="mt-3" aria-label="Daftar tugas hari ini">
              <div className="mb-3.5 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-px flex-1 bg-[#FAF9F6]/25"
                />
                <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#FAF9F6]/80">
                  Hari Ini
                </h2>
                <span
                  aria-hidden="true"
                  className="h-px flex-1 bg-[#FAF9F6]/25"
                />
              </div>
              <div className="space-y-2">
                {tasks.map((t, i) => (
                  <motion.button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTask(t.id)}
                    aria-pressed={t.done}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-16px' }}
                    transition={{ duration: 0.4, delay: i * 0.04, ease: EASE }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl p-3.5 text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FAF9F6] ${
                      t.done ? 'bg-[#E4EFE0]' : 'bg-[#FAF9F6]'
                    }`}
                  >
                    <span
                      className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                        t.done
                          ? 'border-[#749B58] bg-[#749B58]'
                          : 'border-[#4A3B32]/25'
                      }`}
                    >
                      {t.done && (
                        <Check
                          className="h-3.5 w-3.5 text-[#FAF9F6]"
                          strokeWidth={3}
                        />
                      )}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-[14px] font-semibold transition-colors duration-200 ${
                        t.done
                          ? 'text-[#231F1E]/45 line-through'
                          : 'text-[#231F1E]'
                      }`}
                    >
                      {t.title}
                    </span>
                    <span
                      className={`${playfair.className} shrink-0 text-[12px] italic text-[#4A3B32]/55`}
                    >
                      {t.streak ? `${t.streak} hari` : (t.cat ?? 'harian')}
                    </span>
                  </motion.button>
                ))}
              </div>
            </section>

            {/* Kutipan refleksi — kartu garis tipis transparan */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mt-8 rounded-[20px] border border-[#FAF9F6]/35 p-5"
              aria-label="Refleksi hari ini"
            >
              <div className="flex items-start justify-between gap-3">
                <Quote className="h-5 w-5 shrink-0 text-[#FAF9F6]/55" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FAF9F6]/65">
                  Refleksi
                </span>
              </div>
              <p
                className={`${playfair.className} mt-3 text-[16px] italic leading-relaxed`}
              >
                &ldquo;{QUOTE_TEXT}&rdquo;
              </p>
              <p className="mt-2.5 text-[11px] font-medium text-[#FAF9F6]/70">
                — {QUOTE_AUTHOR}
              </p>
              <Button
                type="button"
                variant="ghost"
                disabled={quoteSaved}
                onClick={() => {
                  if (!quoteSaved) {
                    saveQuote()
                    toast.success('Kutipan disimpan ke jurnal')
                  }
                }}
                className="mt-4 h-9 w-full rounded-full border border-[#FAF9F6]/45 bg-transparent text-[12px] font-bold text-[#FAF9F6] hover:bg-[#FAF9F6]/10 hover:text-[#FAF9F6] disabled:opacity-70"
              >
                {quoteSaved ? (
                  <>
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                    Tersimpan di Jurnal
                  </>
                ) : (
                  'Simpan ke Jurnal'
                )}
              </Button>
            </motion.section>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <Button
                type="button"
                onClick={() => openCompose()}
                className="mt-4 h-11 w-full rounded-full bg-[#231F1E] text-[14px] font-bold text-[#FAF9F6] shadow-[0_10px_24px_rgba(35,31,30,0.28)] hover:bg-[#231F1E]/85"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Catatan Baru
              </Button>
            </motion.div>
          </div>
        </div>

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
