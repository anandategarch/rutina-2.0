'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useInView, useSpring, useTransform } from 'motion/react'
import * as m from 'motion/react-m'

import { motionTokens } from '@/lib/motion/tokens'

/**
 * Angka yang menghitung naik memakai spring Motion.
 *
 * PENTING (motion engine): nilai tampil dialirkan lewat MotionValue
 * (useTransform → child <m.span>) sehingga animasi berjalan di
 * luar React render pipeline — TIDAK ada setState per frame.
 *
 * Upgrade pola NumberTicker magicui (23.3k ★): animasi baru dimulai
 * saat elemen benar-benar masuk viewport (sekali jalan), sehingga angka
 * di bawah lipatan layar tetap "hidup" saat digulir.
 */
export function Counter({
  to,
  stiffness,
  damping,
  decimals = 0,
  /** Tunda (detik) setelah terlihat — untuk efek berantai. */
  delay = 0,
  /** Lompat langsung ke nilai akhir tanpa menghitung naik — dipakai
   *  bersama gerbang firstVisit agar kunjungan ulang layar tidak
   *  menghitung ulang dari nol (audit motion: anti-replay). */
  immediate = false,
}: {
  to: number
  stiffness?: number
  damping?: number
  decimals?: number
  delay?: number
  immediate?: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20px' })

  /* Spring token "ticker" sebagai default; bisa disetel per kasus. */
  const spring = useSpring(0, {
    stiffness: stiffness ?? motionTokens.spring.ticker.stiffness,
    damping: damping ?? motionTokens.spring.ticker.damping,
  })

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    [decimals],
  )

  /* MotionValue string — diperbarui per frame TANPA render React. */
  const formatted = useTransform(spring, (v) => formatter.format(v))

  useEffect(() => {
    if (!inView) return
    if (immediate) {
      spring.jump(to)
      return
    }
    const t = setTimeout(() => spring.set(to), delay * 1000)
    return () => clearTimeout(t)
  }, [spring, to, inView, delay, immediate])

  return (
    <m.span ref={ref} className="tabular-nums">
      {formatted}
    </m.span>
  )
}
