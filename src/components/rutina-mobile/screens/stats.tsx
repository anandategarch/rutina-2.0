'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { animate, stagger } from 'animejs'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BatteryLow,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  Dumbbell,
  Flame,
  Footprints,
  Laugh,
  Leaf,
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

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

import { useAnimePop } from '../anime-kit'
import { Counter } from '../counter'
import {
  DayDetailPanel,
  DayDetailSheet,
  notesInWindow,
} from '../day-detail-sheet'
import Heatmap from '../heatmap'
import { MonthCalendar, type MonthDayInfo } from '../month-calendar'
import { useMinWidth } from '../use-min-width'
import { useCatMeta } from '../finance/use-cat-meta'
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
import { RutinaTabs, RutinaTabsList, RutinaTabsTrigger } from '../rutina-tabs'
import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { barFill } from '@/lib/motion/transitions'
import {
  bodySeries,
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
  ReferenceLine,
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

/* ===== Gaya tooltip Recharts — token earth-tone standar layar =====
   Audit Tahap 2 #3: seluruh tooltip grafik memakai kombinasi token yang
   sama (permukaan parchment + hairline + teks konten) sehingga pembacaan
   titik data terasa satu bahasa di semua instrumen observatorium. */
const CHART_TOOLTIP_STYLE = {
  background: 'var(--surface-primary)',
  border: '1px solid var(--border-strong)',
  borderRadius: 12,
  boxShadow: 'var(--shadow-pop)',
  padding: '8px 12px',
  fontSize: 11,
  lineHeight: 1.5,
  color: 'var(--content-primary)',
} as const
const CHART_TOOLTIP_ITEM = { color: 'var(--content-primary)' } as const
const CHART_TOOLTIP_LABEL = {
  color: 'var(--content-muted)',
  fontWeight: 600,
  marginBottom: 2,
} as const

/** Tanggal singkat “19 Nov” untuk sumbu X tren (id-ID, tanpa hari). */
const trendTick = (iso: string) =>
  fromISO(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })

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
      <h2 className="flex items-center gap-1.5 text-section-lg font-bold tracking-tight text-content-primary">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-module-accent"
        />
        {title}
      </h2>
      {hint ? (
        <span className="text-meta font-medium text-module-accent-strong">{hint}</span>
      ) : null}
    </div>
  )
}

/** Bentuk data lencana — dipakai array `badges` dan kartu BadgeCard. */
interface Badge {
  icon: LucideIcon
  name: string
  desc: string
  unlocked: boolean
  /** Progres menuju syarat — tampil sebagai hint pada lencana terkunci. */
  progress?: string
}

/** Kartu lencana tunggal. Pop elastis (useAnimePop) ditempelkan di div
    kartu dan terpicu tepat saat `unlocked` berubah menjadi true — hook
    hidup di komponen ini karena tidak boleh dipanggil di dalam loop map.
    Tombol (hover scale + focus ring) dipisah dari div kartu agar transisi
    CSS transform tidak melawan animasi anime.js pada elemen yang sama. */
