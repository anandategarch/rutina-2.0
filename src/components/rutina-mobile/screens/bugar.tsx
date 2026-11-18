'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import {
  ChevronDown,
  Dumbbell,
  Footprints,
  Play,
  Plus,
  Search,
  Timer,
  Trash2,
  Trophy,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { playfair } from '../serif'
import {
  shortDateLabel,
  todayISO,
  useRutina,
  type Workout,
} from '../store'
import { BlurFade } from '../motion-kit'
import { RutinaTabs, RutinaTabsList, RutinaTabsTrigger } from '../rutina-tabs'
import {
  bestE1rmIn,
  cardioSummary,
  kcalOf,
  latestWeight,
  prBoard,
  tonaseOf,
  weekRange,
  weekSummary,
} from '../fitness/fit-utils'
import {
  EX_LEVELS,
  EX_LIB,
  MUSCLE_GROUPS,
  PROG_DB,
  type Program,
} from '../fitness/data'
import { AsupanPanel } from '../fitness/asupan-panel'
import { TubuhPanel } from '../fitness/tubuh-panel'
import {
  SessionPickerSheet,
  WorkoutSessionOverlay,
  startSeededSession,
} from '../fitness/workout-session'

import { motionTokens } from '@/lib/motion/tokens'
/* Subtab Bugar — Latihan, Asupan, Tubuh lengkap. */
type BugarTab = 'latihan' | 'asupan' | 'tubuh'
const BUGAR_TABS: { id: BugarTab; label: string }[] = [
  { id: 'latihan', label: 'Latihan' },
  { id: 'asupan', label: 'Asupan' },
  { id: 'tubuh', label: 'Tubuh' },
]

/* ===== Kartu program ===== */

