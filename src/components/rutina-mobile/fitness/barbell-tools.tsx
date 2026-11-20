'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AnimatePresence,
  useDragControls,
  useReducedMotion,
} from 'motion/react'
import * as m from 'motion/react-m'
import { animate, stagger } from 'animejs'
import { Check, Dumbbell } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { fade, sheetSpring } from '@/lib/motion/transitions'
import { motionTokens } from '@/lib/motion/tokens'
import { cn } from '@/lib/utils'
import { useAnimePop } from '../anime-kit'
import { CONTENT_W } from '../layout-widths'
import { useFocusTrap } from '../use-focus-trap'
import {
  e1rmOf,
  plateLoader,
  rmTable,
  round2_5,
  warmupLadder,
  type PlateSpec,
} from './fit-utils'

/**
 * Alat Barbel — tiga kalkulator latihan dalam satu lembar bawah:
 * Pemuat Piring (visual piring IWF per sisi), Kalkulator 1RM (Epley +
 * tabel 95–65%), dan Tangga Pemanasan (bar → 40% → 60% → 80%).
 *
 * Semua hitungan live lewat useMemo saat pengguna mengetik; pembulatan
 * mengikuti inkremen piring 2,5 kg (round2_5) dan format angka Indonesia
 * (koma desimal, toLocaleString('id-ID')).
 */

/* ===== Utilitas tampilan ===== */

/** "142,5" — angka kg format Indonesia, maks dua desimal. */
function fmtKg(n: number): string {
  return n.toLocaleString('id-ID', { maximumFractionDigits: 2 })
}

/** Parse input beban pengguna: koma desimal diterima. */
function parseNum(s: string): number {
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

/** Ukuran lingkaran piring menurut beratnya — 24–54 px. */
function plateSize(kg: number): number {
  return Math.min(54, Math.max(24, Math.round(14 + kg * 1.6)))
}

/** Warna teks di atas piring: putih untuk warna gelap, espresso untuk terang. */
function plateTextCls(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55 ? 'text-espresso' : 'text-white'
}

/* Pilihan bar: 20 kg olimpiade standar, 15 kg (bar wanita IWF), 10 kg mini. */
const BARS: { kg: number; label: string }[] = [
  { kg: 20, label: 'Olimpiade' },
  { kg: 15, label: 'Wanita IWF' },
  { kg: 10, label: 'Mini' },
]

/* Navigasi mini tiga tab. */
type ToolTab = 'piring' | '1rm' | 'pemanasan'
const TOOL_TABS: { id: ToolTab; label: string }[] = [
  { id: 'piring', label: 'Piring' },
  { id: '1rm', label: '1RM' },
  { id: 'pemanasan', label: 'Pemanasan' },
]

/* ===== Satu piring — lingkaran warna IWF + lencana jumlah per sisi ===== */

function Plate({ spec, count }: { spec: PlateSpec; count: number }) {
  const size = plateSize(spec.kg)
  return (
    <span
      data-plate
      className="relative inline-flex shrink-0 items-center justify-center rounded-full ring-1 ring-cocoa/30"
      style={{ backgroundColor: spec.color, width: size, height: size }}
    >
      <span
        className={cn(
          'select-none font-bold tabular-nums drop-shadow-sm',
          plateTextCls(spec.color),
        )}
        style={{ fontSize: size >= 40 ? 11 : 9 }}
      >
        {fmtKg(spec.kg)}
      </span>
      {count > 1 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-espresso px-1 text-[9px] font-bold text-parchment shadow-soft">
          ×{count}
        </span>
      )}
    </span>
  )
}

/* ===== Tab: Pemuat Piring ===== */

