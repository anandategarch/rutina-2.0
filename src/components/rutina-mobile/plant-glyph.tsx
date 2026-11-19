'use client'

import { useEffect, useLayoutEffect, useRef, type CSSProperties, type RefObject } from 'react'
import { createScope, createTimeline, stagger } from 'animejs'

import type { PlantStage } from './habit-coach'

/**
 * PlantGlyph — ilustrasi botani SVG khas Rutina untuk Taman Pertumbuhan
 * (Benih → Tunas → Pohon Muda → Pohon Dewasa → Berbunga).
 *
 * Gaya: line-art organik (stroke currentColor, fill none) — tanaman
 * mewarisi warna domain layar (matcha di Beranda, Rose Clay di Kebiasaan).
 * Setiap bagian tanaman diberi `data-plant` agar koreografi pertumbuhan
 * anime.js dapat menargetkannya: soil · seed · stem · leaf · canopy · bloom.
 *
 * usePlantGrowth — animasi khas "tanaman bertumbuh" (v2.8 Botanical
 * Garden): saat tahap NAIK (milestone), batang tumbuh dari tanah, daun
 * terbuka bergantian, kanopi mengembang, dan bunga meledak kecil.
 * • Hanya berjalan pada PERUBAHAN tahap — bukan setiap render;
 * • render pertama diabaikan (entrance tetap ranah Motion);
 * • prefers-reduced-motion melewati seluruh koreografi;
 * • pre-hide sinkron (useLayoutEffect) mencegah kilatan-state-final;
 * • scope.revert() membereskan semua instance saat unmount.
 */

export type PlantStageKey = PlantStage['key']

/* Layout effect isomorfik — useLayoutEffect murni memicu peringatan SSR;
  di server cukup efek biasa (tidak pernah dijalankan di sana). */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

/* Gaya goresan bersama untuk seluruh line-art botani. */
const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/* transform-box: fill-box membuat transform-origin relatif terhadap
   kotak pembatas bagian itu sendiri (bukan SVG penuh) — batang tumbuh
   dari pangkalnya, daun terbuka dari pangkal daun. */
const ORIGIN_BOTTOM: CSSProperties = {
  transformBox: 'fill-box',
  transformOrigin: '50% 100%',
}
const ORIGIN_BASE: CSSProperties = {
  transformBox: 'fill-box',
  transformOrigin: '50% 90%',
}
const ORIGIN_CENTER: CSSProperties = {
  transformBox: 'fill-box',
  transformOrigin: '50% 50%',
}

/* ------------------------------------------------------------------ */
/* usePlantGrowth — koreografi pertumbuhan saat tahap berubah.         */
/* ------------------------------------------------------------------ */

/**
 * Menjalankan timeline pertumbuhan sekali setiap `stageKey` berubah
 * (naik tahap = milestone). Bila `externalRef` tidak diberikan, hook
 * membuat ref internal dan MENGEMBALIKANNYA — pasang ke elemen yang
 * membungkus <PlantGlyph/>.
 */
