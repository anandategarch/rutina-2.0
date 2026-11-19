'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { animate, stagger } from 'animejs'

import { dayCounts, fromISO, todayISO, useRutina } from './store'

import { motionTokens } from '@/lib/motion/tokens'
/* ===== Konsistensi 12 pekan — dari histori penyelesaian nyata ===== */

const WEEKS = 12
/** Skala intensitas 5 level — color-mix token --primary di atas permukaan
    tinta (level 0–3); level penuh memakai token grafik pistachio
    (var(--chart-4), satu sumber warna seluruh grafik). */
const LEVEL_COLORS = [
  'color-mix(in oklab, var(--primary) 15%, var(--surface-inverse))',
  'color-mix(in oklab, var(--primary) 35%, var(--surface-inverse))',
  'color-mix(in oklab, var(--primary) 60%, var(--surface-inverse))',
  'color-mix(in oklab, var(--primary) 85%, var(--surface-inverse))',
  'var(--chart-4)',
]

/* Label legenda per level — jumlah kebiasaan selesai per hari. */
const LEVEL_LEGEND = ['0', '1', '2', '3–4', '5+'] as const

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

export default function Heatmap() {
  const completions = useRutina((s) => s.completions)
  const today = todayISO()
  const reducedMotion = useReducedMotion()

  /** 84 hari terakhir diakhiri hari ini — kolom terakhir grid adalah
      pekan berjalan dan sel terakhir adalah hari ini. */
  const days = dayCounts(completions, today, WEEKS * 7)

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
    const cells = rootRef.current.querySelectorAll('button')
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
      delay: stagger(6, { grid: [7, 12], from: 'first' }),
      duration: 420,
      ease: 'outBack(1.4)',
    })
    return () => {
      anim.revert()
    }
  }, [inView, reducedMotion])

  const selEntry = sel ? days[sel.d * WEEKS + sel.w] : null

  /** Teks aksesibel sel: tanggal + jumlah — intensitas tidak disampaikan
      lewat warna saja. */
  const cellText = (entry: { label: string; date: string; count: number }) =>
    `${entry.label}, ${fmtDate(entry.date)} — ${
      entry.count === 0
        ? 'tidak ada aktivitas'
        : `${entry.count} kebiasaan selesai`
    }`

  return (
    <m.div
      ref={rootRef}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.5, ease: motionTokens.easing.standard }}
      className="rounded-[16px] border border-border bg-cocoa p-5 shadow-soft"
    >
      <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-inverse/70">
        Konsistensi
      </p>
      <p className="mt-1 text-eyebrow font-medium text-content-inverse/70">
        12 pekan terakhir
      </p>

      {/* Baris = hari (d), kolom = pekan (w); auto-placement row-major.
          Data dipetakan berurutan: kolom terakhir = pekan berjalan,
          sel terakhir = hari ini. */}
      <div
        className="mt-3 grid grid-cols-[repeat(12,minmax(0,1fr))] gap-1"
      >
        {Array.from({ length: 7 }, (_, d) =>
          Array.from({ length: WEEKS }, (_, w) => {
            const cell = days[d * WEEKS + w]
            const level = levelOf(cell.count)
            const isToday = w === WEEKS - 1 && d === 6
            return (
              <button
                key={`${d}-${w}`}
                type="button"
                aria-label={`Pekan ${WEEKS - w}, ${cellText(cell)}`}
                title={`Pekan ${WEEKS - w}, ${cellText(cell)}`}
                onClick={() => setSel({ w, d })}
                className={
                  'h-5 w-full cursor-pointer rounded-[5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ' +
                  (isToday
                    ? 'ring-2 ring-primary ring-offset-1 ring-offset-cocoa'
                    : '')
                }
                style={{ backgroundColor: LEVEL_COLORS[level] }}
              />
            )
          }),
        )}
      </div>

      {/* v2.16 (audit T5-d #5): umumkan pilihan sel ke pembaca layar —
          selaras dengan spend-heatmap & month-calendar. */}
      <p aria-live="polite" className="mt-3 text-eyebrow font-medium text-content-inverse/70">
        {sel && selEntry
          ? `Pekan ${WEEKS - sel.w}, ${cellText(selEntry)}`
          : 'Ketuk sel untuk melihat detail hari.'}
      </p>

      {/* Legenda intensitas — jumlah kebiasaan selesai per hari (audit
          visualisasi v2.12: "Sedikit/Banyak" terlalu abstrak; level kini
          berlabel angka konkret agar warna mudah dimengerti). */}
      <div
        className="mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5"
        aria-label="Legenda intensitas: jumlah kebiasaan selesai per hari"
      >
        <span className="text-eyebrow font-semibold uppercase tracking-[0.12em] text-content-inverse/70">
          Selesai/hari
        </span>
        <span className="flex items-center gap-1.5">
          {LEVEL_COLORS.map((c, i) => (
            <span key={c} className="flex items-center gap-1">
              <span
                className="h-3 w-3 rounded-[3px]"
                style={{ backgroundColor: c }}
              />
              <span className="text-eyebrow font-semibold tabular-nums text-content-inverse/70">
                {LEVEL_LEGEND[i]}
              </span>
            </span>
          ))}
        </span>
      </div>
    </m.div>
  )
}
