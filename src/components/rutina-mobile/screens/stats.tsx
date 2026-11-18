'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import { animate, stagger } from 'animejs'
import {
  BatteryLow,
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
import Heatmap from '../heatmap'
import {
  HABIT_CAT_COLORS,
  MOODS,
  XP_PER_TASK,
  XP_TARGET,
  bestStreak,
  computeLevel,
  computeXp,
  dayCounts,
  habitsOn,
  isDoneOn,
  rateSeries,
  todayISO,
  useRutina,
  weekCounts,
  type Habit,
  type HabitCat,
} from '../store'
import TrendLine from '../trend-line'

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
const EASE = [0.22, 1, 0.36, 1] as const

/** Ikon suasana hati — padanan MOODS di store. */
const MOOD_ICONS: Record<string, typeof Laugh> = {
  Ceria: Laugh,
  Baik: Smile,
  Biasa: Meh,
  Lelah: BatteryLow,
}

/** Distribusi kategori kebiasaan aktif — dihitung dari data nyata. */
function categoryData(habits: Habit[]) {
  const counts = new Map<HabitCat, number>()
  for (const h of habits) {
    if (h.archived) continue
    counts.set(h.cat, (counts.get(h.cat) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([name, value]) => ({
    name,
    value,
    color: HABIT_CAT_COLORS[name],
  }))
}

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

export default function StatsScreen() {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const notes = useRutina((s) => s.notes)
  const mood = useRutina((s) => s.mood)
  const setMood = useRutina((s) => s.setMood)
  const bonusClaimed = useRutina((s) => s.bonusClaimed)

  const today = todayISO()

  const [period, setPeriod] = useState<'pekan' | 'bulan'>('pekan')

  const chartRef = useRef<HTMLDivElement>(null)
  const chartInView = useInView(chartRef, { once: true, margin: '-40px' })

  /* Misi hari ini — dari jadwal & histori penyelesaian nyata. */
  const todayHabits = habitsOn(habits, today)
  const doneCount = todayHabits.filter((h) =>
    isDoneOn(completions, today, h.id),
  ).length
  const totalToday = todayHabits.length

  const xp = computeXp(doneCount, bonusClaimed)
  const level = computeLevel(xp)
  const progress = Math.min(xp / XP_TARGET, 1)
  const remaining = Math.max(XP_TARGET - xp, 0)
  const pct = totalToday === 0 ? 0 : Math.round((doneCount / totalToday) * 100)

  /* Streak terbaik & rekor dari seluruh kebiasaan aktif. */
  const best = bestStreak(habits, completions, today)
  const activeHabits = habits.filter((h) => !h.archived)

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

  /* anime.js — batang grafik tumbuh saat terlihat & saat periode berganti */
  useEffect(() => {
    if (!chartInView || !chartRef.current) return
    const anim = animate(chartRef.current.querySelectorAll('[data-bar]'), {
      scaleY: [0, 1],
      delay: stagger(55),
      duration: 850,
      ease: 'outBack(1.3)',
    })
    return () => {
      anim.revert()
    }
  }, [chartInView, period])

  return (
    <TooltipProvider delayDuration={120}>
      <div className="h-full overflow-y-auto no-scrollbar px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-[#231F1E]">
        {/* Header pemain */}
        <header className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-matcha/40">
            <AvatarFallback className="bg-matcha text-[11px] font-bold tracking-widest text-parchment">
              AN
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold tracking-tight">
              Ananda
            </p>
            <p className="text-[11px] font-medium text-[#4A3B32]/75">
              Petualang Konsisten
            </p>
          </div>
          <span className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-[#4A3B32] px-3 text-[11px] font-bold text-[#A3C489] shadow-soft">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.2} />
            LV {level}
          </span>
        </header>

        {/* Ring XP interaktif */}
        <section
          className="mt-5 flex flex-col items-center"
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
              className="h-44 w-44 -rotate-90"
              role="img"
              aria-label={`Progres XP level ${level}: ${Math.round(progress * 100)} persen`}
            >
              <circle
                cx="100"
                cy="100"
                r={R}
                fill="none"
                stroke="#4A3B32"
                strokeOpacity="0.12"
                strokeWidth="13"
              />
              <motion.circle
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
                  <stop offset="0%" stopColor="#A3C489" />
                  <stop offset="100%" stopColor="#749B58" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#4A3B32]/70">
                Level
              </p>
              <p className="text-[44px] font-semibold leading-none tabular-nums text-[#231F1E]">
                {level}
              </p>
              <span className="mt-2.5 rounded-full bg-[#4A3B32] px-2.5 py-1 text-[11px] font-bold text-[#A3C489]">
                <Counter to={xp} /> XP
              </span>
            </div>
          </motion.div>

          <p className="mt-3 text-center text-[11px] font-medium text-[#4A3B32]/75">
            {level >= 8
              ? 'Level baru terbuka — lanjutkan petualanganmu'
              : `${remaining} XP lagi menuju Level ${level + 1}`}
          </p>
        </section>

        {/* Grafik misi selesai dengan pemilih periode (shadcn Tabs) */}
        <motion.section
          ref={chartRef}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-24px' }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-6 rounded-[16px] border border-[#4A3B3214] bg-[#4A3B32] p-5 shadow-card"
          aria-label="Grafik misi selesai"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/70">
                Misi Selesai
              </p>
              <p className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-[38px] font-semibold leading-none tracking-tight text-[#F5F3EE]">
                  <Counter to={chartTotal} />
                </span>
                <span className="text-sm font-medium text-[#F5F3EE]/70">
                  misi{period === 'pekan' ? ' / pekan' : ' / bulan'}
                </span>
              </p>
            </div>
            <Tabs
              value={period}
              onValueChange={(v) => setPeriod(v as 'pekan' | 'bulan')}
            >
              <TabsList className="h-8 rounded-full bg-[#231F1E] p-1">
                <TabsTrigger
                  value="pekan"
                  className="h-6 rounded-full px-3 text-[11px] font-bold data-[state=active]:bg-[#749B58] data-[state=active]:text-white"
                >
                  Pekan
                </TabsTrigger>
                <TabsTrigger
                  value="bulan"
                  className="h-6 rounded-full px-3 text-[11px] font-bold data-[state=active]:bg-[#749B58] data-[state=active]:text-white"
                >
                  Bulan
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div
            className="mt-5 flex items-end justify-between gap-2"
            role="img"
            aria-label={`Grafik batang misi selesai ${period === 'pekan' ? 'tujuh hari terakhir' : 'empat pekan terakhir'}`}
          >
            {chartData.map((d) => {
              const isPeak = d.value === chartMax && d.value > 0
              return (
                <div
                  key={d.label}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <div
                    data-bar
                    className={`w-full origin-bottom rounded-full ${
                      isPeak
                        ? 'bg-gradient-to-t from-[#749B58] to-[#A3C489]'
                        : 'bg-[#F5F3EE]/15'
                    }`}
                    style={{
                      height: `${
                        d.value === 0
                          ? 3
                          : Math.max(Math.round((d.value / chartMax) * 84), 6)
                      }px`,
                    }}
                  />
                  <span
                    className={`text-[10px] font-bold ${
                      isPeak ? 'text-[#A3C489]' : 'text-[#F5F3EE]/70'
                    }`}
                  >
                    {d.label}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[11px] font-medium text-[#F5F3EE]/70">
            {period === 'pekan'
              ? peak.value === 0
                ? 'Belum ada misi selesai pada tujuh hari terakhir.'
                : `Puncak ${peak.value} misi ada di hari ${peak.label}.`
              : p4 > p3
                ? `Pekan berjalan naik ${p4 - p3} misi dibanding pekan lalu.`
                : p4 < p3
                  ? `Pekan berjalan turun ${p3 - p4} misi dibanding pekan lalu.`
                  : 'Pekan berjalan setara dengan pekan lalu.'}
          </p>
        </motion.section>

        {/* Ringkasan pekan */}
        <section className="mt-6" aria-label="Ringkasan pekan">
          <SectionTitle title="Ringkasan Pekan" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {/* Suasana hati */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ duration: 0.5, ease: EASE }}
              className="rounded-[16px] border border-[#4A3B3214] bg-[#4A3B32] p-4 shadow-soft"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/70">
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
                        'flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A3C489] ' +
                        (selected
                          ? 'animate-pop border-[#749B58] bg-[#749B58] text-white'
                          : 'border-[#F5F3EE]/15 bg-[#231F1E] text-[#F5F3EE]/75 hover:bg-[#2A2422]')
                      }
                    >
                      <MoodIcon className="h-4 w-4" />
                      <span className="text-[11px] font-bold">{m}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-3 text-[11px] font-medium text-[#F5F3EE]/70">
                {mood
                  ? `Kamu merasa ${mood.toLowerCase()} hari ini`
                  : 'Bagaimana perasaanmu?'}
              </p>
            </motion.div>

            {/* Streak terpanjang */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ duration: 0.5, delay: 0.06, ease: EASE }}
              className="flex flex-col rounded-[16px] border border-[#4A3B3214] bg-[#4A3B32] p-4 shadow-soft"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/70">
                Streak Terpanjang
              </p>
              <div className="mt-2 flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-baseline gap-1">
                    <span className="text-[44px] font-semibold leading-none tracking-tight text-[#A3C489]">
                      <Counter to={best.streak} />
                    </span>
                    <span className="text-sm font-medium text-[#F5F3EE]/70">
                      hari
                    </span>
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-[#F5F3EE]/70">
                    {best.habit
                      ? best.habit.title
                      : 'Belum ada kebiasaan berjalan'}
                  </p>
                </div>
                <motion.span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#749B58]/20"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Flame className="h-5 w-5 text-[#A3C489]" />
                </motion.span>
              </div>
              <p className="mt-auto pt-3 text-[11px] font-medium text-[#F5F3EE]/70">
                Rekor pribadi: {best.record} hari
              </p>
            </motion.div>

            {/* Ring penyelesaian misi */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
              className="col-span-2 flex items-center gap-5 rounded-[16px] border border-[#4A3B3214] bg-[#4A3B32] p-5 shadow-soft sm:col-span-1"
            >
              <div className="relative h-24 w-24 shrink-0">
                <svg
                  viewBox="0 0 96 96"
                  className="h-24 w-24 -rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    fill="none"
                    stroke="#231F1E"
                    strokeWidth="9"
                  />
                  <motion.circle
                    cx="48"
                    cy="48"
                    r="42"
                    fill="none"
                    stroke="#A3C489"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 42}
                    initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                    whileInView={{
                      strokeDashoffset: 2 * Math.PI * 42 * (1 - pct / 100),
                    }}
                    viewport={{ once: true, margin: '-24px' }}
                    transition={{ duration: 0.9, ease: EASE }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-semibold text-[#F5F3EE]">
                    <Counter to={pct} />%
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#F5F3EE]/70">
                    misi
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/70">
                  Misi Selesai
                </p>
                <p className="mt-1 text-[14px] font-medium text-[#F5F3EE]">
                  {doneCount} dari {totalToday} misi hari ini
                </p>
                <p className="mt-2 text-xs font-medium text-[#F5F3EE]/70">
                  Tiap misi bernilai {XP_PER_TASK} XP — terus jaga ritmenya.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== Dashboard Wawasan & Analitik ===== */}
        <section className="mt-6" aria-label="Wawasan dan analitik">
          <SectionTitle title="Wawasan & Analitik" hint="30 hari terakhir" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Donut distribusi kategori */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ duration: 0.5, ease: EASE }}
              className="rounded-[16px] border border-[#4A3B3214] bg-[#4A3B32] p-5 shadow-soft"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/70">
                Distribusi Kategori
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
                    <span className="text-[20px] font-semibold leading-none tabular-nums text-[#F5F3EE]">
                      {activeHabits.length}
                    </span>
                    <span className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#F5F3EE]/70">
                      aktif
                    </span>
                  </div>
                </div>
                <ul className="min-w-0 flex-1 space-y-2">
                  {catData.map((c) => (
                    <li
                      key={c.name}
                      className="flex items-center gap-2.5 text-[12px]"
                    >
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="flex-1 truncate font-medium text-[#F5F3EE]/80">
                        {c.name}
                      </span>
                      <span className="shrink-0 font-bold tabular-nums text-[#F5F3EE]">
                        {c.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Grafik area tren penyelesaian */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ duration: 0.5, delay: 0.06, ease: EASE }}
              className="rounded-[16px] border border-[#4A3B3214] bg-[#4A3B32] p-5 shadow-soft"
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/70">
                    Tren Penyelesaian
                  </p>
                  <p className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-[38px] font-semibold leading-none tracking-tight text-[#F5F3EE]">
                      <Counter to={trendAvg} decimals={1} />
                    </span>
                    <span className="text-sm font-medium text-[#F5F3EE]/70">
                      % rata-rata / hari
                    </span>
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#749B58]/20 px-2.5 py-1 text-[11px] font-bold text-[#A3C489]">
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
                          stopColor="#A3C489"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="#A3C489"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="d"
                      tick={{ fill: 'rgba(245,243,238,0.55)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval={7}
                      tickFormatter={(v: number) => `${v}`}
                    />
                    <YAxis hide domain={[0, 100]} />
                    <RechartsTooltip
                      cursor={{ stroke: 'rgba(245,243,238,0.2)' }}
                      contentStyle={{
                        background: '#231F1E',
                        border: '1px solid rgba(245,243,238,0.12)',
                        borderRadius: 12,
                        fontSize: 11,
                        color: '#F5F3EE',
                      }}
                      labelFormatter={(v) => `Hari ke-${v}`}
                      formatter={(value) => [`${value}%`, 'Selesai']}
                    />
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="#A3C489"
                      strokeWidth={2.5}
                      fill="url(#trendFillDark)"
                      isAnimationActive
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-[11px] font-medium text-[#F5F3EE]/70">
                Konsistensi di atas 70% pada {above70} dari 30 hari terakhir.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Konsistensi & tren aktivitas (widget gelap) */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Heatmap />
          <TrendLine />
        </div>

        {/* Lencana dengan Tooltip */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-24px' }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-3"
          aria-label="Piala dan lencana"
        >
          <SectionTitle
            title="Piala & Lencana"
            hint={`${unlockedCount}/4 terbuka`}
          />
          <div className="grid grid-cols-2 gap-2.5">
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
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-2xl border border-[#4A3B3214] bg-[#4A3B32] p-3 text-left shadow-soft transition-transform duration-200 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A3C489]"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                        b.unlocked
                          ? 'border-[#749B58]/45 bg-[#749B58]/20 text-[#A3C489]'
                          : 'border-[#F5F3EE]/10 bg-[#231F1E] text-[#F5F3EE]/30'
                      }`}
                    >
                      <b.icon className="h-5 w-5" strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block truncate text-[12px] font-bold ${
                          b.unlocked
                            ? 'text-[#F5F3EE]'
                            : 'text-[#F5F3EE]/50'
                        }`}
                      >
                        {b.name}
                      </span>
                      <span
                        className={`mt-0.5 block text-[11px] font-medium leading-snug ${
                          b.unlocked
                            ? 'text-[#F5F3EE]/70'
                            : 'text-[#F5F3EE]/45'
                        }`}
                      >
                        {b.desc}
                      </span>
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="rounded-xl border-[#F5F3EE]/10 bg-[#FAF9F6] px-3 py-2 text-[11px] font-medium text-[#231F1E]"
                >
                  <p className="font-bold">{b.name}</p>
                  <p className="mt-0.5 text-[#4A3B32]/75">{b.desc}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </motion.section>

        {/* Streak berjalan */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-24px' }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-3"
          aria-label="Streak berjalan"
        >
          <div className="flex items-center gap-4 rounded-[20px] border border-[#4A3B3214] bg-[#4A3B32] p-4 shadow-soft">
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
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5F3EE]/70">
                Streak Berjalan
              </p>
              <p className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-[26px] font-semibold leading-none tabular-nums text-[#F5F3EE]">
                  <Counter to={best.streak} />
                </span>
                <span className="text-xs font-medium text-[#F5F3EE]/70">
                  hari berturut-turut
                </span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/70">
                Rekor
              </p>
              <p className="flex items-center gap-1 text-sm font-bold text-[#A3C489]">
                <TrendingUp className="h-3.5 w-3.5" />
                {best.record} hari
              </p>
            </div>
          </div>
        </motion.section>
      </div>
    </TooltipProvider>
  )
}
