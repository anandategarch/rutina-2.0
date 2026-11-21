'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LayoutGroup,
  useReducedMotion,
} from 'motion/react'
import * as m from 'motion/react-m'
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Flame,
  Link2,
  Pencil,
  Plus,
  Search,
  Snowflake,
  Sprout,
  Sun,
  Sunrise,
  Sunset,
  Timer,
  Trash2,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { journalCard, journalList } from '@/lib/motion/variants'
import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { barFill, pressSnappy } from '@/lib/motion/transitions'
import { useMinWidth } from '../use-min-width'
import { RutinaSheet } from '../rutina-sheet'

import {
  PLANT_STAGES,
  goldilocksGroups,
  missedYesterday,
  plantStageOf,
} from '../habit-coach'
import { CoachGroupCard } from '../coach-card'
import { PlantGarden } from '../plant-garden'
import { GrowthVine } from '../visualizations/habits/growth-vine'
import Heatmap from '../heatmap'
import { HabitComparisonMatrix } from '../habit-comparison-matrix'
import { PlantGlyph } from '../plant-glyph'
import { RutinaCard } from '../rutina-card'
import { RutinaEmptyState } from '../rutina-empty-state'
import { RutinaMetric } from '../rutina-metric'
import { RutinaSectionHeader } from '../rutina-section-header'
import { playfair } from '../serif'
import {
  HABIT_CATS,
  HABIT_CAT_COLORS,
  WEEKDAY_MIN,
  addDaysISO,
  dayCompliance,
  habitProgressOn,
  habitStatusOn,
  habitStreak,
  habitWeeklyRates,
  habitsOn,
  isDoneOn,
  longDateLabel,
  scheduledOn,
  todayISO,
  useRutina,
  weekStartISO,
  type Completions,
  type Habit,
  type HabitDayStatus,
} from '../store'

/* ===== Layar Kebiasaan — tiga konsep, tiga komposisi (Rutina 2.0 Tahap 2) =====
 *
 * Audit pemolesan layar: tiga konsep yang tadinya bertumpuk pola kartu
 * (TaskRow di mana-mana) kini dipisah dengan IDENTITAS KOMPOSISI berbeda:
 *
 *   1. AGENDA HARI INI  — paling operasional. Halaman planner kertas
 *      (paper-surface): garis margin kiri rose clay; baris menunggu
 *      dikelompokkan ke rel timeline Pagi/Siang/Malam (agenda-rail),
 *      baris padat mudah dipindai (nama + jam · kategori + mini-history
 *      7 hari), selesai diredupkan di ekor "Selesai", plus stepper
 *      kebiasaan terukur. Centang = check-in.
 *   2. KONSISTENSI      — satu komposisi kebun (garden-surface) berisi
 *      bedeng metrik (garden-bed: runtun, capaian pekan, tanaman) dan
 *      Taman Pertumbuhan. Identitas botani, terpisah jelas dari agenda.
 *   3. PERPUSTAKAAN     — inventaris referensi: baris ledger hairline
 *      ringkas per kategori/grup (nama, jadwal, runtun mini, titik warna
 *      kategori, mini-history 7 hari). Tidak bersaing dengan agenda.
 *
 * Panel Detail Kebiasaan dibagikan dua jalur: inline di bawah baris
 * terpilih (ponsel/tablet) dan kolom kanan split-screen (ruang ≥52rem).
 */

/** Pagar Agenda Kebiasaan (audit v2.37) — kondisi awal maks 5 baris. */
const AGENDA_LIMIT = 5
/** Perpustakaan: baris awal per grup sebelum "Tampilkan semua". */
const LIBRARY_GROUP_PREVIEW = 3

/** Nomor pekan ISO (1–53) dari tanggal iso — untuk eyebrow "Tamanmu ·
 *  Pekan N" pada hero Growth Garden (v2.46; audit Warm Editorial P2.0). */
function isoWeekOf(iso: string): number {
  const d = new Date(`${iso}T00:00:00Z`)
  const day = (d.getUTCDay() + 6) % 7 // Senin = 0
  d.setUTCDate(d.getUTCDate() - day + 3) // Kamis pekan ini
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const fday = (firstThu.getUTCDay() + 6) % 7
  firstThu.setUTCDate(firstThu.getUTCDate() - fday + 3)
  return 1 + Math.round((d.getTime() - firstThu.getTime()) / 604800000)
}

/** Ambang "dirawat" pekan berjalan — sejajar dengan vonis "sehat"
 * (≥ 80%) pada bedeng capaian pekan; dipakai hero Growth Garden. */
const TENDED_WEEK_PCT = 80

/** Jumlah selesai satu kebiasaan sepanjang pekan (sampai tanggal iso). */
function weekDoneCount(c: Completions, habitId: string, iso: string): number {
  let cursor = weekStartISO(iso)
  let n = 0
  for (let i = 0; i < 7; i++) {
    if (cursor > iso) break
    if (isDoneOn(c, cursor, habitId)) n++
    cursor = addDaysISO(cursor, 1)
  }
  return n
}

/** Urutan alami agenda: jam pengingat, lalu judul. */
function byTime(a: Habit, b: Habit): number {
  const ra = a.reminder ?? '99:99'
  const rb = b.reminder ?? '99:99'
  return ra === rb ? a.title.localeCompare(b.title) : ra < rb ? -1 : 1
}

/** Kelompok waktu agenda (semantik senada home.tsx) — urutan render
 *  mengikuti ritme hari: pagi → siang → malam, "Kapan saja" di ekor. */

type AgendaSlot = 'pagi' | 'siang' | 'malam' | 'bebas'

const SLOT_META: { key: AgendaSlot; label: string; icon: LucideIcon }[] = [
  { key: 'pagi', label: 'Pagi', icon: Sunrise },
  { key: 'siang', label: 'Siang', icon: Sun },
  { key: 'malam', label: 'Malam', icon: Sunset },
  { key: 'bebas', label: 'Kapan saja', icon: Clock },
]

/** Kelompok waktu sebuah kebiasaan dari jam pengingat ("HH:MM").
 *  Tanpa pengingat → "Kapan saja" (selalu ditempatkan terakhir). */
function slotOf(h: Habit): AgendaSlot {
  const r = h.reminder
  if (!r) return 'bebas'
  if (r < '12:00') return 'pagi'
  if (r < '17:00') return 'siang'
  return 'malam'
}

/** Jadwal ringkas satu baris perpustakaan: "Setiap hari" / "Sen·Rab·Jum".
 *  Jadwal kosong ATAU tujuh hari penuh keduanya berarti setiap hari
 *  (scheduledOn memperlakukan keduanya sama) — tampilkan bentuk pendeknya. */
function scheduleLabelOf(h: Habit): string {
  if (h.schedule.length === 0 || h.schedule.length >= 7) return 'Setiap hari'
  return [...h.schedule]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_MIN[d])
    .join('·')
}

/** Label jam baris agenda — jam pengingat, atau "Kapan saja". */
function timeLabelOf(h: Habit): string {
  return h.reminder ? `${h.reminder} WIB` : 'Kapan saja'
}

/* ===== Mini-history 7 hari — titik Senin..Minggu pekan berjalan ===== */

const WEEK_DOT_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const

/**
 * Deretan 7 titik mini (±7px, jarak 3px) — sadar-jadwal via
 * habitStatusOn (v2.49 audit): selesai = aksen domain, terlewat = clay,
 * hari-jeda & tanpa-jadwal = titik redup (BUKAN kegagalan), masa depan
 * diredupkan. Sebelumnya seluruh hari tanpa jadwal/hari-jeda dirender
 * identik dengan hari TERLEWAT — melanggar "tanpa jadwal ≠ kegagalan"
 * pada kebiasaan Sen/Rab/Jum (4 titik "belum selesai" palsu per pekan).
 * Dipakai pada baris agenda & perpustakaan (komposisi layar ini sendiri,
 * bukan lewat task-row).
 */
function WeekDots({
  completions,
  habit,
  today,
}: {
  completions: Completions
  habit: Habit
  today: string
}) {
  const start = weekStartISO(today)
  const dots = WEEK_DOT_LABELS.map((label, i) => {
    const iso = addDaysISO(start, i)
    return {
      label,
      iso,
      status: habitStatusOn(habit, completions, iso, today),
    }
  })
  const doneCount = dots.filter((d) => d.status === 'done').length

  return (
    <span
      role="img"
      aria-label={`Riwayat pekan ini: ${doneCount} hari selesai sesuai jadwal`}
      className="flex shrink-0 items-center gap-[3px]"
    >
      {dots.map((d) => (
        <span
          key={d.label}
          aria-hidden="true"
          title={`${d.label} — ${
            d.status === 'done'
              ? 'selesai'
              : d.status === 'missed'
                ? 'terjadwal, belum selesai'
                : d.status === 'pending'
                  ? 'hari ini — masih ada waktu'
                  : d.status === 'rest'
                    ? 'hari jeda'
                    : d.status === 'future'
                      ? 'belum terjadi'
                      : 'tanpa jadwal'
          }`}
          className={
            'h-[7px] w-[7px] rounded-full ' +
            (d.status === 'done'
              ? 'bg-module-accent'
              : d.status === 'missed'
                ? 'bg-clay'
                : d.status === 'pending'
                  ? 'bg-module-accent/50'
                  : d.status === 'rest'
                    ? 'bg-module-accent/35'
                    : d.status === 'future'
                      ? 'bg-surface-secondary opacity-40'
                      : 'bg-surface-sunken')
          }
        />
      ))}
    </span>
  )
}

/* ===== Tombol centang kebiasaan — satu-satunya jalur check-in baris ===== */

/**
 * Lingkaran centang ala planner: terisi Rose Clay (module accent) saat
 * selesai, garis tepi halus saat menunggu. Pop ikon memakai spring
 * snappy (pola TaskRow) — umpan balik yang sama di seluruh produk.
 */
