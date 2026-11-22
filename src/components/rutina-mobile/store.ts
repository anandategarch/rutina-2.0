import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { toast } from 'sonner'

/* Label seluruh kategori bawaan (satu sistem terpadu — v2.17) untuk
   validasi anti-duplikat kategori buatan. finance/cats.ts hanya
   mengimpor tipe dari berkas ini (type-only) sehingga tidak ada
   ketergantungan runtime melingkar. */
import { CATS_UNIFIED_LABELS } from './finance/cats'
/* Impor melingkar aman: useJournalUi hanya disentuh saat aksi berjalan
   (runtime), tidak saat evaluasi modul — dipakai deleteNote/startFresh
   memangkas metadata mood catatan yang terhapus. */
import { useJournalUi } from './journal-ui'

/* ===== Tipe domain ===== */

/* Catatan integritas data (v2.19): aplikasi TIDAK lagi membawa data
   contoh/dummy — layar pertama selalu jujur: histori asli pengguna dari
   cloud (impor Rutina 1.0) atau keadaan kosong bila benar-benar baru. */

export type Screen =
  | 'beranda'
  | 'bugar'
  | 'jurnal'
  | 'keuangan'
  | 'kebiasaan'
  | 'statistik'
  | 'profil'
export type FolderKey = 'kerja' | 'ide' | 'bacaan' | 'pribadi'

export interface Note {
  id: string
  title: string
  body: string
  date: string
  pinned: boolean
  tone: number
  folder: FolderKey
}

export const FOLDERS: { key: FolderKey; label: string }[] = [
  { key: 'kerja', label: 'Kerja' },
  { key: 'ide', label: 'Ide & Gagasan' },
  { key: 'bacaan', label: 'Bacaan' },
  { key: 'pribadi', label: 'Pribadi' },
]

/** Jumlah catatan nyata per folder — dihitung dari data, bukan angka statis. */
export function folderCount(notes: Note[], key: FolderKey): number {
  return notes.filter((n) => n.folder === key).length
}

/* --- Integritas tanggal catatan (audit visualisasi v2.36, Tahap 1) ---
   Skema database mengharapkan ISO yyyy-mm-dd, tetapi catatan lama lahir
   dengan label "Hari ini". Sebelum membangun visual historis (heatmap
   menulis, filter tanggal), tanggal harus punya satu makna: */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Tanggal ISO catatan — sumber tunggal pengelompokan visual. Tangga
 * kejujuran:
 * 1. field `date` yang sudah ISO (catatan baru v2.36+) → apa adanya;
 * 2. id `note-<epoch>` / `quote-<epoch>` (catatan lama berlabel
 *    "Hari ini") → tanggal DIBUAT yang sesungguhnya;
 * 3. selain itu → null: tanggal tak dapat dipastikan dan TIDAK boleh
 *    dianggap hari ini (heatmap memasukkannya ke kelompok tanpa
 *    tanggal, bukan mengarang).
 */
export function noteDateISO(note: Note): string | null {
  if (ISO_DATE_RE.test(note.date)) return note.date
  const m = /^(?:note|quote)-(\d{12,})$/.exec(note.id)
  if (m) {
    const d = new Date(Number(m[1]))
    if (!Number.isNaN(d.getTime())) return isoOf(d)
  }
  return null
}

/** Label tanggal catatan untuk kartu: "Hari ini" / "Kemarin" / "5 Jan".
 *  Tanggal tak terpaste → "Tanpa tanggal" — jujur, bukan mengarang. */
