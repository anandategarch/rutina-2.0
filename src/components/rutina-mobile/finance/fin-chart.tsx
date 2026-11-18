'use client'

import * as m from 'motion/react-m'
import { EXPENSE, INCOME } from './cats'
import type { PeriodPoint } from './utils'

/**
 * Grafik batang arus kas — sepasang batang (masuk & keluar) per titik.
 * Tinggi mengikuti nilai maksimum deret; batang aktif menyala penuh,
 * titik lain diredupkan. Garis bawah aktif berpindah mulus (layoutId).
 */

const TRACK_H = 118 // ruang tumbuh batang (px)
const LABEL_H = 24 // baris label di bawah
const BAR_MIN = 5

const EASE = [0.22, 1, 0.36, 1] as const

export function FinChart({
  points,
  active,
  onPick,
}: {
  points: PeriodPoint[]
  active: number
  onPick: (i: number) => void
}) {
  const max = Math.max(1, ...points.map((p) => Math.max(p.masuk, p.keluar)))
  const h = (v: number) =>
    Math.max(BAR_MIN, Math.round((v / max) * (TRACK_H - 14)))

  return (
    <div
      className="relative select-none"
      style={{ height: TRACK_H + LABEL_H }}
      role="group"
      aria-label="Grafik arus kas per periode"
    >
      {/* Garis bantu horizontal (25/50/75/100%) */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <span
          key={f}
          aria-hidden="true"
          className="absolute inset-x-0 border-t border-[#FAF9F6]/10"
          style={{ bottom: LABEL_H + f * (TRACK_H - 14) }}
        />
      ))}

      <div className="absolute inset-0 flex items-end justify-between gap-1">
        {points.map((p, i) => {
          const isOn = i === active
          return (
            <button
              key={`${p.label}-${i}`}
              type="button"
              onClick={() => onPick(i)}
              aria-pressed={isOn}
              aria-label={`${p.label}: masuk ${p.masuk.toLocaleString('id-ID')}, keluar ${p.keluar.toLocaleString('id-ID')}`}
              className="relative flex h-full flex-1 cursor-pointer flex-col items-center justify-end rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9B98C]"
            >
              {/* Sepasang batang */}
              <div
                className="relative flex items-end justify-center gap-[3px]"
                style={{ height: TRACK_H }}
              >
                <m.span
                  aria-hidden="true"
                  initial={{ height: BAR_MIN }}
                  animate={{ height: h(p.masuk) }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 24,
                    delay: i * 0.045,
                  }}
                  style={{ backgroundColor: INCOME }}
                  className={`w-[9px] rounded-full transition-opacity duration-300 ${
                    isOn ? 'opacity-100' : 'opacity-45'
                  }`}
                />
                <m.span
                  aria-hidden="true"
                  initial={{ height: BAR_MIN }}
                  animate={{ height: h(p.keluar) }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 24,
                    delay: i * 0.045 + 0.03,
                  }}
                  style={{ backgroundColor: EXPENSE }}
                  className={`w-[9px] rounded-full transition-opacity duration-300 ${
                    isOn ? 'opacity-100' : 'opacity-45'
                  }`}
                />
              </div>

              {/* Label + garis bawah aktif */}
              <span
                className={`relative flex h-[24px] w-full items-center justify-center text-[10.5px] font-bold tracking-wide transition-colors duration-300 ${
                  isOn ? 'text-[#FAF9F6]' : 'text-[#FAF9F6]/50'
                }`}
              >
                {p.label}
                {isOn && (
                  <m.span
                    aria-hidden="true"
                    layoutId="fin-underline"
                    className="absolute bottom-0 h-[3px] w-5 rounded-full bg-[#D9B98C]"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Garis dasar */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 border-t border-[#FAF9F6]/20"
        style={{ bottom: LABEL_H - 2, transition: `all .3s ${EASE.join(',')}` }}
      />
    </div>
  )
}
