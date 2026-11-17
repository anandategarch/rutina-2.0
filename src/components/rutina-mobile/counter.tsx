'use client'

import { useEffect, useState } from 'react'
import { useMotionValueEvent, useSpring } from 'motion/react'

/**
 * Angka yang menghitung naik memakai spring Motion.
 * Catatan motion v14: MotionValue tidak boleh jadi child React,
 * jadi kita pantau perubahan lalu simpan ke state string.
 */
export function Counter({
  to,
  stiffness = 55,
  damping = 16,
  decimals = 0,
}: {
  to: number
  stiffness?: number
  damping?: number
  decimals?: number
}) {
  const spring = useSpring(0, { stiffness, damping })
  const [text, setText] = useState('0')

  useMotionValueEvent(spring, 'change', (v) =>
    setText(
      v.toLocaleString('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    ),
  )

  useEffect(() => {
    spring.set(to)
  }, [spring, to])

  return <span className="tabular-nums">{text}</span>
}
