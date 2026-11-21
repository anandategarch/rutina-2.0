'use client'

import { useMemo } from 'react'
import * as m from 'motion/react-m'
import { useReducedMotion } from 'motion/react'

import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'

/**
 * MoodWheel — roda distribusi suasana catatan (Jurnal, Quiet Atelier).
 *
 * Mengganti bar segmen proporsi mood: donat arc ∝ jumlah/total dengan
 * celah tipis antar-arc dan ujung membulat (strokeLinecap round).
 * Slot sudut selalu menjumlah tepat 360°; arc kecil (sub-visible)
 * merender sebagai dot terpusat yang luapannya dibatasi tarikan cap
 * (audit v2.47 (3-d)).
 * Angka persis tetap dibawa legenda teks "{mood} {n}×" di pemanggil —
 * roda adalah bentuk, bukan sumber angka.
 *
 * Warna arc MENGACU MOOD_DOT (journal-ui.ts) satu-satu, diterjemahkan
 * ke nilai CSS eksplisit karena kelas Tailwind tidak bisa menjadi fill
 * SVG: bg-gold → var(--color-gold), bg-primary → var(--primary),
 * bg-cocoa/40 & bg-espresso/40 → color-mix 40% di atas permukaan kartu
 * (semantik "titik pudar di atas kartu" dipertahankan, sekligus aman
 * mode gelap karena mengikuti --surface-primary).
 *
 * Non-interaktif dengan sengaja: lapisan interaktif tetap chip filter
 * mood di atas kartu. Hanya merender bila ada ≥1 mood tercatat
 * (kondisi di pemanggil).
 */

/** Padanan nilai CSS untuk kelas MOOD_DOT (journal-ui.ts). */
const MOOD_ARC_FILL: Record<string, string> = {
  Ceria: 'var(--color-gold)',
  Baik: 'var(--primary)',
  Biasa: 'color-mix(in oklab, var(--color-cocoa) 40%, var(--surface-primary))',
  Lelah: 'color-mix(in oklab, var(--color-espresso) 40%, var(--surface-primary))',
}
/** Mood di luar daftar → padanan fallback 'bg-cocoa/40' yang lama. */
const ARC_FALLBACK_FILL = MOOD_ARC_FILL.Biasa

const CX = 48
const CY = 48
/** Radius tengah donat — inner 26 / outer 40 (stroke 14). */
const R_MID = 33
const STROKE = 14
/** Celah tinta-ke-tinta antar arc (derajat), dibagi rata ke dua sisi
 *  slot: endpoint path ditarik mundur CAP_DEG + GAP_DEG/2 per ujung
 *  sehingga SETELAH ujung bulat menjulur CAP_DEG, sisa celah visual
 *  tetap GAP_DEG. Audit v2.47 (3-d): dulu GAP_DEG tak pernah dipakai —
 *  tarikan 2×CAP_DEG dikonsumsi ulang pas oleh ujung bulat, arc saling
 *  menempel 0°. */
const GAP_DEG = 2
/** Ujung bulat (strokeLinecap round) menjulur melewati ujung path
 *  sepanjang setengah lebar goresan → sudut padanannya di radius
 *  tengah; endpoint path ditarik mundur sejauh ini per ujung. */
const CAP_DEG = (180 / Math.PI) * (STROKE / 2 / R_MID)
/** Rentang path minimal yang masih terrender andal — dipakai HANYA
 *  untuk arc yang sejatinya sub-visible (± < 2×CAP_DEG): tampil sebagai
 *  titik arc kecil berujung bulat, tidak pernah lebih lebar dari
 *  sudut sejatinya. */
const MIN_SPAN_DEG = 1.2

