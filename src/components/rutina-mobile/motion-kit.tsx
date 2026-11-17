'use client'

/**
 * motion-kit — adaptasi pola ikonik dari pustaka UI/animasi paling populer
 * di GitHub, disesuaikan dengan bahasa desain earth-tone Rutina 2.0:
 *
 * • BlurFade     — magicuidesign/magicui (23.3k ★)
 * • ShineBorder  — magicuidesign/magicui (23.3k ★)
 * • Marquee      — magicuidesign/magicui (23.3k ★)
 * • SplitText    — ibelick/motion-primitives "TextEffect" (7k ★)
 *
 * Referensi sumber asli dicantumkan di tiap komponen.
 */

import { useRef, type CSSProperties, type ReactNode } from 'react'
import {
  motion,
  useInView,
  type Variants,
} from 'motion/react'

import { cn } from '@/lib/utils'

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
  inViewMargin?: string
  /** Kekuatan blur awal. */
  blur?: string
}

export function BlurFade({
  children,
  className,
  duration = 0.5,
  delay = 0,
  offset = 10,
  direction = 'up',
  inView = true,
  inViewMargin = '-40px',
  blur = '6px',
}: BlurFadeProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin })
  const show = !inView || inViewResult

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
    <motion.div
      ref={ref}
      initial={hidden}
      animate={show ? visible : hidden}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* ShineBorder — sapuan kilau radial-gradient pada tepi elemen induk.  */
/* Sumber: magicui (apps/www/registry/magicui/shine-border.tsx)        */
/* ------------------------------------------------------------------ */

interface ShineBorderProps {
  /** Lebar tepi (px). */
  borderWidth?: number
  /** Durasi satu putaran sapuan (detik). */
  duration?: number
  /** Warna kilau — satu atau daftar warna. */
  shineColor?: string | string[]
  className?: string
  style?: CSSProperties
}

export function ShineBorder({
  borderWidth = 1,
  duration = 8,
  shineColor = '#D9B98C',
  className,
  style,
}: ShineBorderProps) {
  return (
    <div
      aria-hidden="true"
      style={
        {
          backgroundImage: `radial-gradient(transparent, transparent, ${
            Array.isArray(shineColor) ? shineColor.join(',') : shineColor
          }, transparent, transparent)`,
          backgroundSize: '300% 300%',
          mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          padding: `${borderWidth}px`,
          ['--shine-duration' as string]: `${duration}s`,
          ...style,
        } as CSSProperties
      }
      className={cn(
        'pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position] motion-safe:animate-shine',
        className,
      )}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Marquee — strip konten bergulir tanpa henti.                        */
/* Sumber: magicui (apps/www/registry/magicui/marquee.tsx)             */
/* ------------------------------------------------------------------ */

interface MarqueeProps {
  children: ReactNode
  className?: string
  /** Kecepatan putaran (detik). */
  duration?: number
  /** Jarak antar item (px). */
  gap?: string
  /** Berhenti saat kursor menempel. */
  pauseOnHover?: boolean
  /** Arah terbalik (kanan ke kiri). */
  reverse?: boolean
}

export function Marquee({
  children,
  className,
  duration = 30,
  gap = '1rem',
  pauseOnHover = true,
  reverse = false,
}: MarqueeProps) {
  return (
    <div
      className={cn('group flex w-full overflow-hidden', className)}
      style={
        {
          ['--marquee-duration' as string]: `${duration}s`,
          ['--marquee-gap' as string]: gap,
          gap,
        } as CSSProperties
      }
    >
      {[0, 1].map((copy) => (
        <div
          key={copy}
          aria-hidden={copy === 1}
          className={cn(
            'flex shrink-0 flex-row items-center justify-around motion-safe:animate-marquee',
            reverse && '[animation-direction:reverse]',
            pauseOnHover &&
              'group-hover:[animation-play-state:paused] motion-reduce:[animation-play-state:paused]',
          )}
          style={{ gap }}
        >
          {children}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* SplitText — teks terbelah per huruf, muncul beruntun dengan spring. */
/* Sumber: ibelick/motion-primitives "TextEffect" (per-letter spring). */
/* ------------------------------------------------------------------ */

const letterParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } },
}

const letter: Variants = {
  hidden: { y: '0.7em', opacity: 0, filter: 'blur(4px)' },
  show: {
    y: '0em',
    opacity: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 380, damping: 30 },
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
    <motion.span
      ref={ref}
      variants={letterParent}
      initial="hidden"
      animate={show ? 'show' : 'hidden'}
      className={cn('inline-block', className)}
      aria-label={text}
    >
      {text.split('').map((c, i) => (
        <motion.span
          key={i}
          variants={letter}
          className={cn('inline-block will-change-transform', letterClassName)}
        >
          {c === ' ' ? '\u00A0' : c}
        </motion.span>
      ))}
    </motion.span>
  )
}

/* ------------------------------------------------------------------ */
/* Spotlight — sorotan radial mengikuti kursor/sentuhan di dalam       */
/* kartu. Sumber: cult-ui "SpotlightCard" (7.5k ★) & magicui Spotlight */
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

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--spot-x', `${e.clientX - r.left}px`)
    el.style.setProperty('--spot-y', `${e.clientY - r.top}px`)
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
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
