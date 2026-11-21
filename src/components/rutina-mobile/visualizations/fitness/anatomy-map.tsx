'use client'

import { useState } from 'react'
import * as m from 'motion/react-m'
import { useReducedMotion } from 'motion/react'

import { exerciseLabel } from '../../fitness/data'
import { shortDateLabel } from '../../store'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { motionTokens } from '@/lib/motion/tokens'

/**
 * Peta Anatomi Kelompok Otot — Warm Editorial Productivity, edisi
 * visualisasi ilustratif (v2.47).
 *
 * Siluet editorial dua sudut pandang (DEPAN / BELAKANG) dengan area
 * otot sebagai wilayah yang dapat dipilih; intensitas isi mengikuti
 * jumlah set relatif kelompok tersibuk. Komponen ini PRESENTASIONAL:
 * semua angka (set, tanggal, gerakan) datang dari adapter kartu.
 *
 * Aturan a11y: tiap wilayah = tombol sungguhan (role="button",
 * aria-pressed, label berangka), chip legenda jadi jalur keyboard /
 * mobile cadangan, baris bacaan aria-live mengumumkan ringkasan
 * kelompok terpilih — informasi tidak pernah lewat warna saja.
 */

/** Statistik satu kelompok otot — dihitung adapter (otot utama saja). */
export interface AnatomyGroupStat {
  group: string
  sets: number
  /** Tanggal sesi (ISO, unik) dengan ≥1 set untuk kelompok ini — terbaru dulu. */
  dates: string[]
  /** Semua gerakan pustaka penyumbang set. */
  exercises: string[]
}

type ViewId = 'depan' | 'belakang'

const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'depan', label: 'Depan' },
  { id: 'belakang', label: 'Belakang' },
]

/* ===== Geometri siluet (viewBox 0 0 140 260) ===== */

const TORSO_D =
  'M49,50 C56,42 84,42 91,50 C93,60 91,72 88,84 C87,96 85,104 84,111 C75,117 65,117 56,111 C55,104 53,96 52,84 C49,72 47,60 49,50 Z'
const PELVIS_D =
  'M56,109 C65,116 75,116 84,109 L82,127 C74,132 66,132 58,127 Z'
const ARM_L_D = 'M51,57 L37,123'
const ARM_R_D = 'M89,57 L103,123'
const LEG_L_D = 'M64,126 L60,242'
const LEG_R_D = 'M76,126 L80,242'

/** Bentuk dasar siluet — kepala, leher, torso, pinggul. */
function SilhouetteFill() {
  return (
    <g
      aria-hidden="true"
      pointerEvents="none"
      fill="var(--surface-sunken)"
      stroke="var(--border)"
      strokeWidth="1"
    >
      <circle cx="70" cy="22" r="12" />
      <rect x="64" y="32" width="12" height="9" rx="3" />
      <path d={TORSO_D} />
      <path d={PELVIS_D} />
      <path
        d={ARM_L_D}
        fill="none"
        stroke="var(--surface-sunken)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d={ARM_R_D}
        fill="none"
        stroke="var(--surface-sunken)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d={LEG_L_D}
        fill="none"
        stroke="var(--surface-sunken)"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d={LEG_R_D}
        fill="none"
        stroke="var(--surface-sunken)"
        strokeWidth="15"
        strokeLinecap="round"
      />
    </g>
  )
}

/** Garis luar seluruh badan — wilayah "Seluruh badan" (hanya garis). */
function FullBodyOutline({
  color,
  opacity,
  width,
}: {
  color: string
  opacity: number
  width: number
}) {
  const common = {
    fill: 'none' as const,
    stroke: color,
    opacity,
    strokeWidth: width,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    /* Fokus keyboard terlihat (WCAG 2.4.7, audit v2.47.1): warna aksen
       kuat + penebalan garis — setara cincin fokus wilayah otot. */
    className:
      'transition-colors group-focus-visible:stroke-module-accent-strong group-focus-visible:stroke-[4.5]',
  }
  return (
    <g pointerEvents="stroke">
      <circle cx="70" cy="22" r="12" {...common} />
      <rect x="64" y="32" width="12" height="9" rx="3" {...common} />
      <path d={TORSO_D} {...common} />
      <path d={PELVIS_D} {...common} />
      <path d={ARM_L_D} {...common} />
      <path d={ARM_R_D} {...common} />
      <path d={LEG_L_D} {...common} />
      <path d={LEG_R_D} {...common} />
    </g>
  )
}

