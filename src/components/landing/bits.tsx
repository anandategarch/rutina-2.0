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
}: {
  to: number
  stiffness?: number
  damping?: number
}) {
  const spring = useSpring(0, { stiffness, damping })
  const [text, setText] = useState('0')

  useMotionValueEvent(spring, 'change', (v) =>
    setText(Math.round(v).toLocaleString('id-ID')),
  )

  useEffect(() => {
    spring.set(to)
  }, [spring, to])

  return <span className="tabular-nums">{text}</span>
}

/** Jembatan antar-gaya: lompat ke gaya lain lewat custom event. */
export function goToStyle(index: number) {
  window.dispatchEvent(new CustomEvent<number>('rutina:goto', { detail: index }))
}
