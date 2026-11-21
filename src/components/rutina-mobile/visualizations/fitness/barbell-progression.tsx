'use client'

import * as m from 'motion/react-m'
import { useReducedMotion } from 'motion/react'

import { shortDateLabel } from '../../store'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { motionTokens } from '@/lib/motion/tokens'

/**
 * Barbel Progresi e1RM — Warm Editorial Productivity, edisi
 * visualisasi ilustratif (v2.47). Mengganti grafik garis e1RM di
 * lembar detail gerakan: batang barbel horizontal dengan "kolom
 * piringan" per sesi — tinggi kolom ∝ e1RM terbaik sesi itu
 * (estimasi Epley), dinormalisasi ke jendela yang tampil.
 *
 * Kejujuran data: tekstur garis piringan DECORATIF (posisi tetap di
 * 25/50/75% tinggi kolom, tidak terkuantisasi ke piringan nyata) —
 * catatan kaki menyatakannya eksplisit. Sorotan gold tua
 * (chart-stroke-3) + bintang kini menandai SESI REKOR (e1RM
 * tertinggi deret) — warna identitas e1RM papan rekor; sesi
 * TERBARU hanya penanda kecil "terbaru" di bawah label tanggal
 * (v2.50 Tahap 2, dulu sesi terakhir yang digold). Deret kosong
 * menggambar barbel kosong ilustratif — bar + kolar tanpa piringan,
 * tanpa skala palsu.
 *
 * A11y: SVG statis role="img" dengan ringkasan semua titik; pemilihan
 * sesi lewat lapisan tombol HTML di atas grafik (pola overlay kartu
 * tren kardio) + baris bacaan aria-live.
 */

/** Satu sesi pada grafik — sudah dihitung adapter lembar detail. */
export interface BarbellPoint {
  date: string
  /** e1RM terbaik sesi ini (Epley). */
  bestE1: number
  /** Set terbaik sesi ini. */
  top: { weight: number; reps: number }
}

/** "62,5" — desimal koma mengikuti konvensi id-ID. */
const fmtKg = (n: number): string =>
  Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')

/* ===== Geometri (viewBox 0 0 320 120) ===== */

const W = 320
const H = 120
const BASE_Y = 96
const TOP_Y = 34
const AREA_H = BASE_Y - TOP_Y
const LEFT = 32
const RIGHT = 308
const AREA_W = RIGHT - LEFT

interface ColGeom {
  x: number
  y: number
  w: number
  h: number
  /** Posisi label tengah kolom. */
  cx: number
  isPR: boolean
  isLast: boolean
  opacity: number
}

/** Bintang lima titik kecil (r luar 4,5) berpusat (cx, cy) — lencana
 *  sesi rekor (pola polar macro-plate). */
