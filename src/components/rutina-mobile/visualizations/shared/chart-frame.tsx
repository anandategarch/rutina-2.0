'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Fondasi visualisasi bersama — Warm Editorial Productivity:
 * Illustrated Data Visualization Edition (v2.47).
 *
 * Prinsip (prompt utama):
 * 1. Kartu grafik ilustratif memakai bingkai analitik konsisten
 *    (RutinaCard varian `data`) — bukan chrome baru per modul.
 * 2. Komponen di sini PRESENTASIONAL murni — tidak ada kalkulasi
 *    domain; semua angka datang dari adapter murni tiap modul.
 * 3. Aksesibilitas bukan tambahan: setiap grafik ilustratif wajib
 *    punya representasi tekstual (sr-only summary / label lengkap).
 *
 * (v2.62 audit dead code: ChartFrame — perancah v2.48 yang tak pernah
 * diadopsi modul mana pun — dipensiunkan; konsumen nyata fondasi ini
 * hanya ChartSrSummary + ChartLegend. Riwayatnya ada di git.)
 *
 * Konvensi gerak standar (v2.48): komponen grafik ilustratif
 * menggabungkan gerbang first-visit DENGAN reduced-motion secara
 * eksplisit — `const play = useFirstVisit(k) && !useReducedMotion()`
 * — jangan mengandalkan MotionConfig global saja (properti
 * non-posisi seperti strokeDashoffset/pathLength tidak disentuhnya).
 */

/** Ringkasan data untuk pembaca layar — selalu dipasang di grafik statis. */
export function ChartSrSummary({ children }: { children: ReactNode }) {
  return <p className="sr-only">{children}</p>
}

export interface ChartLegendItem {
  /** Warna titik — kelas Tailwind (mis. 'bg-module-accent') atau nilai CSS. */
  color: string
  label: string
  /** true bila `color` adalah nilai CSS mentah (bukan kelas Tailwind). */
  rawColor?: boolean
}

/** Baris legenda dot + label yang seragam antar grafik. */
export function ChartLegend({
  items,
  className,
  label,
}: {
  items: ChartLegendItem[]
  className?: string
  /** aria-label untuk grup legenda. */
  label?: string
}) {
  return (
    <ul
      aria-label={label}
      className={cn(
        'flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-chart-label font-medium text-content-secondary',
        className,
      )}
    >
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              'inline-block size-2 rounded-full',
              !it.rawColor && it.color,
            )}
            style={it.rawColor ? { backgroundColor: it.color } : undefined}
          />
          {it.label}
        </li>
      ))}
    </ul>
  )
}
