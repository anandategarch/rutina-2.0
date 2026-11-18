'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

/**
 * RutinaTabs — navigasi tab DALAM SATU HALAMAN, dibangun di atas Radix Tabs
 * (bukan pola role="group" + aria-pressed): state aktif jelas, dukungan
 * papan tombol otomatis, dan label aksesibel.
 *
 * Varian:
 * - segment : pil kontainer menyerupai iOS segmented control.
 * - underline: garis bawah aktif — untuk subtab berbasis teks.
 *
 * Pemakaian:
 *   <RutinaTabs value={v} onValueChange={setV}>
 *     <RutinaTabsList>
 *       <RutinaTabsTrigger value="a">Latihan</RutinaTabsTrigger>
 *     </RutinaTabsList>
 *     <TabsPrimitive.Content value="a">…</TabsPrimitive.Content>
 *   </RutinaTabs>
 */
export const RutinaTabs = TabsPrimitive.Root

const listVariants = cva('gap-1', {
  variants: {
    variant: {
      segment:
        'inline-flex h-12 items-center rounded-full border border-border-default bg-surface-secondary p-1',
      underline: 'flex w-full items-end justify-start border-b border-border',
    },
  },
  defaultVariants: { variant: 'segment' },
})

const triggerVariants = cva(
  'inline-flex cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap text-[13px] font-bold leading-none outline-none transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*="size-"])]:size-4',
  {
    variants: {
      variant: {
        segment:
          'h-10 rounded-full px-4 text-content-secondary data-[state=active]:bg-surface-primary data-[state=active]:text-content-primary data-[state=active]:shadow-soft',
        underline:
          'relative h-11 px-3.5 pb-2.5 text-content-muted data-[state=active]:text-primary data-[state=active]:after:absolute data-[state=active]:after:inset-x-2 data-[state=active]:after:-bottom-px data-[state=active]:after:h-[2.5px] data-[state=active]:after:rounded-t-full data-[state=active]:after:bg-primary',
      },
    },
    defaultVariants: { variant: 'segment' },
  },
)

export interface RutinaTabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof listVariants> {}

export const RutinaTabsList = forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  RutinaTabsListProps
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(listVariants({ variant }), className)}
    {...props}
  />
))
RutinaTabsList.displayName = 'RutinaTabsList'

export interface RutinaTabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof triggerVariants> {}

export const RutinaTabsTrigger = forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  RutinaTabsTriggerProps
>(({ className, variant, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(triggerVariants({ variant }), className)}
    {...props}
  />
))
RutinaTabsTrigger.displayName = 'RutinaTabsTrigger'

/** Konten tab — transparan; biarkan layar mengatur tata letaknya. */
export const RutinaTabsContent = TabsPrimitive.Content

export { listVariants, triggerVariants }
