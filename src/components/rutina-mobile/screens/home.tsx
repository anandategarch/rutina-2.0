'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, useReducedMotion, useScroll, useTransform } from 'motion/react'
import * as m from 'motion/react-m'
import { animate } from 'animejs'
import {
  Archive,
  ArchiveRestore,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Flame,
  FlaskConical,
  Gift,
  Heart,
  Lightbulb,
  Minimize2,
  Plus,
  Quote,
  Sun,
  Sunrise,
  Sunset,
  TrendingUp,
  Undo2,
  Wallet,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Counter } from '../counter'
import { playfair } from '../serif'
import { PunchCard, punchWeekInfo } from '../punch-card'
import { TaskRow } from '../task-row'
import { FocusWidget } from '../focus-widget'
import { StreakWidget } from '../streak-widget'
import { HomeProgressRing } from '../home-progress-ring'
import { HomeFinanceCard } from '../home-finance-card'
import { PlantGarden } from '../plant-garden'
import {
  goldilocksOf,
  missedYesterday,
  type GoldilocksAdvice,
} from '../habit-coach'
import { RutinaCard } from '../rutina-card'
import { RutinaSectionHeader } from '../rutina-section-header'
import { RutinaEmptyState } from '../rutina-empty-state'
import { RutinaBentoGrid, RutinaBentoItem } from '../rutina-bento'
import { RutinaMetric } from '../rutina-metric'
import { formatIDRShort } from '../finance/utils'
import { motionTokens } from '@/lib/motion/tokens'
import {
  addDaysISO,
  bestStreak,
  computeLevel,
  computeXp,
  dailyQuote,
  doneCountOn,
  FOLDERS,
  folderCount,
  fromISO,
  habitsOn,
  habitStreak,
  isDoneOn,
  longDateLabel,
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
          transition={{ duration: 0.38, ease: motionTokens.easing.standard }}
          className="overflow-hidden"
          aria-label="Mode data contoh"
        >
          <div className="rounded-2xl border border-dashed border-destructive/45 bg-surface-sunken px-4 py-3.5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/12 text-content-danger">
                <FlaskConical className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-note font-semibold text-content-primary">
                  Data contoh
                </p>
                <p className="mt-0.5 text-meta leading-relaxed text-content-muted">
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
                    className="h-9 cursor-pointer rounded-full bg-destructive px-4 text-meta font-bold text-destructive-foreground shadow-soft transition-all hover:bg-destructive/90 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
                  >
                    Mulai bersih
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      keepSample()
                      toast('Data contoh dipertahankan sebagai milikmu.')
                    }}
                    className="h-9 cursor-pointer rounded-full border border-border bg-surface-primary px-4 text-meta font-bold text-content-secondary transition-all hover:bg-surface-secondary active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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

const FOLDER_ICONS: Record<FolderKey, LucideIcon> = {
  kerja: BookOpen,
  ide: Lightbulb,
  bacaan: BookOpen,
  pribadi: Heart,
}

/* ===== Punch card terlipat — progres lanjutan (review Beranda v2.13).
   Pemicu selalu menampilkan ringkasan "X dari 7 hari tuntas"; detail
   lubang stempel dibuka bila pengguna ingin melihat. State lipatan
   sesaat per kunjungan (default tertutup) — bukan preferensi penting. */
function FoldedPunchCard() {
  const completions = useRutina((s) => s.completions)
  const dailyGoal = useRutina((s) => s.dailyGoal)
  const { stampedCount } = useMemo(
    () => punchWeekInfo(completions, Math.max(dailyGoal, 1)),
    [completions, dailyGoal],
  )
  return (
    <Collapsible defaultOpen={false}>
      <div className="overflow-hidden rounded-[20px] border-2 border-dashed border-primary/35 bg-surface-primary shadow-card">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label={`Kartu stempel pekan: ${stampedCount} dari 7 hari tuntas — buka untuk melihat detail`}
            className="group flex w-full cursor-pointer items-center gap-3 p-3.5 text-left transition-colors hover:bg-surface-sunken/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Flame className="h-[18px] w-[18px]" strokeWidth={2.1} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold text-content-primary">
                Kartu Stempel Pekan
              </span>
              <span className="mt-0.5 block text-meta font-medium text-content-muted">
                {stampedCount} dari 7 hari tuntas
                {stampedCount === 7 ? ' — pekan sempurna!' : ''}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {stampedCount === 7 && (
                <span className="rounded-full bg-primary px-2.5 py-1 text-eyebrow font-semibold text-primary-foreground shadow-leaf">
                  Sempurna
                </span>
              )}
              <ChevronDown
                aria-hidden="true"
                className="h-4 w-4 text-content-muted transition-transform duration-300 group-data-[state=open]:rotate-180"
              />
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* mt-3 internal PunchCard dinetralkan oleh pembungkus */}
          <div className="border-t border-primary/15 p-5 [&>section]:mt-0 [&>section]:rounded-none [&>section]:border-0">
            <PunchCard />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

/* Tanggal & sapaan live — nilai khusus klien yang aman dari hydration:
   snapshot server kosong, snapshot klien terisi setelah mount. */
const emptySubscribe = () => () => {}

/** Lencana tanggal small-caps: "SELASA, 18 NOV". */
function getClientDateBadge(): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
    .format(new Date())
    .toUpperCase()
}

