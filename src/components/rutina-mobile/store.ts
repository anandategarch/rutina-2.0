import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/* ===== Tipe & data demo (deterministik, tanpa Math.random) ===== */

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
}

/** completions[tanggalISO][habitId] = true — sumber tunggal histori. */
export type Completions = Record<string, Record<string, boolean>>

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
    restDays: [],
    afterId: null,
    mini: 'Duduk tegak dan tarik tiga napas dalam',
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
    restDays: [],
    afterId: null,
    mini: 'Buka laporan dan baca satu baris angka',
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
    restDays: [],
    afterId: 'h1',
    mini: 'Baca satu halaman',
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
    restDays: [],
    afterId: null,
    mini: 'Pakai sepatu dan berdiri di depan pintu',
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
    restDays: [],
    afterId: 'h3',
    mini: 'Baca arti satu kosakata baru',
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
    restDays: [],
    afterId: null,
    mini: 'Rapikan satu barang di meja',
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
}


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
  /* Preferensi UI lintas-layar — dipersist lokal, tak disinkronkan */
  uiPrefs: UiPrefs
  setUiPref: (patch: Partial<UiPrefs>) => void
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
  logBodyCheckIn: (input: {
    sleepH?: number
    energy?: number
    soreness?: number
    stress?: number
  }) => void
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
  quoteSavedDate: null,
  quoteOffset: 0,
  quoteDate: null,
  mood: null,
  moodLogs: {},
  identityText: '',
  deloadUntil: null,
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

  /* Preferensi UI — merge dangkal; tidak memicu push sinkronisasi
     (bukan bagian DOMAIN_KEYS). */
  uiPrefs: {
    bugarTab: 'latihan',
    finTab: 'ringkasan',
    chartPeriod: 'bulan',
    mutasiFilter: 'semua',
    statsPeriod: 'pekan',
  },

  setUiPref: (patch) =>
    set((s) => ({ uiPrefs: { ...s.uiPrefs, ...patch } })),

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
        while (due <= today && added < 200) {
          next.unshift({
            ...tpl,
            id: `tx-${Date.now()}-${added}-${Math.floor(Math.random() * 1e4)}`,
            ts: due,
            recurOf: tpl.id,
          })
          added++
          planned = due
          cursor = due
          due = step(cursor)
        }
        if (added > 0) {
          /* Majukan templat itu sendiri ke due terakhir yang direncanakan
             sehingga penghapusan salinan tidak memundurkan kursor. */
          const i = next.findIndex((t) => t.id === tpl.id)
          if (i >= 0) next[i] = { ...next[i], ts: planned }
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
          restDays: [...(input.restDays ?? [])].sort(),
          afterId: input.afterId || null,
          mini: (input.mini ?? '').trim(),
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
        if (patch.mini !== undefined) next.mini = patch.mini.trim()
        if (patch.afterId !== undefined) next.afterId = patch.afterId || null
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
    const today = todayISO()
    if (get().quoteSavedDate === today) return
    const q = get().currentQuote()
    set((s) => ({
      quoteSaved: true,
      quoteSavedDate: today,
      notes: [
        {
          id: `quote-${Date.now()}`,
          title: 'Kutipan Hari Ini',
          body: `"${q.text}" — ${q.author}`,
          date: 'Hari ini',
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
      version: 2,
      storage: createJSONStorage(() => localStorage),
      /* Rehidrasi manual pasca-mount (pola aman Next.js SSR): HTML server
         dirender dari seed, lalu state tersimpan dipulihkan di klien —
         bebas hydration mismatch. RutinaApp memanggil rehydrate(). */
      skipHydration: true,
      /* Migrasi v1 → v2: isi field baru (Jeda Runtun, Susun Kebiasaan,
         Versi 2 Menit, moodLogs, identitas, deload, kutipan harian). */
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
          }))
        }
        if (!p.moodLogs || typeof p.moodLogs !== 'object') p.moodLogs = {}
        if (typeof p.identityText !== 'string') p.identityText = ''
        if (typeof p.deloadUntil !== 'string') p.deloadUntil = null
        if (typeof p.quoteSavedDate !== 'string') p.quoteSavedDate = null
        return p as unknown as RutinaState
      },
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
        moodLogs: s.moodLogs,
        identityText: s.identityText,
        deloadUntil: s.deloadUntil,
        bonusClaimed: s.bonusClaimed,
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
