'use client'

import { Fragment, useState } from 'react'
import * as m from 'motion/react-m'
import { Check, Sparkles } from 'lucide-react'

import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { barFill } from '@/lib/motion/transitions'

/* Batas checkpoint fisik — di atasnya tiap checkpoint mewakili >1 misi
   secara proporsional (pola MissionSteps; angka persis tetap dibawa
   ringkasan teks, pembulatan bisa menyimpang ±1 titik). */
const MAX_CHECKPOINTS = 14

export interface MissionTrailMission {
  id: string
  title: string
  done: boolean
}

type TrailState = 'done' | 'current' | 'next'

/**
 * MissionTrail — "Jalur Misi" (v2.50 Daily Almanac).
 *
 * Strip checkpoint horizontal di kepala kartu Agenda: perjalanan misi
 * tanggal yang dilihat sebagai titik-titik berurutan — selesai (penuh
 * + centang), AKTIF (cincin tegaskan = misi pertama yang belum
 * selesai), akan datang (lingkar putus-putus). Jalur penghubung PADAT
 * sejauh misi benar-benar selesai, putus-putus setelahnya — progres
 * jujur, tidak melebih-lebihkan. Semua selesai → perayaan: titik &
 * jalur emas + sparkle kecil (keluarga token perayaan gold/warning).
 *
 * Urutan checkpoint = urutan agenda: misi selesai dulu (urutan bagian
 * "Selesai"), lalu yang tertunda mengikuti urutan homeAttention —
 * pemanggil tidak mengurutkan ulang. >14 misi dilipat proporsional.
 *
 * Dekoratif-informatif: role="img" dengan ringkasan aria + baris
 * sr-only aria-live; checkpoint BUKAN tombol (interaksi tetap di
 * baris TaskRow di bawahnya — tidak ada target ganda). Umpan balik
 * centang: checkpoint yang baru selesai muncul dengan spring
 * (motionTokens.spring.playful) — terpisah dari pop anime.js
 * MissionSteps di kartu hero; mount ulang (kunjungan ulang/ubah
 * tanggal) tampil instan tanpa replay.
 */
