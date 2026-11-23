'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { RutinaIllustration } from './rutina-illustration'
import { playfair } from './serif'

/**
 * RutinaEmptyState — tampilan standar ketika belum ada data.
 * Menjaga konteks tetap positif sesuai karakter "kebun" Rutina.
 */
export interface RutinaEmptyStateProps {
  /** Ikon/ilustrasi kecil di atas judul. */
  icon?: ReactNode
  /** Nama aset ilustrasi (mis. "21-habits-sprout") — menggantikan ikon bila diisi. */
  image?: string
  title: string
  description?: string
  /** Aksi primer, mis. tombol "Catat sesi pertama". */
  action?: ReactNode
  className?: string
}

export function RutinaEmptyState({
  icon,
  image,
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
      {image ? (
        <RutinaIllustration
          name={image}
          className="mb-3 h-24 w-32 shadow-sm"
          size={256}
        />
      ) : (
        icon && (
          <span
            aria-hidden="true"
            className="mb-1 flex size-12 items-center justify-center rounded-full bg-secondary text-primary [&_svg]:size-6"
          >
            {icon}
          </span>
        )
      )}
      <p
        className={cn(
          'font-semibold text-content-primary text-lead',
          playfair.className,
        )}
      >
        {title}
      </p>
      {description && (
        <p className="max-w-[36ch] text-note leading-relaxed text-content-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