export function noteDateLabel(note: Note, today: string = todayISO()): string {
  const iso = noteDateISO(note)
  if (iso == null) return 'Tanpa tanggal'
  if (iso === today) return 'Hari ini'
  if (iso === addDaysISO(today, -1)) return 'Kemarin'
  return fromISO(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
}

/** Label pendek folder untuk chip filter jurnal. */
export const FOLDER_SHORT: Record<FolderKey, string> = {
  kerja: 'Kerja',
  ide: 'Ide',
  bacaan: 'Bacaan',
  pribadi: 'Pribadi',
}

export const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export const MOODS = ['Ceria', 'Baik', 'Biasa', 'Lelah']

/* ===== Semangat Hari Ini — kutipan harian bergilir (deterministik) ===== */

export const DAILY_QUOTES: { text: string; author: string }[] = [
  { text: 'Kebiasaan kecil yang konsisten akan mengalahkan motivasi besar yang sesaat.', author: 'James Clear, Atomic Habits' },
  { text: 'Kita adalah apa yang kita lakukan berulang-ulang. Keunggulan, karenanya, bukanlah tindakan, melainkan kebiasaan.', author: 'Aristoteles' },
  { text: 'Satu persen lebih baik setiap hari berarti 37 kali lebih baik dalam setahun.', author: 'James Clear' },
  { text: 'Disiplin adalah jembatan antara tujuan dan pencapaian.', author: 'Jim Rohn' },
  { text: 'Motivasi membuat kamu memulai. Kebiasaan membuat kamu bertahan.', author: 'Jim Ryun' },
  { text: 'Jangan menunggu momen yang sempurna — ambil momen ini dan buat sempurna.', author: 'Zig Ziglar' },
  { text: 'Kualitas hidupmu, pada akhirnya, ditentukan oleh kualitas kebiasaanmu.', author: 'Anonim' },
  { text: 'Fokus pada sistem, bukan hanya tujuan. Tujuan menetapkan arah; sistemlah yang membawamu ke sana.', author: 'James Clear' },
  { text: 'Tubuhmu mendengarkan semua yang pikiranmu katakan. Berikan kata-kata yang baik.', author: 'Naomi Judd' },
  { text: 'Uang tidak membeli kebahagiaan, tetapi mengelolanya dengan baik membeli ketenangan.', author: 'Anonim' },
  { text: 'Kamu tidak harus hebat untuk memulai, tetapi kamu harus memulai untuk menjadi hebat.', author: 'Zig Ziglar' },
  { text: 'Kebahagiaan bukanlah sesuatu yang siap jadi — ia lahir dari tindakanmu sendiri.', author: 'Dalai Lama' },
  { text: 'Waktu yang dihabiskan untuk merawat diri tidak pernah sia-sia.', author: 'Anonim' },
  { text: 'Menulis adalah cara berpikir paling jernih — menuangkan gagasan membuatnya nyata.', author: 'Anonim' },
  { text: 'Tanaman tidak berbunga karena dimarahi — begitu pula dirimu; airi dengan sabar.', author: 'Anonim' },
  { text: 'Setiap hari adalah halaman baru; tulis sedikit, tapi tulis dengan jujur.', author: 'Anonim' },
]

/** Kutipan hari ini — index dari hari-dalam-tahun sehingga berganti
 *  tiap tanggal namun stabil sepanjang hari yang sama. */
export function dailyQuote(today: string): { text: string; author: string } {
  return quoteFor(today, 0)
}

/** Kutipan pada offset dari kutipan harian — dipakai fitur "ganti refleksi":
 *  offset berputar modulo jumlah kutipan sehingga selalu valid. */
export function quoteFor(
  today: string,
  offset: number,
): { text: string; author: string } {
  const d = fromISO(today)
  const start = new Date(d.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86_400_000)
  const len = DAILY_QUOTES.length
  const idx =
    ((Math.abs(dayOfYear) % len) + (offset % len) + len) % len
  return DAILY_QUOTES[idx]!
}

/** Offset "Ganti refleksi" berikutnya — murni agar mudah diuji: offset
 *  hanya berlanjut bila pengguna mengganti pada HARI yang sama; hari
 *  baru selalu mulai dari kutipan pertama sesudah default (offset 1). */
export function nextQuoteOffset(
  prevDate: string | null,
  prevOffset: number,
  today: string,
): number {
  return prevDate === today ? prevOffset + 1 : 1
}

/** Kutipan refleksi yang tampil saat ini — sadar offset & pergantian
 *  hari (murni; kebalikan aksi currentQuote() di store). */
export function currentQuoteOf(
  quoteDate: string | null,
  quoteOffset: number,
  today: string,
): { text: string; author: string } {
  return quoteFor(today, quoteDate === today ? quoteOffset : 0)
}

/* ===== Ekonomi XP (gabungan varian Gamified ke dalam app utuh) ===== */

export const XP_BASE = 1840
export const XP_PER_TASK = 80
export const XP_BONUS = 120
export const XP_TARGET = 2400

export function computeXp(doneCount: number, bonusClaimed: boolean): number {
  return XP_BASE + doneCount * XP_PER_TASK + (bonusClaimed ? XP_BONUS : 0)
}

export function computeLevel(xp: number): number {
  return xp >= XP_TARGET ? 8 : 7
}

/* ===== Domain Kebiasaan — histori penyelesaian nyata ===== */

export type HabitCat = 'Kebiasaan' | 'Kerja' | 'Kesehatan' | 'Pribadi' | 'Belajar'

export const HABIT_CATS: HabitCat[] = [
  'Kebiasaan',
  'Kerja',
  'Kesehatan',
  'Pribadi',
  'Belajar',
]

/* Warna kategori kebiasaan — Color System v2: nilai kini menunjuk token CSS
   (--habit-cat-*, dideklarasikan di globals.css dengan varian mode gelap)
   sehingga Kebiasaan, Statistik, dan Quick Action berbagi SATU sumber warna
   dan otomatis terang di mode gelap. Nilai heks lama dipertahankan sebagai
   fallback token di globals.css. Dipakai via style/backgroundColor — var()
   terurai normal di inline style. */
export const HABIT_CAT_COLORS: Record<HabitCat, string> = {
  Kebiasaan: 'var(--habit-cat-kebiasaan)',
  Kerja: 'var(--habit-cat-kerja)',
  Kesehatan: 'var(--habit-cat-kesehatan)',
  Pribadi: 'var(--habit-cat-pribadi)',
  Belajar: 'var(--habit-cat-belajar)',
}

/** Label hari singkat, indeks 0 = Minggu … 6 = Sabtu (urutan Date#getDay). */
export const WEEKDAY_MIN = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export interface Habit {
  id: string
  title: string
  desc: string
  cat: HabitCat
  /** Hari aktif dalam sepekan (0=Minggu..6=Sabtu). Kosong = setiap hari. */
  schedule: number[]
  /** Target frekuensi penyelesaian per pekan. */
  weeklyTarget: number
  /** Jam pengingat format "HH:MM", atau null bila tanpa pengingat. */
  reminder: string | null
  /** Jeda Runtun Aman (streak freeze) — tanggal ISO terjadwal; maksimal
   *  satu per pekan, ditetapkan sebelum tanggalnya tiba, dan tidak
   *  menambah/memutus streak (hanya mengampuni hari kosong). */
  restDays: string[]
  /** Susun Kebiasaan (habit stacking) — id kebiasaan pemicu:
   *  "Setelah [pemicu], saya akan [kebiasaan ini]." */
  afterId: string | null
  /** Versi 2 Menit — bentuk terkecil kebiasaan yang mudah dimulai. */
  mini: string
  /** Kebiasaan terukur (v2.22): target jumlah per hari, mis. 8 gelas.
   *  null = kebiasaan centang biasa. */
  target: number | null
  /** Satuan kebiasaan terukur, mis. "gelas", "halaman", "menit". */
  unit: string | null
  /** Kelompok custom (v2.22) — id HabitGroup, null = tanpa kelompok. */
  groupId: string | null
  /** Hubungan eksplisit dengan aktivitas Bugar (audit v2.37 §4A):
   *  jenis workout yang dicatat dapat menyelesaikan / menambah progres
   *  kebiasaan ini secara otomatis. null = tidak terhubung (default
   *  kebiasaan lama — TIDAK pernah ditebak dari judul/kategori). */
  linkedActivity: WorkoutKind | null
  archived: boolean
  /** Tanggal ISO mulai kebiasaan dijalankan (batas hitung streak). */
  createdAt: string
}

/** Input formulir kebiasaan baru / hasil suntingan. */
export interface HabitInput {
  title: string
  desc: string
  cat: HabitCat
  schedule: number[]
  weeklyTarget: number
  reminder: string | null
  restDays: string[]
  afterId: string | null
  mini: string
  target: number | null
  unit: string | null
  groupId: string | null
  /** Lihat Habit.linkedActivity — pilihan eksplisit pengguna. */
  linkedActivity: WorkoutKind | null
}

/* ===== Kelompok kebiasaan custom (v2.22) ===== */

export interface HabitGroup {
  id: string
  name: string
  /** Token warna CSS dari palet earth-tone (lihat HABIT_GROUP_COLORS). */
  color: string
}

/** Palet warna kelompok — token CSS earth-tone yang aman mode gelap. */
export const HABIT_GROUP_COLORS = [
  { token: 'var(--habit-cat-kebiasaan)', label: 'Matcha' },
  { token: 'var(--habit-cat-kerja)', label: 'Slate' },
  { token: 'var(--habit-cat-kesehatan)', label: 'Eucalyptus' },
  { token: 'var(--habit-cat-pribadi)', label: 'Rose Clay' },
  { token: 'var(--habit-cat-belajar)', label: 'Gold' },
  { token: 'var(--palette-pistachio)', label: 'Pistachio' },
] as const

/** completions[tanggalISO][habitId] — sumber tunggal histori. Nilai:
 *  - true  → selesai penuh (kebiasaan centang ATAU terukur yang mencapai target)
 *  - angka → progres parsial kebiasaan terukur (mis. 5 dari 8 gelas);
 *            belum dihitung selesai sampai nilainya mencapai target.
 *  Semantik lama (boolean) tetap utuh sehingga streak, statistik, dan
 *  histori Rutina 1.0 tidak berubah perilaku. */
export type Completions = Record<string, Record<string, boolean | number>>

/* ===== Otomatisasi Bugar → Kebiasaan (audit v2.37 §4) =====

   Provenance penyelesaian: habitAuto[habitId][dateISO] menyimpan nilai
   dasar (manual) SEBELUM kontribusi otomatis pertama + daftar id workout
   yang berkontribusi. Inilah yang membuat sistem tahu asal completion
   (centang manual vs workout tertentu vs lebih dari satu workout) dan
   bisa mengevaluasi ulang saat workout dihapus — tanpa pernah menghapus
   centang manual. */

export interface HabitAutoEntry {
  /** Nilai completion sebelum kontribusi otomatis pertama —
   *  undefined = belum ada catatan manual. */
  base: boolean | number | undefined
  /** Id workout yang berkontribusi pada tanggal ini. */
  wo: string[]
}

export type HabitAuto = Record<string, Record<string, HabitAutoEntry>>

/** Satuan target habit yang bisa dipenuhi data workout — tanpa
 *  konversi lintas satuan (audit v2.37 §4B: satuan tidak cocok =
 *  kebiasaan dibiarkan tidak berubah). */
const ACTIVITY_UNIT_SOURCE: Record<string, 'duration' | 'distance'> = {
  menit: 'duration',
  minute: 'duration',
  minutes: 'duration',
  km: 'distance',
  kilometer: 'distance',
}

/** Apakah habit layak dievaluasi untuk workout ini (audit v2.37 §4C,
 *  langkah 3–7): tautan eksplisit, tidak diarsip, tanggal tidak
 *  mendahului createdAt, terjadwal, dan bukan hari jeda. */
function habitEligibleForWorkout(
  h: Habit,
  wo: Pick<Workout, 'kind' | 'date'>,
  dateISO: string,
): boolean {
  if (h.archived) return false
  if (h.linkedActivity == null || h.linkedActivity !== wo.kind) return false
  if (dateISO < h.createdAt) return false
  if (!scheduledOn(h, dateISO)) return false
  if ((h.restDays ?? []).includes(dateISO)) return false
  return true
}

/** Kontribusi terukur sebuah workout terhadap target habit — null bila
 *  satuan tidak cocok / data tidak cukup (kebiasaan dibiarkan). */
function workoutContribution(
  h: Pick<Habit, 'target' | 'unit'>,
  wo: Pick<Workout, 'duration' | 'distance'>,
): number | null | 'complete' {
  if (h.target == null) return 'complete'
  const source = ACTIVITY_UNIT_SOURCE[(h.unit ?? '').trim().toLowerCase()]
  if (!source) return null
  const raw = source === 'duration' ? wo.duration : (wo.distance ?? null)
  if (raw == null || raw <= 0) return null
  return raw
}

/** Hasil penerapan satu workout ke habit terhubung. */
export interface WorkoutAutoResult {
  completions: Completions
  habitAuto: HabitAuto
  /** Habit yang otomatis tercatat SELESAI PENUH (untuk toast). */
  completed: Habit[]
  /** Habit yang menerima PROGRES PARSIAL (untuk toast). */
  progressed: { habit: Habit; value: number; target: number }[]
}

/** Terapkan satu workout baru ke semua habit terhubung yang layak —
 *  murni, idempoten (id workout yang sama tidak dihitung dua kali),
 *  dan tidak pernah menimpa centang manual yang sudah ada. */
export function applyWorkoutToHabits(
  wo: Workout,
  habits: Habit[],
  completions: Completions,
  habitAuto: HabitAuto,
): WorkoutAutoResult {
  let nextCompletions = completions
  let nextAuto = habitAuto
  const completed: Habit[] = []
  const progressed: { habit: Habit; value: number; target: number }[] = []

  for (const h of habits) {
    if (!habitEligibleForWorkout(h, wo, wo.date)) continue
    const cur = nextCompletions[wo.date]?.[h.id]
    const entry = nextAuto[h.id]?.[wo.date]
    /* Centang manual penuh sudah ada dan belum ada kontribusi otomatis
       → workout tidak menambah apa pun (jangan gandakan completion). */
    if (cur === true && !entry) continue
    /* Workout ini sudah tercatat sebagai sumber → idempoten. */
    if (entry?.wo.includes(wo.id)) continue

    const contribution = workoutContribution(h, wo)
    if (contribution == null) continue

    let nextValue: boolean | number
    if (contribution === 'complete') {
      nextValue = true
    } else {
      const progressNow =
        typeof cur === 'number' ? cur : cur === true ? (h.target ?? 1) : 0
      const sum = progressNow + contribution
      nextValue = sum >= (h.target ?? 1) ? true : Math.round(sum * 10) / 10
    }

    /* Simpan base hanya sekali — nilai manual sebelum otomatisasi. */
    const base = entry ? entry.base : cur
    nextAuto = {
      ...nextAuto,
      [h.id]: {
        ...nextAuto[h.id],
        [wo.date]: { base, wo: [...(entry?.wo ?? []), wo.id] },
      },
    }
    const day = { ...(nextCompletions[wo.date] ?? {}) }
    day[h.id] = nextValue
    nextCompletions = { ...nextCompletions, [wo.date]: day }

    if (nextValue === true) completed.push(h)
    else if (typeof nextValue === 'number')
      progressed.push({ habit: h, value: nextValue, target: h.target ?? 1 })
  }

  return { completions: nextCompletions, habitAuto: nextAuto, completed, progressed }
}

/** Evaluasi ulang provenance setelah penghapusan workout (audit v2.37
 *  §4D): pulihkan nilai manual saat SEMUA sumber hilang; pertahankan
 *  completion bila masih ada workout lain yang valid; centang manual
 *  tidak pernah tersentuh. Mengembalikan daftar habit yang nilai hari
 *  itu berubah (untuk toast transparan). */
export function reevaluateHabitAutoAfterDelete(
  removedWoId: string,
  habits: Habit[],
  workouts: Workout[],
  completions: Completions,
  habitAuto: HabitAuto,
): {
  completions: Completions
  habitAuto: HabitAuto
  reverted: { habit: Habit; date: string }[]
} {
  let nextCompletions = completions
  let nextAuto = habitAuto
  const reverted: { habit: Habit; date: string }[] = []

  for (const [habitId, dates] of Object.entries(habitAuto)) {
    for (const [date, entry] of Object.entries(dates)) {
      if (!entry.wo.includes(removedWoId)) continue
      const habit = habits.find((h) => h.id === habitId)
      /* Sumber workout lain yang MASIH ADA. */
      const remaining = entry.wo.filter(
        (wid) =>
          wid !== removedWoId && workouts.some((w) => w.id === wid),
      )

      if (remaining.length === 0) {
        /* Semua sumber otomatis hilang → kembali ke nilai manual. */
        const day = { ...(nextCompletions[date] ?? {}) }
        if (entry.base === undefined) delete day[habitId]
        else day[habitId] = entry.base
        const nextDays = { ...nextCompletions }
        if (Object.keys(day).length === 0) delete nextDays[date]
        else nextDays[date] = day
        nextCompletions = nextDays
        const habitDates = { ...nextAuto[habitId] }
        delete habitDates[date]
        const nextHabitAuto = { ...nextAuto }
        if (Object.keys(habitDates).length === 0) delete nextHabitAuto[habitId]
        else nextHabitAuto[habitId] = habitDates
        nextAuto = nextHabitAuto
        if (habit) reverted.push({ habit, date })
      } else {
        /* Masih ada sumber lain → hitung ulang dari base + sisa sumber. */
        const keepEntry = { ...entry, wo: remaining }
        nextAuto = {
          ...nextAuto,
          [habitId]: { ...nextAuto[habitId], [date]: keepEntry },
        }
        if (habit) {
          /* Hitung ulang nilai dari base + sisa sumber yang masih ada.
           *  v2.49 (audit): base === true berarti pengguna menuntaskan
           *  SECARA MANUAL setelah kontribusi otomatis — completion
           *  manual penuh tidak pernah diturunkan jadi parsial. */
          let nextValue: boolean | number = true
          if (habit.target != null && entry.base !== true) {
            let sum = typeof entry.base === 'number' ? entry.base : 0
            for (const wid of remaining) {
              const w = workouts.find((x) => x.id === wid)
              if (!w) continue
              const c = workoutContribution(habit, w)
              if (typeof c === 'number') sum += c
            }
            nextValue = sum >= habit.target ? true : sum
          }
          const day = { ...(nextCompletions[date] ?? {}) }
          day[habitId] = nextValue
          nextCompletions = { ...nextCompletions, [date]: day }
        }
      }
    }
  }

  return { completions: nextCompletions, habitAuto: nextAuto, reverted }
}

/** Progres terukur sebuah kebiasaan pada tanggal tertentu — angka murni
 *  untuk stepper/bar: true dianggap target penuh, angka dipakai apa adanya,
 *  tanpa catatan = 0. */
export function habitProgressOn(
  h: Pick<Habit, 'id' | 'target'>,
  c: Completions,
  dateISO: string,
): number {
  const v = c[dateISO]?.[h.id]
  if (v === true) return h.target ?? 1
  if (typeof v === 'number') return v
  return 0
}

/* --- Utilitas tanggal (ISO yyyy-mm-dd, aman zona waktu lokal) --- */

/** Awal pekan (Senin) dari sebuah tanggal ISO. */
export function weekStartISO(iso: string): string {
  const dow = (fromISO(iso).getDay() + 6) % 7 // Senin = 0
  return addDaysISO(iso, -dow)
}

/* --- Jeda Runtun Aman (streak freeze): validasi penjadwalan --- */

/** Alasan penolakan jadwal jeda, atau null bila boleh. Aturan lama
 *  Rutina: maks. satu per pekan, sebelum tanggalnya tiba, hanya untuk
 *  streak yang sedang berjalan (tidak bisa memulai streak baru). */
export function restDayError(
  h: Habit,
  c: Completions,
  iso: string,
  today: string = todayISO(),
): string | null {
  if (iso <= today) return 'Jeda harus ditetapkan sebelum tanggalnya tiba.'
  if (!scheduledOn(h, iso))
    return 'Hari itu bukan hari terjadwal kebiasaan ini.'
  if ((h.restDays ?? []).includes(iso))
    return 'Tanggal ini sudah dijadwalkan jeda.'
  const wk = weekStartISO(iso)
  const inWeek = (h.restDays ?? []).filter(
    (d) => d >= wk && d <= addDaysISO(wk, 6),
  )
  if (inWeek.length >= 1) return 'Maksimal satu hari jeda per pekan.'
  if (habitStreak(h, c, today) < 1)
    return 'Jeda tidak bisa memulai streak baru — selesaikan kebiasaan ini dulu.'
  return null
}

export function isoOf(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return isoOf(new Date())
}

/** v2.45 (audit): entropi ID — `Date.now()` telanjang beradu dalam
 *  milidetik yang sama (ketuk ganda, impor) → PK kembar menumbangkan
 *  `createMany` di snapshot sync. Tambahan acak pendek menuntaskannya. */
export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** v2.49 (audit): cermin nilai manual terbaru ke provenance habitAuto.
 *  Tanpa ini, centang manual yang dibuat SETELAH kontribusi otomatis
 *  kembali ke nilai basi saat workout penyumbang dihapus
 *  (reevaluateHabitAutoAfterDelete memulihkan `base` lama). Aturan:
 *  manual selalu menang — `true` → base=true (tak pernah diturunkan),
 *  angka N → base = N − Σ kontribusi workout yang masih hidup (model
 *  nilai hari = base + Σ sumber hidup), hapus → base=undefined. */
function mirrorManualToAuto(
  habitAuto: HabitAuto,
  habitId: string,
  dateISO: string,
  value: boolean | number | undefined,
  liveContribution: number,
): HabitAuto {
  const entry = habitAuto[habitId]?.[dateISO]
  if (!entry) return habitAuto
  let base: boolean | number | undefined
  if (value === undefined) base = undefined
  else if (value === true) base = true
  else if (typeof value === 'number')
    base = Math.max(0, Math.round((value - liveContribution) * 10) / 10)
  return {
    ...habitAuto,
    [habitId]: { ...habitAuto[habitId], [dateISO]: { ...entry, base } },
  }
}

/** Σ kontribusi workout yang MASIH ADA untuk satu entri habitAuto. */
function liveAutoContribution(
  habit: Habit | undefined,
  workouts: Workout[],
  entry: { wo: string[] } | undefined,
): number {
  if (!habit || !entry) return 0
  let sum = 0
  for (const wid of entry.wo) {
    const w = workouts.find((x) => x.id === wid)
    if (!w) continue
    const c = workoutContribution(habit, w)
    if (typeof c === 'number') sum += c
  }
  return sum
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDaysISO(iso: string, n: number): string {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return isoOf(d)
}

/** Tambah N bulan kalender (tanggal di-clamp ke akhir bulan bila perlu). */
export function addMonthsISO(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const base = new Date(y, m - 1 + n, 1)
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate()
  return isoOf(new Date(base.getFullYear(), base.getMonth(), Math.min(d ?? 1, lastDay)))
}

/** Label panjang bahasa Indonesia: "Senin, 16 Juni 2025". */
export function longDateLabel(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fromISO(iso))
}

/** Label ringkas: "Sen, 16 Jun". */
export function shortDateLabel(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(fromISO(iso))
}

/* --- Derivasi murni di atas Completions --- */

/** Apakah kebiasaan terjadwal pada tanggal tersebut (menghormati jadwal). */
export function scheduledOn(h: Habit, dateISO: string): boolean {
  if (h.archived) return false
  if (h.schedule.length === 0) return true
  return h.schedule.includes(fromISO(dateISO).getDay())
}

/** Apakah kebiasaan selesai pada tanggal tersebut. */
export function isDoneOn(
  c: Completions,
  dateISO: string,
  habitId: string,
): boolean {
  return c[dateISO]?.[habitId] === true
}

/** Daftar kebiasaan aktif yang terjadwal pada sebuah tanggal. */
export function habitsOn(habits: Habit[], dateISO: string): Habit[] {
  return habits.filter((h) => scheduledOn(h, dateISO))
}

/** Jumlah kebiasaan selesai pada sebuah tanggal — hanya nilai `true`
 *  (progres parsial kebiasaan terukur belum dihitung selesai). */
export function doneCountOn(c: Completions, dateISO: string): number {
  return Object.values(c[dateISO] ?? {}).filter((v) => v === true).length
}

/** Streak aktif sebuah kebiasaan — hari terjadwal berturut yang selesai,
 *  dihitung mundur dari hari ini. Hari ini yang belum selesai tidak
 *  memutus streak (grace hingga akhir hari). */
export function habitStreak(
  h: Habit,
  c: Completions,
  today: string,
): number {
  let streak = 0
  let cursor = today
  if (scheduledOn(h, cursor) && !isDoneOn(c, cursor, h.id)) {
    cursor = addDaysISO(cursor, -1)
  }
  for (let i = 0; i < 400; i++) {
    if (cursor < h.createdAt) break
    if (scheduledOn(h, cursor)) {
      if (isDoneOn(c, cursor, h.id)) {
        streak++
      } else if ((h.restDays ?? []).includes(cursor)) {
        /* Jeda Runtun Aman: hari jeda terjadwal tidak menambah streak
           dan tidak memutuskannya. Aturan "jeda tidak boleh memulai
           streak baru" dijaga saat penjadwalan (restDayError) — di
           sini hari jeda transparan terhadap perhitungan. */
      } else {
        break
      }
    }
    cursor = addDaysISO(cursor, -1)
  }
  return streak
}

/** Rekor streak terpanjang sebuah kebiasaan sepanjang histori. */
export function longestStreak(
  h: Habit,
  c: Completions,
  today: string,
): number {
  let best = 0
  let run = 0
  let cursor = today
  for (let i = 0; i < 400; i++) {
    if (cursor < h.createdAt) break
    if (scheduledOn(h, cursor)) {
      if (isDoneOn(c, cursor, h.id)) {
        run++
        best = Math.max(best, run)
      } else if ((h.restDays ?? []).includes(cursor)) {
        /* Jeda terjadwal menjembatani rekor tanpa menambah hitungan. */
      } else {
        run = 0
      }
    }
    cursor = addDaysISO(cursor, -1)
  }
  return best
}

/** Streak terpanjang & rekor dari seluruh kebiasaan aktif. */
export function bestStreak(
  habits: Habit[],
  c: Completions,
  today: string,
): { habit: Habit | null; streak: number; record: number } {
  let habit: Habit | null = null
  let streak = 0
  let record = 0
  for (const h of habits) {
    if (h.archived) continue
    const s = habitStreak(h, c, today)
    const l = longestStreak(h, c, today)
    if (s > streak) {
      streak = s
      habit = h
    }
    record = Math.max(record, l)
  }
  return { habit, streak, record }
}

export interface DayCount {
  date: string
  label: string
  count: number
}

/** Aktivitas N hari terakhir diakhiri hari ini (label = hari singkat). */
export function dayCounts(
  c: Completions,
  today: string,
  days: number,
): DayCount[] {
  const out: DayCount[] = []
  for (let i = days - 1; i >= 0; i--) {
    const iso = addDaysISO(today, -i)
    out.push({
      date: iso,
      label: WEEKDAY_MIN[fromISO(iso).getDay()],
      count: doneCountOn(c, iso),
    })
  }
  return out
}

/** Agregat empat pekan terakhir (P1 terlama → P4 pekan berjalan). */
export function weekCounts(
  c: Completions,
  today: string,
): { label: string; value: number }[] {
  const out: { label: string; value: number }[] = []
  for (let w = 3; w >= 0; w--) {
    let sum = 0
    for (let d = 0; d < 7; d++) {
      sum += doneCountOn(c, addDaysISO(today, -(w * 7 + d)))
    }
    out.push({ label: `P${4 - w}`, value: sum })
  }
  return out
}

/* --- Metrik sadar-jadwal (audit visualisasi v2.36, Tahap 1) ---
   Jumlah kebiasaan selesai ≠ tingkat konsistensi: hari dengan 2/2
   kebiasaan selesai tidak boleh tampak lebih redup dari hari 4/6.
   Semua fungsi murni (aman SSR & unit test); hari jeda (rest day)
   diampuni — keluar dari penyebut, bukan dihitung sebagai kegagalan. */

export interface DaySchedule {
  date: string
  label: string
  /** Kebiasaan yang harus dikerjakan hari itu (hormati createdAt & arsip;
   *  hari jeda diampuni — keluar dari penyebut). */
  scheduled: number
  /** Selesai dari yang terjadwal. */
  done: number
  /** Hari jeda yang dipakai pada hari itu (terjadwal tapi diampuni). */
  rest: number
  /** done/scheduled × 100 — NULL bila tak ada jadwal (bukan 0%!). */
  pct: number | null
}

/** Kepatuhan SATU hari — SATU sumber kebenaran untuk seluruh permukaan:
 *  daySchedules (heatmap & KPI Statistik), konstelasi Statistik, dan
 *  sulur pekan Kebiasaan (audit v2.47 #13: rumus per-hari yang sama
 *  tidak boleh ditulis tiga kali). Pool = terjadwal (arsip dihormati)
 *  ∧ sudah diciptakan (createdAt ≤ hari); hari jeda terjadwal diampuni
 *  — keluar dari penyebut, bukan dihitung gagal. */
export interface DayCompliance {
  /** Kebiasaan yang harus dikerjakan hari itu (terjadwal, non-jeda). */
  due: number
  /** Selesai dari yang harus dikerjakan. */
  done: number
  /** Terjadwal tapi diampuni (hari jeda). */
  rest: number
  /** done/due × 100 — null bila tak ada yang terjadwal (bukan 0%!). */
  pct: number | null
}

export function dayCompliance(
  habits: Habit[],
  c: Completions,
  iso: string,
): DayCompliance {
  const pool = habits.filter(
    (h) => scheduledOn(h, iso) && h.createdAt <= iso,
  )
  const forgiven = new Set(
    pool.filter((h) => (h.restDays ?? []).includes(iso)).map((h) => h.id),
  )
  const due = pool.filter((h) => !forgiven.has(h.id))
  const done = due.filter((h) => isDoneOn(c, iso, h.id)).length
  return {
    due: due.length,
    done,
    rest: forgiven.size,
    pct: due.length === 0 ? null : Math.round((done / due.length) * 100),
  }
}

/** Statistik jadwal per hari, N hari terakhir diakhiri hari ini. */
export function daySchedules(
  habits: Habit[],
  c: Completions,
  today: string,
  days: number,
): DaySchedule[] {
  const out: DaySchedule[] = []
  for (let i = days - 1; i >= 0; i--) {
    const iso = addDaysISO(today, -i)
    const dc = dayCompliance(habits, c, iso)
    out.push({
      date: iso,
      label: WEEKDAY_MIN[fromISO(iso).getDay()],
      scheduled: dc.due,
      done: dc.done,
      rest: dc.rest,
      pct: dc.pct,
    })
  }
  return out
}

/** Status satu kebiasaan pada satu tanggal — dasar riwayat 30 hari yang
 *  jujur: hari tanpa jadwal, hari jeda, dan hari masa depan tampil BERBEDA
 *  dari kegagalan, sehingga pengguna tidak merasa gagal pada hari yang
 *  memang tidak dijadwalkan. */
export type HabitDayStatus =
  | 'done'
  | 'missed'
  | 'rest'
  | 'unscheduled'
  | 'future'
  /** v2.45 (audit): HARI INI terjadwal tapi belum selesai — hari masih
   *  berjalan; menghitungnya "terlewat" di 08.00 pagi adalah data bohong. */
  | 'pending'

export function habitStatusOn(
  h: Habit,
  c: Completions,
  iso: string,
  today: string = todayISO(),
): HabitDayStatus {
  if (iso > today) return 'future'
  if (!scheduledOn(h, iso) || iso < h.createdAt) return 'unscheduled'
  if ((h.restDays ?? []).includes(iso)) return 'rest'
  if (isDoneOn(c, iso, h.id)) return 'done'
  /* Hari berjalan belum terlewat — vonis menunggu sampai tengah malam. */
  if (iso === today) return 'pending'
  return 'missed'
}

export interface HabitWeekRate {
  /** Senin pekan itu. */
  start: string
  scheduled: number
  done: number
  /** done/scheduled × 100 — null bila pekan itu tak ada jadwal. */
  pct: number | null
}

/** Persentase penyelesaian per pekan untuk SATU kebiasaan — N pekan
 *  terakhir, terlama dulu. Pekan berjalan dihitung sampai hari ini saja
 *  (hari masa depan tidak dihitung). Sadar jadwal + hari jeda. */
export function habitWeeklyRates(
  h: Habit,
  c: Completions,
  today: string,
  weeks = 4,
): HabitWeekRate[] {
  const out: HabitWeekRate[] = []
  for (let w = weeks - 1; w >= 0; w--) {
    const start = weekStartISO(addDaysISO(today, -w * 7))
    let scheduled = 0
    let done = 0
    for (let d = 0; d < 7; d++) {
      const iso = addDaysISO(start, d)
      if (iso > today) break
      if (!scheduledOn(h, iso) || iso < h.createdAt) continue
      if ((h.restDays ?? []).includes(iso)) continue
      scheduled++
      if (isDoneOn(c, iso, h.id)) done++
    }
    out.push({
      start,
      scheduled,
      done,
      pct: scheduled === 0 ? null : Math.round((done / scheduled) * 100),
    })
  }
  return out
}

/** Tanggal aktivitas terawal dari histori (untuk "aktif sejak"). */
export function activeSinceISO(c: Completions): string | null {
  const dates = Object.keys(c).sort()
  return dates[0] ?? null
}

/* ===== Domain Keuangan ===== */

/** Transfer antar-dompet: uang berpindah, BUKAN pemasukan/pengeluaran —
 *  dikecualikan dari seluruh statistik arus kas & anggaran. */
export type TxType = 'masuk' | 'keluar' | 'transfer'

/** Kategori transaksi. 11 pertama adalah set bawaan 2.0; blok kedua
 *  (v2.15) adalah kategori hasil IMPOR dari Rutina 1.0 — daftar asli
 *  dibaca dari database Turso lama (lihat scripts/import-rutina1.ts,
 *  CAT_MAP). Nama lama dipertahankan sebagai id (slug) sehingga
 *  transaksi lama tidak lagi dilipat menjadi kategori umum: "Kopi"
 *  tetap "kopi", bukan "makan". */
export type FinCat =
  | 'makan'
  | 'transport'
  | 'belanja'
  | 'hiburan'
  | 'tagihan'
  | 'kesehatan'
  | 'lainnya'
  | 'gaji'
  | 'bonus'
  | 'proyek'
  | 'transfer'
  /* ===== Impor Rutina 1.0 (Turso) — v2.15 ===== */
  | 'kopi'
  | 'makanan-berat'
  | 'jajan'
  | 'cathering'
  | 'bensin'
  | 'parkir'
  | 'pajak-motor'
  | 'servis-motor'
  | 'loundry'
  | 'dating'
  | 'badminton'
  | 'tagihan-utilitas'
  | 'tagihan-air'
  | 'tagihan-listrik'
  | 'pulsa-data'
  | 'skin-care'
  | 'potong-rambut'
  | 'hutang'
  | 'iuran-kas'
  | 'tak-terduga'
  | 'pendidikan'
  | 'lifestyle'
  | 'investasi'
  | 'penghasilan'

export type FinPeriod = 'minggu' | 'bulan' | 'tahun'

/* ===== Preferensi UI lintas-layar (v2.13) =====
   Tab sub, periode grafik, dan filter yang penting diinguat saat
   pengguna berpindah layar — komponen layar dilepas oleh AnimatePresence
   sehingga useState lokal hilang. Disimpan di store (bukan useState)
   dan dipersist ke localStorage, namun TIDAK ikut disinkronkan ke
   server: ini preferensi perangkat, bukan data domain (lihat
   DOMAIN_KEYS di sync-engine). */
export type BugarTab = 'latihan' | 'asupan' | 'tubuh'
export type FinTab = 'ringkasan' | 'mutasi' | 'anggaran' | 'dompet'
export type ChartPeriod = FinPeriod | 'semua'
export type MutasiFilter = TxType | 'semua'
export type StatsPeriod = 'pekan' | 'bulan'
/** Filter riwayat aktivitas Bugar — jenis latihan (v2.17). */
export type WoFilter = 'semua' | 'kardio' | 'badminton' | 'beban'
/** Rentang tanggal riwayat aktivitas Bugar (v2.17). */
export type WoRange = '30' | '90' | 'semua'
/** Ruang aktif layar Kebiasaan (v2.77) — tab konten sungguhan, bukan
 *  navigasi gulir: hanya satu ruang kerja tampil dalam satu waktu. */
export type KebiasaanRoom = 'agenda' | 'konsistensi' | 'perpustakaan'
/** Visualisasi utama ruang Konsistensi (v2.78) — sulur pekan, peta
 *  panas, atau taman; satu visualisasi besar pada satu waktu. */
export type KonsistensiViz = 'sulur' | 'panas' | 'taman'
/** Pandangan aktif layar Statistik (v2.77) — empat tampilan yang
 *  mengganti konten: Ringkasan, Tren, Kalender, Wawasan. */
export type StatsView = 'ringkasan' | 'tren' | 'kalender' | 'wawasan'

export interface UiPrefs {
  /** Subtab aktif layar Bugar. */
  bugarTab: BugarTab
  /** Tab aktif layar Keuangan. */
  finTab: FinTab
  /** Periode grafik arus kas (termasuk mode "semua" yang hanya lokal). */
  chartPeriod: ChartPeriod
  /** Filter daftar mutasi Keuangan. */
  mutasiFilter: MutasiFilter
  /** Periode ringkasan layar Statistik. */
  statsPeriod: StatsPeriod
  /** Ruang aktif layar Kebiasaan (v2.77) — bertahan antar perpindahan
   *  layar; pengguna kembali ke ruang terakhir yang dibukanya. */
  kebiasaanRoom: KebiasaanRoom
  /** Visualisasi utama ruang Konsistensi (v2.78). */
  konsistensiViz: KonsistensiViz
  /** Pandangan aktif layar Statistik (v2.77) — bertahan antar
   *  perpindahan layar. */
  statsView: StatsView
  /** Filter jenis riwayat aktivitas Bugar (v2.17). */
  woFilter: WoFilter
  /** Rentang tanggal riwayat aktivitas Bugar (v2.17). */
  woRange: WoRange
  /** Tanggal terakhir perayaan "Naik ke Level 8" di-rayakan (v2.42) —
   *  mencegah konfeti replay setiap reload pada hari yang sama. */
  celebratedOn?: string
  /** v2.49 (audit): tanggal terakhir perayaan "Semua misi selesai" —
   *  HomeScreen unmount tiap ganti tab, jadi ref instance BUKAN tempat
   *  menyimpan penanda (perayaan + toast replay tiap kunjungan ulang
   *  Beranda pada hari sempurna; pola celebratedOn level-8). */
  missionCelebratedOn?: string
}


/** Jadwal transaksi berulang — salinan berikutnya tercatat otomatis
 *  saat jadwalnya tiba (materializeRecurring). */
export type Recurrence = 'mingguan' | 'bulanan'

export interface Tx {
  id: string
  type: TxType
  /** Slug kategori — FinCat bawaan atau id kategori buatan (v2.17). */
  cat: string
  amount: number
  note: string
  /** Tanggal ISO (yyyy-mm-dd) — dasar pengelompokan grafik & filter. */
  ts: string
  /** Dompet sumber (keluar/transfer) atau tujuan masuk. */
  walletId?: string
  /** Dompet tujuan — khusus transfer. */
  toWalletId?: string
  /** Jadwal berulang — khusus templat asli. */
  recurrence?: Recurrence | null
  /** ID templat asal — salinan otomatis transaksi berulang. */
  recurOf?: string
}

/** Kategori keuangan buatan pengguna (v2.17) — satu daftar terpadu
 *  bersama kategori bawaan + impor Rutina 1.0. v2.18: FLAT — tanpa
 *  subkategori, kategori saja cukup. */
export interface CustomCat {
  id: string
  name: string
  type: TxType
}

/** Sumber dana / dompet — saldo dihitung dari saldo awal + mutasi. */
export interface Wallet {
  id: string
  name: string
  /** Saldo awal saat dompet dibuat (Rp). */
  initial: number
}

/** Anggaran bulanan per kategori pengeluaran (Rp) — dapat diubah pengguna. */
export type Budgets = Record<string, number>

export const DEFAULT_BUDGETS: Budgets = {
  makan: 750_000,
  transport: 400_000,
  belanja: 800_000,
  hiburan: 300_000,
  tagihan: 1_000_000,
  kesehatan: 200_000,
}

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
  /** v2.45 (review Tahap 2): log kontribusi nyata — dasar "N kali
   *  menabung" + riwayat bulanan di lembar kontribusi. Opsional demi
   *  kompatibilitas data lama (entri lama: belum ada log). */
  contributions?: { ts: string; amount: number }[]
}

