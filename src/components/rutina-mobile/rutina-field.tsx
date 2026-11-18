'use client'

import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

import { cn } from '@/lib/utils'

/**
 * RutinaField — pembungkus label + kontrol + bantuan untuk formulir.
 * Menyeragamkan jarak label-input (6–8px) dan ukuran label 13px semibold.
 */
export interface RutinaFieldProps {
  /** id kontrol — label otomatis terhubung (htmlFor). */
  htmlFor: string
  label: string
  children: ReactNode
  /** Teks bantuan netral di bawah kontrol. */
  hint?: string
  /** Pesan galat — menggantikan hint, warna danger. */
  error?: string
  className?: string
}

export function RutinaField({
  htmlFor,
  label,
  children,
  hint,
  error,
  className,
}: RutinaFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label
        htmlFor={htmlFor}
        className="text-[13px] font-semibold text-content-secondary"
      >
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-content-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-content-muted">{hint}</p>
      ) : null}
    </div>
  )
}
