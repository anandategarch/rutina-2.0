'use client'

import { useMemo, useState } from 'react'
import { Wallet } from 'lucide-react'

import { formatIDR, spendByDay } from './finance/utils'
import { RutinaEmptyState } from './rutina-empty-state'
import { addDaysISO, fromISO, todayISO, useRutina, weekStartISO, type Tx } from './store'

/**
 * SpendHeatmap — peta panas pengeluaran ala GitHub (audit #9).
 *
 * Grid 12 kolom (pekan) × 7 baris (Sen..Min). Warna sel = total keluar
 * harian (transfer dikecualikan). Ramp intensitas matcha→amber mengikuti
 * semantik GitHub: sedikit = hijau kebun, banyak = amber peringatan.
 * Level ditentukan relatif terhadap hari terpadat dalam jendela
 * (25% / 50% / 75% dari maksimum).
 */

const WEEKS = 12

/** Ramp level 0–4; level 0 = garis tepi saja (tidak ada pengeluaran). */
const LEVEL_CLS = [
  'border border-border bg-transparent',
  'bg-pistachio/40',
  'bg-pistachio',
  'bg-gold',
  'bg-clay',
] as const

/** Label baris hari di sisi kiri — hanya Sen/Rab/Jum agar hemat ruang. */
const ROW_LABELS = ['Sen', '', 'Rab', '', 'Jum', '', ''] as const

/** Level 0–4 dari total harian relatif terhadap hari terpadat jendela. */
function levelOf(total: number, max: number): number {
  if (total <= 0) return 0
  if (max <= 0) return 1
  if (total >= max * 0.75) return 4
  if (total >= max * 0.5) return 3
  if (total >= max * 0.25) return 2
  return 1
}

/** "Sel, 3 Jun" — label hari + tanggal pendek. */
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(fromISO(iso))

interface HeatCell {
  iso: string
  level: number
  total: number
  count: number
  future: boolean
}

interface HeatGrid {
  cells: HeatCell[]
  /** Label bulan per kolom pekan — null bila bulan belum berganti. */
  marks: (string | null)[]
  max: number
  hasData: boolean
}

/** Bangun grid 12×7 diakhiri pekan berjalan (kolom terakhir). */
function buildGrid(txs: Tx[], today: string): HeatGrid {
  const byDay = spendByDay(txs)
  /* Senin tiap kolom: kolom terakhir = pekan berjalan (weekStart today). */
  const mondays = Array.from({ length: WEEKS }, (_, w) =>
    addDaysISO(weekStartISO(today), (w - (WEEKS - 1)) * 7),
  )
  const cells: HeatCell[] = []
  let max = 0
  let hasData = false
  for (let d = 0; d < 7; d++) {
    for (let w = 0; w < WEEKS; w++) {
      const iso = addDaysISO(mondays[w]!, d)
      const spend = byDay[iso]
      const total = spend?.total ?? 0
      const future = iso > today
      if (!future && total > 0) hasData = true
      if (total > max) max = total
      cells.push({ iso, level: 0, total, count: spend?.count ?? 0, future })
    }
  }
  for (const c of cells) c.level = c.future ? 0 : levelOf(c.total, max)
  /* Label bulan: tampilkan saat bulan Senin-nya berganti dari kolom
     sebelumnya (kolom pertama selalu diberi label). */
  const marks: (string | null)[] = []
  const fmt = new Intl.DateTimeFormat('id-ID', { month: 'short' })
  let prevMonth = -1
  for (let w = 0; w < WEEKS; w++) {
    const mo = fromISO(mondays[w]!).getMonth()
    if (w === 0 || mo !== prevMonth) {
      marks.push(fmt.format(fromISO(mondays[w]!)))
      prevMonth = mo
    } else {
      marks.push(null)
    }
  }
  return { cells, marks, max, hasData }
}