/* ===== Domain Bugar — latihan beban & kardio (dari Rutina v3) ===== */

export type WorkoutKind =
  | 'beban'
  | 'jalan'
  | 'lari'
  | 'lari-jalan'
  | 'badminton'

/** Label tampilan jenis aktivitas — dipakai toast otomatisasi habit. */
export const WORKOUT_KIND_LABEL: Record<WorkoutKind, string> = {
  beban: 'Barbel',
  jalan: 'Jalan',
  lari: 'Lari',
  'lari-jalan': 'Lari + Jalan',
  badminton: 'Badminton',
}

export interface WorkoutSet {
  /** Nama gerakan — merujuk EX_LIB di fitness/data.ts. */
  exercise: string
  /** Beban dalam kg. */
  weight: number
  reps: number
}

export interface Workout {
  id: string
  kind: WorkoutKind
  /** Tanggal sesi (ISO yyyy-mm-dd). */
  date: string
  /** Durasi dalam menit. */
  duration: number
  note: string
  /** Rincian set — khusus kind 'beban'. */
  sets: WorkoutSet[]
  /** Jarak dalam km — khusus kardio (jalan/lari/lari-jalan). */
  distance?: number
  /** Kalori dari smartwatch (opsional) — angka pengguna, bukan
   *  klaim pengukuran Rutina; kosong = estimasi MET (v2.17). */
  kcal?: number
}

