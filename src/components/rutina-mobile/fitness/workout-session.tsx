'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import { createScope, createTimeline, stagger } from 'animejs'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Dumbbell,
  Minus,
  Play,
  Plus,
  SkipForward,
  Timer,
  TrendingDown,
  Trash2,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { toast } from 'sonner'

import { Progress } from '@/components/ui/progress'
import { motionTokens } from '@/lib/motion/tokens'
import { CONTENT_W } from '../layout-widths'
import { playfair } from '../serif'
import { useFocusTrap } from '../use-focus-trap'
import { RutinaDialog } from '../rutina-dialog'
import { deloadActive, doubleProgression, exStatOf } from './fit-utils'
import { EX_LIB, EX_LEVELS, MUSCLE_GROUPS } from './data'
import { useRutina, type Workout, type WorkoutKind } from '../store'
import { useSessionStore, type ActiveSession } from './session-store'

/**
 * Mode sesi latihan imersif — layar penuh tanpa navigasi utama.
 *
 * - `WorkoutSessionOverlay`: overlay global (dipasang di layar Bugar)
 *   yang membaca session-store; sesi tetap hidup walau layar unmount.
 * - `SessionPickerSheet`: pemilih gerakan + target set sebelum mulai.
 * - Motion (LazyMotion strict, m.*) mengurus gestur/state/transisi;
 *   anime.js HANYA untuk momen pencapaian paska-sesi (pola createScope
 *   + prefers-reduced-motion, mengikuti splash.tsx).
 */

const KIND_LABEL: Record<WorkoutKind, string> = {
  beban: 'Angkat Beban',
  jalan: 'Jalan',
  lari: 'Lari',
}

/** Pilihan gerakan dikelompokkan per otot (konsisten dengan workout-sheet). */
const EX_OPTIONS = MUSCLE_GROUPS.map((g) => ({
  group: g,
  items: EX_LIB.filter((e) => e.muscle === g).map((e) => e.name),
}))

const WEIGHT_STEP = 2.5
const WEIGHT_MIN = 0
const WEIGHT_MAX = 500
const REP_MIN = 1
const REP_MAX = 100

/** "62,5" — desimal koma mengikuti konvensi id-ID. */
const fmtKg = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')

/** ms epoch → "01:30" (mm:ss, digelindingkan ke atas). */
const mmss = (ms: number): string => {
  const t = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

const roundStep = (v: number): number => Math.round(v * 10) / 10

/* ===== Suara timer istirahat — modul lokal berkas =====
   AudioContext dibuat malas pada interaksi pengguna pertama (kebijakan
   autoplay); semua pemutaran dibungkus try/catch — kegagalan suara
   tidak pernah boleh menjatuhkan sesi. `soundOn` module-level (bukan
   store) — bertahan antar-mount, default menyala. */
let audioCtx: AudioContext | null = null
let soundOn = true

/** Bangun/resume konteks audio — dipanggil dari gestur pengguna. */
function ensureAudio(): void {
  try {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') void audioCtx.resume()
      return
    }
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AC) return
    audioCtx = new AC()
  } catch {
    /* diam — tanpa suara tetap aman */
  }
}

/** Bip pendek; hanya bunyi bila konteks sudah ada (interaksi pertama). */
function playBeep(freq = 880, duration = 0.08, delay = 0): void {
  try {
    if (!soundOn || !audioCtx) return
    const ctx = audioCtx
    const t0 = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, t0)
    gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + duration + 0.06)
  } catch {
    /* diam */
  }
}

/** Chime penutup dua nada saat timer habis. */
function finishChime(): void {
  playBeep(660, 0.16)
  playBeep(880, 0.32, 0.16)
}

/** Ajakan lisan — suara id-ID dipakai bila tersedia, selain itu suara
    default peramban (tanpa paksa lang agar tidak bisu). */
function speakNextSet(): void {
  try {
    if (!soundOn || typeof window === 'undefined') return
    const synth = window.speechSynthesis
    if (!synth) return
    const idVoice = synth
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith('id'))
    const u = new SpeechSynthesisUtterance('Ayo, set berikutnya!')
    if (idVoice) {
      u.voice = idVoice
      u.lang = 'id-ID'
    }
    synth.speak(u)
  } catch {
    /* diam */
  }
}

/** Rekap sesi untuk momen perayaan paska-simpan. */
interface SessionSummary {
  sets: number
  exercises: number
  minutes: number
  tonase: number
}

/* ===== Stepper beban / repetisi — target sentuh 56px ===== */

