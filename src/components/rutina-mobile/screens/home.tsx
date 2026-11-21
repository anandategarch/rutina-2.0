'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, useScroll, useTransform } from 'motion/react'
import * as m from 'motion/react-m'
import {
  Archive,
  ArchiveRestore,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Flame,
  Gift,
  Heart,
  Lightbulb,
  PenLine,
  Plus,
  Quote,
  RefreshCw,
  Sun,
  Sunrise,
  Sunset,
  Undo2,
  Wallet,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Counter } from '../counter'
import { playfair } from '../serif'
import { TaskRow } from '../task-row'
import { MissionSteps } from '../mission-steps'
import { GardenTree } from '../garden-tree'
import { HomeFinanceCard } from '../home-finance-card'
import { DailyHighlightCard } from '../daily-highlight-card'
import { WeeklyRecapCard } from '../weekly-recap-card'
import { PlantGarden } from '../plant-garden'
import { goldilocksGroups } from '../habit-coach'
import { CoachGroupCard } from '../coach-card'
import { homeAttention, HOME_AGENDA_LIMIT } from '../home-attention'
import { RutinaCard } from '../rutina-card'
import { RutinaSectionHeader } from '../rutina-section-header'
import { RutinaEmptyState } from '../rutina-empty-state'
import { RutinaBentoGrid, RutinaBentoItem } from '../rutina-bento'
import { RutinaMetric } from '../rutina-metric'
import { formatIDRShort } from '../finance/utils'
import { isDraftNote, noteFirstLine, useJournalUi } from '../journal-ui'
import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { barFill, pressSnappy } from '@/lib/motion/transitions'
import { useAnimePop } from '../anime-kit'
import {
  addDaysISO,
  bestStreak,
  computeLevel,
  computeXp,
  doneCountOn,
  FOLDERS,
  folderCount,
  fromISO,
  habitsOn,
  habitStreak,
  isDoneOn,
  longDateLabel,
  quoteFor,
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

const FOLDER_ICONS: Record<FolderKey, LucideIcon> = {
  kerja: BookOpen,
  ide: Lightbulb,
  bacaan: BookOpen,
  pribadi: Heart,
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

/** Total misi selesai seluruh kebiasaan sepanjang pekan (Senin s.d. iso). */

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
  /** Kebiasaan terjadwal hari itu (v2.36 — intensitas sadar-jadwal). */
  scheduled: number
}

function DateStrip() {
  const habits = useRutina((s) => s.habits)
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
        scheduled: habitsOn(habits, iso).length,
      })
    }
    return chips
  }, [habits, completions, today])

  const stripRef = useRef<HTMLDivElement>(null)

  /* Gulir mulus ke hari ini begitu strip siap. Pusatkan chip SECARA
     HORIZONTAL saja lewat scrollTo pada stripnya sendiri — scrollIntoView
     (block:'nearest') terbukti ikut menggeser gulir VERTIKAL halaman
     ±84px saat chip dekat tepi bawah liang pandang, memotong sapaan di
     atas layar (audit "terpotong" v2.21). */
  useEffect(() => {
    const strip = stripRef.current
    if (!strip) return
    const el = strip.querySelector('[data-today="true"]')
    if (!(el instanceof HTMLElement)) return
    const left =
      strip.scrollLeft +
      el.getBoundingClientRect().left -
      strip.getBoundingClientRect().left -
      (strip.clientWidth - el.clientWidth) / 2
    strip.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
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
          /* v2.36 (audit visualisasi): caption sadar-jadwal — hari tanpa
             jadwal TIDAK dibaca sebagai 0/0 misi. */
          const caption = d.isFuture
            ? 'belum terjadi'
            : d.scheduled > 0
              ? `${Math.min(done, d.scheduled)}/${d.scheduled} jadwal (${Math.round(
                  (done / d.scheduled) * 100,
                )}%)`
              : 'tanpa kebiasaan terjadwal'
          /* Proporsi selesai/terjadwal — lebar bar = intensitas; hari
             tanpa jadwal = garis netral (bukan bar kosong 0%). */
          const schedPct =
            d.scheduled > 0 ? Math.min(100, Math.round((done / d.scheduled) * 100)) : null
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
              {/* Bar intensitas ritme harian (audit v2.36): proporsi
                  selesai dibanding jadwal — menggantikan titik tunggal
                  "target tercapai/tidak". */}
              {!d.isFuture && (
                <span
                  aria-hidden="true"
                  className={
                    'absolute bottom-1.5 h-1 w-6 overflow-hidden rounded-full ' +
                    (schedPct == null
                      ? 'bg-primary/15'
                      : d.isToday
                        ? 'bg-primary-foreground/30'
                        : 'bg-primary/15')
                  }
                >
                  {schedPct != null && (
                    <span
                      className={
                        'block h-full rounded-full ' +
                        (d.isToday
                          ? schedPct >= 100
                            ? 'bg-primary-foreground'
                            : 'bg-primary-foreground/70'
                          : schedPct >= 100
                            ? 'bg-primary'
                            : 'bg-primary/70')
                      }
                      style={{ width: `${schedPct}%` }}
                    />
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="mt-2 px-0.5 text-meta font-medium text-content-muted">
        {selected
          ? selected.isToday
            ? selected.scheduled > 0
              ? `Hari ini — ${Math.min(selected.done, selected.scheduled)}/${selected.scheduled} jadwal selesai`
              : 'Hari ini — tanpa kebiasaan terjadwal'
            : selected.isFuture
              ? `${longDateLabel(selected.iso)} — belum terjadi`
              : selected.scheduled > 0
                ? `${longDateLabel(selected.iso)} — ${selected.done} misi selesai dari ${selected.scheduled} jadwal`
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
  /* Pagar agenda (audit v2.37): kondisi awal ringkas (maks 4 tugas
     prioritas); ekspansi lokal tetap tersedia, data tidak pernah
     dianggap selesai karena disembunyikan. */
  const [showAllAgenda, setShowAllAgenda] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const firedRef = useRef(false)
  /* Ledakan elastis ikon hadiah saat bonus diklaim — useAnimePop melewati
     render pertama & menghormati reduced-motion (klaim tetap tercatat
     tanpa ledakan). */
  const giftRef = useAnimePop<HTMLSpanElement>(null, bonusClaimed, {
    scale: 1.4,
    rotate: -14,
    back: 2.2,
  })

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
     dihapus (audit visualisasi v2.12). v2.16 (audit T5-c #8): dibungkus
     useMemo — bestStreak O(habits×800) tidak perlu dihitung tiap render. */
  const streak = useMemo(
    () => bestStreak(habits, completions, today).streak,
    [habits, completions, today],
  )

  /* Arus kas bersih seluruh transaksi (transfer antar-dompet dilewati).
     v2.16 (audit T5-c #8): useMemo — O(txs) per render sebelumnya. */
  const netSaldo = useMemo(
    () =>
      txs.reduce(
        (acc, t) =>
          acc +
          (t.type === 'masuk' ? t.amount : t.type === 'keluar' ? -t.amount : 0),
        0,
      ),
    [txs],
  )

  /* Insight kontekstual: arus kas bersih 7 hari terakhir (non-transfer).
     Bila pekan ini benar-benar bertransaksi, caption metrik "Saldo
     bersih" memakai vonis Surplus/Defisit mingguan; tanpa aktivitas,
     caption lama dipertahankan. Jendela [today−6, today] = 7 hari
     kalender — konsisten dengan strip "Pengeluaran 7 hari" kartu
     keuangan Beranda. */
  const netCash7 = useMemo(() => {
    const from = addDaysISO(today, -6)
    let masuk = 0
    let keluar = 0
    let count = 0
    for (const t of txs) {
      if (t.type === 'transfer' || t.ts < from || t.ts > today) continue
      count++
      if (t.type === 'masuk') masuk += t.amount
      else if (t.type === 'keluar') keluar += t.amount
    }
    return { net: masuk - keluar, count }
  }, [txs, today])

  /* SATU SUMBER TUGAS (audit v2.37): agenda, kartu pemulihan, dan
     dedup Sorotan semuanya membaca derivasi homeAttention — tidak
     ada lagi tiga jalur yang masing-masing menghitung kandidat
     sendiri tanpa deduplikasi habit.id. */
  const attention = useMemo(
    () => homeAttention(habits, completions, today, selectedDate),
    [habits, completions, today, selectedDate],
  )
  const totalPending = attention.items.length

  /* Agenda terbuka: belum selesai dikelompokkan per waktu, selesai
     dilipat ke bagian "Selesai" di bawahnya — sumbernya kini satu:
     attention.items (sudah terurut prioritas). */
  const pendingGroups = useMemo(() => {
    const buckets: Record<AgendaSlot, Habit[]> = {
      pagi: [],
      siang: [],
      malam: [],
      bebas: [],
    }
    for (const item of attention.items) buckets[slotOf(item.habit)].push(item.habit)
    return SLOT_META.map((meta) => ({
      ...meta,
      items: buckets[meta.key],
    })).filter((g) => g.items.length > 0)
  }, [attention])

  /* Mode ringkas: hanya bila tugas tertunda melebihi pagar — daftar
     kecil (< 4) tetap memakai rel waktu penuh (desain Daybook). */
  const compactAgenda = !showAllAgenda && totalPending > HOME_AGENDA_LIMIT
  const visibleAgenda = compactAgenda
    ? attention.items.slice(0, HOME_AGENDA_LIMIT)
    : attention.items
  const hiddenAgendaCount = totalPending - visibleAgenda.length

  const doneHabits = useMemo(
    () => dayHabits.filter((h) => isDoneOn(completions, selectedDate, h.id)),
    [dayHabits, completions, selectedDate],
  )

  /* Draf jurnal terbaru — catatan tanpa judul paling atas (store
     menyimpan terbaru dulu). Satu pintu "lanjutkan menulis" yang
     membuka kanvas menulis global (JournalCanvas terpasang di
     ComposeSheet tingkat cangkang, aktif di semua layar). */
  const latestDraft = useMemo(
    () => notes.find((n) => isDraftNote(n)) ?? null,
    [notes],
  )
  const draftLabel = useMemo(() => {
    if (!latestDraft) return ''
    const line = noteFirstLine(latestDraft)
    if (!line) return 'Lanjutkan draft terakhir'
    return `Lanjutkan draft: ${
      line.length > 24 ? `${line.slice(0, 24)}…` : line
    }`
  }, [latestDraft])

  /* Refleksi hari ini — sadar offset "Ganti" (v2.14): kutipan harian
     bisa diganti-ganti dalam hari yang sama; hari baru kembali ke
     kutipan default. saveQuote menyimpan kutipan yang SEDANG tampil. */
  const quoteOffset = useRutina((s) => s.quoteOffset)
  const quoteDate = useRutina((s) => s.quoteDate)
  const cycleQuote = useRutina((s) => s.cycleQuote)
  const quote = useMemo(
    () => quoteFor(today, quoteDate === today ? quoteOffset : 0),
    [today, quoteDate, quoteOffset],
  )
  const quoteSavedToday = quoteSavedDate === today

  /* Pemulihan "Jangan Bolong Dua Kali" (audit v2.37): HANYA kebiasaan
     terlewat kemarin yang TIDAK terjadwal hari ini — yang terjadwal
     hari ini sudah punya baris Agenda berbadge "Terlewat kemarin",
     kartu pemulihan terpisah akan menjadi tombol centang kedua. */
  const recoveryList = attention.recovery

  /* Saran Coach (Goldilocks) terkonsolidasi — audit antirepetisi v2.41:
     SATU kartu per INTI saran; semua kebiasaan terjadwal hari ini yang
     perlu "diperkecil" bergabung dalam satu kartu (baris ringkas nama +
     capaian), begitu pula yang "pekan sempurna". Tidak ada lagi
     deretan kartu berjudul identik. Kartu pemulihan terlewat kemarin
     (recoveryList) tidak tumpang-tindih: populasinya kebiasaan yang
     TIDAK terjadwal hari ini, sedangkan saran pekanan ini hanya membaca
     yang terjadwal hari ini. */
  const coachGroups = useMemo(
    () => goldilocksGroups(todayHabits, completions, today),
    [todayHabits, completions, today],
  )

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

  /* v2.27 audit motion: gerbang anti-replay entrance — kunjungan pertama
     diantar animasi penuh, kunjungan ulang (remount antar-tab) tampil
     instan (direktif: jangan animasikan seluruh layout tiap ganti tab). */
  const playEntrance = useFirstVisit('home-daybook')

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
         (HomeFinanceCard mt-8, PlantGarden mt-8) secara deterministik
         lewat spesifisitas. */
      className="h-full overflow-y-auto no-scrollbar px-4 pb-28 [&>*+*]:mt-[var(--layout-gap)]"
    >
      {/* Kepala layar — sapaan yang menyusut halus saat digulir */}
      <div className="pt-[max(1.25rem,env(safe-area-inset-top))]">
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
              {/* Statistik — pintu cepat ke ringkasan & perkembangan dari
                  header Beranda (gaya identik tombol Jurnal di sebelahnya). */}
              <m.button
                type="button"
                onClick={() => setScreen('statistik')}
                aria-label="Buka Statistik — ringkasan dan perkembangan"
                whileTap={{ scale: 0.92 }}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-primary/70 text-content-secondary shadow-soft transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <BarChart3 className="h-4 w-4" strokeWidth={2} />
              </m.button>
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

      {/* 1 — Komposisi bento hero: progres utama (tile lebar, garden-
          surface, radius token hero) + insight pendamping FLAT editorial
          tanpa bingkai (v2.27 Daybook: bukan semua bagian adalah kartu).
          Sorotan Hari Ini dipindah ke kolom samping agenda sebagai panel
          sekunder — hero progres tak lagi berebut dengan kartu sorotan
          di posisi teratas. Ponsel tetap satu kolom. */}
      <m.div
        initial={playEntrance ? { opacity: 0, y: 14 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: motionTokens.duration.enter,
          delay: motionTokens.delay.tight,
          ease: motionTokens.easing.standard,
        }}
      >
        <RutinaBentoGrid>
          <RutinaBentoItem span="hero">
            <m.section
              initial={playEntrance ? { opacity: 0, y: 22 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={motionTokens.preset.pageEntrance}
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
                  {/* v2.39: petak misi menggantikan cincin lama yang
                      menampak seperti roda gigi — model linear: angka misi
                      di kiri, persen besar di kanan, lalu petak kebun
                      memanjang selebar kartu di bawahnya (tiap misi
                      terjadwal = satu petak; centang menumbuhkannya). */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                        Progres hari ini
                      </p>
                      <p className="mt-1 text-lead font-bold leading-tight tabular-nums text-content-primary">
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
                          : missionRemaining === 1
                            ? 'Satu langkah lagi menuju hari sempurna.'
                            : missionRemaining > 0
                              ? `${missionRemaining} misi tersisa`
                              : 'Semua misi selesai — hari yang sempurna.'}
                      </p>
                    </div>
                    <p className="flex shrink-0 items-baseline pt-0.5 text-content-primary">
                      <span className="text-kpi font-bold leading-none tracking-tight">
                        <Counter to={pct} immediate={!playEntrance} />
                      </span>
                      <span className="ml-0.5 text-note font-bold text-content-muted">
                        %
                      </span>
                    </p>
                  </div>
                  <MissionSteps
                    done={doneToday}
                    total={todayHabits.length}
                    entrance={playEntrance}
                    className="mt-4"
                  />

                  {/* v2.27 Daybook: strip pendamping di bawah hairline —
                      chip streak/level + mini-bar XP tidak lagi memadati
                      ruang utama petak misi (pola sub-metri studio Bugar:
                      informasi tetap lengkap, tenang, tak berebut). */}
                  <div className="mt-5 border-t border-border-default pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        <span className="flex items-center gap-1.5 text-meta font-semibold text-content-secondary">
                          {/* Api streak — denyut ambient identitas yang
                              diizinkan (preset ambientPulse, amplitudo
                              6%); MotionConfig reducedMotion="user"
                              mematikan transform ini otomatis. */}
                          <m.span
                            aria-hidden="true"
                            className="flex"
                            animate={{ scale: [1, 1.06, 1] }}
                            transition={motionTokens.preset.ambientPulse}
                          >
                            <Flame
                              className="h-3.5 w-3.5 text-warning"
                              strokeWidth={2.2}
                            />
                          </m.span>
                          <span className="tabular-nums">
                            Streak {streak} hari
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5 text-meta font-semibold text-content-secondary">
                          <Zap
                            aria-hidden="true"
                            className="h-3.5 w-3.5 text-success"
                            strokeWidth={2.2}
                          />
                          <span className="tabular-nums">Level {level}</span>
                        </span>
                      </div>
                      <div className="flex min-w-[200px] max-w-[260px] flex-1 items-center gap-2.5 sm:justify-end">
                        <span className="shrink-0 text-meta font-bold tabular-nums text-content-primary">
                          <Counter to={xp} immediate={!playEntrance} /> XP
                        </span>
                        <div
                          className="h-1.5 min-w-14 flex-1 overflow-hidden rounded-full bg-surface-sunken"
                          role="progressbar"
                          aria-label={`Progres XP menuju ${XP_TARGET}`}
                          aria-valuenow={xp}
                          aria-valuemin={0}
                          aria-valuemax={XP_TARGET}
                        >
                          <m.div
                            className="h-full origin-left rounded-full bg-secondary"
                            style={{ width: '100%' }}
                            initial={playEntrance ? { scaleX: 0 } : false}
                            animate={{ scaleX: xpProgress }}
                            transition={barFill}
                          />
                        </div>
                        <span className="shrink-0 text-meta font-medium tabular-nums text-content-muted">
                          {xpRemaining > 0 ? `${xpRemaining} lagi` : 'MAX'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </RutinaCard>
            </m.section>
          </RutinaBentoItem>

          {/* Insight hari ini — tile pendamping hero, FLAT editorial tanpa
              bingkai (v2.27 Daybook: direktif “bukan semua bagian adalah
              kartu”; hierarki lewat permukaan — hero terangkat, insight
              tenang di kanvas). Saldo bersih dipertahankan karena
              informasinya tidak digambarkan grafik lain; caption kini
              kontekstual — vonis arus kas 7 hari terakhir bila ada
              aktivitas pekan ini. */}
          <RutinaBentoItem span="feature">
            <section aria-label="Insight hari ini" className="h-full pt-1">
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
                  caption={
                    netCash7.count > 0
                      ? `${netCash7.net >= 0 ? 'Surplus' : 'Defisit'} ${formatIDRShort(
                          Math.abs(netCash7.net),
                        )} dari arus kas 7 hari — transfer antar-dompet dikecualikan`
                      : 'seluruh transaksi — transfer antar-dompet dikecualikan'
                  }
                />
              </div>
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
        initial={playEntrance ? { opacity: 0, y: 14 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: motionTokens.duration.enter,
          delay: motionTokens.delay.relaxed,
          ease: motionTokens.easing.standard,
        }}
      >
        <RutinaBentoGrid>
          <RutinaBentoItem
            span="wide"
            className={
              recoveryList.length === 0 && coachGroups.length === 0
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
                  <div className="mb-3 flex items-center gap-2.5 rounded-lg border border-gold/40 bg-surface-sunken px-3.5 py-2.5">
                    <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-warning" />
                    <p className="min-w-0 flex-1 text-meta font-medium text-content-muted">
                      {viewingPast
                        ? `Melihat riwayat ${shortDateLabel(selectedDate)} — centang menyimpan untuk tanggal ini.`
                        : `${longDateLabel(selectedDate)} — misi tampil sesuai jadwal, belum bisa dicentang.`}
                    </p>
                    <m.button
                      type="button"
                      onClick={() => setSelectedDate(today)}
                      whileTap={{ scale: 0.96, transition: pressSnappy }}
                      className="shrink-0 cursor-pointer rounded-full bg-primary px-3 py-1.5 text-eyebrow font-semibold text-primary-foreground transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Hari ini
                    </m.button>
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
                        className="h-11 rounded-full bg-primary px-5 text-note font-bold text-primary-foreground hover:bg-action-hover"
                      >
                        <Plus className="h-4 w-4" />
                        Tambah kebiasaan
                      </Button>
                    }
                  />
                ) : (
                  <>
                    {/* Pagar agenda (audit v2.37): kondisi awal hanya 4
                        tugas prioritas — baris cepat tanpa kartu bertumpuk.
                        Tugas tersembunyi TIDAK dianggap selesai; lengkapnya
                        hidup di rel waktu (ekspansi) & halaman Kebiasaan. */}
                    {compactAgenda ? (
                      <div role="list" className="divide-y divide-border/60">
                        {visibleAgenda.map((item) => (
                          <div key={item.habit.id} role="listitem">
                            <TaskRow
                              habit={item.habit}
                              done={false}
                              streak={item.streak}
                              recent={recentDays(completions, item.habit.id, selectedDate)}
                              weekDone={weekDoneCount(completions, item.habit.id, selectedDate)}
                              expanded={false}
                              readOnly={selectedDate > today}
                              viewDate={selectedDate}
                              variant="compact"
                              missedYesterday={item.missedYesterday}
                              streakRisk={item.streakRisk}
                              onToggle={() => {
                                toggleHabit(item.habit.id, selectedDate)
                                setShowDone(true)
                              }}
                              onExpand={() => setShowAllAgenda(true)}
                              onEdit={() => openHabitEdit(item.habit.id)}
                              onOpen={() => setScreen('kebiasaan')}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                    /* Kelompok misi belum selesai — tiap waktu menjadi
                       baris rel (agenda-rail): titik aksen + hairline
                       vertikal ala planner kertas; label waktu kecil
                       di kepala rel. (Ekspansi penuh — pagar terbuka.) */
                    <div className="space-y-5">
                      {pendingGroups.map((g, gi) => (
                        <m.div
                          key={g.key}
                          initial={playEntrance ? { opacity: 0, y: 14 } : false}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: motionTokens.duration.enter,
                            delay: Math.min(
                              motionTokens.delay.normal + gi * motionTokens.stagger.relaxed,
                              0.34,
                            ),
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
                            {/* role=list di kisi kelompok — baris TaskRow
                                terbaca sebagai daftar oleh pembaca layar
                                (pembungkus listitem di sini karena root
                                TaskRow di luar cakupan layar ini). */}
                            <div
                              role="list"
                              className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
                            >
                              {g.items.map((h) => (
                                <div key={h.id} role="listitem">
                                  <TaskRow
                                    habit={h}
                                    done={false}
                                    streak={habitStreak(h, completions, selectedDate)}
                                    recent={recentDays(completions, h.id, selectedDate)}
                                    weekDone={weekDoneCount(completions, h.id, selectedDate)}
                                    expanded={expandedTaskId === h.id}
                                    readOnly={selectedDate > today}
                                    viewDate={selectedDate}
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
                                </div>
                              ))}
                            </div>
                          </div>
                        </m.div>
                      ))}
                    </div>
                    )}

                    {/* Penghitung pagar agenda + akses sisa (audit v2.37):
                        "4 dari 12 tugas" — sisa jelas, satu CTA ke
                        Kebiasaan, satu ekspansi lokal. */}
                    {totalPending > 0 && (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border border-border bg-surface-sunken/50 px-3.5 py-2.5">
                        <p className="text-meta font-semibold tabular-nums text-content-secondary">
                          {compactAgenda
                            ? `${visibleAgenda.length} dari ${totalPending} tugas`
                            : `${totalPending} tugas terjadwal`}
                          {hiddenAgendaCount > 0 && (
                            <span className="font-medium text-content-muted">
                              {' '}
                              · {hiddenAgendaCount} menunggu
                            </span>
                          )}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          {compactAgenda ? (
                            <button
                              type="button"
                              onClick={() => setShowAllAgenda(true)}
                              className="h-9 cursor-pointer rounded-full border border-border-strong px-3.5 text-eyebrow font-semibold text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                              Tampilkan semua ({totalPending})
                            </button>
                          ) : totalPending > HOME_AGENDA_LIMIT ? (
                            <button
                              type="button"
                              onClick={() => setShowAllAgenda(false)}
                              className="h-9 cursor-pointer rounded-full border border-border-strong px-3.5 text-eyebrow font-semibold text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                              Tampilkan ringkas
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setScreen('kebiasaan')}
                            className="h-9 cursor-pointer rounded-full bg-primary px-3.5 text-eyebrow font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            Lihat semua kebiasaan
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Misi selesai — dilipat, terbuka otomatis saat ada yang baru */}
                    {doneHabits.length > 0 && (
                      <div className="mt-6">
                        <button
                          type="button"
                          onClick={() => setShowDone((v) => !v)}
                          aria-expanded={showDone}
                          aria-controls="agenda-done-panel"
                          className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-primary/20 bg-secondary/50 px-3.5 py-2.5 text-left transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
                            transition={motionTokens.preset.interaction}
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
                              {/* role=list — pola yang sama dengan kisi
                                  kelompok terbuka di atas. */}
                              <div
                                role="list"
                                className="grid grid-cols-1 gap-2.5 pt-2.5 sm:grid-cols-2"
                              >
                                {doneHabits.map((h) => (
                                  <div key={h.id} role="listitem">
                                    <TaskRow
                                      habit={h}
                                      done
                                      streak={habitStreak(h, completions, selectedDate)}
                                      recent={recentDays(completions, h.id, selectedDate)}
                                      weekDone={weekDoneCount(completions, h.id, selectedDate)}
                                      expanded={expandedTaskId === h.id}
                                      readOnly={selectedDate > today}
                                      viewDate={selectedDate}
                                      xp={XP_PER_TASK}
                                      onToggle={() => toggleHabit(h.id, selectedDate)}
                                      onExpand={() => toggleExpandedTask(h.id)}
                                      onEdit={() => openHabitEdit(h.id)}
                                    />
                                  </div>
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
                      className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong px-4 py-3.5 text-note font-semibold text-content-secondary transition-all hover:border-primary/50 hover:text-primary active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.5} />
                      Tambah kebiasaan
                    </button>
                  </>
                )}

                {/* Arsip — pulihkan atau sunting kebiasaan yang ditanggalkan */}
                {archivedHabits.length > 0 && (
                  <div className="mt-4">
                    <m.button
                      type="button"
                      onClick={() => setShowArchive((v) => !v)}
                      aria-expanded={showArchive}
                      whileTap={{ scale: 0.96, transition: pressSnappy }}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-surface-primary px-3.5 py-2.5 text-left shadow-soft transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span className="flex items-center gap-2 text-meta font-bold tabular-nums text-content-secondary">
                        <Archive className="h-3.5 w-3.5" />
                        Arsip · {archivedHabits.length} kebiasaan
                      </span>
                      <m.span
                        aria-hidden="true"
                        animate={{ rotate: showArchive ? 180 : 0 }}
                        transition={motionTokens.preset.interaction}
                        className="text-content-muted"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </m.span>
                    </m.button>
                    {showArchive && (
                      <m.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={motionTokens.preset.interaction}
                        className="mt-2 space-y-2"
                      >
                        {archivedHabits.map((h) => (
                          <div
                            key={h.id}
                            className="flex items-center gap-3 rounded-lg border border-border bg-surface-primary px-3.5 py-2.5 shadow-soft"
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
            {/* Sorotan Hari Ini (v2.27): dipindah ke kolom samping agenda —
               panel sekunder SETELAH hero progres & daftar misi, sesuai
               komposisi Daybook (daily insight = panel kecil, bukan hero
               kedua yang bersaing di posisi teratas). */}
            <DailyHighlightCard excludeHabitIds={attention.actionIds} />

            {/* Pemulihan "Jangan Bolong Dua Kali" — kartu hangat (bukan
               merah): kebiasaan terlewat kemarin yang TIDAK terjadwal
               hari ini (maks 2) — yang terjadwal hari ini sudah ada di
               Agenda dengan badge, tidak boleh dobel. */}
            {recoveryList.length > 0 && (
              <m.section
                initial={playEntrance ? { opacity: 0, y: 16 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={motionTokens.preset.data}
                aria-label="Pengingat jangan bolong dua kali"
              >
                <div className="rounded-lg border border-gold/45 bg-gold/15 p-4">
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
                      <p className="mt-0.5 text-pretty text-meta leading-relaxed text-content-muted">
                        Terlewat kemarin tak apa — selesaikan hari ini supaya
                        tidak bolong dua kali berturut-turut.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {recoveryList.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center gap-3 rounded-lg border border-gold/30 bg-surface-primary/70 px-3 py-1.5"
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
                          className="h-11 shrink-0 cursor-pointer rounded-full bg-primary px-4 text-eyebrow font-semibold text-primary-foreground shadow-soft transition-all hover:bg-action-hover active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          Selesaikan sekarang
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </m.section>
            )}

            {/* Saran Coach — Goldilocks terkonsolidasi: satu kartu per inti
                saran (perkecil / naikkan), dari hasil pekan */}
            {coachGroups.length > 0 && (
              <m.section
                initial={playEntrance ? { opacity: 0, y: 16 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  ...motionTokens.preset.data,
                  delay: motionTokens.delay.tight,
                }}
                aria-label="Saran Coach"
              >
                <RutinaSectionHeader
                  title="Saran Coach"
                  description="Penyesuaian kecil dari hasil pekan ini"
                />
                <div className="mt-3 space-y-2.5">
                  {coachGroups.map((group) => (
                    <CoachGroupCard key={group.tone} group={group} />
                  ))}
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
        initial={playEntrance ? { opacity: 0, y: 16 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...motionTokens.preset.data, delay: motionTokens.delay.normal }}
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
            'flex w-full cursor-pointer items-center gap-3.5 rounded-lg border p-3.5 text-left transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
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
               giftRef (useAnimePop) sebagai umpan balik aksi.
               Gerbang firstVisit mengikuti seksi induk — pop hanya
               sekali seumur sesi, bukan tiap remount tab. */
            initial={playEntrance ? { scale: 0.4, opacity: 0 } : false}
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
            <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-eyebrow font-semibold tabular-nums text-success">
              +{XP_BONUS} XP
            </span>
          )}
        </button>
      </m.section>

      {/* 4 — Baris bento rekap pekan (7) + arus kas (5): satu baris
          komposisi ruang kerja lebar (≥52rem), ponsel menumpuk rekap →
          finance (perjalanan pertumbuhan didahulukan). mt-8 internal
          HomeFinanceCard dinetralkan agar tepi atas kedua tile sejajar.
          v2.14: Rekap Pekan menggantikan panel "Insight pekan" — strip
          perjalanan 7 hari, perbandingan vs pekan lalu, dan chip visual
          lintas modul; kartu stempel pekan yang terlipat ikut diserap ke
          strip perjalanan. */}
      <RutinaBentoGrid>
        <RutinaBentoItem className="col-span-2 @[42rem]:col-span-6 @[52rem]:col-span-7">
          <WeeklyRecapCard />
        </RutinaBentoItem>

        <RutinaBentoItem className="col-span-2 @[42rem]:col-span-6 @[52rem]:col-span-5 [&>section]:mt-0">
          {/* Ringkasan finansial harian (audit #11) */}
          <HomeFinanceCard />
        </RutinaBentoItem>
      </RutinaBentoGrid>

      {/* 5 — Pintu Jurnal & catatan — menggantikan kisi folder penuh:
          kini satu kartu ringkas (review v2.13: "koleksi folder lebih
          cocok menjadi pintu masuk Jurnal"); kisi folder lengkap ada
          di layar Jurnal. */}
      <m.section
        initial={playEntrance ? { opacity: 0, y: 14 } : false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20px' }}
        transition={motionTokens.preset.data}
        aria-label="Jurnal dan catatan"
        /* v2.27 Daybook: pintu Jurnal bertint domain (dusty mauve) —
           band bawah halaman kini punya hierarki permukaan: flat insight,
           dashed bonus, tint jurnal, garden rekap, tint finance. */
        className="rounded-lg border border-module-journal/30 bg-module-journal-soft/55 p-4"
      >
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-primary/90 text-module-journal-strong">
            <BookOpen className="h-5 w-5" strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold text-content-primary">
              Jurnal &amp; Catatan
            </p>
            <p className="mt-0.5 line-clamp-2 break-words text-meta font-medium text-content-muted">
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
        {/* Lanjutkan draf terakhir — draf (catatan tanpa judul) terbaru
            dibuka langsung di kanvas menulis; baris tersendiri agar tidak
            berebut lebar dengan chip folder. */}
        {latestDraft && (
          <button
            type="button"
            onClick={() => useJournalUi.getState().openCanvas(latestDraft)}
            aria-label="Lanjutkan menulis draf jurnal terakhir"
            className="mt-2 flex h-9 max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-module-journal/40 bg-surface-primary px-3.5 text-meta font-bold text-module-journal-strong transition-colors hover:border-module-journal/70 hover:bg-module-journal-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <PenLine
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0"
              strokeWidth={2.2}
            />
            <span className="min-w-0 truncate">{draftLabel}</span>
          </button>
        )}
      </m.section>

      {/* Taman Pertumbuhan — strip horizontal tahap tanaman tiap
          kebiasaan, berendam di permukaan kebun (garden-surface) sebagai
          bedeng lembut. mt-8 internal PlantGarden dinetralkan agar
          ritme jarak mengikuti --layout-gap dari tumpukan utama.
          v2.22: dibuka oleh Pohon Kebun — SATU pohon konsistensi global
          yang tumbuh dari hari aktif seluruh kebun. */}
      {hasActiveHabits && (
        <div className="space-y-[var(--layout-gap)]">
          <GardenTree />
          <div className="garden-surface rounded-2xl border border-border-default p-4 shadow-soft sm:p-6 [&>section]:mt-0">
            <PlantGarden />
          </div>
        </div>
      )}

      {/* 7 — Kartu Refleksi (pembatas visual) — kutipan bisa DIGANTI-GANTI
          (v2.14): tombol "Ganti" menjalankan cycleQuote; kutipan berputar
          dengan transisi lembut; simpan menyimpan kutipan yang tampil. */}
      <m.section
        initial={playEntrance ? { opacity: 0, y: 18 } : false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={motionTokens.preset.pageEntrance}
        aria-label="Refleksi hari ini"
        className="rounded-xl bg-surface-inverse p-6 text-content-inverse shadow-ink"
      >
        <div className="sm:mx-auto sm:max-w-[600px]">
          <div className="flex items-start justify-between gap-3">
            <Quote aria-hidden="true" className="h-6 w-6 shrink-0 text-content-inverse/45" />
            <div className="flex items-center gap-2">
              <span className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-inverse/70">
                Refleksi Hari Ini
              </span>
              <m.button
                type="button"
                onClick={() => cycleQuote()}
                aria-label="Ganti kutipan refleksi"
                title="Ganti kutipan refleksi"
                whileTap={{ scale: 0.9 }}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-content-inverse/25 text-content-inverse/75 transition-colors hover:bg-content-inverse/10 hover:text-content-inverse focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content-inverse"
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.2} />
              </m.button>
            </div>
          </div>
          {/* Pembungkus persisten aria-live — elemen bertahan lintas
              pergantian kutipan sehingga pembaca layar mengumumkan teks
              baru (mode="wait" melepas lalu memasang ulang m.div dalam;
              live region pada elemen yang berganti-kunci tak terbaca). */}
          <div aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={`${today}-${quoteDate === today ? quoteOffset : 0}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={motionTokens.preset.cardReveal}
              >
                <p
                  className={`${playfair.className} mt-4 text-balance text-lead italic leading-relaxed text-content-inverse`}
                >
                  &ldquo;{quote.text}&rdquo;
                </p>
                <p className="mt-3 text-meta font-medium text-content-inverse/75">
                  — {quote.author}
                </p>
              </m.div>
            </AnimatePresence>
          </div>
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