/** Sapaan Playfair sesuai jam lokal pembuka aplikasi. */
function getClientGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat pagi.'
  if (hour < 14) return 'Selamat siang.'
  if (hour < 18) return 'Selamat sore.'
  return 'Selamat malam.'
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

/** Total misi selesai seluruh kebiasaan sepanjang pekan (Senin s.d. iso).
 *  (Audit visualisasi v2.12: tile misi-pekan di Insight hari ini dihapus —
 *  grafik FocusWidget menampilkan informasi yang sama; fungsi dipertahankan
 *  untuk FocusWidget bila kelak butuh derivasi serupa.) */

/** Riwayat 14 hari terakhir berakhir pada tanggal yang dilihat. */
function recentDays(c: Completions, habitId: string, iso: string): boolean[] {
  const out: boolean[] = []
  for (let i = 13; i >= 0; i--) {
    out.push(isDoneOn(c, addDaysISO(iso, -i), habitId))
  }
  return out
}

/* ===== Kalender dua pekan (histori nyata) ===== */

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
    <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-surface-primary/92 px-4 pb-2 pt-2.5 backdrop-blur-md">
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
                'relative flex h-[54px] w-11 shrink-0 snap-center cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
                (d.isToday
                  ? 'bg-primary text-primary-foreground shadow-leaf'
                  : isSelected
                    ? 'bg-surface-primary text-content-primary ring-2 ring-primary shadow-soft'
                    : d.isFuture
                      ? 'bg-surface-primary/40 text-content-muted'
                      : 'bg-surface-primary/80 text-content-secondary hover:bg-surface-primary')
              }
            >
              <span className="text-chart-label font-semibold uppercase tracking-wider opacity-75">
                {d.label}
              </span>
              <span className="text-section font-bold leading-none tabular-nums">
                {d.dateNum}
              </span>
              {!d.isFuture && (
                <span
                  aria-hidden="true"
                  className={
                    'absolute bottom-1 h-1 w-1 rounded-full ' +
                    (done >= goal
                      ? d.isToday
                        ? 'bg-primary-foreground'
                        : 'bg-primary'
                      : 'bg-primary/30')
                  }
                />
              )}
            </button>
          )
        })}
      </div>
      <p className="mt-2 px-0.5 text-meta font-medium text-content-muted">
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

/* ===== Agenda hari ini — pengelompokan berdasarkan jam pengingat ===== */

type AgendaSlot = 'pagi' | 'siang' | 'malam' | 'bebas'

const SLOT_META: { key: AgendaSlot; label: string; icon: LucideIcon }[] = [
  { key: 'pagi', label: 'Pagi', icon: Sunrise },
  { key: 'siang', label: 'Siang', icon: Sun },
  { key: 'malam', label: 'Malam', icon: Sunset },
  { key: 'bebas', label: 'Kapan saja', icon: Clock },
]

/** Kelompok waktu sebuah kebiasaan dari jam pengingat ("HH:MM").
 *  Tanpa pengingat → "Kapan saja" (selalu ditempatkan terakhir). */
function slotOf(h: Habit): AgendaSlot {
  const r = h.reminder
  if (!r) return 'bebas'
  if (r < '12:00') return 'pagi'
  if (r < '17:00') return 'siang'
  return 'malam'
}

/* ===== Layar Beranda — Editorial Daybook =====
   Bukan dasbor statistik, melainkan buku harian digital yang membantu
   memahami HARI INI. Tata letak "daybook": ritme jarak antar-bagian
   ditarik dari token --layout-gap (data-layout), hero progres berendam
   di garden-surface, dan agenda hidup sebagai halaman planner kertas
   (paper-surface) dengan rel timeline per waktu. */

