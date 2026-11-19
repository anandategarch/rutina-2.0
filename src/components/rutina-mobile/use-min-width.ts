'use client'

import { useEffect, useState, type RefObject } from 'react'

/**
 * useMinWidth — padanan JavaScript untuk container query CSS.
 *
 * Mengembalikan true bila lebar ELEMEN (bukan viewport) ≥ minWidth.
 * Desktop Rutina menyandingkan sidebar 240px + ContextRail 288px dengan
 * kolom kerja, maka keputusan tata letak harus diambil dari ruang kerja
 * nyata — padankan ambang container Tailwind (mis. @[52rem] = 832px).
 *
 * ResizeObserver menembak segera setelah observasi dimulai, sehingga
 * state tersinkron sebelum interaksi pengguna pertama. Render awal
 * selalu false (jalur ponsel) agar tidak ada hydration mismatch.
 */
export function useMinWidth<T extends HTMLElement>(
  ref: RefObject<T | null>,
  minWidth: number,
): boolean {
  const [wide, setWide] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWide(el.clientWidth >= minWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, minWidth])

  return wide
}
