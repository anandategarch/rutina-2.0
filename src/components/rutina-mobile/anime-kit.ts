'use client'

/**
 * anime-kit — antarmuka tipis & terpusat di atas anime.js v4 untuk
 * momen "hidup" khas Rutina yang tidak selesai dengan spring Motion:
 *
 *   useAnimePop — ledakan elastis (outBack) saat sebuah nilai berubah
 *                 (api streak bertambah, cincin progres penuh)
 *
 * Koreografi multi-elemen (splash, perayaan sesi, pertumbuhan tanaman)
 * memakai createScope + createTimeline langsung di komponennya masing-
 * masing — lihat splash.tsx, workout-session.tsx, plant-glyph.tsx.
 *
 * Prinsip: hook me-return cleanup revert() agar animasi tidak pernah
 * bocor setelah unmount, dan SELALU melewatkan render pertama (pop
 * hanya untuk PERUBAHAN — entrance tetap tanggung jawab Motion).
 *
 * CATATAN UNIT: anime.js 4.x yang terpasang (4.5.0) memakai MILIDETIK
 * untuk duration/delay/posisi timeline — JANGAN mengonversi ke detik.
 */

import { useEffect, useRef, type RefObject } from 'react'
import { animate } from 'animejs'

import { motionTokens } from '@/lib/motion/tokens'

/* ------------------------------------------------------------------ */
/* useAnimePop — pop elastis saat `trigger` berubah nilai.             */
/* ------------------------------------------------------------------ */

export interface AnimePopOptions {
  /** Puncak skala (relatif 1). Default 1.35. */
  scale?: number
  /** Putaran kecil di puncak (derajat). Default 0 (tanpa putaran). */
  rotate?: number
  /** Durasi total (ms). Default mengikuti preset token valuePopMs (520). */
  duration?: number
  /** Kekuatan overshoot elastis. Default 2.4. */
  back?: number
}

/**
 * Pop elastis sekali jalan setiap kali `trigger` berubah dari nilai
 * sebelumnya (render pertama diabaikan). Aman dipanggil dengan nilai
 * primitif (angka/string) — objek dibandingkan via JSON stringify.
 *
 * Bila `externalRef` tidak diberikan, hook membuat ref internal dan
 * MENGEMBALIKANNYA — pasang ke elemen target:
 *   const ref = useAnimePop<HTMLSpanElement>(null, value)
 */
export function useAnimePop<T extends Element>(
  externalRef: RefObject<T | null> | null,
  trigger: unknown,
  { scale = 1.35, rotate = 0, duration = motionTokens.preset.valuePopMs.duration, back = 2.4 }: AnimePopOptions = {},
) {
  const internal = useRef<T>(null)
  const ref = externalRef ?? internal
  const prev = useRef<{ v: string | undefined }>({ v: undefined })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const key = JSON.stringify(trigger) ?? String(trigger)
    /* Lewati mount pertama — entrance adalah ranah Motion. */
    if (prev.current.v === undefined) {
      prev.current.v = key
      return
    }
    if (prev.current.v === key) return
    prev.current.v = key

    /* Hormati prefers-reduced-motion: pop adalah umpan balik dekoratif —
       nilai baru tetap dirender, cukup tanpa ledakan skala. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const anim = animate(el, {
      scale: [1, scale, 1],
      ...(rotate !== 0 ? { rotate: [0, rotate, -rotate * 0.4, 0] } : {}),
      duration,
      ease: `outBack(${back})`,
    })
    return () => {
      anim.revert()
    }
  }, [trigger, ref, scale, rotate, duration, back])

  return ref
}
