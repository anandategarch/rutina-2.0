'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { animate } from 'animejs'
import {
  BookOpen,
  Check,
  Gift,
  Heart,
  Lightbulb,
  Plus,
  Quote,
  Sparkles,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Counter } from '../counter'
import { playfair } from '../serif'
import { HeroDoodle } from '../hero-doodle'
import { TaskRow } from '../task-row'
import { FocusWidget } from '../focus-widget'
import { StreakWidget } from '../streak-widget'
import {
  computeLevel,
  computeXp,
  FOLDERS,
  QUOTE_AUTHOR,
  QUOTE_TEXT,
  useRutina,
  XP_BONUS,
  XP_PER_TASK,
  XP_TARGET,
  type FolderKey,
} from '../store'

/* ===== Potongan kecil ===== */

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

const FOLDER_ICONS: Record<FolderKey, LucideIcon> = {
  kerja: BookOpen,
  ide: Lightbulb,
  bacaan: BookOpen,
  pribadi: Heart,
}

/* Tanggal & sapaan live — nilai khusus klien yang aman dari hydration:
   snapshot server kosong, snapshot klien terisi setelah mount. */
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

/* ===== 1 — Horizontal Date Strip (kalender mingguan melayang) ===== */

const DAY_MINI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

interface DayChip {
  key: string
  label: string
  dateNum: number
  full: string
  isToday: boolean
  isFuture: boolean
  /** Capaian pseudo-deterministik (misi selesai) untuk hari selain hari ini. */
  done: number
}

function buildDays(totalTasks: number): DayChip[] {
  const today = new Date()
  const chips: DayChip[] = []
  for (let i = -7; i <= 6; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const isToday = i === 0
    const dateNum = d.getDate()
    chips.push({
      key: d.toDateString(),
      label: DAY_MINI[d.getDay()],
      dateNum,
      full: new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(d),
      isToday,
      isFuture: i > 0,
      done: isToday
        ? -1
        : Math.min(((dateNum * 7) % 6) + 1, Math.max(totalTasks, 1)),
    })
  }
  return chips
}

/* Snapshot klien untuk useSyncExternalStore — di-cache per (hari, jumlah
   tugas) agar referensi stabil dan tidak memicu render berulang. */
let daysCache: { key: string; days: DayChip[] } | null = null
function getDaysSnapshot(totalTasks: number): DayChip[] {
  const key = `${new Date().toDateString()}#${totalTasks}`
  if (daysCache?.key === key) return daysCache.days
  daysCache = { key, days: buildDays(totalTasks) }
  return daysCache.days
}

