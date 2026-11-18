'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { playfair } from './serif'

/**
 * RutinaEmptyState — tampilan standar ketika belum ada data.
 * Menjaga konteks tetap positif sesuai karakter "kebun" Rutina.
 */
export interface RutinaEmptyStateProps {
  /** Ikon/ilustrasi kecil di atas judul. */
  icon?: ReactNode
  title: string
  description?: string
  /** Aksi primer, mis. tombol "Catat sesi pertama". */
  action?: ReactNode
  className?: string
}

export function RutinaEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: RutinaEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-default bg-surface-primary/60 px-6 py-10 text-center',
        className,
      )}
    >
      {icon && (
        <span
          aria-hidden="true"
          className="mb-1 flex size-12 items-center justify-center rounded-full bg-secondary text-primary [&_svg]:size-6"
        >
          {icon}
        </span>
      )}
      <p
        className={cn(
          'font-semibold text-content-primary text-[17px]',
          playfair.className,
        )}
      >
        {title}
      </p>
      {description && (
        <p className="max-w-[36ch] text-[13px] leading-relaxed text-content-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
