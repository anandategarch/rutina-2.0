'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { animate, stagger } from 'animejs'

import {
  dayCounts,
  daySchedules,
  fromISO,
  todayISO,
  useRutina,
} from './store'

import { motionTokens } from '@/lib/motion/tokens'
/* ===== Konsistensi 12 pekan — dari histori penyelesaian nyata ===== */

const WEEKS = 12
/** Skala intensitas 5 level — di atas kartu instrumen parchment (audit
    Tahap 2 #6): level 0 netral linen ("tanpa aktivitas"), level 1–3
    color-mix token --primary di atas permukaan terang, level penuh memakai
    varian stroke grafik yang tegas (var(--chart-stroke-1), kontras AA di
    atas parchment). */
const LEVEL_COLORS = [
  'var(--surface-secondary)',
  'color-mix(in oklab, var(--primary) 35%, var(--surface-primary))',
  'color-mix(in oklab, var(--primary) 55%, var(--surface-primary))',
  'color-mix(in oklab, var(--primary) 80%, var(--surface-primary))',
  'var(--chart-stroke-1)',
]

/* Label legenda per level — mode "jumlah": kebiasaan selesai per hari. */
const LEVEL_LEGEND = ['0', '1', '2', '3–4', '5+'] as const
/* Label legenda mode "kepatuhan" — persen jadwal yang diselesaikan. */
const LEVEL_LEGEND_PCT = ['0%', '1–39%', '40–69%', '70–99%', '100%'] as const

/** Mode pembacaan heatmap (audit visualisasi v2.36, Tahap 2):
 *  - jumlah: berapa kebiasaan selesai (intensitas klasik);
 *  - kepatuhan: selesai/terjadwal × 100 — jumlah centang tidak selalu
 *    berarti konsisten; hari 2/2 tidak boleh tampak di bawah hari 4/6.
 *    Hari tanpa jadwal tampil sebagai soket kosong, bukan 0%. */
export type HeatmapMode = 'jumlah' | 'kepatuhan'

/** Tanggal singkat Indonesia ("5 Jan") dari ISO — untuk label aksesibel sel. */
const fmtDate = (iso: string) =>
  fromISO(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })

