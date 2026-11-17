'use client'

import { useEffect } from 'react'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'

import { useRutina } from './store'

/**
 * Perayaan konfeti saat semua tugas selesai.
 * Partikel deterministik (berbasis indeks, tanpa Math.random) sehingga
 * aman untuk SSR dan konsisten di setiap render.
 */
const PALETTE = ['#749B58', '#4A3B32', '#A3C489', '#E4EFE0', '#C9DEBE']

const PIECES = Array.from({ length: 28 }, (_, i) => ({
  x: 6 + ((i * 61) % 348),
  drift: ((i * 53) % 90) - 45,
  delay: (i % 7) * 0.05,
  dur: 1.5 + ((i * 29) % 10) / 20,
  rot: 300 + ((i * 97) % 420),
  size: 7 + ((i * 31) % 6),
  round: i % 3 === 0,
  color: PALETTE[i % PALETTE.length],
}))

export function CelebrationOverlay({ active }: { active: boolean }) {
  // Perayaan berakhir otomatis setelah partikel konfeti selesai jatuh —
  // dipusatkan di sini agar setiap varian layar mewarisinya.
  const setCelebrating = useRutina((s) => s.setCelebrating)

  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => setCelebrating(false), 2500)
    return () => clearTimeout(t)
  }, [active, setCelebrating])

  if (!active) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[60] overflow-hidden"
    >
      {/* Partikel & kartu terpusat dalam kolom aplikasi agar tetap
          proporsional di layar lebar (mode layar penuh). */}
      <div className="absolute inset-0 mx-auto w-full max-w-[520px]">
        {PIECES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute top-0"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.round ? '9999px' : '3px',
            }}
            initial={{ x: p.x, y: -24, rotate: 0, opacity: 1 }}
            animate={{
              x: p.x + p.drift,
              y: 1000,
              rotate: p.rot,
              opacity: [1, 1, 0],
            }}
            transition={{ duration: p.dur, delay: p.delay, ease: [0.4, 0.05, 0.8, 0.6] }}
          />
        ))}

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.1 }}
            className="flex flex-col items-center gap-3 rounded-[28px] bg-[#F5F3EE]/90 px-7 py-6 shadow-[0_20px_50px_rgba(35,31,30,0.20)] backdrop-blur-[2px]"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#749B58] shadow-[0_16px_40px_rgba(35,31,30,0.25)]">
              <Check className="h-9 w-9 text-white" strokeWidth={3} />
            </span>
            <p className="whitespace-nowrap text-[13px] font-bold uppercase tracking-[0.18em] text-[#4A3B32]">
              Hari yang sempurna
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
