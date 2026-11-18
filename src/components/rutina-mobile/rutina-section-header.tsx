'use client'

import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { playfair } from './serif'

/**
 * RutinaSectionHeader — judul standar setiap bagian layar.
 * Skala tipografi: section title 18–20px (spesifikasi design system).
 * `accent` mewarnai titik & eyebrow dengan warna domain layar (token
 * module-accent kontekstual) — identitas modul tanpa mengubah judul.
 */
export interface RutinaSectionHeaderProps
  extends HTMLAttributes<HTMLDivElement> {
  /** Judul bagian. */
  title: string
  /** Kicker kecil di atas judul (opsional) — label konteks 11–12px. */
  eyebrow?: string
  /** Aksi di sisi kanan (tombol "Lihat semua", pemilih periode, dsb.). */
  action?: ReactNode
  /** Uraian singkat di bawah judul. */
  description?: string
  /** Tampilkan titik aksen warna domain (pakai bersama data-module). */
  accent?: boolean
}

export function RutinaSectionHeader({
  title,
  eyebrow,
  action,
  description,
  accent = false,
  className,
  ...props
}: RutinaSectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-end justify-between gap-3',
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p
            className={cn(
              'mb-0.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em]',
              accent
                ? 'text-module-accent-strong'
                : 'text-content-muted',
            )}
          >
            {accent && (
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-module-accent"
              />
            )}
            {eyebrow}
          </p>
        )}
        <h2
          className={cn(
            'font-semibold leading-tight tracking-tight text-content-primary text-[19px]',
            playfair.className,
          )}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-[13px] leading-snug text-content-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 pb-0.5">{action}</div>}
    </div>
  )
}
