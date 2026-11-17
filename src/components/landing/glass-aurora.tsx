'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { animate, stagger } from 'animejs'
import { toast } from 'sonner'
import { ArrowRight, BarChart3, Bell, Check, Flame, Sparkles } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Counter, goToStyle } from './bits'

type Range = '7' | '30' | '90'

const RANGES: Record<
  Range,
  { bars: { label: string; h: number }[]; kpi: { streak: number; selesai: number; konsistensi: number } }
> = {
  '7': {
    bars: [
      { label: 'Sen', h: 45 },
      { label: 'Sel', h: 70 },
      { label: 'Rab', h: 55 },
      { label: 'Kam', h: 90 },
      { label: 'Jum', h: 62 },
      { label: 'Sab', h: 80 },
      { label: 'Min', h: 50 },
    ],
    kpi: { streak: 27, selesai: 21, konsistensi: 86 },
  },
  '30': {
    bars: [
      { label: 'Pekan 1', h: 52 },
      { label: 'Pekan 2', h: 66 },
      { label: 'Pekan 3', h: 71 },
      { label: 'Pekan 4', h: 47 },
      { label: 'Pekan 5', h: 84 },
      { label: 'Pekan 6', h: 58 },
      { label: 'Pekan 7', h: 90 },
      { label: 'Pekan 8', h: 73 },
      { label: 'Pekan 9', h: 56 },
      { label: 'Pekan 10', h: 79 },
    ],
    kpi: { streak: 27, selesai: 89, konsistensi: 82 },
  },
  '90': {
    bars: [
      { label: 'Bulan 1', h: 60 },
      { label: 'Bulan 2', h: 46 },
      { label: 'Bulan 3', h: 68 },
      { label: 'Bulan 4', h: 83 },
      { label: 'Bulan 5', h: 54 },
      { label: 'Bulan 6', h: 88 },
      { label: 'Bulan 7', h: 65 },
      { label: 'Bulan 8', h: 72 },
      { label: 'Bulan 9', h: 57 },
      { label: 'Bulan 10', h: 81 },
      { label: 'Bulan 11', h: 64 },
      { label: 'Bulan 12', h: 86 },
    ],
    kpi: { streak: 27, selesai: 261, konsistensi: 79 },
  },
}

/** Tooltip deterministik untuk tiap batang (tanpa Math.random). */
function barTitle(range: Range, label: string, h: number): string {
  if (range === '7') return `${label} — ${Math.max(1, Math.round(h / 24))}/4 kebiasaan`
  if (range === '30') return `${label} — ${Math.max(2, Math.round(h / 13))}/7 hari`
  return `${label} — ${Math.max(10, Math.round(h / 3))}/30 hari aktif`
}

type Habit = { id: number; name: string; time: string; done: boolean }
const INITIAL_HABITS: Habit[] = [
  { id: 1, name: 'Meditasi 10 menit', time: '06.30', done: true },
  { id: 2, name: 'Minum 8 gelas air', time: 'sepanjang hari', done: false },
  { id: 3, name: 'Baca 20 halaman', time: '21.00', done: false },
]

const FEATURES = [
  {
    icon: Bell,
    color: 'text-emerald-300',
    title: 'Pengingat pintar',
    desc: 'Notifikasi lembut di jam yang paling sering kamu berhasil — bukan yang paling berisik.',
  },
  {
    icon: Flame,
    color: 'text-amber-300',
    title: 'Streak & reward',
    desc: 'Rantai hari tak putus yang bikin ogah bolong. Kumpulkan apinya, jaga tetap menyala.',
  },
  {
    icon: BarChart3,
    color: 'text-rose-300',
    title: 'Statistik mendalam',
    desc: 'Pola mingguan, jam terbaik, dan tren konsistensi — semuanya jernih sekali lihat.',
  },
]

const ctaToast = () =>
  toast.info('Ini contoh gaya Glass & Aurora', {
    description: 'Di produksi, tombol ini membuka pendaftaran.',
  })

