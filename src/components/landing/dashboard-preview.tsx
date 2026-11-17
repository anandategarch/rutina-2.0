'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { animate, stagger, utils } from 'animejs'
import { toast } from 'sonner'
import {
  BarChart3,
  BookOpen,
  Check,
  Dumbbell,
  Flame,
  Home,
  ListChecks,
  Lock,
  Moon,
  RotateCcw,
  Settings,
  Sparkles,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Counter } from './bits'

const BARS = [
  { d: 'Sen', h: 72 },
  { d: 'Sel', h: 58 },
  { d: 'Rab', h: 90 },
  { d: 'Kam', h: 64 },
  { d: 'Jum', h: 84 },
  { d: 'Sab', h: 40 },
  { d: 'Min', h: 96 },
]

const HEAT = Array.from(
  { length: 84 },
  (_, i) => ((i * 13 + 5) % 7 === 0 ? 0 : ((i * 13 + 5) % 3) + 1),
)
const HEAT_COLORS = [
  'bg-zinc-800/70',
  'bg-emerald-500/25',
  'bg-emerald-500/55',
  'bg-emerald-500/90',
]

type Habit = {
  id: number
  name: string
  icon: typeof Sparkles
  time: string
  done: boolean
}
const INITIAL: Habit[] = [
  { id: 1, name: 'Meditasi 10 menit', icon: Sparkles, time: '06.30', done: true },
  { id: 2, name: 'Olahraga 30 menit', icon: Dumbbell, time: '07.00', done: true },
  { id: 3, name: 'Baca 20 halaman', icon: BookOpen, time: '21.00', done: false },
  { id: 4, name: 'Tidur sebelum 23.00', icon: Moon, time: '23.00', done: false },
]

/** Ledakan konfeti imperatif memakai anime.js (dipanggil saat semua kebiasaan selesai). */
function burstConfetti(host: HTMLElement) {
  const colors = ['#f97316', '#fbbf24', '#34d399', '#fb7185', '#a3e635']
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('span')
    p.style.cssText = `position:absolute;left:50%;top:42%;width:7px;height:10px;border-radius:2px;background:${
      colors[i % colors.length]
    };pointer-events:none;z-index:60;`
    host.appendChild(p)
    animate(p, {
      x: utils.random(-240, 240),
      y: utils.random(-220, 70),
      rotate: utils.random(-200, 200),
      scale: [1, 0.4],
      opacity: [1, 1, 0],
      duration: 850 + utils.random(0, 450),
      delay: (i % 5) * 16,
      ease: 'outCubic',
      onComplete: () => p.remove(),
    })
  }
}

