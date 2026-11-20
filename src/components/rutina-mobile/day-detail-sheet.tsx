'use client'

import { useMemo, useState, type ReactNode } from 'react'
import * as m from 'motion/react-m'
import {
  BatteryLow,
  CalendarDays,
  Check,
  Droplets,
  Dumbbell,
  Footprints,
  Laugh,
  Meh,
  Moon,
  NotebookPen,
  Smile,
  UtensilsCrossed,
  X,
  Zap,
} from 'lucide-react'

import { motionTokens } from '@/lib/motion/tokens'
import { cn } from '@/lib/utils'

import { useCatMeta } from './finance/use-cat-meta'
import { formatIDR, formatIDRShort } from './finance/utils'
import { tonaseOf } from './fitness/fit-utils'
import { RutinaCard } from './rutina-card'
import { RutinaEmptyState } from './rutina-empty-state'
import { RutinaSectionHeader } from './rutina-section-header'
import { RutinaSheet } from './rutina-sheet'
import {
  addDaysISO,
  fromISO,
  habitsOn,
  isDoneOn,
  longDateLabel,
  noteDateISO,
  todayISO,
  useRutina,
  type Note,
  type Tx,
  type WorkoutKind,
} from './store'

/**
 * DayDetailSheet / DayDetailPanel — ringkasan satu hari (audit #7).
 *
 * Dibuka dengan mengetuk tanggal pada kalender aktivitas. Menampilkan
 * read-only: kebiasaan terjadwal (+ jeda terjadwal), catatan yang cocok,
 * arus keuangan, latihan & asupan, serta tubuh & mood. Semuanya derivasi
 * murni dari store; tidak ada satu pun kontrol isian di sini.
 *
 * Dua cangkang berbagi SATU tubuh (DayDetailBody):
 * - Sheet  : ponsel & tablet — naik dari bawah, bisa diseret tutup.
 * - Panel  : inspector desktop PERMANEN di samping kalender (ruang
 *            kerja ≥52rem) — bagian dari Data Observatory, bukan overlay.
 */

/* Ikon mood — padanan MOODS di store (selaras panel Statistik). */
const MOOD_ICONS: Record<string, typeof Laugh> = {
  Ceria: Laugh,
  Baik: Smile,
  Biasa: Meh,
  Lelah: BatteryLow,
}

/** Label tanggal gaya catatan: "15 Jun" (id-ID singkat, tanpa titik). */
export function noteDayLabel(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
  })
    .format(fromISO(iso))
    .replace(/\s/g, ' ')
    .trim()
}

/**
 * Catatan yang dibuat pada tanggal ISO — v2.36 (audit visualisasi
 * Tahap 1): pencocokan EKSAK lewat noteDateISO (field ISO, atau
 * tanggal-dibuat dari id note-/quote-<epoch>). Label-lawas hanya
 * dipakai sebagai jaring pengaman untuk catatan yang tanggalnya
 * benar-benar tak dapat dipastikan — hasilnya tidak lagi “perkiraan”
 * untuk catatan v2.0 manapun.
 */
export function notesOnDate(notes: Note[], iso: string, today: string): Note[] {
  const expected = noteDayLabel(iso).toLowerCase().trim()
  return notes.filter((n) => {
    const exact = noteDateISO(n)
    if (exact != null) return exact === iso
    const label = (n.date ?? '').toLowerCase().trim()
    return label === expected || (label === 'hari ini' && iso === today)
  })
}

/** Jumlah catatan dalam jendela tanggal — pembanding pekan (v2.36:
 *  eksak via noteDateISO, bukan lagi perkiraan label). */
export function notesInWindow(
  notes: Note[],
  start: string,
  end: string,
  today: string,
): number {
  let count = 0
  for (let iso = start; iso <= end; iso = addDaysISO(iso, 1)) {
    count += notesOnDate(notes, iso, today).length
  }
  return count
}

/** Baris kebiasaan hari itu: selesai / jeda terjadwal / belum. */
interface HabitRow {
  id: string
  title: string
  done: boolean
  rest: boolean
}

interface DayData {
  habitRows: HabitRow[]
  doneCount: number
  dayNotes: Note[]
  dayTxs: Tx[]
  masuk: number
  keluar: number
  dayWorkouts: {
    kind: WorkoutKind
    sets: number
    tonase: number
    distance?: number
    duration: number
  }[]
  foodCount: number
  kcal: number
  water?: number
  sleepH?: number
  energy?: number
  mood?: string
  empty: boolean
}

