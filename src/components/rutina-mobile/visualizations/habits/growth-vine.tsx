'use client'

import { useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'

import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { pressSnappy } from '@/lib/motion/transitions'
import { DayDetailSheet } from '../../day-detail-sheet'
import {
  WEEKDAY_MIN,
  addDaysISO,
  fromISO,
  isDoneOn,
  scheduledOn,
  todayISO,
  useRutina,
  weekStartISO,
  type Completions,
  type Habit,
} from '../../store'

/**
 * Sulur Pekan Ini (Growth Vine) — satu cabang botani = pekan berjalan.
 *
 * Batang melengkung horizontal dengan 7 simpul daun (Senin..Minggu).
 * Bentuk daun DIGERAKKAN OLEH DATA, jujur terhadap jadwal:
 *  - PENUH (pct 100)     → daun besar terisi aksen modul + titik mekar emas.
 *  - SEBAGIAN (0<pct<100)→ daun sedang, setengah terisi (belah midrib).
 *  - HARI INI belum penuh → daun sedang garis luar + cincin sorot (hari
 *    masih berjalan — TIDAK divonis gagal sebelum tengah malam).
 *  - TERLEWAT (pct 0, hari berlalu) → daun kecil menggerogot, tint clay.
 *  - TANPA JADWAL (pct null) → kuncup lingkar putus-putus — BUKAN bentuk
 *    kegagalan (hari tanpa jadwal ≠ 0%).
 *  - MASA DEPAN → simpul putus-putus redup.
 *
 * Sumber data: logika per-hari yang sama dengan daySchedules (store.ts) —
 * hormati createdAt & arsip, jeda terjadwal diampuni (keluar penyebut),
 * pct null bila tak ada jadwal — dihitung LOKAL untuk jendela Senin-pekan
 * (daySchedules memakai jendela bergulir berakhir hari ini).
 */

/* ===== Derivasi murni — pekan Senin..Minggu berjalan ===== */

interface VineDay {
  iso: string
  label: string
  dateNum: number
  due: number
  done: number
  rest: number
  pct: number | null
  future: boolean
  isToday: boolean
}

function vineWeek(habits: Habit[], c: Completions, today: string): VineDay[] {
  const start = weekStartISO(today)
  return Array.from({ length: 7 }, (_, i) => {
    const iso = addDaysISO(start, i)
    const pool = habits.filter(
      (h) => scheduledOn(h, iso) && h.createdAt <= iso,
    )
    const forgiven = new Set(
      pool.filter((h) => (h.restDays ?? []).includes(iso)).map((h) => h.id),
    )
    const due = pool.filter((h) => !forgiven.has(h.id))
    const done = due.filter((h) => isDoneOn(c, iso, h.id)).length
    const d = fromISO(iso)
    return {
      iso,
      label: WEEKDAY_MIN[d.getDay()],
      dateNum: d.getDate(),
      due: due.length,
      done,
      rest: forgiven.size,
      pct: due.length === 0 ? null : Math.round((done / due.length) * 100),
      future: iso > today,
      isToday: iso === today,
    }
  })
}

/** Bentuk visual simpul — turunan murni dari VineDay. */
type LeafState = 'full' | 'partial' | 'pending' | 'missed' | 'rest' | 'future'

function leafStateOf(d: VineDay): LeafState {
  if (d.future) return 'future'
  if (d.pct == null) return 'rest'
  if (d.pct === 100) return 'full'
  if (d.pct > 0) return 'partial'
  /* 0% — hari ini masih berjalan (vonis menunggu tengah malam). */
  if (d.isToday) return 'pending'
  return 'missed'
}

/** Teks nilai aksesibel satu hari — intensitas tidak disampaikan warna saja. */
function dayText(d: VineDay): string {
  const date = fromISO(d.iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
  if (d.future) return `${d.label}, ${date} — belum berjalan`
  if (d.pct == null)
    return `${d.label}, ${date} — tanpa kebiasaan terjadwal${
      d.rest > 0 ? `, ${d.rest} hari jeda diampuni` : ''
    }`
  const running = d.isToday && d.pct < 100 ? ' — hari masih berjalan' : ''
  return `${d.label}, ${date} — ${d.done} dari ${d.due} terjadwal selesai (${d.pct}%)${
    d.rest > 0 ? `, ${d.rest} hari jeda diampuni` : ''
  }${running}`
}

/* ===== Geometri SVG ===== */

const VB_W = 320
const VB_H = 112
/** Simpul: x merata 28..292, y lengkung sinus lembut (puncak Rabu-Kamis). */
const NODES = Array.from({ length: 7 }, (_, i) => ({
  x: 28 + i * 44,
  y: 66 - Math.round(11 * Math.sin((i / 6) * Math.PI)),
}))

/** Jalur batang halus melewati semua simpul (Catmull-Rom → Bezier). */
function stemPath(): string {
  const pts = [{ x: 12, y: 69 }, ...NODES, { x: 308, y: 69 }]
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    if (!p2) break
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(
      1,
    )} ${p2.x} ${p2.y}`
  }
  return d
}

/* Daun lokal: pangkal (0,0), ujung ke atas ±19px, lebar ±9px. */
const LEAF_FULL =
  'M 0 0 C -6.2 -2.6 -9.4 -9.4 -5.6 -16.2 C -2.6 -19.6 2.6 -19.6 5.6 -16.2 C 9.4 -9.4 6.2 -2.6 0 0 Z'
/** Setengah kiri daun (isi solid untuk keadaan "sebagian"). */
const LEAF_LEFT =
  'M 0 0 C -6.2 -2.6 -9.4 -9.4 -5.6 -16.2 C -3.2 -18.6 -1.4 -19.2 0 -19.2 Z'
/** Midrib halus. */
const LEAF_RIB = 'M 0 -2 C -0.5 -6.5 -0.5 -11.5 0 -16.5'

/** Satu simpul daun — grup diposisikan di simpul batang. */
function VineLeaf({
  state,
  isToday,
  selected,
  play,
  index,
}: {
  state: LeafState
  isToday: boolean
  selected: boolean
  /** Entrance bermain (kunjungan pertama & tanpa reduce-motion). */
  play: boolean
  /** Indeks hari 0..6 — arah daun bergantian + jeda stagger. */
  index: number
}) {
  const accent = 'var(--module-accent)'
  const accentStrong = 'var(--module-accent-strong)'
  const grow = {
    transformBox: 'fill-box',
    transformOrigin: '50% 100%',
  } as const
  const delay =
    motionTokens.delay.normal + index * motionTokens.stagger.relaxed

  if (state === 'rest' || state === 'future') {
    const bud = state === 'rest'
    return (
      <m.g
        initial={play ? { scale: 0, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...motionTokens.preset.celebration, delay }}
        style={grow}
      >
        <circle
          cx={0}
          cy={0}
          r={bud ? 4.6 : 3.6}
          fill="none"
          stroke={bud ? 'var(--content-secondary)' : 'var(--content-muted)'}
          strokeWidth={bud ? 1.5 : 1.3}
          strokeDasharray={bud ? '2.4 2.4' : '1.8 2'}
          opacity={bud ? 0.9 : 0.45}
        />
      </m.g>
    )
  }

  /* Daun: rotasi bergantian kiri/kanan; "terlewat" menggerogot ke bawah
     (rotasi ±118° — ujung daun menunduk, jujur tapi lembut). */
  const droop = state === 'missed'
  const even = index % 2 === 0
  const rotate = droop ? (even ? 118 : -118) : even ? -16 : 16
  const scale = state === 'full' ? 1 : state === 'missed' ? 0.62 : 0.82
  const stroke = droop ? 'var(--palette-clay)' : accent
  const filled = state === 'full'

  return (
    <m.g
      initial={play ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ ...motionTokens.preset.celebration, delay }}
      style={grow}
    >
      <m.g
        animate={{ scale: selected ? 1.1 : 1 }}
        transition={pressSnappy}
        style={grow}
      >
        <g
          transform={`rotate(${rotate}) scale(${scale * (isToday ? 1.12 : 1)})`}
        >
          {filled ? (
            <path d={LEAF_FULL} fill={accent} stroke={accentStrong} strokeWidth={1.1} />
          ) : (
            <>
              <path d={LEAF_FULL} fill="none" stroke={stroke} strokeWidth={1.6} />
              {state === 'partial' && (
                <path d={LEAF_LEFT} fill={accent} opacity={0.85} />
              )}
              <path
                d={LEAF_RIB}
                fill="none"
                stroke={droop ? 'var(--palette-clay)' : accentStrong}
                strokeWidth={0.9}
                opacity={droop ? 0.7 : 0.5}
              />
            </>
          )}
          {/* Titik mekar emas — hanya hari penuh. */}
          {filled && <circle cx={3.4} cy={-2.2} r={1.6} fill="var(--palette-gold)" />}
        </g>
      </m.g>
    </m.g>
  )
}

/* ===== Legenda — swatch mini menggambar bentuk aslinya ===== */

const LEGEND: { key: LeafState; label: string }[] = [
  { key: 'full', label: 'Penuh' },
  { key: 'partial', label: 'Sebagian' },
  { key: 'missed', label: 'Terlewat' },
  { key: 'rest', label: 'Tanpa jadwal' },
  { key: 'future', label: 'Belum berjalan' },
]

function LegendSwatch({ state }: { state: LeafState }) {
  const accent = 'var(--module-accent)'
  return (
    <svg
      aria-hidden="true"
      viewBox="-14 -24 28 32"
      className="h-[18px] w-[18px] shrink-0"
    >
      {state === 'full' && (
        <g transform="translate(0,2) scale(0.9)">
          <path d={LEAF_FULL} fill={accent} />
        </g>
      )}
      {state === 'partial' && (
        <g transform="translate(0,2) scale(0.8)">
          <path d={LEAF_FULL} fill="none" stroke={accent} strokeWidth={2} />
          <path d={LEAF_LEFT} fill={accent} />
        </g>
      )}
      {state === 'missed' && (
        <g transform="translate(0,-2) rotate(125) scale(0.62)">
          <path d={LEAF_FULL} fill="none" stroke="var(--palette-clay)" strokeWidth={2.4} />
        </g>
      )}
      {state === 'rest' && (
        <circle cx={0} cy={-9} r={4} fill="none" stroke="var(--content-secondary)" strokeWidth={1.6} strokeDasharray="2.2 2.2" />
      )}
      {state === 'future' && (
        <circle cx={0} cy={-9} r={3.2} fill="none" stroke="var(--content-muted)" strokeWidth={1.4} strokeDasharray="1.6 1.8" opacity={0.5} />
      )}
    </svg>
  )
}

/* ===== Komponen utama ===== */

export function GrowthVine() {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const today = todayISO()
  const reducedMotion = useReducedMotion()
  const play = useFirstVisit('kebiasaan-vine') && !reducedMotion

  const days = useMemo(
    () => vineWeek(habits, completions, today),
    [habits, completions, today],
  )

  const [selIso, setSelIso] = useState<string | null>(null)
  const [detailDate, setDetailDate] = useState<string | null>(null)

  const selDay = selIso ? days.find((d) => d.iso === selIso) ?? null : null

  /* Ringkasan aksesibel untuk pembaca layar — tiap hari disebut ringkas. */
  const summary = `Tanaman merambat pekan ini: ${days
    .map((d) => {
      const s = leafStateOf(d)
      const v =
        s === 'future'
          ? 'belum berjalan'
          : d.pct == null
            ? 'tanpa jadwal'
            : `${d.done}/${d.due} (${d.pct}%)`
      return `${d.label} ${d.dateNum}: ${v}`
    })
    .join('; ')}.`

  return (
    <m.div
      initial={play ? { opacity: 0, y: 14 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={motionTokens.preset.chipReveal}
      className="mt-4"
    >
      <div className="garden-bed p-3.5 sm:p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-note font-semibold tracking-tight text-content-secondary">
            Sulur Pekan Ini
          </h3>
          <p className="text-chart-label font-medium whitespace-nowrap text-content-muted">
            Senin–Minggu · sesuai jadwal
          </p>
        </div>
        <p className="mt-0.5 text-chart-label leading-snug text-content-muted">
          Ketuk daun untuk membaca hari — kuncup putus-putus berarti tanpa
          jadwal, bukan terlewat.
        </p>

        <div className="relative mt-2">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="block h-auto w-full"
            role="img"
            aria-label={summary}
          >
            {/* Batang — digambar (pathLength 0→1) pada kunjungan pertama. */}
            <m.path
              d={stemPath()}
              fill="none"
              stroke="var(--module-accent)"
              strokeWidth={2}
              strokeLinecap="round"
              initial={play ? { pathLength: 0 } : false}
              animate={{ pathLength: 1 }}
              transition={motionTokens.preset.data}
            />

            {days.map((d, i) => {
              const node = NODES[i]
              if (!node) return null
              const state = leafStateOf(d)
              const selected = selIso === d.iso
              return (
                <g key={d.iso} transform={`translate(${node.x} ${node.y})`}>
                  {/* Cincin sorot hari ini & daun terpilih. */}
                  {(d.isToday || selected) && (
                    <circle
                      r={13.5}
                      fill="none"
                      stroke="var(--module-accent-strong)"
                      strokeWidth={1.6}
                      opacity={d.isToday ? 0.9 : 0.55}
                      strokeDasharray={selected && !d.isToday ? '3 3' : undefined}
                    />
                  )}
                  <VineLeaf
                    state={state}
                    isToday={d.isToday}
                    selected={selected}
                    play={play}
                    index={i}
                  />
                  {/* Label hari + tanggal di bawah simpul. */}
                  <text
                    x={0}
                    y={26}
                    textAnchor="middle"
                    fontSize={9.5}
                    fontWeight={d.isToday ? 800 : 600}
                    fill={
                      d.isToday
                        ? 'var(--module-accent-strong)'
                        : 'var(--content-secondary)'
                    }
                  >
                    {d.label}
                  </text>
                  <text
                    x={0}
                    y={37}
                    textAnchor="middle"
                    fontSize={7.5}
                    fontWeight={d.isToday ? 700 : 500}
                    fill="var(--content-muted)"
                  >
                    {d.dateNum}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* Lapisan tombol overlay — satu per hari, target sentuh lega. */}
          <div className="absolute inset-0 grid grid-cols-7">
            {days.map((d) => (
              <button
                key={d.iso}
                type="button"
                aria-pressed={selIso === d.iso}
                aria-label={dayText(d)}
                onClick={() => setSelIso((prev) => (prev === d.iso ? null : d.iso))}
                className="cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:[outline-offset:-2px] focus-visible:outline-primary"
              />
            ))}
          </div>
        </div>

        {/* Baris bacaan + pintu detail hari. */}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <p aria-live="polite" className="min-w-0 flex-1 text-eyebrow font-medium text-content-muted">
            {selDay ? dayText(selDay) : 'Ketuk daun untuk membaca hari.'}
          </p>
          {selDay && (
            <button
              type="button"
              onClick={() => setDetailDate(selDay.iso)}
              className="interactive h-8 shrink-0 cursor-pointer rounded-full border border-border-strong px-3.5 text-eyebrow font-semibold text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Lihat detail hari
            </button>
          )}
        </div>

        {/* Legenda bentuk (bukan warna saja). */}
        <ul
          aria-label="Legenda sulur pekan"
          className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-chart-label font-medium text-content-secondary"
        >
          {LEGEND.map((it) => (
            <li key={it.key} className="flex items-center gap-1.5">
              <LegendSwatch state={it.key} />
              {it.label}
            </li>
          ))}
        </ul>
      </div>

      <DayDetailSheet date={detailDate} onClose={() => setDetailDate(null)} />
    </m.div>
  )
}
