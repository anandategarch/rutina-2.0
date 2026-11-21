'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { RutinaCard } from '../../rutina-card'

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
 * Gunakan hanya jika berguna — untuk redesis dalam kartu yang sudah
 * ada (chrome tersendiri), cukup pakai ChartSrSummary + ChartLegend.
 * (v2.48: ChartFrame sendiri masih perancah — belum dipakai modul
 * mana pun; konsumen langsung saat ini hanya ChartSrSummary +
 * ChartLegend. Dipertahankan sebagai fondasi kartu grafik mandiri
 * berikutnya.)
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

export interface ChartFrameProps {
  /** Label kecil di atas judul (text-eyebrow). */
  eyebrow?: string
  title: string
  description?: string
  /** Slot kanan header — pil mode, tombol, dsb. */
  action?: ReactNode
  /** Catatan kaki metodologi — penting untuk kejujuran data. */
  footer?: ReactNode
  children: ReactNode
  className?: string
  /** aria-label section; default ke title. */
  'aria-label'?: string
}

/**
 * ChartFrame — bingkai panel analitik untuk grafik ilustratif BARU
 * (peta anatomi, konstelasi, dsb.). Kartu lama yang hanya mengganti
 * isi grafik tetap memakai chrome-nya sendiri — jangan dipaksa pindah.
 */
export function ChartFrame({
  eyebrow,
  title,
  description,
  action,
  footer,
  children,
  className,
  'aria-label': ariaLabel,
}: ChartFrameProps) {
  return (
    <section aria-label={ariaLabel ?? title} className={className}>
      <RutinaCard variant="data" density="comfortable" className="h-full">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-0.5">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-secondary">
                {eyebrow}
              </p>
            )}
            <h2 className="text-section-lg font-semibold text-content-primary">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-meta text-content-muted">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        <div className="mt-3">{children}</div>
        {footer && (
          <div className="mt-3 border-t border-border-default/60 px-0.5 pt-2.5 text-eyebrow leading-snug text-content-muted">
            {footer}
          </div>
        )}
      </RutinaCard>
    </section>
  )
}