export interface WorkoutInput {
  kind: WorkoutKind
  date: string
  duration: number
  note: string
  sets: WorkoutSet[]
  distance?: number
  kcal?: number
}

/** Praisai lembar sesi: gerakan + target set & repetisi (dari program
 *  atau pustaka) — beban tetap diisi pengguna / diambil dari histori. */
export interface WorkoutSeed {
  name: string
  count: number
  reps: number
}

/** Petunjuk mode awal lembar Catat Aktivitas (v2.18) — dipakai tombol
 *  pintasan di tab Bugar ("Lari", "Jalan", "Badminton", "Barbel")
 *  agar template yang tepat terbuka SEKETIKA, tanpa pengguna harus
 *  mencari saklar mode di dalam lembar. */
export interface WorkoutSheetHint {
  mode?: 'beban' | 'kardio' | 'badminton'
  /** Jenis kardio pra-pilih (jalan|lari|lari-jalan) — hanya mode kardio. */
  cardioKind?: 'jalan' | 'lari' | 'lari-jalan'
}

/* ===== Domain Bugar — asupan makan (master 179 item Indonesia) ===== */

export type MealSlot = 'sarapan' | 'makan siang' | 'makan malam' | 'camilan'

export const MEAL_SLOTS: { key: MealSlot; label: string }[] = [
  { key: 'sarapan', label: 'Sarapan' },
  { key: 'makan siang', label: 'Makan Siang' },
  { key: 'makan malam', label: 'Makan Malam' },
  { key: 'camilan', label: 'Camilan' },
]

export interface FoodEntry {
  id: string
  /** Tanggal konsumsi (ISO yyyy-mm-dd). */
  date: string
  name: string
  /** Nama kategori master (tampilan). */
  cat: string
  /** Satuan porsi master, mis. "1 piring". */
  unit: string
  /** Pengali porsi dari satuan master (1 = persis satu satuan). */
  portion: number
  meal: MealSlot
  /** Kalori untuk porsi terpilih (dihitung saat ditambahkan). */
  kcal: number
  /** Gram makro untuk porsi terpilih — null bila master tak punya data. */
  protein: number | null
  carb: number | null
  fat: number | null
}

export interface FoodEntryInput {
  date: string
  name: string
  cat: string
  unit: string
  portion: number
  meal: MealSlot
  kcal: number
  protein: number | null
  carb: number | null
  fat: number | null
}

/* ===== Domain Bugar — tubuh & pemeliharaan ===== */

/** Sasaran bugar lengkap (v2.22) — delapan target musim, dipakai tab
 *  Tubuh (kartu Sasaran), Asupan (target makro), dan Latihan (menit/pekan). */
export interface FitTargets {
  /** Menit gerak per pekan. */
  minutes: number
  /** Sesi latihan per pekan. */
  sessions: number
  /** Gelas air per hari. */
  water: number
  /** Target makro harian — gram. */
  protein: number
  carb: number
  fat: number
  /** Berat tujuan (kg) — 0 = belum ditetapkan. */
  weightGoal: number
  /** Tinggi badan (cm) — dasar BMI; 0 = belum diisi. */
  heightCm: number
}

export const FIT_TARGETS_DEFAULT: FitTargets = {
  minutes: 150,
  sessions: 3,
  water: 8,
  protein: 110,
  carb: 250,
  fat: 60,
  weightGoal: 0,
  heightCm: 0,
}

/** Satu catatan tubuh per tanggal (UPSERT harian) — hidrasi, berat,
 *  tidur & energi jadi satu sumber kebenaran untuk kesiapan latihan. */
export interface BodyLog {
  /** Jumlah gelas air hari itu. */
  water: number
  /** Berat badan (kg) bila diukur hari itu. */
  weight?: number
  /** Jam tidur semalam. */
  sleepH?: number
  /** Energi 1–5 (1 = sangat lelah, 5 = bugar). */
  energy?: number
  /** DOMS / nyeri otot 1–5 (1 = tidak nyeri, 5 = sangat nyeri). */
  soreness?: number
  /** Tingkat stres 1–5 (1 = tenang, 5 = sangat stres). */
  stress?: number
}

/** Log tubuh per tanggal ISO — selaras pola Completions. */
export type BodyLogs = Record<string, BodyLog>

/** "Hari ini" finansial — SELALU tanggal nyata saat transaksi dibuat.
 *  (Sebelumnya konstanta demo 2025-06-20 yang membuat data baru berjarak
 *  berbulan-bulan dari hari aktual; lihat finance/utils.ts untuk jendela
 *  periode yang kini juga dihitung relatif terhadap hari ini.) */
export function todayFinISO(): string {
  return todayISO()
}

/* ===== Tema layar — "Ruang Warna" (v2.5) =====
   Tiap layar adalah kamar dengan karakter sendiri: kanvas bernuansa warna
   domain (sangat halus, ~3-5% tint di atas Warm Sand) + tiga cahaya ambien
   yang ikut berganti per tab. Pergantian kanvas dianimasikan shell
   (rutina-app) sehingga pindah tab terasa seperti berpindah ruangan —
   bukan berganti aplikasi.

   Pemetaan identitas:
     beranda   · Matcha (jangkar merek — warna interaksi global)
     bugar     · Eucalyptus Teal   keuangan · Antique Bronze
     kebiasaan · Rose Clay (tanah pot kebun) statistik · Mineral Slate
     jurnal    · Dusty Mauve       profil    · Cocoa Gold

   Kanvas gelap = espresso #1C1817 diberi tint domain setipis 2-4% agar
   tetap tenang; cahaya ambien memakai base domain versi terang. */

export interface ScreenTheme {
  /** Warna kanvas utama — mode terang. */
  bg: string
  /** Warna kanvas utama — mode gelap. */
  bgDark: string
  /** Tiga cahaya ambien (kiri-atas · kanan-bawah · tengah) — mode terang. */
  glow: readonly [string, string, string]
  /** Tiga cahaya ambien — mode gelap. */
  glowDark: readonly [string, string, string]
}

export const SCREEN_THEME: Record<Screen, ScreenTheme> = {
  beranda: {
    bg: '#F5F3EE',
    bgDark: '#1C1817',
    glow: ['rgba(228,239,224,0.55)', 'rgba(116,155,88,0.08)', 'rgba(234,229,217,0.45)'],
    glowDark: ['rgba(163,196,137,0.07)', 'rgba(163,196,137,0.05)', 'rgba(58,46,36,0.5)'],
  },
  bugar: {
    bg: '#EEF3F0',
    bgDark: '#1A1E1C',
    glow: ['rgba(228,239,235,0.6)', 'rgba(95,138,130,0.12)', 'rgba(143,184,175,0.1)'],
    glowDark: ['rgba(143,184,175,0.07)', 'rgba(95,138,130,0.09)', 'rgba(40,50,48,0.55)'],
  },
  keuangan: {
    bg: '#F4F0E7',
    bgDark: '#1E1B16',
    glow: ['rgba(241,231,215,0.6)', 'rgba(172,129,72,0.12)', 'rgba(217,185,140,0.14)'],
    glowDark: ['rgba(201,160,106,0.07)', 'rgba(172,129,72,0.09)', 'rgba(52,45,36,0.55)'],
  },
  kebiasaan: {
    bg: '#F6F0EB',
    bgDark: '#211B17',
    glow: ['rgba(246,233,227,0.6)', 'rgba(176,118,95,0.12)', 'rgba(217,142,107,0.12)'],
    glowDark: ['rgba(207,155,133,0.07)', 'rgba(176,118,95,0.09)', 'rgba(51,39,35,0.55)'],
  },
  statistik: {
    bg: '#F0F2F4',
    bgDark: '#1A1C1E',
    glow: ['rgba(231,238,242,0.6)', 'rgba(113,137,154,0.12)', 'rgba(155,201,214,0.1)'],
    glowDark: ['rgba(155,175,192,0.07)', 'rgba(113,137,154,0.09)', 'rgba(42,49,56,0.55)'],
  },
  jurnal: {
    bg: '#F3F1F3',
    bgDark: '#1E1A1E',
    glow: ['rgba(238,232,239,0.6)', 'rgba(140,122,145,0.12)', 'rgba(198,185,202,0.12)'],
    glowDark: ['rgba(173,157,177,0.07)', 'rgba(140,122,145,0.09)', 'rgba(49,44,54,0.55)'],
  },
  profil: {
    bg: '#F2EEE7',
    bgDark: '#1B1714',
    glow: ['rgba(242,235,226,0.6)', 'rgba(151,121,94,0.12)', 'rgba(217,185,140,0.12)'],
    glowDark: ['rgba(191,169,141,0.07)', 'rgba(151,121,94,0.09)', 'rgba(46,40,34,0.55)'],
  },
}

/* ===== Store ===== */

export type HabitSheetMode = 'closed' | 'create' | 'edit'

