import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { useRutina, type FolderKey, type Note } from './store'

/**
 * UI kanvas jurnal + metadata suasana hati per catatan.
 *
 * Mengapa toko mini terpisah: `store.ts` dibekukan (konvensi proyek)
 * padahal model `Note` tidak memiliki field mood, tidak ada aksi
 * `updateNote`, dan ReadingSheet (dipasang di cangkang rutina-app) perlu
 * membuka kanvas menulis. Seluruh state bersama kanvas dipindah ke modul
 * level ini — pola toko zustand modul-level, tanpa menyentuh store utama.
 */

/** Titik warna suasana hati — padanan earth-tone untuk MOODS di store. */
export const MOOD_DOT: Record<string, string> = {
  Ceria: 'bg-gold',
  Baik: 'bg-primary',
  Biasa: 'bg-cocoa/40',
  Lelah: 'bg-espresso/40',
}

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
        date: 'Hari ini',
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