export function SpendHeatmap() {
  const txs = useRutina((s) => s.txs)
  const today = todayISO()

  const grid = useMemo(() => buildGrid(txs, today), [txs, today])
  const [selISO, setSelISO] = useState<string | null>(null)

  const sel = selISO ? grid.cells.find((c) => c.iso === selISO) : undefined
  const caption =
    selISO == null
      ? 'Ketuk sel untuk melihat detail hari.'
      : sel && sel.total > 0
        ? `${dayLabel(selISO)} — ${formatIDR(sel.total)} (${sel.count} transaksi)`
        : `${dayLabel(selISO)} — tidak ada pengeluaran`

  if (!grid.hasData) {
    return (
      <RutinaEmptyState
        icon={<Wallet />}
        title="Belum ada pengeluaran"
        description="Catat pengeluaran pertamamu — peta panas mulai terisi di sini."
      />
    )
  }

  return (
    <div className="rounded-[20px] border border-border bg-surface-primary p-4 shadow-soft">
      <div className="flex gap-2">
        {/* Label hari kiri — hanya Sen/Rab/Jum. */}
        <div aria-hidden="true" className="flex w-6 shrink-0 flex-col gap-1">
          <span className="h-3" />
          {ROW_LABELS.map((label, d) => (
            <span
              key={d}
              className="flex h-5 items-center justify-end pr-0.5 text-[9px] font-bold uppercase leading-none text-content-muted"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          {/* Baris label bulan — satu per pergantian bulan. */}
          <div
            aria-hidden="true"
            className="grid grid-cols-[repeat(12,minmax(0,1fr))] gap-1"
          >
            {grid.marks.map((mk, w) => (
              <span
                key={w}
                className="h-3 w-max text-[9px] font-bold uppercase leading-none text-content-muted"
              >
                {mk ?? ''}
              </span>
            ))}
          </div>

          {/* Kisi sel — baris = hari (Sen..Min), kolom = pekan.
              Baris terakhir dari kolom terakhir adalah hari ini. */}
          <div className="mt-1 grid grid-cols-[repeat(12,minmax(0,1fr))] gap-1">
            {grid.cells.map((c) =>
              c.future ? (
                <span
                  key={c.iso}
                  aria-hidden="true"
                  className="h-5 rounded-[5px] bg-surface-sunken/60"
                />
              ) : (
                <button
                  key={c.iso}
                  type="button"
                  onClick={() => setSelISO(c.iso)}
                  aria-label={`${dayLabel(c.iso)}: ${
                    c.total > 0
                      ? `${formatIDR(c.total)}, ${c.count} transaksi`
                      : 'tidak ada pengeluaran'
                  }`}
                  title={`${dayLabel(c.iso)} — ${
                    c.total > 0
                      ? `${formatIDR(c.total)} (${c.count} transaksi)`
                      : 'tidak ada pengeluaran'
                  }`}
                  className={`h-5 w-full cursor-pointer rounded-[5px] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
                    LEVEL_CLS[c.level]
                  }${
                    c.iso === selISO
                      ? ' ring-2 ring-primary/70 ring-offset-1 ring-offset-surface-primary'
                      : ''
                  }`}
                />
              ),
            )}
          </div>
        </div>
      </div>

      {/* Keterangan sel terpilih. */}
      <p aria-live="polite" className="mt-3 text-meta font-medium text-content-muted">
        {caption}
      </p>

      {/* Legenda — "Sedikit → Banyak". */}
      <div className="mt-3 flex items-center justify-end gap-1.5">
        <span className="text-chart-label font-semibold uppercase tracking-[0.12em] text-content-muted">
          Sedikit
        </span>
        {LEVEL_CLS.map((cls) => (
          <span key={cls} aria-hidden="true" className={`h-3 w-3 rounded-[3px] ${cls}`} />
        ))}
        <span className="text-chart-label font-semibold uppercase tracking-[0.12em] text-content-muted">
          Banyak
        </span>
      </div>
    </div>
  )
}
