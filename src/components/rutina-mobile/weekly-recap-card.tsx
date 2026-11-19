'use client'

import * as m from 'motion/react-m'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Dumbbell,
  Flame,
  Sprout,
  TrendingDown,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { motionTokens } from '@/lib/motion/tokens'

import { playfair } from './serif'
import { Counter } from './counter'
import { formatIDRShort } from './finance/utils'
import { todayISO, useRutina } from './store'
import { weeklyRecapOf } from './weekly-recap'

/* ===== Rekap Pekan — kartu perjalanan =====

   Ringkasan perjalanan pekan yang membuat pengguna INGIN melihat
   perkembangan dirinya (v2.14): strip perjalanan 7 hari bertema
   taman (kecambah tumbuh di hari yang targetnya tercapai),
   perbandingan jujur vs pekan lalu (rentang hari sama), dan chip
   visual lintas modul — bukan sekadar deretan angka.

   Permukaan "garden-surface" (kabut matcha) menyatu dengan hero
   progres & Taman Pertumbuhan: rekap adalah bagian dari narasi
   pertumbuhan, bukan tabel angka. */

interface ChipSpec {
  key: string
  label: string
  icon: LucideIcon
  iconClass: string
  value: string
}

export function WeeklyRecapCard() {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const dailyGoal = useRutina((s) => s.dailyGoal)
  const workouts = useRutina((s) => s.workouts)
  const txs = useRutina((s) => s.txs)
  const setScreen = useRutina((s) => s.setScreen)

  const recap = weeklyRecapOf({
    today: todayISO(),
    habits,
    completions,
    dailyGoal,
    workouts,
    txs,
  })

  /* Chip visual lintas modul — ikon + angka, bukan angka telanjang. */
  const chips: ChipSpec[] = [
    {
      key: 'streak',
      label: 'Streak',
      icon: Flame,
      iconClass: 'bg-gold/25 text-espresso',
      value: `${recap.streak} hari`,
    },
    {
      key: 'latihan',
      label: 'Latihan',
      icon: Dumbbell,
      iconClass: 'bg-[var(--module-bugar-soft)] text-[var(--module-bugar-strong)]',
      value: `${recap.workouts} sesi`,
    },
    {
      key: 'xp',
      label: 'XP misi',
      icon: Zap,
      iconClass: 'bg-secondary text-success',
      value: `+${recap.xp}`,
    },
    {
      key: 'kas',
      label: 'Arus kas',
      icon: recap.netFlow >= 0 ? ArrowUpRight : ArrowDownRight,
      iconClass:
        recap.netFlow >= 0
          ? 'bg-secondary text-success'
          : 'bg-clay/25 text-content-danger',
      value:
        recap.netFlow >= 0
          ? formatIDRShort(recap.netFlow)
          : `−${formatIDRShort(-recap.netFlow)}`,
    },
  ]

  /* Ringkasan nonvisual strip perjalanan (aksesibilitas grafik). */
  const stripAria = recap.days
    .map(
      (d) =>
        `${d.label} ${d.isFuture ? 'belum berjalan' : `${d.done} misi${d.metGoal ? ', target tercapai' : ''}`}`,
    )
    .join(', ')

  const DeltaIcon = recap.delta > 0 ? TrendingUp : TrendingDown
  const deltaClass =
    recap.delta > 0
      ? 'bg-secondary text-success'
      : recap.delta < 0
        ? 'bg-clay/20 text-content-danger'
        : 'bg-surface-sunken text-content-secondary'
  const deltaText =
    recap.delta > 0
      ? `+${recap.delta} vs pekan lalu`
      : recap.delta < 0
        ? `−${Math.abs(recap.delta)} vs pekan lalu`
        : 'setara pekan lalu'

  return (
    <section
      aria-label="Rekap pekan ini"
      className="garden-surface rounded-2xl border border-border-default p-4 shadow-soft sm:p-5"
    >
      {/* Kepala — judul + rentang + pintu ke Statistik (Statistik bukan
          tab sejak navigasi plus-tengah v2.14; rekap menjadi pintunya). */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-muted">
            Rekap Pekan
          </p>
          <p className="mt-0.5 truncate text-meta font-medium text-content-muted">
            {recap.rangeLabel}
          </p>
        </div>
        <m.button
          type="button"
          onClick={() => setScreen('statistik')}
          aria-label="Buka Statistik"
          whileTap={{ scale: 0.94 }}
          className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface-primary/80 px-3.5 text-meta font-bold text-content-secondary shadow-soft transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <BarChart3 className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          Statistik
        </m.button>
      </div>

      {/* Strip perjalanan — jejak 7 hari; kecambah menetas di hari yang
          hidup, mekar penuh saat target harian tercapai, titik di hari
          kosong, lingkar putus untuk hari yang belum tiba. */}
      <div
        className="relative mt-4"
        role="img"
        aria-label={`Perjalanan pekan ini: ${stripAria}`}
      >
        {/* Jalur tanah di belakang sel — menyatukan 7 hari jadi satu
            jejak perjalanan. Posisi vertikal mengikuti tinggi lingkaran
            (36px dasar / 44px sm+). */}
        <div
          aria-hidden="true"
          className="absolute inset-x-[8%] top-[18px] h-px bg-border sm:top-[22px]"
        />
        <div className="relative flex items-start justify-between">
          {recap.days.map((d, i) => {
            const sprout = d.metGoal
              ? 'full'
              : d.done > 0
                ? 'partial'
                : 'none'
            return (
              <div
                key={d.iso}
                className="flex w-full flex-col items-center gap-1.5"
              >
                <m.div
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{
                    ...motionTokens.spring.playful,
                    delay: i * 0.05,
                  }}
                  className={
                    'flex h-9 w-9 items-center justify-center rounded-full sm:h-11 sm:w-11 ' +
                    (d.isFuture
                      ? 'border border-dashed border-border bg-transparent'
                      : sprout === 'full'
                        ? 'bg-secondary'
                        : sprout === 'partial'
                          ? 'bg-surface-primary/90 shadow-soft'
                          : 'bg-transparent') +
                    (d.isToday && !d.isFuture
                      ? ' outline outline-2 outline-offset-2 outline-primary'
                      : '')
                  }
                  aria-hidden="true"
                >
                  {sprout === 'full' && (
                    <Sprout className="h-4.5 w-4.5 text-success sm:h-5 sm:w-5" strokeWidth={2.4} />
                  )}
                  {sprout === 'partial' && (
                    <Sprout
                      className="h-3.5 w-3.5 text-[var(--palette-matcha)] sm:h-4 sm:w-4"
                      strokeWidth={2.2}
                    />
                  )}
                  {sprout === 'none' && !d.isFuture && (
                    <span className="h-1.5 w-1.5 rounded-full bg-content-muted/50" />
                  )}
                </m.div>
                <span
                  className={
                    'text-chart-label font-semibold ' +
                    (d.isToday ? 'text-success' : 'text-content-muted')
                  }
                >
                  {d.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Headline — total misi + perbandingan vs pekan lalu. */}
      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="flex items-baseline gap-1.5">
          <span className="text-kpi font-semibold leading-none tracking-tight text-content-primary">
            <Counter to={recap.missionsDone} />
          </span>
          <span className="text-note font-semibold text-content-secondary">
            misi selesai
          </span>
        </p>
        <span
          className={
            'flex items-center gap-1 rounded-full px-2.5 py-1 text-eyebrow font-bold tabular-nums ' +
            deltaClass
          }
        >
          {recap.delta !== 0 && (
            <DeltaIcon className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
          )}
          {deltaText}
        </span>
      </div>

      {/* Chip visual lintas modul. */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {chips.map((c, i) => (
          <m.div
            key={c.key}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{
              duration: motionTokens.duration.enter,
              delay: i * 0.04,
              ease: motionTokens.easing.standard,
            }}
            className="flex items-center gap-2.5 rounded-[14px] border border-border bg-surface-primary/80 p-2.5"
          >
            <span
              aria-hidden="true"
              className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-full ' + c.iconClass}
            >
              <c.icon className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-note font-bold tabular-nums leading-tight text-content-primary">
                {c.value}
              </span>
              <span className="mt-0.5 block text-eyebrow font-semibold uppercase tracking-wide text-content-muted">
                {c.label}
              </span>
            </span>
          </m.div>
        ))}
      </div>

      {/* Penutup naratif — kalimat pertumbuhan, bukan angka. */}
      <p
        className={`${playfair.className} mt-4 text-balance text-note italic leading-relaxed text-content-secondary`}
      >
        {recap.delta > 0
          ? 'Pekan ini kamu tumbuh lebih jauh dari pekan lalu — teruskan iramanya.'
          : recap.delta < 0
            ? 'Pekan lalu lebih ramai — tidak apa-apa; satu kecambah hari ini cukup untuk memulai lagi.'
            : 'Iramamu stabil seperti pekan lalu — konsistensi juga kemajuan.'}
      </p>
    </section>
  )
}