/* ===== Wilayah otot per sudut pandang ===== */

type RegionShape =
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx: number }
  | { kind: 'capsule'; d: string; width: number }

interface RegionEntry {
  group: string
  shapes: RegionShape[]
}

const circ = (cx: number, cy: number, r: number): RegionShape => ({
  kind: 'circle',
  cx,
  cy,
  r,
})
const box = (
  x: number,
  y: number,
  w: number,
  h: number,
  rx: number,
): RegionShape => ({ kind: 'rect', x, y, w, h, rx })
const capsule = (d: string, width: number): RegionShape => ({
  kind: 'capsule',
  d,
  width,
})

/* Delta depan/belakang + lengan & kaki dipakai dua sudut pandang. */
const SHOULDER_SHAPES: RegionShape[] = [circ(50.5, 56, 6.5), circ(89.5, 56, 6.5)]
const ARM_SHAPES: RegionShape[] = [
  capsule('M52,64 L39,118', 6),
  capsule('M88,64 L101,118', 6),
]
const LEG_SHAPES: RegionShape[] = [
  capsule('M64.5,129 L61,238', 11),
  capsule('M75.5,129 L79,238', 11),
]

const FRONT_REGIONS: RegionEntry[] = [
  { group: 'Bahu', shapes: SHOULDER_SHAPES },
  { group: 'Dada', shapes: [box(55.5, 51, 13, 17, 5.5), box(71.5, 51, 13, 17, 5.5)] },
  { group: 'Lengan', shapes: ARM_SHAPES },
  { group: 'Inti', shapes: [box(62.5, 71, 15, 31, 6)] },
  { group: 'Kaki', shapes: LEG_SHAPES },
]

const BACK_REGIONS: RegionEntry[] = [
  { group: 'Bahu', shapes: SHOULDER_SHAPES },
  {
    group: 'Punggung',
    shapes: [box(61.5, 48, 17, 11, 4), box(57.5, 58, 25, 46, 9)],
  },
  { group: 'Lengan', shapes: ARM_SHAPES },
  { group: 'Kaki', shapes: LEG_SHAPES },
]

/* ===== Warna wilayah — intensitas ∝ set / set maksimum ===== */

interface RegionPaint {
  color: string
  opacity: number
  stroke: string
  strokeWidth: number
}

function regionPaint(sets: number, maxSets: number, selected: boolean): RegionPaint {
  if (selected) {
    return {
      color: 'var(--module-accent-strong)',
      opacity: 0.92,
      stroke: 'var(--module-accent-strong)',
      strokeWidth: 1.5,
    }
  }
  if (sets > 0) {
    const t = maxSets > 0 ? sets / maxSets : 0
    return {
      color: 'var(--module-accent)',
      opacity: 0.3 + 0.5 * t,
      stroke: 'none',
      strokeWidth: 0,
    }
  }
  /* 0 set ≠ 0 data — tetap digambar netral, bukan disembunyikan. */
  return { color: 'var(--content-muted)', opacity: 0.14, stroke: 'none', strokeWidth: 0 }
}

function outlinePaint(sets: number, maxSets: number, selected: boolean) {
  if (selected) {
    return { color: 'var(--module-accent-strong)', opacity: 1, width: 3.5 }
  }
  if (sets > 0) {
    const t = maxSets > 0 ? sets / maxSets : 0
    return { color: 'var(--module-accent)', opacity: 0.5 + 0.4 * t, width: 2.5 }
  }
  return { color: 'var(--content-muted)', opacity: 0.32, width: 2 }
}

