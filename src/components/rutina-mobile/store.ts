import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/* ===== Tipe & data demo (deterministik, tanpa Math.random) ===== */

export type Screen =
  | 'beranda'
  | 'bugar'
  | 'jurnal'
  | 'keuangan'
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

/** Label pendek folder untuk chip filter jurnal. */
export const FOLDER_SHORT: Record<FolderKey, string> = {
  kerja: 'Kerja',
  ide: 'Ide',
  bacaan: 'Bacaan',
  pribadi: 'Pribadi',
}

export const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export const MOODS = ['Ceria', 'Baik', 'Biasa', 'Lelah']

export const QUOTE_TEXT =
  'Kebiasaan kecil yang konsisten akan mengalahkan motivasi besar yang sesaat.'
export const QUOTE_AUTHOR = 'James Clear, Atomic Habits'

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

export const HABIT_CAT_COLORS: Record<HabitCat, string> = {
  Kebiasaan: '#A3C489',
  Kerja: '#749B58',
  Kesehatan: '#D98E6B',
  Pribadi: '#8C7B6B',
  Belajar: '#C7A17A',
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
}

/** completions[tanggalISO][habitId] = true — sumber tunggal histori. */
export type Completions = Record<string, Record<string, boolean>>

/* --- Utilitas tanggal (ISO yyyy-mm-dd, aman zona waktu lokal) --- */

