'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { animate, stagger } from 'animejs'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BatteryLow,
  CalendarDays,
  Dumbbell,
  Flame,
  Laugh,
  Medal,
  Meh,
  Minus,
  Smile,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

import { Counter } from '../counter'
import {
  DayDetailPanel,
  DayDetailSheet,
  notesInWindow,
} from '../day-detail-sheet'
import Heatmap from '../heatmap'
import { MonthCalendar, type MonthDayInfo } from '../month-calendar'
import { useMinWidth } from '../use-min-width'
import { CAT_META } from '../finance/cats'
import {
  formatIDR,
  formatIDRShort,
  monthFlow,
  monthLabel,
  monthRange,
  monthSpendByCat,
  spendByDay,
} from '../finance/utils'
import {
  MOODS,
  XP_TARGET,
  addDaysISO,
  addMonthsISO,
  bestStreak,
  computeLevel,
  computeXp,
  dayCounts,
  doneCountOn,
  fromISO,
  habitsOn,
  isDoneOn,
  rateSeries,
  shortDateLabel,
  todayISO,
  useRutina,
  weekCounts,
  weekStartISO,
  type FinCat,
  type Habit,
  type HabitCat,
} from '../store'
import { RutinaBentoGrid, RutinaBentoItem } from '../rutina-bento'
import { RutinaCard } from '../rutina-card'
import { RutinaEmptyState } from '../rutina-empty-state'
import { RutinaSectionHeader } from '../rutina-section-header'
import { motionTokens } from '@/lib/motion/tokens'
import {
  cardioSummary,
  prBoard,
  tonaseOf,
  weightSeries,
} from '../fitness/fit-utils'

import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'

/** Keliling ring progres XP (r = 78 pada viewBox 200). */
const R = 78
const CIRC = 2 * Math.PI * R
/* Kurva gerak CSS batang grafik — mengikuti kurva preset.data agar
   transisi CSS & Motion terasa satu denyut (governance audit v2.9). */
const BAR_EASE = motionTokens.easing.standard

/** Ikon suasana hati — padanan MOODS di store. */
const MOOD_ICONS: Record<string, typeof Laugh> = {
  Ceria: Laugh,
  Baik: Smile,
  Biasa: Meh,
  Lelah: BatteryLow,
}

/** Distribusi kategori kebiasaan aktif — dihitung dari data nyata.
    Color System v2: warna donut & legenda kategori memakai token kategori
    kebiasaan (var(--habit-cat-*)) — sumber yang sama dengan layar Kebiasaan
    (store.ts), sehingga identitas kategori konsisten lintas layar dan ikut
    terang otomatis di mode gelap. */
const CAT_CHART_COLORS: Record<HabitCat, string> = {
  Kebiasaan: 'var(--habit-cat-kebiasaan)',
  Kerja: 'var(--habit-cat-kerja)',
  Kesehatan: 'var(--habit-cat-kesehatan)',
  Pribadi: 'var(--habit-cat-pribadi)',
  Belajar: 'var(--habit-cat-belajar)',
}

function categoryData(habits: Habit[]) {
  const counts = new Map<HabitCat, number>()
  for (const h of habits) {
    if (h.archived) continue
    counts.set(h.cat, (counts.get(h.cat) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([name, value]) => ({
    name,
    value,
    color: CAT_CHART_COLORS[name],
  }))
}

/** Judul seksi lokal — titik & hint memakai aksen domain Statistik
    (Mineral Slate) lewat utilitas module-accent kontekstual. */
function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="flex items-center gap-1.5 text-section font-semibold tracking-tight text-content-secondary">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-module-accent"
        />
        {title}
      </h2>
      {hint ? (
        <span className="text-xs font-medium text-module-accent-strong">{hint}</span>
      ) : null}
    </div>
  )
}

