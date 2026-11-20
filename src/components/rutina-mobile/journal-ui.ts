import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { useRutina, todayISO, type FolderKey, type Note } from './store'

/**
 * UI kanvas jurnal + metadata suasana hati per catatan.
 *
 * Mengapa toko mini terpisah: `store.ts` dibekukan (konvensi proyek)
 * padahal model `Note` tidak memiliki field mood, tidak ada aksi
 * `updateNote`, dan ReadingSheet (dipasang di cangkang rutina-app) perlu
 * membuka kanvas menulis. Seluruh state bersama kanvas dipindah ke modul
 * level ini — pola toko zustand modul-level, tanpa menyentuh store utama.
 */

/**
 * Tone suasana hati — SATU sumber kebenaran lintas layar (Profil & Jurnal):
 * kelas teks (ikon/label mood di Profil) + titik warna (kartu & sheet baca
 * catatan) padanan earth-tone untuk MOODS di store. Semua kelas merujuk
 * token --color-* di globals.css sehingga ikut aman di mode gelap.
 */
export const MOOD_TONE: Record<
  string,
  { text: string; dot: string }
> = {
  /* Label Ceria memakai text-success (matcha tua #4f7440 ≈ 4.6:1 di atas
     parchment) — text-matcha (#749b58) hanya 3.2:1, di bawah ambang WCAG
     AA untuk teks kecil; titik warna non-teks tetap matcha/gold. */
  Ceria: { text: 'text-success', dot: 'bg-gold' },
  Baik: { text: 'text-pistachio', dot: 'bg-primary' },
  Biasa: { text: 'text-content-secondary', dot: 'bg-cocoa/40' },
  Lelah: { text: 'text-content-muted', dot: 'bg-espresso/40' },
}

/** Titik warna suasana hati — diturunkan dari MOOD_TONE (jangan diedit
 *  langsung; tambah/ubah mood lewat MOOD_TONE agar tetap satu sumber). */
export const MOOD_DOT: Record<string, string> = Object.fromEntries(
  Object.entries(MOOD_TONE).map(([mood, tone]) => [mood, tone.dot]),
)

interface JournalUiState {
  /** Kanvas menulis terbuka? */
  canvasOpen: boolean
  /** Catatan yang sedang disunting; null = menulis catatan baru. */
  editing: Note | null
  /** Metadata suasana hati per catatan (id catatan → label mood). */
  noteMoods: Record<string, string>
  openCanvas: (note?: Note | null) => void
  closeCanvas: () => void
  setNoteMood: (id: string, mood: string | null) => void
}

export const useJournalUi = create<JournalUiState>()(
  persist(
    (set) => ({
      canvasOpen: false,
      editing: null,
      noteMoods: {},

      openCanvas: (note) => set({ canvasOpen: true, editing: note ?? null }),

      closeCanvas: () =>
        set((s) => {
          /* Bersihkan metadata mood untuk catatan yang sudah terhapus
             agar penyimpanan lokal tidak membengkak pelan-pelan. */
          const live = new Set(useRutina.getState().notes.map((n) => n.id))
          const noteMoods = Object.fromEntries(
            Object.entries(s.noteMoods).filter(([id]) => live.has(id)),
          )
          return { canvasOpen: false, editing: null, noteMoods }
        }),

      setNoteMood: (id, mood) =>
        set((s) => {
          if (mood === null) {
            const next = { ...s.noteMoods }
            delete next[id]
            return { noteMoods: next }
          }
          return { noteMoods: { ...s.noteMoods, [id]: mood } }
        }),
    }),
    {
      name: 'rutina-2.0-journal-ui',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      /* Rehidrasi manual pasca-mount — pola yang sama dengan store utama
         agar render SSR tidak mismatch; dipanggil dari JournalScreen. */
      skipHydration: true,
      /* Hanya metadata yang dipersist — state kanvas selalu mulai segar. */
      partialize: (s) => ({ noteMoods: s.noteMoods }),
    },
  ),
)

/* ===== Penulisan catatan ===== */

/**
 * Apakah catatan masih berupa draf? Proxy jujur tanpa mengubah model store:
 * kanvas menulis menyimpan catatan TANPA judul sejak autosave pertama
 * (pengguna bisa langsung menulis isi), sedangkan alur cepat compose-sheet
 * selalu meminta judul. Maka "tanpa judul" = lahir dari kanvas dan belum
 * diberi nama — layak ditandai chip "Draft" agar dibedakan dari catatan
 * tersimpan/disematkan di daftar jurnal.
 */
export function isDraftNote(note: Note): boolean {
  return note.title.trim() === ''
}

/** Baris pertama isi catatan — jadi "judul efektif" draf di daftar
 *  (pola aplikasi catatan premium: baris pertama = judul). */
export function noteFirstLine(note: Note): string {
  return note.body.trim().split('\n')[0]?.trim() ?? ''
}

/**
 * Buat catatan baru dan kembalikan id-nya secara sinkron. Meniru `addNote`
 * di store utama persis (skema id, catatan terbaru di depan, tone) namun
 * mengembalikan id — kanvas autosave membutuhkan id itu untuk pembaruan
 * berikutnya tanpa harus membaca ulang daftar catatan.
 */
export function createNote(input: {
  title: string
  body: string
  folder: FolderKey
}): string {
  const id = `note-${Date.now()}`
  useRutina.setState((s) => ({
    notes: [
      {
        id,
        title: input.title,
        body: input.body,
        /* v2.36 (audit visualisasi Tahap 1): ISO yyyy-mm-dd — selaras
           skema JournalNote & addNote di store. Label "Hari ini"
           diturunkan noteDateLabel saat tampil, bukan disimpan, agar
           tanggal historis tidak ikut "tergeser" besok. */
        date: todayISO(),
        pinned: false,
        tone: (s.notes.length * 2) % 3,
        folder: input.folder,
      },
      ...s.notes,
    ],
  }))
  return id
}

/**
 * Perbarui catatan yang sudah ada (judul / isi / kategori) tanpa mengubah
 * id, tanggal, sematan, dan tone. Store utama tidak menyediakan aksi
 * `updateNote`, maka pembaruan memakai setState publik zustand — tetap
 * melewati middleware persist dan sinkronisasi seperti aksi store lain.
 * Mengembalikan false bila catatan sudah tidak ada (terhapus di tengah
 * sesi menulis).
 */
export function patchNote(
  id: string,
  patch: { title?: string; body?: string; folder?: FolderKey },
): boolean {
  useRutina.setState((s) => ({
    notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
  }))
  return useRutina.getState().notes.some((n) => n.id === id)
}
