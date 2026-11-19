'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'

import { cn } from '@/lib/utils'
import { fade, sheetSpring } from '@/lib/motion/transitions'
import { CONTENT_W } from './layout-widths'
import { useFocusTrap } from './use-focus-trap'

/**
 * RutinaSheet — kerangka bottom sheet seragam seluruh produk.
 *
 * Dibangun manual (bukan shadcn Sheet) agar tetap berada DI DALAM bingkai
 * ponsel — tidak di-portal ke body. Perilaku standar yang disediakan:
 * - Naik dari bawah (spring), bisa diseret ke bawah untuk menutup.
 * - Backdrop memblokir interaksi konten di belakangnya.
 * - Focus management: fokus awal, trap Tab, kembali ke pemicu (useFocusTrap).
 * - Escape menutup sheet.
 *
 * Konten sheet (formulir, daftar) tinggal diletakkan sebagai children.
 */
export interface RutinaSheetProps {
  open: boolean
  onClose: () => void
  /** Nama sheet untuk screen reader (aria-label). */
  label: string
  children: ReactNode
  /** Kelas tambahan untuk panel (mis. max-height). */
  className?: string
  /** Sembunyikan pegangan seret (untuk sheet pendek statis). */
  hideHandle?: boolean
}

export function RutinaSheet({
  open,
  onClose,
  label,
  children,
  className,
  hideHandle = false,
}: RutinaSheetProps) {
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(open, panelRef)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — memblokir interaksi konten di belakangnya. */}
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={onClose}
            className="absolute inset-0 z-40 bg-espresso/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
          />
          <m.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) onClose()
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetSpring}
            className={cn(
              'absolute inset-x-0 bottom-0 z-50 mx-auto w-full rounded-t-sheet bg-surface-primary px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 shadow-sheet',
              CONTENT_W,
              className,
            )}
          >
            {!hideHandle && (
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
                aria-hidden="true"
              >
                <span className="h-1.5 w-10 rounded-full bg-content-secondary/25" />
              </div>
            )}
            {children}
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
