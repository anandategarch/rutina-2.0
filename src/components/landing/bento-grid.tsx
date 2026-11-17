'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import { animate, stagger } from 'animejs'
import { ArrowRight, Bell, Flame, Quote, Sparkles, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Counter, goToStyle } from './bits'

// Intensitas titik deterministik (hindari Math.random supaya SSR & client sama)
const DOTS = Array.from(
  { length: 35 },
  (_, i) => ((i * 17 + 3) % 9 === 0 ? 0 : ((i * 17 + 3) % 3) + 1),
)
const DOT_COLORS = ['bg-stone-200', 'bg-emerald-200', 'bg-emerald-400', 'bg-emerald-500']

type Habit = { id: number; name: string; tag: string; done: boolean }
const INITIAL_HABITS: Habit[] = [
  { id: 1, name: 'Minum 8 gelas air', tag: 'Kesehatan', done: true },
  { id: 2, name: 'Baca 20 halaman', tag: 'Belajar', done: false },
  { id: 3, name: 'Lari pagi 3 km', tag: 'Kebugaran', done: false },
]

function Cell({
  className = '',
  delay = 0,
  children,
}: {
  className?: string
  delay?: number
  children: ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 170, damping: 20 }}
      whileHover={{ y: -5 }}
      className={className}
    >
      <Card className="h-full rounded-3xl border-zinc-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-lg hover:shadow-orange-100/60 sm:p-5">
        {children}
      </Card>
    </motion.div>
  )
}

