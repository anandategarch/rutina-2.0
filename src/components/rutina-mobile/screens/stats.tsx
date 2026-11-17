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
  Smile,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Zap,
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
  computeLevel,
  computeXp,
  DAYS,
  FOCUS,
  FOCUS_MONTH,
  MOODS,
  useRutina,
  XP_PER_TASK,
  XP_TARGET,
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

/** Lencana pencapaian — dengan Tooltip shadcn. */
const BADGES: {
  icon: LucideIcon
  name: string
  desc: string
  unlocked: boolean
}[] = [
  {
    icon: Trophy,
    name: 'Pagi Sempurna',
    desc: 'Selesaikan semua misi sebelum jam 9 pagi.',
    unlocked: true,
  },
  {
    icon: Zap,
    name: 'Speed Run',
    desc: 'Tuntaskan tiga misi dalam satu jam.',
    unlocked: true,
  },
  {
    icon: Flame,
    name: 'Api 30 Hari',
    desc: 'Jaga streak 30 hari tanpa putus.',
    unlocked: false,
  },
  {
    icon: Medal,
    name: 'Kolektor',
    desc: 'Kumpulkan 100 catatan di jurnal.',
    unlocked: false,
  },
]

/** Ikon suasana hati — padanan MOODS di store. */
const MOOD_ICONS: Record<string, typeof Laugh> = {
  Ceria: Laugh,
  Baik: Smile,
  Biasa: Meh,
  Lelah: BatteryLow,
}

/* ===== Data analitik (deterministik, aman SSR) ===== */

/** Distribusi kategori misi — dihitung dari daftar tugas. */
function categoryData(tasks: { cat?: string }[]) {
  const counts = new Map<string, number>()
  for (const t of tasks) {
    const key = t.cat ?? 'Kebiasaan'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const colors: Record<string, string> = {
    Kebiasaan: '#A3C489',
    Kerja: '#749B58',
    Kesehatan: '#D98E6B',
    Pribadi: '#8C7B6B',
  }
  return Array.from(counts.entries()).map(([name, value]) => ({
    name,
    value,
    color: colors[name] ?? '#A3C489',
  }))
}

/** Tren penyelesaian 30 hari — deterministik. */
const TREND_30D = Array.from({ length: 30 }, (_, i) => ({
  d: i + 1,
  v: 40 + ((i * 13) % 5) * 15,
}))
const TREND_AVG = Math.round(
  TREND_30D.reduce((a, b) => a + b.v, 0) / TREND_30D.length,
)

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#F5F3EE]/85">
        {title}
      </h2>
      {hint ? (
        <span className="text-xs font-medium text-[#F5F3EE]/55">{hint}</span>
      ) : null}
    </div>
  )
}