function PlateLoaderTab() {
  const [total, setTotal] = useState('')
  const [barKg, setBarKg] = useState(20)

  const load = useMemo(() => {
    const n = parseNum(total)
    if (!total.trim() || !Number.isFinite(n) || n <= 0) return null
    return plateLoader(n, barKg)
  }, [total, barKg])

  const invalid = total.trim() !== '' && load === null

  /* MOMEN KHAS — "clink" piring: saat beban berubah, piring kiri-kanan
     terpasang satu per satu (scale 0→1, stagger 40 ms, outBack). Pola
     pre-hide + guard reduced-motion mengikuti heatmap.tsx — tanpa
     animasi, piring langsung tampil pada keadaan alami. */
  const reducedMotion = useReducedMotion()
  const barRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = barRef.current
    if (!root) return
    const plates = root.querySelectorAll('[data-plate]')
    if (reducedMotion || plates.length === 0) {
      plates.forEach((el) => {
        ;(el as HTMLElement).style.transform = ''
      })
      return
    }
    /* Sembunyikan SEBELUM memicu stagger — tanpa ini piring terakhir
       sempat tampil penuh lalu melompat ke 0 sebelum tumbuh (kilatan
       awal). */
    plates.forEach((el) => {
      ;(el as HTMLElement).style.transform = 'scale(0)'
    })
    const anim = animate(plates, {
      scale: [0, 1],
      delay: stagger(40),
      duration: 380,
      ease: 'outBack(2.4)',
    })
    return () => {
      anim.revert()
    }
  }, [load, reducedMotion])

  /* Angka "Tercapai" ikut berdenyut saat susunan piring dihitung ulang. */
  const achievedRef = useAnimePop<HTMLSpanElement>(
    null,
    load ? load.achieved : null,
    { scale: 1.18, back: 2.2 },
  )

  return (
    <div>
      <p className="text-note leading-relaxed text-content-muted">
        Susun piring IWF untuk beban total — piring dihitung untuk
        masing-masing sisi barbel.
      </p>

      {/* Total beban + pilihan bar */}
      <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-2.5">
        <div className="space-y-1.5">
          <label
            htmlFor="bb-total"
            className="text-eyebrow font-semibold uppercase tracking-wide text-content-muted"
          >
            Total beban (kg)
          </label>
          <Input
            id="bb-total"
            inputMode="decimal"
            value={total}
            onChange={(e) =>
              setTotal(e.target.value.replace(/[^\d.,]/g, '').slice(0, 6))
            }
            placeholder="mis. 100"
            className="h-11 rounded-xl border-border bg-surface-sunken text-section font-bold tabular-nums text-content-primary placeholder:font-medium placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-eyebrow font-semibold uppercase tracking-wide text-content-muted">
            Barbel
          </p>
          <div className="flex gap-1.5">
            {BARS.map((b) => {
              const on = barKg === b.kg
              return (
                <button
                  key={b.kg}
                  type="button"
                  aria-pressed={on}
                  aria-label={`Barbel ${b.kg} kg — ${b.label}`}
                  onClick={() => setBarKg(b.kg)}
                  className={cn(
                    'flex h-11 w-11 cursor-pointer flex-col items-center justify-center rounded-xl text-meta font-bold tabular-nums transition-all active:scale-[0.94] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                    on
                      ? 'bg-surface-inverse text-content-inverse shadow-soft'
                      : 'border border-border bg-surface-sunken text-content-secondary hover:bg-secondary',
                  )}
                >
                  {b.kg}
                  <span className="text-[8px] font-semibold opacity-70">
                    kg
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Visual barbel */}
      <div
        ref={barRef}
        className="mt-3.5 rounded-2xl border border-border bg-surface-sunken p-4"
        aria-hidden="true"
      >
        {load ? (
          <>
            <div className="flex min-h-14 items-center justify-center">
              {/* Sisi kiri — piring terkecil di ujung luar (cermin kanan) */}
              <div className="flex items-center">
                {[...load.plates].reverse().map((p) => (
                  <Plate key={`l-${p.spec.kg}`} spec={p.spec} count={p.countPerSide} />
                ))}
              </div>
              {/* Batang dengan grip tengah */}
              <div className="relative mx-1 h-2.5 w-20 rounded-full bg-cocoa/80 sm:w-28">
                <span className="absolute left-1/2 top-1/2 h-4 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cocoa" />
              </div>
              {/* Sisi kanan */}
              <div className="flex items-center">
                {load.plates.map((p) => (
                  <Plate key={`r-${p.spec.kg}`} spec={p.spec} count={p.countPerSide} />
                ))}
              </div>
            </div>
            <div className="mt-3.5 text-center">
              <p className="text-meta font-semibold text-content-secondary">
                Tercapai{' '}
                <span
                  ref={achievedRef}
                  className="inline-block font-bold tabular-nums text-content-primary"
                >
                  {fmtKg(load.achieved)} kg
                </span>
                <span className="mx-1 text-content-muted">·</span>
                bar {barKg} kg · piring per sisi
              </p>
              {load.remainder > 0 && (
                <p className="mt-1 text-meta font-semibold text-content-danger">
                  Sisa {fmtKg(load.remainder)} kg tidak terwakili piring
                </p>
              )}
              {load.plates.length === 0 && (
                <p className="mt-1 text-eyebrow font-medium text-content-muted">
                  Bar kosong — tambah beban di atas {barKg} kg untuk memasang
                  piring.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex min-h-14 flex-col items-center justify-center gap-1.5 py-2 text-center">
            <Dumbbell className="h-5 w-5 text-content-muted" />
            <p className="max-w-[260px] text-meta leading-relaxed text-content-muted">
              {invalid
                ? `Masukkan total beban minimal seberat barbel (${barKg} kg).`
                : 'Masukkan total beban — piring tersusun otomatis di kiri-kanan bar.'}
            </p>
          </div>
        )}
      </div>

      <p className="mt-2 px-0.5 text-eyebrow font-medium text-content-muted">
        Warna piring mengikuti standar IWF (25 merah · 20 biru · 15 kuning ·
        10 hijau · 5 putih · 2,5 hitam · 1,25 krom).
      </p>
    </div>
  )
}

/* ===== Tab: Kalkulator 1RM ===== */

function OneRmTab() {
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')

  const parsed = useMemo(() => {
    const w = parseNum(weight)
    const r = parseNum(reps)
    if (!weight.trim() || !reps.trim()) return null
    if (!Number.isFinite(w) || w <= 0 || w > 1000) return null
    if (!Number.isFinite(r) || r < 1 || r > 50) return null
    return { w, r: Math.round(r) }
  }, [weight, reps])

  const e1rm = useMemo(
    () => (parsed ? round2_5(e1rmOf(parsed.w, parsed.r)) : null),
    [parsed],
  )
  const table = useMemo(
    () => (parsed ? rmTable(parsed.w, parsed.r) : null),
    [parsed],
  )

  /* Estimasi 1RM — pop elastis tiap hitungan ulang (render pertama
     diabaikan; kemunculan blok tetap ranah Motion). */
  const e1rmRef = useAnimePop<HTMLSpanElement>(null, e1rm, {
    scale: 1.18,
    back: 2.2,
  })

  return (
    <div>
      <p className="text-note leading-relaxed text-content-muted">
        Estimasi kekuatan Epley — beban × (1 + reps/30), pembulatan 2,5 kg
        agar langsung terpakai di barbel.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <label
            htmlFor="bb-rm-w"
            className="text-eyebrow font-semibold uppercase tracking-wide text-content-muted"
          >
            Beban (kg)
          </label>
          <Input
            id="bb-rm-w"
            inputMode="decimal"
            value={weight}
            onChange={(e) =>
              setWeight(e.target.value.replace(/[^\d.,]/g, '').slice(0, 6))
            }
            placeholder="100"
            className="h-11 rounded-xl border-border bg-surface-sunken text-section font-bold tabular-nums text-content-primary placeholder:font-medium placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="bb-rm-r"
            className="text-eyebrow font-semibold uppercase tracking-wide text-content-muted"
          >
            Repetisi
          </label>
          <Input
            id="bb-rm-r"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value.replace(/\D/g, '').slice(0, 2))}
            placeholder="5"
            className="h-11 rounded-xl border-border bg-surface-sunken text-section font-bold tabular-nums text-content-primary placeholder:font-medium placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
          />
        </div>
      </div>

      {e1rm != null && table ? (
        <>
          <div className="mt-3.5 rounded-2xl border border-border bg-secondary p-4 text-center">
            <p className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-muted">
              Estimasi 1RM
            </p>
            <p className="mt-1 text-kpi-hero font-bold leading-none tabular-nums text-content-primary">
              <span ref={e1rmRef} className="inline-block">
                {fmtKg(e1rm)}
              </span>
              <span className="ml-1 text-section font-semibold text-content-muted">
                kg
              </span>
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {table.map((row) => (
              <div
                key={row.pct}
                className="flex items-center justify-between rounded-xl bg-surface-sunken px-3.5 py-2.5"
              >
                <span className="text-meta font-bold tabular-nums text-content-muted">
                  {row.pct}%
                </span>
                <span className="text-body font-bold tabular-nums text-content-primary">
                  {fmtKg(row.kg)} kg
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-3.5 rounded-2xl border border-dashed border-border bg-surface-sunken px-4 py-6 text-center">
          <p className="text-meta leading-relaxed text-content-muted">
            Isi beban dan repetisi (1–50) — estimasi 1RM dan tabel 95–65%
            muncul otomatis.
          </p>
        </div>
      )}
    </div>
  )
}

/* ===== Tab: Tangga Pemanasan ===== */

/** Angka kg satu langkah — pop elastis saat tangga dihitung ulang.
 *  Key baris memakai label (bukan kg) agar komponen bertahan antar
 *  perhitungan dan pop benar-benar terjadi. */
function LadderKg({ kg }: { kg: number }) {
  const ref = useAnimePop<HTMLSpanElement>(null, kg, {
    scale: 1.18,
    back: 2.2,
  })
  return (
    <span
      ref={ref}
      className="shrink-0 text-section font-bold tabular-nums text-content-primary"
    >
      {fmtKg(kg)}
      <span className="ml-0.5 text-chart-label font-semibold text-content-muted">
        kg
      </span>
    </span>
  )
}

function WarmupTab() {
  const [work, setWork] = useState('')
  const [done, setDone] = useState<number[]>([])

  const ladder = useMemo(() => {
    const n = parseNum(work)
    if (!work.trim() || !Number.isFinite(n) || n <= 0) return null
    return warmupLadder(n, 20)
  }, [work])

  const toggleDone = (i: number) =>
    setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))

  return (
    <div>
      <p className="text-note leading-relaxed text-content-muted">
        Pemanasan bertahap menuju beban kerja — bar kosong → 40% → 60% →
        80%, pembulatan 2,5 kg.
      </p>

      <div className="mt-3 space-y-1.5">
        <label
          htmlFor="bb-wu"
          className="text-eyebrow font-semibold uppercase tracking-wide text-content-muted"
        >
          Beban kerja (kg)
        </label>
        <Input
          id="bb-wu"
          inputMode="decimal"
          value={work}
          onChange={(e) => {
            setWork(e.target.value.replace(/[^\d.,]/g, '').slice(0, 6))
            setDone([])
          }}
          placeholder="mis. 80"
          className="h-11 rounded-xl border-border bg-surface-sunken text-section font-bold tabular-nums text-content-primary placeholder:font-medium placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
        />
      </div>

      {ladder && ladder.length > 0 ? (
        <>
          <div className="mt-3.5 space-y-2">
            {ladder.map((s, i) => {
              const isDone = done.includes(i)
              return (
                <button
                  key={s.label}
                  type="button"
                  aria-pressed={isDone}
                  aria-label={`${s.label} — ${fmtKg(s.kg)} kg${isDone ? ' (selesai)' : ''}`}
                  onClick={() => toggleDone(i)}
                  className={cn(
                    'flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                    isDone
                      ? 'border-primary/40 bg-secondary'
                      : 'border-border bg-surface-sunken hover:border-border-strong',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
                      isDone
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface-primary text-content-muted',
                    )}
                  >
                    {isDone ? (
                      <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                    ) : (
                      <span className="text-eyebrow font-semibold tabular-nums">
                        {i + 1}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block text-note font-bold',
                        isDone ? 'text-success' : 'text-content-primary',
                      )}
                    >
                      {s.label}
                      {isDone && ' — selesai'}
                    </span>
                    <span className="text-eyebrow font-medium text-content-muted">
                      {s.label === 'Bar kosong'
                        ? 'bangun gerak & sirkulasi dulu'
                        : 'naik bertahap, jaga teknik'}
                    </span>
                  </span>
                  <LadderKg kg={s.kg} />
                </button>
              )
            })}
          </div>
          <p className="mt-2.5 px-0.5 text-eyebrow leading-relaxed text-content-muted">
            Naikkan bertahap, jangan lompat — ketuk tiap langkah untuk menandai
            selesai.
          </p>
        </>
      ) : (
        <div className="mt-3.5 rounded-2xl border border-dashed border-border bg-surface-sunken px-4 py-6 text-center">
          <p className="text-meta leading-relaxed text-content-muted">
            {ladder && ladder.length === 0
              ? 'Beban kerja terlalu dekat dengan bar — tangga tidak tersusun.'
              : 'Isi beban kerja — tangga pemanasan tersusun otomatis.'}
          </p>
        </div>
      )}
    </div>
  )
}

/* ===== Lembar Alat Barbel ===== */

export function BarbellToolsSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [tab, setTab] = useState<ToolTab>('piring')
  const [prevOpen, setPrevOpen] = useState(false)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(open, panelRef)

  /* Draf kembali ke tab pertama setiap kali lembar dibuka — pola
     reset render-time, sama dengan SessionPickerSheet. */
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setTab('piring')
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* absolute (bukan fixed): lembar ini dipasang langsung di
              dalam layar Bugar (bugar.tsx), bukan di overlay sesi latihan
              yang memang sengaja fixed. Wadah layar (absolute inset-0 di
              rutina-app) sudah positioned, jadi absolute tetap berada DI
              DALAM bingkai aplikasi — tidak menutupi bilah sisi desktop —
              dan lolos dari kontainer gulir Bugar karena containing block
              berada di luar scroller. */}
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={onClose}
            className="absolute inset-0 z-40 bg-espresso/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
          />
          <div className="pointer-events-none absolute inset-0 z-50 flex items-end justify-center">
            <m.div
              key="panel"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              tabIndex={-1}
              aria-label="Alat barbel"
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
              transition={sheetSpring}
              className={`pointer-events-auto max-h-[92%] w-full overflow-y-auto rounded-t-sheet bg-surface-primary px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 no-scrollbar shadow-sheet ${CONTENT_W}`}
            >
              {/* Pegangan seret */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
                aria-hidden="true"
              >
                <span className="h-1.5 w-10 rounded-full bg-content-secondary/25" />
              </div>

              <div className="text-left">
                <h2 className="text-lead font-semibold tracking-tight text-content-primary">
                  Alat Barbel
                </h2>
                <p className="mt-0.5 text-note leading-relaxed text-content-muted">
                  Kalkulator piring, 1RM, dan pemanasan — semuanya terhitung
                  saat kamu mengetik.
                </p>
              </div>

              {/* Navigasi mini tiga tab — pil layoutId ala saklar mode */}
              <div
                role="tablist"
                aria-label="Alat barbel"
                className="relative mt-3 flex rounded-full bg-surface-secondary p-1"
              >
                {TOOL_TABS.map((t) => {
                  const on = tab === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setTab(t.id)}
                      className={`relative z-10 flex h-9 flex-1 cursor-pointer items-center justify-center rounded-full text-note font-bold transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        on ? 'text-success' : 'text-content-muted'
                      }`}
                    >
                      {on && (
                        <m.span
                          aria-hidden="true"
                          layoutId="bb-tab-pill"
                          className="absolute inset-0 z-[-1] rounded-full bg-surface-primary shadow-soft"
                          transition={motionTokens.spring.snappy}
                        />
                      )}
                      {t.label}
                    </button>
                  )
                })}
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {tab === 'piring' ? (
                  <m.div
                    key="tab-piring"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={motionTokens.preset.chipReveal}
                    className="mt-4"
                  >
                    <PlateLoaderTab />
                  </m.div>
                ) : tab === '1rm' ? (
                  <m.div
                    key="tab-1rm"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={motionTokens.preset.chipReveal}
                    className="mt-4"
                  >
                    <OneRmTab />
                  </m.div>
                ) : (
                  <m.div
                    key="tab-pemanasan"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={motionTokens.preset.chipReveal}
                    className="mt-4"
                  >
                    <WarmupTab />
                  </m.div>
                )}
              </AnimatePresence>
            </m.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
