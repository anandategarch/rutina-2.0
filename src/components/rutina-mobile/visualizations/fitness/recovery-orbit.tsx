'use client'

import * as m from 'motion/react-m'
import { useReducedMotion } from 'motion/react'

import { useFirstVisit } from '@/lib/motion/first-visit'
import { motionTokens } from '@/lib/motion/tokens'

import { useSvgId } from '../shared/svg-id'

/**
 * Orbit Pemulihan — Warm Editorial Productivity, edisi visualisasi
 * ilustratif (v2.50 Tahap 2). Potret radial lima metrik check-in
 * tubuh: inti tenang di tengah (glif hati + tanggal catatan) dan
 * lima satelit yang mengorbit — Tidur (bulan sabit + busur jam vs
 * zona 8 jam), Energi (kilat + isi baterai 1–5), Nyeri otot (zigzag
 * + titik yang membesar mengikuti skala 1–5), Stres (gelombang yang
 * amplitudonya mengikuti skala 1–5), Hidrasi (tetesan dengan level
 * isi vs target gelas).
 *
 * Kejujuran data: skala tiap satelit berdiri sendiri — jam, skor,
 * dan gelas TIDAK pernah disatukan menjadi satu skor kesehatan di
 * komponen ini (skor "Kesiapan latihan" Coach Bugar adalah fitur
 * terpisah). Metrik yang belum diisi digambar sebagai satelit
 * netral putus-putus dengan "—" — "belum mencatat" ≠ "nol".
 *
 * A11y: SVG statis role="img"; seluruh nilai dirangkum dalam satu
 * aria-label (metrik hilang disebut "belum dicatat"), plus baris
 * kaki menjelaskan konvensi putus-putus.
 */

/* ===== Geometri (viewBox 0 0 240 240) ===== */

const CX = 120
const CY = 120
/** Jari-jari lintasan satelit. */
const ORBIT_R = 82
/** Jari-jari lingkar panduan dekoratif — di antara inti dan satelit,
 *  tidak menembus teks nilai satelit atas (pusat nilai y≈58). */
const GUIDE_R = 58

/** Posisi satelit — sudut dari pukul dua belas, searah jarum jam. */
function satPos(deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180
  return [CX + ORBIT_R * Math.cos(rad), CY + ORBIT_R * Math.sin(rad)]
}

/** Titik pada busur semicircle tidur (f = 0 kiri … 1 kanan). */
const sleepPt = (x: number, y: number, f: number): [number, number] => [
  x - 11 * Math.cos(f * Math.PI),
  y + 7 - 11 * Math.sin(f * Math.PI),
]

const MOON_PATH = 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'
const BOLT_PATH = 'M13 2 3 14h7l-1 8 10-12h-7l1-8Z'
const DROP_PATH =
  'M12 2.7C15.5 7.2 19 10.8 19 14.7A7 7 0 1 1 5 14.7C5 10.8 8.5 7.2 12 2.7Z'
const HEART_PATH =
  'M120 122.5c-2-1.6-7.5-4.6-7.5-8.7 0-2.7 2-4.5 4.3-4.5 1.4 0 2.4.8 3.2 1.7.8-.9 1.8-1.7 3.2-1.7 2.3 0 4.3 1.8 4.3 4.5 0 4.1-5.5 7.1-7.5 8.7Z'

const fmtJam = (n: number): string => n.toFixed(1).replace('.', ',')

export interface RecoveryOrbitProps {
  /** Jam tidur terakhir tercatat — null bila belum pernah. */
  sleepH: number | null
  /** Energi 1–5 (1 = sangat lelah, 5 = bugar). */
  energy: number | null
  /** Nyeri otot / DOMS 1–5 (5 = sangat nyeri). */
  soreness: number | null
  /** Stres 1–5 (5 = sangat stres). */
  stress: number | null
  /** Gelas air terakhir tercatat. */
  water: number | null
  /** Target gelas harian — skala level tetesan (bawaan 8). */
  waterTarget?: number
  /** Label tanggal catatan, mis. "Hari ini" / "12 Jan". */
  date?: string
  className?: string
}

