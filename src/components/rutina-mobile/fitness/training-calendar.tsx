'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Footprints,
  Volleyball,
  Zap,
} from 'lucide-react'

import { monthLabel, shiftMonthKey } from '../finance/utils'
import { DAYS, fromISO, isoOf, shortDateLabel, todayISO, useRutina, type Workout } from '../store'
import { KIND_LABEL, durationLabel, isCardioKind, paceOf, tonaseOf } from './fit-utils'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { motionTokens } from '@/lib/motion/tokens'

/**
 * Kalender Latihan — Training Log pola Strava: kisi bulanan konsistensi
 * dengan satu titik per JENIS aktivitas di tiap hari (maks 3, urutan
 * kardio → badminton → beban); ketuk tanggal untuk membaca detail sesi.
 *
 * Berbeda dari MonthCalendar (generik via props, dipakai Statistik):
 * komponen ini milik domain Bugar — berlangganan store sendiri, memakai
 * bahasa warna jenis aktivitas WeekActivityCard (kardio matcha pekat,
 * badminton cokelat, barbel pistachio tua), dan menggambar detail
 * harianya sendiri di bawah kisi.
 */

/* Ikon jenis aktivitas — salinan ringkas MIX_KIND_ICON yang lokal di
   screens/bugar.tsx (tidak diekspor di sana; didefinisikan ulang lokal
   agar kalender berdiri sendiri). */
const KIND_ICON = {
  beban: Dumbbell,
  jalan: Footprints,
  lari: Zap,
  'lari-jalan': Zap,
  badminton: Volleyball,
} as const

/* Legenda titik — label + kelas warna, urutan sama dengan titik sel. */
const DOT_LEGEND = [
  { cls: 'bg-module-accent-strong', label: 'Lari/Jalan' },
  { cls: 'bg-cocoa', label: 'Badminton' },
  { cls: 'bg-chart-stroke-4', label: 'Barbel' },
] as const

/** Kelas warna titik satu hari — maksimal satu per JENIS yang ada,
 *  urutan tetap: kardio, badminton, beban. Sel terpilih menggambar
 *  titik putih lembut agar tetap terbaca di latar matcha penuh
 *  (pola MonthCalendar). */
function dayDotClasses(list: Workout[], sel: boolean): string[] {
  const kinds = new Set(list.map((w) => w.kind))
  let hasCardio = false
  for (const k of kinds) if (isCardioKind(k)) hasCardio = true
  const dots: string[] = []
  if (hasCardio) dots.push('bg-module-accent-strong')
  if (kinds.has('badminton')) dots.push('bg-cocoa')
  if (kinds.has('beban')) dots.push('bg-chart-stroke-4')
  return sel ? dots.map(() => 'bg-primary-foreground/80') : dots
}

/** Pace kardio per km untuk detail hari — paceOf tunggal dari fit-utils
 *  (revisi audit F5: format "6:32" lokal dulunya berbeda dari baris
 *  lataman; kini satu format "6'32\"" di seluruh Bugar). */
function paceLabel(w: Workout): string | null {
  return paceOf(w.duration, w.distance ?? 0)
}

/** Warna ikon jenis aktivitas pada detail hari — selaras WeekActivityCard. */
function kindIconCls(w: Workout): string {
  if (w.kind === 'beban') return 'text-chart-stroke-4'
  if (w.kind === 'badminton') return 'text-cocoa'
  return 'text-module-accent-strong'
}