export default function HomeScreen() {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const selectedDate = useRutina((s) => s.selectedDate)
  const setSelectedDate = useRutina((s) => s.setSelectedDate)
  const toggleHabit = useRutina((s) => s.toggleHabit)
  const openFolder = useRutina((s) => s.openFolder)
  const openCompose = useRutina((s) => s.openCompose)
  const quoteSavedDate = useRutina((s) => s.quoteSavedDate)
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
  const setScreen = useRutina((s) => s.setScreen)
  const txs = useRutina((s) => s.txs)

  const [showArchive, setShowArchive] = useState(false)
  const [showDone, setShowDone] = useState(false)

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
  /* Pembungkus garden-surface Taman hanya dirender bila ada kebiasaan
     aktif — PlantGarden sendiri mengembalikan null saat kosong. */
  const hasActiveHabits = habits.some((h) => !h.archived)

  /* Hero selalu merangkum HARI INI — terlepas tanggal mana yang dilihat. */
  const todayHabits = useMemo(() => habitsOn(habits, today), [habits, today])
  const doneToday = doneCountOn(completions, today)
  const pct =
    todayHabits.length > 0
      ? Math.min(Math.round((doneToday / todayHabits.length) * 100), 100)
      : 0
  const missionRemaining = Math.max(todayHabits.length - doneToday, 0)
  const xp = computeXp(doneToday, bonusClaimed)
  const level = computeLevel(xp)
  const xpProgress = Math.min(xp / XP_TARGET, 1)
  const xpRemaining = Math.max(XP_TARGET - xp, 0)
  /* Streak hero chip — bestStreak dipakai chip hero; tile duplikat sudah
     dihapus (audit visualisasi v2.12). */
  const streak = bestStreak(habits, completions, today).streak

  /* Arus kas bersih seluruh transaksi (transfer antar-dompet dilewati). */
  const netSaldo = txs.reduce(
    (acc, t) =>
      acc +
      (t.type === 'masuk' ? t.amount : t.type === 'keluar' ? -t.amount : 0),
    0,
  )

  /* Agenda terbuka: belum selesai dikelompokkan per waktu, selesai
     dilipat ke bagian "Selesai" di bawahnya. */
  const pendingGroups = useMemo(() => {
    const buckets: Record<AgendaSlot, Habit[]> = {
      pagi: [],
      siang: [],
      malam: [],
      bebas: [],
    }
    for (const h of dayHabits) {
      if (!isDoneOn(completions, selectedDate, h.id)) {
        buckets[slotOf(h)].push(h)
      }
    }
    const byTime = (a: Habit, b: Habit) => {
      const ra = a.reminder ?? '99:99'
      const rb = b.reminder ?? '99:99'
      return ra === rb ? a.title.localeCompare(b.title) : ra < rb ? -1 : 1
    }
    return SLOT_META.map((meta) => ({
      ...meta,
      items: buckets[meta.key].sort(byTime),
    })).filter((g) => g.items.length > 0)
  }, [dayHabits, completions, selectedDate])

  const doneHabits = useMemo(
    () => dayHabits.filter((h) => isDoneOn(completions, selectedDate, h.id)),
    [dayHabits, completions, selectedDate],
  )

  /* Kutipan harian — berganti tiap tanggal, stabil sepanjang hari. */
  const quote = dailyQuote(today)
  const quoteSavedToday = quoteSavedDate === today

  /* Nudge "Jangan Bolong Dua Kali" — terlewat kemarin DAN belum
     diselesaikan hari ini; kartu lenyap sendiri begitu semua selesai. */
  const missedList = useMemo(
    () =>
      missedYesterday(habits, completions, today).filter(
        (h) => !isDoneOn(completions, today, h.id),
      ),
    [habits, completions, today],
  )

  /* Saran Coach (Goldilocks) — kebiasaan terjadwal hari ini yang hasil
     pekanannya meminta penyesuaian; batasi 3 saran paling releven. */
  const coachTips = useMemo(() => {
    const out: { habit: Habit; advice: GoldilocksAdvice }[] = []
    for (const h of todayHabits) {
      const advice = goldilocksOf(h, completions, today)
      if (advice) out.push({ habit: h, advice })
    }
    return out.slice(0, 3)
  }, [todayHabits, completions, today])

  /* anime.js — ledakan elastis pada ikon hadiah tepat saat bonus diklaim.
     Kebijakan reduced-motion: klaim tetap tercatat tanpa ledakan. */
  const reducedMotion = useReducedMotion()
  useEffect(() => {
    if (bonusClaimed && !prevBonusRef.current && giftRef.current) {
      prevBonusRef.current = true
      if (reducedMotion) return
      const anim = animate(giftRef.current, {
        scale: [1, 1.4, 1],
        rotate: [0, -14, 9, 0],
        duration: 750,
        ease: 'outBack(2.2)',
      })
      return () => {
        anim.revert()
      }
    }
    prevBonusRef.current = bonusClaimed
  }, [bonusClaimed, reducedMotion])

  /* Header menyusut halus saat layar digulir — transform & opacity saja. */
  const { scrollY } = useScroll({ container: scrollRef })
  const headerScale = useTransform(scrollY, [0, 120], [1, 0.96])
  const subtitleOpacity = useTransform(scrollY, [0, 120], [1, 0])

  const dateBadge = useSyncExternalStore(
    emptySubscribe,
    getClientDateBadge,
    () => '',
  )
  const greeting = useSyncExternalStore(
    emptySubscribe,
    getClientGreeting,
    () => 'Selamat pagi.',
  )

  /* Perayaan + toast saat SEMUA misi hari ini selesai — hanya sekali. */
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
      data-module="home"
      data-layout="daybook"
      /* Ritme daybook: tiap bagian utama dipisah --layout-gap (1.75rem).
         Aturan anak-berikutnya menimpa mt-* internal komponen asing
         (HomeFinanceCard mt-8, PunchCard mt-3) secara deterministik
         lewat spesifisitas. */
      className="h-full overflow-y-auto no-scrollbar px-4 pb-28 [&>*+*]:mt-[var(--layout-gap)]"
    >
      {/* Kepala layar — banner demo + sapaan yang menyusut halus saat digulir */}
      <div className="pt-[max(1.25rem,env(safe-area-inset-top))]">
        <DemoBanner />

        <m.header
          style={{ scale: headerScale }}
          className="origin-top"
          aria-label="Sapaan hari ini"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-muted">
              {dateBadge}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {/* Pintu Jurnal yang selalu terlihat — review navigasi v2.13:
                  sebelumnya Jurnal hanya bisa dibuka lewat Quick Action Hub;
                  kini satu ketuk dari header Beranda (mobile & desktop). */}
              <m.button
                type="button"
                onClick={() => setScreen('jurnal')}
                aria-label="Buka Jurnal — catatan dan tulisan"
                whileTap={{ scale: 0.92 }}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-primary/70 text-content-secondary shadow-soft transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <BookOpen className="h-4 w-4" strokeWidth={2} />
              </m.button>
              <m.button
                type="button"
                onClick={() => setScreen('profil')}
                aria-label="Buka profil dan pengaturan"
                whileTap={{ scale: 0.92 }}
                className="cursor-pointer rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Avatar className="h-9 w-9 border-2 border-surface-primary shadow-sm">
                  <AvatarFallback className="bg-cocoa text-eyebrow font-semibold tracking-widest text-parchment">
                    AN
                  </AvatarFallback>
                </Avatar>
              </m.button>
            </div>
          </div>
          <h1
            className={`${playfair.className} mt-2.5 text-balance text-fluid-editorial font-semibold leading-tight tracking-tight text-content-primary`}
          >
            {greeting}
          </h1>
          <m.p
            style={{ opacity: subtitleOpacity }}
            className="mt-1 text-body font-medium text-content-muted"
          >
            Mari mulai dengan satu langkah kecil.
          </m.p>
        </m.header>
      </div>

      {/* 1 — Komposisi bento hero: progres utama (tile lebar) + insight
          pendamping (tile sempit) pada xl; ponsel tetap satu kolom. */}
      <m.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: motionTokens.duration.enter,
          delay: 0.05,
          ease: motionTokens.easing.standard,
        }}
      >
        <RutinaBentoGrid>
          <RutinaBentoItem span="hero">
            <m.section
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.55,
                ease: motionTokens.easing.standard,
              }}
              aria-label="Progres hari ini"
              className="h-full"
            >
              <RutinaCard
                variant="default"
                density="spacious"
                radius="2xl"
                /* Permukaan kebun untuk area pertumbuhan: kabut matcha
                   lembut dari sudut kiri atas; radius mengikuti token
                   hero tata letak daybook (lebih lapang dari kartu biasa). */
                className="garden-surface h-full rounded-[var(--layout-hero-radius)] shadow-soft"
              >
                <div className="sm:mx-auto sm:max-w-[600px]">
                  <div className="flex items-center gap-5">
                    <HomeProgressRing pct={pct} />
                    <div className="min-w-0 flex-1">
                      <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                        Progres hari ini
                      </p>
                      <p className="mt-1 text-lead font-bold leading-tight text-content-primary">
                        {doneToday} dari {todayHabits.length} misi
                      </p>
                      <p
                        className={
                          'mt-0.5 text-note font-medium ' +
                          (todayHabits.length > 0 && missionRemaining === 0
                            ? 'text-success'
                            : 'text-content-muted')
                        }
                      >
                        {todayHabits.length === 0
                          ? 'Belum ada misi terjadwal.'
                          : missionRemaining > 0
                            ? `${missionRemaining} misi tersisa`
                            : 'Semua misi selesai — hari yang sempurna.'}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1.5 rounded-full bg-gold/25 px-3 py-1.5 text-meta font-bold text-espresso">
                          <Flame className="h-3.5 w-3.5" strokeWidth={2.2} />
                          Streak {streak} hari
                        </span>
                        <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-meta font-semibold text-success">
                          <Zap className="h-3.5 w-3.5" strokeWidth={2.2} />
                          Level {level}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mini-bar XP menuju target Level 8 */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-eyebrow font-semibold text-content-muted">
                      <span className="flex items-center gap-1 tabular-nums">
                        <Zap
                          aria-hidden="true"
                          className="h-3 w-3 text-success"
                          strokeWidth={2.4}
                        />
                        <Counter to={xp} /> XP
                      </span>
                      <span className="tabular-nums">
                        {xpRemaining > 0 ? `${xpRemaining} XP lagi` : 'MAX'}
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken"
                      role="progressbar"
                      aria-label={`Progres XP menuju ${XP_TARGET}`}
                      aria-valuenow={xp}
                      aria-valuemin={0}
                      aria-valuemax={XP_TARGET}
                    >
                      <m.div
                        initial={false}
                        className="h-full rounded-full bg-secondary"
                        animate={{ width: `${xpProgress * 100}%` }}
                        transition={{ type: 'spring', stiffness: 110, damping: 20 }}
                      />
                    </div>
                  </div>
                </div>
              </RutinaCard>
            </m.section>
          </RutinaBentoItem>

          {/* Insight hari ini — tile pendamping hero (audit visualisasi
              v2.12: tile streak & misi-pekan dihapus — keduanya sudah
              terbaca di chip hero, FocusWidget, dan StreakWidget pada
              Insight pekan; saldo bersih dipertahankan karena informasinya
              berbeda dan tidak digambarkan grafik lain). */}
          <RutinaBentoItem span="feature">
            <section aria-label="Insight hari ini" className="h-full">
              <RutinaCard
                variant="default"
                density="comfortable"
                radius="2xl"
                className="h-full rounded-[var(--layout-hero-radius)] shadow-soft"
              >
                <RutinaSectionHeader title="Insight hari ini" />
                <div className="mt-4">
                  <RutinaMetric
                    label="Saldo bersih"
                    value={
                      netSaldo < 0
                        ? `−${formatIDRShort(-netSaldo)}`
                        : formatIDRShort(netSaldo)
                    }
                    icon={Wallet}
                    iconClassName="bg-gold/25 text-warning"
                    caption="seluruh transaksi — transfer antar-dompet dikecualikan"
                  />
                </div>
              </RutinaCard>
            </section>
          </RutinaBentoItem>
        </RutinaBentoGrid>
      </m.div>

      {/* Kalender dua pekan melayang (sticky) — mengendalikan tanggal agenda */}
      <DateStrip />

      {/* 2 — Komposisi bento agenda: daftar misi (tile lebar) + kolom
          pengingat & saran coach (tile sempit) pada xl; urutan DOM sama.
          Bila tidak ada pengingat & saran (semua misi sehat), tile samping
          kosong → agenda melebar penuh agar tak ada kolom mati
          (audit responsif v2.13). */}
      <m.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: motionTokens.duration.enter,
          delay: 0.13,
          ease: motionTokens.easing.standard,
        }}
      >
        <RutinaBentoGrid>
          <RutinaBentoItem
            span="wide"
            className={
              missedList.length === 0 && coachTips.length === 0
                ? '@[52rem]:col-span-12'
                : undefined
            }
          >
            <section aria-label="Agenda hari ini">
              <RutinaSectionHeader
                title={viewingToday ? 'Agenda hari ini' : 'Agenda'}
              />

              {/* Halaman planner agenda: paper-surface memberi garis margin
                  kiri 2px + sapuan matcha lembut dari sisi awal; tiap
                  kelompok waktu mengalir di atas rel timeline. */}
              <div className="paper-surface mt-4 rounded-2xl border-y border-e p-4 shadow-soft sm:p-6">
                {/* Pita konteks tanggal lampau / masa depan */}
                {!viewingToday && (
                  <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-gold/40 bg-surface-sunken px-3.5 py-2.5">
                    <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-warning" />
                    <p className="min-w-0 flex-1 text-meta font-medium text-content-muted">
                      {viewingPast
                        ? `Melihat riwayat ${shortDateLabel(selectedDate)} — centang menyimpan untuk tanggal ini.`
                        : `${longDateLabel(selectedDate)} — misi tampil sesuai jadwal, belum bisa dicentang.`}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(today)}
                      className="shrink-0 cursor-pointer rounded-full bg-primary px-3 py-1.5 text-eyebrow font-semibold text-primary-foreground transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Hari ini
                    </button>
                  </div>
                )}

                {dayHabits.length === 0 ? (
                  /* Tidak ada misi terjadwal — halaman kosong yang dirayakan,
                     bukan kegagalan */
                  <RutinaEmptyState
                    icon={<CalendarDays className="h-6 w-6" />}
                    title="Tidak ada misi terjadwal hari ini"
                    description={
                      viewingToday
                        ? 'Nikmati jedamu — tambah kebiasaan baru kapan pun kamu siap.'
                        : `${shortDateLabel(selectedDate)} bebas dari agenda.`
                    }
                    action={
                      <Button
                        type="button"
                        onClick={openHabitCreate}
                        className="h-10 rounded-full bg-primary px-5 text-note font-bold text-primary-foreground hover:bg-action-hover"
                      >
                        <Plus className="h-4 w-4" />
                        Tambah kebiasaan
                      </Button>
                    }
                  />
                ) : (
                  <>
                    {/* Kelompok misi belum selesai — tiap waktu menjadi
                        baris rel (agenda-rail): titik aksen + hairline
                        vertikal ala planner kertas; label waktu kecil
                        di kepala rel. */}
                    <div className="space-y-5">
                      {pendingGroups.map((g, gi) => (
                        <m.div
                          key={g.key}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.4,
                            delay: Math.min(0.1 + gi * 0.06, 0.34),
                            ease: motionTokens.easing.standard,
                          }}
                        >
                          <div className="agenda-rail">
                            <div className="mb-2.5 flex items-center gap-2">
                              <g.icon
                                aria-hidden="true"
                                className="h-4 w-4 text-primary"
                                strokeWidth={2}
                              />
                              <h3 className="text-note font-semibold tracking-tight text-content-secondary">
                                {g.label}
                              </h3>
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-chart-label font-semibold text-content-secondary">
                                {g.items.length}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                              {g.items.map((h) => (
                                <TaskRow
                                  key={h.id}
                                  habit={h}
                                  done={false}
                                  streak={habitStreak(h, completions, selectedDate)}
                                  recent={recentDays(completions, h.id, selectedDate)}
                                  weekDone={weekDoneCount(completions, h.id, selectedDate)}
                                  expanded={expandedTaskId === h.id}
                                  readOnly={selectedDate > today}
                                  xp={XP_PER_TASK}
                                  onToggle={() => {
                                    /* Misi dari kelompok terbuka selalu berarti "selesai" —
                                       buka lipatan Selesai agar terlihat misinya terarsip. */
                                    toggleHabit(h.id, selectedDate)
                                    setShowDone(true)
                                  }}
                                  onExpand={() => toggleExpandedTask(h.id)}
                                  onEdit={() => openHabitEdit(h.id)}
                                />
                              ))}
                            </div>
                          </div>
                        </m.div>
                      ))}
                    </div>

                    {/* Misi selesai — dilipat, terbuka otomatis saat ada yang baru */}
                    {doneHabits.length > 0 && (
                      <div className="mt-6">
                        <button
                          type="button"
                          onClick={() => setShowDone((v) => !v)}
                          aria-expanded={showDone}
                          aria-controls="agenda-done-panel"
                          className="flex w-full cursor-pointer items-center gap-2.5 rounded-2xl border border-primary/20 bg-secondary/50 px-3.5 py-2.5 text-left transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-4 w-4" strokeWidth={2.6} />
                          </span>
                          <span className="flex-1 text-note font-semibold tracking-tight text-content-secondary">
                            Selesai ({doneHabits.length})
                          </span>
                          <m.span
                            aria-hidden="true"
                            animate={{ rotate: showDone ? 180 : 0 }}
                            transition={{ duration: 0.25 }}
                            className="text-content-muted"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </m.span>
                        </button>
                        <AnimatePresence initial={false}>
                          {showDone && (
                            <m.div
                              id="agenda-done-panel"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{
                                duration: motionTokens.duration.normal,
                                ease: motionTokens.easing.standard,
                              }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-1 gap-2.5 pt-2.5 sm:grid-cols-2">
                                {doneHabits.map((h) => (
                                  <TaskRow
                                    key={h.id}
                                    habit={h}
                                    done
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
                                ))}
                              </div>
                            </m.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Pintu masuk tambah kebiasaan — baris halus di ujung
                        halaman agenda */}
                    <button
                      type="button"
                      onClick={openHabitCreate}
                      aria-label="Tambah kebiasaan baru"
                      className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[16px] border border-dashed border-border-strong px-4 py-3.5 text-note font-semibold text-content-secondary transition-all hover:border-primary/50 hover:text-primary active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.5} />
                      Tambah kebiasaan
                    </button>
                  </>
                )}

                {/* Arsip — pulihkan atau sunting kebiasaan yang ditanggalkan */}
                {archivedHabits.length > 0 && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setShowArchive((v) => !v)}
                      aria-expanded={showArchive}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border bg-surface-primary px-3.5 py-2.5 text-left shadow-soft transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span className="flex items-center gap-2 text-meta font-bold text-content-secondary">
                        <Archive className="h-3.5 w-3.5" />
                        Arsip · {archivedHabits.length} kebiasaan
                      </span>
                      <m.span
                        aria-hidden="true"
                        animate={{ rotate: showArchive ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        className="text-content-muted"
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
                            className="flex items-center gap-3 rounded-2xl border border-border bg-surface-primary px-3.5 py-2.5 shadow-soft"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-content-muted">
                              <Archive className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-note font-semibold text-content-secondary">
                                {h.title}
                              </span>
                              <span className="block text-eyebrow font-medium text-content-muted">
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
                              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-primary/40 text-success transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                              <ArchiveRestore className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openHabitEdit(h.id)}
                              aria-label={`Sunting ${h.title}`}
                              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-content-secondary transition-colors hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                              <Undo2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </m.div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </RutinaBentoItem>

          {/* Kolom sempit: pengingat "jangan bolong" dan saran coach
              menumpuk vertikal — keduanya kondisional, kolom aman kosong.
              Jarak dari agenda hanya di bawah xl (mt-6 xl:mt-0) supaya
              di xl tepi atas kolom sejajar agenda; jarak antar-seksi
              kolom diatur [&>section+section]. */}
          <RutinaBentoItem
            span="feature"
            className="mt-6 @[52rem]:mt-0 [&>section+section]:mt-6"
          >
            {/* Nudge "Jangan Bolong Dua Kali" — kartu hangat (bukan merah):
               kebiasaan terlewat kemarin, selesaikan hari ini. */}
            {missedList.length > 0 && (
              <m.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: motionTokens.easing.standard }}
                aria-label="Pengingat jangan bolong dua kali"
              >
                <div className="rounded-[20px] border border-gold/45 bg-gold/15 p-4">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/30 text-warning"
                    >
                      <Bell className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-body font-semibold text-content-primary">
                        Jangan bolong dua kali
                      </h3>
                      <p className="mt-0.5 text-meta leading-relaxed text-content-muted">
                        Terlewat kemarin tak apa — selesaikan hari ini supaya
                        tidak bolong dua kali berturut-turut.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {missedList.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center gap-3 rounded-xl border border-gold/30 bg-surface-primary/70 px-3 py-1.5"
                      >
                        <span className="min-w-0 flex-1 truncate text-note font-semibold text-content-primary">
                          {h.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            toggleHabit(h.id, today)
                            toast.success(`"${h.title}" selesai — streak kembali berjalan.`)
                          }}
                          className="h-10 shrink-0 cursor-pointer rounded-full bg-primary px-4 text-eyebrow font-semibold text-primary-foreground shadow-soft transition-all hover:bg-action-hover active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          Selesaikan sekarang
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </m.section>
            )}

            {/* Saran Coach — Goldilocks: naikkan atau perkecil, dari hasil pekan */}
            {coachTips.length > 0 && (
              <m.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.05,
                  ease: motionTokens.easing.standard,
                }}
                aria-label="Saran Coach"
              >
                <RutinaSectionHeader
                  title="Saran Coach"
                  description="Penyesuaian kecil dari hasil pekan ini"
                />
                <div className="mt-3 space-y-2.5">
                  {coachTips.map(({ habit: h, advice }) => {
                    const naik = advice.tone === 'naik'
                    const Icon = naik ? TrendingUp : Minimize2
                    return (
                      <div
                        key={h.id}
                        className="flex items-start gap-3 rounded-[16px] border border-border bg-surface-primary p-3.5 shadow-soft"
                      >
                        <span
                          aria-hidden="true"
                          className={
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full ' +
                            (naik
                              ? 'bg-secondary text-success'
                              : 'bg-gold/25 text-warning')
                          }
                        >
                          <Icon className="h-4 w-4" strokeWidth={2.2} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-note font-semibold text-content-primary">
                            {advice.title}
                          </p>
                          <p className="mt-0.5 text-meta leading-relaxed text-content-muted">
                            {advice.text}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </m.section>
            )}
          </RutinaBentoItem>
        </RutinaBentoGrid>
      </m.div>

      {/* 3 — Bonus konsistensi (klaim XP harian) — TINGKAT "PERLU
          PERHATIAN": aksi kecil yang menunggu pengguna, diletakkan
          langsung setelah agenda agar terlihat tanpa menggulir jauh,
          namun tetap satu baris ringkas (review Beranda v2.13). */}
      <m.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: motionTokens.easing.standard }}
        aria-label="Bonus harian"
      >
        <button
          type="button"
          disabled={bonusClaimed}
          onClick={() => {
            claimBonus()
            toast.success(`Bonus harian diklaim — tambah ${XP_BONUS} XP!`)
          }}
          className={
            'flex w-full cursor-pointer items-center gap-3.5 rounded-[18px] border p-3.5 text-left transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
            (bonusClaimed
              ? 'border-primary/15 bg-secondary/60'
              : 'border-dashed border-primary/45 bg-surface-primary hover:-translate-y-0.5 hover:shadow-leaf')
          }
        >
          <m.span
            aria-hidden="true"
            className={
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full ' +
              (bonusClaimed
                ? 'bg-primary/20 text-success'
                : 'bg-primary text-primary-foreground')
            }
            /* Umpan balik gerak yang tenang: satu pop entrance penuh
               semangat saat kartu muncul (spring.playful), lalu DIAM —
               hadiah tidak berdenyut tanpa henti memperebutkan perhatian.
               Ledakan elastis saat klaim tetap ditangani anime.js di
               giftRef (useAnimePop) sebagai umpan balik aksi. */
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={motionTokens.spring.playful}
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
            <span className="block text-body font-semibold text-content-primary">
              {bonusClaimed ? 'Bonus hari ini terklaim' : 'Klaim bonus harian'}
            </span>
            <span className="mt-0.5 block text-meta font-medium text-content-muted">
              {bonusClaimed
                ? `+${XP_BONUS} XP sudah masuk ke saldo kamu`
                : `Hadiah konsistensi: +${XP_BONUS} XP gratis setiap hari`}
            </span>
          </span>
          {!bonusClaimed && (
            <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-eyebrow font-semibold text-success">
              +{XP_BONUS} XP
            </span>
          )}
        </button>
      </m.section>

      {/* 4 — Baris bento arus kas (5) + insight pekan (7): satu baris
          komposisi ruang kerja lebar (≥52rem), ponsel menumpuk finance → insight pekan.
          mt-8 internal HomeFinanceCard dinetralkan agar tepi atas kedua
          tile sejajar. */}
      <RutinaBentoGrid>
        <RutinaBentoItem className="col-span-2 @[42rem]:col-span-6 @[52rem]:col-span-5 [&>section]:mt-0">
          {/* Ringkasan finansial harian (audit #11) */}
          <HomeFinanceCard />
        </RutinaBentoItem>

        <RutinaBentoItem className="col-span-2 @[42rem]:col-span-6 @[52rem]:col-span-7">
          {/* Insight pekan: aktivitas & streak berdampingan */}
          <section aria-label="Insight pekan ini">
            <RutinaSectionHeader
              title="Insight pekan"
              description="Aktivitas misi & konsistensi terpanjang"
            />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FocusWidget />
              <StreakWidget />
            </div>
          </section>
        </RutinaBentoItem>
      </RutinaBentoGrid>

      {/* 5 — Kartu stempel pekan — TINGKAT "AKTIVITAS TAMBAHAN": dilipat
          (review Beranda v2.13: punch card adalah progres lanjutan, bukan
          fokus utama; ringkasan "X dari 7" selalu terlihat di pemicu,
          detail lubang dibuka bila diminati). */}
      <FoldedPunchCard />

      {/* 6 — Pintu Jurnal & catatan — menggantikan kisi folder penuh:
          kini satu kartu ringkas (review v2.13: "koleksi folder lebih
          cocok menjadi pintu masuk Jurnal"); kisi folder lengkap ada
          di layar Jurnal. */}
      <m.section
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20px' }}
        transition={{ duration: 0.5, ease: motionTokens.easing.standard }}
        aria-label="Jurnal dan catatan"
        className="rounded-[20px] border border-border bg-surface-primary p-4 shadow-soft"
      >
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary">
            <BookOpen className="h-5 w-5" strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold text-content-primary">
              Jurnal &amp; Catatan
            </p>
            <p className="mt-0.5 truncate text-meta font-medium text-content-muted">
              {notes.length} catatan di {FOLDERS.length} folder
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => openCompose()}
              aria-label="Buat catatan baru"
              className="h-9 rounded-full border-border px-4 text-meta font-bold text-content-secondary hover:bg-surface-sunken hover:text-content-primary"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
              Catatan
            </Button>
            <Button
              type="button"
              onClick={() => setScreen('jurnal')}
              className="h-9 rounded-full bg-primary px-4 text-meta font-bold text-primary-foreground shadow-soft hover:bg-action-hover"
            >
              Buka
            </Button>
          </div>
        </div>
        {/* Chip folder ringkas — hitungan nyata per kategori */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {FOLDERS.map(({ key, label }) => {
            const Icon = FOLDER_ICONS[key]
            const count = folderCount(notes, key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => openFolder(key)}
                aria-label={`Buka folder ${label} di Jurnal, ${count} catatan`}
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface-sunken px-3 text-meta font-semibold text-content-secondary transition-colors hover:border-primary/35 hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
                {label}
                <span className="tabular-nums text-content-muted">{count}</span>
              </button>
            )
          })}
        </div>
      </m.section>

      {/* Taman Pertumbuhan — strip horizontal tahap tanaman tiap
          kebiasaan, berendam di permukaan kebun (garden-surface) sebagai
          bedeng lembut. mt-8 internal PlantGarden dinetralkan agar
          ritme jarak mengikuti --layout-gap dari tumpukan utama. */}
      {hasActiveHabits && (
        <div className="garden-surface rounded-2xl border border-border-default p-4 shadow-soft sm:p-6 [&>section]:mt-0">
          <PlantGarden />
        </div>
      )}

      {/* 7 — Kartu Kutipan & Pengingat (pembatas visual) */}
      <m.section
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.55, ease: motionTokens.easing.standard }}
        aria-label="Refleksi hari ini"
        className="rounded-[20px] bg-surface-inverse p-6 text-content-inverse shadow-ink"
      >
        <div className="sm:mx-auto sm:max-w-[600px]">
          <div className="flex items-start justify-between gap-3">
            <Quote aria-hidden="true" className="h-6 w-6 shrink-0 text-content-inverse/45" />
            <span className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-inverse/70">
              Refleksi Hari Ini
            </span>
          </div>
          <p
            className={`${playfair.className} mt-4 text-balance text-lead italic leading-relaxed text-content-inverse`}
          >
            &ldquo;{quote.text}&rdquo;
          </p>
          <p className="mt-3 text-xs font-medium text-content-inverse/75">
            — {quote.author}
          </p>
          <Button
            type="button"
            variant="ghost"
            disabled={quoteSavedToday}
            onClick={() => {
              if (!quoteSavedToday) {
                saveQuote()
                toast.success('Kutipan disimpan ke jurnal')
              }
            }}
            className="mt-5 h-9 rounded-full border border-content-inverse/35 px-4 text-note font-semibold text-content-inverse hover:bg-content-inverse/10 hover:text-content-inverse disabled:opacity-60"
          >
            {quoteSavedToday ? (
              <Check className="h-4 w-4" strokeWidth={2.5} />
            ) : null}
            {quoteSavedToday ? 'Tersimpan di Jurnal' : 'Simpan ke Jurnal'}
          </Button>
        </div>
      </m.section>
    </div>
  )
}
