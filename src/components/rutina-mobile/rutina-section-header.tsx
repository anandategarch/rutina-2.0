'use client'

import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { WordReveal } from './word-reveal'

/**
 * RutinaSectionHeader — judul standar setiap bagian layar.
 * Tipografi System v1: judul seksi memakai Geist Sans 16px semibold
 * normal case (token --text-section-lg) — Playfair hanya untuk aksen
 * editorial di tingkat halaman, bukan judul seksi operasional.
 * `accent` mewarnai titik & eyebrow dengan warna domain layar (token
 * module-accent kontekstual) — identitas modul tanpa mengubah judul.
 *
 * v2.87: `reveal` — judul seksi terungkap per kata (GSAP ScrollTrigger)
 * saat seksi masuk viewport; tanpa prop ini perilaku lama (teks statis)
 * sepenuhnya dipertahankan. Pasangkan `visitKey` untuk gerbang
 * anti-replay kunjungan pertama.
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
  /** Ungkap judul per kata saat masuk viewport (GSAP, v2.87). */
  reveal?: boolean
  /** Gerbang anti-replay untuk reveal — konvensi '<layar>-<blok>'. */
  visitKey?: string
}

export function RutinaSectionHeader({
  title,
  eyebrow,
  action,
  description,
  accent = false,
  reveal = false,
  visitKey,
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
              'mb-0.5 flex items-center gap-1.5 text-eyebrow font-semibold uppercase tracking-[0.14em]',
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
        {reveal ? (
          <WordReveal
            as="h2"
            text={title}
            visitKey={visitKey}
            className={cn(
              'text-section-lg font-semibold leading-tight tracking-tight text-content-primary',
            )}
          />
        ) : (
          <h2
            className={cn(
              'text-section-lg font-semibold leading-tight tracking-tight text-content-primary',
            )}
          >
            {title}
          </h2>
        )}
        {description && (
          <p className="mt-1 text-note leading-snug text-content-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 pb-0.5">{action}</div>}
    </div>
  )
}
