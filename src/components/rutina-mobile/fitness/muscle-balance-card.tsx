'use client'

import { useMemo, useState } from 'react'
import * as m from 'motion/react-m'
import { Dumbbell } from 'lucide-react'

import { addDaysISO, todayISO, useRutina } from '../store'
import { EX_LIB, MUSCLE_GROUPS } from './data'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { motionTokens } from '@/lib/motion/tokens'
import { RutinaEmptyState } from '../rutina-empty-state'
import {
  AnatomyMap,
  type AnatomyGroupStat,
} from '../visualizations/fitness/anatomy-map'

/**
 * Neraca Kelompok Otot (review UI/UX v2.44) — distribusi volume latihan
 * beban per kelompok otot dalam jendela 7 / 30 hari.
 *
 * v2.47 (visualisasi ilustratif): daftar batang diganti PETA ANATOMI
 * interaktif (anatomy-map.tsx) — siluet depan/belakang dengan wilayah
 * otot yang intensitasnya mengikuti jumlah set relatif.
 *
 * Aturan review yang dipegang: hanya KELOMPOK OTOT UTAMA yang tercatat
 * di pustaka gerakan (EX_LIB.muscle) — beban TIDAK dibagi ke otot
 * sekunder tanpa aturan pembobotan yang jelas. Satuan: jumlah set;
 * frekuensi = hari dengan sesi beban.
 */

/** Satu kelompok otot — jumlah set, gerakan & tanggal penyumbang. */
interface MuscleBar {
  group: string
  sets: number
  exercises: string[]
  /** Tanggal (ISO, unik) dengan ≥1 set kelompok ini — terbaru dulu. */
  dates: string[]
}

const WINDOWS: { id: 7 | 30; label: string }[] = [
  { id: 30, label: '30 hari' },
  { id: 7, label: '7 hari' },
]

/* v2.45 (audit F14): peta nama → otot utama sekali di level modul —
   bukan EX_LIB.find O(31) per set di dalam jendela. */
const MUSCLE_BY_NAME = new Map(EX_LIB.map((e) => [e.name, e.muscle] as const))

export function MuscleBalanceCard() {
  const workouts = useRutina((s) => s.workouts)
  const reducedEntrance = useFirstVisit('bugar-muscle-balance')
  const [win, setWin] = useState<7 | 30>(30)
  const [selected, setSelected] = useState<string | null>(null)

  const { bars, activeDays, sessions } = useMemo(() => {
    const today = todayISO()
    const cutoff = addDaysISO(today, -(win - 1))
    const inWindow = workouts.filter(
      (w) => w.kind === 'beban' && w.date >= cutoff && w.date <= today,
    )
    const byGroup = new Map<string, MuscleBar>()
    for (const g of MUSCLE_GROUPS) {
      byGroup.set(g, { group: g, sets: 0, exercises: [], dates: [] })
    }
    for (const w of inWindow) {
      /* Kelompok yang kebagian set dari sesi ini — untuk tanggal unik. */
      const hit = new Set<string>()
      for (const s of w.sets) {
        const muscle = MUSCLE_BY_NAME.get(s.exercise)
        if (!muscle) continue
        const bar = byGroup.get(muscle)
        if (!bar) continue
        bar.sets++
        if (!bar.exercises.includes(s.exercise)) bar.exercises.push(s.exercise)
        hit.add(muscle)
      }
      for (const g of hit) byGroup.get(g)!.dates.push(w.date)
    }
    for (const b of byGroup.values()) {
      b.dates = [...new Set(b.dates)].sort().reverse()
    }
    const bars = [...byGroup.values()].sort((a, b) => b.sets - a.sets)
    return {
      bars,
      activeDays: new Set(inWindow.map((w) => w.date)).size,
      sessions: inWindow.length,
    }
  }, [workouts, win])

  const maxSets = Math.max(...bars.map((b) => b.sets), 0)
  const trainedGroups = bars.filter((b) => b.sets > 0)
  const top = trainedGroups[0]

  const stats: AnatomyGroupStat[] = bars.map((b) => ({
    group: b.group,
    sets: b.sets,
    dates: b.dates,
    exercises: b.exercises,
  }))

  return (
    <m.section
      initial={reducedEntrance ? { opacity: 0, y: 14 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{
        ...motionTokens.preset.chipReveal,
        delay: motionTokens.delay.tight,
      }}
      aria-label="Neraca kelompok otot"
      className="rounded-xl border border-border bg-surface-primary p-4 shadow-soft"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-0.5">
        <h2 className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-secondary">
          Neraca Kelompok Otot
        </h2>
        {/* Jendela waktu — pil kecil bergaya pemilih mode Heatmap. */}
        <div
          role="group"
          aria-label="Jendela waktu neraca otot"
          className="flex gap-1 rounded-full bg-surface-sunken p-0.5"
        >
          {WINDOWS.map((w) => {
            const on = win === w.id
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setWin(w.id)
                  setSelected(null)
                }}
                aria-pressed={on}
                className={
                  'interactive h-6.5 cursor-pointer rounded-full px-2.5 text-eyebrow font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-strong ' +
                  (on
                    ? 'bg-surface-inverse text-content-inverse shadow-soft'
                    : 'text-content-secondary hover:text-content-primary')
                }
              >
                {w.label}
              </button>
            )
          })}
        </div>
      </div>

      {maxSets === 0 ? (
        <RutinaEmptyState
          className="mt-3"
          icon={<Dumbbell />}
          title={`Belum ada latihan beban dalam ${win} hari`}
          description="Catat satu sesi barbel — jumlah set per kelompok otot akan tergambar di sini, dihitung dari gerakan pustaka yang kamu catat."
        />
      ) : (
        <>
          <p className="mt-1 px-0.5 text-meta text-content-muted">
            {sessions} sesi · {activeDays} hari aktif · dihitung dari{' '}
            {trainedGroups.length} kelompok otot (otot utama gerakan)
          </p>

          {/* Peta anatomi interaktif — wilayah otot ∝ jumlah set. */}
          <div className="mt-2">
            <AnatomyMap
              stats={stats}
              maxSets={maxSets}
              selected={selected}
              onSelect={setSelected}
              windowLabel={`${win} hari`}
            />
          </div>

          {/* Catatan kaki — kelompok terlatih + disclaimer otot utama. */}
          {top && (
            <p className="mt-3 border-t border-border-default pt-2.5 px-0.5 text-eyebrow leading-snug text-content-muted">
              Paling banyak dilatih:{' '}
              <span className="font-semibold text-module-accent-strong">
                {top.group}
              </span>{' '}
              ({top.sets} set). Set dihitung dari kelompok otot utama tiap
              gerakan pustaka — otot sekunder tidak dibagi tanpa pembobotan.
            </p>
          )}
        </>
      )}
    </m.section>
  )
}
