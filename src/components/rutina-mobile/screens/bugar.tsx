'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import {
  AlertTriangle,
  ArrowLeftRight,
  Calculator,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Footprints,
  History,
  Play,
  Plus,
  Search,
  Sparkles,
  Timer,
  TrendingDown,
  Trash2,
  Trophy,
  Volleyball,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  addDaysISO,
  longDateLabel,
  shortDateLabel,
  todayISO,
  useRutina,
  weekStartISO,
  type BugarTab,
  type Workout,
  type WorkoutSheetHint,
  type WoFilter,
  type WoRange,
} from '../store'
import { Counter } from '../counter'
import { RutinaTabs, RutinaTabsList, RutinaTabsTrigger } from '../rutina-tabs'
import {
  activitySummary,
  bestE1rmIn,
  cardioGuard,
  cardioSeries,
  cardioSummary,
  deloadActive,
  detectPlateau,
  durationLabel,
  e1rmOf,
  filterWorkouts,
  isCardioKind,
  kcalOf,
  KIND_LABEL,
  latestWeight,
  prBoard,
  readinessOf,
  tonaseOf,
  totalRepsOf,
  weekRange,
  workoutTitle,
} from '../fitness/fit-utils'
import {
  EX_LEVELS,
  EX_LIB,
  MUSCLE_GROUPS,
  PROG_DB,
  exerciseLabel,
  type Program,
} from '../fitness/data'
import { AsupanPanel } from '../fitness/asupan-panel'
import { TubuhPanel } from '../fitness/tubuh-panel'
import {
  SessionPickerSheet,
  WorkoutSessionOverlay,
  startSeededSession,
} from '../fitness/workout-session'
import { BarbellToolsSheet } from '../fitness/barbell-tools'
import { useCheckInSheet } from '../checkin-sheet'
import { RutinaEmptyState } from '../rutina-empty-state'
import { RutinaSectionHeader } from '../rutina-section-header'
import { RutinaBentoGrid, RutinaBentoItem } from '../rutina-bento'

import { motionTokens } from '@/lib/motion/tokens'
import { barFill } from '@/lib/motion/transitions'
/* Subtab Bugar — Latihan, Asupan, Tubuh lengkap. */
const BUGAR_TABS: { id: BugarTab; label: string }[] = [
  { id: 'latihan', label: 'Latihan' },
  { id: 'asupan', label: 'Asupan' },
  { id: 'tubuh', label: 'Tubuh' },
]

/* Filter riwayat aktivitas — jenis (v2.17). */
const WO_FILTERS: { id: WoFilter; label: string }[] = [
  { id: 'semua', label: 'Semua' },
  { id: 'kardio', label: 'Lari & Jalan' },
  { id: 'badminton', label: 'Badminton' },
  { id: 'beban', label: 'Barbel' },
]

/* Rentang tanggal riwayat (v2.17). */
const WO_RANGES: { id: WoRange; label: string }[] = [
  { id: '30', label: '30 hari' },
  { id: '90', label: '90 hari' },
  { id: 'semua', label: 'Semua' },
]

/* Pintasan mode catat cepat (v2.18) — chip ringkas SEKUNDER di bawah
   CTA utama "Mulai Sesi" (audit Tahap 2: satu tombol dominan, pintasan
   tidak bersaing ukuran); tiap chip membuka lembar Catat Aktivitas
   tepat di mode yang dimaksuk. */
const QUICK_MODES: { label: string; icon: typeof Zap; hint: WorkoutSheetHint }[] = [
  { label: 'Lari', icon: Zap, hint: { mode: 'kardio', cardioKind: 'lari' } },
  { label: 'Jalan', icon: Footprints, hint: { mode: 'kardio', cardioKind: 'jalan' } },
  { label: 'Lari + Jalan', icon: ArrowLeftRight, hint: { mode: 'kardio', cardioKind: 'lari-jalan' } },
  { label: 'Badminton', icon: Volleyball, hint: { mode: 'badminton' } },
  { label: 'Barbel', icon: Dumbbell, hint: { mode: 'beban' } },
]

/* ===== Kartu program ===== */

