'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * RutinaMetric — angka statistik standar (saldo, kalori, XP, progres).
 * Skala: angka KPI 28–36px, Geist, tabular-nums agar stabil berubah nilai.
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
  size?: 'md' | 'lg'
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
  size = 'md',
  align = 'left',
  className,
}: RutinaMetricProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-content-muted">
        {label}
      </p>
      <p
        className={cn(
          'flex items-baseline gap-1 font-sans font-bold leading-none tracking-tight tabular-nums',
          size === 'lg' ? 'text-[34px]' : 'text-[26px]',
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
        <p className="text-xs leading-snug text-content-muted">{caption}</p>
      )}
    </div>
  )
}
