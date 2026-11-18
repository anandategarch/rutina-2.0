'use client'

import type { CSSProperties, ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { monthLabel } from './finance/utils'
import { DAYS, fromISO, isoOf } from './store'

/**
 * MonthCalendar — kisi bulanan aktivitas (audit #7).
 *
 * Tujuh kolom Sen..Min (urutan DAYS di store). Setiap sel menampilkan
 * angka tanggal + hingga tiga titik indikator kecil:
 * - titik matcha  : ada kebiasaan selesai (makin pekat makin besar rasio
 *                    selesai/terjadwal),
 * - titik pasir    : ada transaksi (masuk/keluar) — amber halus #C7A17A,
 * - titik cokelat  : ada sesi latihan.
 *
 * Sel hari tanpa data dan tanggal masa depan tampil redup; hari ini
 * diberi cincin tipis; tanggal terpilih diisi matcha penuh.
 */

/** Warna pasir untuk titik transaksi — amber halus di luar kelas Tailwind. */
const SAND_DOT = '#C7A17A'

/** Titik indikator satu hari — seluruhnya opsional. */
export interface MonthDayInfo {
  /** Jumlah kebiasaan selesai hari itu. */
  done?: number
  /** Jumlah kebiasaan terjadwal hari itu (untuk intensitas titik matcha). */
  scheduled?: number
  /** Ada transaksi masuk/keluar (transfer tidak dihitung). */
  hasTx?: boolean
  /** Ada sesi latihan. */
  hasWorkout?: boolean
}

export interface MonthCalendarProps {
  /** Kunci bulan tampilan "yyyy-mm" (zero-padded). */
  month: string
  /** Peta data per tanggal ISO — hanya tanggal bulan tampilan dibaca. */
  info: Record<string, MonthDayInfo>
  /** Hari ini (ISO) — penanda cincin. */
  today: string
  /** Tanggal terpilih (ISO) atau null. */
  selected?: string | null
  /** Boleh mundur bulan (dinonaktifkan bila false). */
  canPrev: boolean
  /** Boleh maju bulan (dinonaktifkan bila false). */
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  /** Ketuk tanggal — membuka detail hari. */
  onSelect: (iso: string) => void
}

/** Kelas dasar sel: kolom angka + baris titik, target sentuh ≥ 44px. */
const CELL_BASE =
  'flex h-[52px] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary'

export function MonthCalendar({
  month,
  info,
  today,
  selected,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onSelect,
}: MonthCalendarProps) {
  const [y, m] = month.split('-').map(Number)
  const year = y ?? 1970
  const month0 = (m ?? 1) - 1
  const daysInMonth = new Date(year, month0 + 1, 0).getDate()
  const firstISO = isoOf(new Date(year, month0, 1))
  /** Sel kosong penggenap kolom sebelum tanggal 1 (Senin = kolom 0). */
  const lead = (fromISO(firstISO).getDay() + 6) % 7

  const cells: ReactNode[] = []
  for (let i = 0; i < lead; i++) {
    cells.push(<span key={`lead-${i}`} aria-hidden="true" className="h-[52px]" />)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${month}-${String(day).padStart(2, '0')}`
    const d = info[iso]
    const hasData = Boolean(d && ((d.done ?? 0) > 0 || d.hasTx || d.hasWorkout))
    const isToday = iso === today
    const isSel = iso === selected
    const muted = !hasData

    /* Titik indikator — urutan tetap: kebiasaan, transaksi, latihan.
       Sel terpilih menggambarkan titik putih lembut agar tetap terbaca
       di atas latar matcha penuh. */
    const doneCount = d?.done ?? 0
    const dots: { cls?: string; style?: CSSProperties }[] = []
    const dotVisual = (cls: string, style?: CSSProperties) =>
      isSel ? { cls: 'bg-primary-foreground/80' } : { cls, style }
    if (doneCount > 0) {
      const sched = d?.scheduled ?? 0
      const ratio = sched > 0 ? doneCount / sched : 1
      /* Rasio tinggi = matcha pekat; rasio rendah = pistachio muda. */
      dots.push(dotVisual(ratio >= 0.7 ? 'bg-matcha' : 'bg-pistachio'))
    }
    if (d?.hasTx) dots.push(dotVisual('', { backgroundColor: SAND_DOT }))
    if (d?.hasWorkout) dots.push(dotVisual('bg-cocoa'))

    cells.push(
      <button
        key={iso}
        type="button"
        onClick={() => onSelect(iso)}
        aria-label={`${iso}${isToday ? ' — hari ini' : ''}${isSel ? ' — terpilih' : ''}${
          d && (d.done ?? 0) > 0
            ? ` — ${d.done} kebiasaan selesai`
            : ''
        }${d?.hasTx ? ', ada transaksi' : ''}${d?.hasWorkout ? ', ada latihan' : ''}`}
        aria-pressed={isSel}
        className={
          CELL_BASE +
          (isSel
            ? ' bg-primary text-primary-foreground shadow-soft'
            : isToday
              ? ' ring-2 ring-primary/60 ring-offset-2 ring-offset-surface-primary'
              : ' hover:bg-surface-sunken')
        }
      >
        <span
          className={`text-[12.5px] font-semibold leading-none tabular-nums ${
            isSel ? '' : muted ? 'text-content-muted/50' : 'text-content-primary'
          }`}
        >
          {day}
        </span>
        <span aria-hidden="true" className="flex h-[5px] items-center gap-[3px]">
          {dots.map((dot, i) => (
            <span
              key={i}
              className={`h-[5px] w-[5px] rounded-full ${dot.cls ?? ''}`}
              style={dot.style}
            />
          ))}
        </span>
      </button>,
    )
  }

  return (
    <div>
      {/* Kepala bulan — chevron kiri/kanan + label "Juni 2025". */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Bulan sebelumnya"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.4} />
        </button>
        <p aria-live="polite" className="text-[13px] font-bold text-content-primary">
          {monthLabel(month)}
        </p>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          aria-label="Bulan berikutnya"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>

      {/* Baris hari — Sen..Min (DAYS di store, Senin lebih dulu). */}
      <div
        className="mt-3 grid grid-cols-7 gap-1.5"
        aria-hidden="true"
      >
        {DAYS.map((d) => (
          <span
            key={d}
            className="text-center text-[10px] font-bold uppercase tracking-[0.06em] text-content-muted"
          >
            {d}
          </span>
        ))}
      </div>

      {/* Kisi tanggal. */}
      <div className="mt-2 grid grid-cols-7 gap-1.5">{cells}</div>
    </div>
  )
}
