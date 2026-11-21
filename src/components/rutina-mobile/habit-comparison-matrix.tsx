'use client'

import { useMemo } from 'react'
import * as m from 'motion/react-m'

import {
  habitWeeklyRates,
  shortDateLabel,
  todayISO,
  useRutina,
  type Habit,
} from './store'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { motionTokens } from '@/lib/motion/tokens'

/**
 * Matriks Perbandingan Konsistensi (review UI/UX v2.44, Tahap 2) —
 * semua kebiasaan aktif × empat pekan terakhir, persentase penyelesaian
 * SESUAI JADWAL (sadar hari aktif & hari jeda; sumber tunggal:
 * habitWeeklyRates). Satu pandangan untuk menemukan yang paling
 * konsisten, yang mulai menurun, yang baru membaik, dan yang butuh
 * perhatian. Ketuk baris untuk membuka detail kebiasaan.
 *
 * Sel berisi "—" bila pekan itu tidak ada jadwal untuk kebiasaan
 * tsb. — TIDAK dibaca sebagai 0%.
 */

/** Warna sel per persentase — pola kalender jurnal (color-mix module
 *  accent, bukan kelas Tailwind dinamis). */
function cellBg(pct: number | null): string {
  if (pct == null) return 'var(--surface-sunken)'
  if (pct >= 80) return 'var(--module-accent-strong)'
  if (pct >= 40)
    return 'color-mix(in oklab, var(--module-accent) 45%, var(--surface-primary))'
  return 'color-mix(in oklab, var(--module-accent) 18%, var(--surface-primary))'
}

function cellText(pct: number | null): string {
  if (pct == null) return 'text-content-muted'
  if (pct >= 40) return 'text-content-primary'
  return 'text-content-secondary'
}

export function HabitComparisonMatrix({
  onSelect,
}: {
  /** Membuka detail kebiasaan (panel desktop / sheet ponsel). */
  onSelect: (id: string) => void
}) {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const playEntrance = useFirstVisit('kebiasaan-matrix')

  const today = todayISO()

  const rows = useMemo(() => {
    const active = habits.filter((h) => !h.archived)
    return active
      .map((h: Habit) => {
        const weeks = habitWeeklyRates(h, completions, today, 4)
        const pcts = weeks.map((w) => w.pct)
        const rated = pcts.filter((p): p is number => p != null)
        const avg =
          rated.length > 0
            ? Math.round(rated.reduce((a, b) => a + b, 0) / rated.length)
            : null
        return { habit: h, weeks, pcts, avg }
      })
      .filter((r) => r.pcts.some((p) => p != null))
      .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1))
  }, [habits, completions, today])

  /* Label kolom: tanggal Senin tiap pekan (terlama → pekan ini). */
  const weekLabels = useMemo(() => {
    if (rows.length === 0) return []
    return rows[0]!.weeks.map((w) => w.start)
  }, [rows])

  if (rows.length === 0) return null

  return (
    <m.div
      initial={playEntrance ? { opacity: 0, y: 14 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={motionTokens.preset.chipReveal}
      className="mt-4"
    >
      <div className="garden-bed p-3.5 sm:p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-note font-semibold tracking-tight text-content-secondary">
            Perbandingan Konsistensi
          </h3>
          {/* v2.47: angka tabular + anti-lipat — ritme kepala seragam dengan
              sulur pekan di atasnya. */}
          <p className="text-chart-label font-medium whitespace-nowrap tabular-nums text-content-muted">
            4 pekan · sesuai jadwal
          </p>
        </div>
        <p className="mt-0.5 text-chart-label leading-snug text-content-muted">
          Ketuk baris untuk membuka detail kebiasaan — “—” berarti pekan itu
          tidak ada jadwal.
        </p>

        <div className="mt-3 overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[320px] border-separate border-spacing-x-1.5 border-spacing-y-1">
            <caption className="sr-only">
              Persentase penyelesaian kebiasaan per pekan, empat pekan
              terakhir, urut rata-rata tertinggi
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-[38%] text-left">
                  <span className="sr-only">Kebiasaan</span>
                </th>
                {weekLabels.map((start, i) => (
                  <th
                    key={start}
                    scope="col"
                    className="text-center text-chart-label font-semibold uppercase tracking-[0.08em] text-content-muted"
                    /* v2.47 (audit #8): label manusiawi ("Sen, 17 Nov"),
                        bukan ISO mentah — selaras kalender & heatmap. */
                    aria-label={`Pekan mulai ${shortDateLabel(start)}`}
                  >
                    {i === weekLabels.length - 1 ? 'ini' : `P${i + 1}`}
                  </th>
                ))}
                <th
                  scope="col"
                  className="text-center text-chart-label font-semibold uppercase tracking-[0.08em] text-content-muted"
                >
                  Rata²
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.habit.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Buka detail ${r.habit.title} — rata-rata ${r.avg ?? '—'}% empat pekan`}
                  onClick={() => onSelect(r.habit.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelect(r.habit.id)
                    }
                  }}
                  className="interactive cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <th
                    scope="row"
                    className="max-w-0 truncate pr-2 text-left text-meta font-semibold text-content-primary"
                  >
                    {r.habit.title}
                  </th>
                  {r.pcts.map((p, i) => (
                    <td key={i} className="p-0">
                      <span
                        className={`block rounded-md py-1.5 text-center text-chart-label font-bold tabular-nums ${cellText(p)}`}
                        style={{ backgroundColor: cellBg(p) }}
                      >
                        {p == null ? '—' : `${p}%`}
                      </span>
                    </td>
                  ))}
                  <td className="p-0">
                    <span className="block py-1.5 text-center text-chart-label font-bold tabular-nums text-module-accent-strong">
                      {r.avg == null ? '—' : `${r.avg}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </m.div>
  )
}
