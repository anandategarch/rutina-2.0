'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, LayoutGroup } from 'motion/react'
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
  Snowflake,
  Sparkles,
  Sprout,
  Sun,
  Sunrise,
  Sunset,
  Target,
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
import { journalCard, journalList } from '@/lib/motion/variants'
import { motionTokens } from '@/lib/motion/tokens'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { barFill, pressSnappy } from '@/lib/motion/transitions'

import {
  PLANT_STAGES,
  goldilocksOf,
  missedYesterday,
  plantStageOf,
  type GoldilocksAdvice,
} from '../habit-coach'
import { PlantGarden } from '../plant-garden'
import Heatmap from '../heatmap'
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
  habitProgressOn,
  habitStreak,
  habitsOn,
  isDoneOn,
  longDateLabel,
  scheduledOn,
  todayISO,
  useRutina,
  weekStartISO,
  type Completions,
  type Habit,
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

/* variasi saran “terlewat kemarin” — bergilir agar tumpukan
   kartu coach tidak menampilkan kalimat identik berulang-ulang. */
const MISSED_NUDGES = [
  'Terlewat kemarin — jangan bolong dua kali.',
  'Satu hari kosong bukan gagal — tuntaskan kemarin, lanjutkan hari ini.',
  'Runtun masih bisa diselamatkan — satu centang kemarian cukup.',
] as const

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
 * Deretan 7 titik mini (±7px, jarak 3px) — selesai memakai warna domain
 * (module accent = Rose Clay di layar ini), kosong memakai permukaan
 * sekunder; hari yang belum terjadi diredupkan agar pekan terbaca utuh.
 * Dipakai pada baris agenda & perpustakaan (komposisi layar ini sendiri,
 * bukan lewat task-row).
 */