function starPath(cx: number, cy: number): string {
  const pts: string[] = []
  for (let k = 0; k < 10; k++) {
    const r = k % 2 === 0 ? 4.5 : 1.9
    const a = -Math.PI / 2 + (k * Math.PI) / 5
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return `M${pts.join('L')}Z`
}

export function BarbellProgression({
  points,
  selected,
  onSelect,
}: {
  /** Sesi kronologis (terlama → terbaru), maks 10. */
  points: BarbellPoint[]
  /** Indeks sesi terpilih, atau null. */
  selected: number | null
  onSelect: (i: number | null) => void
}) {
  const first = useFirstVisit('bugar-barbell-progress')
  const reduced = useReducedMotion()

  /* Deret kosong (audit v2.47.1 → v2.50): barbel kosong ilustratif —
     batang + kolar + piringan hantu putus-putus, tanpa skala palsu.
     Pemanggil (lembar detail gerakan) menampilkannya saat gerakan
     belum punya set tercatat. */
  if (points.length === 0) {
    return (
      <div>
        <svg
          viewBox="0 0 320 56"
          className="w-full aspect-[320/56]"
          role="img"
          aria-label="Barbel kosong — belum ada set tercatat untuk gerakan ini"
        >
          <g aria-hidden="true" opacity="0.7">
            <rect
              x="14"
              y="25"
              width="292"
              height="6"
              rx="3"
              fill="var(--content-muted)"
              fillOpacity="0.5"
            />
            <rect x="8" y="21.5" width="5" height="13" rx="2" fill="var(--content-muted)" fillOpacity="0.8" />
            <rect x="307" y="21.5" width="5" height="13" rx="2" fill="var(--content-muted)" fillOpacity="0.8" />
            <circle
              cx="40"
              cy="28"
              r="11"
              fill="none"
              stroke="var(--content-muted)"
              strokeOpacity="0.55"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <circle
              cx="280"
              cy="28"
              r="11"
              fill="none"
              stroke="var(--content-muted)"
              strokeOpacity="0.55"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          </g>
        </svg>
        <p className="mt-1 text-center text-meta font-medium leading-relaxed text-content-muted">
          Belum ada set tercatat — mulai catat untuk melihat progresi.
        </p>
      </div>
    )
  }

  const n = points.length
  const vals = points.map((p) => p.bestE1)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min
  const norm = (v: number) => (span > 1e-6 ? (v - min) / span : 0.62)

  /* Sesi rekor pribadi (PR) deret — e1RM tertinggi (terbaru bila
     seri); satu-satunya kolom bergold + bintang (v2.50). */
  const prIdx = points.reduce(
    (best, p, i) => (p.bestE1 >= points[best]!.bestE1 ? i : best),
    0,
  )

  const slot = AREA_W / Math.max(n, 1)
  const cols: ColGeom[] = points.map((p, i) => {
    const isPR = i === prIdx
    const isLast = i === n - 1
    const w = Math.min(slot * (isPR ? 0.78 : 0.7), isPR ? 38 : 34)
    const hFrac = 0.08 + 0.92 * norm(p.bestE1)
    const h = hFrac * AREA_H
    return {
      x: LEFT + slot * i + (slot - w) / 2,
      y: BASE_Y - h,
      w,
      h,
      cx: LEFT + slot * i + slot / 2,
      isPR,
      isLast,
      /* Kolom lama lebih pudar — PR & terbaru tetap penuh, semua
         lainnya ≥45% terbaca. */
      opacity: isPR || isLast ? 1 : 0.45 + 0.4 * (n > 1 ? i / (n - 1) : 1),
    }
  })

  const selIdx =
    selected != null && selected >= 0 && selected < n ? selected : null
  const sel = selIdx != null ? { i: selIdx, p: points[selIdx]!, c: cols[selIdx]! } : null

  /** Label tanggal: semua bila lega, selang-satu + kolom terakhir bila padat. */
  const showLabel = (i: number) => {
    if (n <= 6) return true
    if (i === n - 1) return true
    return i % 2 === 0 && i !== n - 2
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
          e1RM (estimasi Epley) per sesi
        </p>
        <p className="text-eyebrow font-medium tabular-nums text-content-muted">
          {n} sesi terakhir
        </p>
      </div>

      <div className="relative mt-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full aspect-[8/3]"
          role="img"
          aria-label={`Grafik e1RM per sesi (estimasi Epley): ${points
            .map((p) => `${shortDateLabel(p.date)} ${fmtKg(p.bestE1)} kg`)
            .join(', ')}`}
        >
          {/* Barbel — batang horizontal + dua kolar ujung (dekoratif).
              v2.47.1: opasitas dinaikkan agar identitas barbel terbaca
              pada kartu 320–390px tanpa berteriak. v2.47.2 (audit):
              geometri disimetriskan ke viewBox — kolar kanan 307..312
              cermin kolar kiri 8..13, batang berakhir di 306 sejajar
              ujung garis dasar (dulu kolar kanan terpotong di luar
              viewBox 0 0 320 120). */}
          <g aria-hidden="true" fill="var(--content-muted)">
            <rect x="14" y="7" width="292" height="6" rx="3" fillOpacity="0.55" />
            <rect x="8" y="3.5" width="5" height="13" rx="2" fillOpacity="0.85" />
            <rect x="307" y="3.5" width="5" height="13" rx="2" fillOpacity="0.85" />
          </g>

          {/* Garis dasar + label skala min/maks (nilai di baris bacaan). */}
          <line
            x1="14"
            y1={BASE_Y}
            x2="306"
            y2={BASE_Y}
            stroke="var(--border)"
            strokeWidth="1"
          />
          <text
            x="1"
            y="37"
            fontSize="6.5"
            fill="var(--content-muted)"
            aria-hidden="true"
          >
            {fmtKg(max)}
          </text>
          <text
            x="1"
            y="93"
            fontSize="6.5"
            fill="var(--content-muted)"
            aria-hidden="true"
          >
            {fmtKg(min)}
          </text>

          {/* Kolom piringan per sesi — tinggi ∝ e1RM (lantai 8%). */}
          {cols.map((c, i) => (
            <m.g
              key={points[i]!.date + i}
              initial={
                first && !reduced ? { opacity: 0, scaleY: 0.85 } : false
              }
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{
                duration: motionTokens.preset.data.duration,
                delay: first && !reduced ? i * motionTokens.stagger.tight : 0,
                ease: motionTokens.easing.standard,
              }}
              style={{
                transformBox: 'fill-box',
                transformOrigin: '50% 100%',
              }}
            >
              <rect
                x={c.x}
                y={c.y}
                width={c.w}
                height={c.h}
                rx={Math.min(c.w / 2.6, 4)}
                fill={
                  c.isPR
                    ? 'var(--chart-stroke-3)'
                    : 'var(--module-accent)'
                }
                fillOpacity={c.opacity}
              />
              {/* Tekstur piringan — garis halus dekoratif di 25/50/75%
                  tinggi kolom; TIDAK terkuantisasi ke piringan fisik. */}
              {c.h >= 18 &&
                [0.25, 0.5, 0.75].map((f) => (
                  <line
                    key={f}
                    x1={c.x + 1.5}
                    y1={c.y + c.h * f}
                    x2={c.x + c.w - 1.5}
                    y2={c.y + c.h * f}
                    stroke="var(--surface-primary)"
                    strokeOpacity="0.4"
                    strokeWidth="1"
                  />
                ))}
            </m.g>
          ))}

          {/* Lencana PR — bintang gold di atas kolom sesi rekor e1RM
              (v2.50); menghindar ke atas saat label nilai sesi
              terpilih muncul tepat di bawahnya. */}
          <m.g
            key={`pr-${prIdx}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={motionTokens.spring.snappy}
          >
            <path
              d={starPath(
                cols[prIdx]!.cx,
                sel?.i === prIdx ? cols[prIdx]!.y - 15.5 : cols[prIdx]!.y - 7,
              )}
              fill="var(--chart-stroke-3)"
            />
          </m.g>

          {/* Sorotan sesi terpilih — cincin + label nilai di atas kolom. */}
          {sel && (
            <m.g
              key={`sel-${sel.i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={motionTokens.spring.snappy}
            >
              <rect
                x={sel.c.x - 2}
                y={sel.c.y - 2}
                width={sel.c.w + 4}
                height={sel.c.h + 4}
                rx={Math.min(sel.c.w / 2.4, 5)}
                fill="none"
                stroke="var(--chart-stroke-5)"
                strokeWidth="1.5"
              />
              <text
                x={sel.c.cx}
                y={sel.c.y - 4}
                fontSize="8.5"
                fontWeight="700"
                textAnchor="middle"
                fill="var(--content-primary)"
              >
                {`${fmtKg(sel.p.bestE1)} kg`}
              </text>
            </m.g>
          )}

          {/* Label tanggal — selang-satu bila kolom padat; sesi rekor
              bergold + tebal (v2.50). */}
          {points.map((p, i) =>
            showLabel(i) ? (
              <text
                key={p.date + i}
                x={cols[i]!.cx}
                y="107.5"
                fontSize="8"
                textAnchor="middle"
                fontWeight={i === prIdx ? 700 : 400}
                fill={
                  i === prIdx
                    ? 'var(--chart-stroke-3)'
                    : 'var(--content-muted)'
                }
              >
                {shortDateLabel(p.date)}
              </text>
            ) : null,
          )}

          {/* Penanda sesi TERBARU — kecil di bawah label tanggal
              kolom terakhir (v2.50: pengganti sorotan gold lama). */}
          <text
            x={cols[n - 1]!.cx}
            y="116.5"
            fontSize="6.5"
            fontWeight="600"
            textAnchor="middle"
            fill="var(--content-muted)"
          >
            terbaru
          </text>
        </svg>

        {/* Lapisan tombol per slot sesi — pemilihan tidak bergantung
            pada hover (pola a11y overlay tren kardio). */}
        <div className="absolute inset-y-0 left-[10%] right-[3.75%] flex">
          {points.map((p, i) => (
            <button
              key={`${p.date}-${i}`}
              type="button"
              aria-pressed={selIdx === i}
              aria-label={`${shortDateLabel(p.date)} — e1RM ${fmtKg(
                p.bestE1,
              )} kg (set terbaik ${fmtKg(p.top.weight)} kg × ${p.top.reps})`}
              onClick={() => onSelect(selIdx === i ? null : i)}
              className="interactive min-w-0 flex-1 cursor-pointer rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-module-accent-strong"
            />
          ))}
        </div>
      </div>

      {/* Baris bacaan — nilai sesi terpilih / petunjuk. */}
      <p
        aria-live="polite"
        className="mt-1 text-meta leading-snug text-content-muted"
      >
        {sel
          ? `${shortDateLabel(sel.p.date)} · set terbaik ${fmtKg(
              sel.p.top.weight,
            )} kg × ${sel.p.top.reps} → e1RM ${fmtKg(sel.p.bestE1)} kg${
              sel.i === prIdx ? ' — rekor pribadi' : ''
            }`
          : 'Ketuk kolom untuk membaca sesi latihannya.'}
      </p>

      <p className="mt-1.5 text-chart-label leading-relaxed text-content-muted">
        Tinggi kolom mengikuti e1RM estimasi — ilustrasi piringan tidak
        menggambarkan susunan barbel fisik yang kamu pakai.
      </p>
    </div>
  )
}