export default function GlassAurora() {
  const [range, setRange] = useState<Range>('7')
  const [habits, setHabits] = useState(INITIAL_HABITS)
  const barsRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const featuresInView = useInView(featuresRef, { once: true, margin: '-60px' })

  // Bar chart tumbuh dari bawah saat mount & tiap ganti tab (anime.js, revert saat cleanup)
  useEffect(() => {
    const root = barsRef.current
    if (!root) return
    const bars = root.querySelectorAll<HTMLElement>('[data-bar]')
    if (!bars.length) return
    const anim = animate(bars, {
      scaleY: [0.2, 1],
      duration: 520,
      delay: stagger(30),
      ease: 'outExpo',
    })
    return () => anim.revert()
  }, [range])

  // Kartu fitur masuk bergelombang saat masuk viewport
  useEffect(() => {
    if (!featuresInView || !featuresRef.current) return
    const anim = animate(Array.from(featuresRef.current.children) as HTMLElement[], {
      opacity: [0, 1],
      y: [24, 0],
      duration: 560,
      delay: stagger(90),
      ease: 'outExpo',
    })
    return () => anim.revert()
  }, [featuresInView])

  const doneCount = habits.filter((h) => h.done).length
  const kpi = RANGES[range].kpi

  const toggle = (id: number) => {
    const prev = habits
    const next = prev.map((h) => (h.id === id ? { ...h, done: !h.done } : h))
    setHabits(next)
    if (next.every((h) => h.done) && !prev.every((h) => h.done)) {
      toast.success('Semua target hari ini tercapai. Keren!')
    }
  }

  return (
    <section className="relative flex min-h-screen w-full flex-col overflow-hidden bg-stone-950 pb-0 pt-16 text-stone-100">
      {/* ===================== LATAR AURORA ===================== */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 size-[34rem] rounded-full bg-emerald-500/25 blur-[110px] will-change-transform"
        animate={{ x: [0, 40, -25, 0], y: [0, -35, 20, 0], scale: [1, 1.12, 0.96, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-48 -right-32 size-[30rem] rounded-full bg-rose-500/20 blur-[110px] will-change-transform"
        animate={{ x: [0, -35, 25, 0], y: [0, 30, -18, 0], scale: [1, 0.95, 1.1, 1] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-48 top-1/3 size-[36rem] rounded-full bg-amber-400/15 blur-[120px] will-change-transform"
        animate={{ x: [0, 30, -40, 0], y: [0, -24, 28, 0], scale: [1, 1.08, 0.94, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex w-full flex-1 flex-col">
        {/* ===================== NAV ===================== */}
        <motion.nav
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          aria-label="Navigasi utama"
          className="mx-auto mt-4 flex w-fit max-w-3xl items-center gap-4 rounded-full border border-white/15 bg-white/10 px-5 py-2.5 backdrop-blur-xl"
        >
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="flex items-center gap-2.5"
            aria-label="rutina — kembali ke atas"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-amber-300">
              <Flame className="size-4 text-white" />
            </span>
            <span className="text-base font-semibold tracking-tight">rutina</span>
          </a>
          <div className="hidden items-center gap-5 md:flex">
            {['Fitur', 'Statistik', 'Cerita'].map((l) => (
              <a
                key={l}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-sm text-white/70 transition-colors hover:text-white"
              >
                {l}
              </a>
            ))}
          </div>
          <button
            type="button"
            onClick={ctaToast}
            className="inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-semibold text-stone-950 transition-colors hover:bg-white/90"
          >
            Mulai gratis
          </button>
        </motion.nav>

        {/* ===================== HERO ===================== */}
        <div className="mx-auto w-full max-w-2xl px-4 pt-14 text-center">
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.45 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs text-white/70 backdrop-blur-xl"
          >
            <Sparkles className="size-3.5 text-amber-300" /> v2.0 — kini dengan aurora
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
          >
            Lacak kebiasaanmu,
            <span className="block bg-gradient-to-r from-emerald-300 to-amber-200 bg-clip-text text-transparent">
              jernih seperti kaca.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.5 }}
            className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/60 sm:text-base"
          >
            Kebiasaan, streak, dan statistikmu berdiri di atas kaca buram yang tenang — sekali
            lihat langsung paham.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.5 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <button
              type="button"
              onClick={ctaToast}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-stone-950 transition-colors hover:bg-white/90 sm:w-auto"
            >
              Mulai gratis <ArrowRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => goToStyle(2)}
              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-xl transition-colors hover:border-white/35 hover:bg-white/15 sm:w-auto"
            >
              Lihat demo
            </button>
          </motion.div>
        </div>

        {/* ===================== PANEL DASHBOARD ===================== */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.45, type: 'spring', stiffness: 110, damping: 18 }}
          className="mx-auto mt-12 w-full max-w-3xl px-4"
        >
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl sm:p-6">
            {/* Header + tab rentang */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Selamat pagi, Arun</h2>
                <p className="text-xs text-white/50">Senin, 16 Juni</p>
              </div>
              <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
                <TabsList className="h-9 border border-white/15 bg-white/10 backdrop-blur-xl">
                  {(['7', '30', '90'] as const).map((r) => (
                    <TabsTrigger
                      key={r}
                      value={r}
                      className="rounded-lg px-2.5 text-xs text-white/60 hover:text-white data-[state=active]:bg-white/20 data-[state=active]:text-white sm:px-3 sm:text-sm"
                    >
                      {r} Hari
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* KPI */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { label: 'Streak', value: kpi.streak, suffix: '' },
                { label: 'Selesai', value: kpi.selesai, suffix: '' },
                { label: 'Konsistensi', value: kpi.konsistensi, suffix: '%' },
              ].map((k) => (
                <div key={k.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-white/40 sm:text-[10px]">
                    {k.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums sm:text-2xl">
                    <Counter to={k.value} />
                    {k.suffix && <span className="text-xs sm:text-sm"> {k.suffix}</span>}
                  </p>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <div
              ref={barsRef}
              role="img"
              aria-label={`Grafik batang aktivitas ${range} hari terakhir`}
              className="mt-5 flex h-36 items-end gap-1.5 sm:gap-2.5"
            >
              {RANGES[range].bars.map((b, i) => (
                <span
                  key={`${range}-${i}`}
                  data-bar
                  title={barTitle(range, b.label, b.h)}
                  className="min-h-2 flex-1 cursor-pointer rounded-full bg-gradient-to-t from-emerald-400/80 to-amber-300/80 transition-[filter] hover:brightness-125"
                  style={{ height: `${b.h}%`, transform: 'scaleY(0.2)', transformOrigin: 'bottom' }}
                />
              ))}
            </div>

            {/* Progres target hari ini */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50">Target hari ini</span>
                <span className="font-semibold tabular-nums text-white/80">
                  {doneCount}/3 selesai
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(doneCount / 3) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 140, damping: 20 }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ===================== BARIS KEBIASAAN ===================== */}
        <div className="mx-auto mt-4 w-full max-w-3xl px-4">
          <div className="space-y-2.5">
            {habits.map((h) => (
              <motion.div
                key={h.id}
                whileHover={{ y: -2 }}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xl transition-colors hover:border-white/25"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={h.done}
                  aria-label={h.name}
                  onClick={() => toggle(h.id)}
                  className={`flex size-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors ${
                    h.done
                      ? 'border-emerald-300 bg-emerald-400'
                      : 'border-white/25 bg-white/10 hover:border-white/40'
                  }`}
                >
                  <AnimatePresence initial={false}>
                    {h.done && (
                      <motion.span
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        className="flex"
                      >
                        <Check className="size-4 text-stone-950" strokeWidth={3.5} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
                <p className="flex-1 text-sm font-medium">{h.name}</p>
                <p className="text-xs text-white/40">{h.time}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ===================== FITUR ===================== */}
        <div className="mx-auto mt-14 w-full max-w-5xl px-4 sm:px-6">
          <div ref={featuresRef} className="grid gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="opacity-0">
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="h-full rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl transition-colors hover:border-white/30"
                >
                  <span className="inline-flex rounded-xl border border-white/15 bg-white/10 p-2.5">
                    <f.icon className={`size-5 ${f.color}`} />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60">{f.desc}</p>
                </motion.div>
              </div>
            ))}
          </div>
        </div>

        {/* ===================== STATISTIK ===================== */}
        <div className="mx-auto mt-14 w-full max-w-3xl px-4">
          <div className="grid grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl">
            {[
              { value: 27, suffix: '', label: 'Hari streak' },
              { value: 82, suffix: '%', label: 'Konsistensi' },
              { value: 1248, suffix: '', label: 'Total check-in' },
            ].map((s) => (
              <div key={s.label} className="px-3 py-5 text-center">
                <p className="text-xl font-semibold tabular-nums sm:text-2xl">
                  <Counter to={s.value} />
                  {s.suffix}
                </p>
                <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.18em] text-white/40 sm:text-[10px]">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ===================== CTA ===================== */}
        <div className="mx-auto mb-14 mt-14 w-full max-w-2xl px-4">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-8 text-center backdrop-blur-xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Siap berkilau tiap hari?
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/60">
              Gratis 30 hari penuh — tanpa kartu kredit, tanpa drama.
            </p>
            <button
              type="button"
              onClick={ctaToast}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-stone-950 transition-colors hover:bg-white/90"
            >
              Mulai gratis <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

        {/* ===================== FOOTER ===================== */}
        <footer className="mt-auto border-t border-white/10 px-4 py-6 text-center text-xs text-white/40">
          © 2025 rutina — eksplorasi glassmorphism & aurora
        </footer>
      </div>
    </section>
  )
}
