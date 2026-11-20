'use client'

import { useEffect } from 'react'
import * as m from 'motion/react-m'
import { Check } from 'lucide-react'

import { useRutina } from './store'
import { CONTENT_W } from './layout-widths'
import { celebrate } from '@/lib/motion/transitions'
import { motionTokens } from '@/lib/motion/tokens'

/**
 * Perayaan konfeti saat semua tugas selesai.
 * Partikel deterministik (berbasis indeks, tanpa Math.random) sehingga
 * aman untuk SSR dan konsisten di setiap render.
 */
/* Warna partikel — rujukan token (grafik & semantic), bukan hex lepas. */
const PALETTE = [
  'var(--chart-1)', // matcha
  'var(--content-secondary)', // cocoa
  'var(--chart-4)', // pistachio
  'var(--secondary)', // mist
  'color-mix(in oklab, var(--chart-4) 45%, var(--secondary))', // sage muda
]

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
      <div className={`absolute inset-0 mx-auto w-full ${CONTENT_W}`}>
        {PIECES.map((p, i) => (
          <m.span
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
            transition={{ duration: p.dur, delay: p.delay, ease: motionTokens.easing.confettiFall }}
          />
        ))}

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <m.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ ...celebrate, delay: motionTokens.delay.normal }}
            className="flex flex-col items-center gap-3 rounded-sheet bg-surface-sunken/90 px-7 py-6 shadow-ink-deep backdrop-blur-[2px]"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-ink">
              <Check className="h-9 w-9 text-primary-foreground" strokeWidth={3} />
            </span>
            <p className="whitespace-nowrap text-note font-bold uppercase tracking-[0.14em] text-content-secondary">
              Hari yang sempurna
            </p>
          </m.div>
        </div>
      </div>
    </div>
  )
}