export default function StatsScreen() {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const notes = useRutina((s) => s.notes)
  const mood = useRutina((s) => s.mood)
  const setMood = useRutina((s) => s.setMood)
  const bonusClaimed = useRutina((s) => s.bonusClaimed)
  const workouts = useRutina((s) => s.workouts)
  const foodEntries = useRutina((s) => s.foodEntries)
  const bodyLogs = useRutina((s) => s.bodyLogs)
  const txs = useRutina((s) => s.txs)
  const budgets = useRutina((s) => s.budgets)
  const identityText = useRutina((s) => s.identityText)

  const today = todayISO()

  const [period, setPeriod] = useState<'pekan' | 'bulan'>('pekan')

  /* ===== Kalender Aktivitas & Laporan Bulanan (audit #7 & #8) =====
     Satu state bulan dipakai bersama: kalender menavigasi, laporan
     mengikuti. Jangkau: Jan (tahun ini − 2) s.d. bulan berjalan. */
  const [viewAnchor, setViewAnchor] = useState(today)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  /* Inspector desktop — aktif hanya bila RUANG KERJA (bukan viewport)
     benar-benar lega: padanan JS untuk container query @[52rem] = 832px
     yang dipakai bento. Di ruang sempit detail tanggal tetap memakai
     sheet (dikawatirkan di bawah). */
  const rootRef = useRef<HTMLDivElement>(null)
  const inspectorWide = useMinWidth(rootRef, 832)
  const viewYm = viewAnchor.slice(0, 7)
  const todayYm = today.slice(0, 7)
  const minYm = `${fromISO(today).getFullYear() - 2}-01`
  const canPrev = viewYm > minYm
  const canNext = viewYm < todayYm
  const goPrevMonth = () => setViewAnchor(addMonthsISO(`${viewYm}-01`, -1))
  const goNextMonth = () => setViewAnchor(addMonthsISO(`${viewYm}-01`, 1))

  /* Peta data per tanggal untuk titik kalender — sekali hitung untuk
     seluruh histori; jumlah terjadwal hanya dihitung untuk bulan tampilan
     (kebutuhan intensitas titik matcha). */
  const dayInfo = useMemo<Record<string, MonthDayInfo>>(() => {
    const map: Record<string, MonthDayInfo> = {}
    for (const [iso, rec] of Object.entries(completions)) {
      const done = Object.values(rec ?? {}).filter(Boolean).length
      if (done > 0) map[iso] = { ...map[iso], done }
    }
    for (const t of txs) {
      if (t.type === 'transfer') continue
      map[t.ts] = { ...map[t.ts], hasTx: true }
    }
    for (const w of workouts) map[w.date] = { ...map[w.date], hasWorkout: true }
    const range = monthRange(viewYm)
    for (let iso = range.start; iso <= range.end; iso = addDaysISO(iso, 1)) {
      const scheduled = habitsOn(habits, iso).length
      if (scheduled > 0) map[iso] = { ...map[iso], scheduled }
    }
    return map
  }, [completions, txs, workouts, habits, viewYm])

  /* Laporan bulanan — konsistensi, pengeluaran, anggaran (audit #8). */
  const monthReport = useMemo(() => {
    const range = monthRange(viewYm)
    /* Bulan berjalan dihitung sampai hari ini agar persentase tidak
       terkempiskan oleh hari yang belum terjadi. */
    const last = viewYm === todayYm ? today : range.end
    let sched = 0
    let done = 0
    for (let iso = range.start; iso <= last; iso = addDaysISO(iso, 1)) {
      const dayHabits = habitsOn(habits, iso)
      sched += dayHabits.length
      for (const h of dayHabits) {
        if (isDoneOn(completions, iso, h.id)) done++
      }
    }
    const flow = monthFlow(txs, viewYm)
    const byCat = monthSpendByCat(txs, viewYm)
    const catTotal = flow.keluar
    const topCats = Object.entries(byCat)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amount]) => ({
        cat: cat as FinCat,
        amount,
        share: catTotal > 0 ? Math.round((amount / catTotal) * 100) : 0,
      }))
    const budgetUse = Object.entries(budgets)
      .map(([cat, limit]) => ({
        cat: cat as FinCat,
        limit,
        used: byCat[cat] ?? 0,
      }))
      .filter((b) => b.used > 0)
      .sort((a, b) => b.used / Math.max(1, b.limit) - a.used / Math.max(1, a.limit))
    const monthWorkouts = workouts.filter(
      (w) => w.date >= range.start && w.date <= range.end,
    )
    const hasActivity =
      done > 0 || flow.masuk > 0 || flow.keluar > 0 || monthWorkouts.length > 0
    return {
      pct: sched > 0 ? Math.round((done / sched) * 100) : 0,
      sched,
      done,
      flow,
      topCats,
      budgetUse,
      hasActivity,
    }
  }, [habits, completions, txs, budgets, workouts, viewYm, todayYm, today])

  /* ===== Pekan Ini vs Pekan Lalu (audit #12) =====
     Pekan berjalan dihitung Senin..hari ini; pekan lalu tujuh hari penuh. */
  const weekStart = weekStartISO(today)
  const prevWeekStart = addDaysISO(weekStart, -7)
  const weekMetrics = useMemo(() => {
    const byDay = spendByDay(txs)
    const daysOf = (start: string, end: string) => {
      const out: string[] = []
      for (let iso = start; iso <= end; iso = addDaysISO(iso, 1)) out.push(iso)
      return out
    }
    const curDays = daysOf(weekStart, today)
    const prevDays = daysOf(prevWeekStart, addDaysISO(weekStart, -1))

    const activeDays = (ds: string[]) =>
      ds.filter((iso) => doneCountOn(completions, iso) > 0).length
    const totalDone = (ds: string[]) =>
      ds.reduce((a, iso) => a + doneCountOn(completions, iso), 0)
    const spendOf = (ds: string[]) =>
      ds.reduce((a, iso) => a + (byDay[iso]?.total ?? 0), 0)
    const workoutsOf = (ds: string[]) => {
      const set = new Set(ds)
      const list = workouts.filter((w) => set.has(w.date))
      return {
        count: list.length,
        minutes: list.reduce((a, w) => a + w.duration, 0),
      }
    }

    interface MetricRow {
      key: string
      label: string
      cur: string
      prev: string
      /** Angka mentah — dasar lebar batang berpasangan (skala per metrik). */
      curN: number
      prevN: number
      delta: number
      /** "naik 8" / "turun 250 rb" — ringkas, untuk chip pembanding. */
      deltaText: string
      dir: 'up' | 'down' | 'flat'
      good: boolean | null
    }
    const rows: MetricRow[] = []
    const push = (
      key: string,
      label: string,
      curN: number,
      prevN: number,
      invert: boolean,
      fmt: (n: number) => string,
      fmtDelta: (n: number) => string,
    ) => {
      const delta = curN - prevN
      const dir: MetricRow['dir'] = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
      rows.push({
        key,
        label,
        cur: fmt(curN),
        prev: fmt(prevN),
        curN,
        prevN,
        delta,
        deltaText:
          delta === 0
            ? 'stabil'
            : `${delta > 0 ? 'naik' : 'turun'} ${fmtDelta(Math.abs(delta))}`,
        dir,
        good: dir === 'flat' ? null : invert ? delta < 0 : delta > 0,
      })
    }

    push('active', 'Hari aktif', activeDays(curDays), activeDays(prevDays), false, (n) => `${n} hari`, (n) => `${n} hari`)
    push('done', 'Kebiasaan selesai', totalDone(curDays), totalDone(prevDays), false, (n) => `${n} misi`, (n) => `${n} misi`)
    push(
      'notes',
      'Catatan (perkiraan)',
      notesInWindow(notes, weekStart, today, today),
      notesInWindow(notes, prevWeekStart, addDaysISO(weekStart, -1), today),
      false,
      (n) => `${n} catatan`,
      (n) => `${n} catatan`,
    )
    /* Pengeluaran: makin kecil makin baik — panah dibalik. */
    push('spend', 'Total pengeluaran', spendOf(curDays), spendOf(prevDays), true, (n) => formatIDR(n), (n) => formatIDRShort(n))
    const woCur = workoutsOf(curDays)
    const woPrev = workoutsOf(prevDays)
    push('workout', 'Latihan', woCur.count, woPrev.count, false, (n) => `${n} sesi`, (n) => `${n} sesi`)
    const workoutRow = rows.find((r) => r.key === 'workout')
    if (workoutRow) {
      workoutRow.cur = `${woCur.count} sesi · ${woCur.minutes} mnt`
      workoutRow.prev = `${woPrev.count} sesi · ${woPrev.minutes} mnt`
    }
    return rows
  }, [txs, completions, notes, workouts, weekStart, prevWeekStart, today])

  const chartRef = useRef<HTMLDivElement>(null)
  const chartInView = useInView(chartRef, { once: true, margin: '-40px' })

  /* Misi hari ini — dari jadwal & histori penyelesaian nyata (dipakai
     menghitung XP ring profil; ring misi harian sendiri sudah dibaca di
     Beranda — audit visualisasi v2.12). */
  const todayHabits = habitsOn(habits, today)
  const doneCount = todayHabits.filter((h) =>
    isDoneOn(completions, today, h.id),
  ).length

  const xp = computeXp(doneCount, bonusClaimed)
  const level = computeLevel(xp)
  const progress = Math.min(xp / XP_TARGET, 1)
  const remaining = Math.max(XP_TARGET - xp, 0)

  /* Streak terbaik & rekor dari seluruh kebiasaan aktif. */
  const best = bestStreak(habits, completions, today)
  const activeHabits = habits.filter((h) => !h.archived)

  /* ===== KPI strip — lensa 30 hari =====
     Konsistensi & misi memakai sumber kebenaran yang sama dengan grafik
     dan laporan di bawah: habitsOn + isDoneOn (ala rateSeries/monthReport)
     untuk rasio terjadwal, doneCountOn (ala dayCounts) untuk total misi.
     Streak & rekor dari bestStreak — sama dengan widget runtun. */
  const kpi = useMemo(() => {
    let sched = 0
    let done = 0
    let missions = 0
    for (let i = 29; i >= 0; i--) {
      const iso = addDaysISO(today, -i)
      for (const h of habitsOn(habits, iso)) {
        sched++
        if (isDoneOn(completions, iso, h.id)) done++
      }
      missions += doneCountOn(completions, iso)
    }
    return {
      consistency: sched > 0 ? Math.round((done / sched) * 100) : 0,
      sched,
      done,
      missions,
    }
  }, [habits, completions, today])

  const kpiTiles = [
    {
      key: 'konsistensi',
      /* Label pendek agar tak membungkus di tile sempit (ponsel 2 kolom);
         konteks "30 hari" dibawa caption tile Misi. */
      label: 'Konsistensi',
      value: kpi.consistency,
      unit: '%',
      caption:
        kpi.sched > 0
          ? `${kpi.done} dari ${kpi.sched} terjadwal`
          : 'Belum ada jadwal kebiasaan',
    },
    {
      key: 'misi',
      label: 'Misi Selesai',
      value: kpi.missions,
      unit: 'misi',
      caption: 'dalam 30 hari terakhir',
    },
    {
      key: 'streak',
      label: 'Streak Berjalan',
      value: best.streak,
      unit: 'hari',
      caption: best.habit ? best.habit.title : 'Belum ada kebiasaan aktif',
    },
    {
      key: 'rekor',
      label: 'Rekor Streak',
      value: best.record,
      unit: 'hari',
      caption: 'rekor terpanjangmu',
    },
  ]

  /* ===== Statistik lintas modul Bugar — semua dari data nyata ===== */

  /* Latihan: sesi & tonase 30 hari, PR terbaik, kardio. */
  const since30 = addDaysISO(today, -30)
  const recent = workouts.filter((w) => w.date >= since30)
  const fitSessions = recent.length
  const fitTonase = recent.reduce((a, w) => a + tonaseOf(w), 0)
  const topPr = prBoard(workouts)[0]
  const cardio = cardioSummary(workouts)
  /* Asupan: rata-rata kkal/hari dari 7 hari tercatat terakhir. */
  const kcalByDay = new Map<string, number>()
  for (const f of foodEntries) {
    kcalByDay.set(f.date, (kcalByDay.get(f.date) ?? 0) + f.kcal)
  }
  const last7Kcal = [...kcalByDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 7)
  const avgKcal =
    last7Kcal.length > 0
      ? Math.round(
          last7Kcal.reduce((a, [, k]) => a + k, 0) / last7Kcal.length,
        )
      : 0
  /* Tubuh: rata-rata tidur/energi/hidrasi 7 hari + delta berat. */
  const last7Logs = Object.entries(bodyLogs)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 7)
  const avgOf = (pick: (v: { sleepH?: number; energy?: number; water: number }) => number | undefined) => {
    const vals = last7Logs.map(([, v]) => pick(v)).filter((x): x is number => x != null)
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  const avgSleep = avgOf((v) => v.sleepH)
  const avgEnergy = avgOf((v) => v.energy)
  const avgWater = avgOf((v) => v.water)
  const wSeries = weightSeries(bodyLogs)
  const weightDelta =
    wSeries.length >= 2
      ? wSeries[wSeries.length - 1].kg - wSeries[0].kg
      : null

  /* Grafik misi selesai: 7 hari terakhir atau 4 pekan (P4 = berjalan). */
  const weekData = dayCounts(completions, today, 7)
  const monthData = weekCounts(completions, today)
  const chartData =
    period === 'pekan'
      ? weekData.map((d) => ({ label: d.label, value: d.count }))
      : monthData.map((w) => ({ label: w.label, value: w.value }))
  /* Guard pembagian nol: pastikan maksimum minimal 1. */
  const chartMax = Math.max(...chartData.map((d) => d.value), 1)
  const chartTotal = chartData.reduce((a, b) => a + b.value, 0)
  const peak = chartData.reduce(
    (a, b) => (b.value > a.value ? b : a),
    chartData[0],
  )
  const p3 = monthData[2]?.value ?? 0
  const p4 = monthData[3]?.value ?? 0

  /* Ringkasan satu baris untuk panel Fokus Periode — dipindah dari kartu
     grafik agar kartu grafik menjadi instrumen murni. */
  const chartSummary =
    period === 'pekan'
      ? peak.value === 0
        ? 'Belum ada misi selesai pada tujuh hari terakhir.'
        : `Puncak ${peak.value} misi ada di hari ${peak.label}.`
      : p4 > p3
        ? `Pekan berjalan naik ${p4 - p3} misi dibanding pekan lalu.`
        : p4 < p3
          ? `Pekan berjalan turun ${p3 - p4} misi dibanding pekan lalu.`
          : 'Pekan berjalan setara dengan pekan lalu.'

  /* Tren penyelesaian 30 hari — persen selesai per hari. */
  const trend = rateSeries(habits, completions, today, 30)
  const trendAvg = trend.reduce((a, b) => a + b.v, 0) / (trend.length || 1)
  const avgLast15 = trend.slice(15).reduce((a, b) => a + b.v, 0) / 15
  const avgPrev15 = trend.slice(0, 15).reduce((a, b) => a + b.v, 0) / 15
  const trendDelta = avgLast15 - avgPrev15
  const trendBadge =
    trendDelta >= 1 ? 'naik' : trendDelta <= -1 ? 'turun' : 'stabil'
  const TrendIcon =
    trendDelta >= 1 ? TrendingUp : trendDelta <= -1 ? TrendingDown : Minus
  const above70 = trend.filter((p) => p.v > 70).length

  const catData = categoryData(habits)

  /* Lencana jujur — seluruh syarat dihitung dari data nyata. */
  const badges: {
    icon: LucideIcon
    name: string
    desc: string
    unlocked: boolean
  }[] = [
    {
      icon: Sparkles,
      name: 'Langkah Pertama',
      desc: 'Punya setidaknya satu kebiasaan aktif.',
      unlocked: activeHabits.length >= 1,
    },
    {
      icon: Flame,
      name: 'Momentum 7',
      desc: 'Jaga streak aktif hingga tujuh hari.',
      unlocked: best.streak >= 7,
    },
    {
      icon: Trophy,
      name: 'Api 30 Hari',
      desc: 'Capai rekor streak 30 hari tanpa putus.',
      unlocked: best.record >= 30,
    },
    {
      icon: Medal,
      name: 'Kolektor Catatan',
      desc: `Kumpulkan 100 catatan (sekarang ${notes.length}).`,
      unlocked: notes.length >= 100,
    },
  ]
  const unlockedCount = badges.filter((b) => b.unlocked).length

  /* anime.js — batang grafik tumbuh HANYA pada pandangan pertama
     (disiplin gerak: satu momen dominan per layar). Perubahan periode
     selanjutnya hanya memorf tinggi batang lewat transisi CSS ringan —
     koreografi stagger tidak diulang.
     Kebijakan reduced-motion: batang langsung tampil tanpa koreografi. */
  const reducedMotion = useReducedMotion()
  const barsPlayedRef = useRef(false)
  useEffect(() => {
    if (!chartRef.current) return
    const bars = chartRef.current.querySelectorAll('[data-bar]')
    if (!chartInView || reducedMotion) {
      /* Tanpa animasi: pastikan batang pada keadaan alami — termasuk
         membersihkan sisa scaleY(0) dari run sebelumnya bila preferensi
         berubah di tengah jalan. */
      bars.forEach((el) => {
        ;(el as HTMLElement).style.transform = ''
      })
      return
    }
    /* Gerbang pandangan-pertama: stagger sekali sepanjang hidup layar;
       pergantian periode tidak lagi memicu koreografi ulang. */
    if (barsPlayedRef.current) return
    barsPlayedRef.current = true
    /* Sembunyikan batang SEBELUM memicu stagger — tanpa ini batang akhir
       (delay ±0,3 dtk) sempat tampil penuh lalu melompat ke 0 (kilatan). */
    bars.forEach((el) => {
      ;(el as HTMLElement).style.transform = 'scaleY(0)'
    })
    /* Tanpa cleanup revert: animasi ini sekali-jalan dan tidak pernah
       bertumpuk (period bukan lagi dependensi) — revert justru memulihkan
       keadaan pra-animasi scaleY(0) dan membiarkan batang menghilang. */
    animate(bars, {
      scaleY: [0, 1],
      delay: stagger(55),
      duration: motionTokens.preset.chartRevealMs.duration,
      ease: 'outBack(1.3)',
    })
  }, [chartInView, reducedMotion])

  return (
    <TooltipProvider delayDuration={120}>
      <div
        ref={rootRef}
        data-module="stats"
        data-layout="observatory"
        className="h-full overflow-y-auto no-scrollbar px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-content-primary"
      >
        {/* Kepala halaman — Tipografi System v1: judul operasional Geist
            Sans weight 700; disiplin angka tabular di seluruh layar. */}
        <header>
          <p className="flex items-center gap-1.5 text-eyebrow font-semibold uppercase tracking-[0.16em] text-module-accent-strong">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-module-accent"
            />
            Observatorium data
          </p>
          <h1 className="mt-1.5 text-balance text-fluid-page font-bold leading-none tracking-tight">
            Statistik
          </h1>
          <p className="mt-2 text-body font-medium text-content-muted">
            Petualanganmu dalam angka
          </p>
        </header>

        {/* Profil pemain */}
        <section
          aria-label="Profil pemain"
          className="mt-[var(--layout-gap)] flex items-center gap-3"
        >
          <Avatar className="h-10 w-10 border-2 border-matcha/40">
            <AvatarFallback className="bg-matcha-action text-eyebrow font-semibold tracking-widest text-parchment">
              AN
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-section font-semibold tracking-tight">
              Ananda
            </p>
            <p className="text-eyebrow font-medium text-content-muted">
              Petualang Konsisten
            </p>
          </div>
          <span className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-cocoa px-3 text-eyebrow font-semibold text-pistachio shadow-soft">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
            LV {level}
          </span>
        </section>

        {/* Tumpukan seksi utama — ritme antar-bagian memakai token layout
            observatory (var(--layout-gap)) agar seluruh layar berbagi satu
            denyut laboratorium data yang seragam. */}
        <div className="mt-[var(--layout-gap)] flex flex-col gap-[var(--layout-gap)]">
        {/* Ring XP interaktif */}
        <section
          className="flex flex-col items-center"
          aria-label="Progres level pemain"
        >
          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={motionTokens.preset.data}
            whileTap={{ scale: 0.96 }}
            className="relative cursor-pointer select-none"
          >
            <svg
              viewBox="0 0 200 200"
              className="h-44 w-44 -rotate-90"
              role="img"
              aria-label={`Progres XP level ${level}: ${Math.round(progress * 100)} persen`}
            >
              <circle
                cx="100"
                cy="100"
                r={R}
                fill="none"
                stroke="var(--border-default)"
                strokeWidth="13"
              />
              <m.circle
                cx="100"
                cy="100"
                r={R}
                fill="none"
                stroke="url(#stats-xp-grad)"
                strokeWidth="13"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                initial={{ strokeDashoffset: CIRC }}
                animate={{ strokeDashoffset: CIRC * (1 - progress) }}
                transition={{ type: 'spring', stiffness: 80, damping: 18 }}
              />
              <defs>
                <linearGradient
                  id="stats-xp-grad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="var(--chart-stroke-4)" />
                  <stop offset="100%" stopColor="var(--chart-stroke-1)" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                Level
              </p>
              <p className="text-kpi-hero font-semibold leading-none tabular-nums text-content-primary">
                {level}
              </p>
              <span className="mt-2.5 rounded-full bg-cocoa px-2.5 py-1 text-eyebrow font-semibold text-pistachio">
                <Counter to={xp} /> XP
              </span>
            </div>
          </m.div>

          <p className="mt-3 text-center text-eyebrow font-medium text-content-muted">
            {level >= 8
              ? 'Level baru terbuka — lanjutkan petualanganmu'
              : `${remaining} XP lagi menuju Level ${level + 1}`}
          </p>
        </section>

        {/* ===== KPI strip — empat metrik inti, lensa 30 hari ===== */}
        <section aria-label="Ringkasan metrik utama">
          <RutinaBentoGrid className="grid-cols-2 @[42rem]:grid-cols-4">
            {kpiTiles.map((tile, i) => (
              <RutinaBentoItem key={tile.key}>
                <m.div
                  initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-24px' }}
                  transition={{ ...motionTokens.preset.data, delay: i * 0.05 }}
                  className="flex h-full flex-col rounded-[16px] border border-border bg-cocoa p-4 shadow-soft"
                >
                  <p className="flex items-center gap-1.5 text-chart-label font-semibold uppercase tracking-[0.14em] text-content-inverse/70">
                    <span
                      aria-hidden="true"
                      className="h-1 w-1 shrink-0 rounded-full bg-module-accent"
                    />
                    {tile.label}
                  </p>
                  <p className="mt-2.5 flex items-baseline gap-1">
                    <span className="text-kpi font-semibold leading-none tracking-tight tabular-nums text-content-inverse">
                      {tile.value.toLocaleString('id-ID')}
                    </span>
                    <span className="text-eyebrow font-semibold text-content-inverse/70">
                      {tile.unit}
                    </span>
                  </p>
                  <p className="mt-auto truncate pt-2 text-eyebrow font-medium leading-snug text-content-inverse/70">
                    {tile.caption}
                  </p>
                </m.div>
              </RutinaBentoItem>
            ))}
          </RutinaBentoGrid>
        </section>

        {/* Misi selesai — panel fokus periode + instrumen grafik.
            Pasangan bento feature(4) + wide(8): panel menyimpan sakelar
            periode, total, dan ringkasan; kartu grafik murni batang. */}
        <RutinaBentoGrid>
          <RutinaBentoItem className="col-span-2 @[42rem]:col-span-6 @[52rem]:col-span-4">
            {/* Panel fokus periode — sakelar periode + pembacaan ringkas */}
            <m.section
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={motionTokens.preset.data}
              className="flex h-full flex-col rounded-[16px] border border-border bg-cocoa p-5 shadow-card"
              aria-label="Fokus periode grafik misi selesai"
            >
              <p className="text-body font-semibold tracking-tight text-content-inverse/80">
                Fokus Periode
              </p>
              <Tabs
                value={period}
                onValueChange={(v) => setPeriod(v as 'pekan' | 'bulan')}
              >
                <TabsList className="h-[52px] w-full rounded-full bg-surface-inverse p-1">
                  <TabsTrigger
                    value="pekan"
                    className="h-11 flex-1 rounded-full px-4 text-note font-semibold text-content-inverse/75 data-[state=active]:bg-module-accent-strong data-[state=active]:text-module-accent-fg"
                  >
                    Pekan
                  </TabsTrigger>
                  <TabsTrigger
                    value="bulan"
                    className="h-11 flex-1 rounded-full px-4 text-note font-semibold text-content-inverse/75 data-[state=active]:bg-module-accent-strong data-[state=active]:text-module-accent-fg"
                  >
                    Bulan
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="text-kpi-hero font-semibold leading-none tracking-tight text-content-inverse">
                  <Counter to={chartTotal} />
                </span>
                <span className="text-sm font-medium text-content-inverse/70">
                  misi{period === 'pekan' ? ' / pekan' : ' / bulan'}
                </span>
              </p>
              <p className="mt-1.5 text-eyebrow font-medium text-content-inverse/70">
                {period === 'pekan'
                  ? 'Tujuh hari terakhir'
                  : 'Empat pekan terakhir — P4 pekan berjalan'}
              </p>
              <p className="mt-auto border-t border-content-inverse/10 pt-3 text-eyebrow font-medium leading-relaxed text-content-inverse/70">
                {chartSummary}
              </p>
            </m.section>
          </RutinaBentoItem>

          <RutinaBentoItem className="col-span-2 @[42rem]:col-span-6 @[52rem]:col-span-8">
            {/* Instrumen grafik — batang misi selesai */}
            <m.section
              ref={chartRef}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ ...motionTokens.preset.data, delay: 0.06 }}
              className="flex h-full flex-col rounded-[16px] border border-border bg-cocoa p-5 shadow-card"
              aria-label="Grafik misi selesai"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-body font-semibold tracking-tight text-content-inverse/80">
                  Misi Selesai
                </p>
                <p className="text-chart-label font-semibold uppercase tracking-[0.14em] text-content-inverse/50">
                  {period === 'pekan' ? 'per hari' : 'per pekan'}
                </p>
              </div>
              <div
                className="mt-auto flex items-end justify-between gap-2 pt-5"
                role="img"
                aria-label={`Grafik batang misi selesai ${period === 'pekan' ? 'tujuh hari terakhir' : 'empat pekan terakhir'}`}
              >
                {chartData.map((d, i) => {
                  /* Kunci indeks: batang P1–P4 memakai node DOM yang sama
                     dengan hari 1–4 sehingga pergantian periode memorf
                     tinggi batang (transisi CSS ringan) alih-alih memasang
                     ulang seluruh grafik — stagger anime.js tak diulang. */
                  const isPeak = d.value === chartMax && d.value > 0
                  return (
                    <div
                      key={i}
                      className="flex flex-1 flex-col items-center gap-1.5"
                    >
                      <div
                        data-bar
                        className={`w-full origin-bottom rounded-full ${
                          isPeak
                            ? 'bg-gradient-to-t from-chart-1 to-chart-4'
                            : 'bg-content-inverse/15'
                        }`}
                        style={{
                          height: `${
                            d.value === 0
                              ? 3
                              : Math.max(Math.round((d.value / chartMax) * 84), 6)
                          }px`,
                          transition: reducedMotion
                            ? undefined
                            : `height ${motionTokens.preset.data.duration * 1000}ms cubic-bezier(${BAR_EASE.join(',')})`,
                        }}
                      />
                      <span
                        className={`text-chart-label font-semibold ${
                          isPeak ? 'text-pistachio' : 'text-content-inverse/70'
                        }`}
                      >
                        {d.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </m.section>
          </RutinaBentoItem>
        </RutinaBentoGrid>

        {/* ===== Tren & Konsistensi — area 30 hari + heatmap 12 pekan =====
            (audit visualisasi v2.12: grafik garis TrendLine 7 hari dihapus
            karena tumpang tindih dengan grafik batang Misi Selesai — jumlah
            misi yang sama tak perlu digambar dua kali; area chart dipindah
            ke sini berpasangan dengan heatmap sebagai satu seksi tren.) */}
        <section aria-label="Tren dan konsistensi" className="@container">
          <SectionTitle title="Tren & Konsistensi" hint="% selesai per hari · 30 hari" />
          <div className="mt-3 grid grid-cols-1 gap-3 @[36rem]:grid-cols-2">
            {/* Grafik area tren penyelesaian */}
            <m.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={motionTokens.preset.data}
              className="rounded-[16px] border border-border bg-cocoa p-5 shadow-soft"
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-body font-semibold tracking-tight text-content-inverse/80">
                    Tren Penyelesaian
                  </p>
                  <p className="mt-0.5 text-eyebrow font-medium text-content-inverse/60">
                    persentase misi selesai · 30 hari terakhir
                  </p>
                  <p className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-kpi-hero font-semibold leading-none tracking-tight text-content-inverse">
                      <Counter to={trendAvg} decimals={1} />
                    </span>
                    <span className="text-sm font-medium text-content-inverse/70">
                      % rata-rata / hari
                    </span>
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-module-accent-strong px-2.5 py-1 text-eyebrow font-semibold text-module-accent-fg">
                  <TrendIcon className="h-3.5 w-3.5" />
                  {trendBadge}
                </span>
              </div>
                  <div className="mt-4">
                    <ResponsiveContainer width="100%" height={130}>
                      <AreaChart
                        data={trend}
                        margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
                      >
                        <defs>
                          <linearGradient
                            id="trendFillDark"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="var(--chart-4)"
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="100%"
                              stopColor="var(--chart-4)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="d"
                          tick={{
                            fill: 'color-mix(in oklab, var(--content-inverse) 70%, transparent)',
                            fontSize: 11,
                          }}
                          axisLine={false}
                          tickLine={false}
                          interval={7}
                          tickFormatter={(v: number) => `${v}`}
                        />
                        <YAxis hide domain={[0, 100]} />
                        <RechartsTooltip
                          cursor={{
                            stroke:
                              'color-mix(in oklab, var(--content-inverse) 20%, transparent)',
                          }}
                          contentStyle={{
                            background: 'var(--surface-inverse)',
                            border:
                              '1px solid color-mix(in oklab, var(--content-inverse) 12%, transparent)',
                            borderRadius: 12,
                            fontSize: 11,
                            color: 'var(--content-inverse)',
                          }}
                          labelFormatter={(v) => `Hari ke-${v}`}
                          formatter={(value) => [`${value}%`, 'Selesai']}
                        />
                        <Area
                          type="monotone"
                          dataKey="v"
                          stroke="var(--chart-4)"
                          strokeWidth={2.5}
                          fill="url(#trendFillDark)"
                          isAnimationActive
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-2 text-eyebrow font-medium text-content-inverse/70">
                    Konsistensi di atas 70% pada {above70} dari 30 hari terakhir.
                  </p>
                </m.div>

            {/* Heatmap — pola penyelesaian 12 pekan */}
            <Heatmap />
          </div>
        </section>

        {/* ===== Wawasan — komposisi kebiasaan aktif + suasana hati =====
            (audit visualisasi v2.12: duplikasi dihapus — ring misi harian
            sudah terbaca di Beranda, kartu streak ganda sudah terwakili KPI
            utama; donut diberi judul jujur sesuai sumber datanya.) */}
        <RutinaBentoGrid>
          <RutinaBentoItem span="medium">
            {/* Komposisi kebiasaan aktif — donut per kategori */}
            <m.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={motionTokens.preset.data}
              className="h-full rounded-[16px] border border-border bg-cocoa p-5 shadow-soft"
            >
              <p className="text-body font-semibold tracking-tight text-content-inverse/80">
                Komposisi Kebiasaan Aktif
              </p>
              <p className="mt-0.5 text-eyebrow font-medium text-content-inverse/60">
                jumlah kebiasaan per kategori — bukan aktivitas 30 hari
              </p>
              <div className="mt-3 flex items-center gap-4">
                <div className="relative h-28 w-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={catData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={34}
                        outerRadius={52}
                        paddingAngle={3}
                        stroke="none"
                        isAnimationActive
                      >
                        {catData.map((c) => (
                          <Cell key={c.name} fill={c.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-kpi-sm font-semibold leading-none tabular-nums text-content-inverse">
                      {activeHabits.length}
                    </span>
                    <span className="mt-0.5 text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-inverse/70">
                      aktif
                    </span>
                  </div>
                </div>
                <ul className="min-w-0 flex-1 space-y-2">
                  {catData.map((c) => (
                    <li
                      key={c.name}
                      className="flex items-center gap-2.5 text-meta"
                    >
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="flex-1 truncate font-medium text-content-inverse/80">
                        {c.name}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-content-inverse">
                        {c.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </m.div>
          </RutinaBentoItem>

          <RutinaBentoItem span="medium">
            {/* Suasana hati — catatan perasaan, dipindah dari Ringkasan Pekan */}
            <m.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ ...motionTokens.preset.data, delay: 0.06 }}
              className="h-full rounded-[16px] border border-border bg-cocoa p-5 shadow-soft"
            >
              <p className="text-body font-semibold tracking-tight text-content-inverse/80">
                Suasana Hati
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {MOODS.map((m) => {
                  const MoodIcon = MOOD_ICONS[m]
                  const selected = mood === m
                  return (
                    <button
                      /* key berubah saat terpilih → tombol dipasang ulang
                         sehingga animasi pop CSS bermain setiap kali aktif. */
                      key={selected ? `on-${m}` : `off-${m}`}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`Catat suasana hati: ${m}`}
                      onClick={() => setMood(selected ? null : m)}
                      className={
                        'flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
                        (selected
                          ? 'animate-pop border-module-accent-strong bg-module-accent-strong text-module-accent-fg'
                          : 'border-content-inverse/15 bg-surface-inverse text-content-inverse/75 hover:bg-surface-inverse/80')
                      }
                    >
                      <MoodIcon className="h-4 w-4" />
                      <span className="text-eyebrow font-semibold">{m}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-3 text-eyebrow font-medium text-content-inverse/70">
                {mood
                  ? `Kamu merasa ${mood.toLowerCase()} hari ini`
                  : 'Bagaimana perasaanmu?'}
              </p>
            </m.div>
          </RutinaBentoItem>
        </RutinaBentoGrid>

        {/* Kalender Aktivitas + Laporan Bulanan — pasangan bento 7 : 5
            (col-span mentah — preset bento tak memiliki 7/5) */}
        <RutinaBentoGrid>
          <RutinaBentoItem className="col-span-2 @[42rem]:col-span-6 @[52rem]:col-span-7">
            {/* ===== Kalender Aktivitas — peta bulan + detail harian (audit #7) ===== */}
            <m.section
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={motionTokens.preset.data}
              aria-label="Kalender aktivitas bulanan"
            >
              <RutinaSectionHeader
                title="Kalender Aktivitas"
                description="Titik harian: kebiasaan, transaksi, dan latihan sepanjang bulan."
              />
              <RutinaCard radius="2xl" density="comfortable" className="mt-3">
                <MonthCalendar
                  month={viewYm}
                  info={dayInfo}
                  today={today}
                  selected={selectedDay}
                  canPrev={canPrev}
                  canNext={canNext}
                  onPrev={goPrevMonth}
                  onNext={goNextMonth}
                  onSelect={(iso) => setSelectedDay(iso)}
                />
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3.5 text-eyebrow font-medium text-content-muted">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-chart-stroke-1" />
                    Kebiasaan selesai
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full bg-module-finance"
                    />
                    Ada transaksi
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-cocoa" />
                    Ada latihan
                  </span>
                  <span className="ml-auto hidden sm:inline">
                    {inspectorWide
                      ? 'Ketuk tanggal — detail tampil di panel di samping.'
                      : 'Ketuk tanggal untuk detail.'}
                  </span>
                </div>
              </RutinaCard>
            </m.section>
          </RutinaBentoItem>

          <RutinaBentoItem className="col-span-2 @[42rem]:col-span-6 @[52rem]:col-span-5">
            {/* Inspector tanggal desktop — PERMANEN di ruang kerja lebar:
                menampilkan tanggal terpilih dari kalender (default hari ini)
                sehingga observatorium data punya panel bacaan yang selalu
                hadir, bukan overlay. Ponsel: lewati (sheet di bawah). */}
            {inspectorWide && (
              <DayDetailPanel
                date={selectedDay ?? today}
                className="mb-[var(--layout-gap)]"
              />
            )}

            {/* ===== Laporan Bulanan — konsistensi & anggaran (audit #8) ===== */}
            <m.section
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={motionTokens.preset.data}
              aria-label="Laporan bulanan"
            >
              <RutinaSectionHeader
                title="Laporan Bulanan"
                description={monthLabel(viewYm)}
              />
              <RutinaCard radius="2xl" density="comfortable" className="mt-3">
                {monthReport.hasActivity ? (
                  <div className="space-y-5">
                    {/* Konsistensi kebiasaan — angka besar matcha + batang tipis. */}
                    <div>
                      <p className="text-body font-semibold tracking-tight text-content-secondary">
                        Konsistensi kebiasaan
                      </p>
                      <p className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-kpi-hero font-semibold leading-none tabular-nums text-success">
                          {monthReport.pct}%
                        </span>
                        <span className="text-meta font-medium text-content-muted">
                          {monthReport.done} dari {monthReport.sched} terjadwal selesai
                        </span>
                      </p>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                        <m.div
                          initial={{ width: '0%' }}
                          whileInView={{ width: `${monthReport.pct}%` }}
                          viewport={{ once: true, margin: '-16px' }}
                          transition={{ type: 'spring', stiffness: 110, damping: 21 }}
                          className="h-full rounded-full bg-gradient-to-r from-primary to-pistachio"
                        />
                      </div>
                    </div>

                    <div className="grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
                      {/* Tiga kategori pengeluaran teratas. */}
                      <div>
                        <p className="text-body font-semibold tracking-tight text-content-secondary">
                          Pengeluaran teratas
                        </p>
                        {monthReport.topCats.length === 0 ? (
                          <p className="mt-2 text-meta font-medium text-content-muted">
                            Tidak ada pengeluaran bulan ini.
                          </p>
                        ) : (
                          <ul className="mt-2.5 space-y-3">
                            {monthReport.topCats.map((c) => {
                              const Icon = CAT_META[c.cat].icon
                              return (
                                <li key={c.cat}>
                                  <div className="flex items-baseline justify-between gap-2">
                                    <span className="flex min-w-0 items-center gap-1.5 truncate text-note font-semibold text-content-primary">
                                      <Icon
                                        aria-hidden="true"
                                        className="h-3.5 w-3.5 shrink-0 text-content-secondary"
                                      />
                                      {CAT_META[c.cat].label}
                                    </span>
                                    <span className="shrink-0 text-meta font-semibold tabular-nums text-content-primary">
                                      {formatIDR(c.amount)}
                                    </span>
                                  </div>
                                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                                    <m.div
                                      initial={{ width: '0%' }}
                                      whileInView={{ width: `${Math.min(100, c.share)}%` }}
                                      viewport={{ once: true, margin: '-16px' }}
                                      transition={{ type: 'spring', stiffness: 110, damping: 21 }}
                                      className="h-full rounded-full bg-clay"
                                    />
                                  </div>
                                  <p className="mt-1 text-eyebrow font-medium tabular-nums text-content-muted">
                                    {c.share}% dari total pengeluaran
                                  </p>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>

                      {/* Penggunaan anggaran bulan berjalan. */}
                      <div>
                        <p className="text-body font-semibold tracking-tight text-content-secondary">
                          Penggunaan anggaran
                        </p>
                        {monthReport.budgetUse.length === 0 ? (
                          <p className="mt-2 text-meta font-medium text-content-muted">
                            Tidak ada pemakaian anggaran bulan ini.
                          </p>
                        ) : (
                          <ul className="mt-2.5 space-y-3">
                            {monthReport.budgetUse.map((b) => {
                              const over = b.used > b.limit
                              const pctB =
                                b.limit > 0
                                  ? Math.min(100, Math.round((b.used / b.limit) * 100))
                                  : 0
                              return (
                                <li key={b.cat}>
                                  <p className="text-note font-semibold text-content-primary">
                                    {CAT_META[b.cat].label} — {formatIDR(b.used)}{' '}
                                    <span className="font-medium text-content-muted">
                                      dari {formatIDR(b.limit)}
                                    </span>
                                  </p>
                                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                                    <m.div
                                      initial={{ width: '0%' }}
                                      whileInView={{ width: `${pctB}%` }}
                                      viewport={{ once: true, margin: '-16px' }}
                                      transition={{ type: 'spring', stiffness: 110, damping: 21 }}
                                      className={`h-full rounded-full ${over ? 'bg-destructive' : 'bg-module-accent'}`}
                                    />
                                  </div>
                                  <p
                                    className={`mt-1 text-eyebrow ${
                                      over
                                        ? 'font-semibold text-content-danger'
                                        : 'text-content-muted'
                                    }`}
                                  >
                                    {over
                                      ? `Lewat ${formatIDR(b.used - b.limit)} dari batas`
                                      : `Sisa ${formatIDR(b.limit - b.used)} lagi`}
                                  </p>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Refleksi identitas + runtun terbaik. */}
                    <div className="rounded-2xl bg-surface-sunken p-4">
                      <p className="flex items-center gap-1.5 text-body font-semibold tracking-tight text-content-secondary">
                        <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                        Refleksi identitas
                      </p>
                      {identityText ? (
                        <p className="mt-2 text-note italic leading-relaxed text-content-secondary">
                          Suara identitasmu: &ldquo;{identityText}&rdquo;
                        </p>
                      ) : (
                        <p className="mt-2 text-note leading-relaxed text-content-muted">
                          Belum ada suara identitas — atur di Profil.
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                        <p className="min-w-0 break-words text-meta font-semibold leading-snug text-content-secondary">
                          Runtun terbaik{best.habit ? ` — ${best.habit.title}` : ''}
                        </p>
                        <p className="flex shrink-0 items-center gap-1 text-note font-semibold tabular-nums text-success">
                          <Flame aria-hidden="true" className="h-3.5 w-3.5" />
                          {best.streak} hari
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <RutinaEmptyState
                    icon={<CalendarDays />}
                    title="Belum ada aktivitas bulan ini"
                    description="Tidak ada kebiasaan selesai, transaksi, atau latihan pada bulan ini — pilih bulan lain di kalender."
                  />
                )}
              </RutinaCard>
            </m.section>
          </RutinaBentoItem>
        </RutinaBentoGrid>

        {/* Pekan Ini vs Pekan Lalu + Bugar & Tubuh — pasangan bento (medium · medium) */}
        <RutinaBentoGrid>
          <RutinaBentoItem span="medium">
            {/* ===== Pekan Ini vs Pekan Lalu — pembanding penuh (audit #12) ===== */}
            <m.section
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={motionTokens.preset.data}
              aria-label="Pembanding pekan ini vs pekan lalu"
            >
              <RutinaSectionHeader
                title="Pekan Ini vs Pekan Lalu"
                description={`${shortDateLabel(weekStart)} – ${shortDateLabel(today)} · dibanding pekan lalu`}
              />
              <RutinaCard radius="2xl" density="comfortable" className="mt-3">
                <ul className="space-y-2.5">
                  {weekMetrics.map((row) => {
                    const DeltaIcon =
                      row.dir === 'up' ? ArrowUpRight : row.dir === 'down' ? ArrowDownRight : Minus
                    const tone =
                      row.good == null
                        ? 'text-content-muted'
                        : row.good
                          ? 'text-success'
                          : 'text-warning'
                    /* Skala batang per metrik — pasangan lalu vs sekarang
                       dinormalisasi ke maksimum pasangannya sendiri agar
                       satuan berbeda (misi, rupiah, sesi) tak dibandingkan
                       lintas baris (audit visualisasi v2.12). */
                    const pairMax = Math.max(row.curN, row.prevN)
                    const prevW = pairMax > 0 ? Math.round((row.prevN / pairMax) * 100) : 0
                    const curW = pairMax > 0 ? Math.round((row.curN / pairMax) * 100) : 0
                    return (
                      <li
                        key={row.key}
                        className="rounded-2xl bg-surface-sunken px-3.5 py-3"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="min-w-0 break-words text-note font-semibold leading-snug text-content-primary">
                            {row.label}
                          </p>
                          <p
                            className={`flex shrink-0 items-center gap-1 text-eyebrow font-semibold tabular-nums ${tone}`}
                          >
                            <DeltaIcon aria-hidden="true" className="h-3 w-3" strokeWidth={2.4} />
                            {row.deltaText}
                          </p>
                        </div>
                        <div className="mt-2 space-y-1.5">
                          {/* Pekan lalu — batang redup */}
                          <div className="flex items-center gap-2">
                            <span className="w-9 shrink-0 text-chart-label font-semibold uppercase tracking-wide text-content-muted">
                              lalu
                            </span>
                            <div
                              className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-content-primary/10"
                              role="presentation"
                            >
                              <m.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${prevW}%` }}
                                viewport={{ once: true, margin: '-16px' }}
                                transition={{ type: 'spring', stiffness: 110, damping: 21 }}
                                className="h-full rounded-full bg-cocoa/40"
                              />
                            </div>
                            <span className="w-24 shrink-0 truncate text-right text-eyebrow font-medium tabular-nums text-content-muted">
                              {row.prev}
                            </span>
                          </div>
                          {/* Pekan ini — batang aksen domain */}
                          <div className="flex items-center gap-2">
                            <span className="w-9 shrink-0 text-chart-label font-semibold uppercase tracking-wide text-content-muted">
                              kini
                            </span>
                            <div
                              className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-content-primary/10"
                              role="presentation"
                            >
                              <m.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${curW}%` }}
                                viewport={{ once: true, margin: '-16px' }}
                                transition={{ type: 'spring', stiffness: 110, damping: 21, delay: 0.06 }}
                                className="h-full rounded-full bg-module-accent-strong"
                              />
                            </div>
                            <span className="w-24 shrink-0 truncate text-right text-eyebrow font-semibold tabular-nums text-content-primary">
                              {row.cur}
                            </span>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-3 text-eyebrow leading-relaxed text-content-muted">
                  Skala batang berlaku per metrik — satuan berbeda tidak
                  dibandingkan langsung. Pengeluaran dihitung tanpa transfer;
                  nilai lebih kecil dinilai lebih baik. Jumlah catatan bersifat
                  perkiraan (pencocokan label tanggal).
                </p>
              </RutinaCard>
            </m.section>
          </RutinaBentoItem>

          <RutinaBentoItem span="medium">
            {/* ===== Bugar & Tubuh — statistik lintas modul ===== */}
            <section aria-label="Statistik bugar dan tubuh" className="@container">
              <SectionTitle title="Bugar & Tubuh" hint="data modul Bugar" />
              <div className="grid grid-cols-1 gap-3 @[28rem]:grid-cols-3">
                {/* Latihan */}
                <m.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-24px' }}
                  transition={motionTokens.preset.data}
                  className="rounded-[16px] border border-border bg-cocoa p-5 shadow-soft"
                >
                  <p className="flex items-center gap-1.5 text-body font-semibold tracking-tight text-content-inverse/80">
                    <Dumbbell className="h-3.5 w-3.5 text-pistachio" />
                    Latihan · 30 hari
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-kpi-sm font-semibold leading-none tabular-nums text-content-inverse">
                        {fitSessions}
                      </p>
                      <p className="mt-1 text-eyebrow font-semibold uppercase tracking-wide text-content-inverse/70">
                        sesi
                      </p>
                    </div>
                    <div>
                      <p className="text-kpi-sm font-semibold leading-none tabular-nums text-content-inverse">
                        {fitTonase >= 1000
                          ? `${(fitTonase / 1000).toFixed(1).replace('.', ',')}t`
                          : Math.round(fitTonase).toLocaleString('id-ID')}
                      </p>
                      <p className="mt-1 text-eyebrow font-semibold uppercase tracking-wide text-content-inverse/70">
                        kg tonase
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5 border-t border-content-inverse/10 pt-3">
                    {topPr ? (
                      <p className="text-meta font-medium text-content-inverse/80">
                        PR e1RM: <span className="font-semibold">{topPr.name}</span>{' '}
                        ≈ {topPr.best.toFixed(1).replace('.', ',')} kg
                      </p>
                    ) : (
                      <p className="text-meta font-medium text-content-inverse/70">
                        Belum ada PR — catat sesi beban pertamamu.
                      </p>
                    )}
                    <p className="text-meta font-medium tabular-nums text-content-inverse/80">
                      Kardio: {cardio.km.toFixed(1).replace('.', ',')} km
                      {cardio.sessions > 0 &&
                        ` dari ${cardio.sessions} sesi jalan/lari`}
                    </p>
                  </div>
                </m.div>

                {/* Asupan */}
                <m.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-24px' }}
                  transition={{ ...motionTokens.preset.data, delay: 0.06 }}
                  className="rounded-[16px] border border-border bg-cocoa p-5 shadow-soft"
                >
                  <p className="flex items-center gap-1.5 text-body font-semibold tracking-tight text-content-inverse/80">
                    <UtensilsCrossed className="h-3.5 w-3.5 text-gold" />
                    Asupan · 7 hari
                  </p>
                  {avgKcal > 0 ? (
                    <>
                      <p className="mt-3 flex items-baseline gap-1">
                        <span className="text-kpi-lg font-semibold leading-none tabular-nums text-content-inverse">
                          {avgKcal.toLocaleString('id-ID')}
                        </span>
                        <span className="text-meta font-semibold text-content-inverse/70">
                          kkal/hari
                        </span>
                      </p>
                      <p className="mt-1.5 text-eyebrow font-medium text-content-inverse/70">
                        rata-rata dari {last7Kcal.length} hari tercatat
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-meta font-medium leading-relaxed text-content-inverse/70">
                      Belum ada jurnal makan — isi di tab Bugar › Asupan untuk
                      melihat neraca kalori.
                    </p>
                  )}
                </m.div>

                {/* Tubuh */}
                <m.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-24px' }}
                  transition={{ ...motionTokens.preset.data, delay: 0.12 }}
                  className="rounded-[16px] border border-border bg-cocoa p-5 shadow-soft"
                >
                  <p className="flex items-center gap-1.5 text-body font-semibold tracking-tight text-content-inverse/80">
                    <Activity className="h-3.5 w-3.5 text-gold" />
                    Tubuh · 7 hari
                  </p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-meta">
                      <span className="font-medium text-content-inverse/75">
                        Tidur rata-rata
                      </span>
                      <span className="font-semibold tabular-nums text-content-inverse">
                        {avgSleep != null
                          ? `${avgSleep.toFixed(1).replace('.', ',')} jam`
                          : '–'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-meta">
                      <span className="font-medium text-content-inverse/75">
                        Energi rata-rata
                      </span>
                      <span className="font-semibold tabular-nums text-content-inverse">
                        {avgEnergy != null
                          ? `${avgEnergy.toFixed(1).replace('.', ',')}/5`
                          : '–'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-meta">
                      <span className="font-medium text-content-inverse/75">
                        Hidrasi rata-rata
                      </span>
                      <span className="font-semibold tabular-nums text-content-inverse">
                        {avgWater != null
                          ? `${avgWater.toFixed(1).replace('.', ',')}/8 gelas`
                          : '–'}
                      </span>
                    </div>
                    {weightDelta != null && (
                      <div className="flex items-center justify-between text-meta">
                        <span className="font-medium text-content-inverse/75">
                          Berat badan
                        </span>
                        <span
                          className={`flex items-center gap-1 font-semibold tabular-nums ${
                            weightDelta <= 0 ? 'text-pistachio' : 'text-gold'
                          }`}
                        >
                          {weightDelta <= 0 ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <TrendingUp className="h-3 w-3" />
                          )}
                          {Math.abs(weightDelta).toFixed(1).replace('.', ',')} kg
                        </span>
                      </div>
                    )}
                    {avgSleep == null && avgEnergy == null && (
                      <p className="text-meta font-medium leading-relaxed text-content-inverse/70">
                        Isi check-in harian di Bugar › Tubuh untuk memantau
                        pemulihan.
                      </p>
                    )}
                  </div>
                </m.div>
              </div>
            </section>
          </RutinaBentoItem>
        </RutinaBentoGrid>

        {/* ===== Piala & Lencana — lebar penuh =====
            (audit visualisasi v2.12: kartu Streak Berjalan dihapus —
            streak & rekor sudah terbaca di KPI utama; lencana melebar
            4 kolom di ruang kerja lega.) */}
        <m.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-24px' }}
          transition={motionTokens.preset.data}
          aria-label="Piala dan lencana"
          className="@container"
        >
          <SectionTitle
            title="Piala & Lencana"
            hint={`${unlockedCount}/4 terbuka`}
          />
          <div className="grid grid-cols-2 gap-2.5 @[36rem]:grid-cols-4">
                {badges.map((b) => (
                  <Tooltip key={b.name}>
                    <TooltipTrigger asChild>
                      <button
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
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-2xl border border-border bg-cocoa p-3 text-left shadow-soft transition-transform duration-200 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                            b.unlocked
                              ? 'border-primary/45 bg-primary/20 text-pistachio'
                              : 'border-content-inverse/10 bg-surface-inverse text-content-inverse/45'
                          }`}
                        >
                          <b.icon className="h-5 w-5" strokeWidth={1.9} />
                        </span>
                        <span className="min-w-0">
                          <span
                            className={`block text-meta font-semibold leading-tight line-clamp-2 ${
                              b.unlocked
                                ? 'text-content-inverse'
                                : 'text-content-inverse/70'
                            }`}
                          >
                            {b.name}
                          </span>
                          <span className="mt-0.5 block text-eyebrow font-medium leading-snug text-content-inverse/70">
                            {b.desc}
                          </span>
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="rounded-xl border-border bg-surface-primary px-3 py-2 text-eyebrow font-medium text-content-primary"
                    >
                      <p className="font-semibold">{b.name}</p>
                      <p className="mt-0.5 text-content-muted">{b.desc}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </m.section>

        </div>

        {/* Detail harian — di ponsel/tablet dibuka dengan mengetuk tanggal
            kalender (sheet); di ruang kerja lebar digantikan panel permanen
            di samping kalender, jadi sheet tidak dirender sama sekali. */}
        {!inspectorWide && (
          <DayDetailSheet date={selectedDay} onClose={() => setSelectedDay(null)} />
        )}
      </div>
    </TooltipProvider>
  )
}
