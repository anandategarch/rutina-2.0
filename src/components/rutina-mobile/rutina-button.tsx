'use client'

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

/**
 * RutinaButton — tombol standar seluruh produk, dibangun di atas pola
 * shadcn/ui (Radix Slot + CVA). Varian & ukuran mengacu token semantic.
 *
 * Ukuran target sentuh (WCAG 2.5.5): lg 48px · md 44px · sm 36px
 * (sm hanya untuk kontrol sekunder yang jarang dipakai).
 */
const rutinaButtonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-semibold outline-none transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/70 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Aksi utama — matcha penuh. */
        primary:
          'bg-primary text-primary-foreground shadow-xs hover:bg-action-hover',
        /** Aksi sekunder — permukaan linen lembut. */
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        /** Aksi tersier — garis tegas di atas permukaan utama. */
        outline:
          'border border-border-strong bg-surface-primary text-content-primary hover:bg-surface-secondary',
        /** Tombol hantu — tanpa latar, muncul saat sentuh. */
        ghost:
          'text-content-secondary hover:bg-surface-secondary hover:text-content-primary',
        /** Tindakan berisiko — hapus, keluar. */
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90',
        /** Tautan bergaya teks. */
        link: 'text-primary underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        md: 'h-11 rounded-full px-5 has-[>svg]:px-4',
        lg: 'h-12 rounded-full px-6 text-section has-[>svg]:px-5',
        sm: 'h-9 rounded-full px-3.5 text-note has-[>svg]:px-3',
        /** Tombol ikon murni — area sentuh 44×44. */
        icon: 'size-11 rounded-full',
        iconSm: 'size-9 rounded-full',
      },
      /** Lebar penuh (umum untuk CTA di dasar sheet). */
      block: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface RutinaButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof rutinaButtonVariants> {
  asChild?: boolean
}

export const RutinaButton = forwardRef<HTMLButtonElement, RutinaButtonProps>(
  ({ className, variant, size, block, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        data-slot="rutina-button"
        className={cn(rutinaButtonVariants({ variant, size, block }), className)}
        {...props}
      />
    )
  },
)
RutinaButton.displayName = 'RutinaButton'

export { rutinaButtonVariants }
