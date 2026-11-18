'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Focus management untuk dialog/sheet kustom (non-Radix):
 * - Fokus awal dipindahkan ke panel saat terbuka.
 * - Tab terkurung (focus trap) di dalam panel.
 * - Fokus dikembalikan ke elemen pemicu saat ditutup.
 * Panel perlu `tabIndex={-1}` agar tetap bisa menerima fokus.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open || !ref.current) return
    const panel = ref.current

    /* Simpan pemicu untuk mengembalikan fokus saat ditutup. */
    const trigger = document.activeElement as HTMLElement | null

    const focusables = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null)

    /* Fokus awal: elemen interaktif pertama, atau panel itu sendiri. */
    const initial = focusables()[0]
    ;(initial ?? panel).focus({ preventScroll: true })

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const list = focusables()
      if (list.length === 0) {
        e.preventDefault()
        panel.focus({ preventScroll: true })
        return
      }
      const first = list[0]
      const last = list[list.length - 1]
      const active = document.activeElement
      if (!panel.contains(active)) {
        e.preventDefault()
        first.focus({ preventScroll: true })
      } else if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus({ preventScroll: true })
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus({ preventScroll: true })
      }
    }

    panel.addEventListener('keydown', onKeyDown)
    return () => {
      panel.removeEventListener('keydown', onKeyDown)
      trigger?.focus?.({ preventScroll: true })
    }
  }, [open, ref])
}