export function isoOf(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return isoOf(new Date())
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

/** Jumlah kebiasaan selesai pada sebuah tanggal. */
export function doneCountOn(c: Completions, dateISO: string): number {
  return Object.values(c[dateISO] ?? {}).filter(Boolean).length
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
      if (isDoneOn(c, cursor, h.id)) streak++
      else break
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

/** Rasio penyelesaian harian (persen) N hari terakhir — dasar grafik tren.
 *  v = selesai / terjadwal × 100 (0 bila tidak ada kebiasaan terjadwal). */
export function rateSeries(
  habits: Habit[],
  c: Completions,
  today: string,
  days: number,
): { d: number; v: number }[] {
  const out: { d: number; v: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const iso = addDaysISO(today, -i)
    const total = habitsOn(habits, iso).length
    const done = habitsOn(habits, iso).filter((h) =>
      isDoneOn(c, iso, h.id),
    ).length
    out.push({
      d: days - i,
      v: total === 0 ? 0 : Math.round((done / total) * 100),
    })
  }
  return out
}

/** Tanggal aktivitas terawal dari histori (untuk "aktif sejak"). */
export function activeSinceISO(c: Completions): string | null {
  const dates = Object.keys(c).sort()
  return dates[0] ?? null
}

/** Ringkasan jadwal untuk ditampilkan: "Setiap hari", "Sen, Rab, Jum", dst. */
export function scheduleLabel(h: Habit): string {
  const sorted = [...h.schedule].sort((a, b) => a - b)
  const all = [0, 1, 2, 3, 4, 5, 6]
  const same = (a: number[], b: number[]) =>
    a.length === b.length && a.every((v, i) => v === b[i])
  if (sorted.length === 0 || same(sorted, all)) return 'Setiap hari'
  if (same(sorted, [1, 2, 3, 4, 5])) return 'Hari kerja'
  if (same(sorted, [0, 6])) return 'Akhir pekan'
  return sorted.map((d) => WEEKDAY_MIN[d]).join(', ')
}

/* --- Data demo kebiasaan --- */

/** Panjang histori demo: 84 hari (12 pekan) agar heatmap konsistensi penuh. */
export const HISTORY_DAYS = 84

/**
 * Pola demo deterministik per kebiasaan (true = selesai), `back` = jumlah
 * hari mundur dari hari ini. Dirancang agar streak awal bersumber data
 * nyata: Meditasi 5 hari, Baca 12 hari, Kosakata 21 hari.
 */
function seedDone(id: string, back: number): boolean {
  switch (id) {
    case 'h1':
      return back <= 4 ? true : back % 6 !== 5
    case 'h2':
      return back === 0 ? false : back <= 3 ? true : back % 5 !== 4
    case 'h3':
      return back <= 11 ? true : back % 4 !== 3
    case 'h4':
      return back === 0 ? false : back % 2 === 1
    case 'h5':
      return back === 0 ? false : back <= 21 ? true : back % 3 !== 2
    case 'h6':
      return back === 0 ? false : back % 14 !== 13
    default:
      return false
  }
}

function buildSeedCompletions(habits: Habit[]): Completions {
  const c: Completions = {}
  const today = todayISO()
  for (let back = HISTORY_DAYS; back >= 0; back--) {
    const iso = addDaysISO(today, -back)
    const day: Record<string, boolean> = {}
    for (const h of habits) {
      /* Hormati jadwal: kebiasaan hari-kerja/akhir-pekan hanya terisi
         pada hari terjadwalnya. */
      const scheduled =
        h.schedule.length === 0 ||
        h.schedule.includes(fromISO(iso).getDay())
      if (scheduled && seedDone(h.id, back)) day[h.id] = true
    }
    if (Object.keys(day).length > 0) c[iso] = day
  }
  return c
}

const SEED_START = addDaysISO(todayISO(), -HISTORY_DAYS)

const SEED_HABITS: Habit[] = [
  {
    id: 'h1',
    title: 'Meditasi 10 menit',
    desc: 'Duduk dengan punggung tegak, tarik napas 4 hitungan, tahan 4, hembuskan 6. Tutup sesi dengan tiga tarikan napas dalam dan ucapkan satu niat untuk hari ini.',
    cat: 'Kebiasaan',
    schedule: [],
    weeklyTarget: 7,
    reminder: '06:00',
    archived: false,
    createdAt: SEED_START,
  },
  {
    id: 'h2',
    title: 'Review laporan mingguan',
    desc: 'Bandingkan angka pekan ini dengan target bulanan, tandai tiga temuan utama, lalu siapkan poin pembahasan untuk rapat Senin.',
    cat: 'Kerja',
    schedule: [1, 2, 3, 4, 5],
    weeklyTarget: 5,
    reminder: '09:00',
    archived: false,
    createdAt: SEED_START,
  },
  {
    id: 'h3',
    title: 'Baca 20 halaman buku',
    desc: 'Lanjutkan bab tentang disiplin atomik. Catat satu kutipan yang paling relevan dengan pekan ini di jurnal bacaan.',
    cat: 'Belajar',
    schedule: [],
    weeklyTarget: 7,
    reminder: '21:00',
    archived: false,
    createdAt: SEED_START,
  },
  {
    id: 'h4',
    title: 'Jalan pagi 30 menit',
    desc: 'Putaran kompleks dua kali sambil mendengarkan podcast. Jaga tempo ringan — ini jalan santai, bukan lomba.',
    cat: 'Kesehatan',
    schedule: [],
    weeklyTarget: 4,
    reminder: null,
    archived: false,
    createdAt: SEED_START,
  },
  {
    id: 'h5',
    title: 'Belajar kosakata baru',
    desc: 'Lima kosakata baru lengkap dengan contoh kalimat, lalu ulangi kosakata kemarin lewat kartu acak sampai lancar.',
    cat: 'Belajar',
    schedule: [],
    weeklyTarget: 7,
    reminder: '19:30',
    archived: false,
    createdAt: SEED_START,
  },
  {
    id: 'h6',
    title: 'Rapikan meja kerja',
    desc: 'Kosongkan meja dari kertas berserakan, lap layar laptop, dan kembalikan setiap barang ke tempatnya masing-masing.',
    cat: 'Pribadi',
    schedule: [0, 6],
    weeklyTarget: 2,
    reminder: null,
    archived: false,
    createdAt: SEED_START,
  },
]

const SEED_NOTES: Note[] = [
  {
    id: 'n1',
    title: 'Ritual Pagi yang Tenang',
    body: 'Bangun jam 5.30 tanpa langsung membuka ponsel. Air putih, peregangan singkat, lalu menulis tiga hal yang disyukuri.',
    date: '15 Jun',
    pinned: true,
    tone: 1,
    folder: 'pribadi',
  },
  {
    id: 'n2',
    title: 'Ide Fitur Rutina 2.0',
    body: 'Mode fokus dengan timer pomodoro, laporan mingguan yang bisa diekspor, dan widget streak di layar utama.',
    date: '13 Jun',
    pinned: false,
    tone: 0,
    folder: 'ide',
  },
  {
    id: 'n3',
    title: 'Refleksi: Pekan ke-3',
    body: 'Konsistensi mulai terasa. Meditasi jadi lebih mudah dan otak tidak lagi menolak saat bangun pagi.',
    date: '12 Jun',
    pinned: false,
    tone: 2,
    folder: 'pribadi',
  },
  {
    id: 'n4',
    title: 'Bahan Bacaan Bulan Ini',
    body: 'Atomic Habits (ulang bab 3), Deep Work, dan artikel tentang kebiasaan digital minimalis.',
    date: '10 Jun',
    pinned: false,
    tone: 1,
    folder: 'bacaan',
  },
  {
    id: 'n5',
    title: 'Yang Aku Syukuri Hari Ini',
    body: 'Es kopi di warung pojok, obrolan singkat dengan Ibu, dan hujan sore yang tepat waktu.',
    date: '9 Jun',
    pinned: true,
    tone: 0,
    folder: 'pribadi',
  },
  {
    id: 'n6',
    title: 'Rencana Proyek Desain',
    body: 'Kumpulkan referensi moodboard earth tone, sketsa tiga arah layout, lalu uji kontras warna.',
    date: '7 Jun',
    pinned: false,
    tone: 2,
    folder: 'kerja',
  },
]

/* ===== Domain Keuangan ===== */

/** Transfer antar-dompet: uang berpindah, BUKAN pemasukan/pengeluaran —
 *  dikecualikan dari seluruh statistik arus kas & anggaran. */
export type TxType = 'masuk' | 'keluar' | 'transfer'
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

export type FinPeriod = 'minggu' | 'bulan' | 'tahun'

/** Jadwal transaksi berulang — salinan berikutnya tercatat otomatis
 *  saat jadwalnya tiba (materializeRecurring). */
export type Recurrence = 'mingguan' | 'bulanan'

export interface Tx {
  id: string
  type: TxType
  cat: FinCat
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
}

/* ===== Domain Bugar — latihan beban & kardio (dari Rutina v3) ===== */

export type WorkoutKind = 'beban' | 'jalan' | 'lari'

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
  /** Jarak dalam km — khusus kardio (jalan/lari). */
  distance?: number
}

export interface WorkoutInput {
  kind: WorkoutKind
  date: string
  duration: number
  note: string
  sets: WorkoutSet[]
  distance?: number
}

/** Praisai lembar sesi: gerakan + target set & repetisi (dari program
 *  atau pustaka) — beban tetap diisi pengguna / diambil dari histori. */
export interface WorkoutSeed {
  name: string
  count: number
  reps: number
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

/* ===== Domain Bugar — tubuh & pemulihan ===== */

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

const SEED_WALLETS: Wallet[] = [
  { id: 'w-tunai', name: 'Tunai', initial: 350_000 },
  { id: 'w-bank', name: 'Rekening Bank', initial: 2_000_000 },
]

const SEED_TXS: Tx[] = (() => {
  /* Tanggal relatif terhadap HARI INI — data demo selalu segar: pekan
     berjalan selalu terisi, filter periode tidak pernah kedaluwarsa. */
  const t = todayISO()
  const d = (back: number) => addDaysISO(t, -back)
  const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(fromISO(t))
  return [
    // Pemasukan — gaji di awal bulan berjalan, sisanya relatif pekan ini
    { id: 'f-in-1', type: 'masuk', cat: 'gaji', amount: 8_500_000, note: `Gaji bulan ${monthName}`, ts: t.slice(0, 8) + '01', walletId: 'w-bank' },
    { id: 'f-in-2', type: 'masuk', cat: 'proyek', amount: 1_250_000, note: 'Desain logo klien', ts: d(6), walletId: 'w-bank' },
    { id: 'f-in-3', type: 'masuk', cat: 'bonus', amount: 300_000, note: 'Referral proyek', ts: t, walletId: 'w-tunai' },
    // Transfer antar-dompet — bukan arus kas
    { id: 'f-tr-1', type: 'transfer', cat: 'transfer', amount: 500_000, note: 'Tarik tunai ATM', ts: d(5), walletId: 'w-bank', toWalletId: 'w-tunai' },
    // Pengeluaran — pekan-pekan sebelumnya
    { id: 'f-ex-1', type: 'keluar', cat: 'makan', amount: 45_000, note: 'Sarapan oatmeal & kopi', ts: d(18), walletId: 'w-tunai' },
    { id: 'f-ex-2', type: 'keluar', cat: 'transport', amount: 25_000, note: 'Ojek ke kantor', ts: d(17), walletId: 'w-tunai' },
    { id: 'f-ex-3', type: 'keluar', cat: 'hiburan', amount: 54_000, note: 'Langganan streaming', ts: d(16), walletId: 'w-bank', recurrence: 'bulanan' },
    { id: 'f-ex-4', type: 'keluar', cat: 'tagihan', amount: 350_000, note: 'Token listrik', ts: d(15), walletId: 'w-bank' },
    { id: 'f-ex-5', type: 'keluar', cat: 'belanja', amount: 425_000, note: 'Belanja mingguan', ts: d(14), walletId: 'w-bank' },
    { id: 'f-ex-6', type: 'keluar', cat: 'makan', amount: 128_000, note: 'Makan malam keluarga', ts: d(12), walletId: 'w-tunai' },
    { id: 'f-ex-7', type: 'keluar', cat: 'kesehatan', amount: 75_000, note: 'Vitamin & suplemen', ts: d(11), walletId: 'w-bank' },
    { id: 'f-ex-8', type: 'keluar', cat: 'transport', amount: 60_000, note: 'Isi bensin', ts: d(10), walletId: 'w-tunai' },
    { id: 'f-ex-9', type: 'keluar', cat: 'makan', amount: 32_000, note: 'Nasi goreng bangka', ts: d(9), walletId: 'w-tunai' },
    { id: 'f-ex-10', type: 'keluar', cat: 'hiburan', amount: 120_000, note: 'Tiket bioskop', ts: d(8), walletId: 'w-tunai' },
    { id: 'f-ex-11', type: 'keluar', cat: 'belanja', amount: 189_000, note: 'Buku & alat tulis', ts: d(7), walletId: 'w-bank' },
    // Pengeluaran — pekan berjalan
    { id: 'f-ex-12', type: 'keluar', cat: 'makan', amount: 52_000, note: 'Kopi & roti pagi', ts: d(4), walletId: 'w-tunai' },
    { id: 'f-ex-13', type: 'keluar', cat: 'transport', amount: 18_000, note: 'KRL ke kantor', ts: d(3), walletId: 'w-tunai' },
    { id: 'f-ex-14', type: 'keluar', cat: 'makan', amount: 65_000, note: 'Makan siang tim', ts: d(2), walletId: 'w-tunai' },
    { id: 'f-ex-15', type: 'keluar', cat: 'hiburan', amount: 45_000, note: 'Arcade sore', ts: d(1), walletId: 'w-tunai' },
    { id: 'f-ex-16', type: 'keluar', cat: 'makan', amount: 38_000, note: 'Es kopi sore', ts: t, walletId: 'w-tunai' },
  ]
})()

const SEED_GOALS: Goal[] = [
  { id: 'g-1', name: 'Dana Darurat', target: 20_000_000, saved: 13_500_000 },
  { id: 'g-2', name: 'Laptop Baru', target: 15_000_000, saved: 6_750_000 },
  { id: 'g-3', name: 'Liburan Akhir Tahun', target: 10_000_000, saved: 2_400_000 },
]

/* ===== Tema layar — kanvas utama seragam Warm Sand =====
   Orientasi pengguna tetap stabil antar tab: background konsisten,
   identitas warna tiap tab hidup pada ikon, pil, dan kartu konten. */

export const SCREEN_THEME: Record<Screen, { bg: string }> = {
  beranda: { bg: '#FAF9F6' },
  bugar: { bg: '#FAF9F6' },
  jurnal: { bg: '#FAF9F6' },
  keuangan: { bg: '#FAF9F6' },
  statistik: { bg: '#FAF9F6' },
  profil: { bg: '#FAF9F6' },
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
  /** Tanggal yang sedang dilihat di kalender Beranda (ISO). */
  selectedDate: string
  habitSheetMode: HabitSheetMode
  habitSheetId: string | null
  notes: Note[]
  quoteSaved: boolean
  mood: string | null
  expandedTaskId: string | null
  readingNoteId: string | null
  celebrating: boolean
  bonusClaimed: boolean
  dailyGoal: number
  /** Mode data contoh — true selagi pengguna masih melihat seed demo;
   *  sekali pengguna memilih (mulai bersih / pakai contoh), false selamanya. */
  demoMode: boolean
  /* Keuangan */
  txs: Tx[]
  goals: Goal[]
  wallets: Wallet[]
  budgets: Budgets
  finPeriod: FinPeriod
  txSheetOpen: boolean
  transferSheetOpen: boolean
  walletDialogOpen: boolean
  goalSheetId: string | null
  goalDialogOpen: boolean
  expandedTxId: string | null
  /* Bugar */
  workouts: Workout[]
  workoutSheetOpen: boolean
  /** Praisai lembar sesi saat dibuka dari program/pustaka. */
  workoutSheetSeed: WorkoutSeed[] | null
  /* Bugar — asupan */
  foodEntries: FoodEntry[]
  foodSheetOpen: boolean
  /** Target energi harian (kkal) — dasar neraca kalori. */
  calorieTarget: number
  /* Bugar — tubuh */
  bodyLogs: BodyLogs
  /* Papan sistem desain — overlay spesifikasi visual (UI state, tak dipersist) */
  boardOpen: boolean
  openBoard: () => void
  closeBoard: () => void
  setScreen: (screen: Screen) => void
  setFinPeriod: (p: FinPeriod) => void
  openTxSheet: () => void
  closeTxSheet: () => void
  addTx: (input: {
    type: TxType
    cat: FinCat
    amount: number
    note: string
    walletId?: string
    recurrence?: Recurrence | null
  }) => void
  deleteTx: (id: string) => void
  toggleExpandedTx: (id: string) => void
  /* Dompet & transfer */
  addWallet: (name: string, initial: number) => void
  openTransferSheet: () => void
  closeTransferSheet: () => void
  addTransfer: (input: {
    fromId: string
    toId: string
    amount: number
    note: string
  }) => void
  openWalletDialog: () => void
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
  /* Aksi bugar */
  openWorkoutSheet: (seed?: WorkoutSeed[]) => void
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
  logBodyCheckIn: (input: { sleepH?: number; energy?: number }) => void
  setJournalFilter: (filter: FolderKey | 'semua') => void
  openFolder: (folder: FolderKey) => void
  openCompose: (folder?: FolderKey) => void
  closeCompose: () => void
  /* Aksi kebiasaan */
  setSelectedDate: (iso: string) => void
  toggleHabit: (id: string, dateISO: string) => void
  addHabit: (input: HabitInput) => void
  updateHabit: (id: string, patch: Partial<HabitInput>) => void
  setHabitArchived: (id: string, archived: boolean) => void
  deleteHabit: (id: string) => void
  openHabitCreate: () => void
  openHabitEdit: (id: string) => void
  closeHabitSheet: () => void
  addNote: (input: { title: string; body: string; folder: FolderKey }) => void
  togglePin: (id: string) => void
  deleteNote: (id: string) => void
  saveQuote: () => void
  setMood: (mood: string | null) => void
  toggleExpandedTask: (id: string) => void
  openReading: (id: string) => void
  closeReading: () => void
  setCelebrating: (v: boolean) => void
  claimBonus: () => void
  setDailyGoal: (n: number) => void
  /* Aksi data contoh */
  startFresh: () => void
  keepSample: () => void
}

export const useRutina = create<RutinaState>()(
  persist(
    (set, get) => ({
  screen: 'beranda',
  prevScreen: 'beranda',
  journalFilter: 'semua',
  composeOpen: false,
  composeFolder: 'pribadi',
  habits: SEED_HABITS,
  completions: buildSeedCompletions(SEED_HABITS),
  selectedDate: todayISO(),
  habitSheetMode: 'closed',
  habitSheetId: null,
  notes: SEED_NOTES,
  quoteSaved: false,
  mood: null,
  expandedTaskId: null,
  readingNoteId: null,
  celebrating: false,
  bonusClaimed: false,
  dailyGoal: 4,
  demoMode: true,

  /* Keuangan */
  txs: SEED_TXS,
  goals: SEED_GOALS,
  wallets: SEED_WALLETS,
  budgets: { ...DEFAULT_BUDGETS },
  finPeriod: 'bulan',
  txSheetOpen: false,
  transferSheetOpen: false,
  walletDialogOpen: false,
  goalSheetId: null,
  goalDialogOpen: false,
  expandedTxId: null,
  /* Bugar */
  workouts: [],
  workoutSheetOpen: false,
  workoutSheetSeed: null,
  foodEntries: [],
  foodSheetOpen: false,
  calorieTarget: 2000,
  bodyLogs: {},
  boardOpen: false,

  openBoard: () => set({ boardOpen: true }),

  closeBoard: () => set({ boardOpen: false }),

  setScreen: (screen) =>
    set((s) => ({ screen, prevScreen: s.screen })),

  setFinPeriod: (finPeriod) => set({ finPeriod }),

  openTxSheet: () => set({ txSheetOpen: true }),

  closeTxSheet: () => set({ txSheetOpen: false }),

  addTx: ({ type, cat, amount, note, walletId, recurrence }) =>
    set((s) => ({
      txs: [
        {
          id: `tx-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
          type,
          cat,
          amount,
          note: note.trim(),
          ts: todayFinISO(),
          walletId,
          recurrence: recurrence ?? null,
        },
        ...s.txs,
      ],
    })),

  /* --- Dompet & transfer --- */

  addWallet: (name, initial) =>
    set((s) => ({
      wallets: [
        ...s.wallets,
        { id: `w-${Date.now()}`, name: name.trim(), initial },
      ],
      walletDialogOpen: false,
    })),

  openTransferSheet: () => set({ transferSheetOpen: true }),

  closeTransferSheet: () => set({ transferSheetOpen: false }),

  /** Transfer antar-dompet — tercatat sebagai tipe 'transfer' yang
   *  TIDAK dihitung sebagai pemasukan/pengeluaran di statistik. */
  addTransfer: ({ fromId, toId, amount, note }) =>
    set((s) => ({
      txs: [
        {
          id: `tx-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
          type: 'transfer' as const,
          cat: 'transfer' as const,
          amount,
          note: note.trim(),
          ts: todayFinISO(),
          walletId: fromId,
          toWalletId: toId,
          recurrence: null,
        },
        ...s.txs,
      ],
      transferSheetOpen: false,
    })),

  openWalletDialog: () => set({ walletDialogOpen: true }),

  closeWalletDialog: () => set({ walletDialogOpen: false }),

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
   *  salinan baru melanjutkan rantai lewat recurOf. */
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
        while (due <= today && added < 200) {
          next.unshift({
            ...tpl,
            id: `tx-${Date.now()}-${added}-${Math.floor(Math.random() * 1e4)}`,
            ts: due,
            recurOf: tpl.id,
          })
          added++
          cursor = due
          due = step(cursor)
        }
      }
      return added > 0 ? { txs: next } : {}
    }),

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
        g.id === id ? { ...g, saved: g.saved + amount } : g,
      ),
    })),

  openGoalDialog: () => set({ goalDialogOpen: true }),

  closeGoalDialog: () => set({ goalDialogOpen: false }),

  addGoal: (name, target) =>
    set((s) => ({
      goals: [
        ...s.goals,
        { id: `goal-${Date.now()}`, name: name.trim(), target, saved: 0 },
      ],
    })),

  /* --- Aksi bugar --- */

  openWorkoutSheet: (seed) =>
    set({ workoutSheetOpen: true, workoutSheetSeed: seed ?? null }),

  closeWorkoutSheet: () =>
    set({ workoutSheetOpen: false, workoutSheetSeed: null }),

  addWorkout: ({ kind, date, duration, note, sets, distance }) =>
    set((s) => ({
      workouts: [
        {
          id: `wo-${Date.now()}`,
          kind,
          date,
          duration,
          note: note.trim(),
          sets: sets.map((x) => ({ ...x })),
          distance,
        },
        ...s.workouts,
      ],
      workoutSheetOpen: false,
      workoutSheetSeed: null,
    })),

  deleteWorkout: (id) =>
    set((s) => ({
      workouts: s.workouts.filter((w) => w.id !== id),
    })),

  /* --- Aksi asupan --- */

  openFoodSheet: () => set({ foodSheetOpen: true }),

  closeFoodSheet: () => set({ foodSheetOpen: false }),

  addFoodEntry: (input) =>
    set((s) => ({
      foodEntries: [
        { id: `fd-${Date.now()}-${Math.floor(Math.random() * 1e4)}`, ...input },
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

  logBodyCheckIn: ({ sleepH, energy }) =>
    set((s) => {
      const key = todayISO()
      const cur = s.bodyLogs[key] ?? { water: 0 }
      const next: BodyLog = { ...cur }
      if (sleepH !== undefined) next.sleepH = sleepH
      if (energy !== undefined) next.energy = energy
      return { bodyLogs: { ...s.bodyLogs, [key]: next } }
    }),

  setJournalFilter: (journalFilter) => set({ journalFilter }),

  openFolder: (folder) => set({ screen: 'jurnal', journalFilter: folder }),

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
      if (day[id]) {
        delete day[id]
      } else {
        day[id] = true
      }
      const completions = { ...s.completions, [dateISO]: day }
      /* Buang objek hari yang kosong agar histori tetap bersih. */
      if (Object.keys(day).length === 0) delete completions[dateISO]
      return { completions }
    })
  },

  addHabit: (input) =>
    set((s) => ({
      habits: [
        ...s.habits,
        {
          id: `habit-${Date.now()}`,
          title: input.title.trim(),
          desc: input.desc.trim(),
          cat: input.cat,
          schedule: [...input.schedule].sort((a, b) => a - b),
          weeklyTarget: input.weeklyTarget,
          reminder: input.reminder,
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
        if (patch.title !== undefined) next.title = patch.title.trim()
        if (patch.desc !== undefined) next.desc = patch.desc.trim()
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
      return {
        habits: s.habits.filter((h) => h.id !== id),
        completions,
        expandedTaskId: s.expandedTaskId === id ? null : s.expandedTaskId,
        habitSheetId: s.habitSheetId === id ? null : s.habitSheetId,
        habitSheetMode:
          s.habitSheetId === id ? 'closed' : s.habitSheetMode,
      }
    }),

  openHabitCreate: () => set({ habitSheetMode: 'create', habitSheetId: null }),

  openHabitEdit: (id) => set({ habitSheetMode: 'edit', habitSheetId: id }),

  closeHabitSheet: () => set({ habitSheetMode: 'closed', habitSheetId: null }),

  addNote: ({ title, body, folder }) =>
    set((s) => ({
      notes: [
        {
          id: `note-${Date.now()}`,
          title,
          body: body || 'Catatan kosong — lanjutkan menulis nanti.',
          date: 'Hari ini',
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

  deleteNote: (id) =>
    set((s) => ({
      notes: s.notes.filter((n) => n.id !== id),
      readingNoteId: s.readingNoteId === id ? null : s.readingNoteId,
    })),

  saveQuote: () => {
    if (get().quoteSaved) return
    set((s) => ({
      quoteSaved: true,
      notes: [
        {
          id: `quote-${Date.now()}`,
          title: 'Kutipan Hari Ini',
          body: `"${QUOTE_TEXT}" — ${QUOTE_AUTHOR}`,
          date: 'Hari ini',
          pinned: true,
          tone: 1,
          folder: 'bacaan',
        },
        ...s.notes,
      ],
    }))
  },

  setMood: (mood) => set({ mood }),

  toggleExpandedTask: (id) =>
    set((s) => ({
      expandedTaskId: s.expandedTaskId === id ? null : id,
    })),

  openReading: (id) => set({ readingNoteId: id }),

  closeReading: () => set({ readingNoteId: null }),

  setCelebrating: (celebrating) => set({ celebrating }),

  claimBonus: () => {
    if (get().bonusClaimed) return
    set({ bonusClaimed: true })
  },

  setDailyGoal: (dailyGoal) => set({ dailyGoal }),

  /* --- Aksi data contoh --- */

  /** Mulai bersih: buang seluruh data contoh & histori yang melekat —
   *  pengguna baru tanpa data, jujur dari nol. Preferensi (dailyGoal)
   *  dipertahankan karena bukan data domain. */
  startFresh: () =>
    set({
      demoMode: false,
      habits: [],
      completions: {},
      notes: [],
      txs: [],
      goals: [],
      mood: null,
      bonusClaimed: false,
      quoteSaved: false,
      selectedDate: todayISO(),
    }),

  /** Pertahankan data contoh sebagai titik awal milik pengguna —
   *  banner tidak lagi tampil, angka dianggap milik pengguna sendiri. */
  keepSample: () => set({ demoMode: false }),
    }),
    {
      /* Persistensi lokal — histori pengguna nyata & permanen di perangkat,
         selaras dengan janji "data tersimpan di perangkat" pada FAQ Profil. */
      name: 'rutina-2.0-store',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      /* Rehidrasi manual pasca-mount (pola aman Next.js SSR): HTML server
         dirender dari seed, lalu state tersimpan dipulihkan di klien —
         bebas hydration mismatch. RutinaApp memanggil rehydrate(). */
      skipHydration: true,
      /* Hanya state domain yang dipersist — state UI sesaat (tab aktif,
         sheet terbuka, item terkembangi) selalu mulai segar. */
      partialize: (s) => ({
        demoMode: s.demoMode,
        habits: s.habits,
        completions: s.completions,
        notes: s.notes,
        txs: s.txs,
        goals: s.goals,
        wallets: s.wallets,
        budgets: s.budgets,
        workouts: s.workouts,
        foodEntries: s.foodEntries,
        calorieTarget: s.calorieTarget,
        bodyLogs: s.bodyLogs,
        dailyGoal: s.dailyGoal,
        mood: s.mood,
        bonusClaimed: s.bonusClaimed,
        quoteSaved: s.quoteSaved,
      }),
    },
  ),
)
