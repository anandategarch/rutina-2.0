'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * RutinaMetric — angka statistik standar (saldo, kalori, XP, progres).
 * Skala: angka KPI 20–36px, Geist, tabular-nums agar stabil berubah nilai.
 * `icon` menampilkan chip ikon bulat di sisi kiri — beri iconClassName
 * bertint domain (mis. bg-module-accent/15 text-module-accent-strong)
 * supaya metrik ikut identitas modulnya.
 */
export interface RutinaMetricProps {
  label: string
  value: ReactNode
  /** Satuan kecil di samping nilai (Rp, kkal, kg). */
  unit?: string
  /** Arah perubahan — memberi warna semantik, bukan hanya angka. */
  trend?: 'up' | 'down' | 'neutral'
  /** Baris kedua kecil di bawah nilai (mis. "dari target 2.400 kkal"). */
  caption?: ReactNode
  /** Chip ikon bulat di sisi kiri (opsional) — identitas tile. */
  icon?: LucideIcon
  /** Kelas warna chip ikon (mis. bg-module-accent/15 text-module-accent-strong). */
  iconClassName?: string
  /** sm = tile stat bento (20px) · md = kartu biasa (26px) · lg = hero (34px). */
  size?: 'sm' | 'md' | 'lg'
  /** Perataan angka dalam kartu. */
  align?: 'left' | 'center'
  className?: string
}

export function RutinaMetric({
  label,
  value,
  unit,
  trend = 'neutral',
  caption,
  icon: Icon,
  iconClassName,
  size = 'md',
  align = 'left',
  className,
}: RutinaMetricProps) {
  const body = (
    <>
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-content-muted">
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 flex items-baseline gap-1 font-sans font-bold leading-none tracking-tight tabular-nums',
          size === 'lg' ? 'text-[34px]' : size === 'sm' ? 'text-[20px]' : 'text-[26px]',
          trend === 'up' && 'text-success',
          trend === 'down' && 'text-content-danger',
          trend === 'neutral' && 'text-content-primary',
        )}
      >
        <span>{value}</span>
        {unit && (
          <span className="text-[13px] font-semibold text-content-muted">
            {unit}
          </span>
        )}
      </p>
      {caption && (
        <p className="mt-0.5 text-xs leading-snug text-content-muted">{caption}</p>
      )}
    </>
  )

  if (Icon) {
    return (
      <div
        className={cn(
          'flex items-start gap-3',
          align === 'center' && 'items-center text-center',
          className,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            iconClassName ?? 'bg-surface-secondary text-content-secondary',
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">{body}</div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-0.5',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {body}
    </div>
  )
}
