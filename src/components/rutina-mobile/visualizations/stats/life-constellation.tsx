'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'

import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { pressSnappy } from '@/lib/motion/transitions'
import {
  daySchedules,
  fromISO,
  shortDateLabel,
  type Completions,
  type Habit,
} from '../../store'

/**
 * Life Constellation — tren konsistensi 30 hari sebagai rasi bintang
 * (Observatorium Hidup, Statistik). Pengganti AreaChart Recharts.
 *
 * Tetap ANALITIS, bukan dekoratif: sumbu 0–100%, garis rata-rata, label
 * tanggal, dan pembacaan per bintang. Kejujuran data ditingkatkan dari
 * rateSeries lama: hari TANPA JADWAL (pct null) dirender titik redup di
 * garis dasar — celah terbaca "tidak ada data", bukan 0%.
 *
 *  - Bintang   : hari terjadwal — % selesai = ketinggian; 100% sedikit
 *                lebih besar; isi var(--chart-stroke-4) (matcha tua,
 *                identitas tren lama).
 *  - Garis rasi: polyline kronologis antar bintang non-null.
 *  - Rata-rata : garis putus var(--chart-stroke-5) + label "rata²".
 *  - Titik redup: hari tanpa jadwal (null) — di dasar, bukan 0%.
 */

/* ===== Derivasi murni — dibagi dengan layar Statistik ===== */

export interface ConstellationDay {
  date: string
  done: number
  due: number
  /** done/due × 100 — null bila tak ada kebiasaan terjadwal (bukan 0%). */
  pct: number | null
}

/** Deret N hari berakhir hari ini — pemetaan tipis di atas daySchedules
 *  (store.ts, test-covered): jadwal dihormati (createdAt, arsip, hari
 *  jeda diampuni keluar penyebut) — SATU rumus per-hari untuk semua
 *  permukaan (audit v2.47 #13). */
export function constellationDays(
  habits: Habit[],
  c: Completions,
  today: string,
  days = 30,
): ConstellationDay[] {
  return daySchedules(habits, c, today, days).map((sd) => ({
    date: sd.date,
    done: sd.done,
    due: sd.scheduled,
    pct: sd.pct,
  }))
}

export interface ConstellationStats {
  /** Rata-rata desimal hari NON-NULL — null bila tak ada hari terjadwal. */
  avg: number | null
  /** Rata-rata 15 hari terakhir − 15 sebelumnya (non-null; 0 bila tak cukup). */
  delta: number
  /** Hari dengan pct > 70 (non-null saja). */
  above70: number
}

export function constellationStats(
  points: ConstellationDay[],
): ConstellationStats {
  const rated = points.filter((p) => p.pct != null)
  const mean = (xs: ConstellationDay[]): number | null => {
    const r = xs.filter((p) => p.pct != null)
    if (r.length === 0) return null
    return r.reduce((a, p) => a + (p.pct ?? 0), 0) / r.length
  }
  const avg = mean(points)
  const half = Math.floor(points.length / 2)
  const recent = mean(points.slice(half))
  const earlier = mean(points.slice(0, half))
  return {
    avg,
    delta: recent != null && earlier != null ? recent - earlier : 0,
    above70: rated.filter((p) => (p.pct ?? 0) > 70).length,
  }
}

/* ===== Geometri ===== */

const PLOT_H = 150
/** Area gambar: atas 12, dasar 0% di y=126, label sumbu-x di y=141. */
const Y_BASE = 126
const Y_TOP = 14
const yOf = (pct: number) => Y_BASE - (pct / 100) * (Y_BASE - Y_TOP)

/** Bintang 4-titik (kilau berlian) dengan sisi cekung, setengah-diagonal s. */
function starPath(s: number): string {
  const w = s * 0.24
  return `M 0 ${-s} Q ${w} ${-w} ${s} 0 Q ${w} ${w} 0 ${s} Q ${-w} ${w} ${-s} 0 Q ${-w} ${-w} 0 ${-s} Z`
}

/** Label sumbu-x hanya pada ~tiap 7 hari (indeks dari 30 titik). */
const TICK_IDX = [0, 7, 14, 21, 29]

const fmtDate = (iso: string) =>
  fromISO(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })

const fmtAvg = (v: number) => v.toFixed(1).replace('.', ',')

/* Pengukur lebar wadah — geometri dihitung 1:1 terhadap piksel agar
   teks & bintang tidak melar di kartu lebar (viewBox adaptif, bukan
   preserveAspectRatio none). */
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(320)
  useIsomorphicLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () =>
      setW(Math.max(240, Math.min(1120, Math.round(el.clientWidth))))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, w }
}

/* ===== Komponen ===== */