interface RutinaState {
  screen: Screen
  prevScreen: Screen
  journalFilter: FolderKey | 'semua'
  composeOpen: boolean
  composeFolder: FolderKey
  /* Kebiasaan & histori */
  habits: Habit[]
  completions: Completions
  /** Provenance penyelesaian otomatis dari aktivitas Bugar (audit
   *  v2.37 §4D) — lihat HabitAuto. */
  habitAuto: HabitAuto
  /** Kelompok kebiasaan custom (v2.22) — mis. "Pagi", "Gym". */
  habitGroups: HabitGroup[]
  /** Tanggal yang sedang dilihat di kalender Beranda (ISO). */
  selectedDate: string
  habitSheetMode: HabitSheetMode
  habitSheetId: string | null
  notes: Note[]
  quoteSaved: boolean
  /** Tanggal ISO kutipan terakhir yang disimpan — kutipan harian boleh
   *  disimpan ulang setiap ganti hari. */
  quoteSavedDate: string | null
  /** Berapa kali pengguna menekan "Ganti" pada refleksi hari ini — kutipan
   *  yang tampil = dailyQuote + offset (v2.14: refleksi bisa diganti-ganti). */
  quoteOffset: number
  /** Tanggal ISO terakhir pengguna mengganti refleksi — offset hanya berlaku
   *  pada hari yang sama; hari baru kembali ke kutipan harian default. */
  quoteDate: string | null
  mood: string | null
  /** Riwayat mood per tanggal ISO — histori wellness jujur seperti
   *  DailyLog Rutina lama (mood tetap tercermin di state `mood`). */
  moodLogs: Record<string, string>
  /** Suara Identitas — teks identitas personal (filosofi Atomic Habits). */
  identityText: string
  /** Batas akhir deload (ISO) — null bila sedang tidak deload. */
  deloadUntil: string | null
  expandedTaskId: string | null
  readingNoteId: string | null
  celebrating: boolean
  /** Tanggal (ISO) bonus harian terakhir diklaim — null bila belum.
   *  v2.45: ber-tanggal (pola celebratedOn) agar reset tiap ganti hari;
   *  boolean lama menempel selamanya sehingga bonus cuma bisa diklaim
   *  sekali seumur hidup. */
  bonusClaimedOn: string | null
  dailyGoal: number
  /* Keuangan */
  txs: Tx[]
  goals: Goal[]
  wallets: Wallet[]
  budgets: Budgets
  /** Kategori buatan pengguna — satu daftar terpadu (v2.17). */
  customCats: CustomCat[]
  /** Ganti nama kategori bawaan — slug → label tampilan (v2.22).
   *  Menular ke seluruh tampilan tanpa menyentuh data transaksi. */
  catRenames: Record<string, string>
  /** Kategori bawaan yang disembunyikan dari pemilih (v2.22) — histori
   *  transaksinya tetap utuh. */
  hiddenCats: string[]
  finPeriod: FinPeriod
  txSheetOpen: boolean
  /** ID transaksi yang sedang disunting (v2.22) — null = mode tambah. */
  txEditId: string | null
  transferSheetOpen: boolean
  walletDialogOpen: boolean
  /** ID dompet yang sedang disunting di dialog (v2.22) — null = tambah. */
  walletEditId: string | null
  /** Lembar kelola kategori terbuka (v2.22). */
  catManageOpen: boolean
  /** Drill-down keuangan terbuka: kategori / dompet (v2.22). */
  finDrill: { kind: 'cat' | 'wallet'; id: string } | null
  goalSheetId: string | null
  goalDialogOpen: boolean
  expandedTxId: string | null
  /* Bugar */
  workouts: Workout[]
  workoutSheetOpen: boolean
  /** Praisai lembar sesi saat dibuka dari program/pustaka. */
  workoutSheetSeed: WorkoutSeed[] | null
  /** Petunjuk mode awal lembar aktivitas — lihat WorkoutSheetHint (v2.18). */
  workoutSheetHint: WorkoutSheetHint | null
  /* Bugar — asupan */
  foodEntries: FoodEntry[]
  foodSheetOpen: boolean
  /** Target energi harian (kkal) — dasar neraca kalori. */
  calorieTarget: number
  /* Bugar — tubuh */
  bodyLogs: BodyLogs
  /** Sasaran bugar lengkap — delapan target musim (v2.22). */
  fitTargets: FitTargets
  /* Papan sistem desain — overlay spesifikasi visual (UI state, tak dipersist) */
  boardOpen: boolean
  openBoard: () => void
  closeBoard: () => void
  setScreen: (screen: Screen) => void
  setFinPeriod: (p: FinPeriod) => void
  /* Preferensi UI lintas-layar — dipersist lokal, tak disinkronkan */
  uiPrefs: UiPrefs
  setUiPref: (patch: Partial<UiPrefs>) => void
  openTxSheet: () => void
  closeTxSheet: () => void
  /** Buka lembar transaksi dalam MODE SUNTING (v2.22) — lembar terisi
   *  nilai transaksi lama; simpan memperbarui baris yang sama. */
  openTxEdit: (id: string) => void
  addTx: (input: {
    type: TxType
    cat: string
    amount: number
    note: string
    walletId?: string
    recurrence?: Recurrence | null
    /** Tanggal transaksi (yyyy-mm-dd) — v2.42: lupa mencatat kemarin
     *  tinggal pilih tanggalnya; kosong = hari ini. */
    date?: string
  }) => void
  /** Perbarui transaksi yang sudah ada (v2.22) — sunting kategori,
   *  nominal, catatan, dompet, arus, jadwal berulang, dan tanggal
   *  (v2.42 — tx lama yang salah tanggal bisa dipindah). */
  updateTx: (
    id: string,
    patch: {
      type?: TxType
      cat?: string
      amount?: number
      note?: string
      walletId?: string
      recurrence?: Recurrence | null
      ts?: string
    },
  ) => void
  deleteTx: (id: string) => void
  toggleExpandedTx: (id: string) => void
  /* Kategori buatan — satu sistem kategori terpadu (v2.17) */
  addCustomCat: (input: {
    name: string
    type: TxType
  }) => CustomCat | null
  removeCustomCat: (id: string) => void
  /* Kelola kategori (v2.22): ganti nama bawaan menular ke tampilan,
   *  sembunyikan dari pemilih, hapus kategori buatan (transaksinya
   *  dipindahkan ke "lainnya"). */
  renameCat: (slug: string, newName: string) => void
  hideCat: (slug: string) => void
  unhideCat: (slug: string) => void
  deleteCustomCat: (id: string) => void
  openCatManage: () => void
  closeCatManage: () => void
  /* Drill-down keuangan (v2.22). */
  openFinDrill: (kind: 'cat' | 'wallet', id: string) => void
  closeFinDrill: () => void
  /* Dompet & transfer */
  addWallet: (name: string, initial: number) => void
  /** Sunting dompet yang sudah ada (v2.22) — nama & saldo awal. */
  updateWallet: (id: string, patch: { name?: string; initial?: number }) => void
  /** Hapus dompet (v2.22) — transaksi terkait kehilangan tautan dompet
   *  (tetap ada, menjadi "tanpa dompet"); saldo total menyesuaikan. */
  deleteWallet: (id: string) => void
  openTransferSheet: () => void
  closeTransferSheet: () => void
  addTransfer: (input: {
    fromId: string
    toId: string
    amount: number
    note: string
    /** Tanggal transfer (yyyy-mm-dd) — v2.42; kosong = hari ini. */
    date?: string
  }) => void
  openWalletDialog: () => void
  openWalletEdit: (id: string) => void
  closeWalletDialog: () => void
  /* Anggaran */
  setBudget: (cat: string, limit: number) => void
  removeBudget: (cat: string) => void
  /* Transaksi berulang */
  materializeRecurring: () => void
  openGoalSheet: (id: string) => void
  closeGoalSheet: () => void
  contributeGoal: (id: string, amount: number) => void
  openGoalDialog: () => void
  closeGoalDialog: () => void
  addGoal: (name: string, target: number) => void
  /** Sunting tujuan tabungan (audit CRUD v2.26) — nama/target bisa
   *  diubah kapan pun; tabungan terkumpul tetap utuh. */
  goalEditId: string | null
  openGoalEdit: (id: string) => void
  closeGoalEdit: () => void
  updateGoal: (id: string, patch: { name?: string; target?: number }) => void
  /** Hapus tujuan (audit CRUD v2.26) — konfirmasi ada di UI (AlertDialog). */
  deleteGoal: (id: string) => void
  /* Aksi bugar */
  openWorkoutSheet: (seed?: WorkoutSeed[], hint?: WorkoutSheetHint) => void
  closeWorkoutSheet: () => void
  addWorkout: (input: WorkoutInput) => void
  deleteWorkout: (id: string) => void
  /* Aksi asupan */
  openFoodSheet: () => void
  closeFoodSheet: () => void
  addFoodEntry: (input: FoodEntryInput) => void
  deleteFoodEntry: (id: string) => void
  setCalorieTarget: (n: number) => void
  /* Aksi tubuh */
  setWaterToday: (delta: number) => void
  logWeightToday: (kg: number) => void
  logBodyCheckIn: (input: {
    sleepH?: number
    energy?: number
    soreness?: number
    stress?: number
  }) => void
  /** Perbarui sasaran bugar (v2.22) — patch dangkal atas FitTargets. */
  setFitTargets: (patch: Partial<FitTargets>) => void
  setJournalFilter: (filter: FolderKey | 'semua') => void
  openCompose: (folder?: FolderKey) => void
  closeCompose: () => void
  /* Aksi kebiasaan */
  setSelectedDate: (iso: string) => void
  toggleHabit: (id: string, dateISO: string) => void
  /** Set progres terukur kebiasaan (v2.22): mencapai target → tercatat
   *  selesai penuh (true); di bawahnya → angka parsial; 0 → hapus catatan. */
  setHabitValue: (id: string, dateISO: string, value: number) => void
  addHabit: (input: HabitInput) => void
  updateHabit: (id: string, patch: Partial<HabitInput>) => void
  setHabitArchived: (id: string, archived: boolean) => void
  deleteHabit: (id: string) => void
  openHabitCreate: () => void
  openHabitEdit: (id: string) => void
  closeHabitSheet: () => void
  /* Kelompok kebiasaan custom (v2.22). */
  addHabitGroup: (name: string, color: string) => HabitGroup | null
  deleteHabitGroup: (id: string) => void
  /** Ganti nama/warna kelompok (audit CRUD v2.26) — anggota tetap
   *  terhubung; nama duplikat ditolak (pola addHabitGroup). */
  renameHabitGroup: (
    id: string,
    name: string,
    color: string,
  ) => { ok: boolean; error?: string }
  /* Jeda Runtun Aman (streak freeze) */
  scheduleRestDay: (
    id: string,
    iso: string,
  ) => { ok: boolean; error?: string }
  cancelRestDay: (id: string, iso: string) => void
  /* Suara Identitas & deload */
  setIdentityText: (text: string) => void
  startDeload: (days: number) => void
  endDeload: () => void
  addNote: (input: { title: string; body: string; folder: FolderKey }) => void
  togglePin: (id: string) => void
  deleteNote: (id: string) => void
  saveQuote: () => void
  /** Ganti kutipan refleksi hari ini ke pilihan berikutnya (bergilir). */
  cycleQuote: () => void
  /** Kutipan refleksi yang sedang tampil (sadar offset & pergantian hari). */
  currentQuote: () => { text: string; author: string }
  setMood: (mood: string | null) => void
  toggleExpandedTask: (id: string) => void
  openReading: (id: string) => void
  closeReading: () => void
  setCelebrating: (v: boolean) => void
  claimBonus: () => void
  setDailyGoal: (n: number) => void
  /* Aksi data — reset penuh (Zona Bahaya Profil) */
  startFresh: () => void
}

/* ===== Nilai pabrik slice domain ===== */

/** Slice domain yang di-reset "Mulai dari awal" — persis seluruh kunci
 *  DOMAIN_KEYS (sync-engine.ts) yang dipush ke cloud; tipe Pick menjaga
 *  daftar reset selalu sejalan dengan deklarasi state. */
type DomainSlice = Pick<
  RutinaState,
  | 'habits'
  | 'completions'
  | 'habitAuto'
  | 'habitGroups'
  | 'notes'
  | 'txs'
  | 'goals'
  | 'wallets'
  | 'budgets'
  | 'customCats'
  | 'catRenames'
  | 'hiddenCats'
  | 'workouts'
  | 'foodEntries'
  | 'calorieTarget'
  | 'bodyLogs'
  | 'fitTargets'
  | 'dailyGoal'
  | 'mood'
  | 'moodLogs'
  | 'identityText'
  | 'deloadUntil'
  | 'bonusClaimedOn'
  | 'quoteSaved'
  | 'quoteSavedDate'
>

/** Nilai pabrik SELURUH slice domain — satu sumber kebenaran bagi seed
 *  create() dan reset startFresh, sehingga janji "hapus semua data
 *  permanen" benar-benar kembali ke keadaan awal (data sensitif — berat
 *  badan, mood, latihan, dompet — tidak boleh lolos dari reset).
 *  Fungsi, bukan konstanta, agar array/objek tiap pemanggil segar dan
 *  tidak berbagi referensi dengan state hidup. */
function initialDomainState(): DomainSlice {
  return {
    habits: [],
    completions: {},
    habitAuto: {},
    habitGroups: [],
    notes: [],
    txs: [],
    goals: [],
    wallets: [],
    budgets: { ...DEFAULT_BUDGETS },
    customCats: [],
    catRenames: {},
    hiddenCats: [],
    workouts: [],
    foodEntries: [],
    calorieTarget: 2000,
    bodyLogs: {},
    fitTargets: { ...FIT_TARGETS_DEFAULT },
    dailyGoal: 4,
    mood: null,
    moodLogs: {},
    identityText: '',
    deloadUntil: null,
    bonusClaimedOn: null,
    quoteSaved: false,
    quoteSavedDate: null,
  }
}

