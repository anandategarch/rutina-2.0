'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { AnimatePresence, useScroll, useTransform } from 'motion/react'
import * as m from 'motion/react-m'
import {
  Archive,
  ArchiveRestore,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Flame,
  Gift,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Counter } from '../counter'
import { playfair } from '../serif'
import { TaskRow } from '../task-row'
import { MissionTrail } from '../mission-trail'
import { GardenTree } from '../garden-tree'
import { HomeFinanceCard } from '../home-finance-card'
import { WeeklyRecapCard } from '../weekly-recap-card'
import { ForTodaySection } from '../for-today'
import { homeAttention, HOME_AGENDA_LIMIT } from '../home-attention'
import { RutinaSectionHeader } from '../rutina-section-header'
import { RutinaEmptyState } from '../rutina-empty-state'
import { SmoothScrollArea } from '../smooth-scroll-area'
import { WordReveal } from '../word-reveal'
import { MotionCard } from '../rutina-motion-card'
import { useShellRevealed } from '../shell-reveal'
import { RutinaBentoGrid, RutinaBentoItem } from '../rutina-bento'
import { RutinaMetric } from '../rutina-metric'
import { formatIDRShort } from '../finance/utils'
import { isDraftNote, noteFirstLine, useJournalUi } from '../journal-ui'
import { useCheckInSheet } from '../checkin-sheet'
import { useQuickHub } from '../quick-action-hub'
import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { barFill, pressSnappy } from '@/lib/motion/transitions'
import { useAnimePop } from '../anime-kit'
import {
  addDaysISO,
  bestStreak,
  computeLevel,
  computeXp,
  dayCompliance,
  doneCountOn,
  FOLDERS,
  fromISO,
  habitsOn,
  habitStreak,
  isDoneOn,
  longDateLabel,
  quoteFor,
  shortDateLabel,
  todayISO,
  useRutina,
  weekStartISO,
  WEEKDAY_MIN,
  XP_BONUS,
  XP_PER_TASK,
  XP_TARGET,
  type Completions,
  type Habit,
} from '../store'

/* ===== Potongan kecil ===== */

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

/** Sapaan Playfair — v3.1 mock Make: satu sapaan tenang "Selamat
 *  datang kembali." (mock menambahkan nama pengguna; Rutina belum
 *  menyimpan nama sehingga sapaan generik — bentuk & rasa tetap sama). */
function getClientGreeting(): string {
  return 'Selamat datang kembali.'
}

/* Wajah suasana kartu "A moment for yourself" (mock Make) — padanan
   empat MOODS check-in Rutina (Ceria/Baik/Biasa/Lelah) dengan emoji.
   Ketuk membuka lembar Check-in harian. */
const MOOD_FACES: { mood: string; label: string; emoji: string }[] = [
  { mood: 'Lelah', label: 'Lelah', emoji: '😮\u200d💨' },
  { mood: 'Biasa', label: 'Biasa', emoji: '😐' },
  { mood: 'Baik', label: 'Baik', emoji: '🙂' },
  { mood: 'Ceria', label: 'Ceria', emoji: '😊' },
]

/* ===== Utilitas pekan (Senin = awal pekan) ===== */

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
  /** Kebiasaan selesai di antara yang TERJADWAL (sadar-createdAt &
   *  jeda — v2.49 audit: satu sumber dayCompliance, sepakat dengan
   *  lembar detail/heatmap/konstelasi; dulu doneCountOn mentah bisa
   *  membaca "5 dari 3 selesai (166%)" dari centang bonus). */
  done: number
  /** Kebiasaan TERJADWAL hari itu (jeda diampuni, belum-dibuat tak
   *  dihitung — penyebut jujur). */
  scheduled: number
}

