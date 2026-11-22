'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { animate, stagger } from 'animejs'
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
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
import { cn } from '@/lib/utils'

import { MOOD_DOT, MOOD_TONE } from '../journal-ui'
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
  dayCompliance,
  dayCounts,
  daySchedules,
  doneCountOn,
  fromISO,
  habitsOn,
  isDoneOn,
  shortDateLabel,
  todayISO,
  useRutina,
  weekCounts,
  weekStartISO,
  WEEKDAY_MIN,
  type FinCat,
  type Habit,
  type HabitCat,
  type StatsView,
} from '../store'
import { RutinaBentoGrid, RutinaBentoItem } from '../rutina-bento'
import { RutinaCard } from '../rutina-card'
import { RutinaEmptyState } from '../rutina-empty-state'
import { RutinaMetric } from '../rutina-metric'
import { RutinaSectionHeader } from '../rutina-section-header'
import { RutinaTabs, RutinaTabsList, RutinaTabsTrigger } from '../rutina-tabs'
import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { barFill } from '@/lib/motion/transitions'
import { cardioSummary, durationLabel, weightSeries } from '../fitness/fit-utils'
import {
  constellationDays,
  constellationStats,
  LifeConstellation,
} from '../visualizations/stats/life-constellation'
import { HabitFlower } from '../visualizations/stats/habit-flower'
import { useSvgId } from '../visualizations/shared/svg-id'

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
  /* v2.45: klaim bonus kini ber-tanggal — reset alami tiap ganti hari. */
  const bonusClaimedOn = useRutina((s) => s.bonusClaimedOn)
  const bonusClaimed = bonusClaimedOn === todayISO()
  const workouts = useRutina((s) => s.workouts)
  const bodyLogs = useRutina((s) => s.bodyLogs)
  const txs = useRutina((s) => s.txs)
  const budgets = useRutina((s) => s.budgets)
  const setScreen = useRutina((s) => s.setScreen)

  /* Gerbang anti-replay (v2.35): koreografi pembuka Observatory hanya
     pada kunjungan pertama seumur sesi — remount antar-tab tampil instan;
     perubahan data/periode tetap bermorf lewat animate (bukan entrance). */
  const playEntrance = useFirstVisit('stats-observatory')

  /* Id gradient ring XP — hook bersama useSvgId (sanitasi ":" dari
     useId agar aman dirujuk url(#…)); mencegah kolisi bila ring
     dirender ganda (audit v2.47 #12). */
  const xpGradId = useSvgId('stats-xp-grad')

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
      /* v2.49 (audit): `filter(Boolean)` menghitung progres PARSIAL
         (angka truthy, mis. 5 dari 8 gelas) sebagai "kebiasaan selesai"
         — menggembungkan titik kalender & aria; store canonical
         (doneCountOn) menyaring `v === true` saja. */
      const done = Object.values(rec ?? {}).filter((v) => v === true).length
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
      /* v2.49 (audit): dayCompliance = SATU sumber (sadar-createdAt,
         hari-jeda diampuni) — habitsOn mentah menghitung hari sebelum
         kebiasaan ada & hari-jeda sebagai misi yang gagal, membuat
         "konsistensi" Laporan Bulanan berselisih dengan lembar detail
         & konstelasi untuk hari-hari yang sama. */
      const dc = dayCompliance(habits, completions, iso)
      sched += dc.due
      done += dc.done
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
    /* v2.49 (audit): label basi — notesInWindow dihitung EKSAK dari
       tanggal-dibuat (v2.36), footer layar ini sendiri bilang demikian. */
    push(
      'notes',
      'Catatan',
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

  /* Ringkasan pemicu lipatan "Pekan Ini vs Pekan Lalu" (audit density
     v2.37 §8) — baris misi dipakai sebagai pembuka: "N misi vs M misi
     minggu lalu (Δ%)". */
  const weekDone = weekMetrics.find((r) => r.key === 'done')
  const weekDeltaPct =
    weekDone && weekDone.prevN > 0
      ? Math.round((weekDone.delta / weekDone.prevN) * 100)
      : null
  const weekDoneSummary = weekDone
    ? `${weekDone.curN} misi vs ${weekDone.prevN} misi minggu lalu${
        weekDeltaPct != null
          ? ` (${weekDeltaPct > 0 ? '+' : ''}${weekDeltaPct}%)`
          : ''
      }`
    : ''

  const chartRef = useRef<HTMLDivElement>(null)
  const chartInView = useInView(chartRef, { once: true, margin: '-40px' })

  /* Batang grafik misi yang sedang dibaca (indeks) — dasar "tooltip"
     interaktif kartu Misi Selesai: ketuk batang → nilai terbaca di baris
     aria-live di bawah grafik (audit Tahap 2 #3). */
  const [selBar, setSelBar] = useState<number | null>(null)

  /* Mode visual seksi Konsistensi (v2.58, audit Tahap 2): rasi bintang
     30 hari (tren) atau heatmap 12 pekan (panas) — satu ruang, satu
     grafik besar pada satu waktu (dulu mode grafik menumpuk batang misi
     + rasi secara vertikal). */
  const [vizMode, setVizMode] = useState<'tren' | 'panas'>('tren')

  /* v2.77 (audit UX §1): pandangan aktif Statistik — empat tampilan yang
     BENAR-BENAR mengganti konten (bukan chip pintasan yang menggulir);
     uiPrefs mengingat pandangan terakhir antar perpindahan layar. */
  const view = useRutina((s) => s.uiPrefs.statsView)
  const setUiPref = useRutina((s) => s.setUiPref)

  /* Pergantian pandangan menggulir kembali ke puncak — tiap pandangan
     adalah halaman sendiri; sisa gulir pandangan lama tidak boleh
     membocorkan posisinya ke pandangan baru. */
  const viewRef = useRef(view)
  useEffect(() => {
    if (viewRef.current === view) return
    viewRef.current = view
    rootRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [view])

  /* Gerbang pandangan-pertama untuk grafik tren (audit Tahap 2 #4):
     kartu dipasang sejak awal (tinggi tetap, tanpa layout shift), grafik
     baru DIPASANG saat pertama masuk viewport — entrance konstelasi
     bermain tepat pada momen itu dan tidak diulang saat gulir balik. */
  const trendChartRef = useRef<HTMLDivElement>(null)
  const trendChartInView = useInView(trendChartRef, {
    once: true,
    margin: '-40px',
  })

  /* Misi hari ini — dari jadwal & histori penyelesaian nyata (dipakai
     menghitung XP ring profil; ring misi harian sendiri sudah dibaca di
     Beranda — audit visualisasi v2.12).
     Perf: satu useMemo untuk grup ini — bestStreak menyapu O(kebiasaan ×
     histori) dan tadinya berjalan ulang di tiap render (ketuk batang
     grafik, navigasi bulan, pilih hari) padahal input tak berubah. */
  const { xp, level, progress, remaining, best, activeHabits } = useMemo(() => {
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
    return { xp, level, progress, remaining, best, activeHabits }
  }, [habits, completions, today, bonusClaimed])

  /* ===== Tren penyelesaian 30 hari — konstelasi bintang (v2.47 Life
     Observatory): titik harian jujur, pct NULL bila hari itu tak ada
     jadwal (rateSeries lama memalsukan 0); rata-rata, delta, dan hitungan
     “di atas 70%” dihitung dari hari NON-NULL saja. */
  const trendPoints = useMemo(
    () => constellationDays(habits, completions, today, 30),
    [habits, completions, today],
  )
  const { avg: trendAvgRaw, delta: trendDelta, above70 } = useMemo(
    () => constellationStats(trendPoints),
    [trendPoints],
  )
  const trendAvg = trendAvgRaw ?? 0

  /* ===== KPI strip — lensa 30 hari =====
     v2.49 (audit): KPI Konsistensi kini = rata-rata konstelasi yang
     sama (rata-rata DARI pct harian), bukan jumlah/jumlah — keduanya
     berselisih setiap hari penyebutnya berbeda (jadwal weekday/weekend,
     jeda, createdAt): hari A 1/1 (100%) + hari B 0/5 (0%) → KPI lama 17%
     vs grafik 50%. Angka pendamping "N dari M terjadwal" tetap jumlah
     (labelnya memang total). */
  const kpi = useMemo(() => {
    const sched30 = daySchedules(habits, completions, today, 30)
    const sched = sched30.reduce((a, sd) => a + sd.scheduled, 0)
    const done = sched30.reduce((a, sd) => a + sd.done, 0)
    let missions = 0
    for (let i = 29; i >= 0; i--) {
      missions += doneCountOn(completions, addDaysISO(today, -i))
    }
    return {
      consistency: Math.round(trendAvgRaw ?? 0),
      sched,
      done,
      missions,
    }
  }, [habits, completions, today, trendAvgRaw])

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

  /* ===== Ringkasan lintas modul Bugar (audit density v2.37 §9) —
     Statistik hanya menampilkan baris metrik utama + pintu ke layar
     Bugar; grafik lengkap (tonase, PR, asupan, tidur/energi/hidrasi)
     tidak diduplikasi dari modul Bugar. Semua angka dari data nyata,
     dibungkus useMemo (pola perf yang sama dengan derivasi sebelumnya). ===== */
  const { fitSessions, fitMinutes, cardio30, lastWeight, weightDelta, weightSpark } =
    useMemo(() => {
      const since30 = addDaysISO(today, -30)
      const recent = workouts.filter((w) => w.date >= since30)
      const wSeries = weightSeries(bodyLogs)
      return {
        fitSessions: recent.length,
        fitMinutes: recent.reduce((a, w) => a + w.duration, 0),
        cardio30: cardioSummary(recent),
        lastWeight: wSeries.length > 0 ? wSeries[wSeries.length - 1].kg : null,
        weightDelta:
          wSeries.length >= 2
            ? wSeries[wSeries.length - 1].kg - wSeries[0].kg
            : null,
        /* v2.39 (audit visual data): deret berat 14 catatan terakhir —
           bahan sparkline mini di bawah metrik “Berat terakhir”. */
        weightSpark: wSeries.slice(-14).map((s) => s.kg),
      }
    }, [workouts, bodyLogs, today])

  /* ===== Wawasan Periode Ini (review UI/UX v2.44 Tahap 2) — maksimal
     tiga temuan pembanding periode di puncak halaman: konsistensi vs
     30 hari sebelumnya, ringkasan aktivitas Bugar, arus kas 30 hari.
     BEDA dari Insight lintas domain di bawah (korelasi antar-modul) —
     ini ringkasan periode-vs-periode. Aturan review: tanpa data
     pembanding, temuan tidak tampil (bukan angka karangan). ===== */
  const periodInsights = useMemo(() => {
    type Tone = 'up' | 'down' | 'info'
    const out: { key: string; title: string; body: string; tone: Tone }[] = []

    /* 1 — Konsistensi 30 hari vs 30 hari sebelumnya (ambang 5 poin
       agar derau kecil tidak dibesarkan). Pembanding memakai rumus
       yang SAMA dengan KPI (daySchedules — audit v2.47 #11) agar
       delta tidak mencampur dua sumber berbeda. */
    const prev30 = daySchedules(habits, completions, addDaysISO(today, -30), 30)
    const schedPrev = prev30.reduce((a, sd) => a + sd.scheduled, 0)
    const donePrev = prev30.reduce((a, sd) => a + sd.done, 0)
    if (kpi.sched > 0 && schedPrev > 0) {
      const prev = Math.round((donePrev / schedPrev) * 100)
      const diff = kpi.consistency - prev
      if (Math.abs(diff) >= 5) {
        out.push({
          key: 'konsistensi',
          title: diff > 0 ? 'Konsistensi meningkat' : 'Konsistensi menurun',
          body: `${kpi.consistency}% vs ${prev}% pada 30 hari sebelumnya — ${
            diff > 0 ? '+' : '−'
          }${Math.abs(diff)} poin.`,
          tone: diff > 0 ? 'up' : 'down',
        })
      }
    }

    /* 2 — Aktivitas Bugar 30 hari (ringkasan frekuensi & jarak —
       detailnya tetap di layar Bugar, bukan diduplikasi). */
    if (fitSessions > 0) {
      out.push({
        key: 'bugar',
        title: 'Aktivitas Bugar',
        body: `${fitSessions} sesi · ${durationLabel(fitMinutes)} latihan${
          cardio30.km > 0
            ? ` · ${cardio30.km.toFixed(1).replace('.', ',')} km kardio`
            : ''
        } dalam 30 hari.`,
        tone: 'info',
      })
    }

    /* 3 — Arus kas 30 hari (non-transfer): masuk vs keluar. */
    let masuk30 = 0
    let keluar30 = 0
    const since30 = addDaysISO(today, -29)
    for (const t of txs) {
      if (t.type === 'transfer' || t.ts < since30 || t.ts > today) continue
      if (t.type === 'masuk') masuk30 += t.amount
      else keluar30 += t.amount
    }
    if (masuk30 > 0 || keluar30 > 0) {
      const net30 = masuk30 - keluar30
      out.push({
        key: 'keuangan',
        title: net30 >= 0 ? 'Arus kas surplus' : 'Arus kas defisit',
        body: `Masuk ${formatIDRShort(masuk30)} vs keluar ${formatIDRShort(
          keluar30,
        )} dalam 30 hari — bersih ${net30 >= 0 ? '+' : '−'}${formatIDRShort(
          Math.abs(net30),
        )}.`,
        tone: net30 >= 0 ? 'up' : 'down',
      })
    }
    return out.slice(0, 3)
  }, [habits, completions, today, kpi, fitSessions, fitMinutes, cardio30, txs])

  /* ===== Ruang Suasana (v2.37 §8): jendela mood 14 hari (terlama →
      terbaru) + rekap jumlah per mood — pola visual & logika dipindah
      dari kartu Riwayat Mood Profil (audit density §9: satu pusat
      suasana hati di Statistik, Profil cukup chip ringkas). ===== */
  const moodDays = useMemo(
    () =>
      Array.from({ length: 14 }, (_, idx) => {
        const back = 13 - idx
        const iso = addDaysISO(today, -back)
        return {
          iso,
          label: WEEKDAY_MIN[fromISO(iso).getDay()],
          mood: moodLogs[iso],
          isToday: back === 0,
        }
      }),
    [moodLogs, today],
  )
  const moodCounts = useMemo(
    () =>
      MOODS.map((name) => ({
        name,
        count: moodDays.filter((d) => d.mood === name).length,
      })),
    [moodDays],
  )
  const moodLogged = moodCounts.some((c) => c.count > 0)

  /* Grafik misi selesai: 7 hari terakhir atau 4 pekan (P4 = berjalan). */
  const { weekData, monthData } = useMemo(
    () => ({
      weekData: dayCounts(completions, today, 7),
      monthData: weekCounts(completions, today),
    }),
    [completions, today],
  )
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

  /* Tren penyelesaian 30 hari — data & rata-rata dihitung DI ATAS
     (sebelum KPI strip) agar KPI dan grafik berbagi SATU angka; di sini
     tinggal badge arahnya. */
  const trendBadge =
    trendDelta >= 1 ? 'naik' : trendDelta <= -1 ? 'turun' : 'stabil'
  const TrendIcon =
    trendDelta >= 1 ? TrendingUp : trendDelta <= -1 ? TrendingDown : Minus

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
    /* Gerbang pandangan-pertama: stagger sekali seumur sesi tab. Ref saja
       tidak cukup — layar di-remount antar-tab sehingga ref ter-reset dan
       gelombang berulang di tiap kunjungan; playEntrance (useFirstVisit,
       stabil seumur hidup mount) memastikan kunjungan ulang langsung
       tampil final. Pergantian periode tetap tidak memicu koreografi
       ulang. */
    if (!playEntrance || barsPlayedRef.current) return
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

        {/* v2.77 (audit UX §1): EMPAT PANDANGAN SUNGGUHAN — dulu chip
            pintasan hanya MENGGULIR ke seksi dalam satu tumpukan panjang;
            kini tab mengganti konten: Ringkasan (hero + metrik Bugar),
            Tren, Kalender, dan Wawasan. Pandangan terakhir diingat uiPrefs
            saat pengguna pulang-pergi antar layar (pola subtab Bugar). */}
        <RutinaTabs
          value={view}
          onValueChange={(v) => {
            setUiPref({ statsView: v as StatsView })
            /* Sheet detail tanggal hanya relevan di pandangan Kalender —
               pindah pandangan menutupnya, bukan membiarkannya melayang
               di atas konten yang tak lagi terlihat. */
            setSelectedDay(null)
          }}
        >
          <RutinaTabsList
            aria-label="Pandangan Statistik"
            className="mt-[var(--layout-gap)] w-full"
          >
            {(
              [
                ['ringkasan', 'Ringkasan'],
                ['tren', 'Tren'],
                ['kalender', 'Kalender'],
                ['wawasan', 'Wawasan'],
              ] as const
            ).map(([id, label]) => (
              <RutinaTabsTrigger
                key={id}
                value={id}
                className="flex-1 data-[state=active]:bg-module-accent/15 data-[state=active]:text-module-accent-strong"
              >
                {label}
              </RutinaTabsTrigger>
            ))}
          </RutinaTabsList>
        </RutinaTabs>

        {/* v2.77: pandangan keep-alive — hanya pandangan aktif yang tampil,
            sisanya disembunyikan (state internal tak ter-reset). */}
        <div className={view === 'ringkasan' ? 'block' : 'hidden'}>

        {/* ===== HERO OBSERVATORIUM (v2.58, audit Tahap 2) — profil
            pemain, cincin Level/XP, dan tiga metrik kunci disatukan dalam
            SATU permukaan hero. Dulu empat blok bertumpuk sebelum grafik
            pertama (baris profil + cincin XP 176px + kartu KPI + kartu
            wawasan periode); wawasan periode kini tinggal di pandangan
            Wawasan. ===== */}
        <section aria-label="Ringkasan pemain" className="mt-[var(--layout-gap)]">
          <m.div
            initial={playEntrance ? { opacity: 0, y: reducedMotion ? 0 : 12 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-24px' }}
            transition={motionTokens.preset.data}
            className="@container rounded-2xl border border-border bg-hero-surface p-4 shadow-soft sm:p-5"
          >
            {/* Baris profil — avatar, nama, lencana level. */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-cocoa/40">
                <AvatarFallback className="bg-cocoa text-eyebrow font-semibold tracking-widest text-parchment">
                  PR
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-section font-semibold tracking-tight text-hero-content">
                  Petualang Rutina
                </p>
                <p className="text-eyebrow font-medium text-hero-content-muted">
                  Petualang Konsisten
                </p>
              </div>
              <span className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-hero-surface-raised px-3 text-eyebrow font-semibold text-pistachio shadow-soft">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
                LV {level}
              </span>
            </div>

            {/* Cincin XP (ringkas 144px) + tiga metrik kunci — sejajar pada
                ruang cukup, menumpuk tenang di ponsel. */}
            <div className="mt-4 flex flex-col items-center gap-5 @[34rem]:flex-row @[34rem]:gap-7">
              <m.div
                initial={playEntrance ? { opacity: 0, scale: 0.9 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={motionTokens.preset.data}
                whileTap={{ scale: 0.96 }}
                className="relative shrink-0 cursor-pointer select-none"
              >
                <svg
                  viewBox="0 0 200 200"
                  className="h-36 w-36 -rotate-90"
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
                    stroke={`url(#${xpGradId})`}
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
                      id={xpGradId}
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
                  <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-hero-content-muted">
                    Level
                  </p>
                  <p className="text-kpi font-semibold leading-none tabular-nums text-hero-content">
                    {level}
                  </p>
                  <span className="mt-2 rounded-full bg-hero-surface-raised px-2.5 py-1 text-eyebrow font-semibold text-pistachio">
                    <Counter
                      to={xp}
                      immediate={!playEntrance || Boolean(reducedMotion)}
                    />{' '}
                    XP
                  </span>
                </div>
              </m.div>

              <div className="min-w-0 flex-1">
                <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-hero-content-muted">
                  Konsistensi · 30 hari
                </p>
                <p className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-kpi-lg font-semibold leading-none tracking-tight tabular-nums text-hero-content">
                    <Counter
                      to={kpi.consistency}
                      immediate={!playEntrance || Boolean(reducedMotion)}
                    />
                  </span>
                  <span className="text-note font-semibold text-hero-content-muted">%</span>
                </p>
                <p className="mt-1 text-eyebrow font-medium leading-snug text-hero-content-muted">
                  {kpi.sched > 0
                    ? `${kpi.done} dari ${kpi.sched} terjadwal selesai`
                    : 'Belum ada jadwal kebiasaan'}
                </p>
                {/* Baris sekunder — misi, streak berjalan, rekor; hairline
                    atas, dibaca sekali sapuan, tanpa kotak. */}
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
                </div>
              </div>
            </div>
            <p className="mt-4 border-t border-hero-content/10 pt-3 text-center text-eyebrow font-medium text-hero-content-muted">
              {level >= 8
                ? 'Level baru terbuka — lanjutkan petualanganmu'
                : `${remaining} XP lagi menuju Level ${level + 1}`}
            </p>
          </m.div>
        </section>

        {/* ===== Bugar & Tubuh — ringkasan satu baris + tautan (audit
            density v2.37 §9): grafik lengkap modul Bugar (tonase, PR,
            asupan kkal, tidur/energi/hidrasi) tidak lagi diduplikasi
            di sini — empat metrik utama + pintu ke layar Bugar. ===== */}
        <section aria-label="Ringkasan bugar dan tubuh" className="@container mt-[var(--layout-gap)]">
          <SectionTitle title="Bugar & Tubuh" hint="ringkasan · detail di tab Bugar" />
          <m.div
            initial={playEntrance ? { opacity: 0, y: 16 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-24px' }}
            transition={motionTokens.preset.data}
            className="rounded-2xl border border-border bg-surface-primary p-5 shadow-soft"
          >
            <p className="flex items-center gap-1.5 text-body font-semibold tracking-tight text-content-secondary">
              <Dumbbell className="h-3.5 w-3.5 text-chart-stroke-4" />
              Latihan &amp; Tubuh · 30 hari
            </p>
            <div className="mt-3.5 grid grid-cols-2 gap-x-4 gap-y-4 @[30rem]:grid-cols-4">
              <RutinaMetric
                label="Sesi latihan"
                value={fitSessions}
                unit="sesi"
                size="sm"
              />
              <RutinaMetric
                label="Total durasi"
                value={fitMinutes}
                unit="menit"
                size="sm"
              />
              <RutinaMetric
                label="Kardio"
                value={cardio30.km.toFixed(1).replace('.', ',')}
                unit="km"
                size="sm"
                caption={`${cardio30.sessions} sesi jalan/lari`}
              />
              <div>
                <RutinaMetric
                  label="Berat terakhir"
                  value={
                    lastWeight != null
                      ? lastWeight.toFixed(1).replace('.', ',')
                      : '–'
                  }
                  unit={lastWeight != null ? 'kg' : undefined}
                  size="sm"
                  caption={
                    weightDelta != null
                      ? `${weightDelta > 0 ? 'naik' : weightDelta < 0 ? 'turun' : 'tetap'} ${Math.abs(weightDelta).toFixed(1).replace('.', ',')} kg sejak catatan pertama`
                      : 'belum ada riwayat berat'
                  }
                />
                {/* Sparkline mini (v2.39 audit visual data) — warna
                    netral (naik/turun belum tentu baik/buruk); baru
                    digambar dari 3 catatan (aturan jujur: 2 titik
                    bukan tren). Skala penuh 14 catatan terakhir. */}
                {weightSpark.length >= 3 && (
                  <svg
                    viewBox="0 0 120 26"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    className="mt-1.5 h-6 w-full"
                  >
                    {(() => {
                      const lo = Math.min(...weightSpark)
                      const hi = Math.max(...weightSpark)
                      const span = Math.max(hi - lo, 0.5)
                      const n = weightSpark.length
                      const pts = weightSpark
                        .map(
                          (v, i) =>
                            `${((i / (n - 1)) * 120).toFixed(1)},${(
                              3 +
                              (1 - (v - lo) / span) * 20
                            ).toFixed(1)}`,
                        )
                        .join(' ')
                      return (
                        <polyline
                          points={pts}
                          fill="none"
                          stroke="var(--chart-stroke-1)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      )
                    })()}
                  </svg>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setScreen('bugar')}
              aria-label="Buka layar Bugar untuk detail latihan, asupan, dan tubuh"
              className="interactive mt-4 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-module-accent-strong text-note font-bold text-module-accent-fg shadow-soft transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Dumbbell aria-hidden="true" className="h-4 w-4" strokeWidth={2.1} />
              Buka Bugar untuk detail latihan, asupan, &amp; tubuh
            </button>
          </m.div>
        </section>
        </div>

        <div className={view === 'tren' ? 'mt-[var(--layout-gap)] block' : 'hidden'}>

        {/* ===== KONSISTENSI (v2.58, audit Tahap 2) — SATU grafik besar
            dengan pemilih mode Tren | Peta Panas: rasi bintang 30 hari
            (tren) atau heatmap 12 pekan (historis). Dulu mode Grafik
            menumpuk DUA grafik konsistensi besar (batang misi + rasi)
            secara vertikal di ponsel; batang misi per periode kini
            analisis lanjutan di dalam lipatan Grafik Misi Selesai
            (v2.86 audit: id stats-* & scroll-mt yatim disapu — pintasan
            gulir sudah diganti pandangan tab sejak v2.77). ===== */}
        <section
          aria-label="Konsistensi"
        >
          <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
            <div className="min-w-0">
              <h2 className="flex items-center gap-1.5 text-section-lg font-bold tracking-tight text-content-primary">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-module-accent"
                />
                Konsistensi
              </h2>
              <p className="mt-0.5 text-meta font-medium text-module-accent-strong">
                persentase misi selesai · 30 hari · 12 pekan
              </p>
            </div>
            <div
              role="group"
              aria-label="Mode visual konsistensi"
              className="flex shrink-0 gap-1 rounded-full border border-border bg-surface-sunken p-0.5"
            >
              {(
                [
                  ['tren', 'Tren'],
                  ['panas', 'Peta Panas'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={vizMode === id}
                  onClick={() => setVizMode(id)}
                  className={`interactive h-10 cursor-pointer rounded-full px-3.5 text-meta font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    vizMode === id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-content-secondary hover:text-content-primary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            {vizMode === 'tren' ? (
              /* Tren — rasi bintang 30 hari (v2.47 Life Observatory):
                 bintang per hari terjadwal, titik redup = tanpa jadwal
                 (bukan 0%), garis putus rata-rata non-null; bintang bisa
                 diketuk (baris bacaan aria-live di dalam kartu). */
                            <m.div
                initial={playEntrance ? { opacity: 0, y: 16 } : false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-24px' }}
                transition={motionTokens.preset.data}
                className="rounded-2xl border border-border bg-surface-primary p-5 shadow-soft"
              >
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-body font-semibold tracking-tight text-content-secondary">
                      Tren Penyelesaian
                    </p>
                    <p className="mt-0.5 text-eyebrow font-medium text-content-muted">
                      persentase misi selesai · 30 hari terakhir
                    </p>
                    {/* Rata-rata hanya tampil bila ada hari terjadwal —
                        menahan diri dari angka 0% karangan. */}
                    {trendAvgRaw != null && (
                      <p className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-kpi-sm font-semibold leading-none tracking-tight tabular-nums text-content-primary">
                          <Counter
                            to={trendAvg}
                            decimals={1}
                            immediate={!playEntrance || Boolean(reducedMotion)}
                          />
                        </span>
                        <span className="text-note font-medium text-content-muted">
                          % rata-rata / hari
                        </span>
                      </p>
                    )}
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
                    <LifeConstellation points={trendPoints} />
                  ) : (
                    /* Penahan tinggi tetap — grafik dipasang saat pertama
                       masuk viewport agar entrance konstelasi bermain tepat
                       pada momen itu (audit Tahap 2 #4), tanpa layout shift. */
                    <div className="h-[150px]" aria-hidden="true" />
                  )}
                </div>
                {/* Legenda grafik tren — bintang solid, garis putus rata-rata,
                    dan titik redup hari tanpa jadwal (null ≠ 0%). */}
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
                  {trendAvgRaw != null && (
                    <span className="flex items-center gap-1.5 text-eyebrow font-medium text-content-muted">
                      <span
                        aria-hidden="true"
                        className="w-5 border-t-2 border-dashed border-chart-stroke-5"
                      />
                      rata-rata {trendAvg.toFixed(1).replace('.', ',')}%
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-eyebrow font-medium text-content-muted">
                    <span
                      aria-hidden="true"
                      className="inline-block h-1.5 w-1.5 rounded-full bg-content-muted/40"
                    />
                    tanpa jadwal
                  </span>
                </div>
                <p className="mt-2 text-eyebrow font-medium text-content-muted">
                  Konsistensi di atas 70% pada {above70} dari 30 hari terakhir.
                </p>
              </m.div>
            ) : (
              /* Peta Panas — pola penyelesaian 12 pekan; visitKey
                 diteruskan agar gerbang anti-replay internal Heatmap
                 (tab pertama saja) seragam dengan seluruh layar. */
              <Heatmap visitKey="stats-heatmap" />
            )}
          </div>
        </section>
        </div>

        <div className={view === 'kalender' ? 'mt-[var(--layout-gap)] block' : 'hidden'}>
        {/* Kalender Aktivitas + Laporan Bulanan terpadu (v2.58, audit
            Tahap 2): laporan hidup DI DALAM kartu kalender — satu panel
            aktivitas bulanan; panel detail tanggal tetap di samping pada
            ruang kerja lebar. */}
        <RutinaBentoGrid>
          <RutinaBentoItem className="col-span-2 @[52rem]:col-span-7">
            {/* ===== Kalender Aktivitas — peta bulan + detail harian (audit #7) ===== */}
            <m.section
              initial={playEntrance ? { opacity: 0, y: 16 } : false}
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
                {/* Laporan Bulanan terpadu (v2.58, audit Tahap 2): hidup
                    DI DALAM kartu kalender — mengganti bulan pada kalender
                    ikut mengganti isi laporan; tidak lagi kartu besar
                    terpisah. Tetap dilipat default (review v2.13). */}
                {/* ===== Laporan Bulanan — konsistensi & anggaran (audit #8).
                    Dilipat secara default (review Statistik v2.13): laporan
                    jarang dibuka tiap kunjungan — ringkasan singkat tampil di
                    pemicu, detail penuh dibuka bila dibutuhkan. ===== */}
                <div>
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
                  <div className="rounded-xl bg-surface-sunken/40 px-4 py-4 sm:px-5">
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

                        {/* v2.61 (audit Tahap 2): pratinjau kutipan identitas
                            DIHAPUS dari laporan — duplikat permukaan dengan
                            Ruang Kerja Identitas Profil (satu sumber
                            pratinjau); runtun terbaik tetap dibaca. */}
                        <div className="rounded-2xl bg-surface-sunken p-4">
                          <p className="flex items-center gap-1.5 text-body font-semibold tracking-tight text-content-secondary">
                            <Flame aria-hidden="true" className="h-3.5 w-3.5 text-success" />
                            Runtun terbaik{best.habit ? ` — ${best.habit.title}` : ''}
                          </p>
                          <p className="mt-2 text-right text-note font-semibold tabular-nums text-success">
                            {best.streak} hari
                          </p>
                        </div>
                      </div>
                    ) : (
                      <RutinaEmptyState
                        icon={<CalendarDays />}
                        title="Belum ada aktivitas bulan ini"
                        description="Tidak ada kebiasaan selesai, transaksi, atau latihan pada bulan ini — pilih bulan lain di kalender."
                      />
                    )}
                  </div>
                  </CollapsibleContent>
                </Collapsible>
                </div>
              </RutinaCard>
            </m.section>
          </RutinaBentoItem>


          {inspectorWide && (
            <RutinaBentoItem className="col-span-2 @[52rem]:col-span-5">
              {/* Inspector tanggal desktop — PERMANEN di ruang kerja lebar:
                  tanggal terpilih dari kalender (default hari ini). Ponsel:
                  sheet di bawah layar. */}
              <DayDetailPanel date={selectedDay ?? today} />
            </RutinaBentoItem>
          )}
        </RutinaBentoGrid>

        {/* ===== WAWASAN & PENCAPAIAN — v2.77: pandangan keempat yang
            SUNGGUHAN (tab, bukan lipatan): temuan periode, komposisi
            kebiasaan, wawasan lintas domain, grafik misi per periode,
            pembanding pekan, piala & lencana, dan ruang suasana.
            Kualifikasi observasional lintas domain tetap terpelihara
            (bukan sebab-akibat). ===== */}
        </div>

        <div className={view === 'wawasan' ? 'block' : 'hidden'}>
          <div className="mt-[var(--layout-gap)] space-y-[var(--layout-gap)]">
          {/* ===== Wawasan Periode Ini (review UI/UX v2.44 Tahap 2) —
              maksimal tiga temuan pembanding periode tepat setelah KPI:
              konsistensi vs periode sebelumnya, ringkasan Bugar, arus
              kas. Kosong bila data pembanding belum cukup. ===== */}
          {periodInsights.length > 0 && (
            <section aria-label="Wawasan periode ini">
              <m.div
                initial={playEntrance ? { opacity: 0, y: reducedMotion ? 0 : 12 } : false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-24px' }}
                transition={motionTokens.preset.data}
                className="rounded-2xl border border-border bg-surface-primary p-4 shadow-soft sm:p-5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-secondary">
                    Wawasan Periode Ini
                  </h2>
                  <p className="text-eyebrow font-medium text-content-muted">
                    30 hari · vs periode sebelumnya
                  </p>
                </div>
                <ul className="mt-3 divide-y divide-border-default">
                  {periodInsights.map((f) => {
                    const Icon =
                      f.key === 'bugar'
                        ? Dumbbell
                        : f.tone === 'up'
                          ? TrendingUp
                          : f.tone === 'down'
                            ? TrendingDown
                            : Sparkles
                    return (
                      <li key={f.key} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            f.tone === 'up'
                              ? 'bg-secondary text-success'
                              : f.tone === 'down'
                                ? 'bg-clay/20 text-content-danger'
                                : 'bg-module-accent-soft text-module-accent-strong'
                          }`}
                        >
                          <Icon className="h-4 w-4" strokeWidth={2.2} />
                        </span>
                        <div className="min-w-0">
                          <p
                            className={`text-note font-bold ${
                              f.tone === 'down' ? 'text-content-danger' : 'text-content-primary'
                            }`}
                          >
                            {f.title}
                          </p>
                          <p className="mt-0.5 text-meta leading-relaxed text-content-muted">
                            {f.body}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </m.div>
            </section>
          )}


          {/* ===== Wawasan — komposisi kategori kebiasaan + suasana hati =====
              (audit visualisasi v2.12: duplikasi dihapus — ring misi harian
              sudah terbaca di Beranda, kartu streak ganda sudah terwakili KPI
              utama; donut diberi judul jujur sesuai sumber datanya.)
              Urutan seksi Tahap 2 #2: setelah Kalender/Laporan, sebelum
              perbandingan pekan — komposisi kategori menempati posisi #5. */}
          <RutinaBentoGrid>
            <RutinaBentoItem span="medium">
              {/* Komposisi kebiasaan aktif — bunga radial per kategori
                  (v2.47 Life Observatory: HabitFlower menggantikan donut
                  PieChart). Panjang kelopak memetakan jumlah LINEAR
                  (outerR = 24 + value/max × 34); baris legenda adalah
                  pemilih utama (tombol nyata), kelopak juga bisa diketuk. */}
              <m.div
                initial={playEntrance ? { opacity: 0, y: 16 } : false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-24px' }}
                transition={motionTokens.preset.data}
                className="h-full rounded-2xl border border-border bg-surface-primary p-5 shadow-soft"
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
                  <HabitFlower data={catData} total={activeHabits.length} />
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
                className="h-full rounded-2xl border border-border bg-surface-primary p-5 shadow-soft"
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


          {/* Misi selesai (v2.79, audit UX §F) — grafik tambahan kini
              dibuka sendiri: pandangan Wawasan menonjolkan temuan;
              instrumen grafik misi (fokus periode + batang) hidup di
              balik SATU ketukan dengan ringkasan di pemicu. Data &
              perhitungan tak berubah. */}
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-label={`Grafik misi selesai — ${chartTotal} misi ${period === 'pekan' ? 'tujuh hari terakhir' : 'empat pekan terakhir'}. Buka untuk detail`}
                className="interactive group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-primary p-3.5 text-left shadow-soft transition-colors hover:bg-surface-sunken/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary"
                >
                  <BarChart3
                    aria-hidden="true"
                    className="h-[18px] w-[18px]"
                    strokeWidth={2}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold text-content-primary">
                    Grafik Misi Selesai
                  </span>
                  <span className="mt-0.5 block text-meta font-medium tabular-nums text-content-muted">
                    {`${chartTotal} misi · ${
                      period === 'pekan' ? '7 hari terakhir' : '4 pekan terakhir'
                    }`}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-content-muted transition-transform duration-300 group-data-[state=open]:rotate-180"
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
          {/* Pasangan bento feature(4) + wide(8): panel menyimpan sakelar
              periode, total, dan ringkasan; kartu grafik murni batang. */}
          <RutinaBentoGrid>
          <RutinaBentoItem className="col-span-2 @[42rem]:col-span-6 @[52rem]:col-span-4">
            {/* Panel fokus periode — sakelar periode + pembacaan ringkas */}
            <m.section
              initial={playEntrance ? { opacity: 0, y: 16 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={motionTokens.preset.data}
              className="flex h-full flex-col rounded-2xl border border-border bg-hero-surface p-5 shadow-card"
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
                  <Counter
                    to={chartTotal}
                    immediate={!playEntrance || Boolean(reducedMotion)}
                  />
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
            {/* Instrumen grafik — batang misi selesai (analisis lanjutan
                di dalam lipatan Wawasan & Pencapaian, v2.58). Kartu
                instrumen parchment (audit Tahap 2 #6): garis & indikator
                tegas di atas permukaan terang; batang non-puncak memakai
                tinta content redup, puncak memakai gradasi chart token.
                Setiap batang adalah tombol — "tooltip" interaktif terbaca
                di baris aria-live di bawah grafik. */}
            <m.section
              ref={chartRef}
              initial={playEntrance ? { opacity: 0, y: 16 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ ...motionTokens.preset.data, delay: motionTokens.delay.tight }}
              className="flex h-full flex-col rounded-2xl border border-border bg-surface-primary p-5 shadow-card"
              aria-label="Grafik misi selesai"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  {/* v2.47 Mission Harvest: eyebrow kecil “panen misi” —
                      copy tambahan sadar-batang, judul kartu tak berubah. */}
                  <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                    panen misi
                  </p>
                  <p className="text-body font-semibold tracking-tight text-content-secondary">
                    Misi Selesai
                  </p>
                </div>
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
                      const hasValue = d.value > 0
                      return (
                        <button
                          key={i}
                          type="button"
                          aria-pressed={isSel}
                          aria-label={`${d.label} — ${d.value} misi selesai`}
                          onClick={() => setSelBar(isSel ? null : i)}
                          className="interactive flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-lg pt-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          {/* v2.47 Mission Harvest — batang = tangkai panen:
                              kolom rounded-t-full gradasi aksen modul dengan
                              tudung di puncak: daun kecil matcha (biasa) /
                              buah emas + tangkai (puncak). Tudung DI DALAM
                              data-bar (absolut di puncak) sehingga ikut
                              tumbuh bersama stagger scaleY & ikut naik saat
                              tinggi batang bernorf antar periode. Tinggi &
                              transisi tinggi dijaga PERSIS seperti sebelumnya. */}
                          <div
                            data-bar
                            className={`relative w-full origin-bottom ${
                              d.value === 0 ? 'rounded-full' : 'rounded-t-full'
                            } ${
                              isPeak
                                ? 'bg-gradient-to-t from-chart-1 to-chart-4'
                                : isSel
                                  ? 'bg-module-accent-strong'
                                  : 'bg-gradient-to-t from-module-accent/70 to-module-accent'
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
                          >
                            {hasValue && (
                              <span
                                aria-hidden="true"
                                className={`absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full transition-transform duration-200 ${
                                  isSel ? 'scale-[1.15]' : 'scale-100'
                                }`}
                                style={{ transformOrigin: '50% 100%' }}
                              >
                                {isPeak ? (
                                  /* Buah emas + tangkai — penanda puncak. */
                                  <svg
                                    viewBox="0 0 14 16"
                                    className="block h-[15px] w-[13px]"
                                  >
                                    <path
                                      d="M7 1 C 7 2.8 7 3.9 7 5.4"
                                      fill="none"
                                      stroke="var(--chart-stroke-4)"
                                      strokeWidth={1.6}
                                      strokeLinecap="round"
                                    />
                                    <path
                                      d="M7 3.9 C 8.8 2.9 10.3 3.1 11.3 4.1"
                                      fill="none"
                                      stroke="var(--chart-stroke-4)"
                                      strokeWidth={1.5}
                                      strokeLinecap="round"
                                    />
                                    <circle cx="7" cy="10.4" r="4.7" fill="var(--palette-gold)" />
                                    <circle
                                      cx="5.5"
                                      cy="9"
                                      r="1.1"
                                      fill="var(--surface-primary)"
                                      opacity={0.55}
                                    />
                                  </svg>
                                ) : (
                                  /* Daun kecil matcha — hari biasa. */
                                  <svg
                                    viewBox="0 0 14 14"
                                    className="block h-[13px] w-[13px]"
                                  >
                                    <path
                                      d="M7 13.2 C 2.4 11 1.2 5.2 4 1.4 C 8.8 2.4 11.6 6.4 10.6 10.4 C 9.9 12.2 8.7 13.2 7 13.2 Z"
                                      fill="var(--chart-stroke-4)"
                                    />
                                  </svg>
                                )}
                              </span>
                            )}
                          </div>
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
            </CollapsibleContent>
          </Collapsible>


          {/* ===== Pekan Ini vs Pekan Lalu — pembanding penuh (audit #12),
              dilipat secara default (audit density v2.37 §8): ringkasan
              misi tampil di pemicu (pola persis Laporan Bulanan), tabel
              perbandingan lengkap dibuka bila dibutuhkan. ===== */}
          <m.section
            initial={playEntrance ? { opacity: 0, y: 16 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-24px' }}
            transition={motionTokens.preset.data}
            aria-label="Pembanding pekan ini vs pekan lalu"
          >
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  aria-label={`Pekan ini vs pekan lalu, ${shortDateLabel(weekStart)} sampai ${shortDateLabel(today)}${weekDoneSummary ? `, ${weekDoneSummary}` : ''} — buka untuk detail perbandingan`}
                  className="interactive group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-primary p-3.5 text-left shadow-soft transition-colors hover:bg-surface-sunken/60"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-content-secondary">
                    <CalendarCheck aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-semibold text-content-primary">
                      Pekan Ini vs Pekan Lalu
                    </span>
                    <span className="mt-0.5 block text-meta font-medium tabular-nums text-content-muted">
                      {`${shortDateLabel(weekStart)} – ${shortDateLabel(today)}${
                        weekDoneSummary ? ` · ${weekDoneSummary}` : ''
                      }`}
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
              </CollapsibleContent>
            </Collapsible>
          </m.section>
          {/* ===== Piala & Lencana — lebar penuh, dilipat default
              (audit visualisasi v2.12: kartu Streak Berjalan dihapus —
              streak & rekor sudah terbaca di KPI utama. Review v2.13:
              koleksi lencana jarang dibuka tiap kunjungan — hitungan
              terbuka tampil di pemicu, kisi dibuka bila diminati.) ===== */}
          <div className="@container">
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


          {/* v2.37 Ruang Suasana (audit density §8/§9): input check-in tetap
              di ujung halaman + riwayat mood 14 hari (dipindah dari Profil)
              — satu pusat suasana hati; Profil cukup chip ringkas. */}
          <section
            aria-label="Ruang suasana hati"
            className="rounded-2xl border border-border bg-surface-primary p-4 shadow-soft sm:p-5"
          >
            <p className="text-body font-semibold tracking-tight text-content-secondary">
              Ruang Suasana
            </p>
            <p className="mt-0.5 text-eyebrow font-medium text-content-muted">
              satu ketukan — tercermin di wawasan lintas domain &amp; Profil
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

            {/* Riwayat 14 hari — grid 2×7 (perbaikan v2.53): dulu SATU
                baris 14 kolom — label hari "Min/Sen/…" (±20px) tidak muat
                pada kolom ±15–22px di layar sempit sehingga saling menumpuk
                jadi pita teks tak terbaca. Dua pekan berurutan selalu mulai
                di hari yang sama (±7 hari), maka kedua baris sejajar rapi
                di bawah SATU header hari — kolom kini 2× lebih lega dan
                pola mingguan mood terbaca seperti kalender mini. */}
            {moodLogged ? (
              <>
                <div className="mt-4 border-t border-border pt-4">
                  <div
                    role="list"
                    aria-label="Mood per hari, 14 hari terakhir"
                  >
                    {/* Header hari — 7 kolom, sejajar dengan kedua baris ikon. */}
                    <div
                      className="grid grid-cols-7 gap-1"
                      aria-hidden="true"
                    >
                      {moodDays.slice(0, 7).map((d) => (
                        <span
                          key={`h-${d.iso}`}
                          className="text-center text-chart-label font-semibold uppercase tracking-wide text-content-muted"
                        >
                          {d.label}
                        </span>
                      ))}
                    </div>
                    {/* Dua pekan ikon — pekan lalu di atas, pekan ini (dengan
                        penanda hari ini) di bawah. */}
                    {[moodDays.slice(0, 7), moodDays.slice(7, 14)].map(
                      (week, wi) => (
                        <div
                          key={`w-${wi}`}
                          className="mt-1 grid grid-cols-7 gap-1"
                        >
                          {week.map((d) => {
                            const MoodIcon =
                              d.mood != null ? MOOD_ICONS[d.mood] : null
                            return (
                              <div
                                key={d.iso}
                                role="listitem"
                                title={`${shortDateLabel(d.iso)}${d.mood ? ` · ${d.mood}` : ' · tanpa catatan'}`}
                                aria-label={`${shortDateLabel(d.iso)}${d.mood ? ` ${d.mood}` : ' tanpa catatan'}`}
                                className={cn(
                                  'flex min-w-0 flex-col items-center gap-1 rounded-xl py-1.5',
                                  d.isToday &&
                                    'bg-secondary/60 ring-1 ring-primary/30',
                                )}
                              >
                                {MoodIcon ? (
                                  <MoodIcon
                                    className={cn(
                                      'h-4.5 w-4.5',
                                      MOOD_TONE[d.mood ?? '']?.text,
                                    )}
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Minus
                                    className="h-4 w-4 text-content-muted/40"
                                    aria-hidden="true"
                                  />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ),
                    )}
                  </div>
                </div>
                {/* Distribusi mood — satu bar segmented netral dari MOOD_DOT
                    (bukan pelangi); hari tanpa check-in TIDAK masuk penyebut. */}
                {(() => {
                  const logged = moodCounts.reduce((a, c) => a + c.count, 0)
                  const segs = moodCounts.filter((c) => c.count > 0)
                  return (
                    segs.length > 0 && (
                      <div className="mt-3">
                        <div
                          className="flex h-2 overflow-hidden rounded-full bg-surface-sunken"
                          role="img"
                          aria-label={`Distribusi mood 14 hari dari ${logged} hari tercatat: ${segs
                            .map((c) => `${c.name} ${c.count}`)
                            .join(', ')}`}
                        >
                          {segs.map((c) => (
                            <span
                              key={c.name}
                              className={MOOD_DOT[c.name] ?? 'bg-cocoa/40'}
                              style={{ width: `${(c.count / logged) * 100}%` }}
                            />
                          ))}
                        </div>
                        <p className="mt-1.5 px-0.5 text-right text-eyebrow font-medium text-content-muted">
                          dari {logged} hari tercatat
                        </p>
                      </div>
                    )
                  )
                })()}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 px-0.5">
                  <span className="text-chart-label font-semibold uppercase tracking-[0.14em] text-content-muted">
                    Rekap 14 hari
                  </span>
                  {moodCounts
                    .filter((c) => c.count > 0)
                    .map((c, i, arr) => (
                      <span
                        key={c.name}
                        className="flex items-center gap-2 text-meta font-semibold"
                      >
                        {/* whitespace-nowrap: pasangan "Nama N×" tidak boleh
                            patah baris di tengah — pemisah · tetap di ujung
                            item sebelumnya. */}
                        <span className="whitespace-nowrap">
                          <span className={MOOD_TONE[c.name]?.text}>
                            {c.name}
                          </span>{' '}
                          <span className="tabular-nums text-content-muted">
                            {c.count}×
                          </span>
                        </span>
                        {i < arr.length - 1 && (
                          <span
                            aria-hidden="true"
                            className="text-content-muted/50"
                          >
                            ·
                          </span>
                        )}
                      </span>
                    ))}
                </div>
              </>
            ) : (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-meta font-medium leading-relaxed text-content-muted">
                  Belum ada catatan suasana pada 14 hari terakhir — ketuk
                  suasana di atas, atau isi lembar check-in lengkap.
                </p>
                <button
                  type="button"
                  onClick={() => setScreen('profil')}
                  aria-label="Isi check-in hari ini di Profil"
                  className="interactive mt-2 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-module-accent/25 bg-module-accent-soft/60 px-3 text-eyebrow font-semibold text-module-accent-strong transition-colors hover:bg-module-accent-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Isi check-in hari ini
                  <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </section>

          </div>
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
