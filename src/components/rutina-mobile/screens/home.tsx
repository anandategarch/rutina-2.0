'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, useScroll, useTransform } from 'motion/react'
import * as m from 'motion/react-m'
import { animate } from 'animejs'
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  FlaskConical,
  Gift,
  Heart,
  Lightbulb,
  Plus,
  Quote,
  Sparkles,
  Undo2,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Counter } from '../counter'
import { playfair } from '../serif'
import { HeroDoodle } from '../hero-doodle'
import { PunchCard } from '../punch-card'
import { TaskRow } from '../task-row'
import { FocusWidget } from '../focus-widget'
import { StreakWidget } from '../streak-widget'
import {
  addDaysISO,
  computeLevel,
  computeXp,
  doneCountOn,
  folderCount,
  fromISO,
  habitsOn,
  habitStreak,
  isDoneOn,
  longDateLabel,
  QUOTE_AUTHOR,
  QUOTE_TEXT,
  shortDateLabel,
  todayISO,
  useRutina,
  WEEKDAY_MIN,
  XP_BONUS,
  XP_PER_TASK,
  XP_TARGET,
  type Completions,
  type FolderKey,
  type Habit,
} from '../store'

/* ===== Potongan kecil ===== */

/* Banner mode data contoh — jujur memisahkan demo dari data milik
   pengguna. Dua pilihan eksplisit: mulai bersih (hapus semua contoh)
   atau pakai contoh sebagai titik awal. */
function DemoBanner() {
  const demoMode = useRutina((s) => s.demoMode)
  const startFresh = useRutina((s) => s.startFresh)
  const keepSample = useRutina((s) => s.keepSample)

  return (
    <AnimatePresence initial={false}>
      {demoMode && (
        <m.section
          key="demo-banner"
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{
            opacity: 1,
            height: 'auto',
            marginBottom: '0.75rem',
          }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
          aria-label="Mode data contoh"
        >
          <div className="rounded-2xl border border-dashed border-[#B25E3F]/45 bg-[#F5F3EE] px-4 py-3.5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#B25E3F]/12 text-[#B25E3F]">
                <FlaskConical className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-[#231F1E]">
                  Data contoh
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-[#4A3B32]/80">
                  Kebiasaan, catatan, dan transaksi yang tampil masih contoh —
                  bukan datamu. Pilih cara memulai:
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      startFresh()
                      toast.success(
                        'Data contoh dibersihkan — mulailah dari nol.',
                      )
                    }}
                    className="h-9 cursor-pointer rounded-full bg-[#B25E3F] px-4 text-[12px] font-bold text-[#FAF9F6] shadow-soft transition-all hover:bg-[#9E4E33] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B25E3F]"
                  >
                    Mulai bersih
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      keepSample()
                      toast('Data contoh dipertahankan sebagai milikmu.')
                    }}
                    className="h-9 cursor-pointer rounded-full border border-[#4A3B32]/25 bg-white px-4 text-[12px] font-bold text-[#4A3B32] transition-all hover:bg-[#EAE5D9] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
                  >
                    Pakai contoh ini
                  </button>
                </div>
              </div>
            </div>
          </div>
        </m.section>
      )}
    </AnimatePresence>
  )
}

function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-baseline gap-2.5">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#4A3B32]">
          {title}
        </h2>
        {hint ? (
          <span className="truncate text-[12px] font-medium text-[#4A3B32]/75">
            {hint}
          </span>
        ) : null}
      </div>
      {action}
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

/* ===== Utilitas pekan (Senin = awal pekan) ===== */

/** Senin pada pekan yang memuat tanggal ISO tersebut. */
function weekStartISO(iso: string): string {
  const day = fromISO(iso).getDay() // 0=Minggu..6=Sabtu
  const diff = day === 0 ? -6 : 1 - day
  return addDaysISO(iso, diff)
}

/** Jumlah selesai sepanjang pekan (sampai tanggal yang dilihat). */
function weekDoneCount(c: Completions, habitId: string, iso: string): number {
  let cursor = weekStartISO(iso)
  let n = 0
  for (let i = 0; i < 7; i++) {
    if (cursor > iso) break
    if (isDoneOn(c, cursor, habitId)) n++
    cursor = addDaysISO(cursor, 1)
  }
  return n
}

