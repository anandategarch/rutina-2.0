'use client'

import * as m from 'motion/react-m'
import { EXPENSE, INCOME } from './cats'
import type { PeriodPoint } from './utils'

/**
 * Grafik batang arus kas — sepasang batang (masuk & keluar) per titik.
 * Tinggi mengikuti nilai maksimum deret. Titik aktif menyala penuh dan
 * mendapat sorotan kolom lembut yang meluncur mengikuti pilihan
 * (layoutId); titik lain diredupkan namun tetap dapat ditekan.
 * Lebar batang & kepadatan label menyesuaikan jumlah titik sehingga
 * deret panjang (mode "Semua") tetap muat tanpa bertumpuk.
 */

const TRACK_H = 118 // ruang tumbuh batang (px)
const LABEL_H = 24 // baris label di bawah
const BAR_MIN = 5

const EASE = [0.22, 1, 0.36, 1] as const

/** Ukuran batang & jarak antar batang menurut kepadatan deret. */
function barMetrics(count: number): { bar: number; gap: number } {
  if (count > 24) return { bar: 4, gap: 1.5 }
  if (count > 16) return { bar: 5, gap: 2 }
  if (count > 10) return { bar: 7, gap: 2.5 }
  return { bar: 9, gap: 3 }
}

/** Label sumbu-x ditampilkan melangkah agar tidak bertumpuk pada
    deret panjang (informasi lengkap tetap tersedia via aria-label). */
function labelEvery(count: number): number {
  if (count > 24) return 3
  if (count > 12) return 2
  return 1
}

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
  const { bar: BAR_W, gap: BAR_GAP } = barMetrics(points.length)
  const every = labelEvery(points.length)

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
          className="absolute inset-x-0 border-t border-border"
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
              className={`group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-end rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                isOn
                  ? ''
                  : 'transition-colors duration-200 hover:bg-surface-sunken/70'
              }`}
            >
              {/* Sorotan kolom titik aktif — meluncur antar titik */}
              {isOn && (
                <m.span
                  aria-hidden="true"
                  layoutId="fin-active-col"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}

              {/* Sepasang batang */}
              <div
                className="relative z-10 flex items-end justify-center"
                style={{ height: TRACK_H, gap: BAR_GAP }}
              >
                <m.span
                  aria-hidden="true"
                  initial={{ height: BAR_MIN }}
                  animate={{ height: h(p.masuk) }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 24,
                    delay: Math.min(i * 0.045, 0.5),
                  }}
                  style={{ backgroundColor: INCOME, width: BAR_W }}
                  className={`rounded-full transition-opacity duration-300 ${
                    isOn ? 'opacity-100' : 'opacity-60 group-hover:opacity-85'
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
                    delay: Math.min(i * 0.045 + 0.03, 0.53),
                  }}
                  style={{ backgroundColor: EXPENSE, width: BAR_W }}
                  className={`rounded-full transition-opacity duration-300 ${
                    isOn ? 'opacity-100' : 'opacity-60 group-hover:opacity-85'
                  }`}
                />
              </div>

              {/* Label + garis bawah aktif — span berukuran konten (w-max)
                  agar teks 3 huruf tidak terjepit lebar kolom sempit. */}
              <span
                className={`relative z-10 flex h-[24px] w-max items-center justify-center text-eyebrow font-semibold tracking-wide transition-colors duration-300 ${
                  isOn ? 'text-content-secondary' : 'text-content-muted'
                }`}
              >
                {i % every === 0 ? p.label : ''}
                {isOn && (
                  <m.span
                    aria-hidden="true"
                    layoutId="fin-underline"
                    className="absolute bottom-0 h-[3px] w-5 rounded-full bg-gold"
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
        className="absolute inset-x-0 border-t border-border-strong"
        style={{ bottom: LABEL_H - 2, transition: `all .3s ${EASE.join(',')}` }}
      />
    </div>
  )
}
