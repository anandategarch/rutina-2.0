'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
} from 'react'
import * as m from 'motion/react-m'

import { cn } from '@/lib/utils'
import { motionTokens } from '@/lib/motion/tokens'

/**
 * RutinaTabs — navigasi tab DALAM SATU HALAMAN, dibangun di atas Radix Tabs
 * (bukan pola role="group" + aria-pressed): state aktif jelas, dukungan
 * papan tombol otomatis, dan label aksesibel.
 *
 * Varian:
 * - segment : pil kontainer menyerapai iOS segmented control — pil aktif
 *             MELUNCUR antar tombol lewat layoutId Motion (audit v2.20:
 *             sebelumnya latar bertukar instan via CSS).
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

/* Context internal — nilai aktif + id pil unik per instance agar dua
   RutinaTabs di satu layar (mis. subtab + periode di Keuangan) tidak
   saling melempar pil yang sama. */
interface TabsCtxValue {
  value: string
  pillId: string
}
const TabsCtx = createContext<TabsCtxValue | null>(null)

export const RutinaTabs = function RutinaTabs({
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>) {
  const id = useId()
  /* Lacak nilai internal agar varian TIDAK terkontrol tetap bisa
     menganimasikan pil (Radix menyimpan state di DOM saja). */
  const [internal, setInternal] = useState(defaultValue ?? '')
  const current = value ?? internal

  return (
    <TabsCtx.Provider
      value={{ value: current, pillId: `rutina-tab-pill-${id}` }}
    >
      <TabsPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={(v) => {
          setInternal(v)
          onValueChange?.(v)
        }}
        {...props}
      />
    </TabsCtx.Provider>
  )
}

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
  'inline-flex cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap text-note font-bold leading-none outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*="size-"])]:size-4',
  {
    variants: {
      variant: {
        /* Pil aktif dirender sebagai m.span layoutId (meluncur antar
           tombol) — CSS hanya mengatur warna teks. */
        segment:
          'relative h-10 rounded-full px-4 text-content-secondary data-[state=active]:text-content-primary',
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
>(({ className, variant, children, value, ...props }, ref) => {
  const ctx = useContext(TabsCtx)
  const active = ctx ? ctx.value === value : false

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(triggerVariants({ variant }), className)}
      {...props}
    >
      {variant === 'segment' && ctx && active && (
        <m.span
          layoutId={ctx.pillId}
          aria-hidden="true"
          transition={motionTokens.spring.snappy}
          className="absolute inset-0 rounded-full bg-surface-primary shadow-soft"
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {children}
      </span>
    </TabsPrimitive.Trigger>
  )
})
RutinaTabsTrigger.displayName = 'RutinaTabsTrigger'

/** Konten tab — transparan; biarkan layar mengatur tata letaknya. */
export const RutinaTabsContent = TabsPrimitive.Content

export { listVariants, triggerVariants }