function DateStrip() {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
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
      /* v2.49 (audit): dayCompliance = SATU sumber — hari-jeda
         diampuni & kebiasaan yang belum dibuat tak masuk penyebut. */
      const dc = dayCompliance(habits, completions, iso)
      chips.push({
        iso,
        label: WEEKDAY_MIN[d.getDay()],
        dateNum: d.getDate(),
        isToday: i === 0,
        isFuture: i > 0,
        done: dc.done,
        scheduled: dc.due,
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
             jadwal TIDAK dibaca sebagai 0/0 misi. done ≤ scheduled sejak
             v2.49 (numerator dayCompliance) — tak ada lagi "3/3 (166%)". */
          const caption = d.isFuture
            ? 'belum terjadi'
            : d.scheduled > 0
              ? `${done}/${d.scheduled} jadwal (${Math.round(
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
      {/* Konteks tanggal (review UI/UX v2.44): memilih tanggal selain hari
          ini memunculkan bar informasi eksplisit — hero progres tetap
          meringkas HARI INI, bar ini menjelaskan tanggal yang sedang
          dibuka agenda-nya + jalan pulang satu ketukan. Hari ini tetap
          memakai caption ringkas satu baris. */}
      {selected ? (
        selected.isToday ? (
          <p className="mt-2 px-0.5 text-meta font-medium text-content-muted">
            {selected.scheduled > 0
              ? `Hari ini — ${Math.min(selected.done, selected.scheduled)}/${selected.scheduled} jadwal selesai`
              : 'Hari ini — tanpa kebiasaan terjadwal'}
          </p>
        ) : (
          <m.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={motionTokens.preset.chipReveal}
            className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-module-accent/25 bg-module-accent/8 px-3 py-2"
          >
            <p className="flex min-w-0 flex-1 items-center gap-1.5 text-meta font-medium text-content-secondary">
              <CalendarDays
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 text-module-accent-strong"
              />
              <span className="font-semibold text-module-accent-strong">
                {selected.isFuture ? 'Akan datang' : 'Riwayat'}
              </span>
              <span className="text-content-muted">·</span>
              <span className="truncate font-semibold text-content-primary">
                {longDateLabel(selected.iso)}
              </span>
              <span className="min-w-0 flex-1 truncate text-content-muted">
                {selected.isFuture
                  ? 'misi tampil sesuai jadwal — belum bisa dicentang'
                  : selected.scheduled > 0
                    ? `${selected.done} dari ${selected.scheduled} kebiasaan selesai`
                    : 'tanpa kebiasaan terjadwal'}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setSelectedDate(today)}
              className="interactive h-9 shrink-0 cursor-pointer rounded-full bg-surface-primary px-3.5 text-meta font-bold text-module-accent-strong shadow-soft transition-colors hover:bg-module-accent/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Kembali ke hari ini
            </button>
          </m.div>
        )
      ) : (
        /* v2.49 (audit): "Memuat kalender…" adalah kebohongan — cabang ini
           tercapai hanya bila selectedDate jatuh DI LUAR jendela ±7 hari
           (mis. pergantian tengah malam); jendela berisi hari ini, jadi
           ini murni kosmetik. Tanpa teks — pengguna tidak menunggu apa pun. */
        <p className="mt-2 px-0.5 text-meta font-medium text-content-muted" aria-hidden="true">
          ·
        </p>
      )}
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
  /* v2.45: klaim bonus kini ber-tanggal — reset alami tiap ganti hari. */
  const bonusClaimedOn = useRutina((s) => s.bonusClaimedOn)
  const bonusClaimed = bonusClaimedOn === todayISO()
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
  /* Pohon Kebun hanya dirender bila ada kebiasaan aktif — v2.83:
     bedeng PlantGarden dipensiunkan dari Beranda (hidup di ruang
     Konsistensi Kebiasaan); gerbang ini kini melayani Pohon saja. */
  const hasActiveHabits = habits.some((h) => !h.archived)

  /* Hero selalu merangkum HARI INI — terlepas tanggal mana yang dilihat. */
  const todayHabits = useMemo(() => habitsOn(habits, today), [habits, today])
  /* v2.49 (audit): hero ikut SATU sumber dayCompliance — penyebut
     mengampuni hari-jeda & kebiasaan yang belum dibuat, sepakat dengan
     chip tanggal, lembar detail hari, dan konstelasi (dulu habitsOn
     mentah membuat hero "2 dari 4 (50%)" berdampingan dengan lembar
     detail "2 dari 2 selesai (100%), 2 jeda diampuni"). Pembilang v2.45
     (sadur-jadwal, bonus luar jadwal tampil sebagai chip "+N") dipertahankan. */
  const dcToday = dayCompliance(habits, completions, today)
  const scheduledToday = dcToday.due
  const schedDoneToday = dcToday.done
  const doneToday = doneCountOn(completions, today)
  const extraDoneToday = Math.max(doneToday - schedDoneToday, 0)
  const pct =
    scheduledToday > 0
      ? Math.min(Math.round((schedDoneToday / scheduledToday) * 100), 100)
      : 0
  const missionRemaining = Math.max(scheduledToday - schedDoneToday, 0)
  const xp = computeXp(doneToday, bonusClaimed)
  const level = computeLevel(xp)
  const xpProgress = Math.min(xp / XP_TARGET, 1)
  /* Streak hero chip — bestStreak dipakai chip hero; tile duplikat sudah
     dihapus (audit visualisasi v2.12). v2.16 (audit T5-c #8): dibungkus
     useMemo — bestStreak O(habits×800) tidak perlu dihitung tiap render. */
  const streak = useMemo(
    () => bestStreak(habits, completions, today).streak,
    [habits, completions, today],
  )

  /* v2.46 (Warm Editorial P2.0): misi pekan berjalan untuk rel hero —
     Senin..hari ini saja (hari berjalan), sadar-jadwal & sadar-createdAt
     senada weekTarget Kebiasaan; "Misi pekan d/s" menemani Streak di
     sisi kanan hero split. */
  const weekMission = useMemo(() => {
    const start = weekStartISO(today)
    let sched = 0
    let done = 0
    for (let i = 0; i < 7; i++) {
      const iso = addDaysISO(start, i)
      if (iso > today) break
      /* v2.49 (audit): dayCompliance = SATU sumber — hari-jeda diampuni,
         sepakat dengan rekap pekan, konstelasi, dan target pekan Kebiasaan
         (dulu habitsOn+createdAt mentah menghitung hari-jeda sebagai
         misi yang "tersisa", membingkai jeda sebagai kegagalan). */
      const dc = dayCompliance(habits, completions, iso)
      sched += dc.due
      done += dc.done
    }
    return { sched, done }
  }, [habits, completions, today])

  /* v3.1: heroHeadline dipensiunkan — kartu editorial beige memakai
     headline mock; narasi progres hidup di kartu sage. */

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

  /* v2.47 (Daily Almanac · Mission Trail): progres per-slot untuk chip
     "x/y" di kepala rel agenda — misi SELESAI vs TOTAL terjadwal pada
     slot itu untuk tanggal yang dilihat. Baris selesai dilipat ke
     bagian "Selesai" di bawah, tetap dihitung agar progres jujur. */
  const slotProgress = useMemo(() => {
    const stats = new Map<AgendaSlot, { done: number; total: number }>()
    for (const h of dayHabits) {
      const slot = slotOf(h)
      const cur = stats.get(slot) ?? { done: 0, total: 0 }
      cur.total += 1
      if (isDoneOn(completions, selectedDate, h.id)) cur.done += 1
      stats.set(slot, cur)
    }
    return stats
  }, [dayHabits, completions, selectedDate])

  const doneHabits = useMemo(
    () => dayHabits.filter((h) => isDoneOn(completions, selectedDate, h.id)),
    [dayHabits, completions, selectedDate],
  )

  /* v2.50 (Daily Almanac · Mission Trail): jalur checkpoint agenda —
     misi selesai dulu (urutan bagian "Selesai"), lalu yang tertunda
     mengikuti urutan attention (SATU sumber urutan agenda, tanpa
     sortir ulang); misi tertunda pertama = checkpoint aktif. Kosong
     bila hari tanpa misi (state kosong agenda tetap sebagaimana
     adanya). */
  const trailMissions = useMemo(
    () => [
      ...doneHabits.map((h) => ({ id: h.id, title: h.title, done: true })),
      ...attention.items.map(({ habit }) => ({
        id: habit.id,
        title: habit.title,
        done: false,
      })),
    ],
    [doneHabits, attention],
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

  /* v2.56 (audit Tahap 2): derivasi recoveryList & coachGroups dipindah
     ke ForTodaySection — kolom rekomendasi kini satu komponen dengan
     satu keputusan prioritas; Beranda cukup meneruskan hasil
     homeAttention (recovery + actionIds) tanpa langganan slice baru. */

  /* Header menyusut halus saat layar digulir — transform saja. */
  const { scrollY } = useScroll({ container: scrollRef })
  const headerScale = useTransform(scrollY, [0, 120], [1, 0.96])

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
  /* v2.87: judul sapaan menunggu splash — kata terungkap per kata
     PERSIS saat kanvas pertama kali terlihat (bukan di balik splash). */
  const shellRevealed = useShellRevealed()

  /* Kartu suasana — mood tersimpan hari ini (log harian > state global). */
  const mood = useRutina((s) => s.mood)
  const moodLogs = useRutina((s) => s.moodLogs)
  const openCheckIn = useCheckInSheet((s) => s.openCheckIn)
  const todayMood = moodLogs[today] ?? mood

  /* Perayaan + toast saat SEMUA misi terjadwal hari ini selesai —
     hanya sekali per hari. v2.49 (audit): penanda kini PERSISTENT
     (uiPrefs.missionCelebratedOn, pola celebratedOn level-8) — ref
     instance kehilangan nilainya setiap HomeScreen unmount (tiap ganti
     tab), membuat perayaan 2,5 dtk + toast replay pada setiap kunjungan
     ulang Beranda di hari sempurna. Sykat juga kini sadar-jeda: semua
     misi YANG TERJADWAL selesai = hari sempurna (sepakat dengan hero). */
  const missionCelebratedOn = useRutina((s) => s.uiPrefs.missionCelebratedOn)
  const setUiPref = useRutina((s) => s.setUiPref)
  useEffect(() => {
    if (
      scheduledToday > 0 &&
      schedDoneToday >= scheduledToday &&
      missionCelebratedOn !== today
    ) {
      setUiPref({ missionCelebratedOn: today })
      setCelebrating(true)
      toast.success('Semua misi selesai — hari yang produktif!')
    }
  }, [
    scheduledToday,
    schedDoneToday,
    missionCelebratedOn,
    today,
    setUiPref,
    setCelebrating,
  ])

  return (
    <SmoothScrollArea
      viewportRef={scrollRef}
      data-module="home"
      data-layout="daybook"
      /* v2.87: wadah gulir kini SmoothScrollArea — gulir roda dihaluskan
         Lenis (per-wadah; sentuhan tetap native), sinkron dengan detak
         gsap.ticker untuk ScrollTrigger WordReveal.
         Ritme daybook: tiap bagian utama dipisah --layout-gap (1.75rem).
         Aturan anak-berikutnya menimpa mt-* internal komponen asing
         (mis. HomeFinanceCard mt-8) secara deterministik
         lewat spesifisitas. */
      contentClassName="px-4 pb-28 [&>*+*]:mt-[var(--layout-gap)]"
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
              {/* v3.1 mock Make: pil CTA "Aksi cepat" di kepala — pintu
                  utama ke hub catat universal, senada pil gelap hero. */}
              <m.button
                type="button"
                onClick={() => useQuickHub.getState().openHub()}
                aria-label="Aksi cepat — catat sesuatu"
                whileTap={{ scale: 0.94 }}
                className="interactive hidden h-9 cursor-pointer items-center gap-1.5 rounded-full bg-action-primary px-4 text-meta font-bold text-action-primary-fg shadow-soft hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring min-[420px]:flex"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
                Aksi cepat
              </m.button>
              {/* Statistik — pintu cepat ke ringkasan & perkembangan dari
                  header Beranda (gaya identik tombol Jurnal di sebelahnya). */}
              <m.button
                type="button"
                onClick={() => setScreen('statistik')}
                aria-label="Buka Statistik — ringkasan dan perkembangan"
                whileTap={{ scale: 0.92 }}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-primary/70 text-content-secondary shadow-soft transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-primary/70 text-content-secondary shadow-soft transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <BookOpen className="h-4 w-4" strokeWidth={2} />
              </m.button>
              <m.button
                type="button"
                onClick={() => setScreen('profil')}
                aria-label="Buka profil dan pengaturan"
                whileTap={{ scale: 0.92 }}
                /* v2.49 (audit): avatar = pintu utama Profil di ponsel —
                   bidang ketuk 44px (visual 36px + bantalan transparan). */
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Avatar className="h-9 w-9 border-2 border-surface-primary shadow-sm">
                  <AvatarFallback className="bg-cocoa text-eyebrow font-semibold tracking-widest text-parchment">
                    PR
                  </AvatarFallback>
                </Avatar>
              </m.button>
            </div>
          </div>
          <WordReveal
            as="h1"
            text={greeting}
            visitKey="home-greeting"
            hold={!shellRevealed}
            className={`${playfair.className} mt-2.5 text-balance text-fluid-editorial font-semibold leading-tight tracking-tight text-content-primary`}
          />
        </m.header>
      </div>

      {/* 1 — Komposisi hero v3.1 (mock Make, 100% sama): kartu editorial
          beige "The Daily Edition" (tile lebar) + kartu progres sage
          "Hari ini, kamu" (tile pendamping). Semua metrik hero lama
          (persen, streak, misi pekan, Level/XP) hidup di kartu sage. */}
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
            <section aria-label="Edisi harian" className="h-full">
              <MotionCard
                visitKey="home-hero"
                className="relative h-full overflow-hidden rounded-[var(--layout-hero-radius)] bg-editorial-surface p-6 shadow-soft @[34rem]:p-7"
              >
                {/* Ilustrasi flat — orang menyiram tanaman (mock Make);
                    dekoratif, disembunyikan di kontainer sempit. */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 220 170"
                  className="pointer-events-none absolute bottom-0 right-4 hidden h-40 w-52 text-forest opacity-90 @[34rem]:block @[44rem]:h-48 @[44rem]:w-64"
                  fill="none"
                >
                  {/* matahari */}
                  <circle cx="182" cy="30" r="16" className="fill-tan/70" />
                  {/* busur tanah */}
                  <path
                    d="M18 152 C 60 138, 150 138, 204 150"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.5"
                  />
                  {/* tanaman bertumbuh */}
                  <path
                    d="M96 150 C 96 128, 95 112, 96 96"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M96 122 C 82 118, 74 108, 72 94 C 86 96, 95 106, 96 122 Z"
                    className="fill-sage-deep/80"
                  />
                  <path
                    d="M96 108 C 110 104, 118 94, 120 80 C 106 82, 97 92, 96 108 Z"
                    className="fill-sage-deep"
                  />
                  <path
                    d="M96 92 C 88 88, 84 80, 83 70 C 92 72, 97 80, 96 92 Z"
                    className="fill-sage"
                  />
                  {/* orang merawat (siluet flat) */}
                  <circle cx="46" cy="84" r="11" className="fill-current" />
                  <path
                    d="M40 96 C 34 108, 34 126, 38 148 L 54 148 C 56 130, 58 114, 64 102 C 68 94, 60 90, 54 96 Z"
                    className="fill-current"
                  />
                  {/* lengan + penyiram */}
                  <path
                    d="M62 106 C 72 110, 80 114, 88 116"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M86 108 L 104 112 L 100 126 L 84 120 Z"
                    className="fill-current"
                  />
                  <path
                    d="M102 114 L 116 104"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* tetesan air */}
                  <path
                    d="M112 108 C 114 112, 114 114, 112 116 C 110 114, 110 112, 112 108 Z"
                    className="fill-sky-deep/60"
                  />
                  <path
                    d="M120 102 C 122 106, 122 108, 120 110 C 118 108, 118 106, 120 102 Z"
                    className="fill-sky-deep/60"
                  />
                </svg>

                {/* Lencana putih miring — pesan tenang mock. */}
                <span
                  aria-hidden="true"
                  className="absolute right-5 top-5 hidden rotate-[6deg] rounded-full bg-cream-card px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-forest-ink shadow-soft @[40rem]:block"
                >
                  Grow at your own pace
                </span>

                <div className="relative z-[1] max-w-[34rem]">
                  <p className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-muted">
                    The Daily Edition · Rutina
                  </p>
                  <h2
                    className={`${playfair.className} mt-2.5 text-balance text-fluid-title font-semibold leading-[1.08] tracking-tight text-content-primary`}
                  >
                    Hidup bukan perlombaan.{' '}
                    <em className="text-sage-deep">Nikmati ritmenya.</em>
                  </h2>
                  <p className="mt-3 max-w-[26rem] text-body font-medium leading-relaxed text-content-secondary">
                    Setiap hari adalah edisi barumu — rawat kebiasaan kecil,
                    catat ceritamu, dan biarkan pertumbuhan datang dari
                    kesabaran, bukan terburu-buru.
                  </p>
                  <m.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    transition={motionTokens.spring.snappy}
                    onClick={() =>
                      document
                        .getElementById('agenda-hari-ini')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                    className="interactive mt-5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-action-primary px-5 text-meta font-bold text-action-primary-fg shadow-soft hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Mulai langkah kecil
                    <span aria-hidden="true">→</span>
                  </m.button>
                </div>
              </MotionCard>
            </section>
          </RutinaBentoItem>

          {/* Kartu progres sage (mock "Hari ini, kamu / Sudah melangkah
              sejauh ini.") — menampung seluruh metrik hero lama: cincin
              persen, N-dari-M kebiasaan, streak, misi pekan, Level/XP. */}
          <RutinaBentoItem span="feature">
            <section aria-label="Progres hari ini" className="h-full">
              <MotionCard
                visitKey="home-progress"
                className="flex h-full flex-col rounded-2xl bg-module-kebiasaan-soft p-5 shadow-soft"
              >
                <p className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-sage-ink/70">
                  Hari ini, kamu
                </p>
                <h3
                  className={`${playfair.className} mt-1 text-lg font-semibold leading-snug tracking-tight text-content-primary`}
                >
                  Sudah melangkah sejauh ini.
                </h3>

                {/* Cincin progres + N-dari-M (mock: ring 50%, "2 dari 4
                    kebiasaan →"). */}
                <div className="mt-4 flex items-center gap-4">
                  <div className="relative h-[74px] w-[74px] shrink-0">
                    <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
                      <circle
                        cx="42"
                        cy="42"
                        r="35"
                        fill="none"
                        strokeWidth="8"
                        className="stroke-forest-ink/12"
                      />
                      <m.circle
                        cx="42"
                        cy="42"
                        r="35"
                        fill="none"
                        strokeWidth="8"
                        strokeLinecap="round"
                        className="stroke-sage-deep"
                        strokeDasharray={2 * Math.PI * 35}
                        initial={playEntrance ? { strokeDashoffset: 2 * Math.PI * 35 } : false}
                        animate={{
                          strokeDashoffset:
                            2 * Math.PI * 35 * (1 - (scheduledToday > 0 ? schedDoneToday / scheduledToday : 0)),
                        }}
                        transition={{ ...barFill, duration: motionTokens.duration.dramatic }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-kpi-sm font-bold tabular-nums text-content-primary">
                      <Counter to={pct} immediate={!playEntrance} />
                      <span className="ml-0.5 text-note font-bold text-content-muted">%</span>
                    </span>
                  </div>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById('agenda-hari-ini')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                      className="text-left text-body font-bold text-content-primary underline decoration-sage-deep/40 underline-offset-4 transition-colors hover:decoration-sage-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <span className="tabular-nums">
                        {schedDoneToday} dari {scheduledToday}
                      </span>{' '}
                      kebiasaan <span aria-hidden="true">→</span>
                    </button>
                    <p
                      className={
                        'mt-1 text-note font-medium ' +
                        (scheduledToday > 0 && missionRemaining === 0
                          ? 'text-success'
                          : 'text-content-muted')
                      }
                    >
                      {scheduledToday === 0
                        ? todayHabits.length > 0
                          ? 'Hari jeda — tidak ada misi jatuh tempo.'
                          : 'Belum ada misi terjadwal.'
                        : missionRemaining === 1
                          ? 'Satu langkah lagi menuju hari sempurna.'
                          : missionRemaining > 0
                            ? `${missionRemaining} misi tersisa`
                            : 'Semua misi selesai — hari yang sempurna.'}
                    </p>
                    {extraDoneToday > 0 && (
                      <span className="mt-1 inline-block text-meta font-semibold text-success">
                        +{extraDoneToday} bonus
                      </span>
                    )}
                  </div>
                </div>

                {/* Rel metrik sekunder — streak & misi pekan (hero lama). */}
                <div className="mt-auto grid grid-cols-2 gap-2.5 border-t border-forest-ink/10 pt-3.5 text-meta font-semibold text-content-secondary">
                  <span className="flex items-center gap-1.5">
                    <m.span
                      aria-hidden="true"
                      className="flex"
                      animate={{ scale: [1, 1.06, 1] }}
                      transition={motionTokens.preset.ambientPulse}
                    >
                      <Flame className="h-3.5 w-3.5 text-rust" strokeWidth={2.2} />
                    </m.span>
                    <span className="tabular-nums">Streak {streak} hari</span>
                  </span>
                  <span className="flex items-center justify-end gap-1.5">
                    <CalendarDays
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-sage-ink"
                      strokeWidth={2.2}
                    />
                    <span className="tabular-nums">
                      Pekan {weekMission.done}/{weekMission.sched}
                    </span>
                  </span>
                </div>

                {/* Strip Level + XP (hero lama) — tetap satu baris tenang. */}
                <div className="mt-3 border-t border-forest-ink/10 pt-3">
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="flex items-center gap-1.5 text-meta font-semibold text-content-secondary">
                      <Zap aria-hidden="true" className="h-3.5 w-3.5 text-sage-ink" strokeWidth={2.2} />
                      <span className="tabular-nums">Level {level}</span>
                    </span>
                    <span className="shrink-0 text-meta font-bold tabular-nums text-content-primary">
                      <Counter to={xp} immediate={!playEntrance} /> XP
                    </span>
                  </div>
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-forest-ink/10"
                    role="progressbar"
                    aria-label={`Progres XP menuju ${XP_TARGET}`}
                    aria-valuenow={Math.min(xp, XP_TARGET)}
                    aria-valuemin={0}
                    aria-valuemax={XP_TARGET}
                  >
                    <m.div
                      className="h-full origin-left rounded-full bg-sage-deep"
                      style={{ width: '100%' }}
                      initial={playEntrance ? { scaleX: 0 } : false}
                      animate={{ scaleX: xpProgress }}
                      transition={barFill}
                    />
                  </div>
                </div>
              </MotionCard>
            </section>
          </RutinaBentoItem>
        </RutinaBentoGrid>

        {/* Insight saldo bersih — pendamping flat (bukan kartu) di bawah
            komposisi hero; fitur lama dipertahankan. */}
        <section aria-label="Insight hari ini" className="mt-5">
          <RutinaSectionHeader title="Insight hari ini" />
          <div className="mt-3.5">
            <RutinaMetric
              label="Saldo bersih"
              value={
                netSaldo < 0
                  ? `−${formatIDRShort(-netSaldo)}`
                  : formatIDRShort(netSaldo)
              }
              icon={Wallet}
              iconClassName="bg-sky-soft text-sky-deep"
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
      </m.div>

      {/* Kalender dua pekan melayang (sticky) — mengendalikan tanggal agenda */}
      <DateStrip />

      {/* 2 — Komposisi bento agenda: daftar misi (tile lebar) + SATU
          area rekomendasi "Untuk Hari Ini" (tile sempit) pada xl;
          urutan DOM sama. Kolom rekomendasi selalu terisi (pratinjau
          coach / sorotan netral sebagai pengisi) sehingga agenda tidak
          pernah kehilangan pasangannya (v2.56 — dulu kondisional
          melebar penuh saat kolom kosong; layout kini stabil). */}
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
          <RutinaBentoItem span="wide">
            <section aria-label="Agenda hari ini" id="agenda-hari-ini">
              <RutinaSectionHeader
                title={viewingToday ? 'Agenda hari ini' : 'Agenda'}
                description={
                  viewingToday
                    ? undefined
                    : viewingPast
                      ? 'Melihat riwayat — centang menyimpan untuk tanggal yang sedang dibuka.'
                      : 'Misi tampil sesuai jadwal, belum bisa dicentang.'
                }
              />

              {/* Halaman planner agenda: paper-surface memberi garis margin
                  kiri 2px + sapuan matcha lembut dari sisi awal; tiap
                  kelompok waktu mengalir di atas rel timeline. (Pita konteks
                  tanggal lampau kini hidup di bawah kalender DateStrip —
                  satu sumber, tanpa duplikasi review v2.44.) */}
              <div className="paper-surface mt-4 rounded-2xl border-y border-e p-4 shadow-soft sm:p-6">

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
                    {/* v2.50 (Mission Trail): "Jalur Misi" — strip
                        checkpoint perjalanan misi di kepala halaman
                        planner, tampil di mode ringkas MAUPUN rel waktu
                        penuh: selesai (penuh) → aktif (cincin) → akan
                        datang (putus-putus); jalur padat sejauh misi
                        benar-benar selesai. Dekoratif-informatif —
                        interaksi tetap di baris TaskRow di bawahnya.
                        key=tanggal: pergantian tanggal memasang ulang
                        rel tanpa memutar pop (anti-replay). */}
                    <MissionTrail
                      key={selectedDate}
                      missions={trailMissions}
                      upcomingOnly={selectedDate > today}
                      className="mb-5"
                    />

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
                              {/* v2.47 (Mission Trail): chip progres "x/y" +
                                  bar mini di tiap rel waktu — perjalanan
                                  pagi/siang/malam; reaktif terhadap centang
                                  (barFill), dekoratif (aria-hidden bar). */}
                              {(() => {
                                const prog = slotProgress.get(g.key)
                                if (!prog || prog.total <= 0) return null
                                return (
                                  <span className="ml-auto flex shrink-0 items-center gap-1.5">
                                    <span className="rounded-full bg-module-accent/12 px-1.5 text-chart-label font-semibold tabular-nums text-module-accent-strong">
                                      {prog.done}/{prog.total}
                                    </span>
                                    <span
                                      aria-hidden="true"
                                      className="block h-1 w-14 overflow-hidden rounded-full bg-module-accent/15"
                                    >
                                      <m.span
                                        initial={false}
                                        animate={{ scaleX: prog.done / prog.total }}
                                        transition={barFill}
                                        className="block h-full w-full origin-left rounded-full bg-module-accent"
                                      />
                                    </span>
                                  </span>
                                )
                              })()}
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

          {/* Kolom sempit: "Untuk Hari Ini" — SATU rekomendasi
              kontekstual (v2.56, audit Tahap 2). Dulu tiga blok menumpuk
              di sini (Sorotan + kartu pemulihan + deretan kartu Saran
              Coach) yang bisa tampil bersamaan; kini ForTodaySection
              memilih satu yang paling relevan (pemulihan → sorotan
              mendesak lintas modul → pratinjau coach → sorotan netral),
              detail saran coach tetap hidup di layar Kebiasaan.
              Jarak dari agenda hanya di bawah xl (mt-6 xl:mt-0). */}
          <RutinaBentoItem
            span="feature"
            className="mt-6 @[52rem]:mt-0"
          >
            <ForTodaySection
              recovery={attention.recovery}
              excludeHabitIds={attention.actionIds}
            />
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

      {/* 3.5 — Kartu suasana (mock Make "A moment for yourself /
          Bagaimana perasaanmu?") — lima wajah membuka Check-in harian;
          suasana terakhir hari ini ditandai bila sudah ada. */}
      <m.section
        initial={playEntrance ? { opacity: 0, y: 16 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...motionTokens.preset.data, delay: motionTokens.delay.normal }}
        aria-label="Suasana hati hari ini"
      >
        <MotionCard
          visitKey="home-mood"
          className="rounded-2xl bg-editorial-surface p-5 shadow-soft"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-muted">
                A moment for yourself
              </p>
              <h3
                className={`${playfair.className} mt-1 text-lg font-semibold leading-snug tracking-tight text-content-primary`}
              >
                Bagaimana perasaanmu?
              </h3>
              <p className="mt-0.5 text-note font-medium text-content-muted">
                Tidak ada jawaban yang salah.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {MOOD_FACES.map((face) => {
              const active = todayMood === face.mood
              return (
                <button
                  key={face.mood}
                  type="button"
                  onClick={() => openCheckIn()}
                  aria-label={`Suasana hati: ${face.label} — buka check-in harian`}
                  aria-pressed={active}
                  className={`interactive flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border text-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    active
                      ? 'border-transparent bg-sage text-forest-ink'
                      : 'border-forest-ink/20 bg-transparent hover:bg-forest-ink/5'
                  }`}
                >
                  <span aria-hidden="true">{face.emoji}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-3.5 text-note font-medium italic text-content-muted">
            Berhenti sebentar. Dengarkan dirimu.
          </p>
        </MotionCard>
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
          {/* onNavigateToAgenda: Beranda menggulir di kontainer sendiri —
              "Buka di Agenda" membawa pandangan pengguna ke DateStrip di
              puncak layar (revisi audit v2.45; window.scrollTo no-op). */}
          <WeeklyRecapCard
            onNavigateToAgenda={() =>
              scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
            }
          />
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
      <MotionCard
        as="section"
        visitKey="home-jurnal-door"
        aria-label="Jurnal dan catatan"
        /* v3.1 mock Make "Dear me," — kartu jurnal lavender. */
        className="relative overflow-hidden rounded-2xl bg-module-journal-soft p-5 shadow-soft"
      >
        <div className="flex flex-wrap items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-primary/90 text-module-journal-strong">
            <BookOpen className="h-5 w-5" strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-module-journal-strong/80">
              Dear me,
            </p>
            <p
              className={`${playfair.className} mt-0.5 text-lg font-semibold leading-snug tracking-tight text-content-primary`}
            >
              Hari ini layak dicatat.
            </p>
            <p className="mt-0.5 text-meta font-medium text-content-muted">
              {notes.length} catatan di {FOLDERS.length} folder
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => openCompose()}
              aria-label="Buat catatan baru"
              className="h-9 rounded-full border-border px-4 text-meta font-bold text-content-secondary hover:bg-surface-primary hover:text-content-primary"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
              Tulis satu cerita
            </Button>
            <Button
              type="button"
              onClick={() => setScreen('jurnal')}
              className="h-9 rounded-full bg-module-journal-strong px-4 text-meta font-bold text-module-journal-fg shadow-soft hover:opacity-90"
            >
              Buka
            </Button>
          </div>
        </div>
        {/* v2.83 (audit UX §A): deret chip folder DIHAPUS dari Beranda —
            pintu masuk Jurnal cukup satu (kartu ini + tombol Buka);
            folder lengkap dengan hitungan per kategori hidup di layar
            Jurnal. Draf terakhir tetap satu baris, hanya saat ada draf. */}
        {/* Lanjutkan draf terakhir — draf (catatan tanpa judul) terbaru
            dibuka langsung di kanvas menulis. */}
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
      </MotionCard>

      {/* Taman Pertumbuhan Beranda (v2.83, audit UX §A) — SATU lokasi
          utama per visualisasi: Pohon Kebun (konsistensi global, khas
          Beranda) tetap; PlantGarden dipensiunkan dari sini karena bedeng
          tanaman per-kebiasaan kini hidup di ruang Konsistensi layar
          Kebiasaan (pemilih visualisasi "Taman", v2.78) — tumpukan visual
          kembar di dua layar membuat Beranda terasa lebih panjang tanpa
          informasi baru. */}
      {hasActiveHabits && <GardenTree />}

      {/* 7 — Refleksi (v2.83, audit UX §A): bagian yang DIBUKA — kutipan
          harian tetap utuh (ganti/simpan), namun tidak lagi memakan
          setengah layar di kondisi awal; pemicu ringkas satu baris. */}
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            aria-label="Refleksi hari ini — kutipan harian yang bisa diganti dan disimpan ke Jurnal. Buka untuk membaca"
            className="interactive group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-primary p-3.5 text-left shadow-soft transition-colors hover:bg-surface-sunken/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary"
            >
              <Quote aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold text-content-primary">
                Refleksi Hari Ini
              </span>
              <span className="mt-0.5 block text-meta font-medium text-content-muted">
                kutipan harian · bisa disimpan ke Jurnal
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-content-muted transition-transform duration-300 group-data-[state=open]:rotate-180"
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
      <m.section
        initial={playEntrance ? { opacity: 0, y: 18 } : false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={motionTokens.preset.pageEntrance}
        aria-label="Refleksi hari ini"
        className="mt-3 rounded-xl bg-surface-inverse p-6 text-content-inverse shadow-ink"
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
        </CollapsibleContent>
      </Collapsible>
    </SmoothScrollArea>
  )
}