function ProgramCard({ prog, index }: { prog: Program; index: number }) {
  const workouts = useRutina((s) => s.workouts)
  const [expanded, setExpanded] = useState(false)

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: Math.min(0.08 + index * 0.06, 0.3),
        ease: motionTokens.easing.standard,
      }}
      className="rounded-[20px] border border-border bg-surface-primary p-5 shadow-soft"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center gap-3.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-success">
          <Dumbbell className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold tracking-tight text-content-primary">
            {prog.name}
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] font-medium text-content-muted">
            {prog.level} · {prog.freq} · ±{prog.dur} mnt
          </span>
        </span>
        <m.span
          aria-hidden="true"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.25 }}
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
            transition={{ duration: 0.32, ease: motionTokens.easing.standard }}
            className="overflow-hidden"
          >
            <p className="mt-3 text-[12.5px] leading-relaxed text-content-muted">
              {prog.desc}
            </p>
            <p className="mt-2 rounded-xl bg-surface-sunken px-3.5 py-2.5 text-[11.5px] leading-relaxed text-content-muted">
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
                    <p className="text-[13px] font-bold text-content-primary">
                      {day.label}
                    </p>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-content-muted">
                      <Timer className="h-3 w-3" />
                      istirahat {day.rest}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {day.ex.map((e) => (
                      <li
                        key={e.name}
                        className="flex items-center justify-between gap-2 text-[12.5px]"
                      >
                        <span className="min-w-0 flex-1 truncate font-medium text-content-secondary/90">
                          {e.name}
                        </span>
                        <span className="shrink-0 rounded-full bg-surface-primary px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-success">
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
                    className="mt-3 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary text-[12.5px] font-bold text-primary-foreground transition-all hover:bg-action-hover active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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

/* ===== Baris riwayat sesi ===== */

function WorkoutRow({ w, index }: { w: Workout; index: number }) {
  const deleteWorkout = useRutina((s) => s.deleteWorkout)
  const [expanded, setExpanded] = useState(false)
  const isStrength = w.kind === 'beban'
  const tonase = tonaseOf(w)
  const best = bestE1rmIn(w)
  const pace =
    w.kind !== 'beban' && (w.distance ?? 0) > 0 && w.duration > 0
      ? `${Math.floor((w.duration * 60) / w.distance! / 60)}'${String(
          Math.round(((w.duration * 60) / w.distance!) % 60),
        ).padStart(2, '0')}"`
      : null

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.04, 0.2),
        ease: motionTokens.easing.standard,
      }}
      className="rounded-[18px] border border-border bg-surface-primary p-4 shadow-soft"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isStrength ? 'bg-secondary text-success' : 'bg-destructive/10 text-content-danger'
          }`}
        >
          {isStrength ? (
            <Dumbbell className="h-4.5 w-4.5" />
          ) : (
            <Footprints className="h-4.5 w-4.5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-bold text-content-primary">
            {isStrength
              ? `Beban · ${w.sets.length} set`
              : `${w.kind === 'jalan' ? 'Jalan' : 'Lari'} · ${w.distance?.toFixed(1).replace('.', ',')} km`}
            <span className="font-medium text-content-muted">
              {' '}
              — {shortDateLabel(w.date)}
            </span>
          </span>
          <span className="mt-0.5 block text-[11.5px] font-medium tabular-nums text-content-muted">
            {isStrength
              ? `${Math.round(tonase).toLocaleString('id-ID')} kg tonase · e1RM ≈ ${best.toFixed(1).replace('.', ',')} kg`
              : `${w.duration} mnt${pace ? ` · pace ${pace}/km` : ''}`}
          </span>
        </span>
        <m.span
          aria-hidden="true"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.25 }}
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
            transition={{ duration: 0.28, ease: motionTokens.easing.standard }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl bg-surface-sunken p-3">
              {isStrength ? (
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
                        className="flex items-center justify-between gap-2 text-[12.5px]"
                      >
                        <span className="min-w-0 flex-1 truncate font-semibold text-content-secondary">
                          {g.exercise}
                        </span>
                        <span className="shrink-0 rounded-full bg-surface-primary px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-success">
                          {g.weight.toString().replace('.', ',')} kg × {g.reps} ({g.count} set)
                        </span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-[12.5px] font-medium text-content-muted">
                  {w.kind === 'jalan' ? 'Jalan santai' : 'Lari'}{' '}
                  {w.distance?.toFixed(1).replace('.', ',')} km selama {w.duration} menit.
                </p>
              )}
              {w.note && (
                <p className="mt-2 border-t border-border pt-2 text-[12px] italic text-content-muted">
                  “{w.note}”
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                deleteWorkout(w.id)
                toast('Sesi dihapus dari riwayat.')
              }}
              className="mt-2.5 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-destructive/35 text-[12px] font-bold text-content-danger transition-colors hover:bg-destructive/10 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus sesi
            </button>
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
      className="rounded-[18px] border border-border bg-surface-primary p-4 shadow-soft"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-bold text-content-primary">
            {ex.name}
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-medium text-content-muted">
            {ex.muscle} · {EX_LEVELS[ex.level]} · {ex.equipment}
          </span>
        </span>
        <m.span
          aria-hidden="true"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.25 }}
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
            transition={{ duration: 0.28, ease: motionTokens.easing.standard }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3">
              <p className="text-[12.5px] leading-relaxed text-content-muted">
                {ex.desc}
              </p>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-success">
                  Langkah
                </p>
                <ol className="mt-1.5 space-y-1.5">
                  {ex.steps.map((s, i) => (
                    <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-content-muted">
                      <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-success">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-xl bg-secondary/60 p-3">
                <p className="text-[11.5px] leading-relaxed text-content-secondary">
                  <span className="font-bold text-success">Tip: </span>
                  {ex.tip}
                </p>
              </div>
              <div className="rounded-xl bg-destructive/10 p-3">
                <p className="text-[11.5px] leading-relaxed text-content-secondary">
                  <span className="font-bold text-content-danger">Hindari: </span>
                  {ex.mistakes}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  openWorkoutSheet([{ name: ex.name, count: 3, reps: 8 }])
                }
                className="flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-surface-inverse text-[12.5px] font-bold text-content-inverse transition-all hover:bg-espresso-soft active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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

/* ===== Layar Bugar ===== */

export default function BugarScreen() {
  const workouts = useRutina((s) => s.workouts)
  const bodyLogs = useRutina((s) => s.bodyLogs)
  const openWorkoutSheet = useRutina((s) => s.openWorkoutSheet)

  const [tab, setTab] = useState<BugarTab>('latihan')
  const [libQuery, setLibQuery] = useState('')
  const [libMuscle, setLibMuscle] = useState<string>('Semua')
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false)

  const week = useMemo(() => weekSummary(workouts), [workouts])
  const cardio = useMemo(() => cardioSummary(workouts), [workouts])
  const prs = useMemo(() => prBoard(workouts), [workouts])
  const topPr = prs[0]
  /* Estimasi kalori terbakar pekan ini — MET × berat tercatat. */
  const weight = useMemo(() => latestWeight(bodyLogs), [bodyLogs])
  const weekKcal = useMemo(
    () =>
      workouts
        .filter((w) => w.date >= weekRange().start)
        .reduce((a, w) => a + kcalOf(w, weight), 0),
    [workouts, weight],
  )

  const strengthCount = workouts.filter((w) => w.kind === 'beban').length

  const filteredLib = useMemo(() => {
    const q = libQuery.trim().toLowerCase()
    return EX_LIB.filter(
      (e) =>
        (libMuscle === 'Semua' || e.muscle === libMuscle) &&
        (q === '' ||
          e.name.toLowerCase().includes(q) ||
          e.detail.toLowerCase().includes(q)),
    )
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [libQuery, libMuscle])

  return (
    <div className="h-full overflow-y-auto no-scrollbar overscroll-contain px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-content-primary">
      {/* Header editorial */}
      <header>
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.24em] text-success">
          <Dumbbell className="h-3.5 w-3.5" />
          Gerak &amp; kekuatan
        </p>
        <h1
          className={`${playfair.className} mt-1.5 text-balance text-[38px] font-semibold leading-none tracking-tight`}
        >
          Bugar<span className="text-primary">.</span>
        </h1>
        <p className="mt-2 text-xs font-medium text-content-muted">
          {tab === 'latihan'
            ? week.sessions > 0
              ? `${week.sessions} sesi pekan ini${topPr ? ` · PR e1RM ≈ ${topPr.best.toFixed(1).replace('.', ',')} kg` : ''}`
              : 'Latihan beban & kardio — catat sesi pertamamu'
            : tab === 'asupan'
              ? 'Asupan & neraca kalori dari master 179 makanan Indonesia'
              : 'Hidrasi, berat badan, tidur & kesiapan latihan'}
        </p>
      </header>

      {/* Subtab — Radix Tabs: pil aktif via data-state=active + dukungan keyboard */}
      <RutinaTabs value={tab} onValueChange={(v) => setTab(v as BugarTab)}>
        <RutinaTabsList aria-label="Bagian Bugar" className="mt-4 w-full">
          {BUGAR_TABS.map((t) => (
            <RutinaTabsTrigger key={t.id} value={t.id} className="flex-1">
              {t.label}
            </RutinaTabsTrigger>
          ))}
        </RutinaTabsList>
      </RutinaTabs>

      {tab === 'latihan' && (
        <>
          {/* Hero ringkasan pekan — angka dari histori nyata */}
          <m.section
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: motionTokens.easing.standard }}
            aria-label="Ringkasan latihan pekan ini"
            className="relative mt-4 overflow-hidden rounded-[24px] bg-primary p-6 text-primary-foreground shadow-leaf"
          >
        <div className="relative z-10">
          <p className="text-[13px] font-medium text-primary-foreground/80">
            Pekan ini
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <p className="flex items-baseline">
                <span className="text-[32px] font-semibold leading-none tracking-tight tabular-nums">
                  {week.sessions}
                </span>
              </p>
              <p className="mt-1 text-[11px] font-medium text-primary-foreground/75">
                sesi latihan
              </p>
            </div>
            <div>
              <p className="flex items-baseline">
                <span className="text-[32px] font-semibold leading-none tracking-tight tabular-nums">
                  {week.minutes}
                </span>
                <span className="ml-0.5 text-sm font-medium text-primary-foreground/80">mnt</span>
              </p>
              <p className="mt-1 text-[11px] font-medium text-primary-foreground/75">
                total durasi
              </p>
            </div>
            <div>
              <p className="flex items-baseline">
                <span className="text-[32px] font-semibold leading-none tracking-tight tabular-nums">
                  {week.tonase >= 1000
                    ? `${(week.tonase / 1000).toFixed(1).replace('.', ',')}t`
                    : Math.round(week.tonase).toLocaleString('id-ID')}
                </span>
                <span className="ml-0.5 text-sm font-medium text-primary-foreground/80">kg</span>
              </p>
              <p className="mt-1 text-[11px] font-medium text-primary-foreground/75">
                tonase beban
              </p>
            </div>
          </div>

          {topPr && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-espresso/35 px-3.5 py-2.5 backdrop-blur-sm">
              <Trophy className="h-4 w-4 shrink-0 text-pistachio" />
              <p className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                Rekor e1RM: {topPr.name} ≈ {topPr.best.toFixed(1).replace('.', ',')} kg
              </p>
              <span className="shrink-0 text-[11px] font-bold tabular-nums text-primary-foreground/75">
                {prs.length} gerakan
              </span>
            </div>
          )}

          {weekKcal > 0 && (
            <p className="mt-2 text-[11px] font-medium text-primary-foreground/70">
              ≈ {weekKcal.toLocaleString('id-ID')} kkal terbakar pekan ini
              {weight == null && ' (asumsi 60 kg — timbang dirimu di tab Tubuh)'}
            </p>
          )}
        </div>
      </m.section>

      {/* Tombol mulai sesi imersif + pintasan catat manual */}
      <m.button
        type="button"
        onClick={() => setSessionPickerOpen(true)}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: motionTokens.easing.standard }}
        className="mt-3 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-surface-inverse text-[15px] font-bold text-content-inverse shadow-soft transition-colors hover:bg-espresso-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Play className="h-5 w-5" strokeWidth={2.5} />
        Mulai Sesi Latihan
      </m.button>
      <button
        type="button"
        onClick={() => openWorkoutSheet()}
        className="mx-auto mt-1 flex h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold text-content-muted underline-offset-4 transition-colors hover:text-content-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Catat manual
      </button>

      {/* ===== Program latihan ===== */}
      <section className="mt-7" aria-label="Program latihan">
        <div className="flex items-center gap-2 px-0.5">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-content-secondary">
            Program Latihan
          </h2>
        </div>
        <p className="mt-1 px-0.5 text-[12px] leading-relaxed text-content-muted">
          Rencana siap pakai — cukup barbel + rak + bangku. Pilih hari untuk
          memulai sesi terisi otomatis.
        </p>
        <div className="mt-3 space-y-2.5">
          {PROG_DB.map((p, i) => (
            <ProgramCard key={p.id} prog={p} index={i} />
          ))}
        </div>
      </section>

      {/* ===== Riwayat sesi ===== */}
      <section className="mt-8" aria-label="Riwayat latihan">
        <div className="flex items-center justify-between gap-3 px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-content-secondary">
              Riwayat
            </h2>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-success">
              {workouts.length}
            </span>
          </div>
          <span className="text-[11px] font-medium text-content-muted">
            {cardio.km > 0
              ? `${cardio.km.toFixed(1).replace('.', ',')} km kardio`
              : `${strengthCount} sesi beban`}
          </span>
        </div>

        <div className="mt-3 max-h-[430px] space-y-2.5 overflow-y-auto no-scrollbar pr-1">
          <AnimatePresence initial={false} mode="popLayout">
            {workouts.map((w, i) => (
              <WorkoutRow key={w.id} w={w} index={i} />
            ))}
            {workouts.length === 0 && (
              <m.div
                key="wo-empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: motionTokens.easing.standard }}
                className="rounded-[20px] border-2 border-dashed border-primary/30 px-6 py-9 text-center"
              >
                <Dumbbell className="mx-auto h-6 w-6 text-content-muted" />
                <p className="mt-2 text-[13px] font-semibold text-content-muted">
                  Belum ada sesi tercatat
                </p>
                <p className="mt-0.5 text-[11.5px] text-content-muted">
                  Mulai dari program di atas atau catat manual.
                </p>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ===== Papan rekor e1RM ===== */}
      <section className="mt-8" aria-label="Papan rekor">
        <div className="flex items-center gap-2 px-0.5">
          <Trophy className="h-4 w-4 text-warning" />
          <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-content-secondary">
            Papan Rekor e1RM
          </h2>
        </div>
        <p className="mt-1 px-0.5 text-[12px] leading-relaxed text-content-muted">
          Estimasi kekuatan Epley (beban × (1 + reps/30)) dari set yang kamu
          catat — terpantau otomatis.
        </p>

        {prs.length === 0 ? (
          <div className="mt-3 rounded-[20px] border-2 border-dashed border-border px-6 py-8 text-center">
            <Zap className="mx-auto h-5 w-5 text-content-muted" />
            <p className="mt-2 text-[12.5px] font-semibold text-content-muted">
              Rekor lahir setelah set beban pertama dicatat
            </p>
            <p className="mt-0.5 text-[11.5px] text-content-muted">
              e1RM tiap gerakan dipantau otomatis di sini.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {prs.map((r, i) => (
              <m.div
                key={r.name}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.35,
                  delay: Math.min(i * 0.05, 0.3),
                  ease: motionTokens.easing.standard,
                }}
                className={`flex items-center gap-3 rounded-[16px] border p-3.5 ${
                  i === 0
                    ? 'border-warning/40 bg-gold/25 shadow-soft'
                    : 'border-border bg-surface-primary shadow-soft'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tabular-nums ${
                    i === 0 ? 'bg-warning text-content-inverse' : 'bg-surface-sunken text-content-muted'
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-content-primary">
                    {r.name}
                  </p>
                  <p className="text-[11px] font-medium text-content-muted">
                    {r.sessions} sesi tercatat
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[16px] font-bold leading-none tabular-nums text-content-primary">
                    {r.best.toFixed(1).replace('.', ',')}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-content-muted">
                    kg · e1RM
                  </p>
                </div>
              </m.div>
            ))}
          </div>
        )}
      </section>

      {/* ===== Pustaka gerakan ===== */}
      <section className="mt-8" aria-label="Pustaka gerakan">
        <div className="flex items-center gap-2 px-0.5">
          <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-content-secondary">
            Pustaka Gerakan
          </h2>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-success">
            {EX_LIB.length}
          </span>
        </div>

        <BlurFade delay={0.05} className="mt-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
            <Input
              value={libQuery}
              onChange={(e) => setLibQuery(e.target.value)}
              placeholder="Cari gerakan atau otot…"
              className="h-11 rounded-xl border-border bg-surface-primary pl-10 text-sm text-content-primary shadow-soft placeholder:text-content-muted focus-visible:border-primary/50 focus-visible:ring-primary/20"
            />
          </div>
        </BlurFade>

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
                    'h-8 shrink-0 cursor-pointer rounded-full px-3.5 text-[12px] font-bold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
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
            <div className="rounded-[20px] border-2 border-dashed border-border px-6 py-8 text-center">
              <Search className="mx-auto h-5 w-5 text-content-muted" />
              <p className="mt-2 text-[12.5px] font-semibold text-content-muted">
                Tidak ada gerakan cocok
              </p>
              <p className="mt-0.5 text-[11.5px] text-content-muted">
                Coba kata kunci lain atau ganti filter otot.
              </p>
            </div>
          )}
        </div>
      </section>
        </>
      )}

      {tab === 'asupan' && <AsupanPanel />}

      {tab === 'tubuh' && <TubuhPanel />}

      {/* Mode sesi latihan imersif — fixed overlay di atas navigasi bawah;
          state sesi hidup di session-store sehingga tetap berjalan walau
          layar ini unmount saat berpindah tab. */}
      <SessionPickerSheet
        open={sessionPickerOpen}
        onClose={() => setSessionPickerOpen(false)}
      />
      <WorkoutSessionOverlay />
    </div>
  )
}
