'use client'

import * as m from 'motion/react-m'

import { motionTokens } from '@/lib/motion/tokens'
import { PLANT_STAGES, plantStageOf } from './habit-coach'
import { RutinaSectionHeader } from './rutina-section-header'
import { todayISO, useRutina } from './store'

/**
 * Taman Pertumbuhan — strip gulir horizontal kebiasaan aktif, masing-masing
 * dengan emoji tahap, label, dan bar progres tipis menuju tahap berikutnya
 * (Benih → Tunas → Pohon Muda → Pohon Dewasa → Berbunga, ambang 1/7/21/60).
 */
export function PlantGarden() {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)

  const today = todayISO()
  const active = habits.filter((h) => !h.archived)

  /* Tanpa kebiasaan aktif — taman belum perlu ditanam. */
  if (active.length === 0) return null

  return (
    <m.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, ease: motionTokens.easing.standard }}
      aria-label="Taman Pertumbuhan"
      className="mt-8"
    >
      <RutinaSectionHeader
        title="Taman Pertumbuhan"
        description="Kebiasaan yang konsisten tumbuh perlahan"
      />
      <div
        role="list"
        aria-label="Tahap pertumbuhan tiap kebiasaan"
        className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto no-scrollbar pb-1"
      >
        {active.map((h) => {
          const p = plantStageOf(h, completions, today)
          /* Bar penuh di tahap akhir; selain itu total/ambang berikutnya. */
          const pct = p.nextAt ? Math.min(p.total / p.nextAt, 1) : 1
          const counter = p.nextAt
            ? `${p.total}/${p.nextAt}`
            : 'Tahap akhir'
          return (
            <div
              key={h.id}
              role="listitem"
              className="w-[136px] shrink-0 snap-start rounded-[18px] border border-border bg-surface-primary p-3.5 shadow-soft"
            >
              <span
                aria-hidden="true"
                className="block text-[30px] leading-none"
              >
                {p.stage.emoji}
              </span>
              <p className="mt-2.5 truncate text-[12px] font-semibold text-content-primary">
                {h.title}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-medium text-content-muted">
                {p.stage.label} · {counter}
              </p>
              <div
                className="mt-2.5 h-1 overflow-hidden rounded-full bg-surface-sunken"
                role="progressbar"
                aria-label={`Progres ${h.title} — ${p.stage.label}, ${counter}`}
                aria-valuenow={p.total}
                aria-valuemin={0}
                aria-valuemax={p.nextAt ?? p.total}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${Math.round(pct * 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-2 px-0.5 text-[11px] font-medium text-content-muted">
        {PLANT_STAGES.map((s) => s.label).join(' → ')} — tumbuh dari total
        penyelesaian nyata.
      </p>
    </m.section>
  )
}