function ProgramCard({ prog, index }: { prog: Program; index: number }) {
  const workouts = useRutina((s) => s.workouts)
  const [expanded, setExpanded] = useState(false)

  return (
    <m.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        ...motionTokens.preset.chipReveal,
        delay: Math.min(motionTokens.delay.step + index * motionTokens.stagger.relaxed, 0.3),
      }}
      className="rounded-xl border border-border bg-surface-primary p-5 shadow-soft"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="interactive flex w-full cursor-pointer items-center gap-3.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-success">
          <Dumbbell className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-section font-bold tracking-tight text-content-primary">
            {prog.name}
          </span>
          <span className="mt-0.5 block break-words text-meta font-medium leading-snug text-content-muted">
            {prog.level} · {prog.freq} · ±{prog.dur} mnt
          </span>
        </span>
        <m.span
          aria-hidden="true"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={motionTokens.preset.interactionInstant}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-content-muted"
        >
          <ChevronDown className="h-4.5 w-4.5" />
        </m.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <m.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={motionTokens.preset.navigation}
            className="overflow-hidden"
          >
            <p className="mt-3 text-note leading-relaxed text-content-muted">
              {prog.desc}
            </p>
            <p className="mt-2 rounded-xl bg-surface-sunken px-3.5 py-2.5 text-meta leading-relaxed text-content-muted">
              <span className="font-bold text-success">Progresi: </span>
              {prog.prog}
            </p>
            <div className="mt-3 space-y-2.5">
              {prog.days.map((day) => (
                <div
                  key={day.label}
                  className="rounded-2xl border border-border bg-surface-sunken p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-note font-semibold text-content-primary">
                      {day.label}
                    </p>
                    <span className="flex items-center gap-1 text-eyebrow font-semibold text-content-muted">
                      <Timer className="h-3 w-3" />
                      istirahat {day.rest}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {day.ex.map((e) => (
                      <li
                        key={e.name}
                        className="flex items-center justify-between gap-2 text-note"
                      >
                        <span className="min-w-0 flex-1 truncate font-medium text-content-secondary/90">
                          {/* Nama Indonesia utama, istilah Inggris
                              sebagai keterangan kecil (v2.17). */}
                          {exerciseLabel(e.name)}
                          <span className="text-content-muted/60"> · {e.name}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-surface-primary px-2.5 py-0.5 text-eyebrow font-semibold tabular-nums text-success">
                          {e.sets}×{e.reps}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() =>
                      /* Hari program → sesi imersif terisi otomatis (target
                         set & pra-isi beban dari histori terakhir). */
                      startSeededSession(
                        day.ex.map((e) => ({
                          name: e.name,
                          count: e.sets,
                          reps: e.reps,
                        })),
                        workouts,
                      )
                    }
                    className="interactive mt-3 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-primary/40 text-note font-semibold text-success hover:bg-secondary hover:text-success focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Mulai sesi {day.label}
                  </button>
                </div>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
}

/* ===== Baris riwayat aktivitas — semua jenis olahraga (v2.17) ===== */

/** Ikon + warna chip per jenis aktivitas. v2.30: chip kini OPEN
 *  (bukan tint /15) — menutup tulang punggung timeline di belakangnya. */
function kindVisual(w: Workout): { Icon: typeof Dumbbell; cls: string } {
  if (w.kind === 'badminton')
    return { Icon: Volleyball, cls: 'bg-module-accent-soft text-module-accent-strong' }
  if (w.kind === 'beban')
    return { Icon: Dumbbell, cls: 'bg-secondary text-success' }
  return { Icon: Footprints, cls: 'bg-surface-secondary text-content-danger' }
}

function WorkoutRow({
  w,
  index,
  bodyWeight,
}: {
  w: Workout
  index: number
  bodyWeight: number | null
}) {
  const deleteWorkout = useRutina((s) => s.deleteWorkout)
  const [expanded, setExpanded] = useState(false)
  const isStrength = w.kind === 'beban'
  const isCardio = isCardioKind(w.kind)
  const tonase = tonaseOf(w)
  const reps = totalRepsOf(w)
  const best = bestE1rmIn(w)
  const kcal = kcalOf(w, bodyWeight)
  const { Icon, cls } = kindVisual(w)
  const pace =
    isCardio && (w.distance ?? 0) > 0 && w.duration > 0
      ? `${Math.floor((w.duration * 60) / w.distance! / 60)}'${String(
          Math.round(((w.duration * 60) / w.distance!) % 60),
        ).padStart(2, '0')}"`
      : null
  const uniqueMoves = new Set(w.sets.map((s) => s.exercise)).size

  return (
    <m.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{
        ...motionTokens.preset.chipReveal,
        delay: Math.min(index * motionTokens.stagger.normal, 0.2),
      }}
      /* Riwayat ala TIMELINE (v2.30 audit): hairline ledger-row + tulang
         punggung vertikal timeline-node di belakang chip — chip menjadi
         node pada rel, menyambung antar-baris; tetap bukan kartu berbayang. */
      className="ledger-row timeline-node py-3"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="interactive flex w-full cursor-pointer items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span
          className={`relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cls}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold text-content-primary">
            {workoutTitle(w)}
            <span className="font-medium text-content-muted">
              {' '}
              — {shortDateLabel(w.date)}
            </span>
          </span>
          <span className="mt-0.5 block text-meta font-medium tabular-nums text-content-muted">
            {isStrength
              ? `${Math.round(tonase).toLocaleString('id-ID')} kg tonase · ${reps} repetisi`
              : isCardio
                ? `${durationLabel(w.duration)}${pace ? ` · pace ${pace}/km` : ''}${w.kcal ? ` · ${w.kcal} kkal` : ''}`
                : `${durationLabel(w.duration)}${w.kcal ? ` · ${w.kcal} kkal` : ''}`}
          </span>
        </span>
        <m.span
          aria-hidden="true"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={motionTokens.preset.interactionInstant}
          className="flex h-7 w-7 shrink-0 items-center justify-center text-content-muted"
        >
          <ChevronDown className="h-4 w-4" />
        </m.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <m.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={motionTokens.preset.cardReveal}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl bg-surface-sunken p-3">
              {isCardio ? (
                /* Detail lari & jalan — jarak jadi angka utama
                   (v2.17: sesuai rancangan detail lari). */
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                      Jarak tempuh
                    </p>
                    <p className="mt-0.5 text-kpi font-bold leading-none tabular-nums text-content-primary">
                      {(w.distance ?? 0).toFixed(2).replace('.', ',')}
                      <span className="ml-1 text-note font-semibold text-content-muted">km</span>
                    </p>
                  </div>
                  <dl className="shrink-0 space-y-1 text-right">
                    <div className="flex items-baseline justify-end gap-1.5">
                      <dt className="text-eyebrow text-content-muted">Durasi</dt>
                      <dd className="text-note font-bold tabular-nums text-content-secondary">
                        {durationLabel(w.duration)}
                      </dd>
                    </div>
                    {pace && (
                      <div className="flex items-baseline justify-end gap-1.5">
                        <dt className="text-eyebrow text-content-muted">Pace</dt>
                        <dd className="text-note font-bold tabular-nums text-content-secondary">
                          {pace}/km
                        </dd>
                      </div>
                    )}
                    <div className="flex items-baseline justify-end gap-1.5">
                      <dt className="text-eyebrow text-content-muted">Kalori</dt>
                      <dd className="text-note font-bold tabular-nums text-content-secondary">
                        {w.kcal ?? kcal} kkal
                        {!w.kcal && <span className="font-normal text-content-muted"> (taksiran)</span>}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : isStrength ? (
                <ul className="space-y-1.5">
                  {[...w.sets]
                    .reduce<{ exercise: string; weight: number; reps: number; count: number }[]>(
                      (acc, s) => {
                        const last = acc[acc.length - 1]
                        if (
                          last &&
                          last.exercise === s.exercise &&
                          last.weight === s.weight &&
                          last.reps === s.reps
                        ) {
                          last.count++
                        } else {
                          acc.push({ ...s, count: 1 })
                        }
                        return acc
                      },
                      [],
                    )
                    .map((g, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-2 text-note"
                      >
                        <span className="min-w-0 flex-1 truncate font-semibold text-content-secondary">
                          {exerciseLabel(g.exercise)}
                        </span>
                        <span className="shrink-0 rounded-full bg-surface-primary px-2.5 py-0.5 text-eyebrow font-semibold tabular-nums text-success">
                          {g.weight.toString().replace('.', ',')} kg × {g.reps} ({g.count} set)
                        </span>
                      </li>
                    ))}
                  <li className="flex items-center justify-between gap-2 border-t border-border pt-1.5 text-meta text-content-muted">
                    <span>{uniqueMoves} gerakan · e1RM ≈ {best.toFixed(1).replace('.', ',')} kg</span>
                    <span className="tabular-nums">
                      {reps} repetisi · {Math.round(tonase).toLocaleString('id-ID')} kg volume
                    </span>
                  </li>
                </ul>
              ) : (
                /* Detail badminton — praktis: durasi, kalori, kondisi. */
                <dl className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-eyebrow text-content-muted">Durasi bermain</dt>
                    <dd className="text-note font-bold tabular-nums text-content-secondary">
                      {durationLabel(w.duration)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-eyebrow text-content-muted">Kalori</dt>
                    <dd className="text-note font-bold tabular-nums text-content-secondary">
                      {w.kcal ?? kcal} kkal
                      {!w.kcal && <span className="font-normal text-content-muted"> (taksiran)</span>}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-eyebrow text-content-muted">Jenis</dt>
                    <dd className="text-note font-bold text-content-secondary">Badminton</dd>
                  </div>
                </dl>
              )}
              {w.note && (
                <p className="mt-2 border-t border-border pt-2 text-meta italic text-content-muted">
                  “{w.note}”
                </p>
              )}
            </div>
            {/* Konfirmasi hapus sesi — sesi latihan berisi banyak set
                dan tidak dapat dikembalikan; AlertDialog mencegah salah
                ketuk, pola sama dengan hapus transaksi/catatan. */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="interactive mt-2.5 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-destructive/35 text-meta font-bold text-content-danger hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus aktivitas
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[320px] rounded-2xl border-border p-6 sm:max-w-[320px]">
                <AlertDialogHeader>
                  <div className="mb-1 flex justify-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-content-danger">
                      <Trash2 className="h-5 w-5" />
                    </span>
                  </div>
                  <AlertDialogTitle className="text-center text-lead font-bold tracking-tight text-content-primary">
                    Hapus aktivitas ini?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-center text-note leading-relaxed text-content-muted">
                    {KIND_LABEL[w.kind]} {shortDateLabel(w.date)}
                    {isStrength
                      ? ` dengan ${w.sets.length} set`
                      : w.kind === 'badminton'
                        ? ` selama ${w.duration} menit`
                        : ` sejauh ${(w.distance ?? 0).toFixed(2).replace('.', ',')} km`}{' '}
                    akan dihapus permanen dari riwayat.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row gap-2 sm:justify-center">
                  <AlertDialogCancel className="mt-0 h-10 flex-1 rounded-full border-border text-note font-semibold text-content-secondary hover:bg-surface-sunken hover:text-content-primary">
                    Batal
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      deleteWorkout(w.id)
                      toast('Aktivitas dihapus dari riwayat.')
                    }}
                    className="h-10 flex-1 rounded-full bg-destructive text-note font-bold text-white hover:bg-destructive/90"
                  >
                    Ya, Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
}

/* ===== Kartu pustaka gerakan ===== */

function ExerciseCard({ name }: { name: string }) {
  const openWorkoutSheet = useRutina((s) => s.openWorkoutSheet)
  const ex = EX_LIB.find((e) => e.name === name)
  const [expanded, setExpanded] = useState(false)
  if (!ex) return null

  return (
    <m.div
      layout="position"
      className="rounded-xl border border-border bg-surface-primary p-4 shadow-soft"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="interactive flex w-full cursor-pointer items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold text-content-primary">
            {ex.idName}
          </span>
          <span className="mt-0.5 block truncate text-eyebrow font-medium text-content-muted">
            {ex.name} · {ex.muscle} · {EX_LEVELS[ex.level]}
          </span>
        </span>
        <m.span
          aria-hidden="true"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={motionTokens.preset.interactionInstant}
          className="flex h-7 w-7 shrink-0 items-center justify-center text-content-muted"
        >
          <ChevronDown className="h-4 w-4" />
        </m.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <m.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={motionTokens.preset.cardReveal}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3">
              <p className="text-note leading-relaxed text-content-muted">
                {ex.desc}
              </p>
              <div>
                <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-success">
                  Langkah
                </p>
                <ol className="mt-1.5 space-y-1.5">
                  {ex.steps.map((s, i) => (
                    <li key={i} className="flex gap-2 text-meta leading-relaxed text-content-muted">
                      <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-secondary text-chart-label font-semibold text-success">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-eyebrow leading-relaxed text-content-secondary">
                  <span className="font-bold text-success">Tip: </span>
                  {ex.tip}
                </p>
              </div>
              <div className="rounded-xl bg-destructive/10 p-3">
                <p className="text-eyebrow leading-relaxed text-content-secondary">
                  <span className="font-bold text-content-danger">Hindari: </span>
                  {ex.mistakes}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  openWorkoutSheet([{ name: ex.name, count: 3, reps: 8 }])
                }
                className="interactive flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-surface-inverse text-note font-bold text-content-inverse hover:bg-surface-inverse-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                Catat gerakan ini
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
}

/* ===== Strip tonase 7 hari — Senin s.d. Minggu pekan berjalan ===== */

/** Label tiga huruf hari (Senin–Minggu) — audit visualisasi v2.12:
 *  satu huruf "S S R K J S M" ambigu (dua S bersebelahan); label
 *  tiga huruf tetap muat di kolom ±48px. */
const TONASE_DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const TONASE_DAY_NAMES = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
]

function TonaseStrip() {
  const workouts = useRutina((s) => s.workouts)
  const reducedMotion = useReducedMotion()
  /* Hari terpilih — null = belum memilih (header menampilkan petunjuk). */
  const [selIdx, setSelIdx] = useState<number | null>(null)

  /* Tonase per hari = Σ (beban × repetisi) dari sesi beban hari itu —
     pecahan per tanggal dari logika weekSummary + tonaseOf yang sama.
     Deret pekan lalu (hari sama) + jumlah sesi dipakai blok detail
     hari terpilih: volume, sesi, dan ±% vs pekan lalu (audit Tahap 2). */
  const { days, values, lastValues, sessCounts, max } = useMemo(() => {
    const tonaseOn = (d: string) =>
      workouts
        .filter((w) => w.date === d)
        .reduce((a, w) => a + tonaseOf(w), 0)
    const start = weekRange().start
    const days = Array.from({ length: 7 }, (_, i) => addDaysISO(start, i))
    const values = days.map(tonaseOn)
    const lastValues = days.map((d) => tonaseOn(addDaysISO(d, -7)))
    const sessCounts = days.map(
      (d) => workouts.filter((w) => w.date === d && w.kind === 'beban').length,
    )
    return {
      days,
      values,
      lastValues,
      sessCounts,
      max: Math.max(...values, 0),
    }
  }, [workouts])

  const todayIdx = (new Date(todayISO() + 'T00:00:00').getDay() + 6) % 7

  /* Rekap pekan di header — perbandingan ringkas “vs pekan lalu”
     (audit Tahap 2); bacaan hari terpilih pindah ke blok detail di
     bawah batang, bukan menumpuk di header. */
  const fmtKg = (n: number) => `${Math.round(n).toLocaleString('id-ID')} kg`
  const total = values.reduce((a, b) => a + b, 0)
  const lastTotal = lastValues.reduce((a, b) => a + b, 0)
  const weekDelta =
    lastTotal > 0 ? Math.round(((total - lastTotal) / lastTotal) * 100) : null
  const headerRight =
    total === 0 && lastTotal === 0
      ? 'ketuk hari untuk detail'
      : lastTotal === 0
        ? `${fmtKg(total)} pekan ini`
        : `${fmtKg(total)} · ${
            weekDelta! >= 0 ? '+' : '−'
          }${Math.abs(weekDelta!)}% vs lalu`

  return (
    <m.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{
        ...motionTokens.preset.chipReveal,
        delay: motionTokens.delay.tight,
      }}
      aria-label="Tonase 7 hari pekan ini"
      className="mt-[var(--layout-gap)] rounded-xl border border-border bg-surface-primary p-4 shadow-soft"
    >
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h2 className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-secondary">
          Tonase per Hari
        </h2>
        <p
          className={`text-eyebrow font-medium tabular-nums ${
            total > 0 || lastTotal > 0
              ? 'text-module-accent-strong'
              : 'text-content-muted'
          }`}
        >
          {headerRight}
        </p>
      </div>
      {/* Tujuh batang — tinggi proporsional tonase hari; ketuk kolom untuk
          membaca nilai di header. Tumbuh lewat scaleY (transform-only). */}
      <div
        className="mt-3 flex gap-1.5"
        role="group"
        aria-label="Tonase latihan tujuh hari terakhir, dalam kilogram"
      >
        {days.map((d, i) => {
          const v = values[i]
          const has = v > 0
          /* Hari terisi minimal 12% agar terlihat; hari kosong stub 6%. */
          const h = has ? Math.max((v / max) * 100, 12) : 6
          const isSel = selIdx === i
          return (
            <button
              key={d}
              type="button"
              aria-pressed={isSel}
              aria-label={`${TONASE_DAY_NAMES[i]}: ${
                has ? `${Math.round(v).toLocaleString('id-ID')} kg tonase` : 'tidak ada latihan'
              }`}
              onClick={() => setSelIdx(isSel ? null : i)}
              className="interactive group flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-strong"
            >
              <div className="flex h-16 w-full items-end">
                <m.div
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{
                    duration: reducedMotion ? 0 : 0.5,
                    delay: reducedMotion
                      ? 0
                      : i * motionTokens.stagger.normal,
                    ease: motionTokens.easing.standard,
                  }}
                  style={{ height: `${h}%`, transformOrigin: 'bottom' }}
                  className={`w-full rounded-full transition-colors ${
                    isSel
                      ? 'bg-module-accent-strong'
                      : has
                        ? 'bg-module-accent/80 group-hover:bg-module-accent'
                        : 'bg-module-accent/20'
                  }`}
                />
              </div>
              <span
                className={`text-chart-label font-semibold ${
                  isSel || i === todayIdx
                    ? 'text-module-accent-strong'
                    : 'text-content-muted'
                }`}
              >
                {TONASE_DAY_LABELS[i]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Detail hari terpilih — volume, jumlah sesi, dan ±% vs hari
          yang sama pekan lalu (audit grafik tonase Tahap 2). */}
      <AnimatePresence initial={false}>
        {selIdx != null && (
          <m.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={motionTokens.preset.cardReveal}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl bg-surface-sunken px-3.5 py-3">
              <p className="text-body font-semibold leading-snug text-content-primary">
                {TONASE_DAY_NAMES[selIdx]} ·{' '}
                {values[selIdx] > 0 ? fmtKg(values[selIdx]) : 'tidak ada latihan'}
                {values[selIdx] > 0 && max > 0 && values[selIdx] === max
                  ? ' · terberat pekan ini'
                  : ''}
              </p>
              <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-meta tabular-nums text-content-muted">
                <span>{sessCounts[selIdx]} sesi beban</span>
                {(() => {
                  const v = values[selIdx]
                  const lv = lastValues[selIdx]
                  if (v === 0 && lv === 0)
                    return <span>pekan lalu juga kosong</span>
                  if (lv === 0)
                    return (
                      <span className="text-success">
                        pekan lalu 0 kg — baru tercatat
                      </span>
                    )
                  const d = Math.round(((v - lv) / lv) * 100)
                  return (
                    <span
                      className={d >= 0 ? 'text-success' : 'text-content-danger'}
                    >
                      vs hari sama lalu ({fmtKg(lv)}): {d >= 0 ? '+' : '−'}
                      {Math.abs(d)}%
                    </span>
                  )
                })()}
              </p>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.section>
  )
}

/* ===== Sparkline e1RM per gerakan — mini garis perkembangan kekuatan.
   Hanya digambar bila sebuah gerakan punya ≥3 catatan sesi (audit
   visualisasi v2.12: dua titik belum meyakinkan sebagai tren). Warna
   gold tua (chart-stroke-3) — zona highlight papan rekor. */
function PrSpark({ points }: { points: { e1: number }[] }) {
  const vals = points.map((p) => p.e1)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = Math.max(max - min, 0.1)
  const W = 64
  const H = 24
  const pts = points.map((p, i) => ({
    x: (i / (points.length - 1)) * (W - 6) + 3,
    y: H - 3 - ((p.e1 - min) / span) * (H - 6),
  }))
  const d = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-6 w-16 shrink-0"
      role="img"
      aria-label={`Perkembangan e1RM ${points.length} sesi terakhir`}
    >
      <polyline
        points={d}
        fill="none"
        stroke="var(--chart-stroke-3)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={pts[pts.length - 1].x}
        cy={pts[pts.length - 1].y}
        r="2.5"
        fill="var(--chart-stroke-3)"
      />
    </svg>
  )
}

/* ===== Layar Bugar ===== */

export default function BugarScreen() {
  const workouts = useRutina((s) => s.workouts)
  const bodyLogs = useRutina((s) => s.bodyLogs)
  const fitTargets = useRutina((s) => s.fitTargets)
  const openWorkoutSheet = useRutina((s) => s.openWorkoutSheet)
  const deloadUntil = useRutina((s) => s.deloadUntil)
  const startDeload = useRutina((s) => s.startDeload)
  const endDeload = useRutina((s) => s.endDeload)
  const openCheckIn = useCheckInSheet((s) => s.openCheckIn)

  /* Subtab aktif disimpan di uiPrefs (store) — bertahan saat berpindah
     layar, tak di-reset oleh AnimatePresence yang melepas komponen. */
  const tab = useRutina((s) => s.uiPrefs.bugarTab)
  const setTab = useRutina((s) => s.setUiPref)
  const [libQuery, setLibQuery] = useState('')
  const [libMuscle, setLibMuscle] = useState<string>('Semua')
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false)
  /* Batang jarak terpilih pada grafik perkembangan (v2.30: ketuk-untuk-
     baca, pola TonaseStrip). */
  const [distIdx, setDistIdx] = useState<number | null>(null)
  const [barbellOpen, setBarbellOpen] = useState(false)
  const reducedMotion = useReducedMotion()

  const week = useMemo(() => activitySummary(workouts), [workouts])
  /* Sesi pekan berjalan (v2.22) — untuk bar sasaran menit/sesi. */
  const weekSessions = useMemo(
    () =>
      workouts.filter((w) => {
        const ws = weekStartISO(todayISO())
        return w.date >= ws && w.date <= todayISO()
      }).length,
    [workouts],
  )
  const cardio = useMemo(() => cardioSummary(workouts), [workouts])
  const prs = useMemo(() => prBoard(workouts), [workouts])
  const topPr = prs[0]
  /* Riwayat e1RM per gerakan — e1RM terbaik tiap sesi, urut tanggal;
     dipakai sparkline papan rekor (audit visualisasi v2.12). */
  const prHistory = useMemo(() => {
    const map = new Map<string, { e1: number }[]>()
    const byDate = [...workouts]
      .filter((w) => w.kind === 'beban')
      .sort((a, b) => a.date.localeCompare(b.date))
    for (const w of byDate) {
      const perEx = new Map<string, number>()
      for (const s of w.sets) {
        const e = e1rmOf(s.weight, s.reps)
        perEx.set(s.exercise, Math.max(perEx.get(s.exercise) ?? 0, e))
      }
      for (const [name, e1] of perEx) {
        const arr = map.get(name) ?? []
        arr.push({ e1 })
        map.set(name, arr)
      }
    }
    return map
  }, [workouts])
  /* Estimasi kalori terbakar pekan ini — MET × berat tercatat. */
  const weight = useMemo(() => latestWeight(bodyLogs), [bodyLogs])
  const weekKcal = useMemo(
    () =>
      workouts
        .filter((w) => w.date >= weekRange().start)
        .reduce((a, w) => a + kcalOf(w, weight), 0),
    [workouts, weight],
  )

  /* ===== Coach Bugar — derivasi dari data pengguna ===== */
  const readiness = useMemo(() => readinessOf(bodyLogs), [bodyLogs])
  const deloadOn = deloadActive(deloadUntil, todayISO())
  const guard = useMemo(() => cardioGuard(workouts), [workouts])
  /* Gerakan unik dari sesi beban; plateau dicek untuk yang ≥3 sesi
     (detectPlateau mengembalikan null di bawah itu). */
  const stalledNames = useMemo(() => {
    if (deloadActive(deloadUntil)) return []
    const names = new Set<string>()
    for (const w of workouts) {
      if (w.kind !== 'beban') continue
      for (const s of w.sets) names.add(s.exercise)
    }
    const out: string[] = []
    for (const n of names) {
      if (detectPlateau(workouts, n)?.stalled) out.push(n)
    }
    return out
  }, [workouts, deloadUntil])

  const strengthCount = workouts.filter((w) => w.kind === 'beban').length

  /* Riwayat aktivitas — filter jenis + rentang tanggal dari uiPrefs
     (v2.17); bertahan saat berpindah layar. */
  const woFilter = useRutina((s) => s.uiPrefs.woFilter)
  const woRange = useRutina((s) => s.uiPrefs.woRange)
  const filteredWorkouts = useMemo(
    () =>
      filterWorkouts(
        workouts,
        woFilter,
        woRange,
      ),
    [workouts, woFilter, woRange],
  )
  /* Deret jarak sesi kardio terakhir — grafik perkembangan (v2.17).
     v2.30: kini mengikuti rentang riwayat (30/90/semua) — grafik tidak
     lagi diam saat pengguna mengganti rentang; batang MORPH (bukan
     entrance ulang) saat data berganti. */
  const distSeries = useMemo(
    () => [...cardioSeries(filteredWorkouts, 8)].reverse(),
    [filteredWorkouts],
  )
  const distSel = distIdx !== null ? (distSeries[distIdx] ?? null) : null

  /* Batas render riwayat (audit performa v2.13): histori bertambah tanpa
     batas — 15 sesi terbaru dirender dulu, sisanya dimuat bertahap agar
     daftar panjang (ratusan sesi) tidak menghentikan gulir. */
  const [historyLimit, setHistoryLimit] = useState(15)
  const historySlice = filteredWorkouts.slice(0, historyLimit)
  const historyHidden = filteredWorkouts.length - historySlice.length

  const filteredLib = useMemo(() => {
    const q = libQuery.trim().toLowerCase()
    return EX_LIB.filter(
      (e) =>
        (libMuscle === 'Semua' || e.muscle === libMuscle) &&
        (q === '' ||
          e.name.toLowerCase().includes(q) ||
          e.idName.toLowerCase().includes(q) ||
          e.detail.toLowerCase().includes(q)),
    )
      .slice()
      .sort((a, b) => a.idName.localeCompare(b.idName))
  }, [libQuery, libMuscle])

  return (
    <div
      data-module="bugar"
      data-layout="performance"
      className="h-full overflow-y-auto no-scrollbar overscroll-contain px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-content-primary"
    >
      {/* Header studio performa — judul operasional Geist Sans tegas
          (bukan serif editorial); Tipografi System v1. */}
      <header>
        <p className="flex items-center gap-1.5 text-eyebrow font-semibold uppercase tracking-[0.16em] text-module-accent-strong">
          <Dumbbell className="h-3.5 w-3.5" />
          Gerak &amp; kekuatan
        </p>
        <h1 className="mt-1.5 text-balance text-fluid-page font-bold leading-none">
          Bugar<span className="text-module-accent">.</span>
        </h1>
        <p className="mt-2 text-body font-medium text-content-muted">
          {tab === 'latihan'
            ? week.runSessions + week.badmintonSessions + week.strengthSessions > 0
              ? `${week.runSessions + week.badmintonSessions + week.strengthSessions} aktivitas pekan ini${topPr ? ` · PR e1RM ≈ ${topPr.best.toFixed(1).replace('.', ',')} kg` : ''}`
              : 'Pusat catatan aktivitas — lari, jalan, badminton, barbel'
            : tab === 'asupan'
              ? 'Asupan & neraca kalori dari master 179 makanan Indonesia'
              : 'Hidrasi, berat badan, tidur & kesiapan latihan'}
        </p>
      </header>

      {/* Subtab — Radix Tabs: pil aktif via data-state=active + dukungan keyboard */}
      <RutinaTabs
        value={tab}
        onValueChange={(v) => setTab({ bugarTab: v as BugarTab })}
      >
        <RutinaTabsList aria-label="Bagian Bugar" className="mt-4 w-full">
          {BUGAR_TABS.map((t) => (
            <RutinaTabsTrigger
              key={t.id}
              value={t.id}
              className="flex-1 data-[state=active]:bg-module-accent/15 data-[state=active]:text-module-accent-strong"
            >
              {t.label}
            </RutinaTabsTrigger>
          ))}
        </RutinaTabsList>
      </RutinaTabs>

      {/* v2.30 (audit direktif): subtab keep-alive — panel tidak
          di-remount. State expand program/riwayat bertahan, entrance
          tidak diulang saat berpindah-pindah subtab; panel lain
          disembunyikan. */}
      <div className={tab === 'latihan' ? 'block' : 'hidden'}>
          {/* Komposisi bento desktop (xl): ringkasan pekan + pintasan sesi
              (hero 8) berdampingan Coach Bugar (feature 4); di bawah xl
              tetap bertumpuk mengikuti urutan DOM. */}
          <m.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: motionTokens.duration.enter,
              delay: motionTokens.delay.tight,
              ease: motionTokens.easing.standard,
            }}
            className="mt-4"
          >
            <RutinaBentoGrid>
              <RutinaBentoItem span="hero">
          {/* Hero ringkasan pekan — angka dari histori nyata; latar strong
              bertint eucalyptus (Color System v2: strong sebagai latar solid
              agar teks putih lolos AA 6,4:1; base dipertahankan untuk ikon/
              aksen), teks module-accent-fg ikut terbalik di mode gelap. */}
          <m.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={motionTokens.preset.chipReveal}
            aria-label="Ringkasan latihan pekan ini"
            className="relative overflow-hidden rounded-2xl bg-module-accent-strong p-5 text-module-accent-fg shadow-leaf @[24rem]:p-6"
          >
        <div className="relative z-10">
          <p className="text-note font-medium text-module-accent-fg/80">
            Aktivitas minggu ini
          </p>
          {/* SATU komposisi hero (audit Tahap 2): metrik utama paling
              dominan — total durasi menit — dengan SATU count-up;
              jarak/badminton/sesi/hari aktif jadi baris pendukung kecil
              di bawah hairline (statis, fade-in saja). */}
          <p className="mt-3 flex items-baseline">
            <span className="text-kpi-hero font-bold leading-none tracking-tight tabular-nums">
              {reducedMotion ? (
                Math.round(week.minutes).toLocaleString('id-ID')
              ) : (
                <Counter to={Math.round(week.minutes)} />
              )}
            </span>
            <span className="ml-1.5 text-lead font-semibold text-module-accent-fg/85">
              mnt
            </span>
          </p>
          <p className="mt-1 text-meta font-medium text-module-accent-fg/85">
            menit bergerak pekan ini
            {week.minutes >= 60 &&
              ` · ≈ ${(week.minutes / 60).toFixed(1).replace('.', ',')} jam`}
          </p>

          {/* Menit vs sasaran pekan (v2.22) — progres untuk metrik utama;
              sesi vs sasaran ikut tampil di baris kecilnya. */}
          {fitTargets.minutes > 0 && (
            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2 text-eyebrow font-semibold text-module-accent-fg/85">
                <span className="tabular-nums">
                  {week.minutes} / {fitTargets.minutes} menit sasaran
                  {fitTargets.sessions > 0 &&
                    ` · ${weekSessions} / ${fitTargets.sessions} sesi`}
                </span>
                <span className="tabular-nums">
                  {Math.min(100, Math.round((week.minutes / fitTargets.minutes) * 100))}%
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-espresso/35">
                <m.div
                  initial={{ scaleX: 0 }}
                  animate={{
                    scaleX: Math.min(
                      1,
                      week.minutes / Math.max(1, fitTargets.minutes),
                    ),
                  }}
                  transition={barFill}
                  className="h-full origin-left rounded-full bg-gradient-to-r from-module-accent-fg/70 to-pistachio"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}

          {/* Empat metrik pendukung — baris kecil di bawah hairline;
              angka dari histori nyata, bukan target (v2.17). */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              ...motionTokens.preset.chipReveal,
              delay: motionTokens.delay.sweep,
            }}
            className="mt-4 grid grid-cols-2 gap-3 border-t border-module-accent-fg/25 pt-4 @[24rem]:grid-cols-4"
          >
            <div className="min-w-0">
              <p className="flex items-baseline">
                <span className="text-kpi-sm font-semibold leading-none tracking-tight tabular-nums">
                  {week.runKm > 0 ? week.runKm.toFixed(1).replace('.', ',') : 0}
                </span>
                <span className="ml-0.5 text-note font-medium text-module-accent-fg/75">km</span>
              </p>
              <p className="mt-1 text-eyebrow font-medium leading-snug text-module-accent-fg/80">
                lari &amp; jalan{week.runSessions > 0 ? ` · ${week.runSessions}×` : ''}
              </p>
            </div>
            <div className="min-w-0">
              <p className="flex items-baseline">
                <span className="text-kpi-sm font-semibold leading-none tracking-tight tabular-nums">
                  {week.badmintonHours > 0
                    ? week.badmintonHours.toFixed(1).replace('.', ',')
                    : 0}
                </span>
                <span className="ml-0.5 text-note font-medium text-module-accent-fg/75">jam</span>
              </p>
              <p className="mt-1 text-eyebrow font-medium leading-snug text-module-accent-fg/80">
                badminton{week.badmintonSessions > 0 ? ` · ${week.badmintonSessions}×` : ''}
              </p>
            </div>
            <div className="min-w-0">
              <p className="flex items-baseline">
                <span className="text-kpi-sm font-semibold leading-none tracking-tight tabular-nums">
                  {week.strengthSessions}
                </span>
                <span className="ml-0.5 text-note font-medium text-module-accent-fg/75">sesi</span>
              </p>
              <p className="mt-1 text-eyebrow font-medium leading-snug text-module-accent-fg/80">
                latihan barbel
              </p>
            </div>
            <div className="min-w-0">
              <p className="flex items-baseline">
                <span className="text-kpi-sm font-semibold leading-none tracking-tight tabular-nums">
                  {week.activeDays}
                </span>
                <span className="ml-0.5 text-note font-medium text-module-accent-fg/75">hari</span>
              </p>
              <p className="mt-1 text-eyebrow font-medium leading-snug text-module-accent-fg/80">
                hari aktif
              </p>
            </div>
          </m.div>

          {/* Keadaan kosong yang memandu (v2.19): empat angka nol tanpa
              konteks terasa “mati” — satu kalimat pengarah + pintasan di
              bawahnya mengubah nol menjadi ajakan memulai. */}
          {week.runKm === 0 &&
            week.badmintonHours === 0 &&
            week.strengthSessions === 0 &&
            week.activeDays === 0 && (
              <p className="mt-3.5 rounded-2xl bg-espresso/25 px-3.5 py-3 text-meta font-medium leading-relaxed text-module-accent-fg/90 backdrop-blur-sm">
                Belum ada aktivitas pekan ini — catat lari, jalan, badminton,
                atau barbel lewat pintasan di bawah. Cukup ingatan dan angka
                dari jam tanganmu.
              </p>
            )}

          {topPr && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-espresso/35 px-3.5 py-2.5 backdrop-blur-sm">
              <Trophy className="h-4 w-4 shrink-0 text-pistachio" />
              <p className="min-w-0 flex-1 break-words text-meta font-semibold leading-snug">
                Rekor e1RM: {topPr.name} ≈ {topPr.best.toFixed(1).replace('.', ',')} kg
              </p>
              <span className="shrink-0 text-eyebrow font-semibold tabular-nums text-module-accent-fg/85">
                {prs.length} gerakan
              </span>
            </div>
          )}

          {/* Footer angka pekan — tonase barbel + estimasi kkal terbakar
              dalam satu baris eyebrow ringkas (menggantikan dua baris lama
              yang tumpang-tindih dengan metrik utama). */}
          {(week.tonase > 0 || weekKcal > 0) && (
            <p className="mt-2.5 text-eyebrow font-medium leading-relaxed text-module-accent-fg/80">
              {week.tonase > 0 &&
                `${Math.round(week.tonase).toLocaleString('id-ID')} kg tonase barbel`}
              {week.tonase > 0 && weekKcal > 0 && ' · '}
              {weekKcal > 0 &&
                `≈ ${weekKcal.toLocaleString('id-ID')} kkal terbakar pekan ini${
                  weight == null ? ' (asumsi 60 kg — timbang dirimu di tab Tubuh)' : ''
                }`}
            </p>
          )}
        </div>
      </m.section>

      {/* Tombol utama dominan — SATU CTA terbesar di layar (matcha
          aksi, audit Tahap 2); pintasan mode di bawahnya jadi chip
          ringkas sekunder yang tidak bersaing ukuran. */}
      <m.button
        type="button"
        onClick={() => setSessionPickerOpen(true)}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...motionTokens.preset.chipReveal, delay: motionTokens.delay.tight }}
        className="interactive mt-3 flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary text-section font-bold text-primary-foreground shadow-lift hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Play className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
        Mulai Sesi Barbel
      </m.button>

      {/* Pintasan catat cepat (v2.18) — chip horizontal sekunder; tiap
          chip membuka lembar Catat Aktivitas di mode yang tepat. */}
      <div
        role="group"
        aria-label="Catat aktivitas baru"
        className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar pb-1"
      >
        {QUICK_MODES.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.label}
              type="button"
              onClick={() => openWorkoutSheet(undefined, { ...a.hint })}
              aria-label={`Catat ${a.label}`}
              className="interactive flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border bg-surface-primary px-3.5 text-meta font-bold text-content-secondary hover:bg-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-strong"
            >
              <Icon
                className="h-3.5 w-3.5 shrink-0 text-module-accent-strong"
                aria-hidden="true"
              />
              {a.label}
            </button>
          )
        })}
      </div>
              </RutinaBentoItem>
              <RutinaBentoItem span="feature">
      {/* ===== Coach Bugar — kesiapan, deload, guard, alat ===== */}
      <section aria-label="Coach Bugar">
        <RutinaSectionHeader
          eyebrow="Saran latihan"
          title="Coach Bugar"
          description="Kesiapan, deload, dan alat bantu — dihitung dari data latihanmu sendiri."
          accent
        />
        <div className="mt-3 space-y-2.5">
          {/* a. Kesiapan latihan — ringkas dari check-in hari ini */}
          <m.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={motionTokens.preset.chipReveal}
            className="rounded-xl border border-border bg-surface-primary p-4 shadow-soft"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-module-accent/15 text-module-accent-strong">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body font-semibold text-content-primary">
                  Kesiapan latihan
                </p>
                <p className="mt-0.5 text-meta font-medium text-content-muted">
                  {readiness
                    ? `${readiness.label} · dari check-in hari ini`
                    : 'Belum ada check-in hari ini'}
                </p>
              </div>
              {readiness && (
                <p className="shrink-0 text-right">
                  <span className="block text-kpi font-bold leading-none tabular-nums text-content-primary">
                    {readiness.score}
                  </span>
                  <span className="block text-chart-label font-semibold uppercase tracking-wide text-content-muted">
                    / 100
                  </span>
                </p>
              )}
            </div>
            {readiness ? (
              <p className="mt-2.5 rounded-xl bg-secondary/60 px-3.5 py-2.5 text-eyebrow leading-relaxed text-content-secondary">
                {readiness.hint}
              </p>
            ) : (
              <button
                type="button"
                onClick={openCheckIn}
                /* v2.30: CTA tenang (outline) — mengisi gelap bersaing dengan
                   CTA utama 'Mulai Sesi' (audit: satu CTA paling kuat). */
                className="interactive mt-2.5 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-full border border-border bg-surface-primary pl-4 pr-[72px] text-note font-semibold text-content-secondary hover:bg-surface-sunken hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {/* pr-[72px] = FAB 56px + jarak 16px: label tak pernah
                    tertindih FAB mengambang yang anchored di kanan-bawah. */}
                <span className="truncate">Isi check-in pagi untuk saran latihan</span>
              </button>
            )}
          </m.div>

          {/* b. SATU peringatan paling relevan — prioritas: deload aktif
              > plateau > guard kardio. Maksimal satu kartu peringatan
              (di samping kesiapan) agar Coach bukan daftar panjang
              (audit Tahap 2: saring saran, 1–2 rekomendasi saja). */}
          {deloadOn && deloadUntil ? (
            <m.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...motionTokens.preset.chipReveal, delay: motionTokens.delay.tight }}
              className="rounded-xl border border-destructive/35 bg-destructive/10 p-4 shadow-soft"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-destructive text-destructive-foreground">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold leading-snug text-content-primary">
                    Masa deload aktif hingga {longDateLabel(deloadUntil)}
                  </p>
                  <p className="mt-0.5 text-meta font-medium text-content-muted">
                    Target beban otomatis dikurangi 50%
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  endDeload()
                  toast.success('Deload diakhiri — beban kembali normal.')
                }}
                className="interactive mt-3 flex h-10 w-full cursor-pointer items-center justify-center rounded-full border border-destructive/45 text-note font-bold text-content-danger hover:bg-destructive/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
              >
                Akhiri deload sekarang
              </button>
            </m.div>
          ) : stalledNames.length > 0 ? (
            <m.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...motionTokens.preset.chipReveal, delay: motionTokens.delay.tight }}
              className="rounded-xl border border-destructive/35 bg-destructive/10 p-4 shadow-soft"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-destructive text-destructive-foreground">
                  <TrendingDown className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-content-primary">
                    Plateau terdeteksi
                  </p>
                  <p className="mt-0.5 text-meta leading-relaxed text-content-muted">
                    e1RM tidak membaik dalam 3 sesi terakhir:
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {stalledNames.map((n) => (
                      <span
                        key={n}
                        className="rounded-full bg-surface-primary px-2.5 py-0.5 text-eyebrow font-semibold text-content-danger"
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-2.5 text-meta leading-relaxed text-content-muted">
                Deload memangkas target beban 50% selama beberapa hari agar
                tubuh bangkit lebih kuat.
              </p>
              <button
                type="button"
                onClick={() => {
                  startDeload(7)
                  toast.success('Deload 7 hari dimulai — target beban dipangkas 50%.')
                }}
                className="interactive mt-3 flex h-10 w-full cursor-pointer items-center justify-center rounded-full bg-destructive text-note font-bold text-destructive-foreground hover:bg-destructive/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
              >
                Mulai deload 7 hari
              </button>
            </m.div>
          ) : guard.tooMuch && guard.suggestion ? (
            <m.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...motionTokens.preset.chipReveal, delay: motionTokens.delay.step }}
              className="rounded-xl border border-destructive/30 bg-surface-sunken p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-destructive/15 text-content-danger">
                  <Footprints className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-semibold text-content-primary">
                    Jeda sejenak — {guard.cardioCount7d} sesi kardio 7 hari terakhir
                  </p>
                  <p className="mt-0.5 text-meta leading-relaxed text-content-muted">
                    {guard.suggestion}
                  </p>
                </div>
              </div>
            </m.div>
          ) : null}

          {/* c. Pintasan Alat Barbel — alat bantu, bukan rekomendasi */}
          <button
            type="button"
            onClick={() => setBarbellOpen(true)}
            className="interactive flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-primary p-4 text-left shadow-soft hover:bg-surface-secondary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-module-accent/15 text-module-accent-strong">
              <Calculator className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold text-content-primary">
                Alat Barbel
              </span>
              <span className="mt-0.5 block text-meta font-medium text-content-muted">
                Kalkulator piring, 1RM, dan pemanasan
              </span>
            </span>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-content-muted"
              aria-hidden="true"
            />
          </button>
        </div>
      </section>
              </RutinaBentoItem>
            </RutinaBentoGrid>
          </m.div>

          {/* Strip performa — tonase beban per hari pekan berjalan */}
          <TonaseStrip />

          {/* Ruang kerja latihan — di ponsel tetap tumpukan vertikal
              (ritme --layout-gap performance); begitu kontainer ≥52rem,
              seksi berpasangan 7:5 lalu 5:7 sehingga studio performa
              terasa seperti MEJA KERJA, bukan gulir panjang: Program
              berdampingan Riwayat, Papan Rekor berdampingan Pustaka. */}
          <div className="mt-[var(--layout-gap)] grid grid-cols-1 gap-[var(--layout-gap)] @[52rem]:grid-cols-12">
      {/* ===== Program latihan — pasangan kiri (7) ===== */}
      <section aria-label="Program latihan" className="@[52rem]:col-span-7">
        <div className="flex items-center gap-2 px-0.5">
          <h2 className="text-section font-semibold tracking-tight text-content-secondary">
            Program Latihan
          </h2>
        </div>
        <p className="mt-1 px-0.5 text-meta leading-relaxed text-content-muted">
          Rencana siap pakai — cukup barbel + rak + bangku. Pilih hari untuk
          memulai sesi terisi otomatis.
        </p>
        <div className="mt-3 space-y-2.5">
          {PROG_DB.map((p, i) => (
            <ProgramCard key={p.id} prog={p} index={i} />
          ))}
        </div>
      </section>

      {/* ===== Riwayat olahraga — semua jenis, filter + rentang (v2.17) ===== */}
      <section aria-label="Riwayat olahraga" className="@[52rem]:col-span-5">
        <div className="flex items-center justify-between gap-3 px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-section font-semibold tracking-tight text-content-secondary">
              Riwayat Olahraga
            </h2>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-eyebrow font-semibold text-success">
              {filteredWorkouts.length}
            </span>
          </div>
          <span className="text-eyebrow font-medium text-content-muted">
            {cardio.km > 0
              ? `${cardio.km.toFixed(1).replace('.', ',')} km kardio`
              : `${strengthCount} sesi barbel`}
          </span>
        </div>

        {/* Filter jenis aktivitas — Semua / Lari & Jalan / Badminton / Barbel */}
        <div
          role="group"
          aria-label="Filter jenis aktivitas"
          className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1"
        >
          {WO_FILTERS.map((f) => {
            const on = woFilter === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setTab({ woFilter: f.id })
                  setHistoryLimit(15)
                }}
                aria-pressed={on}
                className={
                  'interactive h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-meta font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
                  (on
                    ? 'bg-surface-inverse text-content-inverse shadow-soft'
                    : 'border border-border bg-surface-primary text-content-secondary hover:bg-secondary')
                }
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {/* Rentang tanggal — 30 hari / 90 hari / semua (RutinaTabs
            segment: pil aktif meluncur antar tombol). */}
        <RutinaTabs
          value={woRange}
          onValueChange={(v) => {
            setTab({ woRange: v as WoRange })
            setHistoryLimit(15)
          }}
        >
          <RutinaTabsList
            variant="segment"
            aria-label="Rentang tanggal riwayat"
            className="mt-2 h-10 w-full rounded-full border-transparent bg-surface-sunken p-1"
          >
            {WO_RANGES.map((r) => (
              <RutinaTabsTrigger
                key={r.id}
                value={r.id}
                className="h-8 flex-1 px-2 text-meta"
              >
                {r.label}
              </RutinaTabsTrigger>
            ))}
          </RutinaTabsList>
        </RutinaTabs>

        {/* Grafik perkembangan jarak — khusus sesi kardio ≥ 3 (v2.17).
            v2.30: reveal saat masuk viewport (sekali); batang dapat
            DITEKAN untuk membaca (pola TonaseStrip); tinggi batang
            dimorph spring.chart saat rentang berganti — bukan entrance
            ulang (direktif motion: perubahan data ≠ pengulangan entrance). */}
        {distSeries.length >= 3 && (woFilter === 'semua' || woFilter === 'kardio') && (
          <m.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={motionTokens.preset.chipReveal}
            className="mt-3 rounded-xl border border-border bg-surface-primary p-4 shadow-soft"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-secondary">
                Perkembangan Jarak
              </h3>
              <span className="text-eyebrow font-medium text-content-muted">
                {distSeries.length} sesi terakhir
              </span>
            </div>
            <div
              className="mt-3 flex h-20 items-end gap-1.5"
              role="group"
              aria-label={`Grafik perkembangan jarak: ${distSeries
                .map((d) => `${shortDateLabel(d.date)} ${d.km.toFixed(1).replace('.', ',')} km`)
                .join(', ')}`}
            >
              {(() => {
                const max = Math.max(...distSeries.map((d) => d.km), 0.1)
                return distSeries.map((d, i) => {
                  const isSel = distIdx === i
                  return (
                    <button
                      key={`${d.date}-${i}`}
                      type="button"
                      aria-pressed={isSel}
                      aria-label={`${shortDateLabel(d.date)}: ${d.km.toFixed(2).replace('.', ',')} km`}
                      onClick={() => setDistIdx(isSel ? null : i)}
                      className="interactive group flex min-w-0 flex-1 cursor-pointer flex-col items-stretch rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-strong"
                    >
                      <div className="flex h-16 w-full items-end">
                        <m.div
                          initial={false}
                          animate={{
                            height: `${Math.max(8, (d.km / max) * 100)}%`,
                          }}
                          transition={{
                            ...motionTokens.spring.chart,
                            delay: i * motionTokens.stagger.normal,
                          }}
                          className={`w-full rounded-t-md transition-colors ${
                            isSel
                              ? 'bg-module-accent-strong'
                              : 'bg-module-accent/70 group-hover:bg-module-accent'
                          }`}
                        />
                      </div>
                    </button>
                  )
                })
              })()}
            </div>
            {/* Ringkasan batang terpilih — misal aksesibilitas grafik */}
            <p
              className="mt-2 text-meta font-semibold tabular-nums text-content-primary"
              aria-live="polite"
            >
              {distSel
                ? `${longDateLabel(distSel.date)} · ${distSel.km
                    .toFixed(2)
                    .replace('.', ',')} km`
                : 'Ketuk batang untuk membaca nilai.'}
            </p>
            <div className="mt-1.5 flex justify-between text-chart-label font-medium text-content-muted">
              <span>{shortDateLabel(distSeries[0]!.date)}</span>
              <span>
                terjauh {Math.max(...distSeries.map((d) => d.km)).toFixed(2).replace('.', ',')} km
              </span>
              <span>{shortDateLabel(distSeries[distSeries.length - 1]!.date)}</span>
            </div>
          </m.div>
        )}

        {/* Daftar riwayat — hairline ledger-row per item (audit Tahap 2),
            bukan tumpukan kartu berbayang; tetap digulir bertahap. */}
        <div className="mt-3 max-h-[430px] overflow-y-auto no-scrollbar pr-1">
          <AnimatePresence initial={false} mode="popLayout">
            {historySlice.map((w, i) => (
              <WorkoutRow key={w.id} w={w} index={i} bodyWeight={weight} />
            ))}
            {historyHidden > 0 && (
              <button
                key="wo-more"
                type="button"
                onClick={() => setHistoryLimit((n) => n + 15)}
                className="interactive w-full cursor-pointer rounded-full border border-border py-2.5 text-meta font-semibold text-content-secondary hover:bg-surface-sunken hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Tampilkan {Math.min(15, historyHidden)} aktivitas lagi
                {historyHidden > 15 ? ` (${historyHidden} tersisa)` : ''}
              </button>
            )}
            {filteredWorkouts.length === 0 && workouts.length > 0 && (
              <m.div
                key="wo-nofilter"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={motionTokens.preset.chipReveal}
              >
                <RutinaEmptyState
                  icon={<Search />}
                  title="Tidak ada aktivitas pada filter ini"
                  description="Coba ganti jenis aktivitas atau perluas rentang tanggalnya."
                />
              </m.div>
            )}
            {workouts.length === 0 && (
              <m.div
                key="wo-empty"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={motionTokens.preset.chipReveal}
              >
                <RutinaEmptyState
                  icon={<History />}
                  title="Belum ada aktivitas tercatat"
                  description="Catat lari, jalan, badminton, atau latihan barbel pertamamu — riwayat dan rekor tumbuh dari sini."
                  action={
                    <m.button
                      type="button"
                      onClick={() => openWorkoutSheet()}
                      whileTap={{ scale: 0.95 }}
                      className="interactive flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-5 text-note font-bold text-primary-foreground shadow-soft hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Catat Aktivitas
                    </m.button>
                  }
                />
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ===== Papan rekor e1RM — pasangan kiri (5) ===== */}
      <section aria-label="Papan rekor" className="@[52rem]:col-span-5">
        <div className="flex items-center gap-2 px-0.5">
          <Trophy className="h-4 w-4 text-warning" />
          <h2 className="text-section font-semibold tracking-tight text-content-secondary">
            Papan Rekor e1RM
          </h2>
        </div>
        <p className="mt-1 px-0.5 text-meta leading-relaxed text-content-muted">
          Estimasi kekuatan Epley (beban × (1 + reps/30)) dari set yang kamu
          catat — terpantau otomatis.
        </p>

        {prs.length === 0 ? (
          <RutinaEmptyState
            className="mt-3"
            icon={<Trophy />}
            title="Rekor lahir setelah set beban pertama"
            description="Catat satu set barbel — e1RM tiap gerakan dipantau otomatis di papan ini."
            action={
              <m.button
                type="button"
                onClick={() => openWorkoutSheet(undefined, { mode: 'beban' })}
                whileTap={{ scale: 0.95 }}
                className="interactive flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-5 text-note font-bold text-primary-foreground shadow-soft hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Dumbbell className="h-4 w-4" aria-hidden="true" />
                Catat Latihan Barbel
              </m.button>
            }
          />
        ) : (
          <div className="mt-3 space-y-2">
            {prs.map((r, i) => (
              <m.div
                key={r.name}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  ...motionTokens.preset.chipReveal,
                  delay: Math.min(i * motionTokens.stagger.normal, 0.3),
                }}
                className={`flex items-center gap-3 rounded-lg border p-3.5 ${
                  i === 0
                    ? 'border-warning/40 bg-gold/25 shadow-soft'
                    : 'border-border bg-surface-primary shadow-soft'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-note font-bold tabular-nums ${
                    i === 0 ? 'bg-warning text-content-inverse' : 'bg-surface-sunken text-content-muted'
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-semibold text-content-primary">
                    {r.name}
                  </p>
                  <p className="text-eyebrow font-medium text-content-muted">
                    {r.sessions} sesi tercatat
                  </p>
                </div>
                {/* Sparkline perkembangan — hanya bila ≥3 sesi tercatat. */}
                {(prHistory.get(r.name)?.length ?? 0) >= 3 && (
                  <PrSpark points={prHistory.get(r.name)!.slice(-8)} />
                )}
                <div className="shrink-0 text-right">
                  <p className="text-kpi-sm font-bold leading-none tabular-nums text-content-primary">
                    {r.best.toFixed(1).replace('.', ',')}
                  </p>
                  <p className="font-mono text-chart-label font-medium uppercase tracking-[0.08em] text-content-muted">
                    kg · e1RM
                  </p>
                </div>
              </m.div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Pustaka gerakan — katalog pasangan kanan (7) ===== */}
      <section aria-label="Pustaka gerakan" className="@[52rem]:col-span-7">
        <div className="flex items-center gap-2 px-0.5">
          <h2 className="text-section font-semibold tracking-tight text-content-secondary">
            Pustaka Gerakan
          </h2>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-eyebrow font-semibold text-success">
            {EX_LIB.length}
          </span>
        </div>

        {/* Pencarian pustaka — entrance fade+rise standar (audit Tahap 2:
            tanpa blur — BlurFade dipensiunkan dari informasi harian). */}
        <m.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...motionTokens.preset.chipReveal, delay: motionTokens.delay.tight }}
          className="mt-3"
        >
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
            <Input
              value={libQuery}
              onChange={(e) => setLibQuery(e.target.value)}
              placeholder="Cari gerakan atau otot…"
              className="h-11 rounded-xl border-border bg-surface-primary pl-10 text-body text-content-primary shadow-soft placeholder:text-content-muted focus-visible:border-primary/50 focus-visible:ring-primary/20"
            />
          </div>
        </m.div>

        <div className="relative mt-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {['Semua', ...MUSCLE_GROUPS].map((g) => {
              const active = libMuscle === g
              return (
                <button
                  key={g}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setLibMuscle(g)}
                  className={
                    'interactive h-8 shrink-0 cursor-pointer rounded-full px-3.5 text-meta font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
                    (active
                      ? 'bg-surface-inverse text-content-inverse shadow-soft'
                      : 'border border-border bg-surface-primary text-content-secondary hover:bg-secondary')
                  }
                >
                  {g}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          {filteredLib.map((e) => (
            <ExerciseCard key={e.name} name={e.name} />
          ))}
          {filteredLib.length === 0 && (
            <RutinaEmptyState
              icon={<Dumbbell />}
              title="Tidak ada gerakan cocok"
              description={`Coba kata kunci lain atau ganti filter otot — ${EX_LIB.length} gerakan barbel siap dipilih.`}
            />
          )}
        </div>
      </section>
          </div>
        </div>

        <div className={tab === 'asupan' ? 'block' : 'hidden'}>
          <AsupanPanel />
        </div>

        <div className={tab === 'tubuh' ? 'block' : 'hidden'}>
          <TubuhPanel />
        </div>

      {/* Mode sesi latihan imersif — fixed overlay di atas navigasi bawah;
          state sesi hidup di session-store sehingga tetap berjalan walau
          layar ini unmount saat berpindah tab. */}
      <SessionPickerSheet
        open={sessionPickerOpen}
        onClose={() => setSessionPickerOpen(false)}
      />
      <BarbellToolsSheet open={barbellOpen} onClose={() => setBarbellOpen(false)} />
      <WorkoutSessionOverlay />
    </div>
  )
}
