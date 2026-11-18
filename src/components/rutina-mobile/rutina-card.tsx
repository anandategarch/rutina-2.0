'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/**
 * RutinaCard — komponen kartu standar dengan varian CVA.
 *
 * Governance: kartu di seluruh produk seharusnya memakai varian ini
 * (atau turunannya), bukan menyusun kombinasi warna/radius sendiri —
 * sehingga karakter visual Home, Jurnal, Keuangan, Statistik, dan
 * Profil selalu berasal dari satu sumber.
 *
 * Varian & densitas dipilih lewat prop, semuanya mengacu token
 * semantic (bg-surface-primary, border-border-default, dst.).
 */
const cardVariants = cva('relative overflow-hidden', {
  variants: {
    variant: {
      /** Kartu kertas di atas kanvas sand. */
      default: 'border border-border-default bg-surface-primary',
      /** Kartu terangkat — bayangan card di atas permukaan utama. */
      elevated: 'border border-border-default bg-surface-primary shadow-card',
      /** Kartu tinta — kanvas gelap espresso. */
      dark: 'bg-surface-inverse text-content-inverse',
      /** Kartu brand — matcha penuh, teks putih. */
      brand: 'bg-action-primary text-action-primary-fg',
    },
    density: {
      compact: 'p-3',
      comfortable: 'p-4',
      spacious: 'p-6',
    },
    radius: {
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
    },
  },
  defaultVariants: {
    variant: 'default',
    density: 'comfortable',
    radius: 'lg',
  },
})

export interface RutinaCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function RutinaCard({
  className,
  variant,
  density,
  radius,
  ...props
}: RutinaCardProps) {
  return (
    <div
      className={cn(cardVariants({ variant, density, radius }), className)}
      {...props}
    />
  )
}

export { cardVariants }
