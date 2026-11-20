'use client'

import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Dumbbell,
  Flame,
  Sprout,
  TrendingDown,
  TrendingUp,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'

import { DayDetailSheet } from './day-detail-sheet'
import { playfair } from './serif'
import { Counter } from './counter'
import { formatIDRShort } from './finance/utils'
import { longDateLabel, todayISO, useRutina } from './store'
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
  value: string
}

export function WeeklyRecapCard() {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const dailyGoal = useRutina((s) => s.dailyGoal)
  const workouts = useRutina((s) => s.workouts)
  const txs = useRutina((s) => s.txs)
  const setScreen = useRutina((s) => s.setScreen)

  /* v2.27 audit motion: gerbang anti-replay entrance. */
  const playEntrance = useFirstVisit('home-recap')

  /* Hari terpilih pada strip perjalanan (audit Tahap 2: menekan hari
     menampilkan jumlah misi, aktivitas, dan status target hari itu) dan
     tanggal yang dibuka di sheet detail lengkap. */
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [sheetDay, setSheetDay] = useState<string | null>(null)

  const recap = weeklyRecapOf({
    today: todayISO(),
    habits,
    completions,
    dailyGoal,
    workouts,
    txs,
  })

  /* Aktivitas hari terpilih — sesi latihan & arus kas nyata. */
  const sel = recap.days.find((d) => d.iso === selectedDay) ?? null
  const selWorkouts = sel
    ? workouts.filter((w) => w.date === sel.iso).length
    : 0
  const selFlow = sel
    ? txs.reduce(
        (acc, t) =>
          acc +
          (t.ts === sel.iso
            ? t.type === 'masuk'
              ? t.amount
              : t.type === 'keluar'
                ? -t.amount
                : 0
            : 0),
        0,
      )
    : 0

  /* Chip visual lintas modul — ikon + label + angka (v2.27: baris meta
     inline, bukan angka telanjang / kisi kotak). */
  const chips: ChipSpec[] = [
    {
      key: 'streak',
      label: 'Streak',
      icon: Flame,
      value: `${recap.streak} hari`,
    },
    {
      key: 'latihan',
      label: 'Latihan',
      icon: Dumbbell,
      value: `${recap.workouts} sesi`,
    },
    {
      key: 'xp',
      label: 'XP misi',
      icon: Zap,
      value: `+${recap.xp}`,
    },
    {
      key: 'kas',
      label: 'Arus kas',
      icon: recap.netFlow >= 0 ? ArrowUpRight : ArrowDownRight,
      value:
        recap.netFlow >= 0
          ? formatIDRShort(recap.netFlow)
          : `−${formatIDRShort(-recap.netFlow)}`,
    },
  ]

  /* Ringkasan nonvisual strip perjalanan (aksesibilitas grafik) —
     v2.36: sertakan proporsi capaian vs target. */
  const stripAria = recap.days
    .map(
      (d) =>
        `${d.label} ${
          d.isFuture
            ? 'belum berjalan'
            : `${d.done} misi (${Math.min(
                100,
                Math.round((d.done / Math.max(dailyGoal, 1)) * 100),
              )}% dari target)${d.metGoal ? ', target tercapai' : ''}`
        }`,
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
      className="garden-surface rounded-xl border border-border-default p-4 shadow-soft sm:p-5"
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
          kosong, lingkar putus untuk hari yang belum tiba. Setiap hari
          yang sudah berjalan bisa DITEKAN untuk membuka ringkasan
          hari itu (misi, aktivitas, status target) di bawah strip. */}
      <div
        className="relative mt-4"
        role="group"
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
            const daySelected = selectedDay === d.iso
            return (
              <div
                key={d.iso}
                className="flex w-full flex-col items-center gap-1.5"
              >
                {d.isFuture ? (
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-border bg-transparent sm:h-11 sm:w-11"
                    aria-label={`${d.label} belum berjalan`}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedDay(daySelected ? null : d.iso)}
                    aria-pressed={daySelected}
                    aria-label={`${longDateLabel(d.iso)} — ${d.done} misi (${Math.min(
                      100,
                      Math.round((d.done / Math.max(dailyGoal, 1)) * 100),
                    )}% dari target ${dailyGoal})${d.metGoal ? ', target tercapai' : ''}`}
                    className="interactive flex cursor-pointer flex-col items-center rounded-xl p-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <m.div
                      initial={playEntrance ? { scale: 0, opacity: 0 } : false}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true, margin: '-30px' }}
                      transition={{
                        ...motionTokens.spring.playful,
                        delay: i * 0.05,
                      }}
                      className={
                        'flex h-9 w-9 items-center justify-center rounded-full sm:h-11 sm:w-11 ' +
                        (sprout === 'full'
                          ? 'bg-secondary'
                          : sprout === 'partial'
                            ? 'bg-surface-primary/90 shadow-soft'
                            : 'bg-transparent') +
                        (daySelected
                          ? ' ring-2 ring-primary ring-offset-2 ring-offset-surface-primary'
                          : d.isToday
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
                      {sprout === 'none' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-content-muted/50" />
                      )}
                    </m.div>
                    {/* Proporsi capaian vs target (audit v2.36): bar tipis
                        di bawah lingkaran membedakan 25% / 60% / 100% —
                        tidak lagi hanya tunas kosong-sebagian-penuh. */}
                    <span
                      aria-hidden="true"
                      className="mt-1 h-1 w-9 overflow-hidden rounded-full bg-surface-primary/70 sm:w-10"
                    >
                      <m.span
                        initial={false}
                        className={
                          'block h-full rounded-full ' +
                          (sprout === 'full'
                            ? 'bg-success'
                            : 'bg-[var(--palette-matcha)]')
                        }
                        style={{
                          width: `${Math.min(
                            100,
                            (d.done / Math.max(dailyGoal, 1)) * 100,
                          )}%`,
                        }}
                      />
                    </span>
                  </button>
                )}
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

      {/* Ringkasan hari terpilih — misi selesai, aktivitas, dan status
          target hari itu (audit Tahap 2: interaksi yang lebih informatif
          saat menekan hari pada strip perjalanan). */}
      <AnimatePresence initial={false}>
        {sel && !sel.isFuture && (
          <m.div
            key={sel.iso}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: motionTokens.duration.fast,
              ease: motionTokens.easing.standard,
            }}
            className="overflow-hidden"
          >
            <div className="mt-3.5 rounded-lg border border-border bg-surface-primary/85 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-note font-bold tracking-tight text-content-primary">
                  {longDateLabel(sel.iso)}
                  {sel.isToday ? ' · hari ini' : ''}
                </p>
                <span
                  className={
                    'flex items-center gap-1 rounded-full px-2.5 py-1 text-eyebrow font-bold ' +
                    (sel.metGoal
                      ? 'bg-secondary text-success'
                      : 'bg-surface-secondary text-content-secondary')
                  }
                >
                  {sel.metGoal && (
                    <CheckCircle2
                      className="h-3 w-3"
                      strokeWidth={2.4}
                      aria-hidden="true"
                    />
                  )}
                  {sel.metGoal
                    ? `Target ${dailyGoal} misi tercapai`
                    : sel.done > 0
                      ? `Belum sampai target ${dailyGoal} misi`
                      : 'Belum ada misi selesai'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-eyebrow font-semibold text-content-muted">
                <span className="tabular-nums">{sel.done} misi selesai</span>
                {/* v2.36: jadwal + persentase kepatuhan — hari tanpa jadwal
                    tidak menampilkan angka kosong yang menyesatkan. */}
                {sel.scheduled > 0 ? (
                  <span className="tabular-nums">
                    {Math.min(sel.done, sel.scheduled)}/{sel.scheduled} jadwal (
                    {Math.round((sel.done / sel.scheduled) * 100)}%)
                  </span>
                ) : (
                  <span>tanpa kebiasaan terjadwal</span>
                )}
                {selWorkouts > 0 && (
                  <span className="flex items-center gap-1 tabular-nums">
                    <Dumbbell className="h-3 w-3" aria-hidden="true" />
                    {selWorkouts} sesi latihan
                  </span>
                )}
                {selFlow !== 0 && (
                  <span
                    className={
                      'tabular-nums ' +
                      (selFlow > 0 ? 'text-success' : 'text-content-danger')
                    }
                  >
                    {selFlow > 0 ? '+' : '−'}
                    {formatIDRShort(Math.abs(selFlow))} arus kas
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSheetDay(sel.iso)}
                className="interactive mt-2.5 flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface-primary px-3.5 text-eyebrow font-bold text-content-secondary hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {sel.isToday ? 'Detail lengkap hari ini' : 'Lihat detail lengkap'}
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
      <DayDetailSheet date={sheetDay} onClose={() => setSheetDay(null)} />

      {/* Headline — total misi + perbandingan vs pekan lalu. */}
      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="flex items-baseline gap-1.5">
          <span className="text-kpi font-semibold leading-none tracking-tight text-content-primary">
            <Counter to={recap.missionsDone} immediate={!playEntrance} />
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

      {/* Chip visual lintas modul — baris meta inline tanpa kotak (v2.27
          Daybook: informasi pendamping dibaca sekali sapuan; tidak lagi
          kisi 4 kotak seragam yang menyaingi headline & strip perjalanan). */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {chips.map((c) => (
          <span
            key={c.key}
            className="flex items-center gap-1.5 text-meta text-content-muted"
          >
            <c.icon
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 text-content-secondary"
              strokeWidth={2.2}
            />
            {c.label}
            <span className="font-bold tabular-nums text-content-primary">
              {c.value}
            </span>
          </span>
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
