'use client'

import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * RutinaListItem — baris daftar standar (transaksi, kebiasaan, pengaturan).
 * Satu baris satu makna: leading (ikon/emoji), konten (judul + subjudul),
 * trailing (nilai/aksi). Tinggi minimum 56px agar nyaman disentuh.
 */
export interface RutinaListItemProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Slot kiri — ikon, avatar, atau emoji dalam pil. */
  leading?: ReactNode
  title: ReactNode
  /** Baris kedua — keterangan, tanggal, kategori. */
  subtitle?: ReactNode
  /** Slot kanan — nilai nominal, chevron, atau aksi. */
  trailing?: ReactNode
  /** Warna aksen leading (nominal masuk/keluar, status). */
  tone?: 'default' | 'positive' | 'negative' | 'warning'
  dense?: boolean
}

export function RutinaListItem({
  leading,
  title,
  subtitle,
  trailing,
  tone = 'default',
  dense = false,
  className,
  ...props
}: RutinaListItemProps) {
  return (
    <div
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-2 text-left transition-colors',
        dense ? 'min-h-14 py-1.5' : 'min-h-[60px] py-2',
        className,
      )}
      {...props}
    >
      {leading && (
        <span
          aria-hidden="true"
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full [&_svg]:size-[18px]',
            tone === 'default' && 'bg-surface-secondary text-content-secondary',
            tone === 'positive' && 'bg-primary/15 text-success',
            tone === 'negative' && 'bg-destructive/12 text-content-danger',
            tone === 'warning' && 'bg-warning/15 text-warning',
          )}
        >
          {leading}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold leading-snug text-content-primary">
          {title}
        </span>
        {subtitle && (
          <span className="mt-0.5 block truncate text-xs leading-snug text-content-muted">
            {subtitle}
          </span>
        )}
      </span>
      {trailing && (
        <span className="shrink-0 text-right">{trailing}</span>
      )}
    </div>
  )
}
