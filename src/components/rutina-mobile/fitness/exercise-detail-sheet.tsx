'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import { Plus, X } from 'lucide-react'

import { fade, sheetSpring } from '@/lib/motion/transitions'
import { CONTENT_W } from '../layout-widths'
import { shortDateLabel, useRutina, type Workout, type WorkoutSet } from '../store'
import { useFocusTrap } from '../use-focus-trap'
import { e1rmOf, exStatOf } from './fit-utils'
import { exerciseLabel } from './data'

/**
 * Detail progres SATU gerakan barbel (review UI/UX v2.44 — pola Hevy):
 * dibuka dari baris Papan Rekor e1RM atau tombol riwayat di kartu
 * Pustaka Gerakan.
 *
 * Isi: ringkasan (rekor e1RM, beban terakhir, sesi, total set), grafik
 * e1RM per sesi yang bisa diketuk, lalu tabel riwayat per sesi
 * (tanggal · set terbaik · jumlah set · estimasi e1RM). Semua angka
 * diturunkan dari WorkoutSet yang benar-benar tercatat — tanpa estimasi
 * di luar Epley yang sudah dipakai papan rekor.
 */

/** Satu baris riwayat: rekap gerakan ini dalam satu sesi latihan. */
interface ExSession {
  date: string
  sets: WorkoutSet[]
  /** Set terbaik sesi ini (e1RM tertinggi). */
  top: WorkoutSet
  /** e1RM terbaik sesi ini. */
  bestE1: number
}

/** Rekap sesi untuk sebuah gerakan — terlama dulu. */
function exSessions(workouts: Workout[], name: string): ExSession[] {
  const out: ExSession[] = []
  const ordered = [...workouts]
    .filter((w) => w.kind === 'beban' && w.sets.some((s) => s.exercise === name))
    .sort((a, b) => a.date.localeCompare(b.date))
  for (const w of ordered) {
    const sets = w.sets.filter((s) => s.exercise === name)
    if (sets.length === 0) continue
    let top = sets[0]!
    for (const s of sets) {
      if (e1rmOf(s.weight, s.reps) > e1rmOf(top.weight, top.reps)) top = s
    }
    out.push({
      date: w.date,
      sets,
      top,
      bestE1: e1rmOf(top.weight, top.reps),
    })
  }
  return out
}

/** "62,5" — desimal koma mengikuti konvensi id-ID. */
const fmtKg = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')

