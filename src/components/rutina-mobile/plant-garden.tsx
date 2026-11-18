'use client'

import * as m from 'motion/react-m'

import { Progress } from '@/components/ui/progress'
import { motionTokens } from '@/lib/motion/tokens'
import { useAnimePop } from './anime-kit'
import { PLANT_STAGES, plantStageOf } from './habit-coach'
import { RutinaSectionHeader } from './rutina-section-header'
import { todayISO, useRutina } from './store'

/**
 * Taman Pertumbuhan — strip gulir horizontal kebiasaan aktif, masing-masing
 * dengan emoji tahap, label, dan bar progres tipis menuju tahap berikutnya
 * (Benih → Tunas → Pohon Muda → Pohon Dewasa → Berbunga, ambang 1/7/21/60).
 *
 * v2.6 "Gerak & Permukaan":
 * • emoji tanaman berayun halus (animate-sway) dengan fase unik per kartu —
 *   kebun terasa tertiup angin, bukan wallpaper statis;
 * • naik tahap memicu pop elastis anime.js (useAnimePop);
 * • bar progres memakai shadcn/ui Progress (Radix, aria lengkap).
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
        {active.map((h, i) => {
          const p = plantStageOf(h, completions, today)
          /* Bar penuh di tahap akhir; selain itu total/ambang berikutnya. */
          const pct = p.nextAt ? Math.min(p.total / p.nextAt, 1) : 1
          const counter = p.nextAt
            ? `${p.total}/${p.nextAt}`
            : 'Tahap akhir'
          return (
            <PlantCard
              key={h.id}
              title={h.title}
              stage={p.stage.emoji}
              stageKey={p.stage.label}
              stageLabel={p.stage.label}
              counter={counter}
              pct={pct}
              total={p.total}
              nextAt={p.nextAt}
              swayDelay={(i % 5) * 0.9}
            />
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

/** Satu kartu tanaman — dipisah agar useAnimePop hidup per tanaman. */
function PlantCard({
  title,
  stage,
  stageKey,
  stageLabel,
  counter,
  pct,
  total,
  nextAt,
  swayDelay,
}: {
  title: string
  stage: string
  stageKey: string
  stageLabel: string
  counter: string
  pct: number
  total: number
  nextAt: number | null
  swayDelay: number
}) {
  const emojiRef = useAnimePop<HTMLSpanElement>(null, stageKey, {
    scale: 1.3,
    rotate: 8,
    duration: 720,
  })

  return (
    <div
      role="listitem"
      className="w-[156px] shrink-0 snap-start rounded-[18px] border border-border bg-surface-primary p-3 shadow-soft transition-transform duration-300 hover:-translate-y-0.5"
    >
      <span
        ref={emojiRef}
        aria-hidden="true"
        className="block origin-bottom text-[30px] leading-none motion-safe:animate-sway"
        style={{ animationDelay: `${swayDelay}s` }}
      >
        {stage}
      </span>
      <p className="mt-2.5 line-clamp-2 break-words text-left text-[12px] font-semibold leading-snug text-content-primary">
        {title}
      </p>
      <p className="mt-0.5 truncate text-[11px] font-medium text-content-muted">
        {stageLabel} · {counter}
      </p>
      <Progress
        value={Math.round(pct * 100)}
        className="mt-2.5 h-1 bg-surface-sunken"
        aria-label={`Progres ${title} — ${stageLabel}, ${counter}`}
      />
    </div>
  )
}
