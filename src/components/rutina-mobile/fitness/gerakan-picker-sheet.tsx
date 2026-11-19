'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import { Check, Search, X } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { fade, sheetSpring } from '@/lib/motion/transitions'
import { CONTENT_W } from '../layout-widths'
import { useRutina, type Workout } from '../store'
import { useFocusTrap } from '../use-focus-trap'
import { EX_LIB, MUSCLE_GROUPS, exerciseLabel } from './data'

/**
 * Pemilih gerakan barbel (v2.20) — menggantikan <select> native di tiga
 * titik: lembar Catat Aktivitas, panel tambah gerakan di sesi imersif,
 * dan penyusun sesi. Mengikuti pola frame cat-picker-sheet: pegangan
 * seret, kolom pencarian, "Terakhir dilatih" dari histori nyata, lalu
 * daftar lengkap per kelompok otot.
 *
 * Katalog TERTUTUP: 31 gerakan EX_LIB saja — tanpa "tambah baru".
 */

/** Baris "Terakhir dilatih" — gerakan + set terakhir dari histori. */
interface RecentGerakan {
  name: string
  weight: number
  reps: number
}

/** Gerakan terakhir dilatih (terbaru dulu, unik, maks 6). Store menambah
 *  workout di depan (newest-first) — cukup dipindai berurutan. */
function recentGerakan(workouts: Workout[]): RecentGerakan[] {
  const seen = new Set<string>()
  const out: RecentGerakan[] = []
  for (const w of workouts) {
    if (w.kind !== 'beban') continue
    for (const s of w.sets) {
      if (seen.has(s.exercise)) continue
      seen.add(s.exercise)
      out.push({ name: s.exercise, weight: s.weight, reps: s.reps })
    }
  }
  return out.slice(0, 6)
}

/** "62,5" — desimal koma mengikuti konvensi id-ID. */
const fmtKg = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')

export function GerakanPickerSheet({
  open,
  onClose,
  onSelect,
  selectedId,
}: {
  open: boolean
  onClose: () => void
  /** Terpanggil dengan nama gerakan (ID EX_LIB, mis. "Bench Press"). */
  onSelect: (gerakan: string) => void
  /** Gerakan terpilih saat ini — ditandai di daftar (opsional). */
  selectedId?: string
}) {
  const workouts = useRutina((s) => s.workouts)

  const [query, setQuery] = useState('')
  const [prevOpen, setPrevOpen] = useState(false)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useFocusTrap(open, panelRef)

  /* Draf pencarian di-reset tiap kali lembar dibuka. */
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setQuery('')
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  /* Fokus langsung ke pencarian saat dibuka. */
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 250)
      return () => clearTimeout(t)
    }
  }, [open])

  const q = query.trim().toLowerCase()

  /* Terakhir dilatih — hanya saat tidak mencari (pola cat-picker). */
  const recent = useMemo(
    () => (q ? [] : recentGerakan(workouts)),
    [workouts, q],
  )

  /* Daftar lengkap per kelompok otot — pencarian mencocokkan nama
     Indonesia (idName), nama Inggris, dan kelompok otot. */
  const groups = useMemo(
    () =>
      MUSCLE_GROUPS.map((g) => ({
        group: g,
        items: EX_LIB.filter(
          (e) =>
            e.muscle === g &&
            (q === '' ||
              e.idName.toLowerCase().includes(q) ||
              e.name.toLowerCase().includes(q) ||
              e.muscle.toLowerCase().includes(q)),
        ),
      })).filter((g) => g.items.length > 0),
    [q],
  )

  const pick = (name: string) => {
    onSelect(name)
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
            aria-label="Pilih gerakan barbel"
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
              <div className="text-left">
                <h2 className="text-lead font-semibold tracking-tight text-content-primary">
                  Pilih Gerakan
                </h2>
                <p className="mt-0.5 text-note text-content-muted">
                  Katalog {EX_LIB.length} gerakan barbel — cari nama atau
                  kelompok otot.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup pemilih gerakan"
                className="mt-0.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* 1 — Kolom pencarian */}
            <div className="shrink-0 px-5 pt-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari gerakan atau otot…"
                  className="h-11 rounded-xl border-border bg-surface-sunken pl-10 text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
                />
              </div>
            </div>

            {/* Daftar bisa digulir */}
            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 pt-3">
              {/* 2 — Terakhir dilatih (dari histori nyata) */}
              {recent.length > 0 && (
                <section aria-label="Gerakan terakhir dilatih">
                  <p className="text-meta font-bold uppercase tracking-[0.08em] text-content-muted">
                    Terakhir dilatih
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {recent.map((r) => {
                      const on = selectedId === r.name
                      return (
                        <button
                          key={r.name}
                          type="button"
                          onClick={() => pick(r.name)}
                          aria-pressed={on}
                          className={`flex h-9 min-w-0 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border pl-2.5 pr-3 text-meta font-semibold transition-all active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                            on
                              ? 'border-primary bg-secondary text-success shadow-leaf'
                              : 'border-border bg-surface-sunken text-content-secondary hover:border-primary/40'
                          }`}
                        >
                          <span className="max-w-[150px] truncate">
                            {exerciseLabel(r.name)}
                          </span>
                          <span className="text-content-muted/70 tabular-nums">
                            {fmtKg(r.weight)}×{r.reps}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* 3 — Daftar lengkap per kelompok otot (katalog tertutup) */}
              <section aria-label="Daftar gerakan" className="mt-4 pb-2">
                {groups.map((g) => (
                  <div key={g.group} className="mt-4 first:mt-0">
                    <p className="text-meta font-bold uppercase tracking-[0.08em] text-content-muted">
                      {g.group}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {g.items.map((e) => {
                        const on = selectedId === e.name
                        return (
                          <li key={e.name}>
                            <div
                              className={`overflow-hidden rounded-2xl border transition-colors ${
                                on
                                  ? 'border-primary bg-secondary/50'
                                  : 'border-border bg-surface-primary'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => pick(e.name)}
                                aria-pressed={on}
                                className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              >
                                <span className="min-w-0 flex-1">
                                  {/* Nama Indonesia utama, istilah
                                      Inggris sebagai keterangan kecil
                                      (v2.17). */}
                                  <span className="block truncate text-body font-semibold text-content-primary">
                                    {e.idName}
                                  </span>
                                  <span className="mt-0.5 block truncate text-note font-medium text-content-muted">
                                    {e.name}
                                  </span>
                                </span>
                                {on && (
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-success">
                                    <Check
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    />
                                  </span>
                                )}
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
                {groups.length === 0 && (
                  <div className="rounded-2xl border-2 border-dashed border-border px-6 py-8 text-center">
                    <Search className="mx-auto h-5 w-5 text-content-muted" />
                    <p className="mt-2 text-note font-semibold text-content-muted">
                      Tidak ada gerakan cocok
                    </p>
                    <p className="mt-0.5 text-meta text-content-muted">
                      Coba kata lain — katalog gerakan barbel tertutup,
                      tidak bisa ditambah sendiri.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