function BadgeCard({ badge: b }: { badge: Badge }) {
  const popRef = useAnimePop<HTMLDivElement>(null, b.unlocked, {
    scale: 1.25,
    back: 2.8,
  })
  return (
    <Tooltip>
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
          className="block w-full cursor-pointer rounded-2xl text-left transition-transform duration-200 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <div
            ref={popRef}
            className="flex w-full items-center gap-2.5 rounded-2xl border border-border bg-hero-surface p-3 text-left shadow-soft"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                b.unlocked
                  ? 'border-primary/45 bg-primary/20 text-pistachio'
                  : 'border-hero-content/10 bg-hero-surface-raised text-hero-content/45'
              }`}
            >
              <b.icon className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <span className="min-w-0">
              <span
                className={`block text-meta font-semibold leading-tight line-clamp-2 ${
                  b.unlocked ? 'text-hero-content' : 'text-hero-content-muted'
                }`}
              >
                {b.name}
              </span>
              <span className="mt-0.5 block text-eyebrow font-medium leading-snug text-hero-content-muted">
                {b.desc}
              </span>
            </span>
          </div>
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
  )
}

export default function StatsScreen() {
  const catMeta = useCatMeta()
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const notes = useRutina((s) => s.notes)
  const mood = useRutina((s) => s.mood)
  const setMood = useRutina((s) => s.setMood)
  const moodLogs = useRutina((s) => s.moodLogs)
  const bonusClaimed = useRutina((s) => s.bonusClaimed)
  const workouts = useRutina((s) => s.workouts)
  const foodEntries = useRutina((s) => s.foodEntries)
  const bodyLogs = useRutina((s) => s.bodyLogs)
  const txs = useRutina((s) => s.txs)
  const budgets = useRutina((s) => s.budgets)
  const identityText = useRutina((s) => s.identityText)
  /* v2.36: target asupan & sasaran tubuh untuk mini-chart Bugar/Tubuh. */
  const calorieTarget = useRutina((s) => s.calorieTarget)
  const fitTargets = useRutina((s) => s.fitTargets)

  /* Gerbang anti-replay (v2.35): koreografi pembuka Observatory hanya
     pada kunjungan pertama seumur sesi — remount antar-tab tampil instan;
     perubahan data/periode tetap bermorf lewat animate (bukan entrance). */
  const playEntrance = useFirstVisit('stats-observatory')

  const today = todayISO()

  /* Periode ringkasan di uiPrefs — bertahan saat berpindah layar. */
  const period = useRutina((s) => s.uiPrefs.statsPeriod)
  const setPeriod = useRutina((s) => s.setUiPref)

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

  /* Batang grafik misi yang sedang dibaca (indeks) — dasar "tooltip"
     interaktif kartu Misi Selesai: ketuk batang → nilai terbaca di baris
     aria-live di bawah grafik (audit Tahap 2 #3). */
  const [selBar, setSelBar] = useState<number | null>(null)

  /* Gerbang pandangan-pertama untuk grafik Recharts (audit Tahap 2 #4):
     kartu dipasang sejak awal (tinggi tetap, tanpa layout shift), grafik
     baru DIPASANG saat pertama masuk viewport — animasi isAnimationActive
     bermain tepat pada momen itu dan tidak diulang saat gulir balik. */
  const trendChartRef = useRef<HTMLDivElement>(null)
  const trendChartInView = useInView(trendChartRef, {
    once: true,
    margin: '-40px',
  })
  const donutRef = useRef<HTMLDivElement>(null)
  const donutInView = useInView(donutRef, { once: true, margin: '-40px' })

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

  /* ===== Wawasan lintas domain (v2.32 Observatory) — menjawab "kenapa",
      bukan menambah angka (audit: insight harus menjawab apa yang berubah
      & mengapa). Observasional jujur: hanya tampil bila data cukup —
      tidak ada data tidak ada wawasan, bukan angka karangan.
      v2.36: mengembalikan juga data terstruktur untuk visual pembanding
      (rata-rata misi hari berlatih vs tanpa latihan). ===== */
  const crossInsights = useMemo(() => {
    const out: { title: string; body: string }[] = []
    const days = dayCounts(completions, today, 30)
    const woDates = new Set(workouts.map((w) => w.date))

    /* Latihan vs misi. */
    let woCompare: {
      avgWith: number
      avgWithout: number
      nWith: number
      nWithout: number
    } | null = null
    const withWo = days.filter((d) => woDates.has(d.date))
    const withoutWo = days.filter((d) => !woDates.has(d.date))
    if (withWo.length >= 3 && withoutWo.length >= 3) {
      const avg = (xs: { count: number }[]) =>
        xs.reduce((a, x) => a + x.count, 0) / xs.length
      const a1 = avg(withWo)
      const a0 = avg(withoutWo)
      woCompare = {
        avgWith: a1,
        avgWithout: a0,
        nWith: withWo.length,
        nWithout: withoutWo.length,
      }
      if (Math.abs(a1 - a0) >= 0.5) {
        out.push({
          title: 'Hari berlatih vs hari tanpa latihan',
          body: `Rata-rata ${a1.toFixed(1).replace('.', ',')} misi pada ${withWo.length} hari berlatih, vs ${a0.toFixed(1).replace('.', ',')} pada ${withoutWo.length} hari tanpa latihan — misi cenderung ${a1 > a0 ? 'lebih banyak' : 'lebih sedikit'} saat kamu berlatih. Observasi saja, bukan sebab-akibat.`,
        })
      }
    }

    /* Suasana vs misi — hanya bila moodLogs cukup. */
    const moodDays = days.filter((d) => moodLogs[d.date])
    if (moodDays.length >= 6) {
      const byMood = new Map<string, { sum: number; n: number }>()
      for (const d of moodDays) {
        const mm = moodLogs[d.date]!
        const rec = byMood.get(mm) ?? { sum: 0, n: 0 }
        rec.sum += d.count
        rec.n += 1
        byMood.set(mm, rec)
      }
      const ranked = [...byMood.entries()]
        .map(([mm, r]) => ({ mm, avg: r.sum / r.n }))
        .sort((a, b) => b.avg - a.avg)
      const top = ranked[0]
      const low = ranked[ranked.length - 1]
      if (ranked.length >= 2 && Math.abs(top.avg - low.avg) >= 0.5) {
        out.push({
          title: 'Suasana hati vs misi',
          body: `Misi selesai paling banyak saat suasana "${top.mm}" (rata-rata ${top.avg.toFixed(1).replace('.', ',')}), paling sedikit saat "${low.mm}" (${low.avg.toFixed(1).replace('.', ',')}). Pola awal dari ${moodDays.length} hari tercatat — perlu lebih banyak hari sebelum bisa dibaca lebih jauh.`,
        })
      }
    }
    return { list: out, woCompare }
  }, [completions, today, workouts, moodLogs])

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

  /* ===== v2.36 (audit visualisasi Tahap 3): deret mini-chart Bugar/Tubuh ===== */

  /* Latihan per pekan — 4 pekan terakhir (P4 = pekan berjalan sampai
     hari ini saja; sesi & tonase per pekan, dua satuan TIDAK dicampur). */
  const weeklyFit: { start: string; sessions: number; tonase: number }[] = []
  for (let w = 3; w >= 0; w--) {
    const start = weekStartISO(addDaysISO(today, -w * 7))
    const end = addDaysISO(start, 6)
    const inWeek = workouts.filter(
      (x) => x.date >= start && x.date <= end && x.date <= today,
    )
    weeklyFit.push({
      start,
      sessions: inWeek.length,
      tonase: inWeek.reduce((a, x) => a + tonaseOf(x), 0),
    })
  }

  /* Asupan: deret 7 hari KALENDER (bukan 7 hari tercatat) — hari tanpa
     catatan null, tidak digambar seolah nol kkal. */
  const kcalWeek: { date: string; kcal: number | null }[] =
    Array.from({ length: 7 }, (_, i) => {
      const d = addDaysISO(today, i - 6)
      return { date: d, kcal: kcalByDay.get(d) ?? null }
    })
  const kcalWeekLogged = kcalWeek.filter((k) => (k.kcal ?? 0) > 0).length

  /* Tubuh: tiga deret 7 hari untuk small multiples — tidur (jam), energi
     (1-5), hidrasi (gelas) — skala masing-masing. */
  const sleepWeek = bodySeries(bodyLogs, today, 7, (l) => l.sleepH)
  const energyWeek = bodySeries(bodyLogs, today, 7, (l) => l.energy)
  const waterWeek = bodySeries(bodyLogs, today, 7, (l) => (l.water > 0 ? l.water : undefined))

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

  /* Tren penyelesaian 30 hari — persen selesai per hari. `date` ISO nyata
     ditambahkan agar sumbu X & tooltip memakai tanggal (bukan indeks
     "Hari ke-N" yang harus dihitung sendiri oleh pembaca). */
  const trend = rateSeries(habits, completions, today, 30)
  const trendData = trend.map((p) => ({
    ...p,
    date: addDaysISO(today, p.d - 30),
  }))
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

  /* ===== Lencana jujur (v2.22: 4 → 8) — seluruh syarat dihitung dari
     data nyata; progres tampil pada lencana yang masih terkunci. ===== */
  /* Hari terpadat sepanjang histori (≥1 misi selesai). */
  const busiestDay = useMemo(() => {
    let best = 0
    for (const day of Object.values(completions)) {
      const n = Object.values(day).filter((v) => v === true).length
      if (n > best) best = n
    }
    return best
  }, [completions])
  /* Total penyelesaian per kebiasaan aktif. */
  const habitTotals = useMemo(() => {
    const totals = new Map<string, number>()
    for (const day of Object.values(completions)) {
      for (const [id, v] of Object.entries(day)) {
        if (v === true) totals.set(id, (totals.get(id) ?? 0) + 1)
      }
    }
    return totals
  }, [completions])
  const championTotal = habitTotals.size
    ? Math.max(...habitTotals.values())
    : 0
  const habitsWith30 = [...habitTotals.values()].filter((t) => t >= 30).length
  const cardioSessions = workouts.filter((w) =>
    ['jalan', 'lari', 'lari-jalan'].includes(w.kind),
  ).length

  const badges: Badge[] = [
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
      progress: best.streak > 0 ? `streak ${best.streak}/7` : undefined,
    },
    {
      icon: Trophy,
      name: 'Api 30 Hari',
      desc: 'Capai rekor streak 30 hari tanpa putus.',
      unlocked: best.record >= 30,
      progress: best.record > 0 ? `rekor ${best.record}/30` : undefined,
    },
    {
      icon: Medal,
      name: 'Kolektor Catatan',
      desc: `Kumpulkan 100 catatan (sekarang ${notes.length}).`,
      unlocked: notes.length >= 100,
      progress: `${notes.length}/100`,
    },
    {
      icon: CalendarCheck,
      name: 'Hari Terpadat',
      desc: `Selesaikan 5+ kebiasaan dalam satu hari (rekor ${busiestDay}).`,
      unlocked: busiestDay >= 5,
      progress: `rekor ${busiestDay}/5`,
    },
    {
      icon: Leaf,
      name: 'Trio 30',
      desc: `Tiga kebiasaan masing-masing 30+ penyelesaian (sekarang ${habitsWith30}).`,
      unlocked: habitsWith30 >= 3,
      progress: `${habitsWith30}/3 kebiasaan`,
    },
    {
      icon: Award,
      name: 'Penjaga Andalan',
      desc: `Satu kebiasaan menembus 30+ total penyelesaian (juara ${championTotal}).`,
      unlocked: championTotal >= 30,
      progress: `juara ${championTotal}/30`,
    },
    {
      icon: Footprints,
      name: 'Pelari 10×',
      desc: `Catat 10 sesi kardio — lari, jalan, atau kombinasi (sekarang ${cardioSessions}).`,
      unlocked: cardioSessions >= 10,
      progress: `${cardioSessions}/10 sesi`,
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
    if (bars.length === 0) return
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
    /* Audit P0 (ticker bocor): simpan instansi dan panggil cancel() saat
       effect dibongkar — cancel() menghentikan detak TANPA memulihkan gaya,
       berbeda dari revert() yang justru memulihkan batang ke keadaan
       pra-animasi scaleY(0) dan menghilangkannya. Tanpa ini animasi terus
       berdetak ±1,2 dtk setelah layar dilepas. */
    const anim = animate(bars, {
      scaleY: [0, 1],
      delay: stagger(55),
      duration: motionTokens.preset.chartRevealMs.duration,
      ease: 'outBack(1.3)',
    })
    return () => {
      anim.cancel()
    }
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
          <span className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-hero-surface-raised px-3 text-eyebrow font-semibold text-pistachio shadow-soft">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
            LV {level}
          </span>
        </section>

        {/* Pintasan seksi (review Statistik v2.13): halaman observatorium
            panjang — chip melompat mulus ke seksi yang dituju tanpa
            menggulir manual. scrollIntoView bekerja pada wadah gulir
            terdekat (root layar ini). Kisi 3 kolom (v2.19) mengganti
            flex-wrap agar chip selebar-selaras — enam pintasan (Tahap 2:
            +Wawasan mengikuti urutan seksi baru) membentuk dua baris
            penuh yang disengaja, tanpa chip menggantung sendirian. */}
        <nav
          aria-label="Pintasan seksi Statistik"
          className="mt-[var(--layout-gap)] grid grid-cols-3 gap-1.5 @[30rem]:flex @[30rem]:flex-wrap"
        >
          {[
            { id: 'stats-tren', label: 'Tren' },
            { id: 'stats-kalender', label: 'Kalender' },
            { id: 'stats-laporan', label: 'Laporan' },
            { id: 'stats-wawasan', label: 'Wawasan' },
            { id: 'stats-bugar', label: 'Bugar' },
            { id: 'stats-piala', label: 'Piala' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() =>
                document
                  .getElementById(s.id)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              className="interactive flex h-8 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-primary px-2 text-center text-meta font-semibold text-content-secondary shadow-soft transition-colors hover:border-module-accent/40 hover:text-module-accent-strong"
            >
              {s.label}
            </button>
          ))}
        </nav>

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
            initial={playEntrance ? { opacity: 0, scale: 0.9 } : false}
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
                initial={
                  playEntrance
                    ? { strokeDashoffset: CIRC }
                    : { strokeDashoffset: CIRC * (1 - progress) }
                }
                animate={{ strokeDashoffset: CIRC * (1 - progress) }}
                transition={motionTokens.spring.progressArc}
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
              <span className="mt-2.5 rounded-full bg-hero-surface-raised px-2.5 py-1 text-eyebrow font-semibold text-pistachio">
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

        {/* ===== KPI hierarki (v2.32 Observatory): SATU angka dominan +
            baris sekunder inline di bawah hairline — menggantikan kisi
            empat kotak seragam (audit: KPI utama cukup 1–2 dominan;
            bersama cincin XP, dua fokus halaman, sisanya pendamping). */}
        <section aria-label="Ringkasan metrik utama">
          <m.div
            initial={playEntrance ? { opacity: 0, y: reducedMotion ? 0 : 12 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-24px' }}
            transition={motionTokens.preset.data}
            className="rounded-lg border border-border bg-hero-surface p-4 shadow-soft sm:p-5"
          >
            <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-hero-content-muted">
              Konsistensi · 30 hari
            </p>
            <p className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-kpi-lg font-semibold leading-none tracking-tight tabular-nums text-hero-content">
                <Counter to={kpi.consistency} />
              </span>
              <span className="text-note font-semibold text-hero-content-muted">%</span>
            </p>
            <p className="mt-1 text-eyebrow font-medium leading-snug text-hero-content-muted">
              {kpi.sched > 0
                ? `${kpi.done} dari ${kpi.sched} terjadwal selesai`
                : 'Belum ada jadwal kebiasaan'}
            </p>
            {/* Baris sekunder — misi, streak berjalan, rekor; pola sub-metri
                studio (hairline atas, dibaca sekali sapuan, tanpa kotak). */}
            <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1.5 border-t border-hero-content-muted/20 pt-3 text-meta text-hero-content-muted">
              <span className="flex items-baseline gap-1.5">
                Misi 30 hari
                <span className="font-bold tabular-nums text-hero-content">
                  {kpi.missions}
                </span>
              </span>
              <span className="flex items-baseline gap-1.5">
                Streak berjalan
                <span className="font-bold tabular-nums text-hero-content">
                  {best.streak} hari
                </span>
              </span>
              <span className="flex items-baseline gap-1.5">
                Rekor
                <span className="font-bold tabular-nums text-hero-content">
                  {best.record} hari
                </span>
              </span>
              {best.habit && (
                <span
                  className="hidden min-w-0 truncate sm:inline"
                  title={best.habit.title}
                >
                  pemegang streak: {best.habit.title}
                </span>
              )}
            </div>
          </m.div>
        </section>

        {/* Misi selesai — panel fokus periode + instrumen grafik.
            Pasangan bento feature(4) + wide(8): panel menyimpan sakelar
            periode, total, dan ringkasan; kartu grafik murni batang. */}
        <RutinaBentoGrid>
          <RutinaBentoItem className="col-span-2 @[42rem]:col-span-6 @[52rem]:col-span-4">
            {/* Panel fokus periode — sakelar periode + pembacaan ringkas */}
            <m.section
              initial={playEntrance ? { opacity: 0, y: 16 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={motionTokens.preset.data}
              className="flex h-full flex-col rounded-lg border border-border bg-hero-surface p-5 shadow-card"
              aria-label="Fokus periode grafik misi selesai"
            >
              <p className="text-body font-semibold tracking-tight text-hero-content-muted">
                Fokus Periode
              </p>
              <RutinaTabs
                value={period}
                onValueChange={(v) =>
                  setPeriod({ statsPeriod: v as 'pekan' | 'bulan' })
                }
              >
                <RutinaTabsList
                  aria-label="Pilih periode misi selesai"
                  className="w-full rounded-full border-transparent bg-hero-content/10"
                >
                  <RutinaTabsTrigger
                    value="pekan"
                    className="flex-1 text-hero-content-muted"
                  >
                    Pekan
                  </RutinaTabsTrigger>
                  <RutinaTabsTrigger
                    value="bulan"
                    className="flex-1 text-hero-content-muted"
                  >
                    Bulan
                  </RutinaTabsTrigger>
                </RutinaTabsList>
              </RutinaTabs>
              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="text-kpi-hero font-semibold leading-none tracking-tight text-hero-content">
                  <Counter to={chartTotal} />
                </span>
                <span className="text-note font-medium text-hero-content-muted">
                  misi{period === 'pekan' ? ' / pekan' : ' / bulan'}
                </span>
              </p>
              <p className="mt-1.5 text-eyebrow font-medium text-hero-content-muted">
                {period === 'pekan'
                  ? 'Tujuh hari terakhir'
                  : 'Empat pekan terakhir — P4 pekan berjalan'}
              </p>
              <p className="mt-auto border-t border-hero-content/10 pt-3 text-eyebrow font-medium leading-relaxed text-hero-content-muted">
                {chartSummary}
              </p>
            </m.section>
          </RutinaBentoItem>

          <RutinaBentoItem className="col-span-2 @[42rem]:col-span-6 @[52rem]:col-span-8">
            {/* Instrumen grafik — batang misi selesai. Kartu instrumen
                parchment (audit Tahap 2 #6): garis & indikator tegas di atas
                permukaan terang; batang non-puncak memakai tinta content
                redup, puncak memakai gradasi chart token. Setiap batang
                adalah tombol — "tooltip" interaktif terbaca di baris
                aria-live di bawah grafik. */}
            <m.section
              ref={chartRef}
              initial={playEntrance ? { opacity: 0, y: 16 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ ...motionTokens.preset.data, delay: motionTokens.delay.tight }}
              className="flex h-full flex-col rounded-lg border border-border bg-surface-primary p-5 shadow-card"
              aria-label="Grafik misi selesai"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-body font-semibold tracking-tight text-content-secondary">
                  Misi Selesai
                </p>
                {/* Label periode data selalu terlihat di header kartu
                    (audit Tahap 2 #3) — bukan hanya di panel fokus. */}
                <p className="text-chart-label font-semibold uppercase tracking-[0.14em] text-content-muted">
                  {period === 'pekan'
                    ? '7 hari terakhir'
                    : '4 pekan terakhir'}
                </p>
              </div>
              {chartTotal === 0 ? (
                <RutinaEmptyState
                  className="mt-4 px-4 py-6"
                  icon={<CalendarCheck />}
                  title="Belum ada misi selesai"
                  description={`Tidak ada misi selesai ${
                    period === 'pekan'
                      ? 'pada tujuh hari terakhir'
                      : 'pada empat pekan terakhir'
                  } — centang kebiasaan pertamamu di tab Kebiasaan.`}
                />
              ) : (
                <>
                  <div
                    className="mt-auto flex items-end justify-between gap-2 pt-5"
                    aria-label={`Grafik batang misi selesai ${
                      period === 'pekan'
                        ? 'tujuh hari terakhir'
                        : 'empat pekan terakhir'
                    }`}
                  >
                    {chartData.map((d, i) => {
                      /* Kunci indeks: batang P1–P4 memakai node DOM yang sama
                         dengan hari 1–4 sehingga pergantian periode memorf
                         tinggi batang (transisi CSS ringan) alih-alih memasang
                         ulang seluruh grafik — stagger anime.js tak diulang. */
                      const isPeak = d.value === chartMax && d.value > 0
                      const isSel = selBar === i
                      return (
                        <button
                          key={i}
                          type="button"
                          aria-pressed={isSel}
                          aria-label={`${d.label} — ${d.value} misi selesai`}
                          onClick={() => setSelBar(isSel ? null : i)}
                          className="interactive flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-lg pt-1"
                        >
                          <div
                            data-bar
                            className={`w-full origin-bottom rounded-full ${
                              isPeak
                                ? 'bg-gradient-to-t from-chart-1 to-chart-4'
                                : isSel
                                  ? 'bg-chart-stroke-4'
                                  : 'bg-content-primary/15'
                            }`}
                            style={{
                              height: `${
                                d.value === 0
                                  ? 3
                                  : Math.max(
                                      Math.round((d.value / chartMax) * 84),
                                      6,
                                    )
                              }px`,
                              transition: reducedMotion
                                ? undefined
                                : `height ${motionTokens.preset.data.duration * 1000}ms cubic-bezier(${BAR_EASE.join(',')})`,
                            }}
                          />
                          <span
                            className={`text-chart-label font-semibold ${
                              isPeak
                                ? 'text-chart-stroke-1'
                                : isSel
                                  ? 'text-module-accent-strong'
                                  : 'text-content-muted'
                            }`}
                          >
                            {d.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {/* Pembacaan batang terpilih — padanan tooltip pada grafik
                      batang kustom (audit Tahap 2 #3). */}
                  <p
                    aria-live="polite"
                    className="mt-3 text-eyebrow font-medium text-content-muted"
                  >
                    {selBar != null && chartData[selBar]
                      ? `${chartData[selBar].label}: ${chartData[selBar].value} misi selesai${
                          chartData[selBar].value === chartMax && chartMax > 0
                            ? ' — puncak periode'
                            : ''
                        }`
                      : 'Ketuk batang untuk membaca nilai.'}
                  </p>
                </>
              )}
            </m.section>
          </RutinaBentoItem>
        </RutinaBentoGrid>

        {/* ===== Tren & Konsistensi — area 30 hari + heatmap 12 pekan =====
            (audit visualisasi v2.12: grafik garis TrendLine 7 hari dihapus
            karena tumpang tindih dengan grafik batang Misi Selesai — jumlah
            misi yang sama tak perlu digambar dua kali; area chart dipindah
            ke sini berpasangan dengan heatmap sebagai satu seksi tren.) */}
        <section id="stats-tren" aria-label="Tren dan konsistensi" className="@container scroll-mt-3">
          <SectionTitle title="Tren & Konsistensi" hint="30 hari terakhir · % selesai/hari" />
          <div className="mt-3 grid grid-cols-1 gap-3 @[36rem]:grid-cols-2">
            {/* Grafik area tren penyelesaian — kartu instrumen parchment:
                garis tegas chart-stroke-4 + isi lembut chart-4 opasitas
                rendah (audit Tahap 2 #6); garis putus rata-rata memberi
                konteks sekilas; legenda + label periode selalu terlihat
                (audit Tahap 2 #3). */}
            <m.div
              initial={playEntrance ? { opacity: 0, y: 16 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={motionTokens.preset.data}
              className="rounded-lg border border-border bg-surface-primary p-5 shadow-soft"
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-body font-semibold tracking-tight text-content-secondary">
                    Tren Penyelesaian
                  </p>
                  <p className="mt-0.5 text-eyebrow font-medium text-content-muted">
                    persentase misi selesai · 30 hari terakhir
                  </p>
                  <p className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-kpi-sm font-semibold leading-none tracking-tight tabular-nums text-content-primary">
                      <Counter to={trendAvg} decimals={1} />
                    </span>
                    <span className="text-note font-medium text-content-muted">
                      % rata-rata / hari
                    </span>
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-module-accent-strong px-2.5 py-1 text-eyebrow font-semibold text-module-accent-fg">
                  <TrendIcon className="h-3.5 w-3.5" />
                  {trendBadge}
                </span>
              </div>
              <div className="mt-4" ref={trendChartRef}>
                {kpi.sched === 0 ? (
                  <RutinaEmptyState
                    className="px-4 py-6"
                    icon={<CalendarDays />}
                    title="Belum ada kebiasaan terjadwal"
                    description="Atur jadwal kebiasaan di tab Kebiasaan — tren konsistensi mulai terbaca setelah ada misi terjadwal."
                  />
                ) : trendChartInView ? (
                  <ResponsiveContainer width="100%" height={130}>
                    <AreaChart
                      data={trendData}
                      margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
                    >
                      <defs>
                        <linearGradient
                          id="trendFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="var(--chart-4)"
                            stopOpacity={0.22}
                          />
                          <stop
                            offset="100%"
                            stopColor="var(--chart-4)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tick={{
                          fill: 'var(--content-muted)',
                          fontSize: 10,
                        }}
                        axisLine={false}
                        tickLine={false}
                        interval={7}
                        tickFormatter={(v: string) => trendTick(v)}
                      />
                      <YAxis hide domain={[0, 100]} />
                      <ReferenceLine
                        y={trendAvg}
                        stroke="var(--chart-stroke-5)"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        ifOverflow="extendDomain"
                      />
                      <RechartsTooltip
                        cursor={{ stroke: 'var(--border-strong)' }}
                        contentStyle={CHART_TOOLTIP_STYLE}
                        itemStyle={CHART_TOOLTIP_ITEM}
                        labelStyle={CHART_TOOLTIP_LABEL}
                        labelFormatter={(v) => shortDateLabel(String(v))}
                        formatter={(value) => [`${value}%`, 'Selesai']}
                      />
                      <Area
                        type="monotone"
                        dataKey="v"
                        stroke="var(--chart-stroke-4)"
                        strokeWidth={2.5}
                        fill="url(#trendFill)"
                        isAnimationActive={!reducedMotion}
                        animationDuration={motionTokens.preset.chartRevealMs.duration}
                        animationEasing="ease-out"
                        activeDot={{
                          r: 4,
                          fill: 'var(--chart-stroke-4)',
                          stroke: 'var(--surface-primary)',
                          strokeWidth: 2,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  /* Penahan tinggi tetap — grafik dipasang saat pertama
                     masuk viewport agar animasi Recharts bermain tepat
                     pada momen itu (audit Tahap 2 #4), tanpa layout shift. */
                  <div className="h-[130px]" aria-hidden="true" />
                )}
              </div>
              {/* Legenda grafik tren — garis solid & garis putus rata-rata. */}
              <div
                className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5"
                aria-label="Legenda grafik tren penyelesaian"
              >
                <span className="flex items-center gap-1.5 text-eyebrow font-medium text-content-muted">
                  <span
                    aria-hidden="true"
                    className="h-[3px] w-5 rounded-full bg-chart-stroke-4"
                  />
                  % selesai harian
                </span>
                <span className="flex items-center gap-1.5 text-eyebrow font-medium text-content-muted">
                  <span
                    aria-hidden="true"
                    className="w-5 border-t-2 border-dashed border-chart-stroke-5"
                  />
                  rata-rata {trendAvg.toFixed(1).replace('.', ',')}%
                </span>
              </div>
              <p className="mt-2 text-eyebrow font-medium text-content-muted">
                Konsistensi di atas 70% pada {above70} dari 30 hari terakhir.
              </p>
            </m.div>

            {/* Heatmap — pola penyelesaian 12 pekan */}
            <Heatmap />
          </div>
        </section>

        {/* Kalender Aktivitas + Laporan Bulanan — pasangan bento 7 : 5
            (col-span mentah — preset bento tak memiliki 7/5) */}
        <RutinaBentoGrid>
          <RutinaBentoItem className="col-span-2 @[42rem]:col-span-6 @[52rem]:col-span-7">
            {/* ===== Kalender Aktivitas — peta bulan + detail harian (audit #7) ===== */}
            <m.section
              id="stats-kalender"
              initial={playEntrance ? { opacity: 0, y: 16 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={motionTokens.preset.data}
              aria-label="Kalender aktivitas bulanan"
              className="scroll-mt-3"
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

            {/* ===== Laporan Bulanan — konsistensi & anggaran (audit #8).
                Dilipat secara default (review Statistik v2.13): laporan
                jarang dibuka tiap kunjungan — ringkasan singkat tampil di
                pemicu, detail penuh dibuka bila dibutuhkan. ===== */}
            <div id="stats-laporan" className="scroll-mt-3">
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  aria-label={`Laporan bulanan ${monthLabel(viewYm)}${monthReport.hasActivity ? `, konsistensi ${monthReport.pct} persen` : ''} — buka untuk detail`}
                  className="interactive group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-primary p-3.5 text-left shadow-soft transition-colors hover:bg-surface-sunken/60"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary">
                    <CalendarDays aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-semibold text-content-primary">
                      Laporan Bulanan
                    </span>
                    <span className="mt-0.5 block text-meta font-medium text-content-muted">
                      {monthLabel(viewYm)}
                      {monthReport.hasActivity
                        ? ` · konsistensi ${monthReport.pct}%`
                        : ''}
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-content-muted transition-transform duration-300 group-data-[state=open]:rotate-180"
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
              <RutinaCard radius="2xl" density="comfortable" className="mt-3">
                {monthReport.hasActivity ? (
                  <div className="space-y-5">
                    {/* Konsistensi kebiasaan — angka besar matcha + batang tipis. */}
                    <div>
                      <p className="text-body font-semibold tracking-tight text-content-secondary">
                        Konsistensi kebiasaan
                      </p>
                      <p className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-kpi-lg font-semibold leading-none tabular-nums text-success">
                          {monthReport.pct}%
                        </span>
                        <span className="text-meta font-medium text-content-muted">
                          {monthReport.done} dari {monthReport.sched} terjadwal selesai
                        </span>
                      </p>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                        <m.div
                          initial={
                            playEntrance
                              ? { scaleX: 0 }
                              : { scaleX: monthReport.pct / 100 }
                          }
                          whileInView={{ scaleX: monthReport.pct / 100 }}
                          viewport={{ once: true, margin: '-16px' }}
                          transition={barFill}
                          style={{ width: '100%' }}
                          className="h-full origin-left rounded-full bg-gradient-to-r from-primary to-pistachio"
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
                              const Icon = catMeta(c.cat).icon
                              return (
                                <li key={c.cat}>
                                  <div className="flex items-baseline justify-between gap-2">
                                    <span className="flex min-w-0 items-center gap-1.5 truncate text-note font-semibold text-content-primary">
                                      <Icon
                                        aria-hidden="true"
                                        className="h-3.5 w-3.5 shrink-0 text-content-secondary"
                                      />
                                      {catMeta(c.cat).label}
                                    </span>
                                    <span className="shrink-0 text-meta font-semibold tabular-nums text-content-primary">
                                      {formatIDR(c.amount)}
                                    </span>
                                  </div>
                                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                                    <m.div
                                      initial={
                                        playEntrance
                                          ? { scaleX: 0 }
                                          : { scaleX: Math.min(100, c.share) / 100 }
                                      }
                                      whileInView={{ scaleX: Math.min(100, c.share) / 100 }}
                                      viewport={{ once: true, margin: '-16px' }}
                                      transition={barFill}
                                      style={{ width: '100%' }}
                                      className="h-full origin-left rounded-full bg-clay"
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
                                    {catMeta(b.cat).label} — {formatIDR(b.used)}{' '}
                                    <span className="font-medium text-content-muted">
                                      dari {formatIDR(b.limit)}
                                    </span>
                                  </p>
                                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                                    <m.div
                                      initial={
                                        playEntrance ? { scaleX: 0 } : { scaleX: pctB / 100 }
                                      }
                                      whileInView={{ scaleX: pctB / 100 }}
                                      viewport={{ once: true, margin: '-16px' }}
                                      transition={barFill}
                                      style={{ width: '100%' }}
                                      className={`h-full origin-left rounded-full ${over ? 'bg-destructive' : 'bg-module-accent'}`}
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
              </CollapsibleContent>
            </Collapsible>
            </div>
          </RutinaBentoItem>
        </RutinaBentoGrid>

        {/* ===== Wawasan — komposisi kategori kebiasaan + suasana hati =====
            (audit visualisasi v2.12: duplikasi dihapus — ring misi harian
            sudah terbaca di Beranda, kartu streak ganda sudah terwakili KPI
            utama; donut diberi judul jujur sesuai sumber datanya.)
            Urutan seksi Tahap 2 #2: setelah Kalender/Laporan, sebelum
            perbandingan pekan — komposisi kategori menempati posisi #5. */}
        <RutinaBentoGrid id="stats-wawasan" className="scroll-mt-3">
          <RutinaBentoItem span="medium">
            {/* Komposisi kebiasaan aktif — donut per kategori. Kartu
                instrumen parchment: irisan memakai token kategori kebiasaan,
                tooltip terang standar, animasi menyapu hanya saat pertama
                masuk viewport (audit Tahap 2 #4). */}
            <m.div
              initial={playEntrance ? { opacity: 0, y: 16 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={motionTokens.preset.data}
              className="h-full rounded-lg border border-border bg-surface-primary p-5 shadow-soft"
            >
              <p className="text-body font-semibold tracking-tight text-content-secondary">
                Komposisi Kebiasaan Aktif
              </p>
              <p className="mt-0.5 text-eyebrow font-medium text-content-muted">
                jumlah kebiasaan per kategori — kondisi saat ini
              </p>
              {catData.length === 0 ? (
                <RutinaEmptyState
                  className="mt-3 px-4 py-6"
                  icon={<Leaf />}
                  title="Belum ada kebiasaan aktif"
                  description="Tanam kebiasaan pertamamu di tab Kebiasaan — komposisi kategori terbaca otomatis di sini."
                />
              ) : (
                <div className="mt-3 flex items-center gap-4">
                  <div ref={donutRef} className="relative h-28 w-28 shrink-0">
                    {donutInView ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <RechartsTooltip
                            contentStyle={CHART_TOOLTIP_STYLE}
                            itemStyle={CHART_TOOLTIP_ITEM}
                            labelStyle={CHART_TOOLTIP_LABEL}
                            formatter={(value, name) => [
                              `${value} kebiasaan`,
                              String(name),
                            ]}
                          />
                          <Pie
                            data={catData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={34}
                            outerRadius={52}
                            paddingAngle={3}
                            stroke="none"
                            isAnimationActive={!reducedMotion}
                            animationDuration={motionTokens.preset.chartRevealMs.duration}
                            animationEasing="ease-out"
                          >
                            {catData.map((c) => (
                              <Cell key={c.name} fill={c.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : null}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-kpi-sm font-semibold leading-none tabular-nums text-content-primary">
                        {activeHabits.length}
                      </span>
                      <span className="mt-0.5 text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-muted">
                        aktif
                      </span>
                    </div>
                  </div>
                  {/* Legenda kategori — jumlah konkret di sisi donut. */}
                  <ul className="min-w-0 flex-1 space-y-2" aria-label="Legenda kategori kebiasaan">
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
                        <span className="flex-1 truncate font-medium text-content-secondary">
                          {c.name}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-content-primary">
                          {c.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </m.div>
          </RutinaBentoItem>

          <RutinaBentoItem span="medium">
            {/* Wawasan lintas domain (v2.32 Observatory) — menjawab "kenapa",
                bukan menambah angka. Menggantikan slot input suasana hati
                (audit: data entry tidak semestinya berada di observatorium);
                input pindah ke seksi Check-in di ujung halaman. */}
            <m.div
              initial={playEntrance ? { opacity: 0, y: 16 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ ...motionTokens.preset.data, delay: motionTokens.delay.tight }}
              className="h-full rounded-lg border border-border bg-surface-primary p-5 shadow-soft"
            >
              <p className="text-body font-semibold tracking-tight text-content-secondary">
                Wawasan Lintas Domain
              </p>
              <p className="mt-0.5 text-eyebrow font-medium text-content-muted">
                observasi 30 hari — bukan sebab-akibat
              </p>
              {/* v2.36: visual pembanding hari berlatih vs tanpa latihan —
                  dua bar horizontal + jumlah sampel; hubungan tetap
                  disclaim sebagai observasional. */}
              {crossInsights.woCompare && (
                <div
                  className="mt-3 space-y-2 rounded-xl bg-surface-sunken px-3.5 py-3"
                  role="img"
                  aria-label={`Rata-rata misi pada ${crossInsights.woCompare.nWith} hari berlatih: ${crossInsights.woCompare.avgWith.toFixed(1).replace('.', ',')}, vs ${crossInsights.woCompare.avgWithout.toFixed(1).replace('.', ',')} pada ${crossInsights.woCompare.nWithout} hari tanpa latihan. Observasional, bukan sebab-akibat.`}
                >
                  {(
                    [
                      {
                        label: 'Hari berlatih',
                        n: crossInsights.woCompare.nWith,
                        avg: crossInsights.woCompare.avgWith,
                        bar: 'bg-chart-stroke-4',
                      },
                      {
                        label: 'Tanpa latihan',
                        n: crossInsights.woCompare.nWithout,
                        avg: crossInsights.woCompare.avgWithout,
                        bar: 'bg-primary/45',
                      },
                    ] as const
                  ).map((row) => {
                    const max = Math.max(
                      crossInsights.woCompare!.avgWith,
                      crossInsights.woCompare!.avgWithout,
                      0.1,
                    )
                    return (
                      <div key={row.label}>
                        <div className="flex items-baseline justify-between gap-2 text-chart-label">
                          <span className="font-semibold text-content-secondary">
                            {row.label}
                            <span className="ml-1 font-medium text-content-muted">
                              {row.n} hari
                            </span>
                          </span>
                          <span className="font-bold tabular-nums text-content-primary">
                            {row.avg.toFixed(1).replace('.', ',')} misi/hari
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-primary">
                          <m.div
                            initial={false}
                            className={`h-full rounded-full ${row.bar}`}
                            style={{
                              width: `${Math.max((row.avg / max) * 100, 3)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {crossInsights.list.length === 0 ? (
                <RutinaEmptyState
                  className="mt-3 px-4 py-6"
                  icon={<Sparkles className="h-6 w-6" />}
                  title="Belum cukup pola"
                  description="Catat latihan dan suasana hatimu beberapa hari lagi — wawasan muncul otomatis begitu datanya cukup."
                />
              ) : (
                <ul className="mt-3 space-y-3.5">
                  {crossInsights.list.map((f) => (
                    <li key={f.title}>
                      <p className="text-note font-semibold text-content-primary">
                        {f.title}
                      </p>
                      <p className="mt-1 text-pretty text-meta leading-relaxed text-content-secondary">
                        {f.body}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </m.div>
          </RutinaBentoItem>
        </RutinaBentoGrid>

        {/* Pekan Ini vs Pekan Lalu + Bugar & Tubuh — pasangan bento (medium · medium) */}
        <RutinaBentoGrid>
          <RutinaBentoItem span="medium">
            {/* ===== Pekan Ini vs Pekan Lalu — pembanding penuh (audit #12) ===== */}
            <m.section
              initial={playEntrance ? { opacity: 0, y: 16 } : false}
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
                                initial={playEntrance ? { scaleX: 0 } : { scaleX: prevW / 100 }}
                                whileInView={{ scaleX: prevW / 100 }}
                                viewport={{ once: true, margin: '-16px' }}
                                transition={barFill}
                                style={{ width: '100%' }}
                                className="h-full origin-left rounded-full bg-content-secondary/40"
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
                                initial={playEntrance ? { scaleX: 0 } : { scaleX: curW / 100 }}
                                whileInView={{ scaleX: curW / 100 }}
                                viewport={{ once: true, margin: '-16px' }}
                                transition={{ ...barFill, delay: motionTokens.delay.tight }}
                                style={{ width: '100%' }}
                                className="h-full origin-left rounded-full bg-module-accent-strong"
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
                  nilai lebih kecil dinilai lebih baik. Jumlah catatan
                  dihitung eksak dari tanggal-dibuat (v2.36).
                </p>
              </RutinaCard>
            </m.section>
          </RutinaBentoItem>

          <RutinaBentoItem span="medium">
            {/* ===== Bugar & Tubuh — statistik lintas modul =====
                Kartu instrumen parchment; ikon memakai varian stroke grafik
                (tegas di permukaan terang). Seksi tanpa data menampilkan
                empty-state bermakna (audit Tahap 2 #5): penjelasan data
                apa yang perlu dikumpulkan & di mana mencatatnya. */}
            <section id="stats-bugar" aria-label="Statistik bugar dan tubuh" className="@container scroll-mt-3">
              <SectionTitle title="Bugar & Tubuh" hint="ringkasan modul Bugar" />
              <div className="grid grid-cols-1 gap-3 @[28rem]:grid-cols-3">
                {/* Latihan */}
                <m.div
                  initial={playEntrance ? { opacity: 0, y: 16 } : false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-24px' }}
                  transition={motionTokens.preset.data}
                  className="rounded-lg border border-border bg-surface-primary p-5 shadow-soft"
                >
                  <p className="flex items-center gap-1.5 text-body font-semibold tracking-tight text-content-secondary">
                    <Dumbbell className="h-3.5 w-3.5 text-chart-stroke-4" />
                    Latihan · 30 hari
                  </p>
                  {recent.length === 0 ? (
                    <RutinaEmptyState
                      className="mt-3 px-4 py-6"
                      icon={<Dumbbell />}
                      title="Belum ada sesi Bugar"
                      description={
                        workouts.length === 0
                          ? 'Catat sesi pertamamu di tab Bugar — sesi, tonase, dan PR terbaca di sini.'
                          : 'Tidak ada sesi dalam 30 hari terakhir — catat sesi baru di tab Bugar.'
                      }
                    />
                  ) : (
                    <>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-kpi-sm font-semibold leading-none tabular-nums text-content-primary">
                            {fitSessions}
                          </p>
                          <p className="mt-1 text-eyebrow font-semibold uppercase tracking-wide text-content-muted">
                            sesi
                          </p>
                        </div>
                        <div>
                          <p className="text-kpi-sm font-semibold leading-none tabular-nums text-content-primary">
                            {fitTonase >= 1000
                              ? `${(fitTonase / 1000).toFixed(1).replace('.', ',')}t`
                              : Math.round(fitTonase).toLocaleString('id-ID')}
                          </p>
                          <p className="mt-1 text-eyebrow font-semibold uppercase tracking-wide text-content-muted">
                            kg tonase
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                        {topPr ? (
                          <p className="text-meta font-medium text-content-secondary">
                            PR e1RM: <span className="font-semibold">{topPr.name}</span>{' '}
                            ≈ {topPr.best.toFixed(1).replace('.', ',')} kg
                          </p>
                        ) : (
                          <p className="text-meta font-medium text-content-secondary">
                            Belum ada PR — catat sesi beban pertamamu.
                          </p>
                        )}
                        <p className="text-meta font-medium tabular-nums text-content-secondary">
                          Kardio: {cardio.km.toFixed(1).replace('.', ',')} km
                          {cardio.sessions > 0 &&
                            ` dari ${cardio.sessions} sesi jalan/lari`}
                        </p>
                      </div>
                      {/* v2.36: sesi & tonase per pekan — dua satuan berdiri
                          sendiri (bar sesi + bar tonase), P4 pekan berjalan. */}
                      <div
                        className="mt-3 space-y-2.5 border-t border-border pt-3"
                        role="img"
                        aria-label={`Sesi per pekan: ${weeklyFit
                          .map(
                            (w, i) =>
                              `P${i + 1} ${w.sessions} sesi, tonase ${Math.round(w.tonase).toLocaleString('id-ID')} kg`,
                          )
                          .join(', ')}. P4 pekan berjalan.`}
                      >
                        <div>
                          <p className="text-chart-label font-semibold uppercase tracking-wide text-content-muted">
                            Sesi / pekan
                          </p>
                          <div className="mt-1 flex items-end gap-1">
                            {weeklyFit.map((w, i) => {
                              const maxS = Math.max(
                                ...weeklyFit.map((x) => x.sessions),
                                1,
                              )
                              return (
                                <div
                                  key={w.start}
                                  className="flex min-w-0 flex-1 flex-col items-center gap-0.5"
                                >
                                  <div className="flex h-8 w-full items-end">
                                    <div
                                      className={`w-full rounded-t-sm ${
                                        i === weeklyFit.length - 1
                                          ? 'bg-module-accent-strong'
                                          : 'bg-module-accent/60'
                                      }`}
                                      style={{
                                        height: `${Math.max((w.sessions / maxS) * 100, w.sessions > 0 ? 10 : 3)}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-chart-label font-semibold tabular-nums text-content-muted">
                                    P{i + 1}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        <div>
                          <p className="text-chart-label font-semibold uppercase tracking-wide text-content-muted">
                            Tonase / pekan
                          </p>
                          <div className="mt-1 flex items-end gap-1">
                            {weeklyFit.map((w, i) => {
                              const maxT = Math.max(
                                ...weeklyFit.map((x) => x.tonase),
                                1,
                              )
                              return (
                                <div
                                  key={w.start}
                                  className="flex min-w-0 flex-1 flex-col items-center gap-0.5"
                                >
                                  <div className="flex h-8 w-full items-end">
                                    <div
                                      className={`w-full rounded-t-sm ${
                                        i === weeklyFit.length - 1
                                          ? 'bg-chart-stroke-4'
                                          : 'bg-chart-stroke-4/50'
                                      }`}
                                      style={{
                                        height: `${Math.max((w.tonase / maxT) * 100, w.tonase > 0 ? 10 : 3)}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-chart-label font-semibold tabular-nums text-content-muted">
                                    P{i + 1}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </m.div>

                {/* Asupan */}
                <m.div
                  initial={playEntrance ? { opacity: 0, y: 16 } : false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-24px' }}
                  transition={{ ...motionTokens.preset.data, delay: motionTokens.delay.tight }}
                  className="rounded-lg border border-border bg-surface-primary p-5 shadow-soft"
                >
                  <p className="flex items-center gap-1.5 text-body font-semibold tracking-tight text-content-secondary">
                    <UtensilsCrossed className="h-3.5 w-3.5 text-chart-stroke-3" />
                    Asupan · 7 hari
                  </p>
                  {avgKcal > 0 ? (
                    <>
                      <p className="mt-3 flex items-baseline gap-1">
                        <span className="text-kpi-lg font-semibold leading-none tabular-nums text-content-primary">
                          {avgKcal.toLocaleString('id-ID')}
                        </span>
                        <span className="text-meta font-semibold text-content-muted">
                          kkal/hari
                        </span>
                      </p>
                      <p className="mt-1.5 text-eyebrow font-medium text-content-muted">
                        rata-rata dari {last7Kcal.length} hari tercatat
                      </p>
                      {/* v2.36: mini bar 7 hari KALENDER + garis target —
                          hari tanpa catatan = stub netral (bukan nol). */}
                      <div
                        className="relative mt-3"
                        role="img"
                        aria-label={`Kalori 7 hari terakhir: ${kcalWeek
                          .map(
                            (k) =>
                              `${shortDateLabel(k.date)} ${k.kcal != null && k.kcal > 0 ? `${k.kcal.toLocaleString('id-ID')} kkal` : 'tidak tercatat'}`,
                          )
                          .join(', ')}. Target ${calorieTarget.toLocaleString('id-ID')} kkal, ${kcalWeekLogged} dari 7 hari tercatat.`}
                      >
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 z-10"
                          style={{
                            bottom: `${Math.round(
                              (calorieTarget /
                                Math.max(
                                  ...kcalWeek.map((k) => k.kcal ?? 0),
                                  calorieTarget,
                                  1,
                                )) *
                                100,
                            )}%`,
                          }}
                        >
                          <div className="border-t border-dashed border-module-accent-strong/45" />
                        </div>
                        <div className="flex h-14 items-end gap-1">
                          {kcalWeek.map((k) => {
                            const max = Math.max(
                              ...kcalWeek.map((x) => x.kcal ?? 0),
                              calorieTarget,
                              1,
                            )
                            return (
                              <div
                                key={k.date}
                                className="min-w-0 flex-1"
                                aria-hidden="true"
                              >
                                <div
                                  className={`w-full rounded-t-sm ${
                                    k.kcal != null && k.kcal > 0
                                      ? 'bg-module-accent/70'
                                      : 'h-1 rounded-full bg-surface-sunken'
                                  }`}
                                  style={
                                    k.kcal != null && k.kcal > 0
                                      ? {
                                          height: `${Math.max((k.kcal / max) * 56, 5)}px`,
                                        }
                                      : undefined
                                  }
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <p className="mt-1.5 text-eyebrow font-medium text-content-muted">
                        {kcalWeekLogged}/7 hari tercatat · garis putus = target
                      </p>
                    </>
                  ) : (
                    <RutinaEmptyState
                      className="mt-3 px-4 py-6"
                      icon={<UtensilsCrossed />}
                      title="Belum ada jurnal makan"
                      description="Catat asupan pertamamu di tab Bugar › Asupan — rata-rata kalori harian terbaca di sini."
                    />
                  )}
                </m.div>

                {/* Tubuh */}
                <m.div
                  initial={playEntrance ? { opacity: 0, y: 16 } : false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-24px' }}
                  transition={{ ...motionTokens.preset.data, delay: motionTokens.delay.relaxed }}
                  className="rounded-lg border border-border bg-surface-primary p-5 shadow-soft"
                >
                  <p className="flex items-center gap-1.5 text-body font-semibold tracking-tight text-content-secondary">
                    <Activity className="h-3.5 w-3.5 text-chart-stroke-2" />
                    Tubuh · 7 hari
                  </p>
                  {last7Logs.length === 0 ? (
                    <RutinaEmptyState
                      className="mt-3 px-4 py-6"
                      icon={<Activity />}
                      title="Belum ada check-in tubuh"
                      description="Isi check-in harian di tab Bugar › Tubuh — tidur, energi, dan hidrasi terpantau di sini."
                    />
                  ) : (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-meta">
                        <span className="font-medium text-content-secondary">
                          Tidur rata-rata
                        </span>
                        <span className="font-semibold tabular-nums text-content-primary">
                          {avgSleep != null
                            ? `${avgSleep.toFixed(1).replace('.', ',')} jam`
                            : '–'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-meta">
                        <span className="font-medium text-content-secondary">
                          Energi rata-rata
                        </span>
                        <span className="font-semibold tabular-nums text-content-primary">
                          {avgEnergy != null
                            ? `${avgEnergy.toFixed(1).replace('.', ',')}/5`
                            : '–'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-meta">
                        <span className="font-medium text-content-secondary">
                          Hidrasi rata-rata
                        </span>
                        <span className="font-semibold tabular-nums text-content-primary">
                          {avgWater != null
                            ? `${avgWater.toFixed(1).replace('.', ',')}/8 gelas`
                            : '–'}
                        </span>
                      </div>
                      {weightDelta != null && (
                        <div className="flex items-center justify-between text-meta">
                          <span className="font-medium text-content-secondary">
                            Berat badan
                          </span>
                          <span
                            className={`flex items-center gap-1 font-semibold tabular-nums ${
                              weightDelta <= 0 ? 'text-success' : 'text-warning'
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
                        <p className="text-meta font-medium leading-relaxed text-content-muted">
                          Isi check-in harian di Bugar › Tubuh untuk memantau
                          pemulihan.
                        </p>
                      )}
                      {/* v2.36: small multiples 7 hari — tidur/energi/hidrasi
                          masing-masing berdiri sendiri (jam, skor 1-5, gelas);
                          hari tanpa catatan = stub netral, bukan nol. */}
                      {(sleepWeek.some((p) => p.value != null) ||
                        energyWeek.some((p) => p.value != null) ||
                        waterWeek.some((p) => p.value != null)) && (
                        <div className="mt-3 space-y-2 border-t border-border pt-3">
                          {(
                            [
                              {
                                key: 'tidur',
                                label: 'Tidur',
                                series: sleepWeek,
                                max: 8,
                                fmt: (v: number) => `${v.toFixed(1).replace('.', ',')} j`,
                              },
                              {
                                key: 'energi',
                                label: 'Energi',
                                series: energyWeek,
                                max: 5,
                                fmt: (v: number) => `${v}/5`,
                              },
                              {
                                key: 'hidrasi',
                                label: 'Hidrasi',
                                series: waterWeek,
                                max: fitTargets.water > 0 ? fitTargets.water : 8,
                                fmt: (v: number) => `${v} gls`,
                              },
                            ] as const
                          ).map((metric) => (
                            <div
                              key={metric.key}
                              role="img"
                              aria-label={`${metric.label} 7 hari: ${metric.series
                                .map(
                                  (p) =>
                                    `${p.label} ${
                                      p.value != null ? metric.fmt(p.value) : 'tidak tercatat'
                                    }`,
                                )
                                .join(', ')}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-12 shrink-0 text-chart-label font-semibold text-content-muted">
                                  {metric.label}
                                </span>
                                <div className="flex h-6 min-w-0 flex-1 items-end gap-[3px]">
                                  {metric.series.map((p) => (
                                    <span
                                      key={p.date}
                                      aria-hidden="true"
                                      className="flex h-full min-w-0 flex-1 items-end"
                                    >
                                      {p.value != null ? (
                                        <span
                                          className="w-full rounded-[2px] bg-module-accent/75"
                                          style={{
                                            height: `${Math.max(
                                              (p.value / metric.max) * 100,
                                              10,
                                            )}%`,
                                          }}
                                        />
                                      ) : (
                                        <span className="h-[3px] w-full rounded-full bg-surface-sunken" />
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </m.div>
              </div>
            </section>
          </RutinaBentoItem>
        </RutinaBentoGrid>

        {/* ===== Piala & Lencana — lebar penuh, dilipat default
            (audit visualisasi v2.12: kartu Streak Berjalan dihapus —
            streak & rekor sudah terbaca di KPI utama. Review v2.13:
            koleksi lencana jarang dibuka tiap kunjungan — hitungan
            terbuka tampil di pemicu, kisi dibuka bila diminati.) ===== */}
        <div id="stats-piala" className="@container scroll-mt-3">
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              aria-label={`Piala dan lencana, ${unlockedCount} dari ${badges.length} terbuka — buka untuk melihat koleksi`}
              className="interactive group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-primary p-3.5 text-left shadow-soft transition-colors hover:bg-surface-sunken/60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/25 text-warning">
                <Trophy aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold text-content-primary">
                  Piala &amp; Lencana
                </span>
                <span className="mt-0.5 block text-meta font-medium tabular-nums text-content-muted">
                  {/* Tahap 2: hitungan dinamis — koleksi v2.22 berisi 8
                      lencana, angka lama (4) menyesatkan. */}
                  {unlockedCount}/{badges.length} terbuka
                </span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-content-muted transition-transform duration-300 group-data-[state=open]:rotate-180"
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
          <div className="mt-3 grid grid-cols-2 gap-2.5 @[36rem]:grid-cols-4">
                {badges.map((b) => (
                  <BadgeCard key={b.name} badge={b} />
                ))}
              </div>
          </CollapsibleContent>
        </Collapsible>
        </div>

        {/* v2.32 Observatory: Check-in suasana hati — dipindah dari slot
            wawasan; input data tidak lagi menyamar sebagai insight, ia
            diletakkan di ujung halaman sebagai pintu catat-cepat. */}
        <section
          aria-label="Check-in suasana hati"
          className="mt-[var(--layout-gap)] rounded-lg border border-border bg-surface-primary p-4 shadow-soft sm:p-5"
        >
          <p className="text-body font-semibold tracking-tight text-content-secondary">
            Check-in Suasana
          </p>
          <p className="mt-0.5 text-eyebrow font-medium text-content-muted">
            satu ketukan — tercermin di Profil & wawasan lintas domain
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                    'interactive flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border ' +
                    (selected
                      ? 'motion-safe:animate-pop border-module-accent-strong bg-module-accent-strong text-module-accent-fg'
                      : 'border-border bg-surface-secondary text-content-secondary hover:bg-surface-sunken')
                  }
                >
                  <MoodIcon className="h-4 w-4" />
                  <span className="text-eyebrow font-semibold">{m}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-eyebrow font-medium text-content-muted">
            {mood
              ? `Kamu merasa ${mood.toLowerCase()} hari ini`
              : 'Bagaimana perasaanmu?'}
          </p>
        </section>

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