export function usePlantGrowth<T extends HTMLElement>(
  externalRef: RefObject<T | null> | null,
  stageKey: PlantStageKey,
) {
  const internal = useRef<T>(null)
  const ref = externalRef ?? internal
  const prev = useRef<PlantStageKey | undefined>(undefined)

  /* Layout effect: pre-hide terjadi SEBELUM paint sehingga tidak ada
     kilatan satu-frame tanaman dewasa sebelum mengecil dan bertumbuh. */
  useIsomorphicLayoutEffect(() => {
    const root = ref.current
    if (!root) return

    /* Lewati mount pertama — entrance adalah ranah Motion; pertumbuhan
       anime.js hanya untuk MILESTONE (perubahan tahap). */
    if (prev.current === undefined) {
      prev.current = stageKey
      return
    }
    if (prev.current === stageKey) return
    prev.current = stageKey

    /* Hormati prefers-reduced-motion: tahap baru tetap dirender penuh,
       cukup tanpa koreografi pertumbuhan. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }

    const part = (name: string) =>
      Array.from(root.querySelectorAll<SVGElement>(`[data-plant="${name}"]`))
    const seed = part('seed')
    const stems = part('stem')
    const leaves = part('leaf')
    const canopies = part('canopy')
    const blooms = part('bloom')

    /* Pre-hide sinkron — nilai awal identik dengan keyframe "from"
       agar frame pertama rAF tidak menemukan state final. */
    seed.forEach((el) => {
      el.style.opacity = '0'
      el.style.transform = 'scale(0.5)'
    })
    stems.forEach((el) => {
      el.style.transform = 'scaleY(0)'
    })
    leaves.forEach((el) => {
      el.style.transform = 'scale(0)'
    })
    canopies.forEach((el) => {
      el.style.opacity = '0'
      el.style.transform = 'scale(0.55)'
    })
    blooms.forEach((el) => {
      el.style.transform = 'scale(0)'
    })

    /* Scope anime.js: revert otomatis saat unmount / perubahan tahap
       berikutnya (pola splash & workout-session). */
    const scope = createScope({ root: ref }).add(() => {
      const tl = createTimeline({ defaults: { ease: 'outExpo' } })
      /* Tanah tetap tenang — ia tidak berubah antar tahap. */
      if (seed.length > 0)
        tl.add(
          seed,
          { opacity: [0, 1], scale: [0.5, 1], duration: 420, ease: 'outBack(2)' },
          80,
        )
      if (stems.length > 0)
        tl.add(
          stems,
          { scaleY: [0, 1], duration: 640, ease: 'outBack(1.15)' },
          60,
        )
      if (leaves.length > 0)
        tl.add(
          leaves,
          {
            scale: [0, 1],
            rotate: [-16, 0],
            duration: 480,
            ease: 'outBack(2.2)',
            delay: stagger(65),
          },
          360,
        )
      if (canopies.length > 0)
        tl.add(
          canopies,
          { opacity: [0, 1], scale: [0.55, 1], duration: 580, ease: 'outBack(1.35)' },
          430,
        )
      if (blooms.length > 0)
        tl.add(
          blooms,
          { scale: [0, 1], duration: 380, ease: 'outBack(2.6)', delay: stagger(60) },
          640,
        )
    })

    return () => {
      scope.revert()
    }
  }, [stageKey, ref])

  return ref
}

/* ------------------------------------------------------------------ */
/* PlantGlyph — render SVG tahap tanaman.                              */
/* ------------------------------------------------------------------ */