/** Titik pada lingkaran — 0° = pukul dua belas, searah jarum jam. */
function polar(deg: number, r: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

/** Path arc (searah jarum jam) dari startDeg sepanjang spanDeg. */
function arcPath(startDeg: number, spanDeg: number): string {
  const a = polar(startDeg, R_MID)
  const b = polar(startDeg + spanDeg, R_MID)
  const large = spanDeg > 180 ? 1 : 0
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R_MID} ${R_MID} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`
}

export function MoodWheel({
  counts,
}: {
  /** Pasangan [mood, jumlah] — hanya mood tercatat, terurut menurun. */
  counts: [string, number][]
}) {
  const play = useFirstVisit('journal-mood-wheel')
  const reduced = useReducedMotion()

  const total = counts.reduce((a, [, n]) => a + n, 0)

  /* Geometri arc — slot ∝ jumlah/total dan selalu menjumlah tepat
     360° (sudut awal dihitung dalam loop murni, bukan reassign di
     dalam callback map). Audit v2.47 (3-d), dua perbaikan:
     (1) GAP_DEG kini benar-benar dikurangkan dari sapuan path —
         tinta antar-arc bersela nyata, pasangan tint gelap
         bersebelahan (mis. Biasa/Lelah) tetap terbedakan;
     (2) lantai MIN_SPAN_DEG hanya untuk arc yang SEJATINYA
         sub-visible — sisanya proporsional penuh (visual =
         true − GAP_DEG), dot kecil dipusatkan pada slotnya, dan
         span tak pernah melebihi sudut sejati sehingga luapan tinta
         dibatasi tarikan cap (visual ≤ true + 2×CAP_DEG). */
  const arcs = useMemo(() => {
    const starts: number[] = []
    let acc = 0
    for (const [, n] of counts) {
      starts.push(acc)
      acc += (n / total) * 360
    }
    return counts.map(([mood, n], i) => {
      const slotStart = starts[i] ?? 0
      const trueSpan = (n / total) * 360
      /* Sapuan normal: sudut sejati − tarikan cap dua ujung − celah. */
      const pulled = trueSpan - 2 * CAP_DEG - GAP_DEG
      let pathStart: number
      let span: number
      if (pulled >= MIN_SPAN_DEG) {
        /* Visual = [slot+GAP/2, slot+true−GAP/2] — proporsional,
           bersela GAP_DEG nyata di kedua batas slot. */
        span = pulled
        pathStart = slotStart + CAP_DEG + GAP_DEG / 2
      } else {
        /* Arc sub-visible: path menyusut ke lantai MIN_SPAN_DEG (ujung
           bulat tetap membentuk dot ±2×CAP), DIPUSATKAN pada slot,
           dan tidak pernah lebih lebar dari sudut sejatinya. */
        span = Math.min(MIN_SPAN_DEG, trueSpan)
        pathStart = slotStart + (trueSpan - span) / 2
      }
      return { mood, count: n, start: slotStart, pathStart, span }
    })
  }, [counts, total])

  /* v2.49 (audit): guard input degenerate — counts kosong / total 0
     menghasilkan arc NaN (0/0). Pemanggil saat ini sudah menjaga
     (moodCounts.length > 0), guard komponen melindungi pemanggil masa
     depan (pola chart-frame). Diletakkan SETELAH seluruh hook. */
  if (counts.length === 0 || total <= 0) return null

  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg
        viewBox="0 0 96 96"
        className="h-full w-full"
        role="img"
        aria-label={`Distribusi suasana catatan: ${counts
          .map(([mood, n]) => `${mood} ${n} kali`)
          .join(', ')}`}
      >
        {/* Rel donat samar — padanan track bg-surface-sunken bar lama. */}
        <circle
          cx={CX}
          cy={CY}
          r={R_MID}
          fill="none"
          stroke="var(--surface-sunken)"
          strokeWidth={STROKE}
        />
        {arcs.map((a, i) => {
          const fill = MOOD_ARC_FILL[a.mood] ?? ARC_FALLBACK_FILL
          return (
            <m.path
              key={a.mood}
              d={arcPath(a.pathStart, a.span)}
              fill="none"
              stroke={fill}
              strokeWidth={STROKE}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              initial={
                play && !reduced ? { strokeDashoffset: 1 } : false
              }
              animate={{ strokeDashoffset: 0 }}
              transition={{
                ...motionTokens.preset.data,
                delay: i * motionTokens.stagger.normal,
              }}
            />
          )
        })}
      </svg>
      {/* Pusat roda — total mood tercatat; aria-hidden karena label svg
          sudah membawa seluruh distribusi (angka per mood + jumlah). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
      >
        <span className="text-kpi-sm font-bold leading-none tabular-nums text-content-primary">
          {total}
        </span>
        <span className="mt-0.5 text-chart-label text-content-muted">
          mood tercatat
        </span>
      </div>
    </div>
  )
}
