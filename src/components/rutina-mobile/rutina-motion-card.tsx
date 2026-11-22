'use client'

import { useRef } from 'react'
import { useInView, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'

import { cn } from '@/lib/utils'
import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'
import {
  cardVariants,
  type RutinaCardProps,
} from './rutina-card'
import { MODULE_SOFT_BG } from './rutina-module'

/**
 * MotionCard — RutinaCard beranimasi masuk + hover (motion.dev, fondasi
 * animasi v2.87).
 *
 * Kontrak visual IDENTIK dengan RutinaCard (varian CVA yang sama diimpor
 * dari satu sumber) — perbedaannya hanyalah gerak:
 *
 *   • Masuk: fade + naik 16px saat kartu memasuki viewport (useInView
 *     sekali jalan) — kartu di bawah lipatan terungkap saat digulir,
 *     bukan sekaligus di mount. `delay` mengatur berantai antar kartu.
 *   • Hover: angkat halus −3px (preset interaction) — umpan balik
 *     kursor desktop; perangkat sentuh tidak memicu hover, tekan tetap
 *     dilayani kelas CSS `interactive`/active:scale yang sudah ada.
 *
 * Governance gerak (konsisten BlurFade):
 *   - useFirstVisit(visitKey): bermain HANYA pada kunjungan pertama
 *     blok itu seumur sesi — pindah-pindah tab tidak memutar ulang
 *     seluruh layout (audit motion v2.27).
 *   - MotionConfig reducedMotion="user" (AppMotionProvider) mematikan
 *     transform otomatis bagi pengguna reduce-motion; pemeriksaan
 *     eksplisit di bawah membuat kartu langsung statis.
 *   - LazyMotion strict: komponen memakai m.* (motion/react-m).
 */
/* Properti HTML yang DIOVERRIDE motion (onDrag → pan-info, dsb.) —
   dihilangkan dari rest-props agar tidak bentrok dengan tipe m.*. */
type MotionCardBaseProps = Omit<
  RutinaCardProps,
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onDragEnter'
  | 'onDragExit'
  | 'onDragLeave'
  | 'onDragOver'
  | 'onDrop'
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration'
  | 'onTransitionEnd'
>

export interface MotionCardProps extends MotionCardBaseProps {
  /** Gerbang anti-replay — konvensi '<layar>-<blok>'. */
  visitKey?: string
  /** Jeda masuk (detik) — berantai kartu bersebelahan. */
  delay?: number
  /** Angkat halus saat hover (default aktif; matikan untuk kartu statis). */
  hover?: boolean
  /** Elemen yang dirender — 'section' mempertahankan landmark a11y. */
  as?: 'div' | 'section'
}

export function MotionCard({
  visitKey,
  delay = 0,
  hover = true,
  as = 'div',
  className,
  variant,
  density,
  radius,
  module,
  children,
  ...props
}: MotionCardProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const inView = useInView(ref, { once: true, margin: '-32px' })
  const reducedMotion = useReducedMotion()
  const firstVisit = useFirstVisit(visitKey)
  const play = firstVisit && !reducedMotion

  const hidden = { opacity: 0, y: 16 }
  const shown = { opacity: 1, y: 0 }
  const Tag = as === 'section' ? m.section : m.div

  return (
    <Tag
      ref={ref}
      data-module={module}
      initial={play ? hidden : false}
      animate={play ? (inView ? shown : hidden) : undefined}
      whileHover={
        hover ? { y: -3, transition: motionTokens.preset.interaction } : undefined
      }
      transition={{ ...motionTokens.preset.cardReveal, delay }}
      className={cn(
        cardVariants({ variant, density, radius }),
        variant === 'module' && module && MODULE_SOFT_BG[module],
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}
