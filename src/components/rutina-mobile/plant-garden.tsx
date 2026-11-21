'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as m from 'motion/react-m'
import { Leaf } from 'lucide-react'
import { toast } from 'sonner'

import { Progress } from '@/components/ui/progress'
import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { PlantGlyph, usePlantGrowth, type PlantStageKey } from './plant-glyph'
import { PLANT_STAGES, plantStageOf } from './habit-coach'
import { RutinaSectionHeader } from './rutina-section-header'
import { todayISO, useRutina } from './store'

/**
 * Taman Pertumbuhan — kebiasaan aktif masing-masing dengan ilustrasi botani
 * tahap, label, dan bar progres tipis menuju tahap berikutnya (Benih →
 * Tunas → Pohon Muda → Pohon Dewasa → Berbunga, ambang 1/7/21/60).
 *
 * v2.8 "Botanical Garden":
 * • emoji diganti PlantGlyph — line-art SVG yang mewarisi warna domain
 *   layar (matcha di Beranda, Rose Clay di Kebiasaan);
 * • kartu TIDAK lagi bergoyang terus-menerus — gerak hanya terjadi pada
 *   milestone: saat naik tahap, tanaman BERTUMBUH (batang tumbuh, daun
 *   terbuka, kanopi mengembang, bunga mekar) lewat timeline anime.js
 *   dengan pembersihan scope otomatis;
 * • bar progres memakai shadcn/ui Progress (Radix, aria lengkap).
 *
 * v2.9 "Garden Beds" — prop `variant`:
 * • 'strip' (bawaan, dipakai Beranda): strip gulir horizontal 156px —
 *   perilaku & tampilan tak berubah;
 * • 'beds' (dipakai layar Kebiasaan): di desktop xl+ tanaman ditanam
 *   sebagai BEDENG — kisi melipat (flex-wrap) di atas permukaan
 *   garden-bed dengan kartu sedikit lebih lebar dan ornamen daun pada
 *   header; di bawah xl perilaku identik strip (gulir snap) demi UX
 *   ponsel.
 */