export const useRutina = create<RutinaState>()(
  persist(
    (set, get) => ({
  screen: 'beranda',
  prevScreen: 'beranda',
  journalFilter: 'semua',
  composeOpen: false,
  composeFolder: 'pribadi',
  /* Seluruh slice domain lahir dari SATU sumber kebenaran
     (initialDomainState) — seed awal & reset startFresh tak mungkin
     berbeda satu sama lain. */
  ...initialDomainState(),
  selectedDate: todayISO(),
  habitSheetMode: 'closed',
  habitSheetId: null,
  quoteOffset: 0,
  quoteDate: null,
  expandedTaskId: null,
  readingNoteId: null,
  celebrating: false,

  /* Keuangan — state UI sesaat */
  finPeriod: 'bulan',
  txSheetOpen: false,
  txEditId: null,
  transferSheetOpen: false,
  walletDialogOpen: false,
  walletEditId: null,
  catManageOpen: false,
  finDrill: null,
  goalSheetId: null,
  goalDialogOpen: false,
  goalEditId: null,
  expandedTxId: null,
  /* Bugar — state UI sesaat */
  workoutSheetOpen: false,
  workoutSheetSeed: null,
  workoutSheetHint: null,
  foodSheetOpen: false,
  boardOpen: false,

  openBoard: () => set({ boardOpen: true }),

  closeBoard: () => set({ boardOpen: false }),

  setScreen: (screen) =>
    set((s) => ({ screen, prevScreen: s.screen })),

  setFinPeriod: (finPeriod) => set({ finPeriod }),

  /* Preferensi UI — merge dangkal; tidak memicu push sinkronisasi
     (bukan bagian DOMAIN_KEYS). */
  uiPrefs: {
    bugarTab: 'latihan',
    finTab: 'ringkasan',
    chartPeriod: 'bulan',
    mutasiFilter: 'semua',
    statsPeriod: 'pekan',
    kebiasaanRoom: 'agenda',
    konsistensiViz: 'sulur',
    statsView: 'ringkasan',
    woFilter: 'semua',
    woRange: 'semua',
  },

  setUiPref: (patch) =>
    set((s) => ({ uiPrefs: { ...s.uiPrefs, ...patch } })),

  openTxSheet: () => set({ txSheetOpen: true, txEditId: null }),

  closeTxSheet: () => set({ txSheetOpen: false, txEditId: null }),

  /* Mode sunting transaksi (v2.22) — lembar terisi nilai lama. */
  openTxEdit: (id) => set({ txSheetOpen: true, txEditId: id }),

  addTx: ({ type, cat, amount, note, walletId, recurrence, date }) =>
    set((s) => ({
      txs: [
        {
          id: `tx-${uid()}`,
          type,
          cat,
          /* v2.49 (audit): clamp di batas domain — selaras cap skema
           *  sinkronisasi (Zod) agar push tidak pernah 422 (pola
           *  addHabit v2.45). */
          amount: Math.max(0, Math.min(1_000_000_000_000, Math.round(amount))),
          note: note.trim().slice(0, 500),
          /* v2.42: tanggal bisa dipilih (kemarin dst.) — default hari ini. */
          ts: date || todayFinISO(),
          walletId,
          recurrence: recurrence ?? null,
        },
        ...s.txs,
      ],
    })),

  /* --- Kategori buatan — satu sistem terpadu (v2.17) ---

     Nama harus unik per arus terhadap kategori bawaan maupun buatan
     lain (case-insensitive) agar tidak lahir duplikat; mengembalikan
     null bila ditolak sehingga UI bisa memberi umpan balik. */
  addCustomCat: ({ name, type }) => {
    const clean = name.trim().slice(0, 40)
    if (!clean) return null
    const s = get()
    const taken = new Set(
      [
        ...Object.values(CATS_UNIFIED_LABELS),
        ...s.customCats.filter((c) => c.type === type).map((c) => c.name),
      ].map((n) => n.toLowerCase()),
    )
    if (taken.has(clean.toLowerCase())) return null
    const cat: CustomCat = {
      id: `fcat-${uid()}`,
      name: clean,
      type,
    }
    set((st) => ({ customCats: [...st.customCats, cat] }))
    return cat
  },

  removeCustomCat: (id) =>
    set((s) => ({
      customCats: s.customCats.filter((c) => c.id !== id),
    })),

  /* --- Kelola kategori (v2.22) --- */

  /* Ganti nama kategori bawaan — override label tersimpan terpisah
     (catRenames) sehingga data transaksi tak tersentuh & tetap aman
     bila nama dikembalikan. Kategori buatan diubah langsung di
     customCats. */
  renameCat: (slug, newName) => {
    const clean = newName.trim().slice(0, 40)
    if (!clean) return
    set((s) => {
      /* Kategori buatan: ubah namanya langsung. */
      const custom = s.customCats.find((c) => c.id === slug)
      if (custom) {
        return {
          customCats: s.customCats.map((c) =>
            c.id === slug ? { ...c, name: clean } : c,
          ),
        }
      }
      /* Kategori bawaan: simpan override (hapus bila sama dengan nama asli). */
      const renames = { ...s.catRenames }
      const original = CATS_UNIFIED_LABELS[slug]
      if (original && original.toLowerCase() === clean.toLowerCase()) {
        delete renames[slug]
      } else {
        renames[slug] = clean
      }
      return { catRenames: renames }
    })
  },

  hideCat: (slug) =>
    set((s) => ({
      hiddenCats: s.hiddenCats.includes(slug)
        ? s.hiddenCats
        : [...s.hiddenCats, slug],
    })),

  unhideCat: (slug) =>
    set((s) => ({ hiddenCats: s.hiddenCats.filter((c) => c !== slug) })),

  /* Hapus kategori buatan — transaksinya dipindah ke "lainnya" agar
     histori tidak yatim; anggarannya dibuang bila ada. */
  deleteCustomCat: (id) =>
    set((s) => {
      const budgets = { ...s.budgets }
      delete budgets[id]
      return {
        customCats: s.customCats.filter((c) => c.id !== id),
        txs: s.txs.map((t) => (t.cat === id ? { ...t, cat: 'lainnya' } : t)),
        budgets,
        hiddenCats: s.hiddenCats.filter((c) => c !== id),
      }
    }),

  openCatManage: () => set({ catManageOpen: true }),

  closeCatManage: () => set({ catManageOpen: false }),

  openFinDrill: (kind, id) => set({ finDrill: { kind, id } }),

  closeFinDrill: () => set({ finDrill: null }),

  /* --- Dompet & transfer --- */

  addWallet: (name, initial) =>
    set((s) => ({
      wallets: [
        ...s.wallets,
        { id: `wl-${uid()}`, name: name.trim().slice(0, 40), initial },
      ],
      walletDialogOpen: false,
      walletEditId: null,
    })),

  /* Sunting dompet (v2.22) — saldo berjalan otomatis mengikuti karena
     selalu dihitung dari initial + mutasi. */
  updateWallet: (id, patch) =>
    set((s) => ({
      wallets: s.wallets.map((w) =>
        w.id === id
          ? {
              ...w,
              ...(patch.name !== undefined
                ? { name: patch.name.trim().slice(0, 20) || w.name }
                : {}),
              ...(patch.initial !== undefined ? { initial: patch.initial } : {}),
            }
          : w,
      ),
      walletDialogOpen: false,
      walletEditId: null,
    })),

  /* Hapus dompet (v2.22). v2.45 (audit): kaki transfer yatim TIDAK lagi
     dibiarkan bermuatan setengah — itu merusak matematika saldo (kaki
     lawan tetap dihitung → saldo total menggelembung). Kaki yang
     kehilangan pasangan dikonversi jujur: sumber hilang → pemasukan di
     dompet tujuan (uang "dari luar"); tujuan hilang → pengeluaran di
     dompet sumber; keduanya hilang → transaksi dibuang. */
  deleteWallet: (id) =>
    set((s) => ({
      wallets: s.wallets.filter((w) => w.id !== id),
      txs: s.txs.flatMap((t) => {
        if (t.type !== 'transfer') {
          return [
            {
              ...t,
              ...(t.walletId === id ? { walletId: undefined } : {}),
            },
          ]
        }
        const srcGone = t.walletId === id
        const dstGone = t.toWalletId === id
        if (srcGone && dstGone) return []
        if (srcGone)
          return [
            {
              ...t,
              type: 'masuk' as const,
              walletId: t.toWalletId,
              toWalletId: undefined,
            },
          ]
        if (dstGone)
          return [
            {
              ...t,
              type: 'keluar' as const,
              walletId: t.walletId,
              toWalletId: undefined,
            },
          ]
        return [t]
      }),
      walletDialogOpen: false,
      walletEditId: null,
      finDrill:
        s.finDrill?.kind === 'wallet' && s.finDrill.id === id ? null : s.finDrill,
    })),

  openTransferSheet: () => set({ transferSheetOpen: true }),

  closeTransferSheet: () => set({ transferSheetOpen: false }),

  /** Transfer antar-dompet — tercatat sebagai tipe 'transfer' yang
   *  TIDAK dihitung sebagai pemasukan/pengeluaran di statistik. */
  addTransfer: ({ fromId, toId, amount, note, date }) =>
    set((s) => ({
      txs: [
        {
          id: `tx-${uid()}`,
          type: 'transfer' as const,
          cat: 'transfer' as const,
          /* v2.49 (audit): clamp di batas domain (pola addTx). */
          amount: Math.max(0, Math.min(1_000_000_000_000, Math.round(amount))),
          note: note.trim().slice(0, 500),
          ts: date || todayFinISO(),
          walletId: fromId,
          toWalletId: toId,
          recurrence: null,
        },
        ...s.txs,
      ],
      transferSheetOpen: false,
    })),

  openWalletDialog: () => set({ walletDialogOpen: true, walletEditId: null }),

  openWalletEdit: (id) => set({ walletDialogOpen: true, walletEditId: id }),

  closeWalletDialog: () => set({ walletDialogOpen: false, walletEditId: null }),

  /* --- Anggaran --- */

  setBudget: (cat, limit) =>
    set((s) => ({ budgets: { ...s.budgets, [cat]: limit } })),

  removeBudget: (cat) =>
    set((s) => {
      const next = { ...s.budgets }
      delete next[cat]
      return { budgets: next }
    }),

  /* --- Transaksi berulang --- */

  /** Catat otomatis salinan transaksi berulang yang jadwalnya sudah
   *  tiba (mingguan/bulanan), dari templat hingga hari ini — idempoten:
   *  salinan baru melanjutkan rantai lewat recurOf.
   *
   *  v2.16 (audit T5-e #5): ts TEMPLAT dimajukan ke due terakhir yang
   *  direncanakan — bukan hanya mengikuti rantai salinan yang tersisa.
   *  Tanpa ini, menghapus salinan terbaru memundurkan kursor dan
   *  salinan dengan tanggal yang sama dihidupkan ulang pada
   *  materialisasi berikutnya (resurreksi). */
  materializeRecurring: () =>
    set((s) => {
      const today = todayFinISO()
      const next = [...s.txs]
      const templates = next.filter(
        (t) => t.recurrence && !t.recurOf,
      )
      let added = 0
      for (const tpl of templates) {
        /* Terbaru dalam rantai: templat atau salinan terakhirnya. */
        const chain = next.filter(
          (t) => t.id === tpl.id || t.recurOf === tpl.id,
        )
        let cursor = chain.reduce(
          (latest, t) => (t.ts > latest ? t.ts : latest),
          tpl.ts,
        )
        const step = (iso: string) =>
          tpl.recurrence === 'mingguan'
            ? addDaysISO(iso, 7)
            : addMonthsISO(iso, 1)
        let due = step(cursor)
        let planned = cursor
        /* Pagar anti-runaway PER TEMPLAT (v2.42, sebelumnya global): satu
           templat yang menangkap banyak (mis. di-backdate berbulan-bulan)
           tidak lagi memakan jatah templat lain dalam run yang sama. */
        let tplAdded = 0
        while (due <= today && tplAdded < 200) {
          next.unshift({
            ...tpl,
            id: `tx-${Date.now()}-${added}-${Math.floor(Math.random() * 1e4)}`,
            ts: due,
            recurOf: tpl.id,
          })
          added++
          tplAdded++
          planned = due
          cursor = due
          due = step(cursor)
        }
        if (tplAdded > 0) {
          /* Majukan templat itu sendiri ke due terakhir yang direncanakan
             sehingga penghapusan salinan tidak memundurkan kursor. */
          const i = next.findIndex((t) => t.id === tpl.id)
          if (i >= 0) next[i] = { ...next[i], ts: planned }
        }
      }
      return added > 0 ? { txs: next } : {}
    }),

  /* Sunting transaksi yang sudah ada (v2.22) — arus boleh berubah
     (keluar↔masuk); salinan otomatis berulang ikut membawa kategori &
     nominal baru saat materialisasi berikutnya. */
  updateTx: (id, patch) => {
    set((s) => ({
      txs: s.txs.map((t) =>
        t.id === id
          ? {
              ...t,
              ...(patch.type !== undefined ? { type: patch.type } : {}),
              ...(patch.cat !== undefined ? { cat: patch.cat } : {}),
              ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
              ...(patch.note !== undefined ? { note: patch.note.trim() } : {}),
              ...(patch.walletId !== undefined
                ? { walletId: patch.walletId || undefined }
                : {}),
              ...(patch.recurrence !== undefined
                ? { recurrence: patch.recurrence }
                : {}),
              /* v2.42: tanggal tx lama bisa dipindah (salah catat hari). */
              ...(patch.ts !== undefined && patch.ts
                ? { ts: patch.ts }
                : {}),
            }
          : t,
      ),
      txSheetOpen: false,
      txEditId: null,
    }))
    /* v2.45 (audit): suntingan templat berulang / perpindahan tanggal
       memicu materialisasi ulang — salinan yang jatuh tempo tercipta
       dalam sesi yang sama, bukan menunggu boot berikutnya. */
    if (patch.recurrence !== undefined || patch.ts !== undefined) {
      get().materializeRecurring()
    }
  },

  deleteTx: (id) =>
    set((s) => ({
      txs: s.txs.filter((t) => t.id !== id),
      expandedTxId: s.expandedTxId === id ? null : s.expandedTxId,
    })),

  toggleExpandedTx: (id) =>
    set((s) => ({
      expandedTxId: s.expandedTxId === id ? null : id,
    })),

  openGoalSheet: (goalSheetId) => set({ goalSheetId }),

  closeGoalSheet: () => set({ goalSheetId: null }),

  contributeGoal: (id, amount) =>
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === id
          ? {
              ...g,
              saved: g.saved + amount,
              /* v2.45: catat kejadian kontribusi (audit — data nyata,
               *  bukan hanya penghitung kumulatif). */
              contributions: [
                ...(g.contributions ?? []),
                { ts: new Date().toISOString(), amount },
              ].slice(-500),
            }
          : g,
      ),
    })),

  openGoalDialog: () => set({ goalDialogOpen: true }),

  closeGoalDialog: () => set({ goalDialogOpen: false }),

  addGoal: (name, target) =>
    set((s) => ({
      goals: [
        ...s.goals,
        {
          id: `goal-${uid()}`,
          name: name.trim().slice(0, 120),
          /* v2.45 (audit): clamp di batas domain — UI membatasi 100 rb,
             tapi data tersinkron/impor bisa 0 → pembagian NaN. */
          target: Math.max(1000, Math.round(target)),
          saved: 0,
          contributions: [],
        },
      ],
    })),

  openGoalEdit: (goalEditId) => set({ goalEditId }),

  closeGoalEdit: () => set({ goalEditId: null }),

  updateGoal: (id, patch) =>
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === id
          ? {
              ...g,
              name: patch.name != null ? patch.name.trim() : g.name,
              /* Target baru tak boleh di bawah nominal minimum begitu
                 tujuan dibuat; jaga agar tetap > 0. */
              target:
                patch.target != null ? Math.max(1000, patch.target) : g.target,
            }
          : g,
      ),
    })),

  deleteGoal: (id) =>
    set((s) => ({
      goals: s.goals.filter((g) => g.id !== id),
      /* Tutup sheet/kelola tujuan yang mungkin masih menunjuk tujuan
         yang dihapus. */
      goalSheetId: s.goalSheetId === id ? null : s.goalSheetId,
      goalEditId: s.goalEditId === id ? null : s.goalEditId,
    })),

  /* --- Aksi bugar --- */

  openWorkoutSheet: (seed, hint) =>
    set({
      workoutSheetOpen: true,
      workoutSheetSeed: seed ?? null,
      workoutSheetHint: hint ?? null,
    }),

  closeWorkoutSheet: () =>
    set({
      workoutSheetOpen: false,
      workoutSheetSeed: null,
      workoutSheetHint: null,
    }),

  addWorkout: ({ kind, date, duration, note, sets, distance, kcal }) => {
    const wo: Workout = {
      id: `wo-${uid()}`,
      kind,
      date,
      /* v2.49 (audit): clamp di batas domain — selaras cap skema
       *  sinkronisasi (Zod) agar push tidak pernah 422. */
      duration: Math.max(0, Math.min(1440, Math.round(duration))),
      note: note.trim().slice(0, 500),
      sets: sets.map((x) => ({ ...x })).slice(0, 60),
      distance,
      ...(kcal && kcal > 0 ? { kcal: Math.round(kcal) } : {}),
    }
    const s = get()
    /* SATU jalur pusat aturan otomatis (audit v2.37 §4C): WorkoutSheet
       dan WorkoutSession sama-sama lewat sini — habit terhubung
       eksplisit dicatat selesai/berprogres pada TANGGAL workout. */
    const auto = applyWorkoutToHabits(wo, s.habits, s.completions, s.habitAuto)
    set({
      workouts: [wo, ...s.workouts],
      completions: auto.completed.length + auto.progressed.length > 0 ? auto.completions : s.completions,
      habitAuto: auto.completed.length + auto.progressed.length > 0 ? auto.habitAuto : s.habitAuto,
      workoutSheetOpen: false,
      workoutSheetSeed: null,
    })
    /* Notifikasi menyebut nama habit yang otomatis terselesaikan. */
    for (const h of auto.completed) {
      toast.success(`"${h.title}" otomatis selesai dari sesi ${WORKOUT_KIND_LABEL[kind] ?? kind}`)
    }
    for (const p of auto.progressed) {
      toast.info(
        `"${p.habit.title}" +${p.value}/${p.target} ${p.habit.unit ?? ''} — dari sesi ${WORKOUT_KIND_LABEL[kind] ?? kind}`,
      )
    }
  },

  deleteWorkout: (id) => {
    const s = get()
    const workouts = s.workouts.filter((w) => w.id !== id)
    /* Evaluasi ulang provenance (audit v2.37 §4D): centang manual tak
       pernah terhapus; completion bertahan bila masih ada sumber lain. */
    const re = reevaluateHabitAutoAfterDelete(
      id,
      s.habits,
      workouts,
      s.completions,
      s.habitAuto,
    )
    set({
      workouts,
      ...(re.reverted.length > 0
        ? { completions: re.completions, habitAuto: re.habitAuto }
        : {}),
    })
    for (const r of re.reverted) {
      toast.info(
        `Sesi dihapus — "${r.habit.title}" kembali ke progres manual.`,
      )
    }
  },

  /* --- Aksi asupan --- */

  openFoodSheet: () => set({ foodSheetOpen: true }),

  closeFoodSheet: () => set({ foodSheetOpen: false }),

  addFoodEntry: (input) =>
    set((s) => ({
      foodEntries: [
        {
          id: `fd-${uid()}`,
          ...input,
          /* v2.49 (audit): clamp di batas domain (pola addTx). */
          name: input.name.trim().slice(0, 120),
          kcal: Math.max(0, Math.min(100_000, Math.round(input.kcal))),
        },
        ...s.foodEntries,
      ],
      foodSheetOpen: false,
    })),

  deleteFoodEntry: (id) =>
    set((s) => ({
      foodEntries: s.foodEntries.filter((f) => f.id !== id),
    })),

  setCalorieTarget: (calorieTarget) => set({ calorieTarget }),

  /* --- Aksi tubuh (UPSERT harian) --- */

  setWaterToday: (delta) =>
    set((s) => {
      const key = todayISO()
      const cur = s.bodyLogs[key] ?? { water: 0 }
      return {
        bodyLogs: {
          ...s.bodyLogs,
          [key]: { ...cur, water: Math.max(0, Math.min(20, cur.water + delta)) },
        },
      }
    }),

  logWeightToday: (kg) =>
    set((s) => {
      const key = todayISO()
      const cur = s.bodyLogs[key] ?? { water: 0 }
      return {
        bodyLogs: { ...s.bodyLogs, [key]: { ...cur, weight: kg } },
      }
    }),

  logBodyCheckIn: ({ sleepH, energy, soreness, stress }) =>
    set((s) => {
      const key = todayISO()
      const cur = s.bodyLogs[key] ?? { water: 0 }
      const next: BodyLog = { ...cur }
      if (sleepH !== undefined) next.sleepH = sleepH
      if (energy !== undefined) next.energy = energy
      if (soreness !== undefined) next.soreness = soreness
      if (stress !== undefined) next.stress = stress
      return { bodyLogs: { ...s.bodyLogs, [key]: next } }
    }),

  setFitTargets: (patch) =>
    set((s) => ({ fitTargets: { ...s.fitTargets, ...patch } })),

  setJournalFilter: (journalFilter) => set({ journalFilter }),

  openCompose: (folder) =>
    set((s) => ({ composeOpen: true, composeFolder: folder ?? s.composeFolder })),

  closeCompose: () => set({ composeOpen: false }),

  /* --- Aksi kebiasaan --- */

  setSelectedDate: (iso) => set({ selectedDate: iso }),

  /** Tandai selesai / batalkan untuk TANGGAL tertentu — histori nyata.
   *  Tanggal masa depan ditolak (belum terjadi). */
  toggleHabit: (id, dateISO) => {
    if (dateISO > todayISO()) return
    set((s) => {
      const day = { ...(s.completions[dateISO] ?? {}) }
      /* v2.45 (audit): ketuk pada progres PARSIAL (angka) menuntaskan
       *  menjadi selesai — BUKAN menghapus progresnya. Hanya `true`
       *  (selesai penuh) yang bisa dibatalkan. */
      const unchecked = day[id] === true
      if (unchecked) {
        delete day[id]
      } else {
        day[id] = true
      }
      const completions = { ...s.completions, [dateISO]: day }
      /* Buang objek hari yang kosong agar histori tetap bersih. */
      if (Object.keys(day).length === 0) delete completions[dateISO]
      /* v2.49 (audit): cermin aksi manual ke provenance habitAuto agar
       *  nilai ini tak pernah tertimpa base basi saat workout
       *  penyumbang dihapus (audit v2.37 §4D "centang manual tidak
       *  pernah tersentuh" — kini berlaku dua arah, set & batal). */
      const habitAuto = mirrorManualToAuto(
        s.habitAuto,
        id,
        dateISO,
        unchecked ? undefined : true,
        0,
      )
      return { completions, habitAuto }
    })
  },

  /** Set progres terukur kebiasaan (v2.22): capai target → `true`
   *  (selesai penuh — konsisten dengan streak & statistik); di bawah
   *  target → angka parsial; nol → hapus catatan hari itu. */
  setHabitValue: (id, dateISO, value) => {
    if (dateISO > todayISO()) return
    const h = useRutina.getState().habits.find((x) => x.id === id)
    const target = h?.target ?? 1
    set((s) => {
      const day = { ...(s.completions[dateISO] ?? {}) }
      let manual: boolean | number | undefined
      if (value <= 0) {
        delete day[id]
        manual = undefined
      } else if (value >= target) {
        day[id] = true
        manual = true
      } else {
        day[id] = Math.round(value * 10) / 10
        manual = day[id] as number
      }
      const completions = { ...s.completions, [dateISO]: day }
      if (Object.keys(day).length === 0) delete completions[dateISO]
      /* v2.49 (audit): cermin progres manual ke provenance habitAuto —
       *  nilai baru menggantikan base basi; bagian manual = nilai total
       *  − Σ kontribusi workout yang masih hidup. */
      const habitAuto = mirrorManualToAuto(
        s.habitAuto,
        id,
        dateISO,
        manual,
        liveAutoContribution(h, s.workouts, s.habitAuto[id]?.[dateISO]),
      )
      return { completions, habitAuto }
    })
  },

  addHabit: (input) =>
    set((s) => ({
      habits: [
        ...s.habits,
        {
          id: `habit-${uid()}`,
          /* v2.45 (audit): clamp panjang di batas domain — selaras cap
           *  skema sinkronisasi (Zod) agar push tidak pernah 422. */
          title: input.title.trim().slice(0, 200),
          desc: input.desc.trim().slice(0, 4000),
          cat: input.cat,
          schedule: [...input.schedule].sort((a, b) => a - b),
          weeklyTarget: input.weeklyTarget,
          reminder: input.reminder,
          restDays: [...(input.restDays ?? [])].sort(),
          afterId: input.afterId || null,
          mini: (input.mini ?? '').trim().slice(0, 300),
          target: input.target && input.target > 0 ? input.target : null,
          unit: input.target && input.target > 0 ? (input.unit ?? '').trim() || null : null,
          groupId: input.groupId || null,
          linkedActivity: input.linkedActivity ?? null,
          archived: false,
          createdAt: todayISO(),
        },
      ],
    })),

  updateHabit: (id, patch) =>
    set((s) => ({
      habits: s.habits.map((h) => {
        if (h.id !== id) return h
        const next = { ...h, ...patch }
        if (patch.schedule) {
          next.schedule = [...patch.schedule].sort((a, b) => a - b)
        }
        /* v2.49 (audit): normalisasi restDays juga (pola addHabit) agar
         *  data tersimpan tetap terurut & bebas duplikat. */
        if (patch.restDays) {
          next.restDays = [...new Set(patch.restDays)].sort()
        }
        /* v2.45: clamp suntingan juga (pola addHabit). */
        if (patch.title !== undefined)
          next.title = patch.title.trim().slice(0, 200)
        if (patch.desc !== undefined)
          next.desc = patch.desc.trim().slice(0, 4000)
        if (patch.mini !== undefined)
          next.mini = patch.mini.trim().slice(0, 300)
        if (patch.afterId !== undefined) next.afterId = patch.afterId || null
        if (patch.target !== undefined)
          next.target = patch.target && patch.target > 0 ? patch.target : null
        if (patch.unit !== undefined)
          next.unit = patch.unit ? patch.unit.trim() || null : null
        if (patch.groupId !== undefined) next.groupId = patch.groupId || null
        if (patch.linkedActivity !== undefined)
          next.linkedActivity = patch.linkedActivity ?? null
        return next
      }),
    })),

  setHabitArchived: (id, archived) =>
    set((s) => ({
      habits: s.habits.map((h) => (h.id === id ? { ...h, archived } : h)),
    })),

  deleteHabit: (id) =>
    set((s) => {
      /* Bersihkan seluruh jejak histori kebiasaan yang dihapus. */
      const completions: Completions = {}
      for (const [date, day] of Object.entries(s.completions)) {
        const { [id]: _removed, ...rest } = day
        if (Object.keys(rest).length > 0) completions[date] = rest
      }
      /* Provenance otomatis ikut bersih — habit-nya tidak ada lagi. */
      const habitAuto: HabitAuto = {}
      for (const [habitId, dates] of Object.entries(s.habitAuto)) {
        if (habitId === id) continue
        habitAuto[habitId] = dates
      }
      return {
        habits: s.habits
          .filter((h) => h.id !== id)
          /* Susun kebiasaan (habit stacking) yang memicu kebiasaan ini
             dibebaskan — afterId menggantung menunjuk id yang sudah
             tidak ada (pemicu tak pernah ketemu di kebiasaan.tsx). */
          .map((h) => (h.afterId === id ? { ...h, afterId: null } : h)),
        completions,
        habitAuto,
        expandedTaskId: s.expandedTaskId === id ? null : s.expandedTaskId,
        habitSheetId: s.habitSheetId === id ? null : s.habitSheetId,
        habitSheetMode:
          s.habitSheetId === id ? 'closed' : s.habitSheetMode,
      }
    }),

  openHabitCreate: () => set({ habitSheetMode: 'create', habitSheetId: null }),

  openHabitEdit: (id) => set({ habitSheetMode: 'edit', habitSheetId: id }),

  closeHabitSheet: () => set({ habitSheetMode: 'closed', habitSheetId: null }),

  /* --- Kelompok kebiasaan custom (v2.22) --- */

  addHabitGroup: (name, color) => {
    const clean = name.trim().slice(0, 24)
    if (!clean) return null
    const s = get()
    if (s.habitGroups.some((g) => g.name.toLowerCase() === clean.toLowerCase()))
      return null
    const group: HabitGroup = {
      id: `hg-${uid()}`,
      name: clean,
      color,
    }
    set((st) => ({ habitGroups: [...st.habitGroups, group] }))
    return group
  },

  /* Hapus kelompok — kebiasaan anggotanya kembali tanpa kelompok. */
  deleteHabitGroup: (id) =>
    set((s) => ({
      habitGroups: s.habitGroups.filter((g) => g.id !== id),
      habits: s.habits.map((h) =>
        h.groupId === id ? { ...h, groupId: null } : h,
      ),
    })),

  renameHabitGroup: (id, name, color) => {
    const clean = name.trim().slice(0, 24)
    if (!clean) return { ok: false, error: 'Nama kelompok tidak boleh kosong.' }
    const s = get()
    if (
      s.habitGroups.some(
        (g) => g.id !== id && g.name.toLowerCase() === clean.toLowerCase(),
      )
    )
      return { ok: false, error: 'Nama kelompok sudah dipakai.' }
    set((st) => ({
      habitGroups: st.habitGroups.map((g) =>
        g.id === id ? { ...g, name: clean, color } : g,
      ),
    }))
    return { ok: true }
  },

  /* --- Jeda Runtun Aman (streak freeze) --- */

  scheduleRestDay: (id, iso) => {
    const s = get()
    const h = s.habits.find((x) => x.id === id)
    if (!h) return { ok: false, error: 'Kebiasaan tidak ditemukan.' }
    const error = restDayError(h, s.completions, iso)
    if (error) return { ok: false, error }
    set({
      habits: s.habits.map((x) =>
        x.id === id
          ? { ...x, restDays: [...(x.restDays ?? []), iso].sort() }
          : x,
      ),
    })
    return { ok: true }
  },

  cancelRestDay: (id, iso) =>
    set((s) => ({
      habits: s.habits.map((x) =>
        x.id === id
          ? { ...x, restDays: (x.restDays ?? []).filter((d) => d !== iso) }
          : x,
      ),
    })),

  /* --- Suara Identitas & deload --- */

  setIdentityText: (text) =>
    set({ identityText: text.slice(0, 600) }),

  startDeload: (days) =>
    set({ deloadUntil: addDaysISO(todayISO(), Math.max(1, days)) }),

  endDeload: () => set({ deloadUntil: null }),

  addNote: ({ title, body, folder }) =>
    set((s) => ({
      notes: [
        {
          id: `note-${uid()}`,
          /* v2.45 (audit): tanpa teks pengisi pabrik — 8 kata hantu
           *  "Catatan kosong…" mencemari metrik Jumlah Kata (v2.44).
           *  Tampilan sudah menghandle isi kosong dengan jujur. */
          title: (title ?? '').slice(0, 200),
          body: (body ?? '').slice(0, 20_000),
          /* v2.36: ISO yyyy-mm-dd — selaras skema JournalNote; label
             tampilan ("Hari ini") diturunkan, bukan disimpan. */
          date: todayISO(),
          pinned: false,
          tone: (s.notes.length * 2) % 3,
          folder,
        },
        ...s.notes,
      ],
    })),

  togglePin: (id) =>
    set((s) => ({
      notes: s.notes.map((n) =>
        n.id === id ? { ...n, pinned: !n.pinned } : n,
      ),
    })),

  deleteNote: (id) => {
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      readingNoteId: s.readingNoteId === id ? null : s.readingNoteId,
    }))
    /* Pangkas metadata mood catatan itu juga — tanpa ini entri menetap
       di localStorage sampai kanvas menulis ditutup berikutnya. */
    const moods = useJournalUi.getState().noteMoods
    if (id in moods) {
      const next = { ...moods }
      delete next[id]
      useJournalUi.setState({ noteMoods: next })
    }
  },

  saveQuote: () => {
    const today = todayISO()
    if (get().quoteSavedDate === today) return
    const q = get().currentQuote()
    set((s) => ({
      quoteSaved: true,
      quoteSavedDate: today,
      notes: [
        {
          id: `quote-${uid()}`,
          title: 'Kutipan Hari Ini',
          body: `"${q.text}" — ${q.author}`,
          /* v2.36: ISO — selaras addNote & skema JournalNote. */
          date: today,
          pinned: true,
          tone: 1,
          folder: 'bacaan',
        },
        ...s.notes,
      ],
    }))
  },

  /* Ganti refleksi — maju satu kutipan dari yang sedang tampil. Offset
     hanya hidup sepanjang hari yang sama: hari berikutnya kembali ke
     kutipan harian default (deterministik per tanggal). */
  cycleQuote: () => {
    const today = todayISO()
    set((s) => ({
      quoteDate: today,
      quoteOffset: nextQuoteOffset(s.quoteDate, s.quoteOffset, today),
    }))
  },

  currentQuote: () => {
    const s = get()
    return currentQuoteOf(s.quoteDate, s.quoteOffset, todayISO())
  },

  setMood: (mood) =>
    set((s) => {
      const key = todayISO()
      const moodLogs = { ...s.moodLogs }
      if (mood == null) delete moodLogs[key]
      else moodLogs[key] = mood
      return { mood, moodLogs }
    }),

  toggleExpandedTask: (id) =>
    set((s) => ({
      expandedTaskId: s.expandedTaskId === id ? null : id,
    })),

  openReading: (id) => set({ readingNoteId: id }),

  closeReading: () => set({ readingNoteId: null }),

  setCelebrating: (celebrating) => set({ celebrating }),

  claimBonus: () => {
    /* v2.45: gerbang per-tanggal — klaim hari ini tidak memblokir klaim
     *  besok (boolean lama menempel permanen — audit). */
    const today = todayISO()
    if (get().bonusClaimedOn === today) return
    set({ bonusClaimedOn: today })
  },

  setDailyGoal: (dailyGoal) => set({ dailyGoal }),

  /* --- Reset penuh (Zona Bahaya Profil) --- */

  /** Reset penuh (Zona Bahaya Profil) — SELURUH slice domain kembali ke
   *  nilai pabrik: kebiasaan + histori + kelompok, catatan, transaksi,
   *  dompet, anggaran, kategori (buatan/rename/sembunyi), tujuan,
   *  latihan, asupan, log tubuh (termasuk berat badan), mood + riwayat,
   *  suara identitas, deload, kutipan tersimpan, sasaran bugar, target
   *  kalori, target harian — persis daftar DOMAIN_KEYS yang dipush ke
   *  cloud, sehingga snapshot berikutnya mengosongkan data di server
   *  (janji UI: "permanen — dari perangkat ini dan penyimpanan cloud").
   *  Preferensi non-domain (uiPrefs, posisi kutipan harian) dipertahankan
   *  karena bukan data pengguna. */
  startFresh: () => {
    set({
      ...initialDomainState(),
      /* Kalender beranda kembali ke hari ini — titik pandang, bukan data. */
      selectedDate: todayISO(),
    })
    /* Metadata mood jurnal ikut kosong — seluruh catatan yang menjadi
       kuncinya baru saja dihapus (pemangkasan lazimnya menunggu kanvas
       ditutup; reset penuh tidak boleh menunggu itu). */
    if (Object.keys(useJournalUi.getState().noteMoods).length > 0) {
      useJournalUi.setState({ noteMoods: {} })
    }
  },
    }),
    {
      /* Persistensi lokal — histori pengguna nyata & permanen di perangkat,
         selaras dengan janji "data tersimpan di perangkat" pada FAQ Profil. */
      name: 'rutina-2.0-store',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      /* Rehidrasi manual pasca-mount (pola aman Next.js SSR): HTML server
         dirender dari seed, lalu state tersimpan dipulihkan di klien —
         bebas hydration mismatch. RutinaApp memanggil rehydrate(). */
      skipHydration: true,
      /* Migrasi v1 → v2 → v3: isi field baru (Jeda Runtun, Susun
         Kebiasaan, Versi 2 Menit, moodLogs, identitas, deload, kutipan
         harian, kelompok kebiasaan, kategori rename/sembunyi, sasaran
         bugar, kebiasaan terukur; v3: tautan aktivitas Bugar +
         provenance habitAuto — kebiasaan lama default TIDAK terhubung). */
      migrate: (persisted) => {
        const p = persisted as Record<string, unknown> & {
          habits?: Record<string, unknown>[]
        }
        if (Array.isArray(p.habits)) {
          p.habits = p.habits.map((h) => ({
            ...h,
            restDays: Array.isArray(h.restDays) ? h.restDays : [],
            afterId: h.afterId ?? null,
            mini: typeof h.mini === 'string' ? h.mini : '',
            target: typeof h.target === 'number' ? h.target : null,
            unit: typeof h.unit === 'string' ? h.unit : null,
            groupId: typeof h.groupId === 'string' ? h.groupId : null,
            linkedActivity:
              typeof h.linkedActivity === 'string' && h.linkedActivity
                ? (h.linkedActivity as WorkoutKind)
                : null,
          }))
        }
        if (!p.moodLogs || typeof p.moodLogs !== 'object') p.moodLogs = {}
        if (!p.habitAuto || typeof p.habitAuto !== 'object') p.habitAuto = {}
        if (typeof p.identityText !== 'string') p.identityText = ''
        if (typeof p.deloadUntil !== 'string') p.deloadUntil = null
        if (typeof p.quoteSavedDate !== 'string') p.quoteSavedDate = null
        /* v2.45: boolean lama dijatuhkan — klaim lampau tak bertanggal
           tidak boleh memblokir hari ini (bug bonus sekali-seumur). */
        if (typeof p.bonusClaimedOn !== 'string') p.bonusClaimedOn = null
        /* v2.45: sane-kan chartPeriod warisan build lama ('tahun' sudah
           bukan tab yang ada — tab tak tersorot tanpa ini). */
        const prefs = p.uiPrefs as Record<string, unknown> | undefined
        if (
          prefs &&
          !['minggu', 'bulan', 'semua'].includes(String(prefs.chartPeriod))
        )
          prefs.chartPeriod = 'bulan'
        /* v2.77: ruang Kebiasaan & pandangan Statistik baru — storage
           lama belum memuatnya (merge dangkal mengganti seluruh objek
           uiPrefs), pulihkan default agar tab tak pernah bernilai
           tak-terdefinisi. */
        if (prefs) {
          if (
            !['agenda', 'konsistensi', 'perpustakaan'].includes(
              String(prefs.kebiasaanRoom),
            )
          )
            prefs.kebiasaanRoom = 'agenda'
          if (!['sulur', 'panas', 'taman'].includes(String(prefs.konsistensiViz)))
            prefs.konsistensiViz = 'sulur'
          if (
            !['ringkasan', 'tren', 'kalender', 'wawasan'].includes(
              String(prefs.statsView),
            )
          )
            prefs.statsView = 'ringkasan'
        }
        if (!Array.isArray(p.habitGroups)) p.habitGroups = []
        if (!p.catRenames || typeof p.catRenames !== 'object') p.catRenames = {}
        if (!Array.isArray(p.hiddenCats)) p.hiddenCats = []
        p.fitTargets = {
          ...FIT_TARGETS_DEFAULT,
          ...(typeof p.fitTargets === 'object' && p.fitTargets ? p.fitTargets : {}),
        }
        return p as unknown as RutinaState
      },
      /* v2.78 (fix v2.77 latent): merge DEFAULT adalah dangkal — objek
         uiPrefs lama dari storage MENGGANTI seluruh uiPrefs default,
         sehingga field baru (kebiasaanRoom, konsistensiViz, statsView)
         lenyap untuk pengguna yang storage-nya ditulis build sebelumnya
         (migrate tidak berjalan karena versi persist tidak berubah).
         uiPrefs kini di-merge per-field: nilai lama menang untuk field
         yang memang tersimpan, field baru mewarisi default. */
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<RutinaState>
        return {
          ...current,
          ...p,
          uiPrefs: { ...current.uiPrefs, ...(p.uiPrefs ?? {}) },
        }
      },
      /* Hanya state domain yang dipersist — state UI sesaat (tab aktif,
         sheet terbuka, item terkembangi) selalu mulai segar. */
      partialize: (s) => ({
        habits: s.habits,
        completions: s.completions,
        habitAuto: s.habitAuto,
        habitGroups: s.habitGroups,
        notes: s.notes,
        txs: s.txs,
        goals: s.goals,
        wallets: s.wallets,
        budgets: s.budgets,
        customCats: s.customCats,
        catRenames: s.catRenames,
        hiddenCats: s.hiddenCats,
        workouts: s.workouts,
        foodEntries: s.foodEntries,
        calorieTarget: s.calorieTarget,
        bodyLogs: s.bodyLogs,
        fitTargets: s.fitTargets,
        dailyGoal: s.dailyGoal,
        mood: s.mood,
        moodLogs: s.moodLogs,
        identityText: s.identityText,
        deloadUntil: s.deloadUntil,
        bonusClaimedOn: s.bonusClaimedOn,
        quoteSaved: s.quoteSaved,
        quoteSavedDate: s.quoteSavedDate,
        quoteOffset: s.quoteOffset,
        quoteDate: s.quoteDate,
        /* Preferensi perangkat — ikut persist lokal, tidak disinkronkan */
        uiPrefs: s.uiPrefs,
      }),
    },
  ),
)
