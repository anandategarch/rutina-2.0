'use client'

import * as m from 'motion/react-m'
import { useReducedMotion } from 'motion/react'

import { useFirstVisit } from '@/lib/motion/first-visit'
import { motionTokens } from '@/lib/motion/tokens'

import { longDateLabel, shortDateLabel } from '../../store'
import { durationLabel, paceLabelOf } from '../../fitness/fit-utils'

/**
 * Lintasan Pace — Warm Editorial Productivity, edisi visualisasi
 * ilustratif (v2.50 Tahap 2). Mengganti polyline pace di kartu Tren
 * Kardio: tiap sesi kardio digambar sebagai titik pelari di atas
 * siluet lintasan lari (2–3 garis lane melengkung, dekoratif).
 * Kiri→kanan kronologis; posisi vertikal = pace dengan LEBIH CEPAT =
 * LEBIH TINGGI. Ukuran titik mengikuti jarak tempuh (proporsional,
 * tidak pernah menggeser posisi pace).
 *
 * Kejujuran data: deret dibangun pemanggil — hanya sesi dengan jarak
 * & durasi valid; pace numerik (durasi ÷ jarak) dihitung pemanggil,
 * komponen murni presentasional. Deret < 3 sesi bukan tren —
 * digambar lintasan kosong ilustratif, BUKAN garis datar palsu
 * (pola gerbang lama kartu tren, kini jujur tergambar).
 *
 * A11y: SVG statis role="img" dengan ringkasan semua sesi; pemilihan
 * sesi lewat lapisan tombol HTML ≥44px (aria-pressed) + baris bacaan
 * aria-live — pola barbell-progression.
 */

/** Satu sesi pace pada lintasan — pace numerik sudah dihitung pemanggil. */
export interface PaceTrackSession {
  id: string
  /** Tanggal sesi (ISO yyyy-mm-dd). */
  date: string
  /** Pace menit per km = durasi ÷ jarak (dihitung pemanggil). */
  paceMinPerKm: number
  distanceKm: number
  durationMin: number
  /** Label jenis sesi (mis. "Lari") — konteks bacaan, opsional. */
  kind?: string
}

/* ===== Geometri (viewBox 0 0 320 140) ===== */

const W = 320
const H = 140
const TOP_Y = 30
const BOT_Y = 104
/** Target sentuh minimum per sesi (px) — deret panjang menggeser
 *  horizontal di dalam kartu (pola cashflow-river). */
const SLOT_MIN_W = 44

/** Satu garis lane: datar di tengah, melengkung naik di kedua ujung —
 *  siluet lintasan lari (dekoratif, bukan skala pace). */
function lanePath(y: number): string {
  const rise = 15
  return `M6 ${y} C24 ${y - rise} 44 ${y - rise} 64 ${y} L256 ${y} C276 ${y - rise} 296 ${y - rise} 314 ${y}`
}

/** "4,30" — desimal koma mengikuti konvensi id-ID. */
const fmtKm = (n: number): string => n.toFixed(2).replace('.', ',')

