'use client'

/**
 * motion-kit — adaptasi pola ikonik dari pustaka UI/animasi paling populer
 * di GitHub, disesuaikan dengan bahasa desain earth-tone Rutina 2.0:
 *
 * • BlurFade     — magicuidesign/magicui (23.3k ★)
 * • SplitText    — ibelick/motion-primitives "TextEffect" (7k ★)
 * • Spotlight    — cult-ui "SpotlightCard" / magicui Spotlight
 *
 * (v2.37: ShineBorder dihapus — komponen tak pernah terpakai dan
 *  membawa animasi infinite `animate-shine` yang melanggar direktif
 *  gerak: "tidak ada animasi dekoratif berulang".)
 *
 * (v2.49 audit: AnimatedList/AnimatedListItem/Magnetic/Tilt dihapus —
 *  nol konsumen sejak v2.38; pola yang sama (stagger/press) hidup di
 *  varian bersama & transisi token, bukan komponen yatim.)
 *
 * Referensi sumber asli dicantumkan di tiap komponen.
 */

import { useRef, type ReactNode } from 'react'
import {
  useInView,
  useReducedMotion,
  type Variants,
} from 'motion/react'
import * as m from 'motion/react-m'

import { cn } from '@/lib/utils'
import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'

/* Tipe margin useInView (template literal) — tidak diekspor publik,
   jadi diturunkan dari signature fungsi. */
type InViewMargin = NonNullable<Parameters<typeof useInView>[1]>['margin']

/* ------------------------------------------------------------------ */
/* BlurFade — reveal blur-ke-fokus saat elemen masuk viewport.         */
/* Sumber: magicui (apps/www/registry/magicui/blur-fade.tsx)           */
/* ------------------------------------------------------------------ */

interface BlurFadeProps {
  children: ReactNode
  className?: string
  /** Durasi animasi (detik). */
  duration?: number
  /** Tunda setelah terlihat (detik) — untuk efek berantai. */
  delay?: number
  /** Jarak geser awal (px). */
  offset?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  /** Aktifkan pemicu scroll (sekali jalan). */
  inView?: boolean
  /** Margin root useInView. */
  inViewMargin?: InViewMargin
  /** Kekuatan blur awal. */
  blur?: string
  /** Kunci anti-replay (v2.37, konvensi '<layar>-<blok>'). Bila
   *  diberikan, blur-fade hanya bermain pada kunjungan PERTAMA blok
   *  tersebut seumur sesi tab; remount berikutnya (kembali dari tab
   *  lain) merender keadaan akhir secara instan. Pengguna
   *  reduced-motion selalu mendapat versi instan. */
  visitKey?: string
}

export function BlurFade({
  children,
  className,
  duration = motionTokens.preset.data.duration,
  delay = 0,
  offset = 10,
  direction = 'up',
  inView = true,
  inViewMargin = '-40px',
  blur = '6px',
  visitKey,
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin })
  const reducedMotion = useReducedMotion()
  const firstVisit = useFirstVisit(visitKey)
  const show = !inView || inViewResult

  /* Anti-replay + reduced-motion: lompat langsung ke keadaan akhir
     (initial={false} → tanpa transisi apa pun). */
  const skip = !firstVisit || !!reducedMotion

  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y'
  const hiddenOffset =
    direction === 'right' || direction === 'down' ? -offset : offset

  const hidden = {
    [axis]: hiddenOffset,
    opacity: 0,
    filter: `blur(${blur})`,
  } as const
  const visible = { [axis]: 0, opacity: 1, filter: 'blur(0px)' } as const

  return (
    <m.div
      ref={ref}
      initial={skip ? false : hidden}
      animate={skip || show ? visible : hidden}
      transition={{ duration, delay, ease: motionTokens.easing.standard }}
      className={className}
    >
      {children}
    </m.div>
  )
}

/* ------------------------------------------------------------------ */
/* SplitText — teks terbelah per huruf, muncul beruntun dengan spring. */
/* Sumber: ibelick/motion-primitives "TextEffect" (per-letter spring). */
/* ------------------------------------------------------------------ */

const letterParent: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: motionTokens.stagger.tight,
      delayChildren: motionTokens.delay.tight,
    },
  },
}

const letter: Variants = {
  hidden: { y: '0.7em', opacity: 0, filter: 'blur(4px)' },
  show: {
    y: '0em',
    opacity: 1,
    filter: 'blur(0px)',
    transition: motionTokens.spring.letter,
  },
}

interface SplitTextProps {
  /** Teks yang akan dipecah per karakter. */
  text: string
  className?: string
  /** Kelas untuk tiap huruf. */
  letterClassName?: string
  /** Mulai animasi saat masuk viewport (sekali jalan). */
  inView?: boolean
}

export function SplitText({
  text,
  className,
  letterClassName,
  inView = false,
}: SplitTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inViewResult = useInView(ref, { once: true, margin: '-40px' })
  const show = !inView || inViewResult

  return (
    <m.span
      ref={ref}
      variants={letterParent}
      initial="hidden"
      animate={show ? 'show' : 'hidden'}
      className={cn('inline-block', className)}
      aria-label={text}
    >
      {text.split('').map((c, i) => (
        <m.span
          key={i}
          variants={letter}
          className={cn('inline-block will-change-transform', letterClassName)}
        >
          {c === ' ' ? '\u00A0' : c}
        </m.span>
      ))}
    </m.span>
  )
}

/* ------------------------------------------------------------------ */
/* Spotlight — sorotan radial mengikuti kursor/sentuhan di dalam       */
/* kartu. Sumber: cult-ui "SpotlightCard" (7.5k ★) & magicui Spotlight */
/*                                                                     */
/* Perf: bounds diukur SEKALI saat pointerenter (cache di ref), lalu   */
/* pointermove hanya menulis CSS variables — tanpa getBoundingClientRect */
/* per gerakan. Efek visual tetap terbatas pada perangkat hover        */
/* (group-hover), sehingga perangkat sentuh tidak memicu apa pun.      */
/* ------------------------------------------------------------------ */

interface SpotlightProps {
  children: ReactNode
  className?: string
  /** Warna sorotan (rgba). */
  color?: string
  /** Radius sorotan (px). */
  size?: number
}

export function Spotlight({
  children,
  className,
  color = 'rgba(217, 185, 140, 0.22)',
  size = 220,
}: SpotlightProps) {
  const ref = useRef<HTMLDivElement>(null)
  const boundsRef = useRef<{ left: number; top: number } | null>(null)

  const onEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    boundsRef.current = { left: r.left, top: r.top }
    el.style.setProperty('--spot-x', `${e.clientX - r.left}px`)
    el.style.setProperty('--spot-y', `${e.clientY - r.top}px`)
  }

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    const b = boundsRef.current
    if (!el || !b) return
    el.style.setProperty('--spot-x', `${e.clientX - b.left}px`)
    el.style.setProperty('--spot-y', `${e.clientY - b.top}px`)
  }

  const onLeave = () => {
    boundsRef.current = null
  }

  return (
    <div
      ref={ref}
      onPointerEnter={onEnter}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn('group/spot relative overflow-hidden rounded-[inherit]', className)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[5] rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          background: `radial-gradient(${size}px circle at var(--spot-x, 50%) var(--spot-y, 50%), ${color}, transparent 70%)`,
        }}
      />
      {children}
    </div>
  )
}
