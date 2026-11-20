'use client'

import { Minimize2, TrendingUp } from 'lucide-react'

import type { GoldilocksGroup } from './habit-coach'
import { HABIT_CAT_COLORS } from './store'

/* Kartu saran Goldilocks terkonsolidasi — audit antirepetisi v2.41.
 *
 * Dulu tiap kebiasaan mendapat kartu sendiri sehingga deretan kartu
 * berjudul identik ("Perkecil dulu biar tetap hidup" / "Pekan
 * sempurna!") berulang-ulang dengan inti sama. Kini SATU inti saran =
 * SATU kartu kompak: judul + pesan agregat di kepala (menyebut nama
 * kebiasaan hanya bila tunggal), dan daftar kebiasaan sebagai baris
 * ringkas bertitik kategori + capaian "selesai/terjadwal hari".
 *
 * Satu komponen dipakai Beranda & Kebiasaan — bentuk saran coach
 * identik di seluruh aplikasi, satu sumber kebenaran markup. */
export function CoachGroupCard({ group }: { group: GoldilocksGroup }) {
  const naik = group.tone === 'naik'
  const Icon = naik ? TrendingUp : Minimize2
  return (
    <div className="rounded-lg border border-border bg-surface-primary p-3 shadow-soft">
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className={
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full ' +
            (naik
              ? 'bg-secondary text-success'
              : 'bg-gold/25 text-warning')
          }
        >
          <Icon className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="text-note font-semibold text-content-primary">
            {group.title}
          </p>
          <p className="mt-0.5 text-pretty text-meta leading-relaxed text-content-muted">
            {group.text}
          </p>
        </div>
      </div>
      {group.items.length > 1 && (
        <ul className="mt-2 space-y-1">
          {group.items.map(({ habit, done, scheduled }) => (
            <li
              key={habit.id}
              className="flex items-center gap-2 rounded-md bg-surface-secondary/60 px-2.5 py-1.5"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: HABIT_CAT_COLORS[habit.cat] }}
              />
              <span className="min-w-0 flex-1 truncate text-meta font-semibold text-content-primary">
                {habit.title}
              </span>
              <span className="shrink-0 text-eyebrow font-semibold tabular-nums text-content-muted">
                {done}/{scheduled} hari
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