/** Satu bentuk wilayah dengan cat region — kelas fokus membawa cincin. */
function RegionShapeNode({
  shape,
  paint,
}: {
  shape: RegionShape
  paint: RegionPaint
}) {
  if (shape.kind === 'circle') {
    return (
      <circle
        cx={shape.cx}
        cy={shape.cy}
        r={shape.r}
        fill={paint.color}
        fillOpacity={paint.opacity}
        stroke={paint.stroke}
        strokeWidth={paint.strokeWidth}
        className="transition-colors group-focus-visible:stroke-module-accent-strong group-focus-visible:stroke-[1.5]"
      />
    )
  }
  if (shape.kind === 'rect') {
    return (
      <rect
        x={shape.x}
        y={shape.y}
        width={shape.w}
        height={shape.h}
        rx={shape.rx}
        fill={paint.color}
        fillOpacity={paint.opacity}
        stroke={paint.stroke}
        strokeWidth={paint.strokeWidth}
        className="transition-colors group-focus-visible:stroke-module-accent-strong group-focus-visible:stroke-[1.5]"
      />
    )
  }
  return (
    <path
      d={shape.d}
      fill="none"
      stroke={paint.color}
      strokeOpacity={paint.opacity}
      strokeWidth={shape.width}
      strokeLinecap="round"
      className="transition-colors group-focus-visible:stroke-module-accent-strong group-focus-visible:[stroke-dasharray:3_2.5]"
    />
  )
}

/* ===== Area sentuh (audit v2.47.1) ===== */

/** Penebal area sentuh kotak/lingkaran per sisi (satuan viewBox;
 *  render maks 220px → 5,5 unit ≈ 8,6px per sisi). */
const HIT_PAD = 5.5
/** Lebar garis sentuh kapsul (lengan/kaki) — ±11 unit ≈ ±17px pada
 *  render 220px; target sentuh efektif ≥24px di sepanjang anggota. */
const HIT_STROKE = 22

/** Bentuk sentuh TAK TERLIHAT per wilayah — mengikuti geometri wilayah
 *  (kapsul diperlebar garisnya, kotak/lingkaran diperluas bbox-nya)
 *  sehingga tiap wilayah punya target ≥24px TANPA mencuri ketukan
 *  wilayah lain; ujung kapsul sengaja rata (bukan round) agar garis
 *  pinggul siluet tetap bisa diketuk. pointerEvents="all" membuat
 *  garis/isian transparan tetap dapat diuji kursor. */
function RegionHitShape({ shape }: { shape: RegionShape }) {
  if (shape.kind === 'circle') {
    return (
      <circle
        cx={shape.cx}
        cy={shape.cy}
        r={shape.r + HIT_PAD}
        fill="transparent"
        pointerEvents="all"
      />
    )
  }
  if (shape.kind === 'rect') {
    return (
      <rect
        x={shape.x - HIT_PAD}
        y={shape.y - HIT_PAD}
        width={shape.w + HIT_PAD * 2}
        height={shape.h + HIT_PAD * 2}
        rx={shape.rx + HIT_PAD}
        fill="transparent"
        pointerEvents="all"
      />
    )
  }
  return (
    <path
      d={shape.d}
      fill="none"
      stroke="transparent"
      strokeWidth={HIT_STROKE}
      pointerEvents="all"
    />
  )
}

/* ===== Komponen utama ===== */