export function ExerciseDetailSheet({
  open,
  onClose,
  name,
}: {
  open: boolean
  onClose: () => void
  /** Nama gerakan (ID EX_LIB, mis. "Bench Press"). */
  name: string | null
}) {
  const workouts = useRutina((s) => s.workouts)
  const openWorkoutSheet = useRutina((s) => s.openWorkoutSheet)

  const [selIdx, setSelIdx] = useState<number | null>(null)
  const [prevOpen, setPrevOpen] = useState(false)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(open, panelRef)

  /* Reset titik terpilih saat lembar ditutup — pola prevOpen render-time
      (pola codebase), bukan efek. */
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open) setSelIdx(null)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  const stat = useMemo(
    () => (name ? exStatOf(workouts, name) : null),
    [workouts, name],
  )
  const sessions = useMemo(
    () => (name ? exSessions(workouts, name) : []),
    [workouts, name],
  )
  const totalSets = useMemo(
    () => sessions.reduce((a, s) => a + s.sets.length, 0),
    [sessions],
  )

  /* Grafik e1RM — maks 12 sesi terakhir agar titik tetap terbaca. */
  const chartPts = useMemo(() => sessions.slice(-12), [sessions])
  const chartGeom = useMemo(() => {
    if (chartPts.length === 0) return null
    const W = 300
    const H = 96
    const pad = 8
    const vals = chartPts.map((p) => p.bestE1)
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const span = Math.max(max - min, 0.1)
    const step =
      chartPts.length > 1 ? (W - pad * 2) / (chartPts.length - 1) : 0
    const pts = chartPts.map((p, i) => ({
      x: chartPts.length > 1 ? pad + step * i : W / 2,
      y: H - pad - ((p.bestE1 - min) / span) * (H - pad * 2),
    }))
    return {
      W,
      H,
      pts,
      min,
      max,
      d: pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
    }
  }, [chartPts])

  const label = name ? exerciseLabel(name) : ''
  const sel =
    selIdx != null && chartPts[selIdx] != null ? chartPts[selIdx] : null

  return (
    <AnimatePresence>
      {open && name && (
        <>
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={onClose}
            className="absolute inset-0 z-[55] bg-espresso/45"
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
            aria-label={`Perkembangan ${label}`}
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
            className={`absolute inset-x-0 bottom-0 z-[60] mx-auto flex max-h-[86%] w-full flex-col rounded-t-sheet bg-surface-primary pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2.5 no-scrollbar ${CONTENT_W}`}
          >
            {/* Pegangan seret */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-content-secondary/25" />
            </div>

            <div className="flex shrink-0 items-start justify-between gap-3 px-5">
              <div className="min-w-0 text-left">
                <h2 className="truncate text-lead font-semibold tracking-tight text-content-primary">
                  {label}
                </h2>
                <p className="mt-0.5 text-note text-content-muted">
                  Perkembangan kekuatan &amp; riwayat sesi (Epley)
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup detail gerakan"
                className="mt-0.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors hover:bg-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Isi bisa digulir */}
            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 pt-3">
              {sessions.length === 0 || !stat ? (
                <p className="py-6 text-center text-note text-content-muted">
                  Belum ada set tercatat untuk gerakan ini.
                </p>
              ) : (
                <>
                  {/* 1 — Ringkasan: rekor e1RM, beban terakhir, sesi, set */}
                  <div
                    className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                    role="group"
                    aria-label={`Ringkasan ${label}`}
                  >
                    {[
                      {
                        k: 'Rekor e1RM',
                        v: `${fmtKg(stat.best)} kg`,
                        hot: true,
                      },
                      {
                        k: 'Beban terakhir',
                        v: `${fmtKg(stat.lastWeight)} kg × ${stat.lastReps}`,
                      },
                      { k: 'Sesi tercatat', v: String(stat.sessions) },
                      { k: 'Total set', v: String(totalSets) },
                    ].map((k) => (
                      <div
                        key={k.k}
                        className={`rounded-xl px-3 py-2.5 ${
                          k.hot
                            ? 'bg-gold/20'
                            : 'bg-surface-sunken'
                        }`}
                      >
                        <p
                          className={`text-kpi-sm font-bold leading-tight tabular-nums ${
                            k.hot ? 'text-warning' : 'text-content-primary'
                          }`}
                        >
                          {k.v}
                        </p>
                        <p className="mt-0.5 text-chart-label font-medium uppercase tracking-[0.08em] text-content-muted">
                          {k.k}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* 2 — Grafik e1RM per sesi (maks 12 terakhir); ketuk
                      titik untuk membaca sesinya. */}
                  {chartGeom && chartPts.length >= 2 && (
                    <div className="mt-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                          Perkembangan e1RM
                        </p>
                        <p className="text-eyebrow font-medium tabular-nums text-content-muted">
                          {chartPts.length} sesi terakhir
                        </p>
                      </div>
                      <svg
                        viewBox={`0 0 ${chartGeom.W} ${chartGeom.H}`}
                        className="mt-2 h-24 w-full"
                        role="img"
                        aria-label={`Grafik e1RM ${label}: ${chartPts
                          .map(
                            (p) =>
                              `${shortDateLabel(p.date)} ${fmtKg(p.bestE1)} kg`,
                          )
                          .join(', ')}`}
                      >
                        <polyline
                          points={chartGeom.d}
                          fill="none"
                          stroke="var(--chart-stroke-3)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {chartGeom.pts.map((p, i) => (
                          <circle
                            key={chartPts[i]!.date + i}
                            cx={p.x}
                            cy={p.y}
                            r={selIdx === i ? 6 : 4}
                            fill={
                              selIdx === i
                                ? 'var(--chart-stroke-3)'
                                : 'var(--surface-primary)'
                            }
                            stroke="var(--chart-stroke-3)"
                            strokeWidth="2"
                            className="cursor-pointer"
                            onClick={() =>
                              setSelIdx(selIdx === i ? null : i)
                            }
                          >
                            <title>
                              {`${shortDateLabel(chartPts[i]!.date)} — e1RM ${fmtKg(
                                chartPts[i]!.bestE1,
                              )} kg`}
                            </title>
                          </circle>
                        ))}
                      </svg>
                      <p className="mt-1 text-meta leading-snug text-content-muted">
                        {sel
                          ? `${shortDateLabel(sel.date)} · set terbaik ${fmtKg(
                              sel.top.weight,
                            )} kg × ${sel.top.reps} → e1RM ${fmtKg(sel.bestE1)} kg`
                          : 'Ketuk titik untuk membaca sesi latihannya.'}
                      </p>
                    </div>
                  )}

                  {/* 3 — Tabel riwayat per sesi (terbaru dulu). */}
                  <div className="mt-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                        Riwayat sesi
                      </p>
                      <p className="text-eyebrow font-medium tabular-nums text-content-muted">
                        {sessions.length} sesi
                      </p>
                    </div>
                    <ul className="mt-2 divide-y divide-border-default">
                      {[...sessions]
                        .reverse()
                        .slice(0, 10)
                        .map((s, si) => (
                          <li
                            /* v2.45 (audit F1): dua sesi beban pada tanggal
                               yang sama dengan gerakan sama → kunci kembar,
                               satu baris riwayat lenyap diam-diam. */
                            key={`${s.date}-${si}`}
                            className="flex items-center gap-3 py-2.5 text-meta tabular-nums"
                          >
                            <span className="w-24 shrink-0 font-semibold text-content-secondary">
                              {shortDateLabel(s.date)}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-content-muted">
                              {fmtKg(s.top.weight)} kg × {s.top.reps}
                              {s.sets.length > 1 && ` · ${s.sets.length} set`}
                            </span>
                            <span
                              className={`shrink-0 font-bold ${
                                s.bestE1 >= stat.best - 0.05
                                  ? 'text-warning'
                                  : 'text-content-secondary'
                              }`}
                            >
                              {fmtKg(s.bestE1)} kg
                            </span>
                          </li>
                        ))}
                    </ul>
                    {sessions.length > 10 && (
                      <p className="mt-1.5 text-chart-label text-content-muted">
                        Menampilkan 10 sesi terbaru dari {sessions.length}.
                      </p>
                    )}
                  </div>

                  {/* 4 — Aksi: langsung catat set baru untuk gerakan ini. */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      openWorkoutSheet([{ name, count: 3, reps: 8 }])
                    }}
                    className="interactive mb-1 mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-surface-inverse text-note font-bold text-content-inverse transition-colors hover:bg-surface-inverse-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <Plus className="h-4 w-4" />
                    Catat set {label}
                  </button>
                </>
              )}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