function HabitCheck({
  done,
  label,
  size = 'md',
  onToggle,
}: {
  done: boolean
  label: string
  size?: 'md' | 'sm'
  onToggle: () => void
}) {
  return (
    <m.button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      onClick={onToggle}
      /* v2.31 Garden: umpan balik tekan taktil (audit: pop hanya terjadi
         SETELAH state berubah — kini tekan terasa DULU). v2.35: 0.88 → 0.92
         — aksi paling sering dipakai di produk; rentang 0.92–0.96 terasa
         responsif tanpa "mengecil jauh" (audit polish, selaras konvensi
         skala tekan 0.90–0.92 untuk kontrol ikon kecil di tokens.ts). */
      whileTap={{ scale: 0.92 }}
      transition={pressSnappy}
      /* Hit-slop ±8px via ::before — centang tetap 32–36px visual tapi
         target sentuh ≥44px (WCAG 2.5.8) tanpa mengubah tata letak. */
      className={`interactive relative flex shrink-0 cursor-pointer items-center justify-center rounded-full border-2 before:absolute before:-inset-2 before:content-[''] ${
        size === 'md' ? 'h-9 w-9' : 'h-8 w-8'
      } ${
        done
          ? 'border-module-accent bg-module-accent text-module-accent-fg'
          : 'border-border-strong text-transparent hover:border-module-accent/60'
      }`}
    >
      <m.span
        key={String(done)}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={pressSnappy}
        aria-hidden="true"
        className="flex"
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </m.span>
    </m.button>
  )
}

/* ===== Baris agenda — pola baris planner di atas paper-surface ===== */

/**
 * Satu baris agenda hari ini: centang, nama mudah dipindai, meta kecil
 * (jam · kategori · progres terukur · runtun), dan mini-history 7 hari.
 * Kebiasaan terukur mendapat strip stepper tipis di bawah baris (pola
 * yang sama dengan TaskRow — baca progres SEGAR dari store saat ditekan
 * agar klik berturut-turut tetap akurat). Ketuk badan baris membuka
 * sheet sunting kebiasaan.
 *
 * Semua penutupan hanya menangkap PROP + selektor store (pola
 * HabitDetailPanel) — aman bagi React Compiler.
 */
