import { create } from 'zustand'

/* ===== Tipe & data demo (deterministik, tanpa Math.random) ===== */

export type Screen =
  | 'beranda'
  | 'jurnal'
  | 'keuangan'
  | 'statistik'
  | 'profil'
export type FolderKey = 'kerja' | 'ide' | 'bacaan' | 'pribadi'

export interface Task {
  id: string
  title: string
  cat?: string
  streak?: number
  done: boolean
  desc: string
  /** Riwayat 14 hari terakhir untuk detail tugas. */
  history: boolean[]
}

export interface Note {
  id: string
  title: string
  body: string
  date: string
  pinned: boolean
  tone: number
  folder: FolderKey
}

export const FOLDERS: { key: FolderKey; label: string; count: number }[] = [
  { key: 'kerja', label: 'Kerja', count: 12 },
  { key: 'ide', label: 'Ide & Gagasan', count: 8 },
  { key: 'bacaan', label: 'Bacaan', count: 5 },
  { key: 'pribadi', label: 'Pribadi', count: 9 },
]

/** Label pendek folder untuk chip filter jurnal. */
export const FOLDER_SHORT: Record<FolderKey, string> = {
  kerja: 'Kerja',
  ide: 'Ide',
  bacaan: 'Bacaan',
  pribadi: 'Pribadi',
}

export const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
/** Jam fokus Senin–Minggu; total 14,5 jam. */
export const FOCUS = [1.5, 2.2, 1.8, 2.0, 2.4, 2.0, 2.6]
/** Agregat fokus 4 pekan (untuk tab "Bulan" di Statistik). */
export const FOCUS_MONTH = [
  { label: 'P1', value: 11.2 },
  { label: 'P2', value: 12.8 },
  { label: 'P3', value: 13.5 },
  { label: 'P4', value: 14.5 },
]

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

/* ===== Domain Keuangan ===== */

export type TxType = 'masuk' | 'keluar'
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

export type FinPeriod = 'minggu' | 'bulan' | 'tahun'

export interface Tx {
  id: string
  type: TxType
  cat: FinCat
  amount: number
  note: string
  /** Tanggal ISO (yyyy-mm-dd) — dasar pengelompokan grafik & filter. */
  ts: string
}

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
}

/** "Hari ini" versi demo — transaksi baru dicap tanggal ini
 *  agar selalu masuk ke pekan berjalan (16–22 Jun). */
export const TODAY_FIN = '2025-06-20'

/** Anggaran bulanan per kategori (Juni) — statis, hanya dibaca. */
export const BUDGETS: { cat: FinCat; limit: number }[] = [
  { cat: 'makan', limit: 750_000 },
  { cat: 'transport', limit: 400_000 },
  { cat: 'belanja', limit: 800_000 },
  { cat: 'hiburan', limit: 300_000 },
  { cat: 'tagihan', limit: 1_000_000 },
  { cat: 'kesehatan', limit: 200_000 },
]