export function MissionTrail({
  missions,
  /** true untuk tanggal masa depan — semua checkpoint tampil sebagai
   *  "akan datang" tanpa cincin aktif (belum terjadi, jujur). */
  upcomingOnly = false,
  className,
}: {
  missions: MissionTrailMission[]
  upcomingOnly?: boolean
  className?: string
}) {
  const playEntrance = useFirstVisit('home-mission-trail')

  const total = missions.length
  const done = missions.reduce((n, x) => (x.done ? n + 1 : n), 0)
  const complete = total > 0 && done >= total

  const cpCount = Math.min(total, MAX_CHECKPOINTS)
  const filled =
    total <= MAX_CHECKPOINTS
      ? Math.min(done, cpCount)
      : Math.min(Math.round((done / total) * cpCount), cpCount)
  /* Checkpoint aktif = checkpoint PERTAMA yang belum selesai (urutan
     jalur menempatkan yang selesai di depan). */
  const currentIdx = complete || upcomingOnly ? -1 : Math.min(filled, cpCount - 1)
  const nextTitle = missions.find((x) => !x.done)?.title ?? null

  const summary = complete
    ? `Jalur misi: semua ${total} misi selesai`
    : `Jalur misi: ${done} dari ${total} misi selesai${
        nextTitle ? `, berikutnya: ${nextTitle}` : ''
      }`

  /* Deteksi transisi RUNTIME (bukan mount): nilai progres saat
     instance dipasang disimpan sekali lewat initializer useState —
     hanya checkpoint yang selesai SETELAH mount yang muncul dengan
     pop; mount (kunjungan ulang) & pergantian tanggal (key pemanggil)
     memasang ulang instance dan menangkap nilai baru → tampil instan,
     gerbang anti-replay terjaga tanpa membaca ref saat render. */
  const [mountedProgress] = useState(() => ({ filled, complete }))
  const justFilled = (k: number) => k >= mountedProgress.filled && k < filled
  const justComplete = complete && !mountedProgress.complete

  /* Ukuran titik adaptif — jalur tetap muat di liang 320px tanpa
     luber (14 titik × 12px + sambungan minimal ≈ 207px). */
  const dotPx = cpCount <= 6 ? 16 : cpCount <= 10 ? 14 : 12
  const checkPx = dotPx >= 16 ? 10 : 8

  if (total === 0) return null

  return (
    <div className={className ?? ''}>
      {/* Kepala strip — dekoratif; ringkasan lengkap dibawa aria-label
          role=img + baris live di bawah, tidak diumumkan dobel. */}
      <div aria-hidden="true" className="flex items-center justify-between gap-2">
        <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
          Jalur Misi
        </p>
        <p className="flex items-center gap-1 text-chart-label font-bold tabular-nums text-content-secondary">
          {complete && (
            <m.span
              initial={playEntrance || justComplete ? { scale: 0.4, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={motionTokens.spring.playful}
              className="flex"
            >
              <Sparkles className="h-3 w-3 text-warning" strokeWidth={2.4} />
            </m.span>
          )}
          <span>
            {done}/{total}
          </span>
        </p>
      </div>

      {/* Rel checkpoint — satu baris flex: titik + sambungan flex-1 */}
      <div
        role="img"
        aria-label={summary}
        className={'mt-2 flex items-center' + (cpCount === 1 ? ' justify-center' : '')}
      >
        {Array.from({ length: cpCount }, (_, k) => {
          const key = total <= MAX_CHECKPOINTS ? missions[k].id : `cp-${k}`
          const state: TrailState =
            k < filled ? 'done' : k === currentIdx ? 'current' : 'next'
          return (
            <Fragment key={key}>
              {k > 0 && (
                /* Sambungan: dasar putus-putus selalu tampak; lapisan
                   padat menumbuh lewat barFill HANYA menuju checkpoint
                   yang benar-benar selesai (kedua ujungnya selesai). */
                <span aria-hidden="true" className="relative block h-0 min-w-[3px] flex-1">
                  <span className="absolute inset-x-0 -top-px border-t-2 border-dashed border-border-strong" />
                  <m.span
                    className={
                      'absolute inset-x-0 -top-px h-[2px] origin-left rounded-full transition-colors duration-300 ' +
                      (complete ? 'bg-gold' : 'bg-primary')
                    }
                    initial={playEntrance ? { scaleX: 0 } : false}
                    animate={{ scaleX: k < filled ? 1 : 0 }}
                    transition={{
                      ...barFill,
                      delay: playEntrance ? k * motionTokens.stagger.tight : 0,
                    }}
                  />
                </span>
              )}
              {/* Key menyertakan state → pergantian state MEMASANG
                  ulang titik; initial pop hanya untuk yang baru selesai
                  (justFilled) atau rakitan kunjungan pertama. */}
              <m.span
                aria-hidden="true"
                key={`${key}-${state}`}
                className={
                  'flex shrink-0 items-center justify-center rounded-full transition-colors duration-300 ' +
                  (state === 'done'
                    ? complete
                      ? 'bg-gold text-espresso'
                      : 'bg-primary text-primary-foreground'
                    : state === 'current'
                      ? 'border-2 border-primary bg-surface-primary shadow-[0_0_0_3px_var(--module-accent-soft)]'
                      : 'border-2 border-dashed border-border-strong bg-transparent')
                }
                style={{ width: dotPx, height: dotPx }}
                initial={playEntrance || justFilled(k) ? { scale: 0.4 } : false}
                animate={{ scale: state === 'next' ? 0.85 : 1 }}
                transition={{
                  ...(state === 'done'
                    ? motionTokens.spring.playful
                    : motionTokens.spring.smooth),
                  delay: playEntrance
                    ? Math.min(k * motionTokens.stagger.tight, 0.32)
                    : 0,
                }}
              >
                {state === 'done' && (
                  <Check
                    aria-hidden="true"
                    style={{ width: checkPx, height: checkPx }}
                    strokeWidth={3.2}
                  />
                )}
              </m.span>
            </Fragment>
          )
        })}
      </div>

      {/* Ringkasan hidup — pembaca layar mendengar progres berubah
          (aria-label role=img statis tidak diumumkan ulang). */}
      <span className="sr-only" aria-live="polite">
        {summary}
      </span>
    </div>
  )
}