function Stepper({
  label,
  value,
  suffix,
  onDec,
  onInc,
  canDec,
  canInc,
  decLabel,
  incLabel,
}: {
  label: string
  value: string
  suffix?: string
  onDec: () => void
  onInc: () => void
  canDec: boolean
  canInc: boolean
  decLabel: string
  incLabel: string
}) {
  return (
    <div className="rounded-[20px] border border-hero-content/12 bg-hero-content/[0.06] p-3.5">
      <p
        aria-hidden="true"
        className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-hero-content-muted"
      >
        {label}
      </p>
      <div className="mt-2.5 flex items-center justify-between gap-1.5">
        <button
          type="button"
          onClick={onDec}
          disabled={!canDec}
          aria-label={decLabel}
          className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-hero-content/10 text-hero-content transition-colors hover:bg-hero-content/20 active:scale-[0.94] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Minus className="h-6 w-6" strokeWidth={2.5} />
        </button>
        <p
          aria-live="polite"
          className="flex min-w-0 flex-1 items-baseline justify-center gap-1"
        >
          <span className="text-[36px] font-bold leading-none tabular-nums text-hero-content">
            {value}
          </span>
          {suffix && (
            <span className="text-[14px] font-semibold text-hero-content-muted">
              {suffix}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={onInc}
          disabled={!canInc}
          aria-label={incLabel}
          className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-hero-content/10 text-hero-content transition-colors hover:bg-hero-content/20 active:scale-[0.94] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

/* ===== Kartu timer istirahat ===== */

function RestCard({
  restingUntil,
  restDuration,
  onExtend,
  onSkip,
  onFinished,
}: {
  restingUntil: number
  restDuration: number
  onExtend: (sec: number) => void
  onSkip: () => void
  onFinished: () => void
}) {
  const [now, setNow] = useState(() => Date.now())
  /* Cermin module-level soundOn — agar ikon toggle mengikuti nilai yang
     bertahan antar-mount. */
  const [sound, setSound] = useState(soundOn)

  /* Tick 250ms — cukup halus untuk detik, murah untuk render. */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  const remaining = Math.max(0, restingUntil - now)
  const pct = Math.min(100, (remaining / Math.max(restDuration, 1)) * 100)
  const urgent = remaining > 0 && remaining <= 5_000
  const secondsLeft = Math.max(0, Math.ceil(remaining / 1000))

  /* Bunyi penanda pada detik 3-2-1 (satu bip per detik utuh berubah);
     saat habis: chime dua nada + ajakan lisan. Efek samping murni —
     tidak ada setState di sini. */
  useEffect(() => {
    if (remaining <= 0) {
      finishChime()
      speakNextSet()
      return
    }
    if (secondsLeft === 3 || secondsLeft === 2 || secondsLeft === 1) {
      playBeep()
    }
  }, [secondsLeft, remaining])

  /* Habis → bersihkan state + umpan balik (denyut & toast ada di induk). */
  useEffect(() => {
    if (remaining <= 0) onFinished()
  }, [remaining, onFinished])

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.26, ease: motionTokens.easing.standard }}
      role="timer"
      aria-label={`Istirahat ${mmss(remaining)}`}
      className="rounded-[20px] border border-hero-content/12 bg-hero-content/[0.06] p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-hero-content-muted">
          <Timer className="h-3.5 w-3.5" aria-hidden="true" />
          Istirahat · Timer berjalan
        </p>
        <button
          type="button"
          aria-pressed={sound}
          aria-label={
            sound ? 'Matikan suara timer' : 'Nyalakan suara timer'
          }
          onClick={() => {
            soundOn = !soundOn
            setSound(soundOn)
            if (soundOn) ensureAudio()
          }}
          className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            sound
              ? 'text-hero-accent hover:bg-hero-content/10'
              : 'text-hero-content-muted hover:bg-hero-content/10'
          }`}
        >
          {sound ? (
            <Volume2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <VolumeX className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      <m.p
        animate={urgent ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={{
          duration: 0.85,
          repeat: urgent ? Infinity : 0,
          ease: 'easeInOut',
        }}
        className={`mt-2 font-mono text-[44px] font-bold leading-none tabular-nums ${
          urgent ? 'text-hero-accent' : 'text-hero-content'
        }`}
      >
        {mmss(remaining)}
      </m.p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-hero-content/12">
        <m.div
          className="h-full rounded-full bg-hero-accent"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25, ease: 'linear' }}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => {
            ensureAudio()
            onExtend(15)
          }}
          className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-hero-content/25 text-[13px] font-bold text-hero-content transition-colors hover:bg-hero-content/10 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          15 dtk
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-hero-content/15 text-[13px] font-bold text-hero-content transition-colors hover:bg-hero-content/25 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <SkipForward className="h-4 w-4" aria-hidden="true" />
          Lewati
        </button>
      </div>
    </m.div>
  )
}

/* ===== Panel tambah gerakan (di dalam sesi) ===== */

function AddExercisePanel({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string, targetSets: number) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [targetSets, setTargetSets] = useState(3)

  return (
    <m.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: motionTokens.easing.standard }}
      className="rounded-[20px] border border-hero-content/12 bg-hero-content/[0.06] p-4"
    >
      <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-hero-content-muted">
        Tambah Gerakan
      </p>
      <select
        aria-label="Pilih gerakan untuk ditambahkan"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-2.5 h-11 w-full cursor-pointer rounded-xl border border-hero-content/15 bg-hero-surface-raised px-3 text-[13.5px] font-semibold text-hero-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
      >
        <option value="">Pilih gerakan…</option>
        {EX_OPTIONS.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.items.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[12.5px] font-medium text-hero-content-muted">
          Target set
        </p>
        <div className="flex h-11 items-center rounded-xl border border-hero-content/15">
          <button
            type="button"
            aria-label="Kurangi target set"
            onClick={() => setTargetSets((v) => Math.max(1, v - 1))}
            className="flex h-full w-11 cursor-pointer items-center justify-center text-hero-content transition-colors hover:text-hero-accent active:scale-[0.94] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-[16px] font-bold tabular-nums text-hero-content">
            {targetSets}
          </span>
          <button
            type="button"
            aria-label="Tambah target set"
            onClick={() => setTargetSets((v) => Math.min(12, v + 1))}
            className="flex h-full w-11 cursor-pointer items-center justify-center text-hero-content transition-colors hover:text-hero-accent active:scale-[0.94] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 cursor-pointer rounded-full border border-hero-content/25 text-[13px] font-bold text-hero-content transition-colors hover:bg-hero-content/10 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={() => onAdd(name, targetSets)}
          disabled={!name}
          className="h-11 cursor-pointer rounded-full bg-primary text-[13px] font-bold text-primary-foreground transition-colors hover:bg-action-hover active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          Tambahkan
        </button>
      </div>
    </m.div>
  )
}

/* ===== Tampilan sesi (overlay layar penuh) ===== */

function SessionView({
  session,
  onSaved,
}: {
  session: ActiveSession
  onSaved: (summary: SessionSummary) => void
}) {
  const workouts = useRutina((s) => s.workouts)
  const addWorkout = useRutina((s) => s.addWorkout)
  const deloadUntil = useRutina((s) => s.deloadUntil)
  const completeSet = useSessionStore((s) => s.completeSet)
  const nextExercise = useSessionStore((s) => s.nextExercise)
  const prevExercise = useSessionStore((s) => s.prevExercise)
  const goToExercise = useSessionStore((s) => s.goToExercise)
  const skipRest = useSessionStore((s) => s.skipRest)
  const extendRest = useSessionStore((s) => s.extendRest)
  const addExercise = useSessionStore((s) => s.addExercise)
  const endSession = useSessionStore((s) => s.endSession)
  const resetSession = useSessionStore((s) => s.reset)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [weight, setWeight] = useState(20)
  const [reps, setReps] = useState(8)
  /* Arah slide konten (+1 berikutnya / -1 sebelumnya) — state, bukan
     ref, karena dipakai sebagai `initial` saat kartu diganti kunci. */
  const [dir, setDir] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([])

  useFocusTrap(true, panelRef)

  const ex = session.exercises[session.currentIdx] ?? null
  const totalTarget = session.exercises.reduce((a, e) => a + e.targetSets, 0)
  const totalDone = session.exercises.reduce(
    (a, e) => a + Math.min(e.sets.length, e.targetSets),
    0,
  )
  const progressPct =
    totalTarget === 0 ? 0 : Math.round((totalDone / totalTarget) * 100)
  const totalSets = session.exercises.reduce((a, e) => a + e.sets.length, 0)
  const allDone =
    session.exercises.length > 0 &&
    session.exercises.every((e) => e.sets.length >= e.targetSets)

  /* Pra-isi stepper saat gerakan aktif berganti — pola penyesuaian state
     saat render (bukan effect): set terakhir gerakan → histori → default. */
  const [prefilledId, setPrefilledId] = useState<string | null>(null)
  if (ex && ex.id !== prefilledId) {
    setPrefilledId(ex.id)
    const last = ex.sets[ex.sets.length - 1]
    setWeight(last ? last.weight : ex.hintWeight > 0 ? ex.hintWeight : 20)
    setReps(last ? last.reps : ex.hintReps > 0 ? ex.hintReps : 8)
  }

  /* Chip aktif selalu terlihat di deretan yang bisa digulir. */
  useEffect(() => {
    chipRefs.current[session.currentIdx]?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: 'smooth',
    })
  }, [session.currentIdx])

  /* Keyboard: Escape = konfirmasi akhiri, panah = pindah gerakan. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (adding) setAdding(false)
        else if (!confirmOpen) setConfirmOpen(true)
      } else if (e.key === 'ArrowRight') {
        setDir(1)
        nextExercise()
      } else if (e.key === 'ArrowLeft') {
        setDir(-1)
        prevExercise()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adding, confirmOpen, nextExercise, prevExercise])

  const goNext = useCallback(() => {
    setDir(1)
    nextExercise()
  }, [nextExercise])

  const goPrev = useCallback(() => {
    setDir(-1)
    prevExercise()
  }, [prevExercise])

  const handleRestFinished = useCallback(() => {
    skipRest()
    toast.success('Istirahat selesai — ayo lanjut!')
  }, [skipRest])

  const handleComplete = () => {
    if (!ex) return
    /* Gestur pengguna pertama yang menjamin timer berikutnya bersuara —
       bangun AudioContext di sini (kebijakan autoplay). */
    ensureAudio()
    completeSet(weight, reps)
    const doneAfter = ex.sets.length + 1
    const allDoneAfter = session.exercises.every((e, i) =>
      i === session.currentIdx
        ? doneAfter >= e.targetSets
        : e.sets.length >= e.targetSets,
    )
    if (allDoneAfter) {
      /* Semua target tercapai — tidak perlu istirahat lagi. */
      skipRest()
      toast.success('Semua set selesai — akhiri & simpan sesimu.')
    } else if (doneAfter >= ex.targetSets) {
      toast.info(`Gerakan ${ex.name} selesai — geser ke gerakan berikutnya.`)
    }
  }

  const handleAddExercise = (name: string, targetSets: number) => {
    if (session.exercises.some((e) => e.name === name)) {
      toast.info(`${name} sudah ada di sesi ini.`)
      return
    }
    const stat = exStatOf(workouts, name)
    addExercise({
      name,
      targetSets,
      targetReps: stat.lastReps || 8,
      hintWeight: stat.lastWeight,
      hintReps: stat.lastReps,
    })
    setAdding(false)
    toast.success(`${name} ditambahkan ke sesi.`)
  }

  const handleSaveEnd = () => {
    const payload = endSession()
    setConfirmOpen(false)
    if (!payload) return
    /* Jalur simpan SAMA dengan WorkoutSheet — addWorkout memicu
       mesin sinkronisasi; tidak ada penulisan API langsung. */
    addWorkout(payload)
    onSaved({
      sets: payload.sets.length,
      exercises: new Set(payload.sets.map((s) => s.exercise)).size,
      minutes: payload.duration,
      tonase: payload.sets.reduce((a, s) => a + s.weight * s.reps, 0),
    })
    toast.success(`Sesi tersimpan — ${payload.sets.length} set tercatat.`)
  }

  const handleDiscard = () => {
    resetSession()
    setConfirmOpen(false)
    toast('Sesi latihan dibuang.')
  }

  const prevEx = session.exercises[session.currentIdx - 1] ?? null
  const nextEx = session.exercises[session.currentIdx + 1] ?? null
  const lastSet = ex ? (ex.sets[ex.sets.length - 1] ?? null) : null
  const prevLabel = lastSet
    ? `Set sebelumnya: ${fmtKg(lastSet.weight)} kg × ${lastSet.reps}`
    : ex && ex.hintWeight > 0
      ? `Set sebelumnya (sesi lalu): ${fmtKg(ex.hintWeight)} kg × ${ex.hintReps}`
      : 'Set pertama untuk gerakan ini'
  const exMeta = ex ? EX_LIB.find((e) => e.name === ex.name) : undefined

  /* ===== Saran Coach — double progression untuk gerakan aktif =====
     Target repetisi = set PERTAMA gerakan ini sesi berjalan (fallback
     histori terakhir / 8). Muncul setelah minimal satu set tercatat. */
  const advice = useMemo(() => {
    if (!ex || ex.sets.length === 0) return null
    const first = ex.sets[0]
    const targetReps = first
      ? first.reps
      : ex.hintReps > 0
        ? ex.hintReps
        : 8
    return doubleProgression(ex.sets, targetReps)
  }, [ex])

  /* Terapkan saran ke stepper beban = target set berikutnya (state lokal
     SessionView — satu-satunya tempat beban rencana disimpan; tetap bisa
     diedit manual setelahnya). */
  const applyAdvice = (w: number) => {
    setWeight(Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, w)))
    toast.success('Saran Coach diterapkan ke set berikutnya.')
  }

  /* Deload aktif saat sesi berjalan — banner informatif, tanpa mutasi
     data pengguna apa pun. */
  const deloadOn = deloadActive(deloadUntil)

  return (
    <m.div
      key="session-view"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Sesi latihan sedang berlangsung"
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.3, ease: motionTokens.easing.standard }}
      className="fixed inset-0 z-[70] bg-hero-surface text-hero-content"
    >
      <div
        className={`mx-auto flex h-full w-full flex-col ${CONTENT_W}`}
      >
        {/* Progres sesi — set selesai / total target set.
           Radix Progress menyediakan role/aria-valuenow; warna isian
           tetap pistachio lewat varian arbitrer [&>div]. */}
        <Progress
          value={progressPct}
          aria-label="Progres sesi"
          aria-valuetext={`${totalDone} dari ${totalTarget} set`}
          className="h-[3px] shrink-0 rounded-none bg-hero-content/10 [&>div]:bg-pistachio"
        />

        {/* Header sesi */}
        <header className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-[max(0.875rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-hero-content">
              Sesi Latihan
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-hero-content-muted">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-pistachio animate-pulse-soft"
              />
              Sedang berlangsung
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className={`flex h-10 shrink-0 cursor-pointer items-center rounded-full px-4 text-[12.5px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              allDone
                ? 'bg-gold text-espresso shadow-gold animate-pulse-soft'
                : 'border border-hero-content/25 text-hero-content hover:bg-hero-content/10'
            }`}
          >
            {allDone ? 'Akhiri & Simpan' : 'Akhiri'}
          </button>
        </header>

        {/* Deretan chip gerakan — set selesai / target per gerakan */}
        <nav
          aria-label="Gerakan dalam sesi ini"
          className="shrink-0 px-5"
        >
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
            {session.exercises.map((e, i) => {
              const active = i === session.currentIdx
              const done = e.sets.length >= e.targetSets
              return (
                <button
                  key={e.id}
                  ref={(el) => {
                    chipRefs.current[i] = el
                  }}
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => {
                    setDir(
                      i > session.currentIdx ? 1 : i < session.currentIdx ? -1 : 0,
                    )
                    goToExercise(i)
                  }}
                  className={`flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    active
                      ? 'bg-pistachio text-espresso'
                      : 'bg-hero-content/10 text-hero-content-muted hover:bg-hero-content/20'
                  }`}
                >
                  {done && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
                  <span className="max-w-[140px] truncate">{e.name}</span>
                  <span className="text-[10.5px] font-semibold tabular-nums opacity-70">
                    {e.sets.length}/{e.targetSets}
                  </span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-hero-content/30 px-3.5 text-[12px] font-bold text-hero-content-muted transition-colors hover:bg-hero-content/10 hover:text-hero-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Tambah
            </button>
          </div>
        </nav>

        {/* Kartu gerakan aktif — bisa digeser kiri/kanan */}
        <main className="min-h-0 flex-1 overflow-y-auto no-scrollbar overscroll-contain px-5">
          {/* Banner deload sekali — informatif, tanpa mutasi otomatis */}
          {deloadOn && (
            <div
              role="note"
              className="mb-3 flex items-start gap-2.5 rounded-2xl border border-hero-accent/35 bg-hero-accent/15 p-3.5"
            >
              <TrendingDown
                className="mt-0.5 h-4.5 w-4.5 shrink-0 text-hero-accent"
                aria-hidden="true"
              />
              <p className="text-[12px] leading-relaxed text-hero-content">
                Masa deload aktif — pertimbangkan{' '}
                <span className="font-bold text-hero-accent">50% beban</span>{' '}
                dari biasa. Tubuh sedang memulihkan diri.
              </p>
            </div>
          )}
          {adding ? (
            <AddExercisePanel
              onAdd={handleAddExercise}
              onCancel={() => setAdding(false)}
            />
          ) : ex ? (
            <m.div
              key={ex.id}
              initial={{ opacity: 0, x: dir * 56 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.26, ease: motionTokens.easing.standard }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.16}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) goNext()
                else if (info.offset.x > 60) goPrev()
              }}
              className="select-none pb-2"
            >
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-hero-content-muted">
                {KIND_LABEL[ex.kind]} · Set{' '}
                <span className="text-hero-accent">
                  {Math.min(ex.sets.length + 1, ex.targetSets)}
                </span>{' '}
                dari {ex.targetSets}
              </p>
              <h2
                className={`${playfair.className} mt-1.5 text-balance text-[34px] font-semibold leading-[1.05] tracking-tight text-hero-content`}
              >
                {ex.name}
              </h2>
              {exMeta && (
                <p className="mt-1 truncate text-[11.5px] font-medium text-hero-content-muted">
                  {exMeta.muscle} · {exMeta.equipment} · {EX_LEVELS[exMeta.level]}
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <Stepper
                  label="Beban"
                  suffix="kg"
                  value={fmtKg(weight)}
                  decLabel="Kurangi beban 2,5 kg"
                  incLabel="Tambah beban 2,5 kg"
                  canDec={weight > WEIGHT_MIN}
                  canInc={weight < WEIGHT_MAX}
                  onDec={() =>
                    setWeight((w) =>
                      Math.max(WEIGHT_MIN, roundStep(w - WEIGHT_STEP)),
                    )
                  }
                  onInc={() =>
                    setWeight((w) =>
                      Math.min(WEIGHT_MAX, roundStep(w + WEIGHT_STEP)),
                    )
                  }
                />
                <Stepper
                  label="Repetisi"
                  value={String(reps)}
                  decLabel="Kurangi repetisi"
                  incLabel="Tambah repetisi"
                  canDec={reps > REP_MIN}
                  canInc={reps < REP_MAX}
                  onDec={() => setReps((r) => Math.max(REP_MIN, r - 1))}
                  onInc={() => setReps((r) => Math.min(REP_MAX, r + 1))}
                />
              </div>

              <p className="mt-3 text-[12px] font-medium tabular-nums text-hero-content-muted">
                {prevLabel}
              </p>

              {ex.sets.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {ex.sets.map((s, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-hero-content/10 px-2.5 py-1 text-[11px] font-bold tabular-nums text-hero-content-muted"
                    >
                      {fmtKg(s.weight)} × {s.reps}
                    </span>
                  ))}
                </div>
              )}

              {/* Saran Coach — chip progresi di samping daftar set */}
              {advice && (
                <m.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: motionTokens.easing.standard }}
                  className="mt-3 rounded-2xl border border-hero-content/12 bg-hero-content/[0.06] p-3.5"
                >
                  <div className="flex items-start gap-2.5">
                    {advice.action === 'naik' ? (
                      <ArrowUpCircle
                        className="mt-0.5 h-5 w-5 shrink-0 text-pistachio"
                        aria-hidden="true"
                      />
                    ) : advice.action === 'turun' ? (
                      <ArrowDownCircle
                        className="mt-0.5 h-5 w-5 shrink-0 text-hero-accent"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className="mt-0.5 h-5 w-5 shrink-0 text-hero-content-muted"
                        aria-hidden="true"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-hero-content-muted">
                        Saran Coach
                      </p>
                      <p className="mt-0.5 text-[12.5px] font-semibold leading-relaxed text-hero-content">
                        {fmtKg(advice.nextWeight)} kg — {advice.reason}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyAdvice(advice.nextWeight)}
                      className="h-8 shrink-0 cursor-pointer rounded-full bg-primary px-3.5 text-[12px] font-bold text-primary-foreground transition-colors hover:bg-action-hover active:scale-[0.95] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      Terapkan
                    </button>
                  </div>
                </m.div>
              )}

              {session.exercises.length > 1 && (
                <p className="mt-5 flex items-center justify-center gap-1.5 text-[10.5px] font-medium text-hero-content-muted">
                  <ChevronLeft className="h-3 w-3" aria-hidden="true" />
                  Geser untuk pindah gerakan
                  <ChevronRight className="h-3 w-3" aria-hidden="true" />
                </p>
              )}
            </m.div>
          ) : (
            <m.div
              key="session-empty"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.26, ease: motionTokens.easing.standard }}
              className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-hero-content/10 text-hero-accent">
                <Dumbbell className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-[15px] font-bold text-hero-content">
                Sesi masih kosong
              </p>
              <p className="max-w-[280px] text-[12.5px] leading-relaxed text-hero-content-muted">
                Tambahkan gerakan pertama untuk mulai mencatat set — atau akhiri
                sesi bila berubah pikiran.
              </p>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="mt-1 flex h-11 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-5 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-action-hover active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Tambah gerakan
              </button>
            </m.div>
          )}
        </main>

        {/* Tumpukan bawah: timer istirahat → CTA → navigasi gerakan */}
        <div className="shrink-0 space-y-3 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <AnimatePresence>
            {session.restingUntil != null && (
              <RestCard
                key="rest"
                restingUntil={session.restingUntil}
                restDuration={session.restDuration}
                onExtend={extendRest}
                onSkip={skipRest}
                onFinished={handleRestFinished}
              />
            )}
          </AnimatePresence>

          {ex && (
            <m.button
              type="button"
              onClick={handleComplete}
              whileTap={{ scale: 0.97 }}
              className="h-14 w-full cursor-pointer rounded-full bg-primary text-[15px] font-bold tracking-[0.06em] text-primary-foreground shadow-leaf transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              SET SELESAI
            </m.button>
          )}

          {session.exercises.length > 1 && (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={goPrev}
                disabled={!prevEx}
                aria-label="Gerakan sebelumnya"
                className="flex h-11 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-hero-content/10 px-3 text-[12px] font-bold text-hero-content transition-colors hover:bg-hero-content/20 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{prevEx?.name}</span>
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!nextEx}
                aria-label="Gerakan berikutnya"
                className="flex h-11 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-hero-content/10 px-3 text-[12px] font-bold text-hero-content transition-colors hover:bg-hero-content/20 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="truncate">{nextEx?.name}</span>
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Konfirmasi akhiri — RutinaDialog terpusat (fokus terkurung). */}
      <RutinaDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        label="Akhiri sesi latihan"
      >
        <h3 className="text-lg font-semibold tracking-tight text-content-primary">
          Akhiri sesi latihan?
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-content-muted">
          {totalSets > 0
            ? `Progres yang sudah dicatat akan disimpan (${totalSets} set).`
            : 'Belum ada set yang tercatat pada sesi ini.'}
        </p>
        <div className="mt-4 space-y-2">
          {totalSets > 0 && (
            <button
              type="button"
              onClick={handleSaveEnd}
              className="h-12 w-full cursor-pointer rounded-full bg-primary text-[14px] font-bold text-primary-foreground transition-colors hover:bg-action-hover active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Simpan &amp; akhiri
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            className="h-11 w-full cursor-pointer rounded-full border border-border bg-surface-primary text-[13.5px] font-bold text-content-primary transition-colors hover:bg-surface-secondary active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Lanjutkan
          </button>
          <button
            type="button"
            onClick={handleDiscard}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-destructive/35 text-[13px] font-bold text-content-danger transition-colors hover:bg-destructive/10 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Buang sesi
          </button>
        </div>
      </RutinaDialog>
    </m.div>
  )
}

/* ===== Momen pencapaian paska-sesi — satu-satunya anime.js ===== */

function SessionCelebration({
  summary,
  onDone,
}: {
  summary: SessionSummary | null
  onDone: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    if (!summary) {
      doneRef.current = false
      return
    }
    if (doneRef.current) return
    doneRef.current = true

    const root = rootRef.current
    const card = root?.querySelector('[data-celebrate-card]') ?? null
    const pop = root?.querySelector('[data-celebrate-pop]') ?? null
    const stats = root
      ? Array.from(root.querySelectorAll('[data-celebrate-stat]'))
      : []

    /* Scope anime.js: revert otomatis saat unmount; mediaQueries
       menghormati prefers-reduced-motion (pola splash.tsx). */
    const scope = createScope({
      root: rootRef,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
    }).add((self) => {
      const rm = self?.matches?.reduceMotion ?? false
      const d = (ms: number) => (rm ? 1 : ms)
      const tl = createTimeline({ defaults: { ease: 'outExpo' } })
      if (card) tl.add(card, { opacity: [0, 1], scale: [0.86, 1], duration: d(520) }, 0)
      if (pop)
        tl.add(
          pop,
          {
            opacity: [0, 1],
            scale: [0.4, 1],
            rotate: [0, -12, 7, 0],
            duration: d(720),
            ease: 'outBack(2.1)',
          },
          rm ? 0 : 120,
        )
      if (stats.length > 0)
        tl.add(
          stats,
          {
            opacity: [0, 1],
            translateY: [14, 0],
            duration: d(480),
            delay: rm ? 0 : stagger(90),
          },
          rm ? 0 : 280,
        )
    })

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(onDone, reduced ? 1000 : 2600)
    return () => {
      clearTimeout(timer)
      scope.revert()
    }
  }, [summary, onDone])

  return (
    <AnimatePresence>
      {summary && (
        <m.div
          key="session-done"
          ref={rootRef}
          role="status"
          aria-label="Sesi latihan tersimpan"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[75] flex items-center justify-center bg-hero-surface px-5 text-hero-content"
        >
          <div
            data-celebrate-card
            style={{ opacity: 0 }}
            className={`w-full rounded-[28px] border border-hero-content/12 bg-hero-surface-raised p-7 text-center shadow-ink-deep ${CONTENT_W} max-w-[calc(100%-1rem)]`}
          >
            <span
              data-celebrate-pop
              style={{ opacity: 0 }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold/20 text-hero-accent"
            >
              <Trophy className="h-9 w-9" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.24em] text-hero-accent">
              Sesi Latihan Tersimpan
            </p>
            <p className="mt-2 text-[30px] font-bold leading-none tabular-nums text-hero-content">
              {summary.sets} set
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-hero-content/12 pt-4">
              {[
                {
                  label: 'Tonase',
                  value: `${Math.round(summary.tonase).toLocaleString('id-ID')} kg`,
                },
                { label: 'Durasi', value: `${summary.minutes} mnt` },
                { label: 'Gerakan', value: String(summary.exercises) },
              ].map((s) => (
                <div key={s.label} data-celebrate-stat style={{ opacity: 0 }}>
                  <p className="text-[15px] font-bold tabular-nums text-hero-content">
                    {s.value}
                  </p>
                  <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-hero-content-muted">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}

/* ===== Pemilih sesi sebelum mulai ===== */

interface PickerItem {
  name: string
  targetSets: number
  targetReps: number
}

interface RecentEx {
  name: string
  weight: number
  reps: number
}

/** Gerakan terakhir dari histori (terbaru dulu, unik). */
function recentExercises(workouts: Workout[]): RecentEx[] {
  const seen = new Set<string>()
  const out: RecentEx[] = []
  for (const w of workouts) {
    if (w.kind !== 'beban') continue
    for (const s of w.sets) {
      if (seen.has(s.exercise)) continue
      seen.add(s.exercise)
      out.push({ name: s.exercise, weight: s.weight, reps: s.reps })
    }
  }
  return out.slice(0, 8)
}

export function SessionPickerSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const workouts = useRutina((s) => s.workouts)
  const startSession = useSessionStore((s) => s.startSession)

  const [plan, setPlan] = useState<PickerItem[]>([])
  const [pick, setPick] = useState('')
  const [prevOpen, setPrevOpen] = useState(false)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(open, panelRef)

  /* Draf di-reset setiap kali lembar dibuka — pola render-time yang
     sama dengan workout-sheet (tanpa setState dalam effect). */
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setPlan([])
      setPick('')
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const recent = useMemo(() => recentExercises(workouts), [workouts])

  const toggleRecent = (r: RecentEx) => {
    setPlan((p) =>
      p.some((it) => it.name === r.name)
        ? p.filter((it) => it.name !== r.name)
        : [...p, { name: r.name, targetSets: 3, targetReps: r.reps }],
    )
  }

  const addFromSelect = (name: string) => {
    if (!name) return
    if (plan.some((it) => it.name === name)) {
      toast.info(`${name} sudah ada di daftar sesi.`)
      return
    }
    const stat = exStatOf(workouts, name)
    setPlan((p) => [
      ...p,
      { name, targetSets: 3, targetReps: stat.lastReps || 8 },
    ])
  }

  const patchPlan = (i: number, targetSets: number) =>
    setPlan((p) => p.map((it, j) => (j === i ? { ...it, targetSets } : it)))

  const start = () => {
    startSession(
      plan.map((it) => {
        const stat = exStatOf(workouts, it.name)
        return {
          name: it.name,
          targetSets: it.targetSets,
          targetReps: it.targetReps,
          hintWeight: stat.lastWeight,
          hintReps: stat.lastReps,
        }
      }),
    )
    onClose()
  }

  const startEmpty = () => {
    startSession([])
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={onClose}
            className="fixed inset-0 z-40 bg-espresso/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center">
            <m.div
              key="panel"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              aria-label="Mulai sesi latihan"
              drag="y"
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.55 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 600) onClose()
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className={`pointer-events-auto max-h-[92%] w-full overflow-y-auto rounded-t-[28px] bg-surface-primary px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 no-scrollbar shadow-sheet ${CONTENT_W}`}
            >
              {/* Pegangan seret */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
                aria-hidden="true"
              >
                <span className="h-1.5 w-10 rounded-full bg-cocoa/15" />
              </div>

              <div className="text-left">
                <h2 className="text-lg font-semibold tracking-tight text-content-primary">
                  Mulai Sesi Latihan
                </h2>
                <p className="mt-0.5 text-[13px] leading-relaxed text-content-muted">
                  Mode imersif layar penuh — timer istirahat otomatis, geser
                  antar gerakan, set tercatat seketika.
                </p>
              </div>

              {/* Cepat mulai — dari riwayat nyata */}
              <div className="mt-4">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-content-secondary">
                  Cepat Mulai
                </p>
                {recent.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {recent.map((r) => {
                      const on = plan.some((it) => it.name === r.name)
                      return (
                        <button
                          key={r.name}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleRecent(r)}
                          className={`flex h-11 min-w-0 cursor-pointer items-center gap-2 rounded-full px-3.5 text-[12.5px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                            on
                              ? 'bg-primary text-primary-foreground'
                              : 'border border-border bg-surface-sunken text-content-secondary hover:bg-secondary'
                          }`}
                        >
                          {on && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />}
                          <span className="max-w-[150px] truncate">{r.name}</span>
                          <span
                            className={`text-[11px] font-semibold tabular-nums ${on ? 'opacity-80' : 'text-content-muted'}`}
                          >
                            {fmtKg(r.weight)}×{r.reps}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-2 rounded-xl bg-surface-sunken px-3.5 py-2.5 text-[12px] leading-relaxed text-content-muted">
                    Belum ada riwayat latihan — pilih gerakan di bawah untuk
                    menyusun sesi pertamamu.
                  </p>
                )}
              </div>

              {/* Tambah gerakan dari pustaka */}
              <div className="mt-4">
                <label
                  htmlFor="session-add-ex"
                  className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-content-secondary"
                >
                  Tambah Gerakan
                </label>
                <select
                  id="session-add-ex"
                  value={pick}
                  onChange={(e) => {
                    addFromSelect(e.target.value)
                    setPick('')
                  }}
                  className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-border bg-surface-sunken px-3 text-[13.5px] font-semibold text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                >
                  <option value="">Pilih gerakan…</option>
                  {EX_OPTIONS.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.items.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Rencana sesi */}
              {plan.length === 0 ? (
                <p className="mt-4 rounded-2xl border-2 border-dashed border-primary/30 px-4 py-5 text-center text-[12px] leading-relaxed text-content-muted">
                  Belum ada gerakan dipilih — atau mulai dengan{' '}
                  <span className="font-bold text-success">latihan kosong</span>{' '}
                  dan susun sambil berlatih.
                </p>
              ) : (
                <div className="mt-4 space-y-2.5">
                  {plan.map((it, i) => {
                    const meta = EX_LIB.find((e) => e.name === it.name)
                    return (
                      <m.div
                        key={it.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, ease: motionTokens.easing.standard }}
                        className="rounded-2xl border border-border bg-surface-primary p-3.5 shadow-soft"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-bold text-content-primary">
                              {it.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] font-medium text-content-muted">
                              {meta ? `${meta.muscle} · ${meta.equipment}` : '—'}
                            </span>
                          </span>
                          <div className="flex h-10 shrink-0 items-center rounded-xl border border-border bg-surface-sunken">
                            <button
                              type="button"
                              aria-label={`Kurangi target set ${it.name}`}
                              onClick={() => patchPlan(i, Math.max(1, it.targetSets - 1))}
                              className="flex h-full w-9 cursor-pointer items-center justify-center text-content-secondary transition-colors hover:text-content-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-7 text-center text-[14px] font-bold tabular-nums text-content-primary">
                              {it.targetSets}
                            </span>
                            <button
                              type="button"
                              aria-label={`Tambah target set ${it.name}`}
                              onClick={() => patchPlan(i, Math.min(12, it.targetSets + 1))}
                              className="flex h-full w-9 cursor-pointer items-center justify-center text-content-secondary transition-colors hover:text-success focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            aria-label={`Hapus ${it.name} dari sesi`}
                            onClick={() =>
                              setPlan((p) => p.filter((_, j) => j !== i))
                            }
                            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-content-danger transition-colors hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </m.div>
                    )
                  })}
                </div>
              )}

              {/* CTA */}
              <div className="mt-5 space-y-2.5">
                <m.button
                  type="button"
                  onClick={start}
                  disabled={plan.length === 0}
                  whileTap={{ scale: 0.98 }}
                  className="h-12 w-full cursor-pointer rounded-full bg-primary text-[15px] font-bold text-primary-foreground shadow-soft transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Play className="h-4.5 w-4.5" strokeWidth={2.5} aria-hidden="true" />
                    Mulai Sesi{plan.length > 0 ? ` · ${plan.length} gerakan` : ''}
                  </span>
                </m.button>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-11 cursor-pointer rounded-full text-[13px] font-bold text-content-secondary transition-colors hover:bg-surface-secondary active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={startEmpty}
                    className="h-11 cursor-pointer rounded-full border border-border bg-surface-primary text-[13px] font-bold text-content-primary transition-colors hover:bg-surface-secondary active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Latihan kosong
                  </button>
                </div>
              </div>
            </m.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ===== Overlay global — dipasang di layar Bugar ===== */

export function WorkoutSessionOverlay() {
  const session = useSessionStore((s) => s.session)
  const [summary, setSummary] = useState<SessionSummary | null>(null)

  return (
    <>
      <AnimatePresence>
        {session && (
          <SessionView key="session" session={session} onSaved={setSummary} />
        )}
      </AnimatePresence>
      <SessionCelebration summary={summary} onDone={() => setSummary(null)} />
    </>
  )
}

/* Re-export agar layar Bugar bisa memulai sesi dari praisai program. */
export { SESSION_REST_MS, startSeededSession } from './session-store'
