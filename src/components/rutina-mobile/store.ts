import { create } from 'zustand'

/* ===== Tipe & data demo (deterministik, tanpa Math.random) ===== */

export type Screen = 'beranda' | 'jurnal' | 'statistik' | 'profil'
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

export const MOODS = ['Ceria', 'Baik', 'Biasa', 'Lelah']

export const QUOTE_TEXT =
  'Kebiasaan kecil yang konsisten akan mengalahkan motivasi besar yang sesaat.'
export const QUOTE_AUTHOR = 'James Clear, Atomic Habits'

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
  setScreen: (screen: Screen) => void
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
}

export const useRutina = create<RutinaState>((set, get) => ({
  screen: 'beranda',
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

  setScreen: (screen) => set({ screen }),

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
}))