/** Derivasi data satu hari — dipakai bersama sheet & panel. */
function useDayData(shown: string): DayData | null {
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const notes = useRutina((s) => s.notes)
  const txs = useRutina((s) => s.txs)
  const workouts = useRutina((s) => s.workouts)
  const foodEntries = useRutina((s) => s.foodEntries)
  const bodyLogs = useRutina((s) => s.bodyLogs)
  const moodLogs = useRutina((s) => s.moodLogs)
  const today = todayISO()

  return useMemo<DayData | null>(() => {
    const dayHabits = habitsOn(habits, shown)
    const habitRows: HabitRow[] = dayHabits.map((h) => ({
      id: h.id,
      title: h.title,
      done: isDoneOn(completions, shown, h.id),
      rest: (h.restDays ?? []).includes(shown),
    }))
    const doneCount = habitRows.filter((r) => r.done).length

    const dayNotes = notesOnDate(notes, shown, today)
    const allDayTxs = txs.filter((t) => t.ts === shown)
    const dayTxs = allDayTxs.slice(0, 5)
    const masuk = allDayTxs
      .filter((t) => t.type === 'masuk')
      .reduce((a, t) => a + t.amount, 0)
    const keluar = allDayTxs
      .filter((t) => t.type === 'keluar')
      .reduce((a, t) => a + t.amount, 0)

    const dayWorkouts = workouts
      .filter((w) => w.date === shown)
      .map((w) => ({
        kind: w.kind,
        sets: w.sets.length,
        tonase: tonaseOf(w),
        distance: w.distance,
        duration: w.duration,
      }))

    const dayFoods = foodEntries.filter((f) => f.date === shown)
    const kcal = dayFoods.reduce((a, f) => a + f.kcal, 0)

    const body = bodyLogs[shown]
    const mood = moodLogs[shown] ?? undefined

    const empty =
      habitRows.length === 0 &&
      dayNotes.length === 0 &&
      allDayTxs.length === 0 &&
      dayWorkouts.length === 0 &&
      dayFoods.length === 0 &&
      !body &&
      !mood

    return {
      habitRows,
      doneCount,
      dayNotes,
      dayTxs,
      masuk,
      keluar,
      dayWorkouts,
      foodCount: dayFoods.length,
      kcal,
      water: body?.water,
      sleepH: body?.sleepH,
      energy: body?.energy,
      mood,
      empty,
    }
  }, [shown, habits, completions, notes, txs, workouts, foodEntries, bodyLogs, moodLogs, today])
}

/* Ikon status kebiasaan: selesai / jeda / belum. */
const habitIcon = (row: HabitRow) =>
  row.done ? (
    <Check className="h-4 w-4" strokeWidth={2.4} />
  ) : row.rest ? (
    <Moon className="h-4 w-4" strokeWidth={2.2} />
  ) : (
    <X className="h-4 w-4" strokeWidth={2.4} />
  )

/**
 * DayDetailBody — tubuh detail hari yang dibagi sheet & panel.
 * `listClassName` mengatur wadah gulirnya (sheet: flex-1; panel: max-h).
 * `headerAction` mengisi slot aksi kepala seksi — dipakai sheet untuk
 * tombol tutup (panel desktop permanen tak membutuhkannya).
 */