const SEED_TXS: Tx[] = [
  // Pemasukan
  { id: 'f-in-1', type: 'masuk', cat: 'gaji', amount: 8_500_000, note: 'Gaji bulan Juni', ts: '2025-06-01' },
  { id: 'f-in-2', type: 'masuk', cat: 'proyek', amount: 1_250_000, note: 'Desain logo klien', ts: '2025-06-14' },
  { id: 'f-in-3', type: 'masuk', cat: 'bonus', amount: 300_000, note: 'Referral proyek', ts: '2025-06-20' },
  // Pengeluaran — P1 & P2
  { id: 'f-ex-1', type: 'keluar', cat: 'makan', amount: 45_000, note: 'Sarapan oatmeal & kopi', ts: '2025-06-02' },
  { id: 'f-ex-2', type: 'keluar', cat: 'transport', amount: 25_000, note: 'Ojek ke kantor', ts: '2025-06-03' },
  { id: 'f-ex-3', type: 'keluar', cat: 'hiburan', amount: 54_000, note: 'Langganan streaming', ts: '2025-06-04' },
  { id: 'f-ex-4', type: 'keluar', cat: 'tagihan', amount: 350_000, note: 'Token listrik', ts: '2025-06-05' },
  { id: 'f-ex-5', type: 'keluar', cat: 'belanja', amount: 425_000, note: 'Belanja mingguan', ts: '2025-06-06' },
  { id: 'f-ex-6', type: 'keluar', cat: 'makan', amount: 128_000, note: 'Makan malam keluarga', ts: '2025-06-08' },
  { id: 'f-ex-7', type: 'keluar', cat: 'kesehatan', amount: 75_000, note: 'Vitamin & suplemen', ts: '2025-06-09' },
  { id: 'f-ex-8', type: 'keluar', cat: 'transport', amount: 60_000, note: 'Isi bensin', ts: '2025-06-10' },
  { id: 'f-ex-9', type: 'keluar', cat: 'makan', amount: 32_000, note: 'Nasi goreng bangka', ts: '2025-06-11' },
  { id: 'f-ex-10', type: 'keluar', cat: 'hiburan', amount: 120_000, note: 'Tiket bioskop', ts: '2025-06-12' },
  { id: 'f-ex-11', type: 'keluar', cat: 'belanja', amount: 189_000, note: 'Buku & alat tulis', ts: '2025-06-13' },
  // Pengeluaran — pekan berjalan (P3)
  { id: 'f-ex-12', type: 'keluar', cat: 'makan', amount: 52_000, note: 'Kopi & roti pagi', ts: '2025-06-16' },
  { id: 'f-ex-13', type: 'keluar', cat: 'transport', amount: 18_000, note: 'KRL ke kantor', ts: '2025-06-17' },
  { id: 'f-ex-14', type: 'keluar', cat: 'makan', amount: 65_000, note: 'Makan siang tim', ts: '2025-06-18' },
  { id: 'f-ex-15', type: 'keluar', cat: 'hiburan', amount: 45_000, note: 'Arcade sore', ts: '2025-06-19' },
  { id: 'f-ex-16', type: 'keluar', cat: 'makan', amount: 38_000, note: 'Es kopi sore', ts: '2025-06-20' },
]

const SEED_GOALS: Goal[] = [
  { id: 'g-1', name: 'Dana Darurat', target: 20_000_000, saved: 13_500_000 },
  { id: 'g-2', name: 'Laptop Baru', target: 15_000_000, saved: 6_750_000 },
  { id: 'g-3', name: 'Liburan Akhir Tahun', target: 10_000_000, saved: 2_400_000 },
]

/* ===== Tema per layar — kanvas & aksen berbeda di tiap tab =====
   Empat kombinasi warna earth tone yang saling melengkapi:
   Warm Sand (dasar), Matcha (aksen hijau), Deep Espresso (gelap),
   dan Terracotta (aksen hangat) — mengikuti aturan 60-30-10. */

export const SCREEN_THEME: Record<Screen, { bg: string }> = {
  beranda: { bg: '#F5F3EE' },
  jurnal: { bg: '#749B58' },
  keuangan: { bg: '#4A3B32' },
  statistik: { bg: '#231F1E' },
  profil: { bg: '#B25E3F' },
}

/** Riwayat 14 hari deterministik per tugas (aman untuk SSR). */
const hist = (seed: number): boolean[] =>
  Array.from({ length: 14 }, (_, j) => (seed * 7 + j * 3) % 4 !== 0)