/** Level 0-4 dari jumlah kebiasaan selesai: 0 / 1 / 2 / 3-4 / 5+. */
function levelOf(count: number): number {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

/** Level 0-4 dari persentase kepatuhan: 0 / 1-39 / 40-69 / 70-99 / 100. */
function levelOfPct(pct: number): number {
  if (pct <= 0) return 0
  if (pct < 40) return 1
  if (pct < 70) return 2
  if (pct < 100) return 3
  return 4
}

export default function Heatmap({
  mode: modeProp = 'jumlah',
  allowModeToggle = false,
}: {
  mode?: HeatmapMode
  allowModeToggle?: boolean
}) {
  const completions = useRutina((s) => s.completions)
  const habits = useRutina((s) => s.habits)
  const today = todayISO()
  const reducedMotion = useReducedMotion()
  const [mode, setMode] = useState<HeatmapMode>(modeProp)

  /** 84 hari terakhir diakhiri hari ini — kolom terakhir grid adalah
      pekan berjalan dan sel terakhir adalah hari ini. */
  const countDays = dayCounts(completions, today, WEEKS * 7)
  /* Kepatuhan sadar-jadwal — hari tanpa jadwal ber-pct null. */
  const schedDays = daySchedules(habits, completions, today, WEEKS * 7)

  /* SATU observer untuk seluruh kartu: entrance Motion dan gelombang
      sel anime.js dipicu `inView` yang sama — sebelumnya whileInView
      pada kartu + useInView pada grid membuat dua IntersectionObserver. */
  const rootRef = useRef<HTMLDivElement>(null)
  const inView = useInView(rootRef, { once: true, margin: '-40px' })

  const [sel, setSel] = useState<{ w: number; d: number } | null>(null)

  // anime.js — sel heatmap bermunculan bergelombang saat terlihat.
  // Kebijakan reduced-motion: sel langsung tampil tanpa gelombang.
  useEffect(() => {
    if (!rootRef.current) return
    /* Selektor data-cell (bukan 'button') — tombol lain di masa depan
       tidak ikut gelombang tanpa sengaja. */
    const cells = rootRef.current.querySelectorAll('[data-cell]')
    if (!inView || reducedMotion) {
      /* Tanpa animasi (belum terlihat / reduce-motion): pastikan sel pada
         keadaan alami — termasuk membersihkan sisa scale(0) dari run sebelumnya
         bila preferensi berubah di tengah jalan. */
      cells.forEach((el) => {
        ;(el as HTMLElement).style.transform = ''
      })
      return
    }
    /* Sembunyikan sel SEBELUM memicu stagger — tanpa ini sel terakhir
       (delay gelombang ±0,5 dtk) sempat tampil penuh lalu melompat ke 0
       sebelum tumbuh (kilatan awal). */
    cells.forEach((el) => {
      ;(el as HTMLElement).style.transform = 'scale(0)'
    })
    const anim = animate(cells, {
      scale: [0, 1],
      /* grid[0] = item per baris (12 kolom), grid[1] = baris (7 hari) —
         DOM row-major d*w. (Audit v2.20: selama ini terbalik [7,12]
         sehingga gelombang diagonal, bukan radial dari kiri-atas.) */
      delay: stagger(6, { grid: [12, 7], from: 'first' }),
      duration: 420,
      ease: 'outBack(1.4)',
    })
    return () => {
      /* v2.34: cancel (bukan revert) — selaras pembersihan batang grafik
         Statistik; revert memasang kembali gaya pra-animasi dan berisiko
         kedipan saat efek berjalan ulang (toggle reduced-motion). */
      anim.cancel()
    }
  }, [inView, reducedMotion])

  const selEntry = sel ? schedDays[sel.d * WEEKS + sel.w] : null

  /** Teks aksesibel sel: tanggal + nilai — intensitas tidak disampaikan
      lewat warna saja. */
  const cellText = (idx: number) => {
    const cd = countDays[idx]
    if (mode === 'jumlah') {
      return `${cd.label}, ${fmtDate(cd.date)} — ${
        cd.count === 0
          ? 'tidak ada aktivitas'
          : `${cd.count} kebiasaan selesai`
      }`
    }
    const sd = schedDays[idx]
    if (sd.pct == null) {
      return `${sd.label}, ${fmtDate(sd.date)} — tanpa kebiasaan terjadwal`
    }
    return `${sd.label}, ${fmtDate(sd.date)} — kepatuhan ${sd.pct}% (${sd.done} dari ${sd.scheduled} terjadwal)${sd.rest > 0 ? `, ${sd.rest} hari jeda diampuni` : ''}`
  }

  return (
    <m.div
      ref={rootRef}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={motionTokens.preset.data}
      className="rounded-2xl border border-border bg-surface-primary p-5 shadow-soft"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-secondary">
          Konsistensi
        </p>
        {/* Toggle mode pembacaan — jumlah selesai vs kepatuhan jadwal
            (audit v2.36). Radix-free: dua tombol radio sederhana. */}
        {allowModeToggle ? (
          <div
            role="group"
            aria-label="Mode pembacaan konsistensi"
            className="flex gap-1 rounded-full border border-border bg-surface-sunken p-0.5"
          >
            {(
              [
                ['jumlah', 'Jumlah'],
                ['kepatuhan', 'Kepatuhan'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
                className={`interactive h-7 cursor-pointer rounded-full px-3 text-chart-label font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  mode === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-content-secondary hover:text-content-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-eyebrow font-medium text-content-muted">
            12 pekan terakhir
          </p>
        )}
      </div>
      {allowModeToggle && (
        <p className="mt-1 text-eyebrow font-medium text-content-muted">
          {mode === 'jumlah'
            ? '12 pekan · kebiasaan selesai per hari'
            : '12 pekan · selesai dibanding terjadwal; hari tanpa jadwal kosong'}
        </p>
      )}

      {/* Baris = hari (d), kolom = pekan (w); auto-placement row-major.
          Data dipetakan berurutan: kolom terakhir = pekan berjalan,
          sel terakhir = hari ini. */}
      <div
        className="mt-3 grid grid-cols-[repeat(12,minmax(0,1fr))] gap-1"
      >
        {Array.from({ length: 7 }, (_, d) =>
          Array.from({ length: WEEKS }, (_, w) => {
            const idx = d * WEEKS + w
            const sd = schedDays[idx]
            /* Mode kepatuhan: hari tanpa jadwal = soket kosong (outline),
               bukan warna level-0 — beda dari 0% sungguhan. */
            const unscheduled = mode === 'kepatuhan' && sd.pct == null
            const level =
              mode === 'jumlah'
                ? levelOf(countDays[idx].count)
                : levelOfPct(sd.pct ?? 0)
            const isToday = w === WEEKS - 1 && d === 6
            return (
              <button
                key={`${d}-${w}`}
                type="button"
                data-cell
                aria-label={`Pekan ${WEEKS - w}, ${cellText(idx)}`}
                title={`Pekan ${WEEKS - w}, ${cellText(idx)}`}
                onClick={() => setSel({ w, d })}
                className={
                  'h-5 w-full cursor-pointer rounded-[5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ' +
                  (isToday
                    ? 'ring-2 ring-primary ring-offset-1 ring-offset-surface-primary '
                    : '') +
                  (unscheduled
                    ? 'bg-surface-primary shadow-[inset_0_0_0_1px_var(--border)]'
                    : '')
                }
                style={unscheduled ? undefined : { backgroundColor: LEVEL_COLORS[level] }}
              />
            )
          }),
        )}
      </div>

      {/* v2.16 (audit T5-d #5): umumkan pilihan sel ke pembaca layar —
          selaras dengan spend-heatmap & month-calendar. */}
      <p aria-live="polite" className="mt-3 text-eyebrow font-medium text-content-muted">
        {sel && selEntry
          ? `Pekan ${WEEKS - sel.w}, ${cellText(sel.d * WEEKS + sel.w)}`
          : 'Ketuk sel untuk melihat detail hari.'}
      </p>

      {/* Legenda intensitas — berlabel sesuai mode (audit v2.36). */}
      <div
        className="mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5"
        aria-label={
          mode === 'jumlah'
            ? 'Legenda intensitas: jumlah kebiasaan selesai per hari'
            : 'Legenda intensitas: persentase kepatuhan terhadap jadwal'
        }
      >
        <span className="text-eyebrow font-semibold uppercase tracking-[0.12em] text-content-muted">
          {mode === 'jumlah' ? 'Selesai/hari' : 'Kepatuhan'}
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {mode === 'kepatuhan' && (
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-[3px] bg-surface-primary shadow-[inset_0_0_0_1px_var(--border)]" />
              <span className="text-eyebrow font-semibold text-content-muted">
                tanpa jadwal
              </span>
            </span>
          )}
          {LEVEL_COLORS.map((c, i) => (
            <span key={c} className="flex items-center gap-1">
              <span
                className="h-3 w-3 rounded-[3px]"
                style={{ backgroundColor: c }}
              />
              <span className="text-eyebrow font-semibold tabular-nums text-content-muted">
                {mode === 'jumlah' ? LEVEL_LEGEND[i] : LEVEL_LEGEND_PCT[i]}
              </span>
            </span>
          ))}
        </span>
      </div>
    </m.div>
  )
}
