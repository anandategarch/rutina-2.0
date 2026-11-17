'use client'

import { motion } from 'motion/react'
import { Leaf } from 'lucide-react'

import { RutinaApp } from './rutina-app'
import { SCREEN_THEME, useRutina } from './store'

/**
 * Bingkai aplikasi: layar penuh di perangkat mobile; di desktop (sm+)
 * aplikasi berada dalam kolom ponsel terpusat, di atas latar ambien
 * yang warnanya mengikuti tab aktif.
 */
export function AppFrame() {
  const screen = useRutina((s) => s.screen)
  const theme = SCREEN_THEME[screen]

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-[#F5F3EE] sm:p-6">
      {/* Latar ambien desktop — gradien lembut mengikuti tema tab aktif */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        initial={false}
        animate={{
          background: `radial-gradient(1100px 700px at 20% 15%, ${theme.bg}F2, transparent 60%),
                       radial-gradient(900px 600px at 85% 85%, #E4EFE0CC, transparent 55%),
                       linear-gradient(160deg, #FAF9F6 0%, #F5F3EE 100%)`,
        }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Ornamen dekoratif — hanya desktop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[8%] top-[12%] hidden text-[#749B58]/25 lg:block"
      >
        <Leaf className="h-10 w-10 -rotate-12" strokeWidth={1.4} />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[10%] right-[9%] hidden text-[#4A3B32]/15 lg:block"
      >
        <Leaf className="h-14 w-14 rotate-12" strokeWidth={1.2} />
      </div>

      {/* Kolom ponsel */}
      <div className="relative h-dvh w-full overflow-hidden bg-[#F5F3EE] sm:h-[min(860px,calc(100dvh-48px))] sm:w-[400px] sm:rounded-[3rem] sm:border-[10px] sm:border-[#14100D] sm:shadow-[0_60px_120px_-40px_rgba(35,31,30,0.45)]">
        <RutinaApp />
      </div>

      {/* Keterangan kecil di bawah bingkai — hanya desktop */}
      <p className="pointer-events-none absolute bottom-3 hidden text-[10px] font-bold uppercase tracking-[0.28em] text-[#4A3B32]/35 sm:block">
        Rutina 2.0 — Earth Tone Edition
      </p>
    </div>
  )
}
