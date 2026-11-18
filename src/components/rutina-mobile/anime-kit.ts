'use client'

/**
 * anime-kit — antarmuka tipis & terpusat di atas anime.js v4 untuk
 * momen "hidup" khas Rutina yang tidak selesai dengan spring Motion:
 *
 *   useAnimePop      — ledakan elastis (outBack) saat sebuah nilai berubah
 *                      (api streak bertambah, tanaman naik tahap, cincin penuh)
 *   useAnimeDrawIn   — garis SVG "digambar" masuk (stroke draw-in) saat
 *                      elemen terlihat — pola yang dipakai TrendLine
 *
 * Prinsip: hook me-return cleanup revert() agar animasi tidak pernah
 * bocor setelah unmount, dan SELALU melewatkan render pertama (pop
 * hanya untuk PERUBAHAN — entrance tetap tanggung jawab Motion).
 */

import { useEffect, useRef, type RefObject } from 'react'
import { animate } from 'animejs'

/* ------------------------------------------------------------------ */
/* useAnimePop — pop elastis saat `trigger` berubah nilai.             */
/* ------------------------------------------------------------------ */

export interface AnimePopOptions {
  /** Puncak skala (relatif 1). Default 1.35. */
  scale?: number
  /** Putaran kecil di puncak (derajat). Default 0 (tanpa putaran). */
  rotate?: number
  /** Durasi total (ms). Default 700. */
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
  { scale = 1.35, rotate = 0, duration = 700, back = 2.4 }: AnimePopOptions = {},
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

/* ------------------------------------------------------------------ */
/* useAnimeDrawIn — stroke draw-in saat elemen masuk viewport.         */
/* ------------------------------------------------------------------ */

/**
 * Menggambar path SVG dari nol ke penuh (dashoffset → 0) saat elemen
 * terlihat, sekali jalan. `deps` memicu penggambaran ulang bila data
 * berubah (mis. rentang tanggal filter diganti).
 */
export function useAnimeDrawIn(
  pathRef: RefObject<SVGPathElement | null>,
  options: {
    /** Durasi draw (ms). Default 1100. */
    duration?: number
    /** Easing anime.js. Default 'inOutQuad'. */
    ease?: string
    /** Tunda (ms) setelah terlihat. Default 0. */
    delay?: number
  } = {},
) {
  const { duration = 1100, ease = 'inOutQuad', delay = 0 } = options
  const observed = useRef(false)

  useEffect(() => {
    const el = pathRef.current
    if (!el) return

    /* Pastikan path terukur; totalLength 0 berarti belum dirender. */
    const len = el.getTotalLength()
    if (len <= 0) return

    el.style.strokeDasharray = `${len}`
    el.style.strokeDashoffset = `${len}`

    let anim: ReturnType<typeof animate> | null = null
    const run = () => {
      if (observed.current) return
      observed.current = true
      anim = animate(el, {
        strokeDashoffset: 0,
        duration,
        ease,
        delay: delay / 1000,
      })
    }

    /* IntersectionObserver ringan — path yang sudah di viewport atas
       langsung digambar; yang di bawah menunggu terlihat. */
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          run()
          io.disconnect()
        }
      },
      { rootMargin: '-40px' },
    )
    io.observe(el)

    return () => {
      io.disconnect()
      anim?.revert()
    }
  }, [pathRef, duration, ease, delay])
}
