'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { toast } from 'sonner'

import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { barFill } from '@/lib/motion/transitions'
import { PLANT_STAGES } from './habit-coach'
import { PlantGlyph, usePlantGrowth } from './plant-glyph'
import { todayISO, useRutina, type Completions } from './store'

/**
 * Pohon Kebun (v2.22) — SATU pohon konsistensi untuk seluruh kebun:
 * tumbuh dari jumlah hari aktif (hari dengan minimal satu misi selesai),
 * ambang 1 / 7 / 30 / 90 hari — reinkarnasi "pohon konsistensi" Rutina 1.0
 * dalam bahasa desain line-art 2.0.
 *
 * Naik tahap memicu koreografi pertumbuhan anime.js (usePlantGrowth) +
 * toast; sway idle halus hormat prefers-reduced-motion.
 */

/** Ambang hari aktif menuju tahap berikutnya — Benih → Berbunga. */
const TREE_THRESHOLDS = [1, 7, 30, 90] as const

export interface TreeInfo {
  index: number
  stage: (typeof PLANT_STAGES)[number]
  /** Total hari aktif (≥1 misi selesai). */
  activeDays: number
  /** Ambang hari aktif untuk naik tahap — null di puncak. */
  nextAt: number | null
  /** Progres 0–1 menuju ambang berikutnya. */
  progress: number
}

/** Derivasi murni — tahap pohon kebun dari histori completions. */
export function treeInfoOf(c: Completions): TreeInfo {
  let activeDays = 0
  const today = todayISO()
  for (const [date, day] of Object.entries(c)) {
    if (date > today) continue
    if (Object.values(day).some((v) => v === true)) activeDays++
  }
  let index = 0
  for (let i = 0; i < TREE_THRESHOLDS.length; i++) {
    if (activeDays >= TREE_THRESHOLDS[i]) index = i + 1
  }
  const nextAt =
    index < TREE_THRESHOLDS.length ? TREE_THRESHOLDS[index] : null
  const prevAt = index === 0 ? 0 : TREE_THRESHOLDS[index - 1]
  const progress =
    nextAt == null
      ? 1
      : Math.min(
          1,
          Math.max(0, (activeDays - prevAt) / Math.max(1, nextAt - prevAt)),
        )
  return {
    index,
    stage: PLANT_STAGES[index],
    activeDays,
    nextAt,
    progress,
  }
}

const TREE_HINTS: Record<number, string> = {
  0: 'Satu hari aktif menumbuhkan tunas pertamamu.',
  1: 'Sepekan aktif — akar mulai menancap.',
  2: 'Sebulan-an konsistensi — batang menguat.',
  3: 'Hampir setahun — pohon besar menunggu bunga.',
  4: 'Pohon kebunmu berbunga — penjaga sejati.',
}

export function GardenTree() {
  const completions = useRutina((s) => s.completions)
  const reducedMotion = useReducedMotion()
  /* v2.38 anti-replay: bar progres hanya tumbuh pada kunjungan pertama
     sesi tab — remount antar-tab langsung menampilkan nilai akhir. */
  const firstVisit = useFirstVisit('kebiasaan-garden-tree')
  const info = useMemo(() => treeInfoOf(completions), [completions])

  /* Koreografi pertumbuhan saat naik tahap (anime.js) + toast milestone —
     deteksi perubahan tahap dijalankan di EFEK (bukan render) agar ref
     hanya disentuh di luar render (aturan react-hooks/refs). */
  const wrapRef = useRef<HTMLDivElement>(null)
  usePlantGrowth(wrapRef, info.stage.key)
  const prevIndex = useRef<number | undefined>(undefined)
  useEffect(() => {
    const prev = prevIndex.current
    prevIndex.current = info.index
    if (prev === undefined || prev === info.index) return
    if (info.index > prev) {
      toast.success(`Pohon kebun naik tahap — ${info.stage.label}!`, {
        description: `${info.activeDays} hari aktif menumbuhkannya.`,
      })
    }
  }, [info.index, info.stage.label, info.activeDays])

  const nextStageLabel = info.nextAt
    ? PLANT_STAGES[info.index + 1]?.label
    : null

  return (
    <section
      aria-label="Pohon kebun — konsistensi seluruh kebun"
      className="garden-surface relative overflow-hidden rounded-2xl border border-border-default p-4 shadow-soft sm:p-5"
    >
      {/* Pohon besar + sway idle */}
      <div className="flex items-center gap-5">
        <m.div
          ref={wrapRef}
          initial={false}
          animate={
            reducedMotion
              ? undefined
              : { rotate: [-1.2, 1.2, -1.2] }
          }
          transition={
            reducedMotion ? undefined : motionTokens.preset.gardenSway
          }
          style={{ transformOrigin: '50% 90%' }}
          className="shrink-0 text-module-accent-strong"
        >
          <PlantGlyph
            stage={info.stage.key}
            className="h-24 w-24 sm:h-28 sm:w-28"
          />
        </m.div>
        <div className="min-w-0 flex-1">
          <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
            Pohon Kebun
          </p>
          <p className="mt-1 text-lead font-bold leading-tight text-content-primary">
            {info.stage.label}
          </p>
          <p className="mt-0.5 text-note font-medium text-content-muted">
            {info.activeDays} hari aktif
            {info.nextAt
              ? ` · ${info.nextAt - info.activeDays} hari lagi menuju ${nextStageLabel}`
              : ' — tahap tertinggi'}
          </p>
          {/* Bar progres antar tahap */}
          <div
            className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-sunken"
            role="progressbar"
            aria-label={`Progres pohon kebun menuju ${nextStageLabel ?? 'tahap tertinggi'}`}
            aria-valuenow={Math.round(info.progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <m.div
              className="h-full origin-left rounded-full bg-gradient-to-r from-primary to-pistachio"
              style={{ width: '100%' }}
              initial={firstVisit ? { scaleX: 0 } : false}
              animate={{ scaleX: info.progress }}
              transition={barFill}
            />
          </div>
        </div>
      </div>
      <p className="mt-3 text-eyebrow leading-relaxed text-content-muted">
        {TREE_HINTS[info.index] ?? TREE_HINTS[4]}
      </p>
    </section>
  )
}