export function LifeConstellation({ points }: { points: ConstellationDay[] }) {
  const reducedMotion = useReducedMotion()
  const play = useFirstVisit('stats-constellation') && !reducedMotion
  const { ref, w } = useMeasuredWidth()

  const [selIdx, setSelIdx] = useState<number | null>(null)

  const { stars, line, stats } = useMemo(() => {
    /* Margin: kiri 6, kanan 42 (label rata²), label-x di y 141. */
    const left = 6
    const right = w - 42
    const step = points.length > 1 ? (right - left) / (points.length - 1) : 0
    const stars = points.map((p, i) => ({
      ...p,
      idx: i,
      x: left + i * step,
      y: p.pct == null ? Y_BASE : yOf(p.pct),
    }))
    const lit = stars.filter((s) => s.pct != null)
    const line =
      lit.length > 1
        ? 'M ' + lit.map((s) => `${s.x.toFixed(1)} ${s.y.toFixed(1)}`).join(' L ')
        : ''
    return { stars, line, stats: constellationStats(points) }
  }, [points, w])

  const rated = stars.filter((s) => s.pct != null)
  const avgY = stats.avg != null ? yOf(stats.avg) : null
  const sel = selIdx != null ? stars[selIdx] ?? null : null

  const ariaSummary =
    stats.avg != null
      ? `Tren konsistensi 30 hari: rata-rata ${fmtAvg(stats.avg)}%, ${stats.above70} hari di atas 70%`
      : 'Tren konsistensi 30 hari: belum ada hari terjadwal'

  /* Jeda stagger per bintang ~12ms — koreografi satu kali per kunjungan
     pertama (30 tanda harus selesai dalam satu denyut preset.data, di
     bawah skala token stagger 35–70ms yang akan berjalan >1 dtk). */
  const STAR_STAGGER = 0.012

  return (
    <m.div
      initial={play ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={motionTokens.preset.data}
    >
      {/* Wadah geser (audit v2.47 #1) — 30 target ketuk ≥24px tidak muat
          pada kartu sempit; deret melebar mengikuti jumlah bintang dan
          ponsel menggeser horizontal (pola FinChart/CashflowRiver).
          minWidth memuat margin plot (6 + 42) agar tiap target benar-benar
          ≥24px, bukan 24px dikurangi margin. Pengukuran (ref) menempel pada
          ISI GULIR — bukan induk terpotong viewport — sehingga bintang
          merenggang benar saat isi lebih lebar dari layar. */}
      <div className="overflow-x-auto no-scrollbar overscroll-x-contain">
        <div
          ref={ref}
          className="relative"
          style={{
            minWidth: `max(100%, ${Math.max(1, stars.length) * 24 + 48}px)`,
          }}
        >
          <svg
            viewBox={`0 0 ${w} ${PLOT_H}`}
            width={w}
            height={PLOT_H}
            className="block h-[150px] w-full"
            role="img"
            aria-label={ariaSummary}
          >
            {/* Garis bantu horizontal 25/50/75 + garis dasar. */}
            <m.g
              initial={play ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={motionTokens.preset.data}
            >
              {[25, 50, 75].map((v) => (
                <line
                  key={v}
                  x1={6}
                  x2={w - 42}
                  y1={yOf(v)}
                  y2={yOf(v)}
                  stroke="var(--border-default)"
                  strokeWidth={1}
                />
              ))}
              <line
                x1={6}
                x2={w - 42}
                y1={Y_BASE}
                y2={Y_BASE}
                stroke="var(--border-default)"
                strokeWidth={1}
              />
              {/* Label sumbu-x ~tiap 7 hari. */}
              {TICK_IDX.map((i) => {
                const s = stars[i]
                if (!s) return null
                const anchor =
                  i === TICK_IDX[0] ? 'start' : i === TICK_IDX[TICK_IDX.length - 1] ? 'end' : 'middle'
                return (
                  <text
                    key={s.date}
                    x={i === TICK_IDX[0] ? 4 : i === TICK_IDX[TICK_IDX.length - 1] ? w - 44 : s.x}
                    y={141}
                    textAnchor={anchor}
                    fontSize={8.5}
                    fontWeight={500}
                    fill="var(--content-muted)"
                  >
                    {fmtDate(s.date)}
                  </text>
                )
              })}
            </m.g>

            {/* Garis rasi — polyline antar bintang non-null, digambar pathLength. */}
            {line && (
              <m.path
                d={line}
                fill="none"
                stroke="var(--chart-stroke-4)"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.55}
                initial={play ? { pathLength: 0 } : false}
                animate={{ pathLength: 1 }}
                transition={{
                  ...motionTokens.preset.data,
                  delay: motionTokens.delay.tight,
                }}
              />
            )}

            {/* Titik redup — hari tanpa jadwal (null) di garis dasar. */}
            {stars.map(
              (s) =>
                s.pct == null && (
                  <m.circle
                    key={s.date}
                    cx={s.x}
                    cy={Y_BASE}
                    r={1.5}
                    fill="var(--content-muted)"
                    fillOpacity={0.4}
                    initial={play ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    transition={{
                      ...motionTokens.preset.data,
                      delay: motionTokens.delay.normal + s.idx * STAR_STAGGER,
                    }}
                  />
                ),
            )}

            {/* Bintang — satu per hari terjadwal. */}
            {rated.map((s) => {
              const pct = s.pct ?? 0
              const size = pct === 100 ? 4.1 : 3.3
              const isSel = selIdx === s.idx
              return (
                <g key={s.date} transform={`translate(${s.x} ${s.y})`}>
                  <m.g
                    initial={play ? { opacity: 0, scale: 0.85 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      ...motionTokens.preset.data,
                      delay: motionTokens.delay.normal + s.idx * STAR_STAGGER,
                    }}
                    style={{
                      transformBox: 'fill-box',
                      transformOrigin: '50% 50%',
                    }}
                  >
                    <m.g
                      animate={{ scale: isSel ? 1.3 : 1 }}
                      transition={pressSnappy}
                      style={{
                        transformBox: 'fill-box',
                        transformOrigin: '50% 50%',
                      }}
                    >
                      {isSel && (
                        <circle
                          r={6.5}
                          fill="none"
                          stroke="var(--chart-stroke-4)"
                          strokeWidth={1.2}
                          opacity={0.7}
                        />
                      )}
                      <path d={starPath(size)} fill="var(--chart-stroke-4)" />
                      <circle r={0.75} fill="var(--surface-primary)" />
                    </m.g>
                  </m.g>
                </g>
              )
            })}

            {/* Garis rata-rata non-null + label tepi kanan. */}
            {avgY != null && stats.avg != null && (
              <m.g
                initial={play ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{
                  ...motionTokens.preset.data,
                  delay: motionTokens.delay.relaxed,
                }}
              >
                <line
                  x1={6}
                  x2={w - 42}
                  y1={avgY}
                  y2={avgY}
                  stroke="var(--chart-stroke-5)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <text
                  /* v2.49 (audit): jangkar kanan — label start di x=w−40
                     memotong "%" di tepi viewBox saat rata-rata tinggi
                     ("rata² 100,0%" ≈ 50px lebar). */
                  x={w - 2}
                  y={avgY + 2.5}
                  fontSize={8}
                  fontWeight={600}
                  textAnchor="end"
                  fill="var(--content-muted)"
                >
                  rata² {fmtAvg(stats.avg)}%
                </text>
              </m.g>
            )}
          </svg>

          {/* Overlay tombol — satu per hari terjadwal, DIPUSATKAN pada
              sumbu-x bintangnya (audit v2.47 #1: kolom seragam selebar
              kartu membuat ketukan jatuh ke hari yang salah). Lebar 24px
              (WCAG 2.5.8) dijamin tak bertumpuk oleh minWidth di atas —
              jarak antar bintang ≥ 24px pada lebar berapa pun — sehingga
              ketukan PADA bintang i selalu membaca hari i; clamping tepi
              menahan tombol pertama/terakhir tetap di dalam wadah. Sel
              null (hari tanpa jadwal) memang tak punya tombol — titik
              redupnya bukan pilihan. Urutan DOM = urutan hari → tab
              papan tik berjalan kronologis. */}
          {stars.map((s) => {
            if (s.pct == null) return null
            const label = `${shortDateLabel(s.date)} — ${s.done} dari ${s.due} selesai (${s.pct}%)`
            return (
              <button
                key={s.date}
                type="button"
                aria-pressed={selIdx === s.idx}
                aria-label={label}
                title={label}
                onClick={() =>
                  setSelIdx((prev) => (prev === s.idx ? null : s.idx))
                }
                className="absolute bottom-0 top-0 w-6 cursor-pointer rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:[outline-offset:-2px] focus-visible:outline-primary"
                style={{
                  left: `${Math.min(Math.max(s.x - 12, 0), w - 24)}px`,
                }}
              />
            )
          })}
        </div>
      </div>

      {/* Pembacaan bintang terpilih — padanan tooltip (audit Tahap 2 #3). */}
      <p
        aria-live="polite"
        className="mt-1 text-eyebrow font-medium text-content-muted"
      >
        {sel && sel.pct != null
          ? `${shortDateLabel(sel.date)}: ${sel.pct}% (${sel.done} dari ${sel.due} selesai)`
          : 'Ketuk bintang untuk membaca hari.'}
      </p>
    </m.div>
  )
}