function Dashboard() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [habits, setHabits] = useState(INITIAL)

  // Koreografi masuk: fade -> baris -> bar chart -> heatmap (anime.js)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const anims: ReturnType<typeof animate>[] = []

    root.querySelectorAll<HTMLElement>('[data-dp="fade"]').forEach((el, i) => {
      anims.push(
        animate(el, {
          opacity: [0, 1],
          y: [16, 0],
          duration: 460,
          delay: 120 + i * 80,
          ease: 'outCubic',
        }),
      )
    })
    root.querySelectorAll<HTMLElement>('[data-dp="row"]').forEach((el, i) => {
      anims.push(
        animate(el, {
          opacity: [0, 1],
          x: [-18, 0],
          duration: 440,
          delay: 480 + i * 90,
          ease: 'outCubic',
        }),
      )
    })
    root.querySelectorAll<HTMLElement>('[data-dp="bar"]').forEach((el, i) => {
      anims.push(
        animate(el, {
          height: ['0%', `${BARS[i].h}%`],
          duration: 760,
          delay: 620 + i * 80,
          ease: 'outQuart',
        }),
      )
    })

    let heatAnim: ReturnType<typeof animate> | null = null
    const heatTimer = setTimeout(() => {
      if (!rootRef.current) return
      heatAnim = animate(rootRef.current.querySelectorAll('[data-dp="heat"]'), {
        opacity: [0, 1],
        scale: [0.3, 1],
        duration: 320,
        delay: stagger(6, { from: 'center' }),
        ease: 'outCubic',
      })
    }, 850)

    return () => {
      clearTimeout(heatTimer)
      heatAnim?.revert()
      anims.forEach((a) => a.revert())
    }
  }, [])

  const doneCount = habits.filter((h) => h.done).length
  const sorted = [...habits].sort((a, b) => Number(a.done) - Number(b.done))

  const toggle = (id: number) => {
    const prev = habits
    const next = prev.map((h) => (h.id === id ? { ...h, done: !h.done } : h))
    setHabits(next)
    if (next.every((h) => h.done) && !prev.every((h) => h.done)) {
      if (rootRef.current) burstConfetti(rootRef.current)
      toast.success('Semua kebiasaan selesai!', {
        description: 'Streak hari ini aman. Besok lagi ya.',
      })
    }
  }

  const stats = [
    {
      icon: Flame,
      color: 'text-orange-400',
      box: 'bg-orange-500/10',
      value: <Counter to={12} />,
      unit: 'hari',
      sub: 'streak saat ini',
      trend: '+3 minggu ini',
    },
    {
      icon: Check,
      color: 'text-emerald-400',
      box: 'bg-emerald-500/10',
      value: (
        <span className="tabular-nums">
          {doneCount}/{habits.length}
        </span>
      ),
      unit: 'selesai',
      sub: 'hari ini',
      trend: 'sesuai rencana',
    },
    {
      icon: Timer,
      color: 'text-amber-400',
      box: 'bg-amber-500/10',
      value: <Counter to={45} />,
      unit: 'menit',
      sub: 'total fokus',
      trend: '+10 dr minggu lalu',
    },
    {
      icon: TrendingUp,
      color: 'text-rose-400',
      box: 'bg-rose-500/10',
      value: <Counter to={86} />,
      unit: '%',
      sub: 'rasio minggu ini',
      trend: '+12%',
    },
  ]

  return (
    <div
      ref={rootRef}
      className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 text-left shadow-2xl shadow-black/50"
    >
      {/* Chrome browser */}
      <div className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-rose-400/80" />
          <span className="h-3 w-3 rounded-full bg-amber-400/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
        </div>
        <div className="mx-auto flex h-7 w-full max-w-xs items-center justify-center gap-1.5 rounded-md bg-zinc-800/70 text-[11px] text-zinc-400">
          <Lock className="h-3 w-3" /> rutina.app/beranda
        </div>
        <div className="hidden w-[52px] sm:block" />
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          data-dp="fade"
          className="hidden w-52 shrink-0 flex-col justify-between border-r border-zinc-800 p-4 opacity-0 lg:flex"
        >
          <div>
            <div className="flex items-center gap-2 px-2 pb-5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-400">
                <Check className="h-3.5 w-3.5 text-zinc-950" />
              </div>
              <span className="text-sm font-semibold text-zinc-100">rutina</span>
            </div>
            <nav className="space-y-1">
              {[
                { icon: Home, label: 'Beranda', active: true },
                { icon: BarChart3, label: 'Statistik', active: false },
                { icon: ListChecks, label: 'Kebiasaan', active: false },
                { icon: Settings, label: 'Pengaturan', active: false },
              ].map((item) => (
                <span
                  key={item.label}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium ${
                    item.active
                      ? 'bg-zinc-800 text-white'
                      : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-200'
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" /> {item.label}
                </span>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900 p-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-[10px] font-bold text-zinc-950">
              AR
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-zinc-100">Ana Rahma</p>
              <p className="text-[10px] text-zinc-500">Pengguna Pro</p>
            </div>
          </div>
        </aside>

        {/* Konten utama */}
        <div className="min-w-0 flex-1 space-y-5 bg-zinc-950/60 p-4 sm:p-6">
          {/* Header */}
          <div
            data-dp="fade"
            className="flex items-center justify-between gap-3 opacity-0"
          >
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                Selasa, 4 Juni
              </p>
              <h3 className="mt-1 text-lg font-semibold text-zinc-100 sm:text-xl">
                Selamat pagi, Ana.
              </h3>
            </div>
            <Badge
              variant="outline"
              className="rounded-full border-orange-500/30 bg-orange-500/10 text-orange-400"
            >
              <Flame className="mr-1 h-3 w-3" /> Streak 12 hari
            </Badge>
          </div>

          {/* Statistik */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.sub}
                data-dp="fade"
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3.5 opacity-0 sm:p-4"
              >
                <div className="flex items-center justify-between">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.box}`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-400">{s.trend}</span>
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-zinc-100">
                  {s.value}
                  <span className="ml-1 text-xs font-normal text-zinc-500">{s.unit}</span>
                </p>
                <p className="text-[10px] text-zinc-500">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Grid konten */}
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            {/* Kebiasaan hari ini */}
            <div
              data-dp="fade"
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 opacity-0 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Kebiasaan hari ini</p>
                  <p className="text-[10px] text-zinc-500">Klik untuk menandai selesai</p>
                </div>
                <span className="text-xs font-semibold tabular-nums text-zinc-400">
                  {doneCount}/{habits.length}
                </span>
              </div>
              <div className="mt-4">
                <Progress
                  value={(doneCount / habits.length) * 100}
                  className="h-1.5 bg-zinc-800 [&>div]:bg-gradient-to-r [&>div]:from-orange-500 [&>div]:to-amber-400"
                />
              </div>
              <div className="mt-4 space-y-2.5">
                {sorted.map((h) => (
                  <div key={h.id} data-dp="row" className="opacity-0">
                    <motion.button
                      layout
                      type="button"
                      onClick={() => toggle(h.id)}
                      aria-pressed={h.done}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                        h.done
                          ? 'border-emerald-500/30 bg-emerald-500/10'
                          : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          h.done ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {h.done ? <Check className="h-4 w-4" /> : <h.icon className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm font-medium ${
                            h.done ? 'text-zinc-500 line-through' : 'text-zinc-100'
                          }`}
                        >
                          {h.name}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {h.time} · setiap hari
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider ${
                          h.done ? 'text-emerald-400' : 'text-zinc-600'
                        }`}
                      >
                        {h.done ? 'Selesai' : 'Tandai'}
                      </span>
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>

            {/* Kolom kanan */}
            <div className="space-y-5">
              {/* Bar chart */}
              <div
                data-dp="fade"
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 opacity-0 sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">Aktivitas minggu ini</p>
                    <p className="text-[10px] text-zinc-500">Persentase check-in harian</p>
                  </div>
                  <Badge className="border-0 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15">
                    +12%
                  </Badge>
                </div>
                <div className="mt-4">
                  <div className="flex h-24 items-end gap-1.5 sm:gap-2">
                    {BARS.map((b, i) => (
                      <div key={b.d} className="flex h-full flex-1 items-end">
                        <div
                          data-dp="bar"
                          style={{ height: 0 }}
                          className={`w-full rounded-t-md ${
                            i === BARS.length - 1
                              ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                              : 'bg-gradient-to-t from-orange-600 to-amber-400'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-1.5 sm:gap-2">
                    {BARS.map((b) => (
                      <span
                        key={b.d}
                        className="flex-1 text-center text-[9px] font-medium uppercase tracking-wide text-zinc-600"
                      >
                        {b.d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Heatmap */}
              <div
                data-dp="fade"
                className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 opacity-0 sm:p-5"
              >
                <p className="text-sm font-semibold text-zinc-100">Riwayat 12 minggu</p>
                <p className="text-[10px] text-zinc-500">Setiap titik adalah satu hari</p>
                <div className="mt-4 grid grid-flow-col grid-rows-7 gap-[3px]">
                  {HEAT.map((lvl, i) => (
                    <span
                      key={i}
                      data-dp="heat"
                      className={`h-2 w-2 rounded-[3px] opacity-0 ${HEAT_COLORS[lvl]}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPreview() {
  const [run, setRun] = useState(0)

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-zinc-950 px-4 py-24 sm:px-6">
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <Badge
            variant="outline"
            className="rounded-full border-zinc-700 bg-zinc-900 text-zinc-300"
          >
            Demo interaktif
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            Jangan cuma baca fiturnya. <span className="text-orange-400">Cobain</span>{' '}
            langsung.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 sm:text-lg">
            Dasbor di bawah ini hidup — centang kebiasaannya, lihat progres dan grafiknya
            bereaksi.
          </p>
        </div>

        <motion.div
          key={run}
          initial={{ opacity: 0, y: 28, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          className="mt-10"
        >
          <Dashboard />
        </motion.div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRun((r) => r + 1)}
            className="h-9 rounded-full border-zinc-700 bg-zinc-900 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Putar ulang demo
          </Button>
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-600">
            Coba centang semua kebiasaan — ada kejutan kecil
          </p>
        </div>
      </div>
    </section>
  )
}