function AgendaRow({
  habit,
  done,
  completions,
  today,
  missedYesterday = false,
  onToggle,
  onEdit,
}: {
  habit: Habit
  done: boolean
  completions: Completions
  today: string
  /** Badge "Terlewat kemarin" — dihitung sekali oleh induk (audit
   *  v2.37: kartu pemulihan terpisah dilarang untuk kasus ini). */
  missedYesterday?: boolean
  onToggle: () => void
  onEdit: () => void
}) {
  const setHabitValue = useRutina((s) => s.setHabitValue)
  /* Sumber penyelesaian otomatis (audit v2.37 §4D) — tampil sebagai
     status kecil bila completion hari ini berasal dari sesi Bugar. */
  const habitAuto = useRutina((s) => s.habitAuto)
  const autoToday = (habitAuto[habit.id]?.[today]?.wo ?? []).length > 0

  /* Kebiasaan terukur — progres & persentase hari yang dilihat. */
  const isMeasured = habit.target != null && habit.target > 0
  const progress = isMeasured
    ? habitProgressOn(habit, completions, today)
    : 0
  const measuredPct = isMeasured
    ? Math.min(
        100,
        Math.round((progress / Math.max(1, habit.target ?? 1)) * 100),
      )
    : 0

  const stepBy = (delta: number) => {
    /* Baca progres SEGAR dari store saat klik (bukan closure render). */
    const cur = habitProgressOn(
      habit,
      useRutina.getState().completions,
      today,
    )
    setHabitValue(habit.id, today, cur + delta)
  }

  const streak = habitStreak(habit, completions, today)
  const meta = [
    timeLabelOf(habit),
    habit.cat,
    isMeasured ? `${progress}/${habit.target} ${habit.unit ?? 'kali'}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="rounded-xl transition-colors duration-200 hover:bg-surface-sunken/60">
      {/* Baris utama — centang, nama + meta, mini-history pekan */}
      <div className="flex min-h-12 items-center gap-2.5 px-2 py-2">
        <HabitCheck
          done={done}
          label={`Tandai selesai: ${habit.title}`}
          onToggle={onToggle}
        />
        <button
          type="button"
          onClick={onEdit}
          className="interactive min-w-0 flex-1 cursor-pointer rounded-lg px-1 py-0.5 text-left"
        >
          <span
            className={
              'break-words text-section font-medium leading-snug tracking-tight line-clamp-2 ' +
              (done
                ? 'text-content-muted line-through'
                : 'text-content-primary')
            }
          >
            {habit.title}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-eyebrow font-medium text-content-muted">
            <span className="truncate tabular-nums">{meta}</span>
            {missedYesterday && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-gold/20 px-1.5 py-0.5 font-semibold text-warning">
                Terlewat kemarin
              </span>
            )}
            {autoToday && done && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-1.5 py-0.5 font-semibold text-module-accent-strong">
                Otomatis · Bugar
              </span>
            )}
            {streak > 0 && (
              <span
                className="flex shrink-0 items-center gap-0.5 text-module-accent-strong"
                title={`${streak} hari berturut-turut`}
              >
                <Flame className="h-3 w-3" aria-hidden="true" />
                <span className="tabular-nums">{streak}</span>
                <span className="sr-only"> hari berturut-turut</span>
              </span>
            )}
            <span className="sr-only">
              . Ketuk untuk menyunting kebiasaan ini.
            </span>
          </span>
        </button>
        <WeekDots completions={completions} habit={habit} today={today} />
      </div>

      {/* Strip stepper kebiasaan terukur — hanya saat belum selesai */}
      {isMeasured && !done && (
        <div className="mx-2 mb-2 mt-1 flex items-center gap-2.5 border-t border-border/70 pl-[46px] pr-1 pt-2">
          <button
            type="button"
            onClick={() => stepBy(-1)}
            disabled={progress <= 0}
            aria-label="Kurangi progres"
            /* Hit-slop: tombol 36px visual, target sentuh ≥44px. */
            className="interactive relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-primary text-content-secondary before:absolute before:-inset-2 before:content-['']"
          >
            <span aria-hidden="true" className="text-note font-bold">
              −
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-eyebrow font-bold tabular-nums text-content-secondary">
                {progress}
                <span className="font-medium text-content-muted">
                  /{habit.target} {habit.unit ?? 'kali'}
                </span>
              </span>
              <span className="text-eyebrow font-semibold tabular-nums text-content-muted">
                {measuredPct}%
              </span>
            </div>
            <div
              className="mt-1 h-1 overflow-hidden rounded-full bg-border"
              role="progressbar"
              aria-label={`Progres ${habit.title}: ${progress} dari ${habit.target} ${habit.unit ?? 'kali'}`}
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={habit.target ?? 1}
            >
              <m.div
                className="h-full origin-left rounded-full bg-module-accent"
                style={{ width: '100%' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: measuredPct / 100 }}
                transition={barFill}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => stepBy(1)}
            aria-label="Tambah progres"
            /* Hit-slop: tombol 36px visual, target sentuh ≥44px. */
            className="interactive relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-module-accent/50 bg-module-accent-soft text-module-accent-strong before:absolute before:-inset-2 before:content-['']"
          >
            <span aria-hidden="true" className="text-note font-bold">
              +
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

/* ===== Baris perpustakaan — baris ledger ringkas (inventaris) ===== */

/**
 * Satu baris inventaris: status hari ini (NON-INTERAKTIF — audit
 * v2.37: Perpustakaan bukan Agenda kedua, tidak ada jalur centang
 * kedua), titik warna kategori, nama, jadwal ringkas + runtun mini,
 * dan mini-history 7 hari. Ketuk badan baris membuka Panel Detail
 * (bottom sheet pada layar sempit, kolom kanan split-screen pada
 * ruang kerja lebar).
 */
function LibraryRow({
  habit,
  done,
  streak,
  completions,
  today,
  selected,
  onSelect,
}: {
  habit: Habit
  done: boolean
  streak: number
  completions: Completions
  today: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <div
      className={
        'flex min-h-11 items-center gap-2.5 py-1.5 pl-1 pr-1.5 transition-[background-color,box-shadow] duration-150 ' +
        (selected
          ? 'bg-module-accent-soft/60 [box-shadow:inset_2px_0_0_var(--module-accent)]'
          : '[box-shadow:inset_2px_0_0_transparent] hover:bg-surface-sunken/60')
      }
    >
      {/* Status hari ini — NON-INTERAKTIF (audit v2.37): Perpustakaan
          adalah inventaris; satu-satunya jalur centang hidup di Agenda. */}
      <span
        aria-hidden="true"
        className={
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300 ' +
          (done
            ? 'border-module-accent bg-module-accent/15 text-module-accent-strong'
            : 'border-border text-transparent')
        }
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={selected}
        className="interactive min-w-0 flex-1 cursor-pointer rounded-lg px-1 py-0.5 text-left"
      >
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: HABIT_CAT_COLORS[habit.cat] }}
          />
          <span
            className={
              'truncate text-note font-semibold leading-snug ' +
              (done ? 'text-content-muted line-through' : 'text-content-primary')
            }
          >
            {habit.title}
          </span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-eyebrow font-medium text-content-muted">
          <span className="truncate">{scheduleLabelOf(habit)}</span>
          {streak > 0 && (
            <>
              <span
                aria-hidden="true"
                className="shrink-0 text-content-muted/50"
              >
                ·
              </span>
              <Flame
                aria-hidden="true"
                className="h-3 w-3 shrink-0 text-module-accent-strong"
              />
              <span className="shrink-0 tabular-nums">{streak} hari</span>
            </>
          )}
          <span className="sr-only">
            {done ? 'Sudah selesai hari ini.' : 'Belum selesai hari ini.'}
            {' '}Ketuk untuk membuka detail.
          </span>
        </span>
      </button>
      <WeekDots completions={completions} habit={habit} today={today} />
    </div>
  )
}

/* ===== Panel Detail Kebiasaan — inline (ponsel) + kolom kanan (desktop) ===== */

/**
 * Panel detail kebiasaan terpilih: identitas kategori, deskripsi, metrik
 * cerdas (runtun, capaian pekan, tahap tanaman, versi 2 menit, susun
 * kebiasaan, hari jeda), riwayat 30 hari, aksi "cukup versi 2 menit",
 * dan sunting. Semua ikon/tint memakai aksen domain (Rose Clay).
 *
 * Kebiasaan diterima sebagai PROP — semua penutupan di dalamnya hanya
 * menangkap prop, bukan nilai turunan state induk, sehingga aman bagi
 * React Compiler (pola penutupan over prop sama dengan TaskRow).
 */
function HabitDetailPanel({
  habit,
  habits,
  completions,
  today,
  onEdit,
  onCompleteMini,
}: {
  habit: Habit
  habits: Habit[]
  completions: Completions
  today: string
  onEdit: (id: string) => void
  /** Aksi “cukup versi 2 menit” — menerima kebiasaan sebagai argumen. */
  onCompleteMini?: (habit: Habit) => void
}) {
  /* Kelola cepat (audit CRUD v2.26) — arsip & hapus kini terjangkau
     LANGSUNG dari panel detail, tak perlu membuka sheet sunting dan
     menggulir ke dasarnya (akar keluhan "tidak ada opsi hapus"). */
  const setHabitArchived = useRutina((s) => s.setHabitArchived)
  const deleteHabit = useRutina((s) => s.deleteHabit)
  /* Metrik inti — dihitung dari histori nyata; dipakai di JSX saja. */
  const streak = habitStreak(habit, completions, today)
  const weekDone = weekDoneCount(completions, habit.id, today)
  const plant = plantStageOf(habit, completions, today)
  const nextStageLabel = plant.nextAt
    ? PLANT_STAGES[plant.index + 1]?.label
    : null
  const doneToday = isDoneOn(completions, today, habit.id)

  /* Riwayat 30 hari terakhir, tua ke baru — v2.36 (audit visualisasi
     Tahap 2): status LIMA arah, bukan biner done/kosong. Hari tanpa
     jadwal, hari jeda, dan hari masa depan tampil berbeda dari
     kegagalan sehingga pengguna tidak merasa gagal pada hari yang
     memang tidak dijadwalkan. */
  const history: { iso: string; status: HabitDayStatus }[] = []
  for (let i = 29; i >= 0; i--) {
    const iso = addDaysISO(today, -i)
    history.push({ iso, status: habitStatusOn(habit, completions, iso, today) })
  }
  const statusCount = (s: HabitDayStatus) =>
    history.filter((h) => h.status === s).length
  const nDone = statusCount('done')
  const nMissed = statusCount('missed')
  /* v2.45 (audit): hari berjalan PENDING — hari ini yang belum selesai
     di jam 08.00 bukan "terlewat"; vonis menunggu sampai tengah malam. */
  const nPending = statusCount('pending')
  const nRest = statusCount('rest')
  const nUnscheduled = statusCount('unscheduled')

  /* Tren empat pekan — persentase penyelesaian sadar-jadwal per pekan
     (audit v2.36): konsistensi kebiasaan individual dari pekan ke pekan. */
  const weekly = habitWeeklyRates(habit, completions, today, 4)

  /* Susun kebiasaan — kebiasaan pemicu (bila dipasang). */
  const afterHabit = habit.afterId
    ? habits.find((x) => x.id === habit.afterId)
    : undefined

  return (
    <m.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionTokens.duration.enter,
        delay: motionTokens.delay.normal,
        ease: motionTokens.easing.standard,
      }}
    >
      <RutinaCard variant="elevated" density="spacious" radius="2xl">
        <RutinaSectionHeader
          title={habit.title}
          eyebrow="Detail kebiasaan"
          accent
        />

        {/* Baris identitas — titik warna kategori + labelnya */}
        <p className="mt-2 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: HABIT_CAT_COLORS[habit.cat] }}
          />
          <span className="text-meta font-medium tracking-tight text-content-secondary">
            {habit.cat}
          </span>
        </p>

        {habit.desc && (
          <p className="mt-2.5 text-meta leading-relaxed text-content-secondary">
            {habit.desc}
          </p>
        )}

        {/* Metrik kebiasaan — angka kunci + wawasan cerdas bila ada */}
        <div className="mt-5 space-y-4">
          <RutinaMetric
            label="Streak saat ini"
            value={streak}
            unit="hari"
            trend={streak > 0 ? 'up' : 'neutral'}
            caption="hari terjadwal berturut"
            icon={Flame}
            iconClassName="bg-module-accent-soft text-module-accent-strong"
            size="sm"
          />
          <RutinaMetric
            label="Selesai pekan ini"
            value={weekDone}
            unit="kali"
            caption={`dari ${habit.weeklyTarget} target pekanan`}
            icon={Check}
            iconClassName="bg-secondary text-content-secondary"
            size="sm"
            progress={
              habit.weeklyTarget > 0
                ? weekDone / habit.weeklyTarget
                : undefined
            }
          />
          {/* Tahap tanaman — glif botani + progres menuju tahap berikutnya */}
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-module-accent-soft text-module-accent-strong"
            >
              <PlantGlyph
                stage={plant.stage.key}
                className="h-[18px] w-[18px]"
              />
            </span>
            <div className="min-w-0">
              <p className="text-eyebrow font-semibold uppercase tracking-[0.08em] text-content-muted">
                Tahap tanaman
              </p>
              <p className="mt-0.5 text-note font-bold leading-none tracking-tight text-content-primary">
                {plant.stage.label}
              </p>
              <p className="mt-0.5 text-meta leading-snug tabular-nums text-content-muted">
                {plant.nextAt
                  ? `${plant.total} dari ${plant.nextAt} menuju ${nextStageLabel ?? 'tahap berikutnya'}`
                  : 'tahap akhir — terus dirawat'}
              </p>
              {/* v2.39 (audit visual data): bar tumbuh menuju tahap
                  berikutnya — rasio sama dengan teks (total/nextAt). */}
              {plant.nextAt != null && plant.nextAt > 0 && (
                <span
                  aria-hidden="true"
                  className="mt-1.5 block h-1.5 max-w-[220px] overflow-hidden rounded-full bg-surface-sunken"
                >
                  <m.span
                    className="block h-full w-full origin-left rounded-full bg-primary"
                    initial={false}
                    animate={{
                      scaleX: Math.min(plant.total / plant.nextAt, 1),
                    }}
                    transition={barFill}
                  />
                </span>
              )}
            </div>
          </div>
          {habit.mini && (
            <RutinaMetric
              label="Versi 2 menit"
              value={
                <span className="inline-block max-w-[240px] truncate align-baseline">
                  {habit.mini}
                </span>
              }
              caption="bentuk terkecil untuk mulai"
              icon={Timer}
              iconClassName="bg-module-accent-soft text-module-accent-strong"
              size="sm"
            />
          )}
          {afterHabit && (
            <RutinaMetric
              label="Setelah"
              value={
                <span className="inline-block max-w-[240px] truncate align-baseline">
                  {afterHabit.title}
                </span>
              }
              caption="susun kebiasaan"
              icon={Link2}
              iconClassName="bg-secondary/70 text-content-secondary"
              size="sm"
            />
          )}
          {habit.restDays.length > 0 && (
            <RutinaMetric
              label="Hari jeda"
              value={habit.restDays.length}
              unit="hari"
              caption="jeda runtun aman terjadwal"
              icon={Snowflake}
              iconClassName="bg-surface-secondary text-content-secondary"
              size="sm"
            />
          )}
        </div>

        {/* Riwayat 30 hari terakhir — lima status (v2.36): selesai,
            terjadwal-terlewat, hari jeda, tanpa jadwal, masa depan. */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
              30 hari terakhir
            </p>
            <p className="text-eyebrow font-medium tabular-nums text-content-muted">
              {nDone} selesai · {nMissed} terlewat
            </p>
          </div>
          <div
            role="img"
            aria-label={`Riwayat 30 hari: ${nDone} hari selesai sesuai jadwal, ${nMissed} terjadwal tapi terlewat, ${nPending} hari ini masih berjalan, ${nRest} hari jeda diampuni, ${nUnscheduled} tanpa jadwal`}
            className="mt-2 flex flex-wrap gap-1"
          >
            {history.map((h) => (
              <span
                key={h.iso}
                aria-hidden="true"
                title={
                  h.status === 'done'
                    ? 'Selesai'
                    : h.status === 'missed'
                      ? 'Terjadwal, belum selesai'
                      : h.status === 'pending'
                        ? 'Hari ini — masih ada waktu'
                        : h.status === 'rest'
                          ? 'Hari jeda'
                          : h.status === 'future'
                            ? 'Akan datang'
                            : 'Tanpa jadwal'
                }
                className={
                  'h-2.5 w-2.5 rounded-full ' +
                  (h.status === 'done'
                    ? 'bg-module-accent'
                    : h.status === 'missed'
                      ? 'bg-clay'
                      : h.status === 'pending'
                        ? 'bg-module-accent/50'
                        : h.status === 'rest'
                          ? 'bg-module-accent/35'
                          : h.status === 'future'
                            ? 'bg-surface-sunken opacity-50'
                            : 'bg-surface-sunken')
                }
              />
            ))}
          </div>
          {/* Legenda status — hanya yang benar-benar ada. */}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-chart-label font-medium text-content-muted">
            {(
              [
                ['done', 'bg-module-accent', 'selesai'],
                ['missed', 'bg-clay', 'terlewat'],
                ['pending', 'bg-module-accent/50', 'hari ini'],
                ['rest', 'bg-module-accent/35', 'jeda'],
                ['unscheduled', 'bg-surface-sunken', 'tanpa jadwal'],
              ] as const
            ).map(([s, dot, label]) =>
              statusCount(s) > 0 ? (
                <span key={s} className="flex items-center gap-1">
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />
                  {label}
                </span>
              ) : null,
            )}
          </div>
        </div>

        {/* Tren empat pekan — persentase penyelesaian sadar-jadwal
            (audit v2.36 Tahap 2); pekan tanpa jadwal = soket kosong. */}
        {weekly.some((w) => w.pct != null) && (
          <div className="mt-5">
            <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
              Tren 4 pekan
            </p>
            <div
              className="mt-2 flex items-end gap-1.5"
              role="img"
              aria-label={`Persentase penyelesaian per pekan: ${weekly
                .map(
                  (w, i) =>
                    `pekan ${i + 1} ${w.pct != null ? `${w.pct}% (${w.done}/${w.scheduled})` : 'tanpa jadwal'}`,
                )
                .join(', ')}`}
            >
              {weekly.map((w, i) => {
                const isCurrent = i === weekly.length - 1
                return (
                  <div
                    key={w.start}
                    className="flex min-w-0 flex-1 flex-col items-center gap-1"
                  >
                    <div className="flex h-16 w-full items-end">
                      {w.pct != null ? (
                        <m.div
                          initial={false}
                          className={`w-full rounded-t-md ${
                            isCurrent ? 'bg-module-accent' : 'bg-module-accent/60'
                          }`}
                          style={{ height: `${Math.max(w.pct, 4)}%` }}
                        />
                      ) : (
                        <div className="h-[3px] w-full rounded-full bg-surface-sunken" />
                      )}
                    </div>
                    <span
                      className={`text-chart-label font-semibold tabular-nums ${
                        isCurrent ? 'text-module-accent-strong' : 'text-content-muted'
                      }`}
                    >
                      P{i + 1}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-1.5 text-eyebrow font-medium text-content-muted">
              Selesai dibanding jadwal per pekan · P4 = pekan berjalan
            </p>
          </div>
        )}

        {/* Aksi “cukup versi 2 menit” — jalur cepat yang dihitung penuh */}
        {habit.mini && onCompleteMini && !doneToday && (
          <button
            type="button"
            onClick={() => onCompleteMini(habit)}
            aria-label={`Selesaikan versi 2 menit: ${habit.mini}`}
            className="interactive mt-5 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-module-accent/50 bg-module-accent-soft/60 px-4 text-note font-bold text-module-accent-strong"
          >
            <Zap className="h-4 w-4 shrink-0" strokeWidth={2.4} />
            <span className="truncate">Cukup 2 menit: {habit.mini}</span>
          </button>
        )}

        {/* Aksi — membuka sheet sunting yang sama dengan tombol Edit baris */}
        <button
          type="button"
          onClick={() => onEdit(habit.id)}
          className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-4 text-note font-bold text-primary-foreground shadow-soft transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Pencil className="h-4 w-4" strokeWidth={2.4} />
          Sunting kebiasaan
        </button>

        {/* Zona kelola — arsip & hapus tanpa membuka sheet sunting.
            Konfirmasi AlertDialog mencegah salah ketuk (pola hapus
            transaksi/catatan/tujuan). */}
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setHabitArchived(habit.id, true)
              toast.success('Kebiasaan diarsipkan — pulihkan kapan pun dari Arsip')
            }}
            className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-surface-primary text-meta font-bold text-content-secondary transition-colors hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Archive className="h-4 w-4" />
            Arsipkan
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label={`Hapus permanen ${habit.title}`}
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-destructive/30 text-content-danger transition-colors hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[400px] rounded-sheet border-border bg-surface-primary p-6">
              <AlertDialogHeader className="text-left">
                <AlertDialogTitle className="text-lead tracking-tight text-content-primary">
                  Hapus kebiasaan ini?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-note text-content-muted">
                  &ldquo;{habit.title}&rdquo; beserta seluruh riwayat
                  penyelesaiannya akan dihapus permanen. Pertimbangkan
                  mengarsipkan bila hanya ingin istirahat sementara.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-3 flex flex-row gap-2">
                <AlertDialogCancel className="h-10 flex-1 rounded-full border-border text-note font-semibold text-content-secondary hover:bg-surface-secondary">
                  Batal
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteHabit(habit.id)
                    toast.info('Kebiasaan dihapus')
                  }}
                  className="h-10 flex-1 rounded-full bg-destructive text-note font-semibold text-destructive-foreground hover:bg-destructive/90"
                >
                  Hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </RutinaCard>
    </m.div>
  )
}

/* ===== Layar Kebiasaan — Pusat Habit Intelligence ===== */

export default function KebiasaanScreen() {
  /* v2.35 anti-replay: pembuka Garden hanya kunjungan pertama; panel
     detail & expand tetap diantar (interaksi, bukan replay layar).
     v2.38: gerbang yang sama menaungi daftar stagger & batang % agenda
     di bawah — remount antar-tab tidak boleh memutar ulang entrance. */
  const playEntrance = useFirstVisit('kebiasaan-garden')
  /* Reduce-motion: pil ruang melompat instan, bukan gulir animasi. */
  const reducedMotion = useReducedMotion()
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const toggleHabit = useRutina((s) => s.toggleHabit)
  const setHabitArchived = useRutina((s) => s.setHabitArchived)
  const openHabitCreate = useRutina((s) => s.openHabitCreate)
  const openHabitEdit = useRutina((s) => s.openHabitEdit)

  const [showArchive, setShowArchive] = useState(false)
  /* Kebiasaan terpilih untuk Panel Detail — bottom sheet (layar sempit)
     & kolom kanan split-screen (≥52rem). */
  const [selectedId, setSelectedId] = useState<string | null>(null)
  /* Pagar agenda (audit v2.37): kondisi awal maks 5 baris — sisa via
     "Lihat semua agenda (N)"; tugas tersembunyi tidak dianggap selesai. */
  const [showAllAgenda, setShowAllAgenda] = useState(false)
  /* Perpustakaan (audit v2.37): pencarian inventaris + grup collapsible. */
  const [libraryQuery, setLibraryQuery] = useState('')
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())
  /* v2.45 (review Tahap 2): filter pintar Perpustakaan — dihitung dari
     data nyata (konsistensi 4 pekan, keberadaan target, tautan Bugar),
     bukan label manual yang harus dirawat tangan. */
  const [libFilter, setLibFilter] = useState<
    'semua' | 'konsisten' | 'perhatian' | 'terukur' | 'bugar'
  >('semua')

  /* Lebar konten nyata (ResizeObserver) — menentukan Panel Detail sebagai
     bottom sheet (sempit) atau kolom sticky (≥52rem). */
  const rootRef = useRef<HTMLDivElement>(null)
  const libraryWide = useMinWidth(rootRef, 832)

  const today = todayISO()

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.archived),
    [habits],
  )
  const archivedHabits = useMemo(
    () => habits.filter((h) => h.archived),
    [habits],
  )

  /* Agenda hari ini — kebiasaan aktif terjadwal hari ini, menunggu dan
     selesai diurutkan jam pengingat (belum selesai selalu di atas).
     v2.49 (audit): hari-jeda DIAMPUNI dari agenda — kebiasaan yang sedang
     berjeda bukan misi yang menunggu (sepakat dengan dayCompliance,
     lembar detail: "N jeda diampuni"). */
  const scheduledToday = useMemo(
    () =>
      activeHabits.filter(
        (h) => scheduledOn(h, today) && !(h.restDays ?? []).includes(today),
      ),
    [activeHabits, today],
  )
  const pendingToday = useMemo(
    () =>
      scheduledToday
        .filter((h) => !isDoneOn(completions, today, h.id))
        .sort(byTime),
    [scheduledToday, completions, today],
  )
  const doneToday = useMemo(
    () =>
      scheduledToday
        .filter((h) => isDoneOn(completions, today, h.id))
        .sort(byTime),
    [scheduledToday, completions, today],
  )

  /* Badge "terlewat kemarin" untuk baris Agenda — dihitung SEKALI di
     tingkat layar (audit v2.37: tidak ada lagi tiap kartu menghitung
     kandidat sendiri; kartu Coach tidak boleh mengulang habit Agenda). */
  const missedSet = useMemo(
    () => new Set(missedYesterday(habits, completions, today).map((h) => h.id)),
    [habits, completions, today],
  )

  /* Susunan agenda: yang menunggu dikelompokkan per waktu ke rel timeline
     (Pagi/Siang/Malam/Kapan saja — agenda-rail), tiap rel terurut jam;
     yang selesai turun ke ekor "Selesai" yang diredupkan setelah rel. */
  const agendaGroups = useMemo(() => {
    const source = showAllAgenda
      ? pendingToday
      : pendingToday.slice(0, AGENDA_LIMIT)
    const buckets: Record<AgendaSlot, Habit[]> = {
      pagi: [],
      siang: [],
      malam: [],
      bebas: [],
    }
    for (const h of source) buckets[slotOf(h)].push(h)
    return SLOT_META.map((meta) => ({
      ...meta,
      items: buckets[meta.key].sort(byTime),
    })).filter((g) => g.items.length > 0)
  }, [pendingToday, showAllAgenda])

  /* v2.49 (audit): pct agenda = dayCompliance (satu sumber) — dulu
     penyebut habitsOn mentah menghitung hari-jeda, membuat bar agenda
     membaca 33% saat sulur/heatmap membaca 50% untuk hari yang sama. */
  const agendaDc = dayCompliance(habits, completions, today)
  const agendaPct = agendaDc.pct == null ? 0 : agendaDc.pct / 100

  /* Konsistensi — tiga angka kunci dari histori nyata. */
  const maxStreak = useMemo(
    () =>
      activeHabits.reduce(
        (best, h) => Math.max(best, habitStreak(h, completions, today)),
        0,
      ),
    [activeHabits, completions, today],
  )
  /* Rasio target pekan — jadwal-aware (audit visualisasi v2.12):
     terjadwal dihitung dari habitsOn per tanggal (menghormati hari
     aktif & hari istirahat — BUKAN asumsi semua kebiasaan tiap hari);
     selesai hanya dihitung untuk kebiasaan yang memang terjadwal
     hari itu. Hari berjalan dihitung Senin..hari ini; target tersisa
     = jadwal sisa pekan (besok..Minggu). */
  const weekTarget = useMemo(() => {
    const start = weekStartISO(today)
    let schedElapsed = 0
    let doneElapsed = 0
    let schedRemaining = 0
    for (let i = 0; i < 7; i++) {
      const iso = addDaysISO(start, i)
      /* v2.49 (audit): dayCompliance = SATU sumber (sadar-createdAt +
         hari-jeda diampuni) — sepakat dengan sulur, hero Beranda, rekap
         pekan & konstelasi. Dulu hari-jeda dihitung sebagai misi yang
         "tersisa" (membingkai jeda sebagai kegagalan) dan bisa membuat
         "6/7 · 86%" untuk pekan yang sulurnya berdaun penuh. */
      const dc = dayCompliance(habits, completions, iso)
      if (iso <= today) {
        schedElapsed += dc.due
        doneElapsed += dc.done
      } else {
        schedRemaining += dc.due
      }
    }
    return { schedElapsed, doneElapsed, schedRemaining }
  }, [habits, completions, today])
  const weekTargetPct =
    weekTarget.schedElapsed > 0
      ? Math.round((weekTarget.doneElapsed / weekTarget.schedElapsed) * 100)
      : null

  /* v2.46 Growth Garden (audit Warm Editorial P2.0): kebiasaan "dirawat"
     pekan ini — capaian pekan berjalan tiap kebiasaan ≥ 80% (sejajar vonis
     "sehat" bedeng Konsistensi); angka besar M/N hero taman. Sadar-
     createdAt & sadar-jadwal via habitWeeklyRates. */
  const tendedCount = useMemo(
    () =>
      activeHabits.filter((h) => {
        const rate = habitWeeklyRates(h, completions, today, 1)[0]
        return (rate?.pct ?? 0) >= TENDED_WEEK_PCT
      }).length,
    [activeHabits, completions, today],
  )
  /* Headline editorial taman (audit: "Terus tumbuh.") — kontekstual
     mengikuti keadaan kebun pekan ini. */
  const gardenHeadline =
    activeHabits.length === 0
      ? 'Kebun menunggu.'
      : tendedCount === activeHabits.length
        ? 'Terus tumbuh.'
        : tendedCount >= Math.ceil(activeHabits.length / 2)
          ? 'Tumbuh pelan-pelan.'
          : 'Waktunya menyiram.'
  const maturePlants = useMemo(
    () =>
      activeHabits.filter((h) => {
        const key = plantStageOf(h, completions, today).stage.key
        return key === 'pohon-dewasa' || key === 'berbunga'
      }).length,
    [activeHabits, completions, today],
  )

  /* Saran Coach terkonsolidasi — audit antirepetisi v2.41. Dulu tiap
     kebiasaan mendapat kartu SENDIRI: dua kartu "terlewat kemarin"
     dengan tombol full-width masing-masing + deretan kartu Goldilocks
     berjudul identik ("Perkecil dulu…" × N). Kini:
     - SATU kartu pemulihan untuk semua kebiasaan terlewat kemarin yang
       TIDAK terjadwal hari ini (baris ringkas + centang per baris);
       yang terjadwal hari ini tetap hanya berbadge di Agenda.
     - SATU kartu Goldilocks per INTI saran (perkecil / naikkan) —
       kebiasaan yang sudah di kartu pemulihan DIKECUALIKAN agar tidak
       muncul dua kali dalam satu seksi. */
  const missedCoach = useMemo(
    () =>
      missedYesterday(habits, completions, today)
        .filter(
          (h) => !scheduledOn(h, today) && !isDoneOn(completions, today, h.id),
        )
        .slice(0, 2),
    [habits, completions, today],
  )
  /* v2.45 (audit): total pemulihan SEBELUM dipangkas 2 — salinan kartu
     jangan mengklaim "2 terlewat" saat kenyataannya 5. */
  const missedCoachTotal = useMemo(
    () =>
      missedYesterday(habits, completions, today).filter(
        (h) => !scheduledOn(h, today) && !isDoneOn(completions, today, h.id),
      ).length,
    [habits, completions, today],
  )
  const coachGroups = useMemo(
    () =>
      goldilocksGroups(
        activeHabits,
        completions,
        today,
        new Set(missedCoach.map((h) => h.id)),
      ),
    [activeHabits, completions, today, missedCoach],
  )

  /* Semua kebiasaan aktif — dikelompokkan per KATEGORI, atau per
     KELOMPOK CUSTOM bila ada yang memakainya (v2.22): bedeng kebun
     buatan pengguna ("Pagi", "Gym"…) dengan warna chip masing-masing,
     sisanya jatuh ke "Tanpa kelompok". Satu bentuk data {key,label,color}
     dipakai render — tak ada cabang JSX ganda. */
  const habitGroups = useRutina((s) => s.habitGroups)
  const catGroups = useMemo(() => {
    const sorted = (xs: typeof activeHabits) =>
      [...xs].sort((a, b) => a.title.localeCompare(b.title))
    const groupIds = new Set(habitGroups.map((g) => g.id))
    const usesGroups = activeHabits.some(
      (h) => h.groupId && groupIds.has(h.groupId),
    )
    if (!usesGroups) {
      return HABIT_CATS.map((cat) => ({
        key: cat,
        label: cat,
        color: HABIT_CAT_COLORS[cat],
        items: sorted(activeHabits.filter((h) => h.cat === cat)),
      })).filter((g) => g.items.length > 0)
    }
    const sections = habitGroups
      .map((g) => ({
        key: g.id,
        label: g.name,
        color: g.color,
        items: sorted(activeHabits.filter((h) => h.groupId === g.id)),
      }))
      .filter((g) => g.items.length > 0)
    const ungrouped = sorted(
      activeHabits.filter(
        (h) => !h.groupId || !groupIds.has(h.groupId),
      ),
    )
    if (ungrouped.length > 0) {
      sections.push({
        key: 'tanpa-kelompok',
        label: 'Tanpa kelompok',
        color: 'var(--content-muted, #8a8577)',
        items: ungrouped,
      })
    }
    return sections
  }, [activeHabits, habitGroups])

  /* Kebiasaan efektif untuk panel detail desktop: id terpilih bila masih
     aktif, jatuh ke baris pertama daftar sebagai bawaan. Dihitung langsung
     saat render (React Compiler menangani memoisasinya) dan HANYA dipakai
     di JSX — nilai turunan state yang masuk ke closure memicu pembatalan
     memoisasi (pelajaran Task 2 pada handler kemarin). */
  const selectedHabit =
    (selectedId !== null
      ? activeHabits.find((h) => h.id === selectedId)
      : undefined) ??
    catGroups[0]?.items[0] ??
    null
  /* Kebiasaan untuk bottom sheet ponsel — HANYA saat ada pilihan eksplisit
     (inspector desktop punya default; sheet dibuka atas permintaan). */
  const sheetHabit =
    selectedId !== null
      ? (activeHabits.find((h) => h.id === selectedId) ?? null)
      : null

  /* Perpustakaan: pencarian inventaris (audit v2.37) — filter judul &
     kategori; saat mencari, semua grup dipaksa terbuka agar hasil
     langsung terlihat. Filter pintar (v2.45) dihitung dari data nyata:
     Konsisten = rata² kepatuhan 4 pekan ≥ 80%; Perlu perhatian < 50%
     (pekan tanpa jadwal tidak dihitung); Terukur = punya target;
     Terhubung Bugar = tertaut aktivitas latihan. */
  const normalizedQuery = libraryQuery.trim().toLowerCase()

  /* Rata² kepatuhan 4 pekan satu kebiasaan — null bila tak ada pekan
     berjadwal (belum bisa dinilai, bukan 0%). */
  const avgCompliance = useCallback(
    (h: Habit) => {
      const rates = habitWeeklyRates(h, completions, today, 4).filter(
        (r) => r.pct != null,
      )
      if (rates.length === 0) return null
      return rates.reduce((a, r) => a + (r.pct ?? 0), 0) / rates.length
    },
    [completions, today],
  )

  const smartMatch = useCallback(
    (h: Habit) => {
      if (libFilter === 'semua') return true
      if (libFilter === 'terukur') return h.target != null
      if (libFilter === 'bugar') return h.linkedActivity != null
      const avg = avgCompliance(h)
      if (avg == null) return false
      return libFilter === 'konsisten' ? avg >= 80 : avg < 50
    },
    [libFilter, avgCompliance],
  )

  const smartCounts = useMemo(() => {
    let konsisten = 0
    let perhatian = 0
    let terukur = 0
    let bugar = 0
    for (const h of activeHabits) {
      if (h.target != null) terukur++
      if (h.linkedActivity != null) bugar++
      const avg = avgCompliance(h)
      if (avg != null) {
        if (avg >= 80) konsisten++
        else if (avg < 50) perhatian++
      }
    }
    return { konsisten, perhatian, terukur, bugar }
  }, [activeHabits, avgCompliance])

  const libraryGroups = useMemo(() => {
    const base = !normalizedQuery
      ? catGroups
      : catGroups
          .map((g) => ({
            ...g,
            items: g.items.filter(
              (h) =>
                h.title.toLowerCase().includes(normalizedQuery) ||
                h.cat.toLowerCase().includes(normalizedQuery),
            ),
          }))
          .filter((g) => g.items.length > 0)
    /* Filter pintar diterapkan SETELAH pencarian — kombinasi keduanya
       bekerja bersama. */
    if (libFilter === 'semua') return base
    return base
      .map((g) => ({ ...g, items: g.items.filter(smartMatch) }))
      .filter((g) => g.items.length > 0)
  }, [catGroups, normalizedQuery, libFilter, smartMatch])

  const hasNoHabits = habits.length === 0

  /* Buka/tutup detail baris perpustakaan (ketuk ulang untuk menutup). */
  const toggleSelect = (id: string) =>
    setSelectedId((prev) => (prev === id ? null : id))

  /* v2.45 (audit + review): satu jalur buka-detail dari semua bedeng
     visual (matriks konsistensi, taman pertumbuhan) — di ruang kerja
     lebar panel detail hidup jauh di bawah (seksi Perpustakaan): antar
     pandangan pengguna ke sana, bukan diam-diam mengubah yang tak
     terlihat. */
  const openHabitDetail = useCallback(
    (id: string) => {
      setSelectedId(id)
      if (libraryWide) {
        requestAnimationFrame(() => {
          document
            .getElementById('detail-kebiasaan')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
    },
    [libraryWide],
  )

  /* Buka/tutup grup perpustakaan (audit v2.37 — collapsible). */
  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  /* Aksi “cukup versi 2 menit” — panel memanggil dengan kebiasaan sebagai
     ARGUMEN sehingga penutupan di layar hanya menangkap nilai primitif
     yang aman (pola yang sama dengan toggleHabit(h.id, today)). */
  const completeMini = (h: Habit) => {
    toggleHabit(h.id, today)
    toast.success(`Cukup ${h.mini} — dihitung!`)
  }

  /* v2.31 Garden: ruang aktif untuk petunjuk arah — scrollspy sederhana
     (IntersectionObserver, zona pita tengah layar); semua ruang kini
     selalu dirender pada state non-kosong (konsistensi tidak lagi
     lenyap saat semua kebiasaan diarsip). */
  const [activeRoom, setActiveRoom] = useState<
    'agenda' | 'konsistensi' | 'perpustakaan'
  >('agenda')
  useEffect(() => {
    if (hasNoHabits) return
    const rooms: [string, 'agenda' | 'konsistensi' | 'perpustakaan'][] = [
      ['garden-agenda', 'agenda'],
      ['garden-konsistensi', 'konsistensi'],
      ['garden-perpustakaan', 'perpustakaan'],
    ]
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const hit = rooms.find(([id]) => id === e.target.id)
          if (hit) setActiveRoom(hit[1])
        }
      },
      { rootMargin: '-30% 0px -55% 0px' },
    )
    for (const [id] of rooms) {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [hasNoHabits])

  return (
    <div
      ref={rootRef}
      data-module="kebiasaan"
      data-layout="garden"
      className="h-full overflow-y-auto no-scrollbar overscroll-contain px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-content-primary"
    >
      {/* v2.46 Growth Garden hero (audit Warm Editorial P2.0) — kepala
          taman: eyebrow "Tamanmu · Pekan N", headline editorial kontekstual,
          ringkasan jumlah, dan angka besar "M/N dirawat" di sisi kanan
          pada kontainer lega; ponsel menumpuk dengan narasi di atas.
          Titik & eyebrow tetap aksen Rose Clay (identitas kebun). */}
      <m.header
        initial={playEntrance ? { opacity: 0, y: 12 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={motionTokens.preset.panelReveal}
      >
        <div className="flex flex-col gap-4 @[34rem]:flex-row @[34rem]:items-end @[34rem]:justify-between @[34rem]:gap-7">
          <div className="min-w-0">
            {/* Eyebrow & judul editorial — Playfair Display sebagai aksen
                botanical (Tipografi System v1: satu-satunya serif di luar
                sapaan Beranda; nama kebiasaan & kontrol tetap Geist Sans
                demi kecepatan). */}
            <p className="flex items-center gap-1.5 text-eyebrow font-semibold uppercase tracking-[0.14em] text-module-accent-strong">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-module-accent"
              />
              Tamanmu · Pekan {isoWeekOf(today)}
            </p>
            <h1
              className={`${playfair.className} mt-1.5 text-balance text-fluid-editorial font-semibold leading-tight tracking-tight text-content-primary`}
            >
              {gardenHeadline}
            </h1>
            <p className="mt-2 text-body font-medium tabular-nums text-content-muted">
              {activeHabits.length} kebiasaan aktif · {tendedCount} dirawat
              pekan ini
            </p>
            <p className="mt-0.5 text-note font-medium text-content-muted">
              {longDateLabel(today)} ·{' '}
              {scheduledToday.length === 0
                ? 'tidak ada jadwal hari ini'
                : pendingToday.length > 0
                  ? `${pendingToday.length} menunggu hari ini`
                  : 'agenda hari ini tuntas'}
            </p>
          </div>

          {/* Angka besar dirawat — hanya bila ada kebiasaan aktif; saat
              kebun kosong, glif tunas menemani ajakan menanam. */}
          {activeHabits.length > 0 ? (
            <div className="shrink-0 @[34rem]:pl-6 @[34rem]:text-right">
              <p className="flex items-baseline gap-1 @[34rem]:justify-end">
                <span className="text-kpi font-bold leading-none tracking-tight tabular-nums text-content-primary">
                  {tendedCount}
                </span>
                <span className="text-lead font-bold tabular-nums text-module-accent-strong">
                  /{activeHabits.length}
                </span>
              </p>
              <p className="mt-1 text-eyebrow font-medium text-content-muted">
                kebiasaan dirawat pekan ini
              </p>
            </div>
          ) : (
            <span
              aria-hidden="true"
              className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-module-accent-soft text-module-accent-strong @[34rem]:flex"
            >
              <Sprout className="h-6 w-6" />
            </span>
          )}
        </div>
      </m.header>

      {hasNoHabits ? (
        /* Belum ada kebiasaan sama sekali — ajakan menanam yang pertama. */
        <m.section
          initial={playEntrance ? { opacity: 0, y: 14 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            ...motionTokens.preset.data,
            delay: motionTokens.delay.tight,
          }}
          aria-label="Belum ada kebiasaan"
          className="mt-[var(--layout-gap)]"
        >
          <RutinaEmptyState
            icon={<Sprout className="h-6 w-6" />}
            title="Kebiasaan pertamamu menunggu ditanam"
            description="Mulai dari versi dua menit — satu tindakan kecil yang bisa kamu lakukan hari ini, biarkan tumbuh perlahan."
            action={
              <m.button
                type="button"
                onClick={openHabitCreate}
                whileTap={{ scale: 0.96 }}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-note font-bold text-primary-foreground shadow-soft transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Plus className="h-4 w-4" strokeWidth={2.4} />
                Tanam kebiasaan pertama
              </m.button>
            }
          />
        </m.section>
      ) : (
        <>
          {/* Petunjuk arah antar-ruang (v2.31 Garden, audit wayfinding):
              tiga ruangan dalam satu gulir panjang — bilah pil menempel
              di tepi atas; ruang aktif mengikuti scrollspy, ketukan
              menggulir halus ke ruang tujuan. */}
          <nav
            aria-label="Petunjuk arah ruang kebiasaan"
            className="sticky top-2 z-30 mt-[var(--layout-gap)] flex justify-center"
          >
            <div className="flex items-center gap-1 rounded-full border border-border bg-surface-primary/92 p-1 shadow-soft backdrop-blur-md">
              {(
                [
                  ['garden-agenda', 'Agenda'],
                  ['garden-konsistensi', 'Konsistensi'],
                  ['garden-perpustakaan', 'Perpustakaan'],
                ] as const
              ).map(([id, label]) => {
                const isActive = activeRoom === id.replace('garden-', '')
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      document
                        .getElementById(id)
                        /* Reduce-motion: lompat instan ke ruang tujuan. */
                        ?.scrollIntoView({
                          behavior: reducedMotion ? 'auto' : 'smooth',
                          block: 'start',
                        })
                    }
                    aria-current={isActive ? 'location' : undefined}
                    className={
                      'interactive h-8 cursor-pointer rounded-full px-3.5 text-meta font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
                      (isActive
                        ? 'bg-module-accent/15 text-module-accent-strong'
                        : 'text-content-muted hover:text-content-primary')
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </nav>

          {/* ============ 1 — AGENDA HARI INI (paling operasional) ============
              Halaman planner kertas: paper-surface memberi garis margin kiri
              Rose Clay; yang menunggu naik ke rel timeline Pagi/Siang/Malam
              (agenda-rail — titik aksen + hairline vertikal ala linimasa
              kertas), baris padat (centang · nama · jam/kategori · titik
              pekan) mudah dipindai; selesai diredupkan di ekor "Selesai"
              bawah rel. */}
          <m.section
            id="garden-agenda"
            aria-label="Agenda hari ini"
            className="mt-[var(--layout-gap)] scroll-mt-20"
            initial={playEntrance ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={motionTokens.preset.chipReveal}
          >
            <RutinaSectionHeader
              title="Agenda hari ini"
              description={
                scheduledToday.length === 0
                  ? 'Hari ini bebas dari jadwal'
                  : `Hari ini — ${doneToday.length} dari ${scheduledToday.length} selesai`
              }
              className="tabular-nums"
              action={
                <span
                  aria-current="date"
                  className="flex h-9 items-center gap-1.5 rounded-full bg-module-accent/15 px-3 text-eyebrow font-semibold text-module-accent-strong"
                >
                  <CalendarDays
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                    strokeWidth={2.2}
                  />
                  Hari ini
                </span>
              }
            />

            {scheduledToday.length === 0 ? (
              <div className="mt-4">
                <RutinaEmptyState
                  icon={<CalendarDays className="h-6 w-6" />}
                  title="Tidak ada agenda terjadwal"
                  description="Hari ini bebas dari jadwal — nikmati jedamu, atau tanam kebiasaan baru kapan pun siap."
                />
              </div>
            ) : (
              <>
                {/* Progres mini hari ini — bar tipis aksen domain */}
                <div className="mt-3 flex items-center gap-3">
                  <div
                    className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-secondary"
                    role="progressbar"
                    aria-label="Progres agenda hari ini"
                    aria-valuenow={doneToday.length}
                    aria-valuemin={0}
                    aria-valuemax={Math.max(1, scheduledToday.length)}
                    aria-valuetext={`${doneToday.length} dari ${scheduledToday.length} selesai`}
                  >
                    <m.div
                      className="h-full origin-left rounded-full bg-module-accent"
                      style={{ width: '100%' }}
                      initial={playEntrance ? { scaleX: 0 } : false}
                      animate={{ scaleX: agendaPct }}
                      transition={barFill}
                    />
                  </div>
                  <span className="shrink-0 text-eyebrow font-bold tabular-nums text-module-accent-strong">
                    {Math.round(agendaPct * 100)}%
                  </span>
                </div>

                {/* Halaman planner — rel waktu Pagi/Siang/Malam (agenda-rail):
                    titik aksen + hairline vertikal ala linimasa kertas; baris
                    menunggu terurut jam di dalam tiap rel. */}
                <div className="paper-surface mt-3 rounded-2xl border-y border-e p-3 shadow-soft sm:p-4">
                  <LayoutGroup>
                  <div className="space-y-5">
                    {agendaGroups.map((g) => (
                      <div key={g.key} className="agenda-rail">
                        <div className="mb-2 flex items-center gap-2">
                          <g.icon
                            aria-hidden="true"
                            className="h-4 w-4 text-module-accent-strong"
                            strokeWidth={2.2}
                          />
                          <h3 className="text-note font-semibold tracking-tight text-content-secondary">
                            {g.label}
                          </h3>
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-chart-label font-semibold tabular-nums text-content-secondary">
                            {g.items.length}
                          </span>
                        </div>
                        {/* v2.38 anti-replay: gerbang sama dengan kepala
                            seksi — stagger hanya kunjungan pertama. */}
                        <m.div
                          variants={journalList}
                          initial={playEntrance ? 'hidden' : 'show'}
                          animate="show"
                          className="grid grid-cols-1 gap-1 @[44rem]:grid-cols-2 xl:grid-cols-3"
                        >
                          {g.items.map((h) => (
                            <m.div
                              key={h.id}
                              variants={journalCard}
                              layout
                              layoutId={`agenda-${h.id}`}
                              transition={{
                                layout: {
                                  duration: motionTokens.duration.normal,
                                  ease: motionTokens.easing.standard,
                                },
                              }}
                            >
                              <AgendaRow
                                habit={h}
                                done={false}
                                completions={completions}
                                today={today}
                                missedYesterday={missedSet.has(h.id)}
                                onToggle={() => toggleHabit(h.id, today)}
                                onEdit={() => openHabitEdit(h.id)}
                              />
                            </m.div>
                          ))}
                        </m.div>
                      </div>
                    ))}
                  </div>

                  {/* Pagar agenda (audit v2.37): kondisi awal maks 5 baris;
                      sisa dijatuhkan lewat "Lihat semua agenda (N)" —
                      tugas tersembunyi tidak dianggap selesai/dihapus. */}
                  {pendingToday.length > AGENDA_LIMIT && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 ps-5">
                      <p className="text-meta font-semibold tabular-nums text-content-muted">
                        {showAllAgenda
                          ? `${pendingToday.length} tugas menunggu`
                          : `${Math.min(AGENDA_LIMIT, pendingToday.length)} dari ${pendingToday.length} tugas · ${pendingToday.length - AGENDA_LIMIT} menunggu`}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAllAgenda((v) => !v)}
                        aria-expanded={showAllAgenda}
                        className="h-9 cursor-pointer rounded-full border border-border-strong px-3.5 text-eyebrow font-semibold text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        {showAllAgenda
                          ? 'Tampilkan ringkas'
                          : `Lihat semua agenda (${pendingToday.length})`}
                      </button>
                    </div>
                  )}

                  {/* Ekor "Selesai" — baris selesai diredupkan turun dari
                      rel; ps-5 menyelaraskan dengan isi rel (agenda-rail
                      memberi padding-inline-start 1.25rem). */}
                  {doneToday.length > 0 && (
                    <div className="ps-5">
                      <m.p
                        layout
                        className="mb-1 mt-3 flex items-center gap-2.5 px-2 text-eyebrow font-semibold uppercase tracking-[0.14em] tabular-nums text-content-muted"
                      >
                        Selesai ({doneToday.length})
                        <span
                          aria-hidden="true"
                          className="h-px min-w-4 flex-1 bg-border"
                        />
                      </m.p>
                      <m.div
                        variants={journalList}
                        initial={playEntrance ? 'hidden' : 'show'}
                        animate="show"
                        className="grid grid-cols-1 gap-1 @[44rem]:grid-cols-2 xl:grid-cols-3"
                      >
                        {doneToday.map((h) => (
                          <m.div
                            key={h.id}
                            variants={journalCard}
                            layout
                            layoutId={`agenda-${h.id}`}
                            transition={{
                              layout: {
                                duration: motionTokens.duration.normal,
                                ease: motionTokens.easing.standard,
                              },
                            }}
                            className="opacity-70"
                          >
                            <AgendaRow
                              habit={h}
                              done
                              completions={completions}
                              today={today}
                              missedYesterday={missedSet.has(h.id)}
                              onToggle={() => toggleHabit(h.id, today)}
                              onEdit={() => openHabitEdit(h.id)}
                            />
                          </m.div>
                        ))}
                      </m.div>
                    </div>
                  )}
                  </LayoutGroup>
                </div>
              </>
            )}
          </m.section>

          {/* ============ Saran Coach — satu inti saran, satu kartu
               (audit antirepetisi v2.41) ============ */}
          {(missedCoach.length > 0 || coachGroups.length > 0) && (
            <section
              className="mt-[var(--layout-gap)]"
              aria-label="Saran Coach"
            >
              <RutinaSectionHeader
                title="Saran Coach"
                description="Pemulihan & penyesuaian kecil dari pekan ini"
              />
              <m.div
                variants={journalList}
                initial={playEntrance ? 'hidden' : 'show'}
                animate="show"
                className="mt-3 space-y-2.5"
              >
                {missedCoach.length > 0 && (
                  <m.div
                    variants={journalCard}
                    className="rounded-lg border border-gold/40 bg-gold/15 p-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/30 text-warning"
                      >
                        <Flame className="h-4 w-4" strokeWidth={2.2} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-note font-semibold text-content-primary">
                          Jangan bolong dua kali
                        </p>
                        <p className="mt-0.5 text-pretty text-meta leading-relaxed text-content-muted">
                          {missedCoach.length === 1
                            ? missedCoach[0]!.mini
                              ? 'Terlewat kemarin — coba versi mininya dulu, atau centang kemarin di bawah.'
                              : 'Terlewat kemarin — satu centang kemarin menyelamatkan runtun.'
                            : /* v2.45 (audit): akui pangkasan — "2 terlewat"
                                 hanya jujur bila memang 2, bukan 5. */
                              missedCoachTotal > missedCoach.length
                              ? `${missedCoach.length} dari ${missedCoachTotal} kebiasaan terlewat kemarin — satu centang kemarin per kebiasaan menyelamatkan runtunnya.`
                              : `${missedCoach.length} kebiasaan terlewat kemarin — satu centang kemarin per kebiasaan menyelamatkan runtunnya.`}
                        </p>
                      </div>
                    </div>
                    {/* Baris ringkas per kebiasaan (pola kartu pemulihan
                        Beranda): nama hanya tampil sekali — di sini. */}
                    <div className="mt-2 space-y-1">
                      {missedCoach.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center gap-2.5 rounded-md border border-gold/30 bg-surface-primary/70 px-2.5 py-1.5"
                        >
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor: HABIT_CAT_COLORS[h.cat],
                            }}
                          />
                          <span className="min-w-0 flex-1 truncate text-meta font-semibold text-content-primary">
                            {h.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              /* Tanggal kemarin dihitung di dalam handler — nilai
                                 turunan `today` yang di-pass ke aksi store di
                                 level render membuat React Compiler membatalkan
                                 memoisasi ("today" dianggap bisa berubah). */
                              toggleHabit(h.id, addDaysISO(today, -1))
                              toast.success(
                                `"${h.title}" kemarin selesai — runtun kembali utuh.`,
                              )
                            }}
                            aria-label={`Tandai "${h.title}" selesai kemarin`}
                            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition-all hover:bg-action-hover active:scale-[0.95] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            <Check className="h-4 w-4" strokeWidth={2.6} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </m.div>
                )}
                {coachGroups.map((group) => (
                  <m.div key={group.tone} variants={journalCard}>
                    <CoachGroupCard group={group} />
                  </m.div>
                ))}
              </m.div>
            </section>
          )}

          {/* ============ 2 — KONSISTENSI (satu komposisi kebun) ============
              Zona botanical tunggal: permukaan garden-surface membungkus
              bedeng metrik (runtun · capaian pekan · tanaman) dan Taman
              Pertumbuhan — identitas kebun yang terpisah jelas dari
              halaman planner agenda. */}
            <m.section
              id="garden-konsistensi"
              aria-label="Konsistensi"
              className="garden-surface mt-[var(--layout-gap)] scroll-mt-20 rounded-[var(--layout-hero-radius)] p-3.5 sm:p-4 xl:p-5"
              initial={playEntrance ? { opacity: 0, y: 14 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={motionTokens.preset.chipReveal}
            >
              <RutinaSectionHeader
                accent
                title="Konsistensi"
                description="Runtun, capaian pekan, dan taman pertumbuhan"
              />

              {/* v2.31 Garden: kebun tidak lagi LENYAP saat semua kebiasaan
                  diarsip — bedeng kosong menyapa (konsistensi empty-state,
                  senada dengan disiplin empty-state layar lain). */}
              {activeHabits.length === 0 ? (
                <div className="mt-4">
                  <RutinaEmptyState
                    icon={<Sprout className="h-6 w-6" />}
                    title="Kebun menunggu ditanam kembali"
                    description="Semua kebiasaan sedang diarsip — pulihkan satu dari Perpustakaan di bawah untuk mulai berkebun lagi."
                  />
                </div>
              ) : (
                <>

              {/* Bedeng metrik kebun — runtun terbaik, capaian pekan,
                  tanaman dewasa; glif kecil (Flame · Check · PlantGlyph)
                  menandai tiap angka di atas permukaan garden-bed. */}
              <m.div
                variants={journalList}
                initial={playEntrance ? 'hidden' : 'show'}
                animate="show"
                className="mt-4"
              >
                <div className="garden-bed p-3.5 sm:p-4">
                  <div className="grid grid-cols-3 gap-3 sm:gap-5">
                    <m.div variants={journalCard} className="min-w-0">
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-module-accent-soft text-module-accent-strong"
                      >
                        <Flame className="h-4 w-4" strokeWidth={2.2} />
                      </span>
                      <RutinaMetric
                        popOn={maxStreak}
                        className="mt-2"
                        label="Runtun terbaik"
                        value={maxStreak}
                        unit="hari"
                        trend={maxStreak > 0 ? 'up' : 'neutral'}
                        caption="sedang berjalan"
                      />
                    </m.div>
                    <m.div variants={journalCard} className="min-w-0">
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-module-accent-soft text-module-accent-strong"
                      >
                        <Check className="h-4 w-4" strokeWidth={2.2} />
                      </span>
                      <RutinaMetric
                        popOn={weekTarget.doneElapsed}
                        className="mt-2"
                        label="Target pekan ini"
                        value={
                          weekTarget.schedElapsed > 0
                            ? `${weekTarget.doneElapsed}/${weekTarget.schedElapsed}`
                            : '—'
                        }
                        unit="target"
                        trend={
                          weekTargetPct == null
                            ? 'neutral'
                            : weekTargetPct >= 80
                              ? 'up'
                              : weekTargetPct >= 50
                                ? 'neutral'
                                : 'down'
                        }
                        caption={
                          weekTarget.schedElapsed === 0
                            ? 'belum ada jadwal pekan ini'
                            : `${
                                weekTargetPct ?? 0
                              }% tercapai · ${weekTarget.schedRemaining} target tersisa`
                        }
                        progress={
                          weekTargetPct != null
                            ? weekTargetPct / 100
                            : undefined
                        }
                      />
                    </m.div>
                    <m.div variants={journalCard} className="min-w-0">
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-module-accent-soft text-module-accent-strong"
                      >
                        <PlantGlyph
                          stage="berbunga"
                          className="h-[18px] w-[18px]"
                        />
                      </span>
                      <RutinaMetric
                        popOn={maturePlants}
                        className="mt-2"
                        label="Tanaman"
                        value={maturePlants}
                        unit="pohon"
                        caption="dewasa / berbunga"
                      />
                    </m.div>
                  </div>
                </div>
              </m.div>

              {/* Sulur Pekan Ini (v2.47 Growth Garden) — satu cabang botani
                  = pekan berjalan: 7 daun Senin..Minggu, bentuk daun jujur
                  terhadap jadwal (penuh/sebagian/terlewat/kuncup tanpa
                  jadwal/belum berjalan); ketuk daun → baris bacaan + lembar
                  detail hari (pola heatmap). */}
              <GrowthVine />

              {/* Matriks perbandingan konsistensi (review UI/UX v2.44
                  Tahap 2): semua kebiasaan aktif × 4 pekan — menemukan
                  yang paling konsisten / menurun / membaik / butuh
                  perhatian dalam satu pandangan; ketuk baris buka detail. */}
              <HabitComparisonMatrix onSelect={openHabitDetail} />

              {/* Taman Pertumbuhan — bedeng tanaman di dalam zona kebun
                  yang sama; mode 'beds' menanam kisi melipat di ruang
                  kerja lebar. */}
                <div className="mt-5">
                  {/* v2.36 (audit visualisasi): Garden memakai mode KEPATUHAN
                      sadar-jadwal + toggle — membedakan heatmap ini dari
                      heatmap "jumlah" di Statistik (tiap halaman punya
                      pertanyaan berbeda; bukan duplikasi visual). */}
                  <Heatmap
                    mode="kepatuhan"
                    allowModeToggle
                    visitKey="kebiasaan-heatmap"
                  />
                </div>
                <div className="mt-5">
                  <PlantGarden variant="beds" onSelect={openHabitDetail} />
                </div>
              </>
              )}
            </m.section>

          {/* ============ 3 — PERPUSTAKAAN KEBIASAAN (inventaris) ============
              Daftar ledger hairline ringkas per kategori/grup — referensi
              yang tidak bersaing dengan agenda. Ketuk baris membuka Panel
              Detail (inline pada layar sempit; kolom kanan split-screen
              pada ruang kerja ≥52rem). */}
          <m.section
            id="garden-perpustakaan"
            aria-label="Perpustakaan kebiasaan"
            className="mt-[var(--layout-gap)] scroll-mt-20"
            initial={playEntrance ? { opacity: 0, y: 14 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={motionTokens.preset.chipReveal}
          >
            <RutinaSectionHeader
              title="Perpustakaan kebiasaan"
              description="Inventaris lengkap — cari, kelola, dan sunting"
            />

            {/* Pencarian inventaris (audit v2.37) — 30–50 kebiasaan tidak
                lagi dirender penuh tanpa alat temukan. */}
            {activeHabits.length > 0 && (
              <div className="relative mt-3">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted"
                />
                <Input
                  type="search"
                  value={libraryQuery}
                  onChange={(e) => setLibraryQuery(e.target.value)}
                  placeholder="Cari kebiasaan atau kategori…"
                  aria-label="Cari kebiasaan di perpustakaan"
                  className="h-11 rounded-full border-border bg-surface-primary pl-10 pr-4 text-note shadow-soft placeholder:text-content-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
              </div>
            )}

            {/* v2.45 (review Tahap 2): chip filter pintar — dihitung dari
                data nyata, sembunyikan chip kosong (bukan 0). */}
            {activeHabits.length > 0 && (
              <div
                role="group"
                aria-label="Filter pintar perpustakaan"
                className="mt-2.5 flex flex-wrap items-center gap-1.5"
              >
                {(
                  [
                    ['semua', 'Semua', activeHabits.length],
                    ['konsisten', 'Konsisten', smartCounts.konsisten],
                    ['perhatian', 'Perlu perhatian', smartCounts.perhatian],
                    ['terukur', 'Terukur', smartCounts.terukur],
                    ['bugar', 'Terhubung Bugar', smartCounts.bugar],
                  ] as const
                ).map(([id, label, count]) =>
                  count > 0 || id === 'semua' ? (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={libFilter === id}
                      onClick={() =>
                        setLibFilter((prev) => (prev === id ? 'semua' : id))
                      }
                      title={
                        id === 'konsisten'
                          ? 'Rata² kepatuhan 4 pekan ≥ 80%'
                          : id === 'perhatian'
                            ? 'Rata² kepatuhan 4 pekan < 50%'
                            : id === 'terukur'
                              ? 'Punya target terukur'
                              : id === 'bugar'
                                ? 'Tertaut aktivitas Bugar'
                                : 'Semua kebiasaan aktif'
                      }
                      className={`interactive h-8 cursor-pointer rounded-full px-3 text-chart-label font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        libFilter === id
                          ? 'bg-primary text-primary-foreground shadow-soft'
                          : 'border border-border bg-surface-primary text-content-secondary hover:bg-surface-secondary hover:text-content-primary'
                      }`}
                    >
                      {label}{' '}<span className="tabular-nums opacity-70">{count}</span>
                    </button>
                  ) : null,
                )}
              </div>
            )}

            {activeHabits.length === 0 ? (
              <div className="mt-4">
                <RutinaEmptyState
                  icon={<Sprout className="h-6 w-6" />}
                  title="Tidak ada kebiasaan aktif"
                  description="Semua kebiasaan sedang diarsipkan — pulihkan dari arsip di bawah, atau tanam yang baru."
                />
              </div>
            ) : (
              /* Split-screen desktop (kontainer ≥52rem): daftar ledger di
                 kiri, panel detail menempel di kanan. Di bawah itu susunan
                 tetap satu kolom — panel inline per baris yang terpilih. */
              /* v2.38: jarak kisi meniru token RutinaBentoGrid
                 (--layout-grid-gap), bukan jarak antar-seksi. */
              <div className="@[52rem]:grid @[52rem]:grid-cols-12 @[52rem]:gap-[var(--layout-grid-gap)]">
                {/* Kolom kiri — daftar ledger terkelompok */}
                <div className="min-w-0 @[52rem]:col-span-7">
                  <m.div
                    variants={journalList}
                    initial={playEntrance ? 'hidden' : 'show'}
                    animate="show"
                    className="mt-2 space-y-5"
                  >
                    {libraryGroups.map((g) => {
                      /* Grup collapsible (audit v2.37): tertutup default
                         memperlihatkan LIBRARY_GROUP_PREVIEW baris pertama;
                         saat mencari, semua dipaksa terbuka. */
                      const expanded =
                        openGroups.has(g.key) || normalizedQuery.length > 0
                      const items = expanded
                        ? g.items
                        : g.items.slice(0, LIBRARY_GROUP_PREVIEW)
                      return (
                      <m.div key={g.key} variants={journalCard}>
                        <div className="mb-1 flex items-center gap-2 border-l-2 border-module-accent pl-2.5">
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: g.color }}
                          />
                          <h3 className="text-body font-semibold tracking-tight text-content-secondary">
                            {g.label}
                          </h3>
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-chart-label font-semibold tabular-nums text-content-secondary">
                            {g.items.length}
                          </span>
                        </div>
                        <div>
                          {items.map((h) => (
                            /* Pembungkus ledger-row: pemisah hairline antar
                               item — detail hidup di bottom sheet (ponsel)
                               / kolom kanan (desktop), bukan panel inline
                               yang menyisip di tengah daftar (audit v2.37). */
                            <div key={h.id} className="ledger-row">
                              <LibraryRow
                                habit={h}
                                done={isDoneOn(completions, today, h.id)}
                                streak={habitStreak(h, completions, today)}
                                completions={completions}
                                today={today}
                                selected={selectedId === h.id}
                                onSelect={() => toggleSelect(h.id)}
                              />
                            </div>
                          ))}
                          {g.items.length > LIBRARY_GROUP_PREVIEW && (
                            <button
                              type="button"
                              onClick={() => toggleGroup(g.key)}
                              aria-expanded={expanded}
                              className="mt-1 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong px-3 py-2 text-eyebrow font-semibold text-content-secondary transition-colors hover:border-module-accent/50 hover:text-module-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                              <ChevronDown
                                aria-hidden="true"
                                className={
                                  'h-3.5 w-3.5 transition-transform duration-300 ' +
                                  (expanded ? 'rotate-180' : '')
                                }
                              />
                              {expanded
                                ? 'Tampilkan lebih sedikit'
                                : `Tampilkan semua (${g.items.length})`}
                            </button>
                          )}
                        </div>
                      </m.div>
                      )
                    })}
                  </m.div>
                </div>

                {/* Kolom kanan — Panel Detail Kebiasaan (hanya ruang kerja
                   lebar, gerbang JS libraryWide — selaras dengan sheet
                   ponsel; tidak ada kondisi "tidak terjangkau" di zona
                   transisi). self-start + max-h agar penempatan menempel
                   tidak meluber: panel menggulir sendiri bila kontennya
                   lebih tinggi. */}
                {selectedHabit && libraryWide && (
                  <aside
                    id="detail-kebiasaan"
                    aria-label="Detail kebiasaan terpilih"
                    className="self-start @[52rem]:sticky @[52rem]:top-0 @[52rem]:col-span-5 @[52rem]:mt-4 @[52rem]:max-h-[calc(100dvh-12rem)] @[52rem]:overflow-y-auto no-scrollbar scroll-mt-20"
                  >
                    <HabitDetailPanel
                      key={selectedHabit.id}
                      habit={selectedHabit}
                      habits={habits}
                      completions={completions}
                      today={today}
                      onEdit={openHabitEdit}
                      onCompleteMini={completeMini}
                    />
                  </aside>
                )}
              </div>
            )}

            {/* Arsip — pulihkan atau sunting kebiasaan yang ditanggalkan.
                Buka/tutup memakai Radix Collapsible (shadcn/ui) —
                state lokal showArchive tetap dipakai (mode terkontrol). */}
            {archivedHabits.length > 0 && (
              <Collapsible
                open={showArchive}
                onOpenChange={setShowArchive}
                className="mt-6"
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="group flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border bg-surface-primary px-3.5 py-2.5 text-left shadow-soft transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=open]:bg-surface-sunken"
                  >
                    <span className="flex items-center gap-2 text-meta font-bold text-content-secondary">
                      <Archive className="h-3.5 w-3.5" />
                      Arsip ({archivedHabits.length})
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 text-content-muted transition-transform duration-300 group-data-[state=open]:rotate-180"
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 pt-2.5">
                    {archivedHabits.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-surface-primary px-3.5 py-2.5 shadow-soft"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-secondary text-content-muted">
                          <Archive className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-note font-semibold text-content-secondary">
                            {h.title}
                          </span>
                          <span className="block text-eyebrow font-medium text-content-muted">
                            {h.cat} · diarsipkan
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setHabitArchived(h.id, false)
                            toast.success('Kebiasaan dipulihkan dari arsip')
                          }}
                          aria-label={`Pulihkan ${h.title} dari arsip`}
                          className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-primary/40 px-4 text-meta font-bold text-success transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" />
                          Pulihkan
                        </button>
                        <button
                          type="button"
                          onClick={() => openHabitEdit(h.id)}
                          aria-label={`Sunting ${h.title}`}
                          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-content-secondary transition-colors hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </m.section>
        </>
      )}

      {/* CTA di ujung konten — pintu utama menanam kebiasaan baru */}
      <m.div
        initial={playEntrance ? { opacity: 0, y: 14 } : false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20px' }}
        transition={motionTokens.preset.panelReveal}
        className="mt-8"
      >
        <button
          type="button"
          onClick={openHabitCreate}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary text-section font-bold text-primary-foreground shadow-soft transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} />
          Kebiasaan baru
        </button>
      </m.div>

      {/* Panel detail ponsel — bottom sheet (audit v2.37): tidak lagi
          menyisipkan panel tinggi di tengah daftar panjang; pola sheet
          yang sama dengan DayDetailSheet (Escape/backdrop/seret-tutup). */}
      {!libraryWide && (
        <RutinaSheet
          open={sheetHabit != null}
          onClose={() => setSelectedId(null)}
          label={sheetHabit ? `Detail kebiasaan ${sheetHabit.title}` : 'Detail kebiasaan'}
          className="max-h-[calc(100%-2rem)] flex flex-col overflow-hidden"
        >
          {sheetHabit && (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
              <HabitDetailPanel
                key={sheetHabit.id}
                habit={sheetHabit}
                habits={habits}
                completions={completions}
                today={today}
                onEdit={openHabitEdit}
                onCompleteMini={completeMini}
              />
            </div>
          )}
        </RutinaSheet>
      )}
    </div>
  )
}