export function RecoveryOrbit({
  sleepH,
  energy,
  soreness,
  stress,
  water,
  waterTarget = 8,
  date,
  className,
}: RecoveryOrbitProps) {
  const first = useFirstVisit('tubuh-recovery-orbit')
  const reduced = useReducedMotion()
  const dropClip = useSvgId('orbit-drop')

  /* Semua metrik kosong — komponen bersama: pemanggil menampilkan
     keadaan kosongnya sendiri (pola MacroPlate). */
  if (
    sleepH == null &&
    energy == null &&
    soreness == null &&
    stress == null &&
    water == null
  )
    return null

  const [sleepX, sleepY] = satPos(0)
  const [energyX, energyY] = satPos(72)
  const [waterX, waterY] = satPos(144)
  const [soreX, soreY] = satPos(216)
  const [stressX, stressY] = satPos(288)

  /* Level isi tetesan — dibatasi 0–1; nilai asli tetap di teks. */
  const waterFrac = Math.max(0, Math.min((water ?? 0) / waterTarget, 1))
  /* Amplitudo gelombang stres — 1 tenang … 5 tinggi (visual ≈ c/2). */
  const waveC = 2 + (stress ?? 1) * 1.2

  /* Ringkasan a11y — metrik terisi bernilai, yang kosong dinyatakan. */
  const parts: string[] = []
  const missing: string[] = []
  if (sleepH != null) parts.push(`tidur ${fmtJam(sleepH)} jam`)
  else missing.push('tidur')
  if (energy != null) parts.push(`energi ${energy} dari 5`)
  else missing.push('energi')
  if (soreness != null) parts.push(`nyeri otot ${soreness} dari 5`)
  else missing.push('nyeri otot')
  if (stress != null) parts.push(`stres ${stress} dari 5`)
  else missing.push('stres')
  if (water != null) parts.push(`hidrasi ${water} dari ${waterTarget} gelas`)
  else missing.push('hidrasi')

  /** Animasi satelit — rakitan satu kali, tidak ada rotasi kontinu. */
  const satAnim = (i: number) => ({
    initial: first && !reduced ? ({ opacity: 0, scale: 0.55 } as const) : false,
    animate: { opacity: 1, scale: 1 },
    transition: {
      duration: motionTokens.preset.data.duration,
      delay: first && !reduced
        ? motionTokens.delay.step + i * motionTokens.stagger.normal
        : 0,
      ease: motionTokens.easing.entrance,
    },
  })

  return (
    <div className={className}>
      <svg
        viewBox="0 0 240 240"
        className="mx-auto block w-full max-w-[250px]"
        role="img"
        aria-label={`Orbit pemulihan (${date ?? 'hari ini'}): ${parts.join(
          ', ',
        )}${missing.length ? `; ${missing.join(', ')} belum dicatat` : ''}`}
      >
        {/* Lingkar panduan orbit — dekoratif. */}
        <m.circle
          cx={CX}
          cy={CY}
          r={GUIDE_R}
          fill="none"
          stroke="var(--content-muted)"
          strokeOpacity="0.22"
          strokeWidth="1"
          strokeDasharray="2 6"
          initial={first && !reduced ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={motionTokens.preset.data}
        />

        {/* Inti tenang — hati + tanggal catatan. */}
        <m.g
          initial={first && !reduced ? { opacity: 0, scale: 0.8 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: motionTokens.preset.data.duration,
            ease: motionTokens.easing.entrance,
          }}
          style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}
        >
          <circle
            cx={CX}
            cy={CY}
            r="34"
            fill="var(--surface-sunken)"
            stroke="var(--border)"
            strokeWidth="1"
          />
          <path d={HEART_PATH} fill="var(--palette-clay)" />
          <text
            x={CX}
            y="136"
            fontSize="9.5"
            fontWeight="700"
            textAnchor="middle"
            fill="var(--content-secondary)"
          >
            {date ?? 'Hari ini'}
          </text>
        </m.g>

        {/* Tidur — bulan sabit + busur jam terhadap zona 8 jam. */}
        <m.g {...satAnim(0)} style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}>
          <g
            transform={`translate(${sleepX - 8},${sleepY - 22}) scale(0.6667)`}
          >
            <path
              d={MOON_PATH}
              fill={sleepH != null ? 'var(--palette-gold)' : 'none'}
              stroke="var(--palette-gold)"
              strokeOpacity={sleepH != null ? undefined : 0.55}
              strokeWidth={sleepH != null ? 0 : 2.5}
              strokeDasharray={sleepH != null ? undefined : '4 3'}
            />
          </g>
          {sleepH != null && (
            <>
              <path
                d={`M${sleepX - 11} ${sleepY + 7} A11 11 0 0 1 ${sleepX + 11} ${sleepY + 7}`}
                fill="none"
                stroke="var(--content-muted)"
                strokeOpacity="0.25"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Zona 7–8 jam di ujung kanan busur — penanda target. */}
              <path
                d={`M${sleepPt(sleepX, sleepY, 0.875).map((v) => v.toFixed(1)).join(' ')} A11 11 0 0 1 ${sleepX + 11} ${sleepY + 7}`}
                fill="none"
                stroke="var(--palette-gold)"
                strokeOpacity="0.45"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d={`M${sleepX - 11} ${sleepY + 7} A11 11 0 0 1 ${sleepPt(
                  sleepX,
                  sleepY,
                  Math.min(sleepH / 8, 1),
                )
                  .map((v) => v.toFixed(1))
                  .join(' ')}`}
                fill="none"
                stroke="var(--palette-gold)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </>
          )}
          <text
            x={sleepX}
            y={sleepY + 20}
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
            fill="var(--content-primary)"
          >
            {sleepH != null ? `${fmtJam(sleepH)} jam` : '—'}
          </text>
          <text
            x={sleepX}
            y={sleepY + 29}
            fontSize="8"
            fontWeight="600"
            textAnchor="middle"
            fill="var(--content-muted)"
          >
            Tidur
          </text>
        </m.g>

        {/* Energi — kilat + baterai lima sel (isi = skor 1–5). */}
        <m.g {...satAnim(1)} style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}>
          <g
            transform={`translate(${energyX - 7.3},${energyY - 22}) scale(0.6667)`}
          >
            <path
              d={BOLT_PATH}
              fill={energy != null ? 'var(--chart-stroke-1)' : 'none'}
              stroke="var(--chart-stroke-1)"
              strokeOpacity={energy != null ? undefined : 0.55}
              strokeWidth={energy != null ? 0 : 3}
              strokeDasharray={energy != null ? undefined : '4 3'}
            />
          </g>
          {energy != null && (
            <>
              <rect
                x={energyX - 12}
                y={energyY - 1}
                width="22"
                height="10"
                rx="2"
                fill="none"
                stroke="var(--content-muted)"
                strokeOpacity="0.5"
                strokeWidth="1.2"
              />
              <rect
                x={energyX + 10.5}
                y={energyY + 2}
                width="2.5"
                height="4"
                rx="0.8"
                fill="var(--content-muted)"
                fillOpacity="0.5"
              />
              {[0, 1, 2, 3, 4].map((i) => (
                <rect
                  key={i}
                  x={energyX - 10.5 + i * 3.9}
                  y={energyY + 0.5}
                  width="3"
                  height="7"
                  rx="0.8"
                  fill={
                    i < energy
                      ? 'var(--chart-stroke-1)'
                      : 'var(--surface-sunken)'
                  }
                />
              ))}
            </>
          )}
          <text
            x={energyX}
            y={energyY + 20}
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
            fill="var(--content-primary)"
          >
            {energy != null ? `${energy}/5` : '—'}
          </text>
          <text
            x={energyX}
            y={energyY + 29}
            fontSize="8"
            fontWeight="600"
            textAnchor="middle"
            fill="var(--content-muted)"
          >
            Energi
          </text>
        </m.g>

        {/* Hidrasi — tetesan dengan level isi vs target gelas. */}
        <m.g {...satAnim(2)} style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}>
          <g transform={`translate(${waterX - 8.4},${waterY - 20.5}) scale(0.7)`}>
            <clipPath id={dropClip}>
              <path d={DROP_PATH} />
            </clipPath>
            {water != null && waterFrac > 0 && (
              <rect
                x="4"
                y={21.7 - waterFrac * 19}
                width="16"
                height={waterFrac * 19}
                fill="var(--palette-pistachio)"
                clipPath={`url(#${dropClip})`}
              />
            )}
            <path
              d={DROP_PATH}
              fill="none"
              stroke="var(--palette-matcha-action)"
              strokeWidth="2"
              strokeDasharray={water != null ? undefined : '4 3'}
              strokeOpacity={water != null ? undefined : 0.6}
            />
          </g>
          <text
            x={waterX}
            y={waterY + 20}
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
            fill="var(--content-primary)"
          >
            {water != null ? `${water}/${waterTarget} gelas` : '—'}
          </text>
          <text
            x={waterX}
            y={waterY + 29}
            fontSize="8"
            fontWeight="600"
            textAnchor="middle"
            fill="var(--content-muted)"
          >
            Hidrasi
          </text>
        </m.g>

        {/* Nyeri otot — zigzag + titik yang membesar (1 kecil … 5 penuh). */}
        <m.g {...satAnim(3)} style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}>
          <path
            d={`M${soreX - 9} ${soreY - 10} L${soreX - 4} ${soreY - 19} L${soreX} ${soreY - 10} L${soreX + 5} ${soreY - 19} L${soreX + 9} ${soreY - 10}`}
            fill="none"
            stroke="var(--palette-clay)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={soreness != null ? undefined : '3 3'}
            strokeOpacity={soreness != null ? undefined : 0.55}
          />
          {soreness != null && (
            <>
              <circle
                cx={soreX}
                cy={soreY + 4}
                r="6.3"
                fill="none"
                stroke="var(--palette-clay)"
                strokeOpacity="0.35"
                strokeWidth="1"
                strokeDasharray="2 2.5"
              />
              <circle
                cx={soreX}
                cy={soreY + 4}
                r={(1.7 + 0.88 * soreness).toFixed(2)}
                fill="var(--palette-clay)"
              />
            </>
          )}
          <text
            x={soreX}
            y={soreY + 20}
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
            fill="var(--content-primary)"
          >
            {soreness != null ? `${soreness}/5` : '—'}
          </text>
          <text
            x={soreX}
            y={soreY + 29}
            fontSize="8"
            fontWeight="600"
            textAnchor="middle"
            fill="var(--content-muted)"
          >
            Nyeri otot
          </text>
        </m.g>

        {/* Stres — gelombang; amplitudo mengikuti skala 1–5. */}
        <m.g {...satAnim(4)} style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}>
          <path
            d={
              stress != null
                ? `M${stressX - 11} ${stressY - 14} q2.75 ${-waveC} 5.5 0 t5.5 0 t5.5 0 t5.5 0`
                : `M${stressX - 11} ${stressY - 14} L${stressX + 11} ${stressY - 14}`
            }
            fill="none"
            stroke="var(--palette-cocoa)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={stress != null ? undefined : '3 3'}
            strokeOpacity={stress != null ? undefined : 0.55}
          />
          <text
            x={stressX}
            y={stressY + 20}
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
            fill="var(--content-primary)"
          >
            {stress != null ? `${stress}/5` : '—'}
          </text>
          <text
            x={stressX}
            y={stressY + 29}
            fontSize="8"
            fontWeight="600"
            textAnchor="middle"
            fill="var(--content-muted)"
          >
            Stres
          </text>
        </m.g>
      </svg>

      {/* Konvensi kejujuran — satelit putus-putus bukan nol. */}
      {missing.length > 0 && (
        <p className="mt-1 text-center text-chart-label leading-relaxed text-content-muted">
          Satelit putus-putus berarti belum dicatat — bukan nol.
        </p>
      )}
    </div>
  )
}