export function PaceTrack({
  sessions,
  selectedId,
  onSelect,
}: {
  /** Sesi kronologis (terlama → terbaru), maks 10. */
  sessions: PaceTrackSession[]
  /** id sesi terpilih, atau null. */
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const first = useFirstVisit('bugar-pace-track')
  const reduced = useReducedMotion()

  /* Deret < 3 sesi belum meyakinkan sebagai tren (pola PrSpark) —
     lintasan kosong: lane putus-putus + pesan, tanpa garis palsu. */
  if (sessions.length < 3) {
    return (
      <div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full aspect-[320/140]"
          aria-hidden="true"
        >
          <g
            fill="none"
            stroke="var(--palette-clay)"
            strokeWidth="1.5"
            opacity="0.45"
          >
            <path d={lanePath(52)} strokeDasharray="5 6" />
            <path d={lanePath(74)} strokeDasharray="5 6" />
            <path d={lanePath(96)} strokeDasharray="5 6" />
          </g>
        </svg>
        <p className="mt-1 text-center text-meta font-medium leading-relaxed text-content-muted">
          Butuh setidaknya 3 sesi kardio dengan jarak &amp; durasi untuk
          menggambar lintasan pace.
        </p>
      </div>
    )
  }

  const n = sessions.length
  const paces = sessions.map((s) => s.paceMinPerKm)
  const minP = Math.min(...paces)
  const maxP = Math.max(...paces)
  /* Lantai span 0.5 menit/km — deret nyaris datar tetap terbaca. */
  const span = Math.max(maxP - minP, 0.5)
  const maxKm = Math.max(...sessions.map((s) => s.distanceKm), 0.1)

  const xOf = (i: number) => ((i + 0.5) / n) * W
  /* Pace kecil (cepat) digambar TINGGI — arah baca "naik = cepat". */
  const yOf = (pace: number) => TOP_Y + ((pace - minP) / span) * (BOT_Y - TOP_Y)
  const rOf = (km: number) => 4.5 + 3.5 * (km / maxKm)

  const selIdx = sessions.findIndex((s) => s.id === selectedId)
  const sel = selIdx >= 0 ? sessions[selIdx]! : null

  /** Label nilai sesi terpilih — di atas titik, pindah ke bawah bila
   *  mepet tepi atas ruang gambar (tak menabrak anotasi arah). */
  const labelYOf = (y: number, r: number) =>
    y - r - 8 < 26 ? y + r + 11 : y - r - 8

  /** Label tanggal: semua bila lega, selang-satu + terakhir bila padat. */
  const showLabel = (i: number) => {
    if (n <= 6) return true
    if (i === n - 1) return true
    return i % 2 === 0 && i !== n - 2
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
          Pace per sesi · menit/km
        </p>
        <p className="text-eyebrow font-medium tabular-nums text-content-muted">
          {n} sesi terakhir
        </p>
      </div>

      <div className="overflow-x-auto no-scrollbar overscroll-x-contain">
        <div
          className="relative"
          style={{ minWidth: `max(100%, ${n * SLOT_MIN_W}px)` }}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full aspect-[320/140]"
            role="img"
            aria-label={`Lintasan pace ${n} sesi kardio terakhir, dalam menit per kilometer: ${sessions
              .map(
                (s) => `${shortDateLabel(s.date)} ${paceLabelOf(s.paceMinPerKm)}`,
              )
              .join(
                ', ',
              )}. Titik lebih tinggi berarti pace lebih cepat; ukuran titik mengikuti jarak tempuh`}
          >
            {/* Lane lintasan — dekoratif, bukan skala. */}
            <g
              aria-hidden="true"
              fill="none"
              stroke="var(--palette-clay)"
              strokeLinecap="round"
            >
              <path d={lanePath(52)} strokeWidth="1.5" opacity="0.42" />
              <path d={lanePath(74)} strokeWidth="1.25" opacity="0.3" />
              <path
                d={lanePath(96)}
                strokeWidth="1.25"
                opacity="0.24"
                strokeDasharray="4 5"
              />
            </g>

            {/* Anatomi arah — naik = cepat; satuan di kepala kartu. */}
            <text
              x="6"
              y="14"
              fontSize="8"
              fontWeight="600"
              fill="var(--content-muted)"
            >
              ↑ lebih cepat
            </text>

            {/* Penghubung antar sesi — putus-putus halus, data sama. */}
            <m.path
              d={sessions
                .map(
                  (s, i) =>
                    `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)} ${yOf(
                      s.paceMinPerKm,
                    ).toFixed(1)}`,
                )
                .join(' ')}
              fill="none"
              stroke="var(--chart-stroke-2)"
              strokeOpacity="0.45"
              strokeWidth="1.5"
              strokeDasharray="3 4"
              initial={first && !reduced ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{
                duration: motionTokens.preset.data.duration,
                ease: motionTokens.easing.standard,
              }}
            />

            {/* Titik pelari per sesi — ukuran ∝ jarak, posisi = pace. */}
            {sessions.map((s, i) => {
              const x = xOf(i)
              const y = yOf(s.paceMinPerKm)
              const r = rOf(s.distanceKm)
              const on = selIdx === i
              return (
                <m.g
                  key={s.id}
                  initial={first && !reduced ? { opacity: 0, scale: 0.5 } : false}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: motionTokens.preset.data.duration,
                    delay: first && !reduced ? i * motionTokens.stagger.tight : 0,
                    ease: motionTokens.easing.standard,
                  }}
                  style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill="var(--chart-stroke-2)"
                    fillOpacity="0.92"
                    stroke="var(--surface-primary)"
                    strokeWidth="2"
                  />
                  {on && (
                    <>
                      <circle
                        cx={x}
                        cy={y}
                        r={r + 3.5}
                        fill="none"
                        stroke="var(--chart-stroke-5)"
                        strokeWidth="1.5"
                      />
                      <text
                        x={x}
                        y={labelYOf(y, r)}
                        fontSize="8.5"
                        fontWeight="700"
                        textAnchor="middle"
                        fill="var(--content-primary)"
                      >
                        {paceLabelOf(s.paceMinPerKm)}
                      </text>
                    </>
                  )}
                </m.g>
              )
            })}

            {/* Label tanggal — selang-satu bila titik padat. */}
            {sessions.map((s, i) =>
              showLabel(i) ? (
                <text
                  key={`${s.id}-d`}
                  x={xOf(i)}
                  y="134"
                  fontSize="8"
                  textAnchor="middle"
                  fill="var(--content-muted)"
                >
                  {shortDateLabel(s.date)}
                </text>
              ) : null,
            )}
          </svg>

          {/* Lapisan tombol per slot sesi — target sentuh ≥44px, nilai
              tidak bergantung pada hover (pola a11y barbel). */}
          <div className="absolute inset-0 flex">
            {sessions.map((s, i) => (
              <button
                key={`${s.id}-btn`}
                type="button"
                aria-pressed={selIdx === i}
                aria-label={`${shortDateLabel(s.date)}: pace ${paceLabelOf(
                  s.paceMinPerKm,
                )} menit per kilometer, ${fmtKm(s.distanceKm)} km, ${durationLabel(
                  s.durationMin,
                )}`}
                onClick={() => onSelect(selIdx === i ? null : s.id)}
                className="interactive min-w-0 flex-1 cursor-pointer rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-module-accent-strong"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Baris bacaan — nilai sesi terpilih / petunjuk arah baca. */}
      <p
        aria-live="polite"
        className="mt-2 text-meta font-semibold leading-snug text-content-primary"
      >
        {sel
          ? `${longDateLabel(sel.date)} · ${paceLabelOf(
              sel.paceMinPerKm,
            )} menit/km — ${
              sel.kind ? `${sel.kind}, ` : ''
            }${fmtKm(sel.distanceKm)} km dalam ${durationLabel(sel.durationMin)}`
          : 'Ketuk titik untuk membaca sesi. Titik lebih tinggi = pace lebih cepat.'}
      </p>

      <p className="mt-1.5 text-chart-label leading-relaxed text-content-muted">
        Ukuran titik mengikuti jarak tempuh sesi — garis lintasan hanya
        dekorasi, bukan skala.
      </p>
    </div>
  )
}