function WeekDots({
  completions,
  habitId,
  today,
}: {
  completions: Completions
  habitId: string
  today: string
}) {
  const start = weekStartISO(today)
  const dots = WEEK_DOT_LABELS.map((label, i) => {
    const iso = addDaysISO(start, i)
    return {
      label,
      iso,
      done: iso <= today && isDoneOn(completions, iso, habitId),
      future: iso > today,
    }
  })
  const doneCount = dots.filter((d) => d.done).length

  return (
    <span
      role="img"
      aria-label={`Riwayat pekan ini: ${doneCount} hari selesai`}
      className="flex shrink-0 items-center gap-[3px]"
    >
      {dots.map((d) => (
        <span
          key={d.label}
          aria-hidden="true"
          title={`${d.label} — ${d.done ? 'selesai' : d.future ? 'belum terjadi' : 'belum selesai'}`}
          className={
            'h-[7px] w-[7px] rounded-full ' +
            (d.done
              ? 'bg-module-accent'
              : d.future
                ? 'bg-surface-secondary opacity-40'
                : 'bg-surface-secondary')
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
         SETELAH state berubah — kini tekan terasa DULU). Ikon kecil: 0.88. */
      whileTap={{ scale: 0.88 }}
      transition={pressSnappy}
      className={
        'interactive flex shrink-0 cursor-pointer items-center justify-center rounded-full border-2 ' +
        (size === 'md' ? 'h-9 w-9' : 'h-8 w-8') +
        ' ' +
        (done
          ? 'border-module-accent bg-module-accent text-module-accent-fg'
          : 'border-border-strong text-transparent hover:border-module-accent/60')
      }
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
  onToggle,
  onEdit,
}: {
  habit: Habit
  done: boolean
  completions: Completions
  today: string
  onToggle: () => void
  onEdit: () => void
}) {
  const setHabitValue = useRutina((s) => s.setHabitValue)

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
        <WeekDots completions={completions} habitId={habit.id} today={today} />
      </div>

      {/* Strip stepper kebiasaan terukur — hanya saat belum selesai */}
      {isMeasured && !done && (
        <div className="mx-2 mb-2 mt-1 flex items-center gap-2.5 border-t border-border/70 pl-[46px] pr-1 pt-2">
          <button
            type="button"
            onClick={() => stepBy(-1)}
            disabled={progress <= 0}
            aria-label="Kurangi progres"
            className="interactive flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-surface-primary text-content-secondary"
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
            className="interactive flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-module-accent/50 bg-module-accent-soft text-module-accent-strong"
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
 * Satu baris inventaris: centang cepat, titik warna kategori, nama,
 * jadwal ringkas + runtun mini, dan mini-history 7 hari. Ketuk badan
 * baris membuka Panel Detail (inline di bawah baris pada layar sempit,
 * kolom kanan split-screen pada ruang kerja lebar).
 */
function LibraryRow({
  habit,
  done,
  streak,
  completions,
  today,
  selected,
  onToggle,
  onSelect,
}: {
  habit: Habit
  done: boolean
  streak: number
  completions: Completions
  today: string
  selected: boolean
  onToggle: () => void
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
      <HabitCheck
        size="sm"
        done={done}
        label={`Tandai selesai: ${habit.title}`}
        onToggle={onToggle}
      />
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
          <span className="sr-only">. Ketuk untuk membuka detail.</span>
        </span>
      </button>
      <WeekDots completions={completions} habitId={habit.id} today={today} />
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

  /* Riwayat 30 hari terakhir, tua ke baru. */
  const history: boolean[] = []
  for (let i = 29; i >= 0; i--) {
    history.push(isDoneOn(completions, addDaysISO(today, -i), habit.id))
  }

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

        {/* Riwayat 30 hari terakhir — satu titik per hari */}
        <div className="mt-5">
          <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
            30 hari terakhir
          </p>
          <div
            aria-label="Riwayat 30 hari terakhir"
            className="mt-2 flex flex-wrap gap-1"
          >
            {history.map((done, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={
                  'h-2.5 w-2.5 rounded-full ' +
                  (done ? 'bg-module-accent' : 'bg-surface-sunken')
                }
              />
            ))}
          </div>
        </div>

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
     detail & expand tetap diantar (interaksi, bukan replay layar). */
  const playEntrance = useFirstVisit('kebiasaan-garden')
  const habits = useRutina((s) => s.habits)
  const completions = useRutina((s) => s.completions)
  const toggleHabit = useRutina((s) => s.toggleHabit)
  const setHabitArchived = useRutina((s) => s.setHabitArchived)
  const openHabitCreate = useRutina((s) => s.openHabitCreate)
  const openHabitEdit = useRutina((s) => s.openHabitEdit)

  const [showArchive, setShowArchive] = useState(false)
  /* Kebiasaan terpilih untuk Panel Detail — panel inline di bawah baris
     perpustakaan (layar sempit) & kolom kanan split-screen (≥52rem). */
  const [selectedId, setSelectedId] = useState<string | null>(null)

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
     selesai diurutkan jam pengingat (belum selesai selalu di atas). */
  const scheduledToday = useMemo(
    () => activeHabits.filter((h) => scheduledOn(h, today)),
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

  /* Susunan agenda: yang menunggu dikelompokkan per waktu ke rel timeline
     (Pagi/Siang/Malam/Kapan saja — agenda-rail), tiap rel terurut jam;
     yang selesai turun ke ekor "Selesai" yang diredupkan setelah rel. */
  const agendaGroups = useMemo(() => {
    const buckets: Record<AgendaSlot, Habit[]> = {
      pagi: [],
      siang: [],
      malam: [],
      bebas: [],
    }
    for (const h of pendingToday) buckets[slotOf(h)].push(h)
    return SLOT_META.map((meta) => ({
      ...meta,
      items: buckets[meta.key].sort(byTime),
    })).filter((g) => g.items.length > 0)
  }, [pendingToday])

  const agendaPct =
    scheduledToday.length > 0
      ? doneToday.length / scheduledToday.length
      : 0

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
      const scheduled = habitsOn(habits, iso)
      if (iso <= today) {
        schedElapsed += scheduled.length
        doneElapsed += scheduled.filter((h) =>
          isDoneOn(completions, iso, h.id),
        ).length
      } else {
        schedRemaining += scheduled.length
      }
    }
    return { schedElapsed, doneElapsed, schedRemaining }
  }, [habits, completions, today])
  const weekTargetPct =
    weekTarget.schedElapsed > 0
      ? Math.round((weekTarget.doneElapsed / weekTarget.schedElapsed) * 100)
      : null
  const maturePlants = useMemo(
    () =>
      activeHabits.filter((h) => {
        const key = plantStageOf(h, completions, today).stage.key
        return key === 'pohon-dewasa' || key === 'berbunga'
      }).length,
    [activeHabits, completions, today],
  )

  /* Saran Coach — maksimal DUA saran paling relevan (audit Tahap 2):
     nudge "jangan bolong dua kali" diprioritaskan (aksi backfill
     kemarin), sisa kuota diisi Goldilocks. */
  const coachCards = useMemo<
    (
      | { kind: 'missed'; habit: Habit }
      | { kind: 'goldilocks'; habit: Habit; advice: GoldilocksAdvice }
    )[]
  >(() => {
    const missed = missedYesterday(habits, completions, today)
      .slice(0, 2)
      .map((habit) => ({ kind: 'missed' as const, habit }))
    const room = Math.max(0, 2 - missed.length)
    const tips: { kind: 'goldilocks'; habit: Habit; advice: GoldilocksAdvice }[] =
      []
    for (const h of activeHabits) {
      if (tips.length >= room) break
      const advice = goldilocksOf(h, completions, today)
      if (advice) tips.push({ kind: 'goldilocks', habit: h, advice })
    }
    return [...missed, ...tips]
  }, [habits, completions, today, activeHabits])

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

  const hasNoHabits = habits.length === 0

  /* Buka/tutup detail baris perpustakaan (ketuk ulang untuk menutup). */
  const toggleSelect = (id: string) =>
    setSelectedId((prev) => (prev === id ? null : id))

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
      data-module="kebiasaan"
      data-layout="garden"
      className="h-full overflow-y-auto no-scrollbar overscroll-contain px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-content-primary"
    >
      {/* Kepala editorial tenang — tanggal panjang + ringkasan singkat.
          Titik & eyebrow memakai aksen Rose Clay (identitas kebun kebiasaan). */}
      <m.header
        initial={playEntrance ? { opacity: 0, y: 12 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={motionTokens.preset.panelReveal}
      >
        {/* Judul halaman editorial — Playfair Display sebagai aksen botanical
            (Tipografi System v1: satu-satunya serif di luar sapaan Beranda;
            nama kebiasaan & kontrol tetap Geist Sans demi kecepatan). */}
        <p className="flex items-center gap-1.5 text-eyebrow font-semibold uppercase tracking-[0.14em] text-module-accent-strong">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-module-accent"
          />
          {longDateLabel(today)}
        </p>
        <h1
          className={`${playfair.className} mt-1.5 text-balance text-fluid-editorial font-semibold leading-tight tracking-tight text-content-primary`}
        >
          Kebiasaan<span className="text-module-accent">.</span>
        </h1>
        <p className="mt-2 text-body font-medium tabular-nums text-content-muted">
          {activeHabits.length} kebiasaan aktif ·{' '}
          {scheduledToday.length === 0
            ? 'tidak ada jadwal hari ini'
            : pendingToday.length > 0
              ? `${pendingToday.length} menunggu hari ini`
              : 'agenda hari ini tuntas'}
        </p>
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
                whileTap={{ scale: 0.95 }}
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
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
                      initial={{ scaleX: 0 }}
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
                        <m.div
                          variants={journalList}
                          initial="hidden"
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
                                onToggle={() => toggleHabit(h.id, today)}
                                onEdit={() => openHabitEdit(h.id)}
                              />
                            </m.div>
                          ))}
                        </m.div>
                      </div>
                    ))}
                  </div>

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
                        initial="hidden"
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

          {/* ============ Saran Coach — maksimal dua, yang paling relevan ============ */}
          {coachCards.length > 0 && (
            <section
              className="mt-[var(--layout-gap)]"
              aria-label="Saran Coach"
            >
              <RutinaSectionHeader
                title="Saran Coach"
                description="Penyesuaian kecil dari hasil pekan ini"
              />
              <m.div
                variants={journalList}
                initial="hidden"
                animate="show"
                className="mt-3 space-y-2.5"
              >
                {coachCards.map((card, cardIdx) =>
                  card.kind === 'missed' ? (
                    <m.div
                      key={`missed-${card.habit.id}`}
                      variants={journalCard}
                      className="rounded-lg border border-gold/40 bg-gold/15 p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/30 text-warning"
                        >
                          <Flame className="h-4 w-4" strokeWidth={2.2} />
                        </span>
                        <div className="min-w-0">
                          {/* Titik kategori (v2.19): pembeda visual antar
                              kartu yang tadinya identik — warna kategori
                              kebiasaan + saran yang berbeda-beda. */}
                          <p className="flex items-center gap-1.5 text-note font-semibold text-content-primary">
                            <span
                              aria-hidden="true"
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{
                                backgroundColor:
                                  HABIT_CAT_COLORS[card.habit.cat],
                              }}
                            />
                            <span className="truncate">
                              {card.habit.title}
                            </span>
                          </p>
                          <p className="mt-0.5 text-meta leading-relaxed text-content-muted">
                            {card.habit.mini
                              ? `Kemarin terlewat — coba versi mini: “${card.habit.mini}”.`
                              : MISSED_NUDGES[cardIdx % MISSED_NUDGES.length]}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          /* Tanggal kemarin dihitung di dalam handler — nilai
                             turunan `today` yang di-pass ke aksi store di
                             level render membuat React Compiler membatalkan
                             memoisasi ("today" dianggap bisa berubah). */
                          toggleHabit(card.habit.id, addDaysISO(today, -1))
                          toast.success(
                            `"${card.habit.title}" kemarin selesai — runtun kembali utuh.`,
                          )
                        }}
                        className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-meta font-bold text-primary-foreground shadow-soft transition-all hover:bg-action-hover active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <Check className="h-4 w-4" strokeWidth={2.6} />
                        Tandai selesai kemarin
                      </button>
                    </m.div>
                  ) : (
                    <m.div
                      key={`gold-${card.habit.id}`}
                      variants={journalCard}
                      className="flex items-start gap-3 rounded-lg border border-border bg-surface-primary p-3.5 shadow-soft"
                    >
                      <span
                        aria-hidden="true"
                        className={
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full ' +
                          (card.advice.tone === 'naik'
                            ? 'bg-secondary text-success'
                            : 'bg-secondary/70 text-content-secondary')
                        }
                      >
                        {card.advice.tone === 'naik' ? (
                          <Sparkles className="h-4 w-4" strokeWidth={2.2} />
                        ) : (
                          <Target className="h-4 w-4" strokeWidth={2.2} />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-note font-semibold text-content-primary">
                          {card.advice.title}
                        </p>
                        <p className="mt-0.5 text-meta leading-relaxed text-content-muted">
                          {card.advice.text}
                        </p>
                      </div>
                    </m.div>
                  ),
                )}
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
                initial="hidden"
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

              {/* Taman Pertumbuhan — bedeng tanaman di dalam zona kebun
                  yang sama; mode 'beds' menanam kisi melipat di ruang
                  kerja lebar. */}
                <div className="mt-5">
                  <Heatmap />
                </div>
                <div className="mt-5">
                  <PlantGarden variant="beds" />
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
              description="Inventaris semua kebiasaan, dikelompokkan per kategori"
            />

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
              <div className="@[52rem]:grid @[52rem]:grid-cols-12 @[52rem]:gap-[var(--layout-gap)]">
                {/* Kolom kiri — daftar ledger terkelompok */}
                <div className="min-w-0 @[52rem]:col-span-7">
                  <m.div
                    variants={journalList}
                    initial="hidden"
                    animate="show"
                    className="mt-2 space-y-5"
                  >
                    {catGroups.map((g) => (
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
                          {g.items.map((h) => (
                            /* Pembungkus ledger-row: pemisah hairline antar
                               item (termasuk panel inline yang membuka di
                               dalam item yang sama). */
                            <div key={h.id} className="ledger-row">
                              <LibraryRow
                                habit={h}
                                done={isDoneOn(completions, today, h.id)}
                                streak={habitStreak(h, completions, today)}
                                completions={completions}
                                today={today}
                                selected={selectedId === h.id}
                                onToggle={() => toggleHabit(h.id, today)}
                                onSelect={() => toggleSelect(h.id)}
                              />
                              {/* Panel detail inline — hanya pada layar
                                  sempit; di ruang kerja lebar digantikan
                                  kolom kanan split-screen. */}
                              <AnimatePresence initial={false}>
                                {selectedId === h.id && (
                                  <m.div
                                    className="@[52rem]:hidden overflow-hidden"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{
                                      duration: motionTokens.duration.normal,
                                      ease: motionTokens.easing.standard,
                                    }}
                                  >
                                    <div className="px-1 pb-3 pt-1.5">
                                      <HabitDetailPanel
                                        habit={h}
                                        habits={habits}
                                        completions={completions}
                                        today={today}
                                        onEdit={openHabitEdit}
                                        onCompleteMini={completeMini}
                                      />
                                    </div>
                                  </m.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                      </m.div>
                    ))}
                  </m.div>
                </div>

                {/* Kolom kanan — Panel Detail Kebiasaan (hanya ruang kerja
                   lebar ≥52rem). self-start + max-h agar penempatan
                   menempel tidak meluber: panel menggulir sendiri bila
                   kontennya lebih tinggi. */}
                {selectedHabit && (
                  <aside
                    aria-label="Detail kebiasaan terpilih"
                    className="hidden self-start @[52rem]:sticky @[52rem]:top-0 @[52rem]:col-span-5 @[52rem]:mt-4 @[52rem]:block @[52rem]:max-h-[calc(100dvh-12rem)] @[52rem]:overflow-y-auto no-scrollbar"
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
    </div>
  )
}
