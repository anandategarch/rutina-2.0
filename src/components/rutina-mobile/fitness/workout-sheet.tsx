'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  useDragControls,
} from 'motion/react'
import * as m from 'motion/react-m'
import {
  AlertTriangle,
  ChevronsUpDown,
  Dumbbell,
  Footprints,
  Minus,
  Plus,
  Trash2,
  Volleyball,
} from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fade, pressSnappy, sheetSpring } from '@/lib/motion/transitions'
import { motionTokens } from '@/lib/motion/tokens'
import { CONTENT_W } from '../layout-widths'
import {
  deloadActive,
  deloadSets,
  exStatOf,
  paceOf,
} from './fit-utils'
import { exerciseLabel } from './data'
import { GerakanPickerSheet } from './gerakan-picker-sheet'
import {
  shortDateLabel,
  todayISO,
  useRutina,
  type WorkoutKind,
  type WorkoutSeed,
  type WorkoutSet,
} from '../store'
import { useFocusTrap } from '../use-focus-trap'

/**
 * Lembar catat aktivitas (v2.17) — tiga mode mengikuti empat jenis
 * aktivitas Bugar: Lari & Jalan (jalan/lari/kombinasi), Badminton,
 * dan Angkat Beban. Prinsip: Rutina PUSAT CATATAN hasil smartwatch —
 * kalori diambil dari angka jam tangan bila tersedia, pace dihitung
 * dari total waktu & jarak (kombinasi tetap SATU catatan).
 * Terbuka dari tombol "Catat Aktivitas", kartu program, atau pustaka.
 */

/* Blok input: satu gerakan × beban × repetisi × jumlah set.
   Saat disimpan, blok diekspansi menjadi set individual agar
   histori & PR e1RM konsisten dengan domain Workout. */
interface SetBlock {
  exercise: string
  weight: string
  reps: string
  count: number
}

/* Peta seed → blok: target set/reps dari program dihormati; beban
   diisi dari histori terakhir pengguna (coach pintar) atau default. */
function seedToBlocks(seed: WorkoutSeed[], lastOf: (name: string) => { weight: number; reps: number }): SetBlock[] {
  return seed.map((s) => {
    const last = lastOf(s.name)
    return {
      exercise: s.name,
      weight: String(last.weight || 5),
      reps: String(s.reps || last.reps || 5),
      count: Math.min(12, Math.max(1, s.count)),
    }
  })
}

const emptyBlock = (): SetBlock => ({
  exercise: '',
  weight: '',
  reps: '',
  count: 3,
})

/** Pilihan jenis dalam mode Lari & Jalan — kombinasi tetap satu catatan. */
const CARDIO_KINDS: { kind: WorkoutKind; label: string; hint: string }[] = [
  { kind: 'jalan', label: 'Jalan', hint: 'jalan santai / cepat' },
  { kind: 'lari', label: 'Lari', hint: 'lari terus' },
  { kind: 'lari-jalan', label: 'Lari + Jalan', hint: 'bergantian — satu catatan' },
]

/** Chip kondisi permainan badminton — mengisi awal catatan. */
const BAD_CONDITIONS = ['Santai', 'Sedang', 'Intens'] as const

