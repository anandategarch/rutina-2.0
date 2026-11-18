'use client'

import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { playfair } from './serif'

/**
 * RutinaSectionHeader — judul standar setiap bagian layar.
 * Skala tipografi: section title 18–20px (spesifikasi design system).
 */
export interface RutinaSectionHeaderProps
  extends HTMLAttributes<HTMLDivElement> {
  /** Judul bagian. */
  title: string
  /** Kicker kecil di atas judul (opsional) — label konteks 11–12px. */
  eyebrow?: string
  /** Aksi di sisi kanan (tombol "Lihat semua", dsb.). */
  action?: ReactNode
  /** Uraian singkat di bawah judul. */
  description?: string
}

export function RutinaSectionHeader({
  title,
  eyebrow,
  action,
  description,
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
          <p className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-content-muted">
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