const SEED_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Meditasi 10 menit',
    streak: 5,
    done: true,
    desc: 'Duduk dengan punggung tegak, tarik napas 4 hitungan, tahan 4, hembuskan 6. Tutup sesi dengan tiga tarikan napas dalam dan ucapkan satu niat untuk hari ini.',
    history: hist(1),
  },
  {
    id: 't2',
    title: 'Review laporan mingguan',
    cat: 'Kerja',
    done: false,
    desc: 'Bandingkan angka pekan ini dengan target bulanan, tandai tiga temuan utama, lalu siapkan poin pembahasan untuk rapat Senin.',
    history: hist(2),
  },
  {
    id: 't3',
    title: 'Baca 20 halaman buku',
    streak: 12,
    done: true,
    desc: 'Lanjutkan bab tentang disiplin atomik. Catat satu kutipan yang paling relevan dengan pekan ini di jurnal bacaan.',
    history: hist(3),
  },
  {
    id: 't4',
    title: 'Jalan pagi 30 menit',
    cat: 'Kesehatan',
    done: false,
    desc: 'Putaran kompleks dua kali sambil mendengarkan podcast. Jaga tempo ringan — ini jalan santai, bukan lomba.',
    history: hist(4),
  },
  {
    id: 't5',
    title: 'Belajar kosakata baru',
    streak: 21,
    done: false,
    desc: 'Lima kosakata baru lengkap dengan contoh kalimat, lalu ulangi kosakata kemarin lewat kartu acak sampai lancar.',
    history: hist(5),
  },
  {
    id: 't6',
    title: 'Rapikan meja kerja',
    cat: 'Pribadi',
    done: false,
    desc: 'Kosongkan meja dari kertas berserakan, lap layar laptop, dan kembalikan setiap barang ke tempatnya masing-masing.',
    history: hist(6),
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

interface RutinaState {
  screen: Screen
  prevScreen: Screen
  journalFilter: FolderKey | 'semua'
  composeOpen: boolean
  composeFolder: FolderKey
  tasks: Task[]
  notes: Note[]
  quoteSaved: boolean
  mood: string | null
  expandedTaskId: string | null
  readingNoteId: string | null
  celebrating: boolean
  bonusClaimed: boolean
  dailyGoal: number
  /* Keuangan */
  txs: Tx[]
  goals: Goal[]
  finPeriod: FinPeriod
  txSheetOpen: boolean
  goalSheetId: string | null
  goalDialogOpen: boolean
  expandedTxId: string | null
  setScreen: (screen: Screen) => void
  setFinPeriod: (p: FinPeriod) => void
  openTxSheet: () => void
  closeTxSheet: () => void
  addTx: (input: { type: TxType; cat: FinCat; amount: number; note: string }) => void
  deleteTx: (id: string) => void
  toggleExpandedTx: (id: string) => void
  openGoalSheet: (id: string) => void
  closeGoalSheet: () => void
  contributeGoal: (id: string, amount: number) => void
  openGoalDialog: () => void
  closeGoalDialog: () => void
  addGoal: (name: string, target: number) => void
  setJournalFilter: (filter: FolderKey | 'semua') => void
  openFolder: (folder: FolderKey) => void
  openCompose: (folder?: FolderKey) => void
  closeCompose: () => void
  toggleTask: (id: string) => void
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
}

export const useRutina = create<RutinaState>((set, get) => ({
  screen: 'beranda',
  prevScreen: 'beranda',
  journalFilter: 'semua',
  composeOpen: false,
  composeFolder: 'pribadi',
  tasks: SEED_TASKS,
  notes: SEED_NOTES,
  quoteSaved: false,
  mood: null,
  expandedTaskId: null,
  readingNoteId: null,
  celebrating: false,
  bonusClaimed: false,
  dailyGoal: 6,

  /* Keuangan */
  txs: SEED_TXS,
  goals: SEED_GOALS,
  finPeriod: 'bulan',
  txSheetOpen: false,
  goalSheetId: null,
  goalDialogOpen: false,
  expandedTxId: null,

  setScreen: (screen) =>
    set((s) => ({ screen, prevScreen: s.screen })),

  setFinPeriod: (finPeriod) => set({ finPeriod }),

  openTxSheet: () => set({ txSheetOpen: true }),

  closeTxSheet: () => set({ txSheetOpen: false }),

  addTx: ({ type, cat, amount, note }) =>
    set((s) => ({
      txs: [
        {
          id: `tx-${Date.now()}`,
          type,
          cat,
          amount,
          note: note.trim(),
          ts: TODAY_FIN,
        },
        ...s.txs,
      ],
    })),

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

  setJournalFilter: (journalFilter) => set({ journalFilter }),

  openFolder: (folder) => set({ screen: 'jurnal', journalFilter: folder }),

  openCompose: (folder) =>
    set((s) => ({ composeOpen: true, composeFolder: folder ?? s.composeFolder })),

  closeCompose: () => set({ composeOpen: false }),

  toggleTask: (id) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    })),

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
}))