export function WorkoutSheet() {
  const open = useRutina((s) => s.workoutSheetOpen)
  const seed = useRutina((s) => s.workoutSheetSeed)
  const hint = useRutina((s) => s.workoutSheetHint)
  const workouts = useRutina((s) => s.workouts)
  const deloadUntil = useRutina((s) => s.deloadUntil)
  const closeWorkoutSheet = useRutina((s) => s.closeWorkoutSheet)
  const addWorkout = useRutina((s) => s.addWorkout)

  const [mode, setMode] = useState<'beban' | 'kardio' | 'badminton'>('kardio')
  const [cardioKind, setCardioKind] = useState<WorkoutKind>('jalan')
  const [date, setDate] = useState(todayISO())
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [kcal, setKcal] = useState('')
  const [badCondition, setBadCondition] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [blocks, setBlocks] = useState<SetBlock[]>([emptyBlock()])
  /* Indeks blok yang sedang membuka pemilih gerakan — null = tertutup. */
  const [pickerFor, setPickerFor] = useState<number | null>(null)
  const [prevOpen, setPrevOpen] = useState(false)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(open, panelRef)

  /* Draf di-reset setiap kali lembar dibuka — termasuk praisi
     dari program/pustaka (seed) memakai beban terakhir pengguna.
     v2.18: hint dari tombol pintasan memilih mode awal — "Lari"
     membuka template lari SEKETIKA; seed dari program barbel membuka
     mode beban secara otomatis. */
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setMode(hint?.mode ?? (seed && seed.length > 0 ? 'beban' : 'kardio'))
      setCardioKind(hint?.cardioKind ?? 'jalan')
      setDate(todayISO())
      setDuration('')
      setDistance('')
      setKcal('')
      setBadCondition(null)
      setNote('')
      setBlocks(
        seed && seed.length > 0
          ? seedToBlocks(seed, (name) => {
              const stat = exStatOf(workouts, name)
              return { weight: stat.lastWeight, reps: stat.lastReps }
            })
          : [emptyBlock()],
      )
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeWorkoutSheet()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeWorkoutSheet])

  const patchBlock = (i: number, patch: Partial<SetBlock>) =>
    setBlocks((bs) => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)))

  const submit = () => {
    const dur = Number(duration || '0')
    if (!date) {
      toast.warning('Pilih tanggal sesi')
      return
    }
    const kcalNum = Number((kcal || '0').replace(/\D/g, ''))

    if (mode === 'kardio') {
      const km = Number(distance.replace(',', '.'))
      if (km <= 0 || dur <= 0) {
        toast.warning('Isi jarak dan durasi dulu')
        return
      }
      addWorkout({
        kind: cardioKind,
        date,
        duration: dur,
        note,
        sets: [],
        distance: km,
        ...(kcalNum > 0 ? { kcal: kcalNum } : {}),
      })
      toast.success(
        `${cardioKind === 'jalan' ? 'Jalan' : cardioKind === 'lari' ? 'Lari' : 'Lari + Jalan'} ${km.toString().replace('.', ',')} km tercatat — pace ${paceOf(dur, km)}/km`,
      )
      return
    }

    if (mode === 'badminton') {
      if (dur <= 0) {
        toast.warning('Isi durasi bermain dulu')
        return
      }
      const condNote = badCondition
        ? note.trim()
          ? `${badCondition} — ${note.trim()}`
          : badCondition
        : note.trim()
      addWorkout({
        kind: 'badminton',
        date,
        duration: dur,
        note: condNote,
        sets: [],
        ...(kcalNum > 0 ? { kcal: kcalNum } : {}),
      })
      toast.success(
        `Badminton ${dur} menit tercatat${kcalNum > 0 ? ` · ${kcalNum} kkal (smartwatch)` : ''}`,
      )
      return
    }

    const valid: WorkoutSet[] = []
    for (const b of blocks) {
      const w = Number(b.weight.replace(',', '.'))
      const r = Number(b.reps)
      if (!b.exercise || w <= 0 || r <= 0 || b.count < 1) continue
      for (let i = 0; i < b.count; i++) {
        valid.push({ exercise: b.exercise, weight: w, reps: r })
      }
    }
    if (valid.length === 0) {
      toast.warning('Tambahkan minimal satu set yang lengkap')
      return
    }
    addWorkout({
      kind: 'beban',
      date,
      duration: dur,
      note,
      sets: valid,
      ...(kcalNum > 0 ? { kcal: kcalNum } : {}),
    })
    const names = [...new Set(valid.map((s) => s.exercise))]
    toast.success(
      `Sesi barbel tersimpan — ${names.length} gerakan, ${valid.length} set`,
    )
  }

  const pace = paceOf(Number(duration || '0'), Number(distance.replace(',', '.') || '0'))

  /* ===== Deload-aware targets — mode beban + masa deload aktif ===== */
  const deloadOn = deloadActive(deloadUntil)

  /** Angka input Indonesia: 27.5 -> "27,5" (integer tetap polos). */
  const fmtInput = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')

  /* Terapkan deloadSets() ke draf: blok valid diekspansi menjadi set
     (persis jalur submit), dipangkas 50% + pembulatan 2,5 kg, lalu
     dipetakan balik per blok. Blok tidak valid dibiarkan apa adanya. */
  const applyDeload = () => {
    const valid: WorkoutSet[] = []
    const spans: { index: number; count: number }[] = []
    blocks.forEach((b, i) => {
      const w = Number(b.weight.replace(',', '.'))
      const r = Number(b.reps)
      if (!b.exercise || w <= 0 || r <= 0 || b.count < 1) return
      spans.push({ index: i, count: b.count })
      for (let k = 0; k < b.count; k++) valid.push({ exercise: b.exercise, weight: w, reps: r })
    })
    if (valid.length === 0) {
      toast.warning('Isi minimal satu gerakan dengan beban dulu.')
      return
    }
    const halved = deloadSets(valid)
    let cursor = 0
    setBlocks((bs) =>
      bs.map((b, i) => {
        const span = spans.find((s) => s.index === i)
        if (!span) return b
        const next = halved.slice(cursor, cursor + span.count)
        cursor += span.count
        const w0 = next[0]?.weight
        if (w0 != null && w0 > 0) return { ...b, weight: fmtInput(w0) }
        return b
      }),
    )
    toast.success('Target beban dipangkas 50% — masih bisa diedit manual.')
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={closeWorkoutSheet}
            className="absolute inset-0 z-40 bg-espresso/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
          />
          <m.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            aria-label="Catat aktivitas"
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600)
                closeWorkoutSheet()
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetSpring}
            className={`absolute inset-x-0 bottom-0 z-50 mx-auto max-h-[92%] w-full overflow-y-auto rounded-t-sheet bg-surface-primary px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 no-scrollbar ${CONTENT_W}`}
          >
            {/* Pegangan seret */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-content-secondary/25" />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="text-left">
                <h2 className="text-lead font-semibold tracking-tight text-content-primary">
                  Catat Aktivitas
                </h2>
                <p className="mt-0.5 text-note text-content-muted">
                  {shortDateLabel(date || todayISO())} — hasil smartwatch
                  tinggal dipindahkan ke sini.
                </p>
              </div>
            </div>

            {/* Saklar mode: Lari & Jalan | Badminton | Beban */}
            <div
              role="group"
              aria-label="Jenis aktivitas"
              className="relative mt-3 flex rounded-full bg-surface-secondary p-1"
            >
              {([
                { id: 'kardio', label: 'Lari & Jalan', icon: Footprints },
                { id: 'badminton', label: 'Badminton', icon: Volleyball },
                { id: 'beban', label: 'Barbel', icon: Dumbbell },
              ] as const).map((t) => {
                const on = mode === t.id
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMode(t.id)}
                    aria-pressed={on}
                    className={`relative z-10 flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full text-note font-bold transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      on ? 'text-success' : 'text-content-muted'
                    }`}
                  >
                    {on && (
                      <m.span
                        aria-hidden="true"
                        layoutId="wo-mode-pill"
                        className="absolute inset-0 z-[-1] rounded-full bg-surface-primary shadow-soft"
                        transition={pressSnappy}
                      />
                    )}
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{t.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Tanggal & durasi */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="wo-date" className="text-note font-semibold text-content-secondary">
                  Tanggal
                </Label>
                <Input
                  id="wo-date"
                  type="date"
                  value={date}
                  max={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 rounded-xl border-border bg-surface-sunken text-content-primary focus-visible:border-primary focus-visible:ring-primary/25"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wo-dur" className="text-note font-semibold text-content-secondary">
                  Durasi (menit)
                </Label>
                <Input
                  id="wo-dur"
                  inputMode="numeric"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder={mode === 'badminton' ? '60' : '38'}
                  className="h-11 rounded-xl border-border bg-surface-sunken text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
                />
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {mode === 'kardio' && (
                <m.div
                  key="kardio"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.24, ease: motionTokens.easing.standard }}
                  className="mt-4"
                >
                  {/* Jenis kardio — kombinasi lari+jalan TETAP satu catatan;
                      pace dihitung dari total waktu & jarak. */}
                  <div
                    role="group"
                    aria-label="Jenis lari dan jalan"
                    className="flex rounded-full bg-surface-secondary p-1"
                  >
                    {CARDIO_KINDS.map((k) => (
                      <button
                        key={k.kind}
                        type="button"
                        onClick={() => setCardioKind(k.kind)}
                        aria-pressed={cardioKind === k.kind}
                        title={k.hint}
                        className={`h-9 flex-1 cursor-pointer rounded-full text-note font-bold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          cardioKind === k.kind
                            ? 'bg-surface-primary text-success shadow-soft'
                            : 'text-content-muted'
                        }`}
                      >
                        {k.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="wo-km" className="text-note font-semibold text-content-secondary">
                        Jarak (km)
                      </Label>
                      <Input
                        id="wo-km"
                        inputMode="decimal"
                        value={distance}
                        onChange={(e) =>
                          setDistance(e.target.value.replace(/[^\d.,]/g, '').slice(0, 5))
                        }
                        placeholder="4,25"
                        className="h-11 rounded-xl border-border bg-surface-sunken tabular-nums focus-visible:border-primary focus-visible:ring-primary/25"
                      />
                    </div>
                    <div className="flex items-end">
                      <div
                        className={`flex h-11 w-full items-center justify-center rounded-xl text-body font-bold tabular-nums ${
                          pace ? 'bg-secondary text-success' : 'bg-surface-sunken text-content-muted'
                        }`}
                        aria-live="polite"
                      >
                        {pace ? `${pace} /km` : 'pace otomatis'}
                      </div>
                    </div>
                  </div>
                </m.div>
              )}

              {mode === 'badminton' && (
                <m.div
                  key="badminton"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.24, ease: motionTokens.easing.standard }}
                  className="mt-4"
                >
                  <p className="text-meta leading-relaxed text-content-muted">
                    Cukup praktis — durasi main, kalori dari smartwatch bila
                    ada, dan kondisi permainan. Tidak ada metrik jarak/pace.
                  </p>
                  <div
                    role="group"
                    aria-label="Kondisi permainan"
                    className="mt-3 flex gap-2"
                  >
                    {BAD_CONDITIONS.map((c) => {
                      const on = badCondition === c
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setBadCondition(on ? null : c)}
                          aria-pressed={on}
                          className={`h-10 flex-1 cursor-pointer rounded-xl text-note font-bold transition-all active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                            on
                              ? 'bg-primary text-primary-foreground shadow-soft'
                              : 'border border-border bg-surface-sunken text-content-secondary'
                          }`}
                        >
                          {c}
                        </button>
                      )
                    })}
                  </div>
                </m.div>
              )}

              {mode === 'beban' && (
                <m.div
                  key="beban"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.24, ease: motionTokens.easing.standard }}
                  className="mt-4"
                >
                  <div className="flex items-center justify-between px-0.5">
                    <Label className="text-note font-semibold text-content-secondary">
                      Gerakan &amp; Set
                    </Label>
                    <span className="text-eyebrow font-medium text-content-muted">
                      {blocks.length} blok
                    </span>
                  </div>

                  {/* Deload-aware targets — saran 50% saat masa deload */}
                  {deloadOn && (
                    <div className="mt-2.5 rounded-2xl border border-warning/40 bg-gold/25 p-3.5">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle
                          className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-meta font-semibold leading-snug text-content-primary">
                            Masa deload — target beban disarankan 50%
                          </p>
                          <p className="mt-0.5 text-eyebrow leading-relaxed text-content-muted">
                            Setengah beban, pembulatan 2,5 kg — tetap bisa
                            diedit manual setelah diterapkan.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={applyDeload}
                        className="mt-2.5 flex h-10 w-full cursor-pointer items-center justify-center rounded-full bg-warning text-note font-bold text-content-inverse transition-colors hover:bg-gold/50 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warning"
                      >
                        Terapkan 50%
                      </button>
                    </div>
                  )}

                  <div className="mt-2 space-y-2.5">
                    {blocks.map((b, i) => (
                      <m.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        transition={{ duration: 0.22 }}
                        className="rounded-2xl border border-border bg-surface-primary p-3.5"
                      >
                        <div className="flex items-center gap-2">
                          {/* Pemicu pemilih gerakan — menggantikan <select>
                              native; katalog + pencarian + riwayat ada di
                              GerakanPickerSheet (v2.20). */}
                          <button
                            type="button"
                            aria-label={`Pilih gerakan blok ${i + 1}${
                              b.exercise
                                ? `: ${exerciseLabel(b.exercise)}. Ketuk untuk mengganti.`
                                : ''
                            }`}
                            onClick={() => setPickerFor(i)}
                            className={`flex h-10 min-w-0 flex-1 cursor-pointer items-center justify-between gap-2 rounded-xl border bg-surface-sunken px-3 text-left text-body font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
                              b.exercise
                                ? 'border-primary text-content-primary'
                                : 'border-border text-content-muted'
                            }`}
                          >
                            <span className="truncate">
                              {b.exercise
                                ? exerciseLabel(b.exercise)
                                : 'Pilih gerakan…'}
                            </span>
                            <ChevronsUpDown
                              className="h-4 w-4 shrink-0 text-content-muted"
                              aria-hidden="true"
                            />
                          </button>
                          <button
                            type="button"
                            aria-label={`Hapus blok ${i + 1}`}
                            onClick={() =>
                              setBlocks((bs) =>
                                bs.length > 1 ? bs.filter((_, j) => j !== i) : bs,
                              )
                            }
                            disabled={blocks.length <= 1}
                            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-content-danger transition-colors hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {/* Nama Indonesia utama + istilah Inggris kecil. */}
                        {b.exercise && (
                          <p className="mt-1.5 truncate text-eyebrow font-medium text-content-muted">
                            {exerciseLabel(b.exercise)}
                            <span className="text-content-muted/70"> · {b.exercise}</span>
                          </p>
                        )}

                        <div className="mt-2.5 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                          <div>
                            <p className="mb-1 text-eyebrow font-semibold uppercase tracking-wide text-content-muted">
                              Beban (kg)
                            </p>
                            <Input
                              aria-label={`Beban blok ${i + 1}`}
                              inputMode="decimal"
                              value={b.weight}
                              onChange={(e) =>
                                patchBlock(i, {
                                  weight: e.target.value.replace(/[^\d.,]/g, '').slice(0, 4),
                                })
                              }
                              placeholder="5"
                              className="h-10 rounded-xl border-border bg-surface-sunken tabular-nums focus-visible:border-primary focus-visible:ring-primary/25"
                            />
                          </div>
                          <div>
                            <p className="mb-1 text-eyebrow font-semibold uppercase tracking-wide text-content-muted">
                              Repetisi
                            </p>
                            <Input
                              aria-label={`Repetisi blok ${i + 1}`}
                              inputMode="numeric"
                              value={b.reps}
                              onChange={(e) =>
                                patchBlock(i, {
                                  reps: e.target.value.replace(/\D/g, '').slice(0, 3),
                                })
                              }
                              placeholder="12"
                              className="h-10 rounded-xl border-border bg-surface-sunken tabular-nums focus-visible:border-primary focus-visible:ring-primary/25"
                            />
                          </div>
                          <div>
                            <p className="mb-1 text-eyebrow font-semibold uppercase tracking-wide text-content-muted">
                              Set
                            </p>
                            <div className="flex h-10 items-center rounded-xl border border-border bg-surface-sunken">
                              <button
                                type="button"
                                aria-label="Kurangi set"
                                onClick={() =>
                                  patchBlock(i, { count: Math.max(1, b.count - 1) })
                                }
                                className="flex h-full w-8 cursor-pointer items-center justify-center text-content-secondary transition-colors hover:text-content-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-6 text-center text-body font-bold tabular-nums text-content-primary">
                                {b.count}
                              </span>
                              <button
                                type="button"
                                aria-label="Tambah set"
                                onClick={() =>
                                  patchBlock(i, { count: Math.min(12, b.count + 1) })
                                }
                                className="flex h-full w-8 cursor-pointer items-center justify-center text-content-secondary transition-colors hover:text-success focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </m.div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setBlocks((bs) => [...bs, emptyBlock()])}
                    className="mt-2.5 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-primary/40 text-note font-bold text-success transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah gerakan
                  </button>
                </m.div>
              )}
            </AnimatePresence>

            {/* Kalori dari smartwatch — opsional semua mode; Rutina tidak
                mengklaim mengukur kalori sendiri (v2.17). */}
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="wo-kcal" className="text-note font-semibold text-content-secondary">
                Kalori{' '}
                <span className="font-normal text-content-muted">
                  (opsional — dari smartwatch)
                </span>
              </Label>
              <Input
                id="wo-kcal"
                inputMode="numeric"
                value={kcal}
                onChange={(e) => setKcal(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="mis. 280"
                className="h-11 rounded-xl border-border bg-surface-sunken tabular-nums focus-visible:border-primary focus-visible:ring-primary/25"
              />
            </div>

            {/* Catatan */}
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="wo-note" className="text-note font-semibold text-content-secondary">
                Catatan <span className="font-normal text-content-muted">(opsional)</span>
              </Label>
              <Input
                id="wo-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  mode === 'badminton'
                    ? 'mis. double berturut-turut'
                    : 'mis. pace terakhir lebih stabil'
                }
                maxLength={60}
                className="h-11 rounded-xl border-border bg-surface-sunken text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
              />
            </div>

            {/* Simpan */}
            <m.button
              type="button"
              onClick={submit}
              whileTap={{ scale: 0.98 }}
              className="mt-5 h-12 w-full cursor-pointer rounded-full bg-primary text-section font-bold text-primary-foreground shadow-soft transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Simpan Aktivitas
            </m.button>
          </m.div>

          {/* Lembar pemilih gerakan — overlay di atas lembar catat
              aktivitas; katalog barbel tertutup (tanpa tambah baru). */}
          <GerakanPickerSheet
            open={pickerFor != null}
            selectedId={
              pickerFor != null
                ? blocks[pickerFor]?.exercise || undefined
                : undefined
            }
            onSelect={(g) => {
              if (pickerFor != null) patchBlock(pickerFor, { exercise: g })
            }}
            onClose={() => setPickerFor(null)}
          />
        </>
      )}
    </AnimatePresence>
  )
}