export function TrainingCalendar() {
  const workouts = useRutina((s) => s.workouts)
  /* v2.35 anti-replay — kartu hanya diantar pada kunjungan pertama. */
  const playEntrance = useFirstVisit('bugar-kalender-latihan')
  const today = todayISO()
  const curMonth = today.slice(0, 7)
  const [viewMonth, setViewMonth] = useState(curMonth)
  const [selected, setSelected] = useState<string | null>(null)

  /* Batas navigasi: mundur sampai bulan workout TERLAMA (atau bulan ini
     bila histori kosong), maju berhenti di bulan berjalan. */
  const minMonth = useMemo(
    () =>
      workouts.reduce(
        (min, w) => (w.date.slice(0, 7) < min ? w.date.slice(0, 7) : min),
        curMonth,
      ),
    [workouts, curMonth],
  )
  const canPrev = viewMonth > minMonth
  const canNext = viewMonth < curMonth

  /* Sesi bulan tampilan — ringkasan kepala + peta per tanggal. */
  const monthWorkouts = useMemo(
    () => workouts.filter((w) => w.date.startsWith(viewMonth)),
    [workouts, viewMonth],
  )
  const totalMin = monthWorkouts.reduce((a, w) => a + w.duration, 0)
  const headerRight =
    monthWorkouts.length === 0
      ? 'bulan ini belum ada sesi'
      : /* v2.45 (audit F13): sub-jam tanpa "0j" — konsisten konvensi
           durationLabel ("45 mnt", bukan "0j 45m"). */
        totalMin < 60
        ? `${monthWorkouts.length} sesi · ${totalMin} mnt`
        : `${monthWorkouts.length} sesi · ${Math.floor(totalMin / 60)}j ${totalMin % 60}m`

  /* Kisi bulanan — penggenap kolom sebelum tanggal 1 (Senin = kolom 0),
     pola MonthCalendar. */
  const [y, mo] = viewMonth.split('-').map(Number)
  const year = y ?? 1970
  const month0 = (mo ?? 1) - 1
  const daysInMonth = new Date(year, month0 + 1, 0).getDate()
  const lead = (fromISO(isoOf(new Date(year, month0, 1))).getDay() + 6) % 7
  const byDate = useMemo(() => {
    const map = new Map<string, Workout[]>()
    for (const w of monthWorkouts) {
      const arr = map.get(w.date) ?? []
      arr.push(w)
      map.set(w.date, arr)
    }
    return map
  }, [monthWorkouts])

  /* Detail hari terpilih dibaca dari histori PENUH — tetap benar walau
     pengguna menavigasi ke bulan lain tanpa melepas pilihan. */
  const selList = selected ? workouts.filter((w) => w.date === selected) : null

  const cells: ReactNode[] = []
  for (let i = 0; i < lead; i++) {
    cells.push(<span key={`lead-${i}`} aria-hidden="true" className="h-[52px]" />)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${viewMonth}-${String(day).padStart(2, '0')}`
    const list = byDate.get(iso) ?? []
    const isToday = iso === today
    const isSel = iso === selected
    const isFuture = iso > today
    const muted = list.length === 0 || isFuture
    const dots = dayDotClasses(list, isSel)
    const desc =
      list.length === 0
        ? 'tidak ada aktivitas'
        : list
            .map((w) => `${KIND_LABEL[w.kind]} ${durationLabel(w.duration)}`)
            .join(', ')
    cells.push(
      <button
        key={iso}
        type="button"
        onClick={() => setSelected(isSel ? null : iso)}
        aria-pressed={isSel}
        aria-label={`${iso}${isToday ? ' — hari ini' : ''}${isSel ? ' — terpilih' : ''} — ${desc}`}
        className={
          'flex h-[52px] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ' +
          (isSel
            ? 'bg-primary text-primary-foreground shadow-soft'
            : isToday
              ? 'ring-2 ring-primary/60 ring-offset-2 ring-offset-surface-primary'
              : 'hover:bg-surface-sunken')
        }
      >
        <span
          className={`text-note font-semibold leading-none tabular-nums ${
            isSel ? '' : muted ? 'text-content-muted/50' : 'text-content-primary'
          }`}
        >
          {day}
        </span>
        <span aria-hidden="true" className="flex h-[5px] items-center gap-[3px]">
          {dots.map((cls, i) => (
            <span key={i} className={`h-[5px] w-[5px] rounded-full ${cls}`} />
          ))}
        </span>
      </button>,
    )
  }

  return (
    <m.section
      initial={playEntrance ? { opacity: 0, y: 14 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{
        ...motionTokens.preset.chipReveal,
        delay: motionTokens.delay.tight,
      }}
      aria-label="Kalender latihan — konsistensi aktivitas per bulan"
      className="mt-[var(--layout-gap)] rounded-xl border border-border bg-surface-primary p-4 shadow-soft"
    >
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h3 className="text-eyebrow font-semibold uppercase tracking-[0.16em] text-content-secondary">
          Kalender Latihan
        </h3>
        <p
          className={`text-eyebrow font-medium tabular-nums ${
            monthWorkouts.length > 0 ? 'text-module-accent-strong' : 'text-content-muted'
          }`}
        >
          {headerRight}
        </p>
      </div>

      {/* Kepala bulan — chevron kiri/kanan + label "Juni 2025"
          (pola MonthCalendar). */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setViewMonth(shiftMonthKey(viewMonth, -1))}
          disabled={!canPrev}
          aria-label="Bulan sebelumnya"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.4} />
        </button>
        <p aria-live="polite" className="text-note font-semibold text-content-primary">
          {monthLabel(viewMonth)}
        </p>
        <button
          type="button"
          onClick={() => setViewMonth(shiftMonthKey(viewMonth, 1))}
          disabled={!canNext}
          aria-label="Bulan berikutnya"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.4} />
        </button>
      </div>

      {/* Baris hari — Sen..Min (DAYS di store, Senin lebih dulu). */}
      <div className="mt-3 grid grid-cols-7 gap-1.5" aria-hidden="true">
        {DAYS.map((d) => (
          <span
            key={d}
            className="text-center text-chart-label font-semibold uppercase tracking-[0.06em] text-content-muted"
          >
            {d}
          </span>
        ))}
      </div>

      {/* Kisi tanggal. */}
      <div className="mt-2 grid grid-cols-7 gap-1.5">{cells}</div>

      {/* Legenda jenis — titik + label, urutan sama dengan titik sel. */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {DOT_LEGEND.map((l) => (
          <span
            key={l.label}
            className="flex items-center gap-1.5 text-chart-label font-medium text-content-muted"
          >
            <span aria-hidden="true" className={`h-[5px] w-[5px] rounded-full ${l.cls}`} />
            {l.label}
          </span>
        ))}
      </div>

      {/* Detail hari terpilih — crossfade ringan saat ganti pilihan.
          selList hanya null saat selected null, jadi guard ganda di
          bawah juga mempersempit tipe keduanya. */}
      {selected && selList && (
        <AnimatePresence initial={false} mode="wait">
          <m.div
            key={selected}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={motionTokens.preset.chipReveal}
          >
            <div className="mt-3 rounded-xl bg-surface-sunken px-3.5 py-3">
              <p className="text-body font-semibold leading-snug text-content-primary">
                {shortDateLabel(selected)}
                {selList.length === 0 && ' · tidak ada aktivitas'}
              </p>
              {selList.length === 0 ? (
                <p className="mt-1 text-meta text-content-muted">
                  Tidak ada aktivitas tercatat.
                </p>
              ) : (
                <ul className="mt-1.5 space-y-1.5">
                  {selList.map((w) => {
                    const Icon = KIND_ICON[w.kind]
                    const pace = paceLabel(w)
                    return (
                      <li key={w.id} className="text-meta tabular-nums text-content-muted">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <Icon
                            aria-hidden="true"
                            className={`h-3.5 w-3.5 shrink-0 ${kindIconCls(w)}`}
                          />
                          <span className="font-semibold text-content-secondary">
                            {KIND_LABEL[w.kind]}
                          </span>
                          <span>{durationLabel(w.duration)}</span>
                          {isCardioKind(w.kind) && (w.distance ?? 0) > 0 && (
                            <span>
                              {(w.distance ?? 0).toFixed(1).replace('.', ',')} km
                              {pace ? ` · pace ${pace}/km` : ''}
                            </span>
                          )}
                          {w.kind === 'beban' && (
                            <span>
                              {w.sets.length} set ·{' '}
                              {Math.round(tonaseOf(w)).toLocaleString('id-ID')} kg tonase
                            </span>
                          )}
                        </p>
                        {w.note.trim() !== '' && (
                          <p className="mt-0.5 pl-[26px] text-meta text-content-muted">
                            {w.note.trim()}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </m.div>
        </AnimatePresence>
      )}
    </m.section>
  )
}
