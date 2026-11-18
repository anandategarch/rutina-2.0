'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'

import { cn } from '@/lib/utils'
import { CONTENT_W } from './layout-widths'
import { useFocusTrap } from './use-focus-trap'

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
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={onClose}
            className="absolute inset-0 z-40 bg-espresso/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
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
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
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
