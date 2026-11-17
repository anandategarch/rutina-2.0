'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView, useMotionValueEvent, useSpring } from 'motion/react'

/**
 * Angka yang menghitung naik memakai spring Motion.
 * Catatan motion v14: MotionValue tidak boleh jadi child React,
 * jadi kita pantau perubahan lalu simpan ke state string.
 *
 * Upgrade pola NumberTicker magicui (23.3k ★): animasi baru dimulai
 * saat elemen benar-benar masuk viewport (sekali jalan), sehingga angka
 * di bawah lipatan layar tetap "hidup" saat digulir — bukan sudah
 * selesai diam-diam.
 */
export function Counter({
  to,
  stiffness = 55,
  damping = 16,
  decimals = 0,
  /** Tunda (detik) setelah terlihat — untuk efek berantai. */
  delay = 0,
}: {
  to: number
  stiffness?: number
  damping?: number
  decimals?: number
  delay?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20px' })
  const spring = useSpring(0, { stiffness, damping })
  const [text, setText] = useState(
    (0).toLocaleString('id-ID', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  )

  useMotionValueEvent(spring, 'change', (v) =>
    setText(
      v.toLocaleString('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    ),
  )

  useEffect(() => {
    if (!inView) return
    const t = setTimeout(() => spring.set(to), delay * 1000)
    return () => clearTimeout(t)
  }, [spring, to, inView, delay])

  return (
    <span ref={ref} className="tabular-nums">
      {text}
    </span>
  )
}
