'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  useDragControls,
} from 'motion/react'
import * as m from 'motion/react-m'
import { AlertTriangle, Minus, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CONTENT_W } from '../layout-widths'
import {
  deloadActive,
  deloadSets,
  exStatOf,
  paceOf,
} from './fit-utils'
import { EX_LIB, MUSCLE_GROUPS } from './data'
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
 * Lembar catat sesi latihan — dua mode: Beban (blok gerakan dengan
 * jumlah set) dan Kardio (jalan/lari dengan pace otomatis).
 * Terbuka dari tombol "Catat Sesi", kartu program, atau pustaka gerakan.
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
      weight: String(last.weight || 20),
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

/** Gerakan dikelompokkan per otot untuk pemilih native yang ringkas. */
const EX_OPTIONS = MUSCLE_GROUPS.map((g) => ({
  group: g,
  items: EX_LIB.filter((e) => e.muscle === g).map((e) => e.name),
}))

export function WorkoutSheet() {
  const open = useRutina((s) => s.workoutSheetOpen)
  const seed = useRutina((s) => s.workoutSheetSeed)
  const workouts = useRutina((s) => s.workouts)
  const deloadUntil = useRutina((s) => s.deloadUntil)
  const closeWorkoutSheet = useRutina((s) => s.closeWorkoutSheet)
  const addWorkout = useRutina((s) => s.addWorkout)

  const [mode, setMode] = useState<'beban' | 'kardio'>('beban')
  const [cardioKind, setCardioKind] = useState<WorkoutKind>('jalan')
  const [date, setDate] = useState(todayISO())
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [note, setNote] = useState('')
  const [blocks, setBlocks] = useState<SetBlock[]>([emptyBlock()])
  const [prevOpen, setPrevOpen] = useState(false)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(open, panelRef)

  /* Draf di-reset setiap kali lembar dibuka — termasuk praisi
     dari program/pustaka (seed) memakai beban terakhir pengguna. */
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setMode('beban')
      setDate(todayISO())
      setDuration('')
      setDistance('')
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
      })
      toast.success(
        `${cardioKind === 'jalan' ? 'Jalan' : 'Lari'} ${km} km tercatat — pace ${paceOf(dur, km)}/km`,
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
    })
    const names = [...new Set(valid.map((s) => s.exercise))]
    toast.success(
      `Sesi beban tersimpan — ${names.length} gerakan, ${valid.length} set`,
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
            className="absolute inset-0 z-40 bg-espresso/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <m.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            aria-label="Catat sesi latihan"
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
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className={`absolute inset-x-0 bottom-0 z-50 mx-auto max-h-[92%] w-full overflow-y-auto rounded-t-[28px] bg-surface-primary px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 no-scrollbar ${CONTENT_W}`}
          >
            {/* Pegangan seret */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-cocoa/15" />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="text-left">
                <h2 className="text-lg font-semibold tracking-tight text-content-primary">
                  Catat Sesi
                </h2>
                <p className="mt-0.5 text-note text-content-muted">
                  Sesi baru — {shortDateLabel(date || todayISO())}.
                </p>
              </div>
            </div>

            {/* Saklar mode: Beban | Kardio */}
            <div
              role="group"
              aria-label="Jenis sesi"
              className="relative mt-3 flex rounded-full bg-surface-secondary p-1"
            >
              {(['beban', 'kardio'] as const).map((t) => {
                const on = mode === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMode(t)}
                    aria-pressed={on}
                    className={`relative z-10 flex h-9 flex-1 cursor-pointer items-center justify-center rounded-full text-note font-bold transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      on ? 'text-success' : 'text-content-muted'
                    }`}
                  >
                    {on && (
                      <m.span
                        aria-hidden="true"
                        layoutId="wo-mode-pill"
                        className="absolute inset-0 z-[-1] rounded-full bg-surface-primary shadow-soft"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    {t === 'beban' ? 'Angkat Beban' : 'Jalan / Lari'}
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
                  placeholder="45"
                  className="h-11 rounded-xl border-border bg-surface-sunken text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
                />
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {mode === 'beban' ? (
                <m.div
                  key="beban"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
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
                          <select
                            aria-label={`Gerakan blok ${i + 1}`}
                            value={b.exercise}
                            onChange={(e) => patchBlock(i, { exercise: e.target.value })}
                            className={`h-10 min-w-0 flex-1 cursor-pointer rounded-xl border bg-surface-sunken px-2.5 text-body font-semibold text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
                              b.exercise ? 'border-primary' : 'border-border text-content-muted'
                            }`}
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
                              placeholder="40"
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
                              placeholder="5"
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
                                className="flex h-full w-8 cursor-pointer items-center justify-center text-content-secondary transition-colors hover:text-content-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset--2 focus-visible:outline-primary"
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
                                className="flex h-full w-8 cursor-pointer items-center justify-center text-content-secondary transition-colors hover:text-success focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset--2 focus-visible:outline-primary"
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
              ) : (
                <m.div
                  key="kardio"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-4"
                >
                  <div
                    role="group"
                    aria-label="Jenis kardio"
                    className="flex rounded-full bg-surface-secondary p-1"
                  >
                    {(['jalan', 'lari'] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setCardioKind(k)}
                        aria-pressed={cardioKind === k}
                        className={`h-9 flex-1 cursor-pointer rounded-full text-note font-bold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          cardioKind === k
                            ? 'bg-surface-primary text-success shadow-soft'
                            : 'text-content-muted'
                        }`}
                      >
                        {k === 'jalan' ? 'Jalan' : 'Lari'}
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
                        placeholder="5,2"
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
            </AnimatePresence>

            {/* Catatan */}
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="wo-note" className="text-note font-semibold text-content-secondary">
                Catatan <span className="font-normal text-content-muted">(opsional)</span>
              </Label>
              <Input
                id="wo-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="mis. naik 2,5 kg dari minggu lalu"
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
              Simpan Sesi
            </m.button>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