function DateStrip({
  doneCount,
  totalTasks,
}: {
  doneCount: number
  totalTasks: number
}) {
  const dailyGoal = useRutina((s) => s.dailyGoal)
  /* Tanggal klien via useSyncExternalStore — snapshot server kosong
     (kerangka), snapshot klien terisi setelah mount. Aman dari hydration. */
  const days = useSyncExternalStore(
    emptySubscribe,
    () => getDaysSnapshot(totalTasks),
    () => null,
  )
  /* null = ikuti hari ini (tanpa setState di dalam effect). */
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  /* Gulir mulus ke hari ini begitu strip siap. */
  useEffect(() => {
    if (!days || !stripRef.current) return
    const el = stripRef.current.querySelector('[data-today="true"]')
    el?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [days])

  const selected = days
    ? (days.find((d) => d.key === selectedKey) ??
      days.find((d) => d.isToday) ??
      null)
    : null
  const goal = Math.max(dailyGoal, 1)

  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-[#4A3B32]/5 bg-[#F5F3EE]/92 px-4 pb-2 pt-2.5 backdrop-blur-md">
      <div
        ref={stripRef}
        role="group"
        aria-label="Kalender dua pekan"
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto no-scrollbar"
      >
        {(days ?? Array.from({ length: 7 }, () => null)).map((d, i) => {
          if (!d) {
            /* Kerangka memuat sebelum tanggal klien tersedia (aman SSR) */
            return (
              <span
                key={`skeleton-${i}`}
                aria-hidden="true"
                className="h-[54px] w-11 shrink-0 animate-pulse rounded-2xl bg-[#4A3B32]/8"
              />
            )
          }
          const isSelected = d.key === selectedKey
          const done = d.isToday ? doneCount : d.done
          const full = d.isFuture
            ? 'belum terjadi'
            : `${Math.min(done, goal)}/${goal} misi`
          return (
            <button
              key={d.key}
              type="button"
              data-today={d.isToday ? 'true' : undefined}
              aria-pressed={isSelected}
              aria-label={`${d.full} — ${full}`}
              onClick={() => setSelectedKey(d.key)}
              className={
                'relative flex h-[54px] w-11 shrink-0 snap-center cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] ' +
                (d.isToday
                  ? 'bg-[#749B58] text-[#FAF9F6] shadow-[0_6px_16px_rgba(116,155,88,0.35)]'
                  : isSelected
                    ? 'bg-white text-[#231F1E] ring-2 ring-[#749B58]'
                    : d.isFuture
                      ? 'bg-white/40 text-[#4A3B32]/35'
                      : 'bg-white/80 text-[#4A3B32] hover:bg-white')
              }
            >
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-75">
                {d.label}
              </span>
              <span className="text-[15px] font-bold leading-none tabular-nums">
                {d.dateNum}
              </span>
              {!d.isFuture && (
                <span
                  aria-hidden="true"
                  className={
                    'absolute bottom-1 h-1 w-1 rounded-full ' +
                    (done >= goal
                      ? d.isToday
                        ? 'bg-[#FAF9F6]'
                        : 'bg-[#749B58]'
                      : 'bg-[#749B58]/30')
                  }
                />
              )}
            </button>
          )
        })}
      </div>
      <p className="mt-2 px-0.5 text-[11px] font-medium text-[#4A3B32]/70">
        {selected
          ? selected.isToday
            ? `Hari ini — ${Math.min(doneCount, goal)}/${goal} misi target tercapai`
            : selected.isFuture
              ? `${selected.full} — belum terjadi`
              : `${selected.full} — ${selected.done} misi selesai`
          : 'Memuat kalender…'}
      </p>
    </div>
  )
}

/* ===== 2 — Circular Progress Ring (cincin progres target harian) ===== */

const GOAL_RING_CIRC = 2 * Math.PI * 40

function GoalRing({ done, goal }: { done: number; goal: number }) {
  const progress = Math.min(done / Math.max(goal, 1), 1)
  return (
    <div
      className="relative h-[92px] w-[92px] shrink-0"
      role="img"
      aria-label={`Progres target harian: ${done} dari ${goal} misi`}
    >
      <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke="#FAF9F6"
          strokeOpacity="0.25"
          strokeWidth="8"
        />
        <motion.circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke="#FAF9F6"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={GOAL_RING_CIRC}
          initial={{ strokeDashoffset: GOAL_RING_CIRC }}
          animate={{ strokeDashoffset: GOAL_RING_CIRC * (1 - progress) }}
          transition={{ type: 'spring', stiffness: 110, damping: 20 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[17px] font-bold leading-none tabular-nums">
          {done}
          <span className="text-[11px] font-semibold opacity-60">/{goal}</span>
        </p>
        <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.18em] opacity-70">
          target
        </p>
      </div>
    </div>
  )
}

/* ===== Layar Beranda — Bento Grid × Gamified XP ===== */

export default function HomeScreen() {
  const tasks = useRutina((s) => s.tasks)
  const toggleTask = useRutina((s) => s.toggleTask)
  const openFolder = useRutina((s) => s.openFolder)
  const openCompose = useRutina((s) => s.openCompose)
  const quoteSaved = useRutina((s) => s.quoteSaved)
  const saveQuote = useRutina((s) => s.saveQuote)
  const expandedTaskId = useRutina((s) => s.expandedTaskId)
  const toggleExpandedTask = useRutina((s) => s.toggleExpandedTask)
  const setCelebrating = useRutina((s) => s.setCelebrating)
  const bonusClaimed = useRutina((s) => s.bonusClaimed)
  const claimBonus = useRutina((s) => s.claimBonus)
  const dailyGoal = useRutina((s) => s.dailyGoal)

  const scrollRef = useRef<HTMLDivElement>(null)
  const firedRef = useRef(false)
  const giftRef = useRef<HTMLSpanElement>(null)
  const prevBonusRef = useRef(bonusClaimed)

  /* anime.js — ledakan elastis pada ikon hadiah tepat saat bonus diklaim */
  useEffect(() => {
    if (bonusClaimed && !prevBonusRef.current && giftRef.current) {
      const anim = animate(giftRef.current, {
        scale: [1, 1.4, 1],
        rotate: [0, -14, 9, 0],
        duration: 750,
        ease: 'outBack(2.2)',
      })
      prevBonusRef.current = true
      return () => {
        anim.revert()
      }
    }
    prevBonusRef.current = bonusClaimed
  }, [bonusClaimed])

  /* Parallax lembut: hero bergeser & memudar saat daftar digulir */
  const { scrollY } = useScroll({ container: scrollRef })
  const heroY = useTransform(scrollY, [0, 180], [0, 36])
  const heroOpacity = useTransform(scrollY, [0, 160], [1, 0.35])

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
  const xp = computeXp(doneCount, bonusClaimed)
  const level = computeLevel(xp)
  const xpProgress = Math.min(xp / XP_TARGET, 1)
  const remaining = Math.max(XP_TARGET - xp, 0)

  // Perayaan + toast saat semua tugas selesai — hanya sekali
  useEffect(() => {
    if (tasks.length > 0 && tasks.every((t) => t.done) && !firedRef.current) {
      firedRef.current = true
      setCelebrating(true)
      toast.success('Semua misi selesai — hari yang produktif!')
    }
  }, [tasks, setCelebrating])

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto no-scrollbar px-4 pb-28"
    >
      {/* Header aplikasi — wordmark + level + avatar */}
      <header className="mb-4 flex items-center justify-between pt-[max(1.25rem,env(safe-area-inset-top))]">
        <p className="text-[19px] font-bold tracking-tight text-[#231F1E]">
          rutina<span className="text-[#749B58]">.</span>
        </p>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 items-center gap-1.5 rounded-full border border-[#749B5833] bg-white px-3 text-[11px] font-bold text-[#658A4C] shadow-sm">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
            LV {level}
          </span>
          <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
            <AvatarFallback className="bg-cocoa text-[11px] font-bold tracking-widest text-parchment">
              AN
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Kalender mingguan melayang (sticky) */}
      <DateStrip doneCount={doneCount} totalTasks={tasks.length} />

      {/* 1 — Hero: ringkasan harian + cincin target + progres XP */}
      <motion.section
        style={{ y: heroY, opacity: heroOpacity }}
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Ringkasan harian"
        className="relative mt-4 overflow-hidden rounded-[24px] bg-[#749B58] p-6 pb-7 text-[#FAF9F6] shadow-leaf"
      >
        <HeroDoodle />
        <div className="relative z-10 sm:mx-auto sm:max-w-[600px]">
          <p className="text-[13px] font-medium text-[#FAF9F6]/75">
            {dateLabel}
          </p>
          <h1
            className={`${playfair.className} mt-1 text-balance text-[28px] font-semibold leading-tight tracking-tight`}
          >
            {greeting}, Ananda.
          </h1>

          <div className="mt-5 flex items-center gap-5">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-[#FAF9F6]/75">
                Tugas selesai
              </p>
              <p className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-[56px] font-semibold leading-none tracking-tight">
                  <Counter to={pct} />
                </span>
                <span className="text-lg font-medium text-[#FAF9F6]/80">%</span>
              </p>
              <p className="mt-1.5 text-xs font-medium text-[#FAF9F6]/70">
                {doneCount} dari {tasks.length} tugas •{' '}
                {tasks.length - doneCount} tersisa
              </p>
            </div>
            <GoalRing done={doneCount} goal={dailyGoal} />
          </div>

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#FAF9F6]/25">
            <motion.div
              initial={false}
              className="h-full rounded-full bg-[#FAF9F6]"
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 130, damping: 22 }}
            />
          </div>

          {/* Strip XP gamified di dalam hero — angka berkilau (shimmer) */}
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-espresso/35 px-3.5 py-2.5 backdrop-blur-sm">
            <span className="flex items-center gap-1.5 text-[12px] font-bold tabular-nums">
              <Zap className="h-3.5 w-3.5 text-pistachio" strokeWidth={2.4} />
              <span className="text-shimmer">
                <Counter to={xp} /> XP
              </span>
            </span>
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-[#FAF9F6]/20">
              <motion.span
                initial={false}
                className="block h-full rounded-full bg-gradient-to-r from-[#A3C489] to-[#FAF9F6]"
                animate={{ width: `${xpProgress * 100}%` }}
                transition={{ type: 'spring', stiffness: 110, damping: 20 }}
              />
            </span>
            <span className="text-[10px] font-semibold tabular-nums text-[#FAF9F6]/70">
              {remaining > 0 ? `${remaining} XP lagi` : 'MAX'}
            </span>
          </div>

          <Button
            type="button"
            onClick={() => openCompose()}
            className="mt-4 h-11 w-full rounded-full bg-[#FAF9F6] text-[15px] font-semibold text-[#231F1E] shadow-[0_8px_20px_rgba(35,31,30,0.16)] hover:bg-white hover:shadow-[0_10px_26px_rgba(35,31,30,0.22)]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Catatan Baru
          </Button>
        </div>
      </motion.section>

      {/* 2 — Bonus harian (klaim XP) */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Bonus harian"
        className="mt-3"
      >
        <button
          type="button"
          disabled={bonusClaimed}
          onClick={() => {
            claimBonus()
            toast.success(`Bonus harian diklaim — tambah ${XP_BONUS} XP!`)
          }}
          className={
            'flex w-full cursor-pointer items-center gap-3.5 rounded-[18px] border p-3.5 text-left transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] ' +
            (bonusClaimed
              ? 'border-[#749B5826] bg-[#E4EFE0]/60'
              : 'border-dashed border-[#749B58]/45 bg-white hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(116,155,88,0.18)]')
          }
        >
          <motion.span
            aria-hidden="true"
            className={
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full ' +
              (bonusClaimed
                ? 'bg-matcha/20 text-[#658A4C]'
                : 'bg-matcha text-white')
            }
            animate={bonusClaimed ? { scale: 1 } : { scale: [1, 1.07, 1] }}
            transition={
              bonusClaimed
                ? undefined
                : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
            }
          >
            {/* Pembungkus dalam: target anime.js terpisah dari motion —
                keduanya menulis transform tanpa saling menimpa. */}
            <span ref={giftRef} className="flex">
              {bonusClaimed ? (
                <Check className="h-5 w-5" strokeWidth={2.6} />
              ) : (
                <Gift className="h-5 w-5" strokeWidth={1.9} />
              )}
            </span>
          </motion.span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold text-[#231F1E]">
              {bonusClaimed ? 'Bonus hari ini terklaim' : 'Klaim bonus harian'}
            </span>
            <span className="mt-0.5 block text-[12px] font-medium text-[#4A3B32]/70">
              {bonusClaimed
                ? `+${XP_BONUS} XP sudah masuk ke saldo kamu`
                : `Hadiah konsistensi: +${XP_BONUS} XP gratis setiap hari`}
            </span>
          </span>
          {!bonusClaimed && (
            <span className="shrink-0 rounded-full bg-[#749B58]/15 px-2.5 py-1 text-[11px] font-bold text-[#658A4C]">
              +{XP_BONUS} XP
            </span>
          )}
        </button>
      </motion.section>

      {/* 3 — Daftar misi & kebiasaan */}
      <section className="mt-8" aria-label="Daftar tugas harian">
        <SectionTitle
          title="Misi Hari Ini"
          hint={`${doneCount}/${tasks.length} selesai`}
        />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {tasks.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.14 + i * 0.05,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <TaskRow
                task={t}
                done={t.done}
                expanded={expandedTaskId === t.id}
                xp={XP_PER_TASK}
                onToggle={() => toggleTask(t.id)}
                onExpand={() => toggleExpandedTask(t.id)}
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4 — Bento insight: fokus & streak berdampingan */}
      <section className="mt-8" aria-label="Insight pekan ini">
        <SectionTitle title="Insight Pekan" hint="Fokus & konsistensi" />
        <div className="grid grid-cols-2 gap-3">
          <FocusWidget />
          <StreakWidget />
        </div>
      </section>

      {/* 5 — Kartu Kategori / Folder */}
      <section className="mt-8" aria-label="Koleksi folder catatan">
        <SectionTitle title="Koleksi" hint="4 folder" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FOLDERS.map((f, i) => {
            const Icon = FOLDER_ICONS[f.key]
            return (
              <motion.div
                key={f.key}
                role="button"
                tabIndex={0}
                aria-label={`Buka folder ${f.label}, ${f.count} catatan`}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{
                  duration: 0.45,
                  delay: i * 0.05,
                  ease: [0.22, 1, 0.36, 1],
                }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => openFolder(f.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openFolder(f.key)
                  }
                }}
                className="flex aspect-square cursor-pointer flex-col justify-between rounded-[20px] bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-pop focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E4EFE0] text-[#4A3B32]">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  </span>
                  <button
                    type="button"
                    aria-label={`Buat catatan baru di folder ${f.label}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      openCompose(f.key)
                    }}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#E4EFE0]/70 text-[#4A3B32] transition-colors hover:bg-[#E4EFE0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>
                <span>
                  <span className="block text-[15px] font-semibold leading-tight text-[#231F1E]">
                    {f.label}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-[#4A3B32]/70">
                    {f.count} Catatan
                  </span>
                </span>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* 6 — Kartu Kutipan & Pengingat (pembatas visual) */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Refleksi hari ini"
        className="mt-8 rounded-[20px] bg-[#4A3B32] p-6 text-[#F5F3EE] shadow-ink"
      >
        <div className="sm:mx-auto sm:max-w-[600px]">
        <div className="flex items-start justify-between gap-3">
          <Quote className="h-6 w-6 shrink-0 text-[#F5F3EE]/45" />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5F3EE]/60">
            Refleksi Hari Ini
          </span>
        </div>
        <p
          className={`${playfair.className} mt-4 text-balance text-[17px] italic leading-relaxed text-[#F5F3EE]`}
        >
          &ldquo;{QUOTE_TEXT}&rdquo;
        </p>
        <p className="mt-3 text-xs font-medium text-[#F5F3EE]/70">
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
          className="mt-5 h-9 rounded-full border border-[#F5F3EE]/35 px-4 text-[13px] font-semibold text-[#F5F3EE] hover:bg-[#F5F3EE]/10 hover:text-[#F5F3EE] disabled:opacity-60"
        >
          {quoteSaved ? <Check className="h-4 w-4" strokeWidth={2.5} /> : null}
          {quoteSaved ? 'Tersimpan di Jurnal' : 'Simpan ke Jurnal'}
        </Button>
        </div>
      </motion.section>
    </div>
  )
}
