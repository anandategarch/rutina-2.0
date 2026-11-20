'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'
import { MODULE_SOFT_BG, type RutinaModule } from './rutina-module'

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
 *
 * Aturan Bento: kartu biasa = parchment + hairline; variasi hierarki
 * lewat UKURAN tile (RutinaBentoItem), bukan warna. Varian `module`
 * memakai latar bertint domain (token module-*-soft) — maksimal satu
 * dua tile per layar agar tidak ramai.
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
      /** Hero espresso + emas (identitas global, tak terbalik dark). */
      hero: 'bg-[linear-gradient(135deg,var(--hero-surface)_0%,var(--hero-surface-raised)_46%,var(--hero-surface)_100%)] text-hero-content shadow-ink-deep',
      /** Tile bertint domain modul — pasangkan prop `module`. */
      module: '',
      /** Kartu rata tanpa bingkai — di atas permukaan sunken. */
      flat: 'bg-surface-sunken',
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
    /* v2.37: default lg → 2xl — audit menemukan SEMUA kartu seksi layar
       (home/kebiasaan/stats/day-detail) menulis radius="2xl" eksplisit;
       default kini mencerminkan realitas. Context-rail (kartu inspektur
       padat) tetap lg secara eksplisit. */
    radius: '2xl',
  },
})

export interface RutinaCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Domain warna untuk varian `module` (latar bertint domain). */
  module?: RutinaModule
}

export function RutinaCard({
  className,
  variant,
  density,
  radius,
  module,
  ...props
}: RutinaCardProps) {
  return (
    <div
      data-module={module}
      className={cn(
        cardVariants({ variant, density, radius }),
        variant === 'module' && module && MODULE_SOFT_BG[module],
        className,
      )}
      {...props}
    />
  )
}

export { cardVariants }