/** Riwayat 14 hari terakhir berakhir pada tanggal yang dilihat. */
function recentDays(c: Completions, habitId: string, iso: string): boolean[] {
  const out: boolean[] = []
  for (let i = 13; i >= 0; i--) {
    out.push(isDoneOn(c, addDaysISO(iso, -i), habitId))
  }
  return out
}

/* ===== 1 — Horizontal Date Strip (kalender dua pekan, histori nyata) ===== */

interface DayChip {
  iso: string
  label: string
  dateNum: number
  isToday: boolean
  isFuture: boolean
  /** Jumlah kebiasaan selesai NYATA pada tanggal itu. */
  done: number
}

function DateStrip() {
  const completions = useRutina((s) => s.completions)
  const dailyGoal = useRutina((s) => s.dailyGoal)
  const selectedDate = useRutina((s) => s.selectedDate)
  const setSelectedDate = useRutina((s) => s.setSelectedDate)

  /* Layar Beranda hanya tampil setelah splash (klien murni) —
     perhitungan tanggal langsung aman. */
  const today = todayISO()

  const days = useMemo<DayChip[]>(() => {
    const chips: DayChip[] = []
    for (let i = -7; i <= 6; i++) {
      const iso = addDaysISO(today, i)
      const d = fromISO(iso)
      chips.push({
        iso,
        label: WEEKDAY_MIN[d.getDay()],
        dateNum: d.getDate(),
        isToday: i === 0,
        isFuture: i > 0,
        done: doneCountOn(completions, iso),
      })
    }
    return chips
  }, [completions, today])

  const stripRef = useRef<HTMLDivElement>(null)

  /* Gulir mulus ke hari ini begitu strip siap. */
  useEffect(() => {
    if (!stripRef.current) return
    const el = stripRef.current.querySelector('[data-today="true"]')
    el?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [])

  const goal = Math.max(dailyGoal, 1)
  const selected = days.find((d) => d.iso === selectedDate) ?? null

  return (
    <div className="sticky top-0 z-30 -mx-4 border-b border-[#4A3B32]/5 bg-[#FAF9F6]/92 px-4 pb-2 pt-2.5 backdrop-blur-md">
      <div
        ref={stripRef}
        role="group"
        aria-label="Kalender dua pekan"
        className="flex snap-x snap-mandatory gap-2 overflow-x-auto no-scrollbar"
      >
        {days.map((d) => {
          const isSelected = d.iso === selectedDate
          const done = d.done
          const caption = d.isFuture
            ? 'belum terjadi'
            : `${Math.min(done, goal)}/${goal} misi`
          return (
            <button
              key={d.iso}
              type="button"
              data-today={d.isToday ? 'true' : undefined}
              aria-pressed={isSelected}
              aria-current={d.isToday ? 'date' : undefined}
              aria-label={`${longDateLabel(d.iso)} — ${caption}`}
              onClick={() => setSelectedDate(d.iso)}
              className={
                'relative flex h-[54px] w-11 shrink-0 snap-center cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] ' +
                (d.isToday
                  ? 'bg-[#749B58] text-[#FAF9F6] shadow-[0_6px_16px_rgba(116,155,88,0.35)]'
                  : isSelected
                    ? 'bg-white text-[#231F1E] ring-2 ring-[#749B58] shadow-soft'
                    : d.isFuture
                      ? 'bg-white/40 text-[#4A3B32]/35'
                      : 'bg-white/80 text-[#4A3B32] hover:bg-white')
              }
            >
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
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
      <p className="mt-2 px-0.5 text-[12px] font-medium text-[#4A3B32]/75">
        {selected
          ? selected.isToday
            ? `Hari ini — ${Math.min(selected.done, goal)}/${goal} misi target tercapai`
            : selected.isFuture
              ? `${longDateLabel(selected.iso)} — belum terjadi`
              : `${longDateLabel(selected.iso)} — ${selected.done} misi selesai`
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
        <m.circle
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
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em] opacity-75">
          target
        </p>
      </div>
    </div>
  )
}

/* ===== Layar Beranda — histori nyata × gamified XP ===== */

export default function HomeScreen() {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const selectedDate = useRutina((s) => s.selectedDate)
  const setSelectedDate = useRutina((s) => s.setSelectedDate)
  const toggleHabit = useRutina((s) => s.toggleHabit)
  const openFolder = useRutina((s) => s.openFolder)
  const openCompose = useRutina((s) => s.openCompose)
  const quoteSaved = useRutina((s) => s.quoteSaved)
  const saveQuote = useRutina((s) => s.saveQuote)
  const notes = useRutina((s) => s.notes)
  const expandedTaskId = useRutina((s) => s.expandedTaskId)
  const toggleExpandedTask = useRutina((s) => s.toggleExpandedTask)
  const openHabitCreate = useRutina((s) => s.openHabitCreate)
  const openHabitEdit = useRutina((s) => s.openHabitEdit)
  const setHabitArchived = useRutina((s) => s.setHabitArchived)
  const setCelebrating = useRutina((s) => s.setCelebrating)
  const bonusClaimed = useRutina((s) => s.bonusClaimed)
  const claimBonus = useRutina((s) => s.claimBonus)
  const dailyGoal = useRutina((s) => s.dailyGoal)

  const [showArchive, setShowArchive] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const firedRef = useRef(false)
  const giftRef = useRef<HTMLSpanElement>(null)
  const prevBonusRef = useRef(bonusClaimed)

  const today = todayISO()
  const viewingToday = selectedDate === today
  const viewingPast = selectedDate < today

  /* Misi mengikuti tanggal yang dipilih — inilah inti histori nyata. */
  const dayHabits = useMemo(
    () => habitsOn(habits, selectedDate),
    [habits, selectedDate],
  )
  const archivedHabits = habits.filter((h) => h.archived)
  const doneToday = doneCountOn(completions, today)
  const doneSelected = doneCountOn(completions, selectedDate)

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

  /* Hero selalu merangkum HARI INI — terlepas tanggal mana yang dilihat. */
  const pct =
    dayHabits.length > 0 ? Math.round((doneToday / habitsOn(habits, today).length) * 100) : 0
  const xp = computeXp(doneToday, bonusClaimed)
  const level = computeLevel(xp)
  const xpProgress = Math.min(xp / XP_TARGET, 1)
  const remaining = Math.max(XP_TARGET - xp, 0)

  // Perayaan + toast saat SEMUA misi hari ini selesai — hanya sekali
  const todayHabits = habitsOn(habits, today)
  useEffect(() => {
    if (
      todayHabits.length > 0 &&
      todayHabits.every((h) => isDoneOn(completions, today, h.id)) &&
      !firedRef.current
    ) {
      firedRef.current = true
      setCelebrating(true)
      toast.success('Semua misi selesai — hari yang produktif!')
    }
  }, [completions, todayHabits, today, setCelebrating])

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

      {/* Banner mode contoh — tampil selagi pengguna belum memilih */}
      <DemoBanner />

      {/* Kalender dua pekan melayang (sticky) — histori nyata */}
      <DateStrip />

      {/* 1 — Hero: ringkasan harian + cincin target + progres XP */}
      <m.section
        style={{ y: heroY, opacity: heroOpacity }}
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Ringkasan harian"
        className="relative mt-4 overflow-hidden rounded-[24px] bg-[#749B58] p-6 pb-7 text-[#FAF9F6] shadow-leaf"
      >
        <HeroDoodle />
        <div className="relative z-10 sm:mx-auto sm:max-w-[600px]">
          <p className="text-[13px] font-medium text-[#FAF9F6]/80">
            {dateLabel}
          </p>
          <h1
            className={`${playfair.className} mt-1 text-balance text-[28px] font-semibold leading-tight tracking-tight`}
          >
            {greeting}, Ananda.
          </h1>

          <div className="mt-5 flex items-center gap-5">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-[#FAF9F6]/80">
                Misi selesai hari ini
              </p>
              <p className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-[56px] font-semibold leading-none tracking-tight">
                  <Counter to={pct} />
                </span>
                <span className="text-lg font-medium text-[#FAF9F6]/85">%</span>
              </p>
              <p className="mt-1.5 text-xs font-medium text-[#FAF9F6]/75">
                {doneToday} dari {todayHabits.length} misi •{' '}
                {Math.max(todayHabits.length - doneToday, 0)} tersisa
              </p>
            </div>
            <GoalRing done={doneToday} goal={dailyGoal} />
          </div>

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#FAF9F6]/25">
            <m.div
              initial={false}
              className="h-full rounded-full bg-[#FAF9F6]"
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 130, damping: 22 }}
            />
          </div>

          {/* Strip XP gamified di dalam hero — angka polos tanpa shimmer */}
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-espresso/35 px-3.5 py-2.5 backdrop-blur-sm">
            <span className="flex items-center gap-1.5 text-[12px] font-bold tabular-nums">
              <Zap className="h-3.5 w-3.5 text-pistachio" strokeWidth={2.4} />
              <Counter to={xp} /> XP
            </span>
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-[#FAF9F6]/20">
              <m.span
                initial={false}
                className="block h-full rounded-full bg-gradient-to-r from-[#A3C489] to-[#FAF9F6]"
                animate={{ width: `${xpProgress * 100}%` }}
                transition={{ type: 'spring', stiffness: 110, damping: 20 }}
              />
            </span>
            <span className="text-[11px] font-semibold tabular-nums text-[#FAF9F6]/75">
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
      </m.section>

      {/* 2 — Bonus harian (klaim XP) */}
      <m.section
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
          <m.span
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
          </m.span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold text-[#231F1E]">
              {bonusClaimed ? 'Bonus hari ini terklaim' : 'Klaim bonus harian'}
            </span>
            <span className="mt-0.5 block text-[12px] font-medium text-[#4A3B32]/75">
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
      </m.section>

      {/* 2.5 — Kartu stempel pekan (pola punch card, histori nyata) */}
      <PunchCard />

      {/* 3 — Daftar misi mengikuti tanggal terpilih */}
      <section className="mt-8" aria-label="Daftar misi">
        <SectionTitle
          title={viewingToday ? 'Misi Hari Ini' : 'Misi'}
          hint={
            viewingToday
              ? `${doneSelected}/${dayHabits.length} selesai`
              : shortDateLabel(selectedDate)
          }
          action={
            <button
              type="button"
              onClick={openHabitCreate}
              aria-label="Tambah kebiasaan baru"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#749B58] text-white shadow-soft transition-all hover:bg-[#658A4C] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.6} />
            </button>
          }
        />

        {/* Pita konteks tanggal lampau / masa depan */}
        {!viewingToday && (
          <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-[#D9B98C]/40 bg-[#F5F3EE] px-3.5 py-2.5">
            <CalendarDays className="h-4 w-4 shrink-0 text-[#A98650]" />
            <p className="min-w-0 flex-1 text-[12px] font-medium text-[#4A3B32]/85">
              {viewingPast
                ? `Melihat riwayat ${shortDateLabel(selectedDate)} — centang menyimpan untuk tanggal ini.`
                : `${longDateLabel(selectedDate)} — misi tampil sesuai jadwal, belum bisa dicentang.`}
            </p>
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              className="shrink-0 cursor-pointer rounded-full bg-[#749B58] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#658A4C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
            >
              Hari ini
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {dayHabits.map((h: Habit, i) => (
            <m.div
              key={h.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: Math.min(0.14 + i * 0.05, 0.4),
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <TaskRow
                habit={h}
                done={isDoneOn(completions, selectedDate, h.id)}
                streak={habitStreak(h, completions, selectedDate)}
                recent={recentDays(completions, h.id, selectedDate)}
                weekDone={weekDoneCount(completions, h.id, selectedDate)}
                expanded={expandedTaskId === h.id}
                readOnly={selectedDate > today}
                xp={XP_PER_TASK}
                onToggle={() => toggleHabit(h.id, selectedDate)}
                onExpand={() => toggleExpandedTask(h.id)}
                onEdit={() => openHabitEdit(h.id)}
              />
            </m.div>
          ))}
        </div>

        {dayHabits.length === 0 && (
          <div className="flex flex-col items-center rounded-[20px] border-2 border-dashed border-[#749B58]/30 bg-white/60 px-6 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E4EFE0] text-[#658A4C]">
              <CalendarDays className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[14px] font-bold text-[#231F1E]">
              Tidak ada misi terjadwal
            </p>
            <p className="mt-1 text-[12px] font-medium text-[#4A3B32]/75">
              {shortDateLabel(selectedDate)} bebas — atau tambah kebiasaan baru.
            </p>
            <Button
              type="button"
              onClick={openHabitCreate}
              className="mt-4 h-10 rounded-full bg-[#749B58] px-5 text-[13px] font-bold text-white hover:bg-[#658A4C]"
            >
              <Plus className="h-4 w-4" />
              Kebiasaan Baru
            </Button>
          </div>
        )}

        {/* Arsip — pulihkan atau sunting kebiasaan yang ditanggalkan */}
        {archivedHabits.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowArchive((v) => !v)}
              aria-expanded={showArchive}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-[#4A3B3214] bg-white px-3.5 py-2.5 text-left shadow-soft transition-colors hover:bg-[#F5F3EE] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
            >
              <span className="flex items-center gap-2 text-[12px] font-bold text-[#4A3B32]">
                <Archive className="h-3.5 w-3.5" />
                Arsip · {archivedHabits.length} kebiasaan
              </span>
              <m.span
                aria-hidden="true"
                animate={{ rotate: showArchive ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="text-[#4A3B32]/50"
              >
                <ChevronDown className="h-4 w-4" />
              </m.span>
            </button>
            {showArchive && (
              <m.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-2 space-y-2"
              >
                {archivedHabits.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 rounded-2xl border border-[#4A3B3214] bg-white px-3.5 py-2.5 shadow-soft"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAE5D9] text-[#4A3B32]/60">
                      <Archive className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-[#231F1E]/70">
                        {h.title}
                      </span>
                      <span className="block text-[11px] font-medium text-[#4A3B32]/70">
                        {h.cat} · diarsipkan
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setHabitArchived(h.id, false)
                        toast.success('Kebiasaan dipulihkan dari arsip')
                      }}
                      aria-label={`Pulihkan ${h.title} dari arsip`}
                      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#749B58]/40 text-[#658A4C] transition-colors hover:bg-[#E4EFE0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
                    >
                      <ArchiveRestore className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openHabitEdit(h.id)}
                      aria-label={`Sunting ${h.title}`}
                      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#4A3B32]/25 text-[#4A3B32] transition-colors hover:bg-[#EAE5D9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
                    >
                      <Undo2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </m.div>
            )}
          </div>
        )}
      </section>

      {/* 4 — Bento insight: aktivitas & streak berdampingan */}
      <section className="mt-8" aria-label="Insight pekan ini">
        <SectionTitle title="Insight Pekan" hint="Aktivitas & konsistensi" />
        <div className="grid grid-cols-2 gap-3">
          <FocusWidget />
          <StreakWidget />
        </div>
      </section>

      {/* 5 — Kartu Kategori / Folder (jumlah dihitung nyata) */}
      <section className="mt-8" aria-label="Koleksi folder catatan">
        <SectionTitle
          title="Koleksi"
          hint={`${FOLDER_ICONS ? Object.keys(FOLDER_ICONS).length : 0} folder`}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(FOLDER_ICONS) as FolderKey[]).map((key, i) => {
            const Icon = FOLDER_ICONS[key]
            const label =
              key === 'kerja'
                ? 'Kerja'
                : key === 'ide'
                  ? 'Ide & Gagasan'
                  : key === 'bacaan'
                    ? 'Bacaan'
                    : 'Pribadi'
            const count = folderCount(notes, key)
            return (
              <m.div
                key={key}
                role="button"
                tabIndex={0}
                aria-label={`Buka folder ${label}, ${count} catatan`}
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
                onClick={() => openFolder(key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openFolder(key)
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
                    aria-label={`Buat catatan baru di folder ${label}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      openCompose(key)
                    }}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#E4EFE0]/70 text-[#4A3B32] transition-colors hover:bg-[#E4EFE0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                </div>
                <span>
                  <span className="block text-[15px] font-semibold leading-tight text-[#231F1E]">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-[#4A3B32]/75">
                    {count} Catatan
                  </span>
                </span>
              </m.div>
            )
          })}
        </div>
      </section>

      {/* 6 — Kartu Kutipan & Pengingat (pembatas visual) */}
      <m.section
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
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5F3EE]/70">
              Refleksi Hari Ini
            </span>
          </div>
          <p
            className={`${playfair.className} mt-4 text-balance text-[17px] italic leading-relaxed text-[#F5F3EE]`}
          >
            &ldquo;{QUOTE_TEXT}&rdquo;
          </p>
          <p className="mt-3 text-xs font-medium text-[#F5F3EE]/75">
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
      </m.section>
    </div>
  )
}
