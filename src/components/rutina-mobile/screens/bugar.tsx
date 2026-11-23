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
  exStatOf,
  filterWorkouts,
  isCardioKind,
  kcalOf,
  KIND_LABEL,
  latestWeight,
  paceOf,
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
  KIT_META,
  MUSCLE_GROUPS,
  PROG_DB,
  equipmentClass,
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
import { TrainingCalendar } from '../fitness/training-calendar'
import { ExerciseDetailSheet } from '../fitness/exercise-detail-sheet'
import { SmoothScrollArea } from '../smooth-scroll-area'
import { WordReveal } from '../word-reveal'
import { MotionCard } from '../rutina-motion-card'
import { MuscleBalanceCard } from '../fitness/muscle-balance-card'
import { PaceTrack } from '../visualizations/fitness/pace-track'
import { useCheckInSheet } from '../checkin-sheet'
import { RutinaEmptyState } from '../rutina-empty-state'
import { RutinaSectionHeader } from '../rutina-section-header'
import { RutinaBentoGrid, RutinaBentoItem } from '../rutina-bento'

import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'
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

/** Pagar riwayat (audit v2.37) — sesi terbaru yang tampil di awal. */
const HISTORY_LIMIT = 5
/** Pustaka gerakan: pratinjau per grup otot sebelum "Tampilkan semua". */
const LIB_GROUP_PREVIEW = 3

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
  /* v2.35 anti-replay — kartu program hanya diantar pada kunjungan pertama
     Studio; expand/detail tetap dianimasikan (interaksi, bukan replay).
     v2.38: key per-blok — kunci bersama membuat blok yang dimount
     belakangan tak pernah dianimasikan. */
  const playEntrance = useFirstVisit('bugar-studio-program')

  return (
    <m.div
      initial={playEntrance ? { opacity: 0, y: 14 } : false}
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
  /* v2.35 anti-replay — baris riwayat hanya naik beruntun pada kunjungan
     pertama; filter/ganti subtab tampil instan. Key per-blok agar
     riwayat (dimount belakangan) tetap mendapat giliran animasinya. */
  const playEntrance = useFirstVisit('bugar-studio-history')
  const isStrength = w.kind === 'beban'
  const isCardio = isCardioKind(w.kind)
  const tonase = tonaseOf(w)
  const reps = totalRepsOf(w)
  const best = bestE1rmIn(w)
  const kcal = kcalOf(w, bodyWeight)
  const { Icon, cls } = kindVisual(w)
  /* v2.45 (audit F5): pakai paceOf tunggal — implementasi ganda bisa
     melahirkan "6'60"" (pembulatan tanpa clamp). */
  const pace =
    isCardio && (w.distance ?? 0) > 0 && w.duration > 0
      ? paceOf(w.duration, w.distance!)
      : null
  const uniqueMoves = new Set(w.sets.map((s) => s.exercise)).size

  return (
    <m.div
      initial={playEntrance ? { opacity: 0, y: 14 } : false}
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
                    className="h-10 flex-1 rounded-full bg-destructive text-note font-bold text-destructive-foreground hover:bg-destructive/90"
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

function ExerciseCard({
  name,
  onOpenDetail,
}: {
  name: string
  onOpenDetail?: (name: string) => void
}) {
  const openWorkoutSheet = useRutina((s) => s.openWorkoutSheet)
  const workouts = useRutina((s) => s.workouts)
  const ex = EX_LIB.find((e) => e.name === name)
  const [expanded, setExpanded] = useState(false)
  /* Riwayat nyata gerakan ini (review v2.44) — chip jumlah sesi di
     baris utama + pintu riwayat/e1RM di detail. */
  const recorded = useMemo(
    () => (ex ? exStatOf(workouts, ex.name).sessions : 0),
    [workouts, ex],
  )
  if (!ex) return null

  return (
    /* v2.59 (audit Tahap 2): baris ledger RINGKAS — tanpa bingkai/bayangan
       per gerakan (aturan global: tidak semua item daftar dapat kartu);
       pemisah hairline datang dari divide-y wadah daftar. */
    <m.div layout="position" className="py-2.5 first:pt-0.5 last:pb-0.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="interactive flex w-full cursor-pointer items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-semibold text-content-primary">
            {ex.idName}
          </span>
          <span className="mt-0.5 block truncate text-eyebrow font-medium text-content-muted">
            {ex.name} · {ex.muscle} · {EX_LEVELS[ex.level]}
          </span>
        </span>
        {/* Chip kelas alat — kebutuhan alat terlihat tanpa expand
            (alat rumah pengguna: barbel saja, tanpa bangku/rak/bar
            gantung); shrink-0 agar chip tidak tergencet nama. Chip sesi
            tercatat hanya muncul bila gerakan punya histori (v2.44). */}
        {recorded > 0 && (
          <span className="h-6 shrink-0 rounded-full bg-gold/20 px-2 text-[10px] font-bold leading-6 text-warning tabular-nums">
            {recorded} sesi
          </span>
        )}
        <span
          className={`h-6 shrink-0 rounded-full px-2 text-[10px] font-bold leading-6 ${
            KIT_META[equipmentClass(ex)].chip
          }`}
        >
          {KIT_META[equipmentClass(ex)].label}
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
              <div className="flex gap-2">
                {/* Pintu riwayat (review v2.44) — hanya bila gerakan
                    ini punya histori tercatat. */}
                {recorded > 0 && onOpenDetail && (
                  <button
                    type="button"
                    onClick={() => onOpenDetail(ex.name)}
                    className="interactive h-9 flex-1 cursor-pointer rounded-full border border-border-strong text-note font-bold text-content-secondary transition-colors hover:bg-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Riwayat &amp; e1RM
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    openWorkoutSheet([{ name: ex.name, count: 3, reps: 8 }])
                  }
                  className="interactive flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-surface-inverse px-3 text-note font-bold text-content-inverse hover:bg-surface-inverse-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Catat gerakan ini
                </button>
              </div>
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

/* Ikon jenis aktivitas — dipakai kartu Aktivitas Pekan Ini. */
const MIX_KIND_ICON = {
  beban: Dumbbell,
  jalan: Footprints,
  lari: Zap,
  'lari-jalan': Zap,
  badminton: Volleyball,
} as const

/* ===== Aktivitas pekan ini — mode per jenis olahraga (review UI/UX
   v2.44) =====
   SATU kartu, EMPAT mode baca: Semua / Lari & Jalan / Badminton / Barbel.
   Tiap mode membawa metrik + satuan sendiri — km, menit, dan kg tidak
   pernah berbagi satu sumbu (aturan review). Mode Semua mempertahankan
   ikon jenis per hari + tonase mini (audit v2.37); mode fokus mengganti
   batang ke satuan metriknya. Ketuk hari untuk detail sesi. */
type WeekMode = 'semua' | 'kardio' | 'badminton' | 'beban'

const WEEK_MODES: { id: WeekMode; label: string }[] = [
  { id: 'semua', label: 'Semua' },
  { id: 'kardio', label: 'Lari & Jalan' },
  { id: 'badminton', label: 'Badminton' },
  { id: 'beban', label: 'Barbel' },
]

/** Metrik & filter per mode — `of` adalah nilai sumbu hari/tren. */
const WEEK_MODE_META: Record<
  WeekMode,
  {
    unit: 'kg' | 'km' | 'mnt'
    metricName: string
    trendLabel: string
    match: (w: Workout) => boolean
    of: (w: Workout) => number
  }
> = {
  semua: {
    unit: 'kg',
    metricName: 'tonase',
    trendLabel: 'Tonase 6 pekan',
    match: () => true,
    of: (w) => tonaseOf(w),
  },
  kardio: {
    unit: 'km',
    metricName: 'jarak',
    trendLabel: 'Jarak 6 pekan',
    match: (w) => isCardioKind(w.kind),
    of: (w) => (isCardioKind(w.kind) ? (w.distance ?? 0) : 0),
  },
  badminton: {
    unit: 'mnt',
    metricName: 'durasi',
    trendLabel: 'Durasi 6 pekan',
    match: (w) => w.kind === 'badminton',
    of: (w) => (w.kind === 'badminton' ? w.duration || 0 : 0),
  },
  beban: {
    unit: 'kg',
    metricName: 'tonase',
    trendLabel: 'Tonase 6 pekan',
    match: (w) => w.kind === 'beban',
    of: (w) => tonaseOf(w),
  },
}

function WeekActivityCard({ embedded = false }: { embedded?: boolean }) {
  const workouts = useRutina((s) => s.workouts)
  const reducedMotion = useReducedMotion()
  /* v2.35 anti-replay — pengungkapan hanya kunjungan pertama. */
  const playEntrance = useFirstVisit('bugar-studio-tonase')
  const [selIdx, setSelIdx] = useState<number | null>(null)
  /* Mode baca (review v2.44) — default Semua (perilaku lama). */
  const [mode, setMode] = useState<WeekMode>('semua')
  const meta = WEEK_MODE_META[mode]
  /* Bahasa visual batang per satuan mode (v2.47): kg = kolom piringan,
     km = jalur pin rute, mnt = penanda kokop. */
  const isKgMode = meta.unit === 'kg'

  const { days, sessions, values, lastValues, max, weeks } = useMemo(() => {
    const M = WEEK_MODE_META[mode]
    const start = weekRange().start
    const days = Array.from({ length: 7 }, (_, i) => addDaysISO(start, i))
    const sessions = days.map((d) =>
      workouts.filter((w) => w.date === d && M.match(w)),
    )
    const valueOn = (list: Workout[]) => list.reduce((a, w) => a + M.of(w), 0)
    const values = sessions.map(valueOn)
    const lastValues = days.map((d) =>
      valueOn(
        workouts.filter((w) => w.date === addDaysISO(d, -7) && M.match(w)),
      ),
    )
    /* Tren 6 pekan (v2.39 audit visual data) — satu angka per pekan
       dalam SATUAN MODE AKTIF; footer hero hanya membawa angka pekan
       BERJALAN, tren multi-pekan selama ini tak tergambar. */
    const weeks = Array.from({ length: 6 }, (_, k) => {
      const wStart = addDaysISO(start, -7 * (5 - k))
      const wEnd = addDaysISO(wStart, 6)
      const total = workouts
        .filter((w) => w.date >= wStart && w.date <= wEnd && M.match(w))
        .reduce((a, w) => a + M.of(w), 0)
      return { start: wStart, total }
    })
    return {
      days,
      sessions,
      values,
      lastValues,
      max: Math.max(...values, 0),
      weeks,
    }
  }, [workouts, mode])

  const today = todayISO()
  const fmtKg = (n: number) => `${Math.round(n).toLocaleString('id-ID')} kg`
  const fmtKm = (n: number) => `${n.toFixed(1).replace('.', ',')} km`
  const fmtMode = (n: number) =>
    mode === 'kardio'
      ? fmtKm(n)
      : mode === 'badminton'
        ? durationLabel(Math.round(n))
        : fmtKg(n)
  const total = values.reduce((a, b) => a + b, 0)
  const lastTotal = lastValues.reduce((a, b) => a + b, 0)
  const sessionCount = sessions.reduce((a, s) => a + s.length, 0)
  const activeDays = sessions.filter((s) => s.length > 0).length
  const totalMinutes = sessions.reduce(
    (a, s) => a + s.reduce((b, w) => b + (w.duration || 0), 0),
    0,
  )
  const setCount = sessions.reduce(
    (a, s) => a + s.reduce((b, w) => b + w.sets.length, 0),
    0,
  )
  const weekDelta =
    lastTotal > 0 ? Math.round(((total - lastTotal) / lastTotal) * 100) : null
  const deltaTxt =
    weekDelta != null
      ? ` (${weekDelta >= 0 ? '+' : '−'}${Math.abs(weekDelta)}%)`
      : ''
  const headerRight =
    sessionCount === 0
      ? mode === 'semua'
        ? 'pekan ini belum ada sesi'
        : `pekan ini belum ada ${
            WEEK_MODES.find((x) => x.id === mode)?.label.toLowerCase() ?? 'sesi'
          }`
      : mode === 'kardio'
        ? `${fmtKm(total)} · ${sessionCount} sesi${deltaTxt}`
        : mode === 'badminton'
          ? `${sessionCount} sesi · ${durationLabel(totalMinutes)}`
          : /* v2.45 (audit F9): pekan kardio/badminton murni dalam mode
             Semua — "0 kg · 3 sesi" terbaca seperti error; tonase memang
             tak relevan tanpa sesi beban. */
            total === 0 && sessionCount > 0
            ? `${sessionCount} sesi · ${durationLabel(totalMinutes)}`
            : `${fmtKg(total)} · ${sessionCount} sesi${deltaTxt}`

  /* KPI mini per mode (review v2.44) — metrik yang relevan untuk
     olahraganya: sesi/hari aktif/durasi untuk Semua; jarak-durasi-pace
     untuk kardio; sesi-durasi untuk badminton; sesi-tonase-set barbel. */
  const avgPace = paceOf(totalMinutes, total)
  const kpis: { label: string; value: string }[] =
    mode === 'kardio'
      ? [
          { label: 'Jarak', value: fmtKm(total) },
          { label: 'Durasi', value: durationLabel(totalMinutes) },
          { label: 'Pace rata²', value: avgPace ? `${avgPace} /km` : '—' },
        ]
      : mode === 'badminton'
        ? [
            { label: 'Sesi', value: String(sessionCount) },
            { label: 'Total durasi', value: durationLabel(totalMinutes) },
            { label: 'Hari aktif', value: `${activeDays}/7` },
          ]
        : mode === 'beban'
          ? [
              { label: 'Sesi', value: String(sessionCount) },
              { label: 'Tonase', value: fmtKg(total) },
              { label: 'Set', value: String(setCount) },
            ]
          : [
              { label: 'Sesi', value: String(sessionCount) },
              { label: 'Hari aktif', value: `${activeDays}/7` },
              { label: 'Durasi', value: durationLabel(totalMinutes) },
            ]

  const sel = selIdx != null ? { iso: days[selIdx]!, list: sessions[selIdx]! } : null

  return (
    <m.section
      initial={playEntrance ? { opacity: 0, y: 14 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{
        ...motionTokens.preset.chipReveal,
        delay: motionTokens.delay.tight,
      }}
      aria-label={`Aktivitas pekan ini — mode ${
        WEEK_MODES.find((x) => x.id === mode)?.label ?? 'Semua'
      }`}
      /* v2.59 (audit Tahap 2): mode embedded — kartu melebur ke unit hero
         ringkasan pekan (KPI + metrik + grafik utama dalam SATU tile);
         tanpa bingkai/bayangan sendiri, hanya pembatas hairline. */
      className={
        embedded
          ? 'mt-4 border-t border-border-default pt-4'
          : 'mt-[var(--layout-gap)] rounded-xl border border-border bg-surface-primary p-4 shadow-soft'
      }
    >
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h2 className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-secondary">
          Aktivitas Pekan Ini
        </h2>
        <p
          className={`text-eyebrow font-medium tabular-nums ${
            sessionCount > 0 ? 'text-module-accent-strong' : 'text-content-muted'
          }`}
        >
          {headerRight}
        </p>
      </div>

      {/* Mode baca (review v2.44) — Semua / Lari & Jalan / Badminton /
          Barbel; tiap mode mengganti KPI, satuan batang, detail hari,
          dan tren 6 pekan. */}
      <RutinaTabs
        value={mode}
        onValueChange={(v) => {
          setMode(v as WeekMode)
          setSelIdx(null)
        }}
      >
        <RutinaTabsList
          variant="segment"
          aria-label="Mode analisis aktivitas mingguan"
          className="mt-3 h-9 w-full rounded-full border-transparent bg-surface-sunken p-1"
        >
          {WEEK_MODES.map((x) => (
            <RutinaTabsTrigger
              key={x.id}
              value={x.id}
              className="h-7 flex-1 px-1 text-eyebrow"
            >
              {x.label}
            </RutinaTabsTrigger>
          ))}
        </RutinaTabsList>
      </RutinaTabs>

      {/* KPI mini per mode — angka utama kartu standar review
          (metrik + satuan jelas sebelum membaca grafik). Mode 'semua'
          disembunyikan saat embedded: angka sesi/hari-aktif/durasi sudah
          terbaca di rel & baris metrik hero — tidak digandakan (v2.59). */}
      {(mode !== 'semua' || !embedded) && (
      <div
        className="mt-3 grid grid-cols-3 gap-2"
        role="group"
        aria-label={`Ringkasan ${
          WEEK_MODES.find((x) => x.id === mode)?.label ?? ''
        } pekan ini`}
      >
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-lg bg-surface-sunken px-2.5 py-2 text-center"
          >
            <p className="text-body font-bold leading-tight tabular-nums text-content-primary">
              {k.value}
            </p>
            <p className="mt-0.5 text-chart-label font-medium uppercase tracking-[0.08em] text-content-muted">
              {k.label}
            </p>
          </div>
        ))}
      </div>
      )}

      {/* Tujuh kolom hari — ikon jenis aktivitas di atas, batang tonase
          mini di bawah; satu ketukan membuka detail hari lengkap. */}
      <div
        className="mt-3 flex gap-1.5"
        role="group"
        /* v2.45 (audit F8): label sadar-mode — "tonase" hanya benar untuk
           barbel/semua; kardio = jarak, badminton = durasi. */
        aria-label={`Jenis aktivitas dan ${meta.metricName} per hari, Senin sampai Minggu`}
      >
        {days.map((iso, i) => {
          const isFuture = iso > today
          const isToday = iso === today
          const isSel = selIdx === i
          const list = sessions[i]!
          const shown = list.slice(0, 3)
          const extra = list.length - shown.length
          const v = values[i]!
          const hasTonase = v > 0
          /* Batang tonase — proporsional; hari tanpa beban stub tipis. */
          const barH = hasTonase ? Math.max((v / max) * 100, 25) : 8
          return (
            <button
              key={iso}
              type="button"
              aria-pressed={isSel}
              aria-label={`${TONASE_DAY_NAMES[i]} ${shortDateLabel(iso)}: ${
                isFuture
                  ? 'belum terjadi'
                  : list.length === 0
                    ? 'tidak ada aktivitas'
                    : list
                        .map(
                          (w) =>
                            `${KIND_LABEL[w.kind]} ${durationLabel(w.duration)}`,
                        )
                        .join(', ') +
                      (v > 0 ? `, ${meta.metricName} ${fmtMode(v)}` : '')
              }`}
              onClick={() => setSelIdx(isSel ? null : i)}
              className="interactive group flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-strong"
            >
              {/* Sel jenis aktivitas — ikon per sesi (maks 3 + sisa). */}
              <div
                className={`flex h-10 w-full flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 ${
                  isFuture
                    ? 'bg-surface-sunken/50'
                    : list.length > 0
                      ? isSel
                        ? 'bg-module-accent/20'
                        : 'bg-surface-sunken group-hover:bg-secondary/60'
                      : 'bg-surface-sunken/50'
                }`}
              >
                {shown.length === 0 ? (
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${
                      isFuture ? 'bg-border' : 'bg-border-strong'
                    }`}
                  />
                ) : (
                  <>
                    {shown.map((w, j) => {
                      const Icon = MIX_KIND_ICON[w.kind]
                      return (
                        <Icon
                          key={`${w.id}-${j}`}
                          aria-hidden="true"
                          className={`h-3 w-3 ${
                            w.kind === 'beban'
                              ? 'text-chart-stroke-4'
                              : w.kind === 'badminton'
                                ? 'text-cocoa'
                                : 'text-module-accent-strong'
                          }`}
                        />
                      )
                    })}
                    {extra > 0 && (
                      <span className="text-[10px] font-bold tabular-nums text-content-muted">
                        +{extra}
                      </span>
                    )}
                  </>
                )}
              </div>
              {/* Batang metrik mini — tinggi proporsional nilai mode;
                  bentuk berganti per satuan: kg = kolom piringan (garis
                  piringan dekoratif), km = jalur ramping + pin rute,
                  mnt = batang + penanda kokop. Hari tanpa nilai tetap
                  stub netral. */}
              <div className="flex h-10 w-full items-end justify-center">
                <m.div
                  initial={playEntrance ? { scaleY: 0 } : { scaleY: 1 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{
                    duration: reducedMotion ? 0 : motionTokens.preset.data.duration,
                    delay: reducedMotion
                      ? 0
                      : i * motionTokens.stagger.normal,
                    ease: motionTokens.easing.standard,
                  }}
                  style={{ height: `${barH}%`, transformOrigin: 'bottom' }}
                  className={`relative transition-colors ${
                    isKgMode
                      ? 'w-[62%] rounded-t-md'
                      : mode === 'kardio'
                        ? 'w-2 rounded-full'
                        : 'w-full rounded-full'
                  } ${
                    isSel
                      ? 'bg-module-accent-strong'
                      : hasTonase
                        ? 'bg-module-accent/70 group-hover:bg-module-accent'
                        : 'bg-module-accent/15'
                  }`}
                >
                  {/* Garis piringan dekoratif — posisi tetap, bukan hitungan
                      piringan fisik. */}
                  {hasTonase && isKgMode && (
                    <>
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-1/4 h-px bg-surface-primary/40"
                      />
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-1/2 h-px bg-surface-primary/40"
                      />
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-3/4 h-px bg-surface-primary/40"
                      />
                    </>
                  )}
                  {/* Pin rute — penanda titik jangkauan kardio. */}
                  {hasTonase && mode === 'kardio' && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full border-2 border-surface-primary bg-module-accent-strong"
                    />
                  )}
                  {/* Penanda kokop — cincin di puncak batang durasi. */}
                  {hasTonase && mode === 'badminton' && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full border-2 border-module-accent bg-surface-primary/80"
                    />
                  )}
                </m.div>
              </div>
              <span
                className={`text-chart-label font-semibold ${
                  isSel || isToday
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

      {/* Detail hari terpilih — membedakan jenis aktivitas & satuannya:
          daftar sesi (jenis · durasi · km · kg) + perbandingan tonase
          vs hari sama pekan lalu. */}
      <AnimatePresence initial={false}>
        {sel && (
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
                {TONASE_DAY_NAMES[selIdx ?? 0]} · {shortDateLabel(sel.iso)}
                {sel.list.length === 0 && ' · tidak ada aktivitas'}
              </p>
              {sel.list.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {sel.list.map((w) => {
                    const Icon = MIX_KIND_ICON[w.kind]
                    return (
                      <li
                        key={w.id}
                        className="flex items-center gap-2 text-meta tabular-nums text-content-muted"
                      >
                        <Icon
                          aria-hidden="true"
                          className={`h-3.5 w-3.5 shrink-0 ${
                            w.kind === 'beban'
                              ? 'text-chart-stroke-4'
                              : w.kind === 'badminton'
                                ? 'text-cocoa'
                                : 'text-module-accent-strong'
                          }`}
                        />
                        <span className="font-semibold text-content-secondary">
                          {KIND_LABEL[w.kind]}
                        </span>
                        <span>{durationLabel(w.duration)}</span>
                        {(w.distance ?? 0) > 0 && (
                          <span>
                            {w.distance!.toFixed(1).replace('.', ',')} km
                          </span>
                        )}
                        {w.kind === 'beban' && tonaseOf(w) > 0 && (
                          <span>
                            {Math.round(tonaseOf(w)).toLocaleString('id-ID')} kg
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
              {(() => {
                /* Baris metrik hari (satuan mode aktif) — muncul bila
                    hari terpilih punya nilai pada mode itu. */
                const v = values[selIdx ?? 0] ?? 0
                const lv = lastValues[selIdx ?? 0] ?? 0
                if (v === 0) return null
                const d = lv > 0 ? Math.round(((v - lv) / lv) * 100) : null
                const metricLabel =
                  mode === 'kardio'
                    ? 'Jarak'
                    : mode === 'badminton'
                      ? 'Durasi'
                      : 'Tonase'
                return (
                  <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-meta tabular-nums text-content-muted">
                    <span>
                      {metricLabel} {fmtMode(v)}
                    </span>
                    {d == null ? (
                      <span className="text-success">
                        pekan lalu 0 — baru tercatat
                      </span>
                    ) : (
                      <span className={d >= 0 ? 'text-success' : 'text-content-danger'}>
                        vs hari sama lalu ({fmtMode(lv)}): {d >= 0 ? '+' : '−'}
                        {Math.abs(d)}%
                      </span>
                    )}
                  </p>
                )
              })()}
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Tren 6 pekan (v2.39 audit visual data; satuan mode aktif sejak
          review v2.44) — satu bar per pekan, pekan berjalan disorot;
          skala relatif pekan terberat. Label kolom = tanggal Senin
          pekan itu (d/b), kolom akhir “ini” berpasangan dengan KPI
          mode di atas. */}
      {(() => {
        const weeksMax = Math.max(...weeks.map((w) => w.total), 0)
        if (weeksMax <= 0) return null
        const weeksAvg =
          weeks.reduce((a, w) => a + w.total, 0) / weeks.length
        const fmtMonday = (iso: string) => {
          const d = new Date(iso + 'T00:00:00')
          return `${d.getDate()}/${d.getMonth() + 1}`
        }
        return (
          <div className="mt-4 border-t border-border-default pt-3">
            <div className="flex items-baseline justify-between gap-2 px-0.5">
              <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                {meta.trendLabel}
              </p>
              <p className="text-eyebrow font-medium tabular-nums text-content-muted">
                rata² {fmtMode(weeksAvg)}/pekan
              </p>
            </div>
            <div
              className="mt-2 flex h-12 gap-1.5"
              role="img"
              aria-label={`${meta.trendLabel} (${meta.unit}): ${weeks
                .map(
                  (wk, i) =>
                    `${
                      i === weeks.length - 1
                        ? 'pekan ini'
                        : `pekan ${fmtMonday(wk.start)}`
                    } ${fmtMode(wk.total)}`,
                )
                .join(', ')}`}
            >
              {weeks.map((wk, i) => {
                const isCurrent = i === weeks.length - 1
                const h =
                  wk.total <= 0
                    ? 5
                    : Math.max(12, Math.round((wk.total / weeksMax) * 100))
                return (
                  <div
                    key={wk.start}
                    className="flex h-full min-w-0 flex-1 flex-col gap-1"
                  >
                    <div className="flex w-full flex-1 items-end">
                      <m.div
                        className={
                          'relative w-full origin-bottom rounded-full ' +
                          (isCurrent
                            ? 'bg-module-accent-strong'
                            : wk.total > 0
                              ? 'bg-module-accent/55'
                              : 'bg-module-accent/15')
                        }
                        style={{ height: `${h}%` }}
                        initial={playEntrance ? { scaleY: 0 } : false}
                        animate={{ scaleY: 1 }}
                        transition={{
                          duration: reducedMotion
                            ? 0
                            : motionTokens.preset.data.duration,
                          delay: reducedMotion
                            ? 0
                            : i * motionTokens.stagger.normal,
                          ease: motionTokens.easing.standard,
                        }}
                      >
                        {/* Penanda puncak per mode (v2.47) — tutup piringan
                            (garis 2px lebih gelap) untuk kg, pin rute untuk
                            km, penanda kokop untuk mnt. */}
                        {wk.total > 0 && isKgMode && (
                          <span
                            aria-hidden="true"
                            className={`absolute inset-x-0 top-0 h-0.5 rounded-t-full ${
                              isCurrent
                                ? /* v2.47.1: 30 → 55 — tutup piringan pekan
                                   berjalan terbaca pada kartu 320–390px. */
                                  'bg-espresso/55'
                                : 'bg-module-accent-strong/70'
                            }`}
                          />
                        )}
                        {wk.total > 0 && mode === 'kardio' && (
                          <span
                            aria-hidden="true"
                            className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full border-2 border-surface-primary bg-module-accent-strong"
                          />
                        )}
                        {wk.total > 0 && mode === 'badminton' && (
                          <span
                            aria-hidden="true"
                            className="absolute -top-1.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full border-2 border-module-accent bg-surface-primary/80"
                          />
                        )}
                      </m.div>
                    </div>
                    <span
                      className={
                        'text-center text-chart-label font-semibold ' +
                        (isCurrent
                          ? 'text-module-accent-strong'
                          : 'text-content-muted')
                      }
                    >
                      {isCurrent ? 'ini' : fmtMonday(wk.start)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}
    </m.section>
  )
}

/* ===== Tren kardio — SATU ruang, dua metrik (audit UX density v2.37:
   Perkembangan Jarak + PaceStrip digabung; dua unit tidak pernah
   berbagi satu sumbu — pengguna memilih metriknya).
   Jarak: batang km per sesi dalam jendela periode 30/90 hari / semua
   (di dalam rentang riwayat aktif).
   Pace: lintasan ilustratif menit/km (v2.50 Tahap 2) — hanya sesi
   dengan jarak & durasi valid, titik lebih tinggi = makin cepat;
   kurang dari 3 sesi menggambar lintasan kosong yang jujur. */
function CardioTrendCard({ sessions }: { sessions: Workout[] }) {
  const playEntrance = useFirstVisit('bugar-studio-tren')
  /* v2.49 (audit): gerbang eksplisit — morfologi tinggi batang (height)
     bukan transform, MotionConfig reducedMotion="user" tak menghentikannya. */
  const reducedMotion = useReducedMotion()
  const [metric, setMetric] = useState<'jarak' | 'pace'>('jarak')
  const [selIdx, setSelIdx] = useState<number | null>(null)
  /* Pilihan sesi pada lintasan pace berbasis id — indeks tak stabil
     saat periode berganti (pola selIdx untuk batang jarak). */
  const [paceSelId, setPaceSelId] = useState<string | null>(null)
  /* Periode deret (pola riwayat): jendela 30/90 hari — 'semua' tanpa
     jendela tetapi dibatasi 14 sesi terakhir agar batang/garis tetap
     terbaca. Menggunakan kembali WO_RANGES (label & id sama). */
  const [period, setPeriod] = useState<WoRange>('90')

  /* Jendela periode — hanya sesi dalam N hari terakhir (inklusif hari
     ini, konvensi filterWorkouts di fit-utils). */
  const windowed = useMemo(() => {
    if (period === 'semua') return sessions
    const from = addDaysISO(todayISO(), -(Number(period) - 1))
    return sessions.filter((w) => w.date >= from)
  }, [sessions, period])

  /* Deret jarak — sesi kardio dalam jendela periode, maks 8 sesi
     ('semua' dibatasi 10 — bukan 14 — agar tombol tetap ≥24px di 320px;
     preseden lembar detail gerakan "maks 10 sesi", audit v2.47.1;
     v2.49 menutup celah yang lolos). */
  const distSeries = useMemo(
    () => [...cardioSeries(windowed, period === 'semua' ? 10 : 8)].reverse(),
    [windowed, period],
  )
  /* Deret pace — sesi kardio dengan jarak & durasi valid, urut waktu.
     Pace numerik (durasi ÷ jarak) dihitung DI SINI di sumber deret —
     komponen lintasan murni presentasional (v2.50). */
  const pacePts = useMemo(
    () =>
      windowed
        .filter(
          (w) => isCardioKind(w.kind) && (w.distance ?? 0) > 0 && w.duration > 0,
        )
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(period === 'semua' ? -10 : -8)
        .map((w) => ({
          id: w.id,
          date: w.date,
          paceMinPerKm: w.duration / (w.distance ?? 1),
          distanceKm: w.distance ?? 0,
          durationMin: w.duration,
          kind: KIND_LABEL[w.kind],
        })),
    [windowed, period],
  )

  /* Kartu hanya hidup bila ada cukup sesi jarak; opsi Pace tetap
     dapat dibuka — deret pace < 3 sesi menggambar lintasan kosong
     di dalam komponen (bukan sumbu campuran, bukan garis palsu). */
  if (distSeries.length < 3) return null
  const activeMetric = metric

  const max = Math.max(...distSeries.map((d) => d.km), 0.1)
  const distSel =
    activeMetric === 'jarak' && selIdx !== null
      ? (distSeries[selIdx] ?? null)
      : null

  return (
    <m.div
      initial={playEntrance ? { opacity: 0, y: 14 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={motionTokens.preset.chipReveal}
      className="mt-3 rounded-xl border border-border bg-surface-primary p-4 shadow-soft"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-secondary">
          Tren Kardio
        </h3>
        {/* Pilihan metrik — Jarak | Pace; dua unit tidak pernah dicampur
            pada satu sumbu (audit v2.37). */}
        <div
          role="group"
          aria-label="Metrik tren kardio"
          className="flex gap-1 rounded-full bg-surface-sunken p-0.5"
        >
          {(['jarak', 'pace'] as const).map((mk) => {
            const on = activeMetric === mk
            return (
              <button
                key={mk}
                type="button"
                onClick={() => {
                  setMetric(mk)
                  setSelIdx(null)
                  setPaceSelId(null)
                }}
                aria-pressed={on}
                className={
                  'interactive h-7 cursor-pointer rounded-full px-3 text-eyebrow font-bold capitalize transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-strong ' +
                  (on
                    ? 'bg-surface-inverse text-content-inverse shadow-soft'
                    : 'text-content-secondary hover:text-content-primary')
                }
              >
                {mk === 'jarak' ? 'Jarak' : 'Pace'}
              </button>
            )
          })}
        </div>
      </div>

      {/* Periode deret — 30/90 hari / semua; baris kedua kepala karena
          di 390px tidak muat sebaris dengan toggle Jarak|Pace. Ganti
          periode melepas pilihan batang/titik (indeks tak lagi valid). */}
      <div className="mt-2 flex items-center justify-end">
        <div
          role="group"
          aria-label="Periode tren kardio"
          className="flex gap-1 rounded-full bg-surface-sunken p-0.5"
        >
          {WO_RANGES.map((p) => {
            const on = period === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPeriod(p.id)
                  setSelIdx(null)
                  setPaceSelId(null)
                }}
                aria-pressed={on}
                className={
                  'interactive h-7 cursor-pointer rounded-full px-3 text-eyebrow font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-strong ' +
                  (on
                    ? 'bg-surface-inverse text-content-inverse shadow-soft'
                    : 'text-content-secondary hover:text-content-primary')
                }
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {activeMetric === 'jarak' ? (
        <>
          <div
            className="mt-3 flex h-20 items-end gap-1.5"
            role="group"
            aria-label={`Grafik perkembangan jarak: ${distSeries
              .map((d) => `${shortDateLabel(d.date)} ${d.km.toFixed(1).replace('.', ',')} km`)
              .join(', ')}`}
          >
            {distSeries.map((d, i) => {
              const isSel = selIdx === i
              return (
                <button
                  key={`${d.date}-${i}`}
                  type="button"
                  aria-pressed={isSel}
                  aria-label={`${shortDateLabel(d.date)}: ${d.km.toFixed(2).replace('.', ',')} km`}
                  onClick={() => setSelIdx(isSel ? null : i)}
                  className="interactive group flex min-w-0 flex-1 cursor-pointer flex-col items-stretch rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-strong"
                >
                  <div className="flex h-16 w-full items-end">
                    <m.div
                      initial={false}
                      animate={{
                        height: `${Math.max(8, (d.km / max) * 100)}%`,
                      }}
                      transition={
                        reducedMotion
                          ? { duration: 0 }
                          : {
                              ...motionTokens.spring.chart,
                              delay: i * motionTokens.stagger.normal,
                            }
                      }
                      className={`w-full rounded-t-md transition-colors ${
                        isSel
                          ? 'bg-module-accent-strong'
                          : 'bg-module-accent/70 group-hover:bg-module-accent'
                      }`}
                    />
                  </div>
                </button>
              )
            })}
          </div>
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
              terjauh{' '}
              {Math.max(...distSeries.map((d) => d.km))
                .toFixed(2)
                .replace('.', ',')}{' '}
              km
            </span>
            <span>{shortDateLabel(distSeries[distSeries.length - 1]!.date)}</span>
          </div>
        </>
      ) : (
        /* Lintasan pace ilustratif (v2.50 Tahap 2) — menggantikan
            polyline: titik pelari di lane melengkung, naik = cepat;
            < 3 sesi valid menggambar lintasan kosong di dalamnya. */
        <div className="mt-3">
          <PaceTrack
            sessions={pacePts}
            selectedId={paceSelId}
            onSelect={setPaceSelId}
          />
        </div>
      )}
    </m.div>
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
  /* v2.35 anti-replay: pembuka Performance Studio hanya kunjungan pertama
     seumur sesi; subtab keep-alive (v2.30) menjaga state saat berpindah.
     Key kini spesifik blok hero — komponen blok lain punya gilirannya
     sendiri, tidak saling mencomot kunjungan pertama. */
  const playEntrance = useFirstVisit('bugar-studio-hero')
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
  /* Grup otot pustaka yang dibuka (audit v2.37 — collapsible;
     default: semua tertutup, pratinjau 3 gerakan per grup). */
  const [openLibGroups, setOpenLibGroups] = useState<Set<string>>(new Set())
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false)
  /* v2.81 (audit UX §C): pemilih mode "Catat aktivitas" — pintasan Lari/
     Jalan/Badminton/Barbel tidak lagi deret chip permanen di bawah CTA
     utama; dibuka kontekstual setelah pengguna memintanya. */
  const [activityPickerOpen, setActivityPickerOpen] = useState(false)
  /* Tampilan Riwayat Latihan (v2.59, audit Tahap 2): kalender | tren |
     daftar — satu pandangan per waktu di ponsel. */
  const [histView, setHistView] = useState<'kalender' | 'tren' | 'daftar'>(
    'kalender',
  )
  const [barbellOpen, setBarbellOpen] = useState(false)
  /* Detail progres satu gerakan (review v2.44) — nama gerakan yang
     lembar detailnya terbuka; null = tertutup. */
  const [exDetail, setExDetail] = useState<string | null>(null)
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
  /* Sesi kardio berjarak — dasar pesan jujur mode Tren (kartu tren
     menggambar diri sendiri nol bila < 3 sesi). */
  const cardioDistCount = useMemo(
    () => workouts.filter((w) => isCardioKind(w.kind) && (w.distance ?? 0) > 0).length,
    [workouts],
  )
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
  /* Pagar riwayat (audit UX density v2.37): kondisi awal hanya 5 sesi
     terbaru + 'Lihat semua riwayat (N)' — ratusan sesi tidak lagi
     menghentikan gulir awal; ponsel TANPA nested scroll (daftar tumbuh
     mengikuti halaman), ruang kerja ≥52rem tetap bergulir sendiri. */
  const [historyLimit, setHistoryLimit] = useState(HISTORY_LIMIT)
  const historySlice = filteredWorkouts.slice(0, historyLimit)
  const historyHidden = filteredWorkouts.length - historySlice.length
  const historyAll =
    historyHidden === 0 && filteredWorkouts.length > HISTORY_LIMIT

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

  /* Pustaka berkelompok otot (audit v2.37): search-first — saat mencari
     atau memfilter otot, daftar hasil FLAT tampil penuh; kondisi awal
     (Semua + tanpa kueri) mengelompokkan per otot dengan pratinjau 3
     gerakan + 'Tampilkan semua (N)' per grup. */
  const libFlatMode = libQuery.trim() !== '' || libMuscle !== 'Semua'
  const libGroups = useMemo(() => {
    if (libFlatMode) return []
    return MUSCLE_GROUPS.map((g) => ({
      key: g,
      items: filteredLib.filter((e) => e.muscle === g),
    })).filter((g) => g.items.length > 0)
  }, [filteredLib, libFlatMode])
  const toggleLibGroup = (key: string) =>
    setOpenLibGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <SmoothScrollArea
      data-module="bugar"
      data-layout="performance"
      /* v2.87: gulir halus Lenis per-wadah (roda) + ScrollTrigger.
         overscroll-contain + ritme padding tetap seperti aslinya. */
      className="overscroll-contain"
      contentClassName="px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-content-primary"
    >
      {/* Header studio performa — judul operasional Geist Sans tegas
          (bukan serif editorial); Tipografi System v1. */}
      <header>
        <p className="flex items-center gap-1.5 text-eyebrow font-semibold uppercase tracking-[0.16em] text-module-accent-strong">
          <Dumbbell className="h-3.5 w-3.5" />
          Gerak &amp; kekuatan
        </p>
        <WordReveal
          as="h1"
          text="Bugar"
          visitKey="bugar-title"
          suffix={<span className="text-module-accent">.</span>}
          className="mt-1.5 text-balance text-fluid-page font-bold leading-none"
        />
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
            initial={playEntrance ? { opacity: 0, y: 14 } : false}
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
          {/* v2.87: hero kini MotionCard — masuk saat terlihat + hover
              halus (motion.dev); entrance m.section lama dipensiunkan
              agar tidak ada gerak ganda. */}
          <MotionCard
            as="section"
            visitKey="bugar-hero"
            aria-label="Ringkasan latihan pekan ini"
            className="rounded-2xl bg-module-accent-strong p-5 text-module-accent-fg shadow-leaf @[24rem]:p-6"
          >
        <div className="relative z-10">
          {/* v2.46 Performance Studio (audit Warm Editorial P2.0): hero
              SPLIT — menit dominan kiri; rel metrik sekunder (sesi ·
              tonase · hari aktif) di kanan pada kontainer lega; ponsel
              menumpuk dengan menit tetap paling atas. */}
          <div className="flex flex-col gap-5 @[40rem]:flex-row @[40rem]:gap-7">
            <div className="min-w-0 flex-1">
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
                <Counter to={Math.round(week.minutes)} immediate={!playEntrance} />
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
                  initial={playEntrance ? { scaleX: 0 } : false}
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
              {/* v2.39 (audit visual data): petak sesi pekan — satu petak
                  per sesi sasaran, terisi per sesi selesai; angka N/M
                  sesi tetap di baris teks di atas. */}
              {fitTargets.sessions > 0 && (
                <div className="mt-2 flex items-center gap-1.5" aria-hidden="true">
                  {Array.from({ length: fitTargets.sessions }, (_, i) => (
                    <span
                      key={i}
                      className={
                        'h-1.5 flex-1 rounded-full ' +
                        (i < weekSessions
                          ? 'bg-module-accent-fg'
                          : 'bg-espresso/30')
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

            </div>

            {/* Rel metrik studio — sesi · tonase · hari aktif (audit:
                tonase/sesi/jarak/hari aktif = metrik SEKUNDER, jangan
                sama besar dengan menit); tonase tampil sebagai angka
                jelas, bukan sebaris eyebrow kaki. Ponsel: tiga petak
                sejajar di bawah menit. */}
            <m.div
              initial={playEntrance ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{
                ...motionTokens.preset.chipReveal,
                delay: motionTokens.delay.sweep,
              }}
              className="grid grid-cols-3 gap-3 @[40rem]:w-44 @[40rem]:grid-cols-1 @[40rem]:gap-4 @[40rem]:border-l @[40rem]:border-module-accent-fg/25 @[40rem]:pl-7"
            >
              <div className="min-w-0">
                <p className="flex items-baseline">
                  <span className="text-kpi-sm font-semibold leading-none tracking-tight tabular-nums">
                    {weekSessions}
                  </span>
                  <span className="ml-0.5 text-note font-medium text-module-accent-fg/85">sesi</span>
                </p>
                <p className="mt-1 text-eyebrow font-medium leading-snug text-module-accent-fg/80">
                  total sesi
                </p>
              </div>
              <div className="min-w-0">
                <p className="flex items-baseline">
                  <span className="text-kpi-sm font-semibold leading-none tracking-tight tabular-nums">
                    {week.tonase >= 1000
                      ? `${(week.tonase / 1000).toFixed(1).replace('.', ',')} t`
                      : Math.round(week.tonase).toLocaleString('id-ID')}
                  </span>
                  {week.tonase < 1000 && (
                    <span className="ml-0.5 text-note font-medium text-module-accent-fg/85">kg</span>
                  )}
                </p>
                <p className="mt-1 text-eyebrow font-medium leading-snug text-module-accent-fg/80">
                  tonase barbel
                </p>
              </div>
              <div className="min-w-0">
                <p className="flex items-baseline">
                  <span className="text-kpi-sm font-semibold leading-none tracking-tight tabular-nums">
                    {week.activeDays}
                  </span>
                  <span className="ml-0.5 text-note font-medium text-module-accent-fg/85">hari</span>
                </p>
                <p className="mt-1 text-eyebrow font-medium leading-snug text-module-accent-fg/80">
                  hari aktif
                </p>
              </div>
            </m.div>
          </div>

          {/* Tiga metrik mode — baris kecil di bawah hairline; angka dari
              histori nyata, bukan target (v2.17). Sesi total & hari aktif
              telah naik ke rel kanan hero. Fade digerbangi firstVisit
              hero agar tidak mengulang tiap remount tab (anti-replay). */}
          <m.div
            initial={playEntrance ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{
              ...motionTokens.preset.chipReveal,
              delay: motionTokens.delay.sweep,
            }}
            className="mt-4 grid grid-cols-3 gap-3 border-t border-module-accent-fg/25 pt-4"
          >
            <div className="min-w-0">
              <p className="flex items-baseline">
                <span className="text-kpi-sm font-semibold leading-none tracking-tight tabular-nums">
                  {week.runKm > 0 ? week.runKm.toFixed(1).replace('.', ',') : 0}
                </span>
                <span className="ml-0.5 text-note font-medium text-module-accent-fg/85">km</span>
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
                <span className="ml-0.5 text-note font-medium text-module-accent-fg/85">jam</span>
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
                <span className="ml-0.5 text-note font-medium text-module-accent-fg/85">sesi</span>
              </p>
              <p className="mt-1 text-eyebrow font-medium leading-snug text-module-accent-fg/80">
                latihan barbel
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

          {/* Footer angka pekan — estimasi kkal terbakar dalam satu baris
              eyebrow ringkas; tonase barbel telah naik ke rel metrik hero
              (v2.46) agar tidak tumpang-tindih dengan metrik utama. */}
          {weekKcal > 0 && (
            <p className="mt-2.5 text-eyebrow font-medium leading-relaxed text-module-accent-fg/80">
              {`≈ ${weekKcal.toLocaleString('id-ID')} kkal terbakar pekan ini${
                weight == null ? ' (asumsi 60 kg — timbang dirimu di tab Tubuh)' : ''
              }`}
            </p>
          )}
        </div>
      </MotionCard>

      {/* Tombol utama dominan — SATU CTA terbesar di layar (matcha
          aksi, audit Tahap 2); pintasan mode di bawahnya jadi chip
          ringkas sekunder yang tidak bersaing ukuran. */}
      <m.button
        type="button"
        onClick={() => setSessionPickerOpen(true)}
        whileTap={{ scale: 0.97 }}
        initial={playEntrance ? { opacity: 0, y: 14 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...motionTokens.preset.chipReveal, delay: motionTokens.delay.tight }}
        className="interactive mt-4 flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary text-section font-bold text-primary-foreground shadow-lift hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Play className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
        Mulai Sesi Barbel
      </m.button>

      {/* Catat aktivitas lain (v2.81, audit UX §C) — pintasan mode kini
          dibuka lewat SATU tombol sekunder (kontekstual), bukan deret
          chip horizontal permanen yang bersaing dengan CTA utama;
          pilihan lengkap tetap satu ketukan jauh. */}
      <div>
        <button
          type="button"
          onClick={() => setActivityPickerOpen((v) => !v)}
          aria-expanded={activityPickerOpen}
          aria-controls="pintasan-aktivitas"
          className="interactive mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border bg-surface-primary text-note font-bold text-content-secondary shadow-soft transition-colors hover:bg-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-strong"
        >
          <Plus
            className="h-4 w-4 text-module-accent-strong"
            aria-hidden="true"
          />
          Catat aktivitas
          <ChevronDown
            aria-hidden="true"
            className={
              'h-4 w-4 text-content-muted transition-transform duration-300 ' +
              (activityPickerOpen ? 'rotate-180' : '')
            }
          />
        </button>
        {activityPickerOpen && (
          <div
            id="pintasan-aktivitas"
            role="group"
            aria-label="Catat aktivitas baru"
            className="mt-2 flex flex-wrap gap-1.5"
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
        )}
      </div>

      {/* Grafik aktivitas pekan (v2.59, audit Tahap 2) — melebur ke unit
          hero ringkasan pekan: SATU tile = KPI utama + metrik ringkas +
          grafik aktivitas utama; tidak lagi kartu terpisah di bawah
          bento. Satuan tetap sadar-mode (kg / km / menit). */}
      <WeekActivityCard embedded />
              </RutinaBentoItem>
              <RutinaBentoItem span="feature">
      {/* ===== Coach Bugar — kesiapan, deload, guard, alat =====
          v2.59 (audit Tahap 2): SATU panel — kesiapan + SATU peringatan
          paling relevan + aksi Alat Barbel sebagai baris berpembatas
          hairline di dalam satu permukaan (dulu tiga kartu bertumpuk). */}
      <section aria-label="Coach Bugar">
        <RutinaSectionHeader
          eyebrow="Saran latihan"
          title="Coach Bugar"
          description="Kesiapan, deload, dan alat bantu — dihitung dari data latihanmu sendiri."
          accent
          reveal
          visitKey="bugar-coach-title"
        />
        {/* v2.87: kartu Coach kini MotionCard (masuk + hover). */}
        <MotionCard
          visitKey="bugar-coach"
          className="mt-3 rounded-xl border border-border bg-surface-primary shadow-soft"
        >
          {/* a. Kesiapan latihan — ringkas dari check-in hari ini */}
          <div className="p-4">
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
          </div>

          {/* b. SATU peringatan paling relevan — prioritas: deload aktif
              > plateau > guard kardio. Maksimal satu strip peringatan
              (di samping kesiapan) agar Coach bukan daftar panjang. */}
          {deloadOn && deloadUntil ? (
            <div className="border-t border-border bg-destructive/8 px-4 py-3.5">
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
                className="interactive mt-2.5 flex h-9 w-full cursor-pointer items-center justify-center rounded-full border border-destructive/45 text-note font-bold text-content-danger hover:bg-destructive/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
              >
                Akhiri deload sekarang
              </button>
            </div>
          ) : stalledNames.length > 0 ? (
            <div
              className="border-t border-border bg-destructive/8 px-4 py-3.5"
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
                className="interactive mt-2.5 flex h-9 w-full cursor-pointer items-center justify-center rounded-full bg-destructive text-note font-bold text-destructive-foreground hover:bg-destructive/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
              >
                Mulai deload 7 hari
              </button>
            </div>
          ) : guard.tooMuch && guard.suggestion ? (
            <div className="border-t border-border bg-surface-sunken px-4 py-3.5">
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
            </div>
          ) : null}

          {/* c. Pintasan Alat Barbel — alat bantu, bukan rekomendasi */}
          <button
            type="button"
            onClick={() => setBarbellOpen(true)}
            className="interactive flex w-full cursor-pointer items-center gap-3 border-t border-border bg-surface-primary p-4 text-left hover:bg-surface-secondary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
        </MotionCard>
      </section>
              </RutinaBentoItem>
            </RutinaBentoGrid>
          </m.div>

          {/* ===== Riwayat Latihan (v2.59, audit Tahap 2) — kalender
              bulanan, tren kardio, dan daftar sesi dalam SATU area
              dengan pemilih tampilan Kalender | Tren | Daftar; dulu:
              kalender kartu tersendiri + tren & daftar terkubur di
              kolom sempit ruang kerja. ===== */}
          <section aria-label="Riwayat latihan" className="mt-[var(--layout-gap)]">
            <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 text-section-lg font-bold tracking-tight text-content-primary">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-module-accent"
                  />
                  Riwayat Latihan
                </h2>
                <p className="mt-0.5 text-meta font-medium text-module-accent-strong">
                  kalender bulanan · tren kardio · daftar sesi
                </p>
              </div>
              <div
                role="group"
                aria-label="Tampilan riwayat latihan"
                className="flex shrink-0 gap-1 rounded-full border border-border bg-surface-sunken p-0.5"
              >
                {(
                  [
                    ['kalender', 'Kalender'],
                    ['tren', 'Tren'],
                    ['daftar', 'Daftar'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={histView === id}
                    onClick={() => setHistView(id)}
                    className={`interactive h-10 cursor-pointer rounded-full px-3.5 text-meta font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      histView === id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-content-secondary hover:text-content-primary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {histView === 'kalender' && (
              /* Kalender Latihan — Training Log pola Strava: konsistensi
                 bulanan lintas jenis aktivitas (titik kardio/badminton/
                 barbel); ketuk tanggal untuk detail sesi hari itu. */
              <div className="mt-3">
                <TrainingCalendar />
              </div>
            )}

            {histView === 'tren' && (
              /* Tren kardio — batang jarak / garis pace (PaceTrack);
                 periode 30/90/h-semua dikendalikan kartu sendiri. */
              <div className="mt-3">
                <CardioTrendCard sessions={workouts} />
                {cardioDistCount < 3 && (
                  <p className="mt-3 rounded-xl border border-dashed border-border-strong px-4 py-3.5 text-center text-meta font-medium leading-relaxed text-content-muted">
                    Tren kardio mulai terbaca setelah minimal 3 sesi
                    jalan/lari dengan jarak tercatat — catat lewat pintasan
                    di atas.
                  </p>
                )}
              </div>
            )}

            {histView === 'daftar' && (
              <div className="mt-3">
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
                  setHistoryLimit(HISTORY_LIMIT)
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
            setHistoryLimit(HISTORY_LIMIT)
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
        {/* Daftar riwayat — hairline ledger-row per item (audit Tahap 2),
            bukan tumpukan kartu berbayang; ponsel tanpa nested scroll
            (audit v2.37), ruang kerja ≥52rem bergulir sendiri.
            v2.87: data-lenis-prevent — gulir sendiri di ruang kerja
            lebar tidak dibocorkan ke Lenis wadah utama. */}
        <div data-lenis-prevent className="mt-3 pr-1 @[52rem]:max-h-[430px] @[52rem]:overflow-y-auto no-scrollbar">
          <AnimatePresence initial={false} mode="popLayout">
            {historySlice.map((w, i) => (
              <WorkoutRow key={w.id} w={w} index={i} bodyWeight={weight} />
            ))}
            {historyHidden > 0 && (
              <button
                key="wo-more"
                type="button"
                onClick={() => setHistoryLimit(Number.MAX_SAFE_INTEGER)}
                className="interactive w-full cursor-pointer rounded-full border border-border py-2.5 text-meta font-semibold text-content-secondary hover:bg-surface-sunken hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Lihat semua riwayat ({historyHidden} tersisa)
              </button>
            )}
            {historyAll && (
              <button
                key="wo-less"
                type="button"
                onClick={() => setHistoryLimit(HISTORY_LIMIT)}
                className="interactive mt-2 w-full cursor-pointer rounded-full border border-border py-2.5 text-meta font-semibold text-content-secondary hover:bg-surface-sunken hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Tampilkan ringkas ({HISTORY_LIMIT} terbaru)
              </button>
            )}
            {filteredWorkouts.length === 0 && workouts.length > 0 && (
              <m.div
                key="wo-nofilter"
                initial={playEntrance ? { opacity: 0, y: 14 } : false}
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
                initial={playEntrance ? { opacity: 0, y: 14 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={motionTokens.preset.chipReveal}
              >
                <RutinaEmptyState
                  image="02-fitness-running-shoes"
                  title="Belum ada aktivitas tercatat"
                  description="Catat lari, jalan, badminton, atau latihan barbel pertamamu — riwayat dan rekor tumbuh dari sini."
                  action={
                    <m.button
                      type="button"
                      onClick={() => openWorkoutSheet()}
                      whileTap={{ scale: 0.96 }}
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
              </div>
            )}
          </section>


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
            image="30-achievement-trophy"
            title="Rekor lahir setelah set beban pertama"
            description="Catat satu set barbel — e1RM tiap gerakan dipantau otomatis di papan ini."
            action={
              <m.button
                type="button"
                onClick={() => openWorkoutSheet(undefined, { mode: 'beban' })}
                whileTap={{ scale: 0.96 }}
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
              <m.button
                key={r.name}
                type="button"
                onClick={() => setExDetail(r.name)}
                aria-label={`Buka perkembangan ${r.name} — rekor e1RM ${r.best
                  .toFixed(1)
                  .replace('.', ',')} kg dari ${r.sessions} sesi`}
                initial={playEntrance ? { opacity: 0, y: 14 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  ...motionTokens.preset.chipReveal,
                  delay: Math.min(i * motionTokens.stagger.normal, 0.3),
                }}
                className={`interactive flex w-full cursor-pointer items-center gap-3 rounded-lg border p-3.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary hover:bg-secondary/60 ${
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
                <ChevronRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-content-muted"
                />
              </m.button>
            ))}
          </div>
        )}
      </section>

      {/* ===== Pustaka gerakan — baris ringkas lebar penuh (v2.59):
          baris ledger hairline, bukan kartu per gerakan. ===== */}
      <section aria-label="Pustaka gerakan" className="@[52rem]:col-span-12">
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
          initial={playEntrance ? { opacity: 0, y: 14 } : false}
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
                    /* v2.49 (audit): 32px → 36px — pil filter utama Pustaka
                       (pembanding: WINDOWS/WO_FILTERS/QUICK_MODES h-9). */
                    'interactive h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-meta font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
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

        <div className="mt-3 divide-y divide-border/70">
          {/* Search-first (audit v2.37): hasil pencarian/filter tampil FLAT
              penuh; kondisi awal mengelompokkan per otot dengan pratinjau. */}
          {libFlatMode ? (
            <>
              {filteredLib.map((e) => (
                <ExerciseCard
                  key={e.name}
                  name={e.name}
                  onOpenDetail={setExDetail}
                />
              ))}
              {filteredLib.length === 0 && (
                <RutinaEmptyState
                  icon={<Dumbbell />}
                  title="Tidak ada gerakan cocok"
                  description={`Coba kata kunci lain atau ganti filter otot — ${EX_LIB.length} gerakan barbel siap dipilih.`}
                />
              )}
            </>
          ) : (
            <>
              {libGroups.map((g) => {
                const expanded = openLibGroups.has(g.key)
                const items = expanded
                  ? g.items
                  : g.items.slice(0, LIB_GROUP_PREVIEW)
                return (
                  <div key={g.key}>
                    <div className="mb-1.5 flex items-center gap-2 px-0.5">
                      <h3 className="text-note font-semibold tracking-tight text-content-secondary">
                        {g.key}
                      </h3>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-chart-label font-semibold tabular-nums text-content-secondary">
                        {g.items.length}
                      </span>
                    </div>
                    <div className="divide-y divide-border/70">
                      {items.map((e) => (
                        <ExerciseCard
                          key={e.name}
                          name={e.name}
                          onOpenDetail={setExDetail}
                        />
                      ))}
                    </div>
                    {g.items.length > LIB_GROUP_PREVIEW && (
                      <button
                        type="button"
                        onClick={() => toggleLibGroup(g.key)}
                        aria-expanded={expanded}
                        className="interactive mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong px-3 py-2 text-eyebrow font-semibold text-content-secondary transition-colors hover:border-module-accent/50 hover:text-module-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <ChevronDown
                          aria-hidden="true"
                          className={
                            'h-3.5 w-3.5 transition-transform duration-300 ' +
                            (expanded ? 'rotate-180' : '')
                          }
                        />
                        {expanded
                          ? 'Tampilkan lebih sedikit'
                          : `Tampilkan semua (${g.items.length})`}
                      </button>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      </section>

      {/* ===== Neraca kelompok otot — baris penuh di bawah pasangan
          Papan Rekor/Pustaka (review UI/UX v2.44): distribusi set per
          kelompok otot utama, jendela 7/30 hari. ===== */}
      <section aria-label="Neraca kelompok otot" className="@[52rem]:col-span-12">
        <MuscleBalanceCard />
      </section>
          </div>
        </div>

        {/* v2.70 (audit jarak): panel Asupan/Tubuh dulu menempel persis
            0px di bawah subtab (Latihan punya mt-4 lewat pembungkus
            m.div-nya) — kartu pertama kini bernapas 16px, ritme seragam
            antar subtab. */}
        <div className={tab === 'asupan' ? 'mt-4 block' : 'hidden'}>
          <AsupanPanel />
        </div>

        <div className={tab === 'tubuh' ? 'mt-4 block' : 'hidden'}>
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
      {/* Detail progres satu gerakan — dibuka dari Papan Rekor / Pustaka. */}
      <ExerciseDetailSheet
        open={exDetail != null}
        name={exDetail}
        onClose={() => setExDetail(null)}
      />
      <WorkoutSessionOverlay />
    </SmoothScrollArea>
  )
}