export function PlantGlyph({
  stage,
  className,
  style,
}: {
  stage: PlantStageKey
  className?: string
  style?: CSSProperties
}) {
  const common = {
    viewBox: '0 0 64 64',
    role: 'presentation' as const,
    'aria-hidden': true as const,
    focusable: false as const,
    className,
    style,
  }
  switch (stage) {
    case 'benih':
      return (
        <svg {...common}>
          <g data-plant="soil">
            <path d="M13 57 Q32 48.5 51 57" {...S} />
          </g>
          <g data-plant="seed" style={ORIGIN_CENTER}>
            <ellipse
              cx="32"
              cy="51.5"
              rx="4.6"
              ry="6"
              transform="rotate(-16 32 51.5)"
              {...S}
            />
            <path d="M30.6 48.4 q1.5 2.4 0.3 4.8" {...S} strokeWidth={1.5} />
          </g>
        </svg>
      )
    case 'tunas':
      return (
        <svg {...common}>
          <g data-plant="soil">
            <path d="M13 57 Q32 48.5 51 57" {...S} />
          </g>
          <g data-plant="stem" style={ORIGIN_BOTTOM}>
            <path d="M32 57 C32 51 31.4 46.5 32 41.5" {...S} />
          </g>
          <g data-plant="leaf" style={ORIGIN_BASE}>
            <path
              d="M32 46.5 C25.5 46.5 21.5 42.5 21 37 C27.5 37.5 31.2 41.5 32 46.5 Z"
              {...S}
            />
          </g>
          <g data-plant="leaf" style={ORIGIN_BASE}>
            <path
              d="M32 43.5 C38.5 43.5 42.5 39.5 43 34 C36.5 34.5 32.8 38.5 32 43.5 Z"
              {...S}
            />
          </g>
        </svg>
      )
    case 'pohon-muda':
      return (
        <svg {...common}>
          <g data-plant="soil">
            <path d="M13 57 Q32 48.5 51 57" {...S} />
          </g>
          <g data-plant="stem" style={ORIGIN_BOTTOM}>
            <path
              d="M32 57 C32 50 31 43 31.5 36 C31.8 32 32 29.5 32 27.5"
              {...S}
            />
          </g>
          <g data-plant="leaf" style={ORIGIN_BASE}>
            <path
              d="M31.8 45 C26 45 22.5 41.5 22 36.8 C27.8 37 31 40.5 31.8 45 Z"
              {...S}
            />
          </g>
          <g data-plant="leaf" style={ORIGIN_BASE}>
            <path
              d="M31.9 40.5 C37.7 40.5 41.2 37 41.7 32.3 C35.9 32.5 32.7 36 31.9 40.5 Z"
              {...S}
            />
          </g>
          <g data-plant="leaf" style={ORIGIN_BASE}>
            <path
              d="M32 35 C27 35 24 32 23.5 28 C28.5 28.2 31.4 31.2 32 35 Z"
              {...S}
            />
          </g>
          <g data-plant="leaf" style={ORIGIN_BASE}>
            <path
              d="M32 30.5 C36.8 30.5 39.6 27.6 40 23.6 C35.3 23.8 32.5 26.6 32 30.5 Z"
              {...S}
            />
          </g>
          <g data-plant="leaf" style={ORIGIN_CENTER}>
            <circle cx="32" cy="24.5" r="2.6" {...S} />
          </g>
        </svg>
      )
    case 'pohon-dewasa':
    case 'berbunga':
      return (
        <svg {...common}>
          <g data-plant="soil">
            <path d="M13 57 Q32 48.5 51 57" {...S} />
          </g>
          <g data-plant="stem" style={ORIGIN_BOTTOM}>
            <path
              d="M32 57 C31.6 50 31 44 30.4 38.5"
              {...S}
              strokeWidth={3.2}
            />
            <path
              d="M31 43.5 C27.5 41 25.5 38.5 24.8 35.5"
              {...S}
              strokeWidth={2.2}
            />
            <path
              d="M30.8 40.5 C34.5 38 36.5 35.5 37.2 32.5"
              {...S}
              strokeWidth={2.2}
            />
          </g>
          <g data-plant="canopy" style={ORIGIN_CENTER}>
            <path
              d="M16 31 C16 22 23 16.5 32 17.5 C41 16.5 48 22 48 31 C48 38.5 41 42.5 32 41.5 C23 42.5 16 38.5 16 31 Z"
              {...S}
            />
          </g>
          {stage === 'berbunga' && (
            <>
              <g data-plant="bloom" style={ORIGIN_CENTER}>
                <circle cx="24.5" cy="27" r="2.1" fill="currentColor" stroke="none" />
              </g>
              <g data-plant="bloom" style={ORIGIN_CENTER}>
                <circle cx="33.5" cy="21.5" r="2.4" fill="currentColor" stroke="none" />
              </g>
              <g data-plant="bloom" style={ORIGIN_CENTER}>
                <circle cx="41" cy="28.5" r="2.1" fill="currentColor" stroke="none" />
              </g>
              <g data-plant="bloom" style={ORIGIN_CENTER}>
                <circle cx="28.5" cy="35" r="1.7" fill="currentColor" stroke="none" />
              </g>
              <g data-plant="bloom" style={ORIGIN_CENTER}>
                <circle cx="38" cy="35.5" r="1.7" fill="currentColor" stroke="none" />
              </g>
            </>
          )}
        </svg>
      )
  }
}