export function AnatomyMap({
  stats,
  maxSets,
  selected,
  onSelect,
  windowLabel,
}: {
  /** Statistik 7 kelompok (urutan bebas — legenda mengikuti urutan ini). */
  stats: AnatomyGroupStat[]
  /** Set terbanyak sepanjang jendela — dasar skala intensitas. */
  maxSets: number
  selected: string | null
  onSelect: (group: string | null) => void
  /** Label jendela waktu, mis. "30 hari" — untuk teks konteks. */
  windowLabel: string
}) {
  const [view, setView] = useState<ViewId>('depan')
  const first = useFirstVisit('bugar-anatomy')
  const reduced = useReducedMotion()

  const byGroup = new Map(stats.map((s) => [s.group, s] as const))
  const regions = view === 'depan' ? FRONT_REGIONS : BACK_REGIONS
  const selStat = selected != null ? (byGroup.get(selected) ?? null) : null
  const top = [...stats].sort((a, b) => b.sets - a.sets)[0] ?? null

  const regionAria = (group: string, sets: number, sessions: number) =>
    sets > 0
      ? `Otot ${group}: ${sets} set dari ${sessions} sesi latihan`
      : `Otot ${group}: belum ada set tercatat`

  const toggle = (group: string) => onSelect(selected === group ? null : group)

  const fullStat = byGroup.get('Seluruh badan')
  const fullSets = fullStat?.sets ?? 0
  const fullPaint = outlinePaint(fullSets, maxSets, selected === 'Seluruh badan')

  return (
    <div>
      {/* Sudut pandang — Depan / Belakang */}
      <div className="flex justify-center">
        <div
          role="group"
          aria-label="Sudut pandang peta anatomi"
          className="flex gap-1 rounded-full bg-surface-sunken p-0.5"
        >
          {VIEWS.map((v) => {
            const on = view === v.id
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                aria-pressed={on}
                className={
                  'interactive h-9 cursor-pointer rounded-full px-2.5 text-eyebrow font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-strong ' +
                  (on
                    ? 'bg-surface-inverse text-content-inverse shadow-soft'
                    : 'text-content-secondary hover:text-content-primary')
                }
              >
                {v.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Peta + panel rincian — bertumpuk di ponsel, berdampingan ≥sm */}
      <div className="mt-3 flex flex-col items-center gap-3.5 sm:flex-row sm:items-stretch">
        <svg
          viewBox="0 0 140 260"
          role="group"
          aria-label="Peta anatomi kelompok otot"
          className="mx-auto w-full max-w-[220px] shrink-0"
        >
          <m.g
            key={view}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: motionTokens.duration.fast,
              ease: motionTokens.easing.standard,
            }}
          >
            <SilhouetteFill />

            {/* "Seluruh badan" — garis luar siluet, bukan wilayah palsu.
                Digambar SEBELUM wilayah otot (audit v2.47.1) supaya
                wilayah menang pada area tumpang-tindih; garis kepala/
                leher/torso/pinggul tetap dapat diketuk. Klik pada
                garis; pengguna keyboard memakai chip legenda. */}
            <m.g
              role="button"
              tabIndex={0}
              aria-pressed={selected === 'Seluruh badan'}
              aria-label={regionAria(
                'Seluruh badan',
                fullSets,
                fullStat?.dates.length ?? 0,
              )}
              onClick={() => toggle('Seluruh badan')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toggle('Seluruh badan')
                }
              }}
              initial={first && !reduced ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{
                duration: motionTokens.duration.normal,
                delay: first && !reduced
                  ? regions.length * motionTokens.stagger.tight
                  : 0,
                ease: motionTokens.easing.standard,
              }}
              className="group cursor-pointer outline-none"
            >
              <FullBodyOutline
                color={fullPaint.color}
                opacity={fullPaint.opacity}
                width={fullPaint.width}
              />
            </m.g>

            {regions.map((reg, i) => {
              const stat = byGroup.get(reg.group)
              const sets = stat?.sets ?? 0
              const isSel = selected === reg.group
              const paint = regionPaint(sets, maxSets, isSel)
              return (
                <m.g
                  key={`${view}-${reg.group}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSel}
                  aria-label={regionAria(reg.group, sets, stat?.dates.length ?? 0)}
                  onClick={() => toggle(reg.group)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggle(reg.group)
                    }
                  }}
                  initial={first && !reduced ? { opacity: 0 } : false}
                  animate={{ opacity: 1, scale: isSel ? 1.035 : 1 }}
                  transition={
                    isSel
                      ? motionTokens.spring.snappy
                      : {
                          duration: motionTokens.duration.normal,
                          delay: first && !reduced
                            ? i * motionTokens.stagger.tight
                            : 0,
                          ease: motionTokens.easing.standard,
                        }
                  }
                  style={{
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                  }}
                  className="group cursor-pointer outline-none"
                >
                  {/* Area sentuh tak terlihat — target ≥24px per wilayah
                      (audit v2.47.1); di dalam grup yang sama agar
                      ketukan memilih wilayah ini juga. */}
                  {reg.shapes.map((sh, si) => (
                    <RegionHitShape key={`hit-${si}`} shape={sh} />
                  ))}
                  {reg.shapes.map((sh, si) => (
                    <RegionShapeNode key={si} shape={sh} paint={paint} />
                  ))}
                </m.g>
              )
            })}
          </m.g>
        </svg>

        {/* Panel rincian kelompok terpilih */}
        <div className="min-w-0 flex-1 self-stretch rounded-xl bg-surface-sunken p-3.5">
          {selStat ? (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-note font-bold text-content-primary">
                  {selStat.group}
                </p>
                <p className="text-meta font-bold tabular-nums text-module-accent-strong">
                  {selStat.sets} set
                </p>
              </div>
              <p className="mt-0.5 text-chart-label font-medium text-content-muted">
                {selStat.dates.length} sesi latihan dalam {windowLabel} ·{' '}
                {selStat.exercises.length} gerakan penyumbang
              </p>
              {selStat.dates.length > 0 && (
                <div className="mt-2">
                  <p className="text-eyebrow font-semibold uppercase tracking-[0.1em] text-content-muted">
                    Tanggal latihan
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selStat.dates.slice(0, 5).map((d) => (
                      <span
                        key={d}
                        className="rounded-full bg-surface-primary px-2 py-0.5 text-chart-label font-semibold text-content-secondary tabular-nums"
                      >
                        {shortDateLabel(d)}
                      </span>
                    ))}
                    {selStat.dates.length > 5 && (
                      <span className="rounded-full px-2 py-0.5 text-chart-label font-medium text-content-muted tabular-nums">
                        +{selStat.dates.length - 5} lainnya
                      </span>
                    )}
                  </div>
                </div>
              )}
              {selStat.exercises.length > 0 && (
                <div className="mt-2">
                  <p className="text-eyebrow font-semibold uppercase tracking-[0.1em] text-content-muted">
                    Gerakan
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selStat.exercises.map((ex) => (
                      <span
                        key={ex}
                        className="rounded-md bg-surface-primary px-1.5 py-0.5 text-chart-label text-content-secondary"
                      >
                        {exerciseLabel(ex)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-note font-bold text-content-primary">
                Peta otot · {view === 'depan' ? 'tampilan depan' : 'tampilan belakang'}
              </p>
              <p className="mt-1 text-chart-label leading-relaxed text-content-muted">
                Ketuk area otot pada peta — atau chip kelompok di bawah —
                untuk membaca jumlah set, sesi, tanggal, dan gerakan
                penyumbangnya.
              </p>
              {top && top.sets > 0 && (
                <p className="mt-2 text-chart-label leading-relaxed text-content-muted">
                  Paling banyak dilatih:{' '}
                  <span className="font-bold text-module-accent-strong">
                    {top.group}
                  </span>{' '}
                  ({top.sets} set).
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Legenda chip — jalur keyboard/mobile + angka eksplisit
          (intensitas tidak pernah lewat warna saja). */}
      <div
        className="mt-3 flex flex-wrap justify-center gap-1.5"
        role="group"
        aria-label="Legenda kelompok otot"
      >
        {stats.map((s) => {
          const on = selected === s.group
          return (
            <button
              key={s.group}
              type="button"
              aria-pressed={on}
              aria-label={`${s.group}: ${s.sets} set`}
              onClick={() => toggle(s.group)}
              className={
                'interactive flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-chart-label font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-module-accent-strong ' +
                (on
                  ? 'border-transparent bg-module-accent-strong text-content-inverse'
                  : s.sets > 0
                    ? 'border-module-accent/40 text-content-secondary hover:bg-module-accent/10'
                    : 'border-border text-content-muted hover:bg-secondary')
              }
            >
              <span
                aria-hidden="true"
                className={
                  'size-1.5 rounded-full ' +
                  (on
                    ? 'bg-content-inverse'
                    : s.sets > 0
                      ? 'bg-module-accent'
                      : 'bg-border-strong')
                }
              />
              {s.group}
              <span className="font-bold tabular-nums">{s.sets}</span>
            </button>
          )
        })}
      </div>

      {/* Baris bacaan — ringkasan kelompok terpilih */}
      <p
        aria-live="polite"
        className="mt-2.5 px-0.5 text-meta leading-snug text-content-muted"
      >
        {selStat
          ? `${selStat.group} — ${selStat.sets} set dari ${selStat.dates.length} sesi dalam ${windowLabel}${
              selStat.exercises.length > 0
                ? ` (${exerciseLabel(selStat.exercises[0]!)}${
                    selStat.exercises.length > 1
                      ? ` +${selStat.exercises.length - 1}`
                      : ''
                  })`
                : ''
            }.`
          : 'Ketuk area otot pada peta untuk membaca rincian kelompok.'}
      </p>
    </div>
  )
}
