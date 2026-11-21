'use client'

import { useRef, type ReactNode } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'

import { cn } from '@/lib/utils'
import { fade, pressSnappy } from '@/lib/motion/transitions'
import { CONTENT_W } from './layout-widths'
import { useFocusTrap } from './use-focus-trap'
import { useEscapeLayer } from './overlay-escape'

/**
 * RutinaDialog — dialog terpusat standar (kartu di tengah bingkai ponsel).
 *
 * Sama seperti RutinaSheet: tidak di-portal ke body agar tetap di dalam
 * bingkai ponsel. Perilaku standar:
 * - Muncul dengan fade + scale ringan, backdrop memblokir interaksi.
 * - Focus management penuh (useFocusTrap) + Escape untuk menutup.
 */
export interface RutinaDialogProps {
  open: boolean
  onClose: () => void
  /** Nama dialog untuk screen reader (aria-label). */
  label: string
  children: ReactNode
  className?: string
}

export function RutinaDialog({
  open,
  onClose,
  label,
  children,
  className,
}: RutinaDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(open, panelRef)
  /* v2.49 (audit): Escape lewat tumpukan lapisan — dialog bersarang
     (konfirmasi di atas sheet) ditutup berlapis, bukan serentak. */
  useEscapeLayer(open, onClose)

  return (
    <AnimatePresence>
      {open && (
        <>
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
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center p-5">
            <m.div
              key="panel"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={label}
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={pressSnappy}
              className={cn(
                'pointer-events-auto w-full rounded-2xl border border-border-default bg-surface-primary p-5 shadow-ink',
                CONTENT_W,
                'max-w-[calc(100%-1rem)]',
                className,
              )}
            >
              {children}
            </m.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
