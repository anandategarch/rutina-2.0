'use client'

import { useMemo } from 'react'
import * as m from 'motion/react-m'
import { CalendarClock, Gauge, Target, TrendingUp } from 'lucide-react'

import { Counter } from '../counter'
import { useRutina } from '../store'
import { motionTokens } from '@/lib/motion/tokens'
import { barFill } from '@/lib/motion/transitions'
import { allowanceInfo } from './utils'
import { formatIDR, formatIDRShort } from './utils'

/**
 * Kartu "Jatah Hari Ini" (v2.22) — reinkarnasi fitur andalan Rutina 1.0
 * dalam bahasa desain 2.0: jatah aman per hari, proyeksi akhir bulan,
 * dan bar laju belanja dengan penanda posisi ideal hari ini.
 * Render null bila belum ada anggaran.
 */

const VERDICT_META = {
  aman: {
    label: 'Proyeksi aman',
    chip: 'bg-secondary text-success',
    bar: 'bg-primary',
  },
  waspada: {
    label: 'Proyeksi waspada',
    chip: 'bg-gold/25 text-warning',
    bar: 'bg-warning',
  },
  lewat: {
    label: 'Proyeksi lewat batas',
    chip: 'bg-clay/25 text-content-danger',
    bar: 'bg-destructive',
  },
} as const

export function AllowanceCard() {
  const budgets = useRutina((s) => s.budgets)
  const txs = useRutina((s) => s.txs)
  const setUiPref = useRutina((s) => s.setUiPref)

  const info = useMemo(
    () => allowanceInfo(budgets, txs),
    [budgets, txs],
  )

  if (!info) return null

  const v = VERDICT_META[info.verdict]
  const paceWidth = Math.min(100, info.pacePct)

  return (
    <div className="rounded-2xl border border-border bg-surface-primary p-4 shadow-soft sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-eyebrow font-semibold uppercase tracking-[0.14em] text-module-accent-strong">
            <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
            Jatah Hari Ini
          </p>
          <p className="mt-1.5 text-eyebrow leading-snug text-content-muted">
            Sisa anggaran bulan ini dibagi rata ke{' '}
            {info.daysLeft} hari tersisa
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1.5 text-eyebrow font-bold ${v.chip}`}
        >
          {v.label}
        </span>
      </div>

      {/* Angka besar jatah harian — count-up Motion */}
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-note font-semibold text-content-muted">Rp</span>
        <span className="text-kpi font-bold tabular-nums leading-none text-content-primary">
          <Counter to={info.daily} />
        </span>
        <span className="text-note font-semibold text-content-muted">
          / hari aman
        </span>
      </p>

      {/* Bar laju belanja vs posisi ideal */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between text-eyebrow font-semibold text-content-muted">
          <span>Laju belanja {info.pacePct}%</span>
          <span className="tabular-nums">
            {formatIDRShort(info.spent)} / {formatIDRShort(info.budgetTotal)}
          </span>
        </div>
        <div className="relative mt-2 h-3 overflow-visible rounded-full bg-border">
          <div className="h-full overflow-hidden rounded-full">
            <m.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: paceWidth / 100 }}
              transition={barFill}
              className={`h-full origin-left rounded-full ${v.bar}`}
              style={{ width: '100%' }}
            />
          </div>
          {/* Penanda posisi ideal — hari ini ÷ panjang bulan */}
          <span
            aria-hidden="true"
            className="absolute top-[-3px] bottom-[-3px] w-0.5 rounded-full bg-espresso/70"
            style={{ left: `${Math.min(100, info.idealPct)}%` }}
          />
        </div>
        <p className="mt-1.5 text-eyebrow font-medium text-content-muted">
          Garis{' '}
          <span className="font-bold text-content-secondary">
            {info.idealPct}%
          </span>{' '}
          adalah posisi ideal hari ini — di kirinya kamu hemat, di
          kanannya lebih cepat dari bulan.
        </p>
      </div>

      {/* Tiga statistik pendamping */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl bg-surface-sunken px-3 py-2.5">
          <p className="flex items-center gap-1 text-eyebrow font-semibold uppercase tracking-[0.1em] text-content-muted">
            <Target className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />
            Sisa
          </p>
          <p
            className={`mt-1 truncate text-section font-bold tabular-nums ${
              info.remaining >= 0 ? 'text-success' : 'text-content-danger'
            }`}
          >
            {info.remaining >= 0 ? '' : '−'}
            {formatIDRShort(Math.abs(info.remaining))}
          </p>
        </div>
        <div className="rounded-2xl bg-surface-sunken px-3 py-2.5">
          <p className="flex items-center gap-1 text-eyebrow font-semibold uppercase tracking-[0.1em] text-content-muted">
            <CalendarClock className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />
            Rata²/hari
          </p>
          <p className="mt-1 truncate text-section font-bold tabular-nums text-content-primary">
            {formatIDRShort(info.avgDaily)}
          </p>
        </div>
        <div className="rounded-2xl bg-surface-sunken px-3 py-2.5">
          <p className="flex items-center gap-1 text-eyebrow font-semibold uppercase tracking-[0.1em] text-content-muted">
            <TrendingUp className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />
            Proyeksi
          </p>
          <p className="mt-1 truncate text-section font-bold tabular-nums text-content-primary">
            {formatIDRShort(info.projection)}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setUiPref({ finTab: 'anggaran' })}
        className="mt-4 h-9 w-full cursor-pointer rounded-full bg-surface-sunken text-meta font-semibold text-content-secondary transition-all hover:bg-surface-secondary active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        Kelola anggaran — total {formatIDR(info.budgetTotal)} bulan ini
      </button>
    </div>
  )
}
