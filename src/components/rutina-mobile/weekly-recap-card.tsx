'use client'

import { useState } from 'react'
import { AnimatePresence, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Crown,
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
import { weeklyRecapOf, type RecapDayInfo } from './weekly-recap'

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

/* ===== Lapisan sulur strip perjalanan (v2.47 · Daily Almanac) =====

   Sulur tumbuh menggantikan garis tanah datar: batang bergelombang
   lembut (module-accent 35%, 1.5px) melewati 7 posisi hari DI BELAKANG
   lingkaran; pasangan daun kecil hanya bertunas di hari yang targetnya
   tercapai (metGoal — maks. 7 pasang, tanpa keramaian); garis tanah
   samar tetap menjadi pijakan di bawah sulur. Dekoratif semata
   (aria-hidden) — data dibawa label tiap tombol hari. */

/** Posisi x (viewBox 0–100) kolom hari ke-i — 7 kolom sama lebar,
 *  sejajar dengan titik tengah lingkaran hari. */
const VINE_NODE_X = Array.from(
  { length: 7 },
  (_, i) => ((i + 0.5) * 100) / 7,
)

/** Batang sulur: gelombang mendatar — tangent datar di tiap simpul,
 *  tonjolan bergantian di antaranya (simpul tersembunyi di balik
 *  lingkaran; lengkungan terbaca di celah antar-lingkaran). */
const VINE_STEM_D = (() => {
  /* v2.47.1: amplitudo 3.4 → 4.2 — lengkungan tetap terbaca jelas di
     celah antar-lingkaran pada kartu 320–390px. */
  const amp = 4.2
  const mid = 18
  let d = `M 2.6 ${mid + 0.8} C ${VINE_NODE_X[0] - 2.4} ${mid + 0.8} ${VINE_NODE_X[0] - 1.2} ${mid} ${VINE_NODE_X[0]} ${mid}`
  for (let i = 0; i < VINE_NODE_X.length - 1; i++) {
    const a = VINE_NODE_X[i]
    const b = VINE_NODE_X[i + 1]
    const k = (b - a) / 2.6
    const lift = i % 2 === 0 ? amp : -amp
    d += ` C ${a + k} ${mid + lift} ${b - k} ${mid + lift} ${b} ${mid}`
  }
  const last = VINE_NODE_X[VINE_NODE_X.length - 1]
  d += ` C ${last + 1.2} ${mid} ${last + 2.4} ${mid + 0.8} 97.4 ${mid + 0.8}`
  return d
})()

/** Sepasang daun kecil (viewBox 64×18, bertunas dari titik 32,16). */
const LEAF_LEFT_D =
  'M32 16 C26 15.2 19 12.8 13.5 5.5 C17 4 22 5.2 25.8 8.4 C29 11.2 31.2 14.2 32 16 Z'
const LEAF_RIGHT_D =
  'M32 16 C38 15.2 45 12.8 50.5 5.5 C47 4 42 5.2 38.2 8.4 C35 11.2 32.8 14.2 32 16 Z'

function JourneyVine({ days }: { days: RecapDayInfo[] }) {
  return (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 100 36"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 top-0 h-9 sm:h-11"
      >
        {/* Batang — non-scaling-stroke agar goresan tetap 1.5px pada
            semua lebar kartu meski viewBox direnggangkan. */}
        <path
          d={VINE_STEM_D}
          fill="none"
          stroke="var(--module-accent)"
          strokeOpacity="0.45"
          strokeWidth="1.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Garis tanah samar — pijakan visual di bawah sulur. */}
        <line
          x1="2.6"
          y1="25.5"
          x2="97.4"
          y2="25.5"
          stroke="var(--border-default)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
          opacity="0.8"
        />
      </svg>
      {/* Daun — svg kecil terpisah per simpul (bukan anak svg batang)
          agar bentuknya tidak terdistorsi renggangan preserveAspectRatio.
          Lebar mengikuti skala lingkaran (36/44px) agar ujung daun selalu
          sedikit mengintip di sisi lingkaran. */}
      {days.map((d, i) =>
        d.metGoal ? (
          <svg
            key={d.iso}
            aria-hidden="true"
            viewBox="0 0 64 18"
            preserveAspectRatio="none"
            className="pointer-events-none absolute top-[2px] h-[18px] w-14 -translate-x-1/2 sm:top-[6px] sm:w-16"
            style={{ left: `${VINE_NODE_X[i]}%` }}
          >
            <path d={LEAF_LEFT_D} fill="var(--module-accent)" fillOpacity="0.5" />
            <path d={LEAF_RIGHT_D} fill="var(--module-accent)" fillOpacity="0.5" />
          </svg>
        ) : null,
      )}
    </>
  )
}

export function WeeklyRecapCard({
  /** v2.45 (revisi audit): gulir ke atas SETELAH "Buka di Agenda" —
   *  layar Beranda menggulir di kontainer sendiri (bukan window),
   *  jadi window.scrollTo dulunya no-op; pemanggil yang tahu kontainer
   *  yang menyediakan aksinya. */
  onNavigateToAgenda,
}: {
  onNavigateToAgenda?: () => void
} = {}) {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const dailyGoal = useRutina((s) => s.dailyGoal)
  const workouts = useRutina((s) => s.workouts)
  const txs = useRutina((s) => s.txs)
  const setScreen = useRutina((s) => s.setScreen)
  /* v2.45 (review): ketuk "Buka di Agenda" memindahkan DateStrip ke
     tanggal itu — rekap jadi pintu masuk, bukan jalan buntu. */
  const setSelectedDate = useRutina((s) => s.setSelectedDate)

  /* v2.27 audit motion: gerbang anti-replay entrance. */
  const playEntrance = useFirstVisit('home-recap')
  /* v2.49 (audit): hitung-naik angka bukan transform — MotionConfig
     reducedMotion="user" tidak menghentikannya; gerbang eksplisit. */
  const reducedMotion = useReducedMotion()

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
  /* v2.45 (review Tahap 2): HARI TERBAIK pekan ini — misi terbanyak di
     antara hari yang sudah berjalan (seri → terawal); tanpa misi sama
     sekali = tidak ada mahkota (bukan 0 yang dipaksa). Tanpa useMemo:
     rekayasa 7 hari murah, dan recap.days selalu array baru tiap render
     sehingga memoisasi tidak pernah menghemat apa pun. */
  const bestIso = (() => {
    const eligible = recap.days.filter((d) => !d.isFuture && d.done > 0)
    if (eligible.length === 0) return null
    return eligible.reduce((a, b) => (b.done > a.done ? b : a)).iso
  })()
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
      /* v2.38: 12px → 16px — menyatu dengan permukaan garden 24px
         (Pohon Kebun — v2.86 audit: PlantGarden dipensiunkan dari
         Beranda sejak v2.83) yang tepat di bawahnya di Beranda. */
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
          whileTap={{ scale: 0.96 }}
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
          hari itu (misi, aktivitas, status target) di bawah strip.
          Audit v2.47 (3-d): tombol hari diberi min-h-11 (≥44px) —
          target sentuh nyaman; baris 7 kolom tak berubah lebarnya. */}
      <div
        className="relative mt-4"
        role="group"
        aria-label={`Perjalanan pekan ini: ${stripAria}`}
      >
        {/* v2.47 (Daily Almanac): sulur tumbuh — batang bergelombang,
            daun hanya di hari metGoal, garis tanah samar; seluruhnya di
            belakang lingkaran hari. */}
        <JourneyVine days={recap.days} />
        <div className="relative flex items-start justify-between">
          {recap.days.map((d, i) => {
            const sprout = d.metGoal
              ? 'full'
              : d.done > 0
                ? 'partial'
                : 'none'
            const daySelected = selectedDay === d.iso
            /* v2.45 (review): hari terbaik pekan ini — hari masa depan
               tidak diperebutkan; seri dimenangkan hari terawal. */
            const isBest = !d.isFuture && d.iso === bestIso
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
                    )}% dari target ${dailyGoal})${d.metGoal ? ', target tercapai' : ''}${isBest ? ' — hari terbaik pekan ini' : ''}`}
                    className="interactive relative flex min-h-11 cursor-pointer flex-col items-center rounded-xl p-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {isBest && (
                      <span
                        className="absolute -top-2 left-1/2 z-10 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full bg-secondary shadow-soft"
                        aria-hidden="true"
                        title="Hari terbaik pekan ini"
                      >
                        <Crown className="h-2.5 w-2.5 text-success" strokeWidth={2.6} />
                      </span>
                    )}
                    <m.div
                      initial={playEntrance ? { scale: 0, opacity: 0 } : false}
                      whileInView={{ scale: 1, opacity: 1 }}
                      /* v2.47: hari terpilih terangkat halus dari sulur —
                         transisi per-nilai agar spring entrance & lift
                         tidak saling menunggu jeda stagger. */
                      animate={{ y: daySelected ? -2 : 0 }}
                      viewport={{ once: true, margin: '-30px' }}
                      transition={{
                        scale: {
                          ...motionTokens.spring.playful,
                          delay: i * motionTokens.stagger.normal,
                        },
                        opacity: {
                          ...motionTokens.spring.playful,
                          delay: i * motionTokens.stagger.normal,
                        },
                        y: motionTokens.spring.snappy,
                      }}
                      className={
                        'flex h-9 w-9 items-center justify-center rounded-full sm:h-11 sm:w-11 ' +
                        (sprout === 'full'
                          ? 'bg-secondary'
                          : sprout === 'partial'
                            ? 'bg-surface-primary/90 shadow-soft'
                            : /* v2.47.1: hari kosong tetap terbaca sebagai
                                 simpul perjalanan — garis rambut inset agar
                                 sulur di belakangnya tidak menembus. */
                              'shadow-[inset_0_0_0_1px_var(--border-default)]') +
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
                    {/* v2.49 (audit): pct sejajar dengan pecahan yang
                        di-penggal — tak ada lagi "2/3 jadwal (150%)". */}
                    {Math.min(sel.done, sel.scheduled)}/{sel.scheduled} jadwal (
                    {Math.min(
                      100,
                      Math.round((sel.done / sel.scheduled) * 100),
                    )}
                    %)
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
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSheetDay(sel.iso)}
                  className="interactive flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface-primary px-3.5 text-eyebrow font-bold text-content-secondary hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {sel.isToday ? 'Detail lengkap hari ini' : 'Lihat detail lengkap'}
                </button>
                {/* v2.45 (review): ketuk → DateStrip & Agenda Beranda pindah
                    ke tanggal itu (tidak untuk hari ini — sudah di sana). */}
                {!sel.isToday && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(sel.iso)
                      setSelectedDay(null)
                      onNavigateToAgenda?.()
                    }}
                    className="interactive flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-3.5 text-eyebrow font-bold text-primary-foreground shadow-soft transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Buka di Agenda
                  </button>
                )}
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
      <DayDetailSheet date={sheetDay} onClose={() => setSheetDay(null)} />

      {/* Headline — total misi + perbandingan vs pekan lalu. */}
      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="flex items-baseline gap-1.5">
          <span className="text-kpi font-semibold leading-none tracking-tight text-content-primary">
            <Counter
              to={recap.missionsDone}
              immediate={!playEntrance || Boolean(reducedMotion)}
            />
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
