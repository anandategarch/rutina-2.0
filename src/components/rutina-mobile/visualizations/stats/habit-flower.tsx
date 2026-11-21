'use client'

import { useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'

import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { pressSnappy } from '@/lib/motion/transitions'

/**
 * Habit Flower Wheel — komposisi kategori kebiasaan aktif sebagai bunga
 * radial (pengganti donut PieChart Recharts, Wawasan Statistik).
 *
 * Tetap terbaca sebagai data: satu kelopak per kategori (hanya yang
 * punya kebiasaan aktif), sudut sama rata 360/N; PANJANG kelopak memetakan
 * jumlah secara LINEAR — outerR = 24 + (value/max)×34 — perbedaan terlihat
 * tanpa dilebih-lebihkan. Pusat = total kebiasaan aktif.
 *
 * Interaksi: baris legenda adalah pemilih utama (tombol nyata, aksesible
 * papan tik); kelopak juga bisa diketuk (klik SVG). Kelopak terpilih
 * terangkat 2px + opasitas penuh; lainnya meredup ke 55%.
 */

export interface FlowerSlice {
  name: string
  value: number
  /** Token warna kategori — var(--habit-cat-*). */
  color: string
}

/* ===== Geometri kelopak ===== */

const CX = 70
const CY = 70
/** Radius pangkal kelopak — tersembunyi di bawah piringan pusat. */
const R_BASE = 17
/** Pemetaan panjang: outerR = R_MIN + (value/max) × R_SPAN (linear). */
const R_MIN = 24
const R_SPAN = 34

function polar(r: number, angleDeg: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180
  return [CX + Math.cos(a) * r, CY + Math.sin(a) * r]
}

/** Kelopak memanjang bermata bulat: dua kubik + tudung ujung kuadratik —
    botani, tidak runcing. Koordinat absolut pada viewBox 140×140. */
function petalPath(angleDeg: number, outerR: number): string {
  const rad = (angleDeg * Math.PI) / 180
  const dx = Math.cos(rad)
  const dy = Math.sin(rad)
  const px = -Math.sin(rad)
  const py = Math.cos(rad)
  const span = outerR - R_BASE
  const at = (r: number, side: number, halfW: number): [number, number] => [
    CX + dx * r + px * halfW * side,
    CY + dy * r + py * halfW * side,
  ]
  const fmt = (p: [number, number]) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`
  const wBase = 4.6
  const wMid = 6.6
  const wTip = 1.7
  const A = at(R_BASE, 1, wBase)
  const c1 = at(R_BASE + span * 0.3, 1, wMid)
  const c2 = at(R_BASE + span * 0.72, 1, wTip * 2.1)
  const T1 = at(outerR - 2.3, 1, wTip)
  const tip = polar(outerR + 1.6, angleDeg)
  const T2 = at(outerR - 2.3, -1, wTip)
  const c3 = at(R_BASE + span * 0.72, -1, wTip * 2.1)
  const c4 = at(R_BASE + span * 0.3, -1, wMid)
  const B = at(R_BASE, -1, wBase)
  return `M ${fmt(A)} C ${fmt(c1)} ${fmt(c2)} ${fmt(T1)} Q ${fmt(
    [tip[0], tip[1]],
  )} ${fmt(T2)} C ${fmt(c3)} ${fmt(c4)} ${fmt(B)} Z`
}

/** Bidang ketuk sektoral per kelopak (transparan, menerima pointer). */
function wedgePath(angleDeg: number, sectorDeg: number, outerR: number): string {
  const half = Math.min(88, (sectorDeg / 2) * 0.92)
  const r0 = R_BASE + 0.5
  const r1 = Math.min(69, outerR + 5)
  const a0 = angleDeg - half
  const a1 = angleDeg + half
  const p0 = polar(r0, a0)
  const p1 = polar(r1, a0)
  const p2 = polar(r1, a1)
  const p3 = polar(r0, a1)
  const f = (p: [number, number]) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`
  return `M ${f(p0)} L ${f(p1)} A ${r1} ${r1} 0 0 1 ${f(p2)} L ${f(
    p3,
  )} A ${r0} ${r0} 0 0 0 ${f(p0)} Z`
}

/* ===== Komponen ===== */

export function HabitFlower({
  data,
  total,
}: {
  /** Kategori dengan value > 0 (categoryData di layar Statistik). */
  data: FlowerSlice[]
  /** Total kebiasaan aktif — angka pusat bunga. */
  total: number
}) {
  const reducedMotion = useReducedMotion()
  const play = useFirstVisit('stats-flower') && !reducedMotion
  const [selName, setSelName] = useState<string | null>(null)

  const petals = useMemo(() => {
    const maxValue = Math.max(...data.map((d) => d.value), 1)
    const sector = data.length > 0 ? 360 / data.length : 360
    return data.map((d, i) => {
      const angle = -90 + i * sector
      return {
        ...d,
        angle,
        sector,
        outerR: R_MIN + (d.value / maxValue) * R_SPAN,
      }
    })
  }, [data])

  const sel = selName ? petals.find((p) => p.name === selName) ?? null : null

  const ariaSummary = `Komposisi kebiasaan aktif: ${data
    .map((d) => `${d.name} ${d.value}`)
    .join(', ')} — total ${total} kebiasaan`

  return (
    <div className="mt-3">
      <div className="flex items-center gap-4">
        <div className="relative h-32 w-32 shrink-0">
          <svg
            viewBox="0 0 140 140"
            className="h-full w-full"
            role="img"
            aria-label={ariaSummary}
          >
            {petals.map((p, i) => {
              const isSel = selName === p.name
              const hasSel = selName != null
              const rad = (p.angle * Math.PI) / 180
              const lift = isSel ? 2 : 0
              return (
                <m.g
                  key={p.name}
                  initial={play ? { scale: 0 } : false}
                  animate={{ scale: 1 }}
                  transition={{
                    ...motionTokens.preset.celebration,
                    delay: motionTokens.delay.tight + i * motionTokens.stagger.tight,
                  }}
                  style={{
                    transformBox: 'view-box',
                    transformOrigin: '50% 50%',
                  }}
                >
                  <m.g
                    animate={{
                      x: Math.cos(rad) * lift,
                      y: Math.sin(rad) * lift,
                      opacity: isSel ? 1 : hasSel ? 0.55 : 0.85,
                    }}
                    transition={pressSnappy}
                  >
                    <path
                      d={petalPath(p.angle, p.outerR)}
                      fill={p.color}
                      stroke="var(--surface-primary)"
                      strokeWidth={2}
                      className="cursor-pointer"
                      onClick={() =>
                        setSelName((prev) => (prev === p.name ? null : p.name))
                      }
                    />
                    {/* Bidang ketuk lebih lega dari bentuk kelopak. */}
                    {data.length === 1 ? (
                      <circle
                        cx={CX}
                        cy={CY}
                        r={(R_BASE + 0.5 + Math.min(69, p.outerR + 5)) / 2}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={
                          Math.min(69, p.outerR + 5) - (R_BASE + 0.5)
                        }
                        className="cursor-pointer"
                        onClick={() =>
                          setSelName((prev) => (prev === p.name ? null : p.name))
                        }
                      />
                    ) : (
                      <path
                        d={wedgePath(p.angle, p.sector, p.outerR)}
                        fill="transparent"
                        className="cursor-pointer"
                        onClick={() =>
                          setSelName((prev) => (prev === p.name ? null : p.name))
                        }
                      />
                    )}
                  </m.g>
                </m.g>
              )
            })}

            {/* Piringan pusat — menutup pangkal kelopak + angka total. */}
            <circle
              cx={CX}
              cy={CY}
              r={R_BASE - 0.5}
              fill="var(--surface-primary)"
              stroke="var(--border-default)"
              strokeWidth={1}
            />
            <text
              x={CX}
              y={CY - 1}
              textAnchor="middle"
              fontSize={18}
              fontWeight={700}
              fill="var(--content-primary)"
            >
              {total}
            </text>
            <text
              x={CX}
              y={CY + 10}
              textAnchor="middle"
              fontSize={6.5}
              fontWeight={600}
              fill="var(--content-muted)"
            >
              kebiasaan
            </text>
          </svg>
        </div>

        {/* Legenda — baris tombol adalah pemilih utama (aksesible papan
            tik); kuncup kelopak adalah jalur sentuh/klik tambahan. */}
        <ul
          className="min-w-0 flex-1 space-y-1"
          aria-label="Legenda kategori kebiasaan"
        >
          {petals.map((p) => {
            const isSel = selName === p.name
            const pct = Math.round((p.value / Math.max(1, total)) * 100)
            return (
              <li key={p.name}>
                <button
                  type="button"
                  aria-pressed={isSel}
                  aria-label={`${p.name}: ${p.value} kebiasaan (${pct}% dari total)`}
                  onClick={() =>
                    setSelName((prev) => (prev === p.name ? null : p.name))
                  }
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-left text-meta transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isSel
                      ? 'bg-module-accent-soft'
                      : 'hover:bg-surface-secondary'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-content-secondary">
                    {p.name}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-content-primary">
                    {p.value}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Pembacaan kategori terpilih. */}
      <p
        aria-live="polite"
        className="mt-2.5 text-eyebrow font-medium text-content-muted"
      >
        {sel
          ? `${sel.name}: ${sel.value} kebiasaan (${Math.round(
              (sel.value / Math.max(1, total)) * 100,
            )}% dari total)`
          : 'Ketuk kelopak atau baris kategori untuk membaca.'}
      </p>
    </div>
  )
}
