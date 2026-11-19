'use client'

import * as m from 'motion/react-m'

import { Counter } from './counter'
import { useAnimePop } from './anime-kit'
import { motionTokens } from '@/lib/motion/tokens'

/* Geometri cincin: viewBox 110, radius 47, tebal goresan 9. */
const RING_R = 47
const RING_CIRC = 2 * Math.PI * RING_R

/**
 * HomeProgressRing — cincin progres pusat kartu hero Beranda.
 *
 * Busur matcha mengejar persentase misi hari ini lewat spring pada
 * stroke-dashoffset: setiap centang kebiasaan (nilai diturunkan langsung
 * dari state completions di pemanggil) membuat busur "tumbuh" secara
 * reaktif — tanpa state lokal yang bisa basi.
 *
 * v2.6 "Gerak & Permukaan":
 * • cincin dekoratif bergaris putus berputar sangat lambat di balik
 *   busur utama (animate-spin-slow) — hero terasa hidup tanpa ramai;
 * • mencapai 100% memicu ledakan elastis anime.js pada seluruh cincin.
 */
export function HomeProgressRing({ pct }: { pct: number }) {
  const clamped = Math.min(Math.max(pct, 0), 100)
  const complete = clamped >= 100

  /* Pop perayaan saat cincin BARU saja penuh (bukan saat tetap 100). */
  const ringRef = useAnimePop<SVGSVGElement>(null, complete, {
    scale: 1.12,
    duration: motionTokens.preset.chartRevealMs.duration,
    back: 2.2,
  })

  return (
    <div
      className="relative h-[110px] w-[110px] shrink-0"
      role="img"
      aria-label={`Progres misi hari ini ${clamped} persen`}
    >
      {/* Cincin dekoratif — garis putus tipis berputar sunyi di balik busur */}
      <svg
        aria-hidden="true"
        viewBox="0 0 110 110"
        className="absolute inset-0 h-full w-full motion-safe:animate-spin-slow"
      >
        <circle
          cx="55"
          cy="55"
          r={RING_R + 5}
          fill="none"
          stroke="var(--primary)"
          strokeOpacity="0.22"
          strokeWidth="1.5"
          strokeDasharray="2 7"
          strokeLinecap="round"
        />
      </svg>
      <svg
        ref={ringRef}
        viewBox="0 0 110 110"
        aria-hidden="true"
        className="h-full w-full -rotate-90"
      >
        {/* Lintasan track — warna garis karten yang tenang */}
        <circle
          cx="55"
          cy="55"
          r={RING_R}
          fill="none"
          stroke="var(--border)"
          strokeWidth="9"
        />
        {/* Busur progres matcha — dashoffset dianimasi spring */}
        <m.circle
          cx="55"
          cy="55"
          r={RING_R}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={RING_CIRC}
          initial={{ strokeDashoffset: RING_CIRC }}
          animate={{ strokeDashoffset: RING_CIRC * (1 - clamped / 100) }}
          transition={motionTokens.spring.smooth}
        />
      </svg>
      {/* Angka persen besar di pusat cincin */}
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="flex items-baseline text-content-primary">
          <span className="text-kpi font-bold leading-none tracking-tight">
            <Counter to={clamped} />
          </span>
          <span className="ml-0.5 text-note font-bold text-content-muted">
            %
          </span>
        </p>
      </div>
    </div>
  )
}
