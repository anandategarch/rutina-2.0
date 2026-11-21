'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { animate, stagger } from 'animejs'

import {
  addDaysISO,
  dayCounts,
  daySchedules,
  fromISO,
  todayISO,
  useRutina,
  weekStartISO,
} from './store'
import { DayDetailSheet } from './day-detail-sheet'

import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'
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
  visitKey,
}: {
  mode?: HeatmapMode
  allowModeToggle?: boolean
  /** Kunci anti-replay (v2.38): bila diberikan, entrance kartu & gelombang
   *  sel hanya berlaku pada kunjungan pertama per sesi tab — remount
   *  antar-tab menampilkan heatmap instan. Tanpa kunci, perilaku lama
   *  (selalu diantar) dipertahankan untuk pemakaian yang belum digerbangi. */
  visitKey?: string
}) {
  const completions = useRutina((s) => s.completions)
  const habits = useRutina((s) => s.habits)
  const today = todayISO()
  const reducedMotion = useReducedMotion()
  const [mode, setMode] = useState<HeatmapMode>(modeProp)
  /* Anti-replay: useFirstVisit tanpa kunci selalu true (lihat lib), jadi
     pemanggil tanpa visitKey tidak berubah perilaku. */
  const first = useFirstVisit(visitKey)
  const play = visitKey ? first : true

  /* v2.45 (audit perf): deret 84 hari dibungkus useMemo — sebelumnya
     dihitung ulang tiap render (toggle centang kebiasaan pun). */
  const countDays = useMemo(
    () => dayCounts(completions, today, WEEKS * 7),
    [completions, today],
  )
  /* Kepatuhan sadar-jadwal — hari tanpa jadwal ber-pct null. */
  const schedDays = useMemo(
    () => daySchedules(habits, completions, today, WEEKS * 7),
    [habits, completions, today],
  )

  /* v2.45 (audit P0): GRID KOLOM-PEKAN SEJATI — Senin tiap kolom,
     kolom terakhir = pekan berjalan, sel = tanggal nyata per (pekan,
     hari). Dulu: deret 84 hari kronologis dipotong 12 per BARIS — tiap
     baris adalah 12 hari berturut-turut, "kolom pekan" hanya ilusi, dan
     prefiks "Pekan N" salah untuk ~85% sel (pola SpendHeatmap yang
     benar sudah ada sejak lama). */
  const mondays = useMemo(
    () =>
      Array.from(
        { length: WEEKS },
        (_, w) => addDaysISO(weekStartISO(today), (w - (WEEKS - 1)) * 7),
      ),
    [today],
  )
  const countBy = useMemo(
    () => new Map(countDays.map((cd) => [cd.date, cd] as const)),
    [countDays],
  )
  const schedBy = useMemo(
    () => new Map(schedDays.map((sd) => [sd.date, sd] as const)),
    [schedDays],
  )

  /* SATU observer untuk seluruh kartu: entrance Motion dan gelombang
      sel anime.js dipicu `inView` yang sama — sebelumnya whileInView
      pada kartu + useInView pada grid membuat dua IntersectionObserver. */
  const rootRef = useRef<HTMLDivElement>(null)
  const inView = useInView(rootRef, { once: true, margin: '-40px' })

  /* v2.45 (drilldown review): sel terpilih = tanggal nyata — ketukan
     membuka DayDetailSheet (tanggal, X dari Y selesai, status per
     kebiasaan Selesai/Jeda/Belum) — bukan lagi satu baris teks saja. */
  const [selIso, setSelIso] = useState<string | null>(null)

  // anime.js — sel heatmap bermunculan bergelombang saat terlihat.
  // Kebijakan reduced-motion: sel langsung tampil tanpa gelombang.
  useEffect(() => {
    if (!rootRef.current) return
    /* Selektor data-cell (bukan 'button') — tombol lain di masa depan
       tidak ikut gelombang tanpa sengaja. */
    const cells = rootRef.current.querySelectorAll('[data-cell]')
    /* !play = kunjungan ulang tab: sel tampil instan tanpa gelombang. */
    if (!inView || reducedMotion || !play) {
      /* Tanpa animasi (belum terlihat / reduce-motion / kunjungan ulang):
         pastikan sel pada keadaan alami — termasuk membersihkan sisa
         scale(0) dari run sebelumnya bila preferensi berubah di tengah
         jalan. */
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

  /** Teks aksesibel sel: tanggal + nilai — intensitas tidak disampaikan
      lewat warna saja. v2.45: prefiks "Pekan N" dijatuhkan — tanggal
      nyata lebih jelas dan tak mungkin salah-label. */
  const cellText = (iso: string) => {
    const cd = countBy.get(iso)
    if (mode === 'jumlah') {
      return `${cd?.label ?? ''}, ${fmtDate(iso)} — ${
        !cd || cd.count === 0
          ? 'tidak ada aktivitas'
          : `${cd.count} kebiasaan selesai`
      }`
    }
    const sd = schedBy.get(iso)
    if (!sd || sd.pct == null) {
      /* Seluruh jadwal hari itu diampuni (rest > 0) tetap disebut —
         hari tanpa jadwal ≠ hari yang semua jadwalnya jeda (audit #6). */
      return `${cd?.label ?? ''}, ${fmtDate(iso)} — tanpa kebiasaan terjadwal${
        sd && sd.rest > 0 ? `, ${sd.rest} hari jeda diampuni` : ''
      }`
    }
    return `${sd.label}, ${fmtDate(iso)} — kepatuhan ${sd.pct}% (${sd.done} dari ${sd.scheduled} terjadwal)${
      /* v2.49 (audit): hari berjalan belum punya vonis — sulur menahan
         penilaian sampai tengah malam, heatmap ikut; tanpa ini sel hari
         ini 0% terbaca identik dengan hari yang benar-benar gagal. */
      iso === today && sd.pct < 100 ? ' — hari masih berjalan' : ''
    }${sd.rest > 0 ? `, ${sd.rest} hari jeda diampuni` : ''}`
  }

  return (
    <m.div
      ref={rootRef}
      initial={play ? { opacity: 0, y: 16 } : false}
      /* !play: animate langsung ke keadaan akhir — tanpa ini kartu tetap
         tersembunyi lalu ikut beranimasi saat inView (replay terselubung). */
      animate={
        inView || !play ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }
      }
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

      {/* Baris = hari (Senin–Minggu), kolom = pekan (kolom terakhir =
          pekan berjalan); auto-placement row-major — sel = tanggal nyata
          (v2.45: kolom kini benar-benar pekan, bukan 12 hari berurutan).
          Sel masa depan = span inert (belum terjadi, tak bisa dibuka).
          v2.49 (audit): wadah gulir + min-width — di 320px kolom grid
          menyusut ke ±15px, di bawah lantai 24px untuk target ketuk
          utama kartu ini. 336px = 12×24 + 11 celah 4px (terverifikasi
          live 24,3px/sel, halaman tetap 320 tanpa luber). */}
      <div className="mt-3 overflow-x-auto no-scrollbar overscroll-x-contain">
        <div
          className="grid min-w-[336px] grid-cols-[repeat(12,minmax(0,1fr))] gap-1"
        >
        {Array.from({ length: 7 }, (_, d) =>
          Array.from({ length: WEEKS }, (_, w) => {
            const iso = addDaysISO(mondays[w]!, d)
            const future = iso > today
            if (future) {
              return (
                <span
                  key={`${d}-${w}`}
                  aria-hidden="true"
                  className="h-6 w-full rounded-[5px] bg-surface-primary/40 shadow-[inset_0_0_0_1px_var(--border)]"
                />
              )
            }
            const cd = countBy.get(iso)
            const sd = schedBy.get(iso)
            /* Mode kepatuhan: hari tanpa jadwal = soket kosong (outline),
               bukan warna level-0 — beda dari 0% sungguhan. */
            const unscheduled = mode === 'kepatuhan' && (sd?.pct == null)
            const level =
              mode === 'jumlah'
                ? levelOf(cd?.count ?? 0)
                : levelOfPct(sd?.pct ?? 0)
            const isToday = iso === today
            return (
              <button
                key={`${d}-${w}`}
                type="button"
                data-cell
                aria-label={cellText(iso)}
                title={cellText(iso)}
                onClick={() => setSelIso(iso)}
                className={
                  'h-6 w-full cursor-pointer rounded-[5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ' +
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
      </div>

      {/* v2.16 (audit T5-d #5): umumkan pilihan sel ke pembaca layar —
          selaras dengan spend-heatmap & month-calendar. */}
      <p aria-live="polite" className="mt-3 text-eyebrow font-medium text-content-muted">
        {selIso ? cellText(selIso) : 'Ketuk sel untuk melihat detail hari.'}
      </p>

      {/* v2.45 (review Tahap 2): drilldown penuh — lembar hari membuka
          tanggal, X dari Y selesai, dan status tiap kebiasaan
          (Selesai/Jeda/Belum selesai — termasuk yang terlewat). */}
      <DayDetailSheet date={selIso} onClose={() => setSelIso(null)} />

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
              <span className="h-3 w-3 rounded-[4px] bg-surface-primary shadow-[inset_0_0_0_1px_var(--border)]" />
              <span className="text-eyebrow font-semibold text-content-muted">
                tanpa jadwal
              </span>
            </span>
          )}
          {LEVEL_COLORS.map((c, i) => (
            <span key={c} className="flex items-center gap-1">
              {/* v2.47: radius swatch 4px menggemakan radius sel 5px —
                  satu bahasa bentuk pada satu legenda. */}
              <span
                className="h-3 w-3 rounded-[4px]"
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