export default function StatsScreen() {
  const tasks = useRutina((s) => s.tasks)
  const mood = useRutina((s) => s.mood)
  const setMood = useRutina((s) => s.setMood)
  const bonusClaimed = useRutina((s) => s.bonusClaimed)

  const [period, setPeriod] = useState<'pekan' | 'bulan'>('pekan')

  const chartRef = useRef<HTMLDivElement>(null)
  const chartInView = useInView(chartRef, { once: true, margin: '-40px' })

  const doneCount = tasks.filter((t) => t.done).length
  const xp = computeXp(doneCount, bonusClaimed)
  const level = computeLevel(xp)
  const progress = Math.min(xp / XP_TARGET, 1)
  const remaining = Math.max(XP_TARGET - xp, 0)
  const pct = Math.round((doneCount / tasks.length) * 100)

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

  const chartData =
    period === 'pekan'
      ? FOCUS.map((f, i) => ({ label: DAYS[i], value: f }))
      : FOCUS_MONTH.map((w) => ({ label: w.label, value: w.value }))
  const chartMax = Math.max(...chartData.map((d) => d.value))
  const chartTotal = chartData.reduce((a, b) => a + b.value, 0)

  return (
    <TooltipProvider delayDuration={120}>
      <div className="h-full overflow-y-auto no-scrollbar px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-[#F5F3EE]">
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
            <p className="text-[11px] font-medium text-[#F5F3EE]/55">
              Petualang Konsisten
            </p>
          </div>
          <span className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#F5F3EE]/15 bg-[#4A3B32] px-3 text-[11px] font-bold text-[#A3C489]">
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
                stroke="#F5F3EE"
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
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#F5F3EE]/55">
                Level
              </p>
              <p className="text-[44px] font-semibold leading-none tabular-nums">
                {level}
              </p>
              <span className="mt-2.5 rounded-full bg-[#4A3B32] px-2.5 py-1 text-[11px] font-bold text-[#A3C489]">
                <Counter to={xp} /> XP
              </span>
            </div>

            {/* Kilau dekoratif di sekitar ring */}
            <motion.span
              aria-hidden="true"
              className="absolute -right-1 top-4 text-[#A3C489]"
              animate={{ scale: [1, 1.28, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="h-4 w-4" />
            </motion.span>
            <motion.span
              aria-hidden="true"
              className="absolute -left-1.5 bottom-7 text-[#A3C489]/80"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{
                duration: 2.9,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.5,
              }}
            >
              <Star className="h-3.5 w-3.5" />
            </motion.span>
          </motion.div>

          <p className="mt-3 text-center text-[11px] font-medium text-[#F5F3EE]/60">
            {level >= 8
              ? 'Level baru terbuka — lanjutkan petualanganmu'
              : `${remaining} XP lagi menuju Level ${level + 1}`}
          </p>
        </section>

        {/* Grafik fokus dengan pemilih periode (shadcn Tabs) */}
        <motion.section
          ref={chartRef}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-24px' }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-6 rounded-[16px] border border-[#F5F3EE]/10 bg-[#4A3B32] p-5"
          aria-label="Grafik waktu fokus"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/60">
                Waktu Fokus
              </p>
              <p className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-[38px] font-semibold leading-none tracking-tight text-[#F5F3EE]">
                  <Counter
                    to={Number(chartTotal.toFixed(1))}
                    decimals={1}
                  />
                </span>
                <span className="text-sm font-medium text-[#F5F3EE]/55">
                  jam{period === 'pekan' ? ' / pekan' : ' / bulan'}
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
            aria-label={`Grafik batang waktu fokus ${period === 'pekan' ? 'tujuh hari terakhir' : 'empat pekan terakhir'}`}
          >
            {chartData.map((d, i) => {
              const isPeak = d.value === chartMax
              return (
                <div
                  key={d.label}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <div
                    data-bar
                    className={`w-full origin-bottom rounded-full ${
                      isPeak ? 'bg-gradient-to-t from-[#749B58] to-[#A3C489]' : 'bg-[#F5F3EE]/15'
                    }`}
                    style={{
                      height: `${Math.round((d.value / chartMax) * 84)}px`,
                    }}
                  />
                  <span
                    className={`text-[10px] font-bold ${
                      isPeak ? 'text-[#A3C489]' : 'text-[#F5F3EE]/50'
                    }`}
                  >
                    {d.label}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-[11px] font-medium text-[#F5F3EE]/60">
            {period === 'pekan'
              ? `Puncak fokus ${chartMax.toLocaleString('id-ID')} jam ada di hari ${chartData.find((d) => d.value === chartMax)?.label}.`
              : 'Tren fokus naik empat pekan berturut-turut.'}
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
              className="rounded-[16px] border border-[#F5F3EE]/10 bg-[#4A3B32] p-4"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/60">
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
              <p className="mt-3 text-[11px] font-medium text-[#F5F3EE]/60">
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
              className="flex flex-col rounded-[16px] border border-[#F5F3EE]/10 bg-[#4A3B32] p-4"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/60">
                Streak Terpanjang
              </p>
              <div className="mt-2 flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-baseline gap-1">
                    <span className="text-[44px] font-semibold leading-none tracking-tight text-[#A3C489]">
                      <Counter to={21} />
                    </span>
                    <span className="text-sm font-medium text-[#F5F3EE]/55">hari</span>
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-[#F5F3EE]/60">
                    Belajar kosakata baru
                  </p>
                </div>
                <motion.span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#749B58]/20"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Flame className="h-5 w-5 text-[#A3C489]" />
                </motion.span>
              </div>
              <p className="mt-auto pt-3 text-[11px] font-medium text-[#F5F3EE]/60">
                Rekor pribadi: 34 hari
              </p>
            </motion.div>

            {/* Ring penyelesaian misi */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px' }}
              transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
              className="col-span-2 flex items-center gap-5 rounded-[16px] border border-[#F5F3EE]/10 bg-[#4A3B32] p-5 sm:col-span-1"
            >
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 96 96" className="h-24 w-24 -rotate-90" aria-hidden="true">
                  <circle cx="48" cy="48" r="42" fill="none" stroke="#231F1E" strokeWidth="9" />
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
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#F5F3EE]/55">
                    misi
                  </span>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/60">
                  Misi Selesai
                </p>
                <p className="mt-1 text-[14px] font-medium text-[#F5F3EE]">
                  {doneCount} dari {tasks.length} misi hari ini
                </p>
                <p className="mt-2 text-xs font-medium text-[#F5F3EE]/60">
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
              className="rounded-[16px] border border-[#F5F3EE]/10 bg-[#4A3B32] p-5"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/60">
                Distribusi Kategori
              </p>
              <div className="mt-3 flex items-center gap-4">
                <div className="relative h-28 w-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData(tasks)}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={34}
                        outerRadius={52}
                        paddingAngle={3}
                        stroke="none"
                        isAnimationActive
                      >
                        {categoryData(tasks).map((c) => (
                          <Cell key={c.name} fill={c.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[20px] font-semibold leading-none tabular-nums text-[#F5F3EE]">
                      {tasks.length}
                    </span>
                    <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-[#F5F3EE]/55">
                      misi
                    </span>
                  </div>
                </div>
                <ul className="min-w-0 flex-1 space-y-2">
                  {categoryData(tasks).map((c) => (
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
              className="rounded-[16px] border border-[#F5F3EE]/10 bg-[#4A3B32] p-5"
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/60">
                    Tren Penyelesaian
                  </p>
                  <p className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-[38px] font-semibold leading-none tracking-tight text-[#F5F3EE]">
                      <Counter to={TREND_AVG} />
                    </span>
                    <span className="text-sm font-medium text-[#F5F3EE]/55">
                      % rata-rata / hari
                    </span>
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#749B58]/20 px-2.5 py-1 text-[11px] font-bold text-[#A3C489]">
                  <TrendingUp className="h-3.5 w-3.5" />
                  stabil
                </span>
              </div>
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart
                    data={TREND_30D}
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
                      tick={{ fill: 'rgba(245,243,238,0.45)', fontSize: 10 }}
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
              <p className="mt-2 text-[11px] font-medium text-[#F5F3EE]/55">
                Konsistensi di atas 70% pada 22 dari 30 hari terakhir.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Konsistensi & tren fokus (widget gelap) */}
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
          <SectionTitle title="Piala & Lencana" hint="2/4 terbuka" />
          <div className="grid grid-cols-4 gap-2.5">
            {BADGES.map((b) => (
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
                    className="flex cursor-pointer flex-col items-center rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A3C489]"
                  >
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-full border transition-transform duration-200 hover:scale-105 ${
                        b.unlocked
                          ? 'border-[#749B58]/45 bg-[#749B58]/20 text-[#A3C489]'
                          : 'border-[#F5F3EE]/10 bg-[#231F1E] text-[#F5F3EE]/30'
                      }`}
                    >
                      <b.icon className="h-5 w-5" strokeWidth={1.9} />
                    </span>
                    <span
                      className={`mt-1.5 w-full truncate text-center text-[9px] font-bold ${
                        b.unlocked ? 'text-[#F5F3EE]/80' : 'text-[#F5F3EE]/40'
                      }`}
                    >
                      {b.name}
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
          <div className="flex items-center gap-4 rounded-[20px] border border-[#F5F3EE]/10 bg-[#4A3B32] p-4">
            <motion.span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#749B58]/20"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Flame className="h-6 w-6 text-[#A3C489]" />
            </motion.span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5F3EE]/50">
                Streak Berjalan
              </p>
              <p className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-[26px] font-semibold leading-none tabular-nums">
                  21
                </span>
                <span className="text-xs font-medium text-[#F5F3EE]/60">
                  hari berturut-turut
                </span>
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#F5F3EE]/45">
                Rekor
              </p>
              <p className="flex items-center gap-1 text-sm font-bold text-[#A3C489]">
                <TrendingUp className="h-3.5 w-3.5" />
                30 hari
              </p>
            </div>
          </div>
        </motion.section>
      </div>
    </TooltipProvider>
  )
}
