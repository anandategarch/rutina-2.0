'use client'

import * as m from 'motion/react-m'

import { useFirstVisit } from '@/lib/motion/first-visit'
import { motionTokens } from '@/lib/motion/tokens'

/**
 * Piring Makro — Warm Editorial Productivity, edisi visualisasi
 * ilustratif (v2.47). Mengganti segmented bar komposisi makro: piring
 * SVG dengan tiga juring yang luasnya mengikuti KONTRIBUSI ENERGI
 * (protein & karbo 4 kkal/g, lemak 9 kkal/g) — bukan perbandingan
 * gram. Bar bullet per makro (gram absolut vs sasaran) tetap dipakai
 * adapter; piring membaca PROPORSI.
 *
 * Warna juring: protein = keluarga emas (var(--palette-gold)), karbohidrat =
 * keluarga matcha (var(--palette-pistachio)), lemak = keluarga lempung
 * (var(--palette-clay)) — semua token, tanpa hex mentah. Pemisah juring =
 * celah 2px permukaan (stroke); rim piring = lingkaran garis halus.
 * Tengah piring BUKAN lubang — overlay teks total kkal makro di atas
 * scrim tipis agar terbaca di semua warna juring.
 */

/** Kalori per gram makro — fakta gizi standar (4/4/9). */
const KCAL_PER_G = { protein: 4, carb: 4, fat: 9 } as const

const fmt = (n: number): string => Math.round(n).toLocaleString('id-ID')

/* ===== Geometri piring (viewBox 0 0 120 120) ===== */

const CX = 60
const CY = 60
const R = 52

/** Titik pada lingkaran — sudut dalam derajat, 0 = pukul dua belas. */
function polar(r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)]
}

/** Juring penuh dari pusat — dipakai bila sudut < 360°. */
function wedge(r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(r, a0)
  const [x1, y1] = polar(r, a1)
  const large = a1 - a0 > 180 ? 1 : 0
  return `M${CX},${CY} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`
}

interface MacroSeg {
  key: 'protein' | 'carb' | 'fat'
  label: string
  dot: string
  fill: string
  grams: number
  kcal: number
  target: number
}

export function MacroPlate({
  protein,
  carb,
  fat,
  proteinTarget,
  carbTarget,
  fatTarget,
}: {
  /** Gram tercatat hari ini (hanya digambar bila makro dikenal). */
  protein: number
  carb: number
  fat: number
  /** Sasaran harian (gram) — 0 = belum diatur, baris sasaran disembunyikan. */
  proteinTarget: number
  carbTarget: number
  fatTarget: number
}) {
  const playEntrance = useFirstVisit('bugar-macro-plate')

  const segs: MacroSeg[] = [
    {
      key: 'protein',
      label: 'Protein',
      dot: 'bg-gold',
      fill: 'var(--palette-gold)',
      grams: protein,
      kcal: protein * KCAL_PER_G.protein,
      target: proteinTarget,
    },
    {
      key: 'carb',
      label: 'Karbohidrat',
      dot: 'bg-pistachio',
      fill: 'var(--palette-pistachio)',
      grams: carb,
      kcal: carb * KCAL_PER_G.carb,
      target: carbTarget,
    },
    {
      key: 'fat',
      label: 'Lemak',
      dot: 'bg-clay',
      fill: 'var(--palette-clay)',
      grams: fat,
      kcal: fat * KCAL_PER_G.fat,
      target: fatTarget,
    },
  ]

  const total = segs.reduce((a, s) => a + s.kcal, 0)

  /* Sudut juring — dari pukul dua belas, searah jarum jam. */
  let acc = 0
  const arcs = segs.map((s) => {
    const sweep = total > 0 ? (s.kcal / total) * 360 : 0
    const a0 = acc
    acc += sweep
    return { ...s, a0, a1: acc, sweep }
  })

  /* Persentase teks — pembulatan dengan lemak menampung sisa
     (kebijakan sama seperti segmented bar lama). */
  const pP = Math.round((arcs[0]!.kcal / total) * 100)
  const cP = Math.round((arcs[1]!.kcal / total) * 100)
  const fP = Math.max(0, 100 - pP - cP)
  const pctOf: Record<MacroSeg['key'], number> = {
    protein: pP,
    carb: cP,
    fat: fP,
  }

  return (
    <div className="flex flex-col items-center gap-3.5 sm:flex-row sm:gap-4">
      <svg
        viewBox="0 0 120 120"
        className="w-[132px] shrink-0"
        role="img"
        aria-label={`Piring makro: protein ${fmt(protein)} gram (${pP}% energi), karbohidrat ${fmt(
          carb,
        )} gram (${cP}% energi), lemak ${fmt(fat)} gram (${fP}% energi)`}
      >
        {/* Rim piring — garis halus di luar juring. */}
        <circle
          cx={CX}
          cy={CY}
          r="55.5"
          fill="none"
          stroke="var(--module-accent-fg)"
          strokeOpacity="0.25"
          strokeWidth="1.5"
        />

        {/* Juring — celah 2px lewat stroke permukaan. */}
        {arcs.map((a, i) => {
          if (a.sweep <= 0.5) return null
          const shared = {
            fill: a.fill,
            stroke: 'var(--surface-primary)',
            strokeWidth: 2,
            strokeLinejoin: 'round' as const,
          }
          return (
            <m.g
              key={a.key}
              initial={playEntrance ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{
                duration: motionTokens.preset.data.duration,
                delay: playEntrance ? i * motionTokens.stagger.normal : 0,
                ease: motionTokens.easing.standard,
              }}
            >
              {a.sweep >= 359.5 ? (
                <circle cx={CX} cy={CY} r={R - 1} {...shared} />
              ) : (
                <path d={wedge(R, a.a0, a.a1)} {...shared} />
              )}
            </m.g>
          )
        })}

        {/* Tengah piring — bukan lubang: scrim tipis + total energi makro. */}
        <circle cx={CX} cy={CY} r="25.5" fill="var(--palette-espresso)" fillOpacity="0.55" />
        <text
          x={CX}
          y={CY + 1}
          textAnchor="middle"
          fontSize="15.5"
          fontWeight="700"
          fill="var(--module-accent-fg)"
        >
          {fmt(total)}
        </text>
        <text
          x={CX}
          y={CY + 12}
          textAnchor="middle"
          fontSize="6"
          fill="var(--module-accent-fg)"
          fillOpacity="0.75"
        >
          kkal makro
        </text>
      </svg>

      {/* Legenda — gram, pangsa energi, dan sasaran per makro. */}
      <m.div
        initial={playEntrance ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{
          duration: motionTokens.preset.data.duration,
          delay: playEntrance ? motionTokens.delay.step : 0,
          ease: motionTokens.easing.standard,
        }}
        className="min-w-0 flex-1 space-y-2"
      >
        {arcs.map((a) => (
          <div key={a.key}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="flex items-center gap-1.5 text-note font-bold text-module-accent-fg">
                <span
                  aria-hidden="true"
                  className={`size-2 shrink-0 rounded-full ${a.dot}`}
                />
                {a.label}
              </p>
              <p className="text-meta font-bold tabular-nums text-module-accent-fg">
                {fmt(a.grams)} g
              </p>
            </div>
            <p className="mt-0.5 text-chart-label tabular-nums text-module-accent-fg/75">
              {pctOf[a.key]}% dari energi makro
              {a.target > 0 ? ` · sasaran ${fmt(a.target)} g` : ''}
            </p>
          </div>
        ))}
      </m.div>
    </div>
  )
}
