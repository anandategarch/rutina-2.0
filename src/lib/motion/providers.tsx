'use client'

import { LazyMotion, MotionConfig, domMax } from 'motion/react'
import type { ReactNode } from 'react'

/**
 * Penyedia gerak aplikasi — LazyMotion (fitur domMax: drag, gesture,
 * layout animation) + MotionConfig reducedMotion="user" agar seluruh
 * animasi Motion menghormati preferensi gerak minimal pengguna.
 *
 * Seluruh komponen beranimasi di bawah provider ini memakai `m.*`
 * (motion/react-m) sehingga beban fitur animasi dimuat satu kali.
 * strict={true} menjamin disiplin itu: komponen yang tidak sengaja
 * memakai `motion.*` penuh akan langsung gagal saat development.
 */
export function AppMotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict={true}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}