function DayDetailBody({
  shown,
  listClassName,
  headerAction,
}: {
  shown: string
  listClassName: string
  headerAction?: ReactNode
}) {
  const catMeta = useCatMeta()
  const data = useDayData(shown)

  return (
    <>
      <div className="pb-1">
        <RutinaSectionHeader
          eyebrow="Detail harian"
          title={longDateLabel(shown)}
          action={headerAction}
        />
      </div>

      <div className={listClassName}>
        {data?.empty ? (
          <RutinaEmptyState
            icon={<CalendarDays />}
            title="Tidak ada aktivitas tercatat"
            description="Tidak ada kebiasaan terjadwal, catatan, transaksi, atau latihan untuk tanggal ini."
          />
        ) : (
          data && (
            <>
              {/* Kebiasaan — ringkasan read-only. */}
              {data.habitRows.length > 0 && (
                <div>
                  <p className="px-0.5 text-eyebrow font-semibold uppercase tracking-[0.12em] text-content-muted">
                    Kebiasaan — {data.doneCount} dari {data.habitRows.length} selesai
                    {/* v2.36: persentase kepatuhan hari itu (denominator =
                        kebiasaan terjadwal saja, hari jeda tetap terhitung
                        sebagaimana daftar barisnya). */}
                    {data.doneCount > 0 &&
                      ` (${Math.round((data.doneCount / data.habitRows.length) * 100)}%)`}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {data.habitRows.map((row) => (
                      <li
                        key={row.id}
                        className="flex items-center gap-3 rounded-2xl bg-surface-sunken px-3 py-2.5"
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            row.done
                              ? 'bg-secondary text-success'
                              : row.rest
                                ? 'bg-gold/25 text-warning'
                                : 'bg-surface-primary text-content-muted'
                          }`}
                        >
                          {habitIcon(row)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block line-clamp-2 break-words text-note font-semibold leading-snug text-content-primary">
                            {row.title}
                          </span>
                          <span className="mt-0.5 block text-eyebrow font-medium text-content-muted">
                            {row.done
                              ? 'Selesai'
                              : row.rest
                                ? 'Jeda terjadwal'
                                : 'Belum selesai'}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Catatan — pencocokan label terbaik. */}
              {data.dayNotes.length > 0 && (
                <div>
                  <p className="px-0.5 text-eyebrow font-semibold uppercase tracking-[0.12em] text-content-muted">
                    Catatan
                  </p>
                  <ul className="mt-2 space-y-2">
                    {data.dayNotes.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-2xl bg-surface-sunken px-3 py-2.5"
                      >
                        <p className="flex items-center gap-1.5 text-note font-semibold text-content-primary">
                          <NotebookPen
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0 text-primary"
                          />
                          <span className="min-w-0 line-clamp-2 break-words leading-snug">{n.title}</span>
                        </p>
                        <p className="mt-1 line-clamp-1 text-meta leading-relaxed text-content-muted">
                          {n.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Keuangan — total arus + hingga 5 mutasi. */}
              {(data.masuk > 0 || data.keluar > 0) && (
                <div>
                  <p className="px-0.5 text-eyebrow font-semibold uppercase tracking-[0.12em] text-content-muted">
                    Keuangan
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-surface-sunken px-3 py-2.5">
                      <p className="text-chart-label font-semibold uppercase tracking-[0.1em] text-content-muted">
                        Keluar
                      </p>
                      <p className="mt-0.5 truncate text-body font-bold tabular-nums text-content-danger">
                        −{formatIDR(data.keluar)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-sunken px-3 py-2.5">
                      <p className="text-chart-label font-semibold uppercase tracking-[0.1em] text-content-muted">
                        Masuk
                      </p>
                      <p className="mt-0.5 truncate text-body font-bold tabular-nums text-success">
                        +{formatIDR(data.masuk)}
                      </p>
                    </div>
                  </div>
                  <ul className="mt-2.5 space-y-2">
                    {data.dayTxs.map((tx) => {
                      const income = tx.type === 'masuk'
                      const transfer = tx.type === 'transfer'
                      return (
                        <li
                          key={tx.id}
                          className="flex items-center gap-2.5 rounded-2xl bg-surface-sunken px-3 py-2"
                        >
                          <span className="min-w-0 flex-1 line-clamp-2 break-words text-meta font-semibold leading-snug text-content-primary">
                            {tx.note || catMeta(tx.cat).label}
                          </span>
                          <span className="shrink-0 rounded-full bg-surface-primary px-2 py-0.5 text-chart-label font-semibold text-content-muted">
                            {catMeta(tx.cat).label}
                          </span>
                          <span
                            className={`shrink-0 text-meta font-bold tabular-nums ${
                              transfer
                                ? 'text-content-muted'
                                : income
                                  ? 'text-success'
                                  : 'text-content-danger'
                            }`}
                          >
                            {transfer ? '' : income ? '+' : '−'}
                            {formatIDRShort(tx.amount)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {/* Aktivitas — latihan & asupan. */}
              {(data.dayWorkouts.length > 0 || data.foodCount > 0) && (
                <div>
                  <p className="px-0.5 text-eyebrow font-semibold uppercase tracking-[0.12em] text-content-muted">
                    Aktivitas
                  </p>
                  <ul className="mt-2 space-y-2">
                    {data.dayWorkouts.map((w, i) => {
                      const isStrength = w.kind === 'beban'
                      const km =
                        w.distance != null
                          ? w.distance.toFixed(1).replace('.', ',')
                          : null
                      return (
                        <li
                          key={`wo-${i}`}
                          className="flex items-center gap-3 rounded-2xl bg-surface-sunken px-3 py-2.5"
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              isStrength
                                ? 'bg-secondary text-success'
                                : 'bg-clay/20 text-content-danger'
                            }`}
                          >
                            {isStrength ? (
                              <Dumbbell className="h-4 w-4" />
                            ) : (
                              <Footprints className="h-4 w-4" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-note font-semibold text-content-primary">
                              {w.kind === 'beban'
                                ? `Barbel · ${w.sets} set`
                                : w.kind === 'badminton'
                                  ? 'Badminton'
                                  : `${w.kind === 'jalan' ? 'Jalan' : w.kind === 'lari' ? 'Lari' : 'Lari + Jalan'}${km ? ` · ${km} km` : ''}`}
                            </span>
                            <span className="mt-0.5 block text-eyebrow font-medium tabular-nums text-content-muted">
                              {isStrength
                                ? `${Math.round(w.tonase).toLocaleString('id-ID')} kg tonase · ${w.duration} mnt`
                                : `${w.duration} mnt`}
                            </span>
                          </span>
                        </li>
                      )
                    })}
                    {data.foodCount > 0 && (
                      <li className="flex items-center gap-3 rounded-2xl bg-surface-sunken px-3 py-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/25 text-warning">
                          <UtensilsCrossed className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-note font-semibold text-content-primary">
                            Asupan — {data.foodCount} catatan
                          </span>
                          <span className="mt-0.5 block text-eyebrow font-medium tabular-nums text-content-muted">
                            {data.kcal.toLocaleString('id-ID')} kkal tercatat
                          </span>
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Tubuh & mood — chip ringkas. */}
              {(data.mood || data.water != null || data.sleepH != null || data.energy != null) && (
                <div>
                  <p className="px-0.5 text-eyebrow font-semibold uppercase tracking-[0.12em] text-content-muted">
                    Tubuh &amp; suasana
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {data.mood && (
                      <span className="flex items-center gap-1.5 rounded-full bg-surface-sunken px-3 py-1.5 text-meta font-semibold text-content-secondary">
                        {(() => {
                          const MoodIcon = MOOD_ICONS[data.mood] ?? Smile
                          return (
                            <MoodIcon
                              aria-hidden="true"
                              className="h-3.5 w-3.5 text-primary"
                            />
                          )
                        })()}
                        Mood: {data.mood}
                      </span>
                    )}
                    {data.water != null && (
                      <span className="flex items-center gap-1.5 rounded-full bg-surface-sunken px-3 py-1.5 text-meta font-semibold text-content-secondary">
                        <Droplets aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                        Hidrasi {data.water} gelas
                      </span>
                    )}
                    {data.sleepH != null && (
                      <span className="flex items-center gap-1.5 rounded-full bg-surface-sunken px-3 py-1.5 text-meta font-semibold text-content-secondary">
                        <Moon aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                        Tidur {data.sleepH.toString().replace('.', ',')} jam
                      </span>
                    )}
                    {data.energy != null && (
                      <span className="flex items-center gap-1.5 rounded-full bg-surface-sunken px-3 py-1.5 text-meta font-semibold text-content-secondary">
                        <Zap aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
                        Energi {data.energy}/5
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>
    </>
  )
}

export function DayDetailSheet({
  date,
  onClose,
}: {
  date: string | null
  onClose: () => void
}) {
  /* Tanggal terakhir tak-null — konten tetap tergambar selama animasi
     keluar sheet (pola draf reset render-time, tanpa useEffect). */
  const [lastDate, setLastDate] = useState(date)
  if (date != null && date !== lastDate) setLastDate(date)
  const shown = date ?? lastDate

  return (
    <RutinaSheet
      open={date != null}
      onClose={onClose}
      label="Detail aktivitas harian"
      className="max-h-[calc(100%-2rem)] flex flex-col overflow-hidden"
    >
      {shown ? (
        <DayDetailBody
          shown={shown}
          listClassName="mt-3 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pb-3 no-scrollbar"
          /* Kontrol tutup eksplisit — Esc/backdrop/seret tak terlihat
             bagi pengguna sentuh & pembaca layar (audit a11y); handler
             sama dengan backdrop (onClose milik RutinaSheet). */
          headerAction={
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup detail hari"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          }
        />
      ) : null}
    </RutinaSheet>
  )
}

/**
 * DayDetailPanel — inspector desktop permanen (Data Observatory).
 *
 * Di ruang kerja lebar (kontainer ≥52rem) detail tanggal tampil sebagai
 * kartu yang SELALU hadir di samping kalender — menampilkan tanggal
 * terpilih, atau hari ini bila belum ada pilihan. Ponsel tetap memakai
 * DayDetailSheet; pemilihan mode diatur layar Statistik.
 */
export function DayDetailPanel({
  date,
  className,
}: {
  date: string
  className?: string
}) {
  return (
    <RutinaCard
      radius="2xl"
      density="comfortable"
      className={cn('shadow-soft', className)}
    >
      {/* Ganti tanggal = pergantian isi; crossfade pendek supaya panel
          terasa hidup tanpa mengganggu membaca. */}
      <m.div
        key={date}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={motionTokens.preset.navigation}
      >
        <DayDetailBody
          shown={date}
          listClassName="mt-3 max-h-[540px] space-y-5 overflow-y-auto overscroll-contain pb-1 no-scrollbar"
        />
      </m.div>
    </RutinaCard>
  )
}
