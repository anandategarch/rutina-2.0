'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Slot } from '@radix-ui/react-slot'

import { cn } from '@/lib/utils'

/**
 * RutinaIconButton — tombol ikon dengan area sentuh konsisten.
 * `label` wajib: menjadi aria-label (screen reader) — ikon sendiri
 * disembunyikan secara semantik.
 *
 * Ukuran: md 44×44 (default, WCAG 2.5.5) · sm 36×36 (kontrol padat).
 */
export interface RutinaIconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Label aksesibel — WAJIB, dibaca screen reader. */
  label: string
  /** Ikon (elemen svg) — disembunyikan dari a11y tree. */
  children: ReactNode
  variant?: 'solid' | 'ghost' | 'outline' | 'danger'
  size?: 'md' | 'sm'
  asChild?: boolean
}

export function RutinaIconButton({
  label,
  children,
  variant = 'ghost',
  size = 'md',
  asChild = false,
  className,
  ...props
}: RutinaIconButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      type={asChild ? undefined : 'button'}
      aria-label={label}
      title={label}
      data-slot="rutina-icon-button"
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center outline-none transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.92] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
        size === 'md' ? 'size-11' : 'size-9',
        variant === 'solid' &&
          'bg-primary text-primary-foreground shadow-xs hover:bg-action-hover',
        variant === 'ghost' &&
          'text-content-secondary hover:bg-surface-secondary hover:text-content-primary',
        variant === 'outline' &&
          'border border-border-strong bg-surface-primary text-content-secondary hover:bg-surface-secondary hover:text-content-primary',
        variant === 'danger' &&
          'text-content-danger hover:bg-destructive/10 hover:text-destructive',
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="flex">
        {children}
      </span>
    </Comp>
  )
}