export function PlantGarden({
  variant = 'strip',
  onSelect,
}: {
  variant?: 'strip' | 'beds'
  /** v2.45 (review Tahap 2): ketukan kartu tanaman membuka detail
   *  kebiasaannya — "setiap visualisasi bisa dibedah" (pola matriks
   *  konsistensi); tanpa handler, kartu tetap non-interaktif. */
  onSelect?: (habitId: string) => void
}) {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  /* v2.38 anti-replay: komponen dipakai di Beranda DAN Kebiasaan — entrance
     seksi hanya kunjungan pertama sesi tab; remount antar-tab tampil instan. */
  const playSection = useFirstVisit('garden-plant-section')

  const today = todayISO()
  /* v2.49 (audit): identitas stabil — array baru tiap render membuat
     effect di bawah berjalan ulang pada setiap re-render induk (mis.
     tiap selectedId berubah); useMemo menjaga referensi selama daftar
     kebiasaan tak berubah. */
  const active = useMemo(
    () => habits.filter((h) => !h.archived),
    [habits],
  )

  /* v2.31 Garden: milestone yang terdengar — saat tanaman naik tahap,
     toast singkat menyapa (perayaan visual tetap dipegang usePlantGrowth
     per kartu; sebelumnya hanya di Beranda via GardenTree). Ref menandai
     tahap sebelumnya; mount pertama tidak bersuara. */
  const prevStages = useRef<Map<string, string>>(new Map())
  useEffect(() => {
    for (const h of active) {
      const stage = plantStageOf(h, completions, today)
      const prev = prevStages.current.get(h.id)
      if (prev && prev !== stage.stage.key) {
        toast.success(`${h.title} tumbuh — kini tahap "${stage.stage.label}"`)
      }
      prevStages.current.set(h.id, stage.stage.key)
    }
  }, [active, completions, today])

  /* Tanpa kebiasaan aktif — taman belum perlu ditanam. */
  if (active.length === 0) return null

  const beds = variant === 'beds'

  const header = (
    <RutinaSectionHeader
      title="Taman Pertumbuhan"
      description="Kebiasaan yang konsisten tumbuh perlahan"
      className={beds ? 'min-w-0 flex-1' : undefined}
    />
  )

  /* Strip (bawaan) dan mode bedeng berbagi kelas dasar yang sama —
     bedeng hanya mengganti perilaku di ruang kerja lebar (≥52rem,
     container query): snap dimatikan, sumbu-x kembali terlihat, kartu
     melipat di dalam permukaan garden-bed. */
  const listClass = beds
    ? 'mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto no-scrollbar pb-1 @[52rem]:garden-bed @[52rem]:snap-none @[52rem]:overflow-x-visible @[52rem]:flex-wrap @[52rem]:p-4'
    : 'mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto no-scrollbar pb-1'

  return (
    <m.section
      initial={playSection ? { opacity: 0, y: 18 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={motionTokens.preset.pageEntrance}
      aria-label="Taman Pertumbuhan"
      className={beds ? undefined : 'mt-8'}
    >
      {beds ? (
        /* Header bedeng — daun kecil menandai zona botani. */
        <div className="flex items-start gap-2">
          <Leaf
            aria-hidden="true"
            className="mt-0.5 h-[18px] w-[18px] shrink-0 text-module-accent-strong"
            strokeWidth={2.2}
          />
          {header}
        </div>
      ) : (
        header
      )}
      <div className="relative">
        <div
          role="list"
          aria-label="Tahap pertumbuhan tiap kebiasaan"
          className={listClass}
        >
          {active.map((h) => {
            const p = plantStageOf(h, completions, today)
            /* Bar penuh di tahap akhir; selain itu total/ambang berikutnya. */
            const pct = p.nextAt ? Math.min(p.total / p.nextAt, 1) : 1
            const counter = p.nextAt
              ? `${p.total}/${p.nextAt}`
              : 'Tahap akhir'
            return (
              <PlantCard
                key={h.id}
                title={h.title}
                stage={p.stage.key}
                stageLabel={p.stage.label}
                counter={counter}
                pct={pct}
                bed={beds}
                onSelect={onSelect ? () => onSelect(h.id) : undefined}
              />
            )
          })}
        </div>
        {/* Tepi pudar kanan — penanda strip masih bisa digulir (senada
            daftar filter Jurnal). Mode bedeng berhenti menggulir di ruang
            kerja lebar, tepi ikut disembunyikan. */}
        <div
          aria-hidden="true"
          className={
            'pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-surface-primary to-transparent' +
            (beds ? ' @[52rem]:hidden' : '')
          }
        />
      </div>
      <p className="mt-2 px-0.5 text-eyebrow font-medium text-content-muted">
        {PLANT_STAGES.map((s) => s.label).join(' → ')} — tumbuh dari total
        penyelesaian nyata.
      </p>
    </m.section>
  )
}

/** Satu kartu tanaman — dipisah agar usePlantGrowth hidup per tanaman.
 *  v2.45: jadi tombol penuh bila dibedah-kan (onSelect). */
function PlantCard({
  title,
  stage,
  stageLabel,
  counter,
  pct,
  bed = false,
  onSelect,
}: {
  title: string
  stage: PlantStageKey
  stageLabel: string
  counter: string
  pct: number
  /** Mode bedeng: kartu sedikit lebih lebar di ruang kerja lebar. */
  bed?: boolean
  onSelect?: () => void
}) {
  /* Milestone: naik tahap memicu koreografi pertumbuhan anime.js. */
  const glyphRef = usePlantGrowth<HTMLDivElement>(null, stage)

  const cls =
    'w-[156px] shrink-0 snap-start rounded-xl border border-border bg-surface-primary p-3 shadow-soft transition-transform duration-300 hover:-translate-y-0.5' +
    (bed ? ' @[52rem]:w-[168px]' : '')
  const inner = (
    <>
      <div
        ref={glyphRef}
        className="grid h-11 w-11 place-items-center rounded-full bg-module-accent-soft text-module-accent-strong"
      >
        <PlantGlyph stage={stage} className="h-8 w-8" />
      </div>
      <p className="mt-2.5 line-clamp-3 break-words text-left text-meta font-semibold leading-snug text-content-primary">
        {title}
      </p>
      <p className="mt-0.5 truncate text-eyebrow font-medium text-content-muted">
        {stageLabel} · {counter}
      </p>
      <Progress
        value={Math.round(pct * 100)}
        className="mt-2.5 h-1 bg-surface-sunken"
        aria-label={`Progres ${title} — ${stageLabel}, ${counter}`}
      />
    </>
  )
  if (onSelect) {
    return (
      <button
        type="button"
        role="listitem"
        onClick={onSelect}
        aria-label={`Buka detail ${title} — tahap ${stageLabel}, ${counter}`}
        className={
          cls +
          ' cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
        }
      >
        {inner}
      </button>
    )
  }
  return (
    <div role="listitem" className={cls}>
      {inner}
    </div>
  )
}