export default function BentoGrid() {
  const dotsRef = useRef<HTMLDivElement>(null)
  const dotsInView = useInView(dotsRef, { once: true, margin: '-60px' })
  const [remindOn, setRemindOn] = useState(true)
  const [habits, setHabits] = useState(INITIAL_HABITS)

  // Titik streak muncul bergelombang dari tengah (anime.js stagger)
  useEffect(() => {
    if (!dotsInView || !dotsRef.current) return
    const anim = animate(Array.from(dotsRef.current.children) as HTMLElement[], {
      opacity: [0, 1],
      scale: [0.4, 1],
      duration: 420,
      delay: stagger(26, { from: 'center' }),
      ease: 'outBack(1.4)',
    })
    return () => anim.revert()
  }, [dotsInView])

  const doneCount = habits.filter((h) => h.done).length
  const sorted = [...habits].sort((a, b) => Number(a.done) - Number(b.done))

  return (
    <section className="flex min-h-screen w-full items-center bg-stone-100 px-4 py-24 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <Badge
            variant="outline"
            className="gap-1.5 rounded-full border-orange-200 bg-orange-50 px-3 py-1 text-orange-700"
          >
            <Sparkles className="h-3 w-3" /> Rutina 2.0 — sudah rilis
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            Satu aplikasi, <span className="text-orange-600">semua</span> yang perlu
            untuk konsisten
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 sm:text-lg">
            Dari pengingat pertama sampai streak ke-100 — Rutina menata semuanya rapi
            dalam satu tempat.
          </p>
        </div>

        {/* Grid bento */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
          {/* Kartu besar: streak */}
          <Cell className="col-span-2 lg:col-span-4 lg:row-span-2" delay={0.05}>
            <div className="flex h-full flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100">
                    <Flame className="h-4 w-4 text-orange-600" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Streak terpanjang</p>
                    <p className="text-xs text-stone-500">Update langsung tiap check-in</p>
                  </div>
                </div>
                <Badge className="rounded-full border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  +6 minggu ini
                </Badge>
              </div>

              <div className="mt-5 flex items-end gap-3">
                <p className="text-6xl font-semibold tracking-tight text-zinc-900 sm:text-7xl">
                  <Counter to={128} />
                </p>
                <p className="pb-2 text-xs leading-snug text-stone-500">
                  hari<br className="sm:hidden" /> berturut-turut
                </p>
              </div>

              <div ref={dotsRef} className="mt-auto grid grid-cols-7 gap-1.5 pt-6 sm:gap-2">
                {DOTS.map((lvl, i) => (
                  <span key={i} className={`h-6 rounded-md opacity-0 sm:h-7 ${DOT_COLORS[lvl]}`} />
                ))}
              </div>
              <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.18em] text-stone-400">
                5 minggu terakhir
              </p>
            </div>
          </Cell>

          {/* Ring konsistensi */}
          <Cell className="col-span-1 lg:col-span-2" delay={0.14}>
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-xs font-medium text-stone-500">Konsistensi minggu ini</p>
              <div className="relative">
                <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90">
                  <circle cx="60" cy="60" r="44" fill="none" stroke="#e7e5e4" strokeWidth="11" />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="44"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeDasharray={276.5}
                    initial={{ strokeDashoffset: 276.5 }}
                    whileInView={{ strokeDashoffset: 276.5 * 0.22 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-semibold text-zinc-900">
                    <Counter to={78} stiffness={50} />
                  </span>
                  <span className="text-[10px] text-stone-400">persen</span>
                </div>
              </div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-stone-400">
                Target 80%
              </p>
            </div>
          </Cell>

          {/* Pengingat */}
          <Cell className="col-span-1 lg:col-span-2" delay={0.2}>
            <div className="flex h-full flex-col justify-between gap-4">
              <div className="flex items-start justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                  <Bell className="h-4 w-4 text-amber-600" />
                </span>
                <Switch
                  checked={remindOn}
                  onCheckedChange={setRemindOn}
                  aria-label="Aktifkan pengingat"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Pengingat pintar</p>
                <AnimatePresence initial={false} mode="wait">
                  {remindOn ? (
                    <motion.p
                      key="on"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28 }}
                      className="overflow-hidden text-xs leading-relaxed text-stone-500"
                    >
                      Setiap hari · 07.00 &amp; 21.30 WIB — menyesuaikan jadwalmu.
                    </motion.p>
                  ) : (
                    <motion.p
                      key="off"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28 }}
                      className="overflow-hidden text-xs leading-relaxed text-stone-500"
                    >
                      Nonaktif — kamu yang atur waktunya sendiri.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </Cell>

          {/* Daftar kebiasaan interaktif */}
          <Cell className="col-span-2 lg:col-span-2" delay={0.26}>
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-900">Kebiasaan hari ini</p>
                <span className="text-xs font-semibold tabular-nums text-orange-600">
                  {doneCount}/{habits.length} selesai
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {sorted.map((h) => (
                  <motion.label
                    layout
                    key={h.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-zinc-100 bg-stone-50 px-3 py-2.5"
                  >
                    <Checkbox
                      checked={h.done}
                      onCheckedChange={() =>
                        setHabits((prev) =>
                          prev.map((x) => (x.id === h.id ? { ...x, done: !x.done } : x)),
                        )
                      }
                      aria-label={h.name}
                    />
                    <span
                      className={`text-xs font-medium ${
                        h.done ? 'text-stone-400 line-through' : 'text-zinc-800'
                      }`}
                    >
                      {h.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className="ml-auto border-0 bg-white text-[9px] text-stone-500"
                    >
                      {h.tag}
                    </Badge>
                  </motion.label>
                ))}
              </div>
              <p className="mt-auto pt-3 text-[10px] text-stone-400">
                Coba centang — urutannya ikut menyesuaikan.
              </p>
            </div>
          </Cell>

          {/* Statistik angka */}
          <Cell className="col-span-2 lg:col-span-2" delay={0.32}>
            <div className="grid h-full grid-cols-3 gap-2">
              <div className="flex flex-col justify-center gap-1 rounded-2xl bg-stone-50 p-3">
                <p className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
                  <Counter to={128} />
                  <span className="text-sm font-semibold">rb</span>
                </p>
                <p className="text-[10px] leading-tight text-stone-500">kebiasaan aktif</p>
              </div>
              <div className="flex flex-col justify-center gap-1 rounded-2xl bg-stone-50 p-3">
                <p className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
                  <Counter to={92} />
                  <span className="text-sm font-semibold">%</span>
                </p>
                <p className="text-[10px] leading-tight text-stone-500">tingkat konsistensi</p>
              </div>
              <div className="flex flex-col justify-center gap-1 rounded-2xl bg-stone-50 p-3">
                <p className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
                  <Counter to={66} />
                </p>
                <p className="text-[10px] leading-tight text-stone-500">hari sampai menempel</p>
              </div>
            </div>
          </Cell>

          {/* Testimoni */}
          <Cell className="col-span-2 lg:col-span-2" delay={0.38}>
            <div className="flex h-full flex-col justify-between gap-4">
              <Quote className="h-5 w-5 text-orange-300" />
              <p className="text-sm leading-relaxed text-zinc-700">
                &ldquo;Satu-satunya aplikasi kebiasaan yang bertahan lebih dari setahun di HP
                saya. Streak-nya bikin ogah bolong sehari pun.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-400 text-[10px] font-bold text-white">
                  DP
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-zinc-900">
                    Dina Prameswari
                  </p>
                  <p className="truncate text-[10px] text-stone-500">
                    Product Designer · 214 hari streak
                  </p>
                </div>
                <div className="ml-auto flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-current" />
                  ))}
                </div>
              </div>
            </div>
          </Cell>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <Button
            size="lg"
            onClick={() => goToStyle(2)}
            className="h-11 rounded-full bg-zinc-900 px-7 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Coba Rutina gratis <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-stone-400">
            Tanpa kartu kredit · 30 hari penuh
          </p>
        </div>
      </div>
    </section>
  )
}
