'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import {
  BatteryLow,
  Bold,
  Check,
  ChevronLeft,
  Italic,
  Laugh,
  Meh,
  Smile,
} from 'lucide-react'
import { toast } from 'sonner'

import { motionTokens } from '@/lib/motion/tokens'

import { createNote, patchNote, useJournalUi } from './journal-ui'
import {
  FOLDERS,
  FOLDER_SHORT,
  MOODS,
  useRutina,
  type FolderKey,
} from './store'
import { playfair } from './serif'
import { useFocusTrap } from './use-focus-trap'

/** Ikon suasana hati — padanan MOODS di store (selaras panel Statistik). */
const MOOD_ICONS: Record<string, typeof Laugh> = {
  Ceria: Laugh,
  Baik: Smile,
  Biasa: Meh,
  Lelah: BatteryLow,
}

/** Jeda tenang sebelum draf benar-benar ditulis ke store (autosave). */
const AUTOSAVE_MS = 800

type SaveStatus = 'idle' | 'saving' | 'saved'

type SaveResult = 'saved' | 'unchanged' | 'skipped' | 'discarded' | 'deleted'

interface Draft {
  title: string
  body: string
  folder: FolderKey
  mood: string | null
}

/**
 * JournalCanvas — mode MENULIS layar penuh: kertas parchment hangat tanpa
 * elemen dasbor, tipografi editorial (judul serif), metadata ringkas
 * (suasana hati + kategori), autosave ber-debounce dengan indikator
 * "Tersimpan", dan bilah format mungil (tebal/miring + hitung kata).
 *
 * Dipasang di tingkat cangkang (lihat compose-sheet.tsx) sehingga overlay
 * absolutnya menutupi seluruh aplikasi termasuk navigasi bawah.
 */
export function JournalCanvas() {
  const open = useJournalUi((s) => s.canvasOpen)
  return (
    <AnimatePresence>
      {open && <CanvasPanel key="journal-canvas" />}
    </AnimatePresence>
  )
}

/* ===== Panel kanvas — dipasang ulang setiap kali dibuka ===== */

function CanvasPanel() {
  const closeCanvas = useJournalUi((s) => s.closeCanvas)
  const setNoteMood = useJournalUi((s) => s.setNoteMood)
  const deleteNote = useRutina((s) => s.deleteNote)

  /* Snapshot sesi — dibaca sekali saat panel dipasang: catatan yang
     disunting (bila ada) + nilai awal seluruh draf. */
  const [session] = useState(() => {
    const editing = useJournalUi.getState().editing
    /* Kategori awal catatan baru mengikuti filter aktif di layar Jurnal. */
    const filter = useRutina.getState().journalFilter
    const fallbackFolder: FolderKey = filter === 'semua' ? 'pribadi' : filter
    const initial: Draft = {
      title: editing?.title ?? '',
      body: editing?.body ?? '',
      folder: editing?.folder ?? fallbackFolder,
      mood: editing
        ? (useJournalUi.getState().noteMoods[editing.id] ?? null)
        : null,
    }
    return { editing, initial }
  })

  const [title, setTitle] = useState(session.initial.title)
  const [body, setBody] = useState(session.initial.body)
  const [folder, setFolder] = useState<FolderKey>(session.initial.folder)
  const [mood, setMood] = useState<string | null>(session.initial.mood)
  const [status, setStatus] = useState<SaveStatus>(
    session.editing ? 'saved' : 'idle',
  )

  const panelRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /* Id catatan yang sudah dibuat/disimpan — null selama masih draf baru. */
  const savedIdRef = useRef<string | null>(session.editing?.id ?? null)
  /* Draf terkini (dibaca oleh timer/unmount, bebas dari closure basi). */
  const draftRef = useRef<Draft>(session.initial)
  /* Draf terakhir yang benar-benar tersimpan — membuat flush idempoten. */
  const lastSavedRef = useRef<Draft | null>(
    session.editing ? session.initial : null,
  )
  const closedRef = useRef(false)

  /* Focus management: fokus awal, trap Tab, kembalikan fokus saat tutup. */
  useFocusTrap(true, panelRef)

  /* Draf selalu sinkron dengan state render terbaru. */
  useEffect(() => {
    draftRef.current = { title, body, folder, mood }
  })

  /**
   * Tulis draf ke store. Idempoten: draf yang identik dengan simpanan
   * terakhir tidak ditulis ulang.
   * - Catatan baru + kosong → dibuang diam-diam (tidak ada catatan hampa).
   * - Catatan lama + dikosongkan → saat flush, catatan dihapus (perilaku
   *   map standar aplikasi catatan); autosave pernah-menyimpan tidak
   *   pernah mengosongkan catatan yang sudah ada.
   */
  const performSave = useCallback(
    (mode: 'auto' | 'flush'): SaveResult => {
      const draft = draftRef.current
      const t = draft.title.trim()
      const b = draft.body
      const savedId = savedIdRef.current

      if (t === '' && b.trim() === '') {
        if (!savedId) return 'discarded'
        if (mode === 'flush') {
          deleteNote(savedId)
          savedIdRef.current = null
          lastSavedRef.current = null
          return 'deleted'
        }
        return 'skipped'
      }

      const next: Draft = {
        title: t,
        body: b,
        folder: draft.folder,
        mood: draft.mood,
      }
      const prev = lastSavedRef.current
      if (
        prev &&
        prev.title === next.title &&
        prev.body === next.body &&
        prev.folder === next.folder &&
        prev.mood === next.mood
      ) {
        return 'unchanged'
      }

      if (!savedId) {
        const id = createNote({
          title: next.title,
          body: next.body,
          folder: next.folder,
        })
        savedIdRef.current = id
        if (next.mood) setNoteMood(id, next.mood)
      } else {
        patchNote(savedId, {
          title: next.title,
          body: next.body,
          folder: next.folder,
        })
        setNoteMood(savedId, next.mood)
      }
      lastSavedRef.current = next
      return 'saved'
    },
    [deleteNote, setNoteMood],
  )

  /* Autosave: setiap suntingan menandai "Menyimpan…" lalu menulis draf
     setelah 800 mdetik sunyi. */
  const scheduleSave = useCallback(() => {
    setStatus('saving')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      try {
        const result = performSave('auto')
        setStatus(result === 'discarded' ? 'idle' : 'saved')
      } catch {
        toast.error('Gagal menyimpan — draf tetap aman di layar ini')
        setStatus('idle')
      }
    }, AUTOSAVE_MS)
  }, [performSave])

  /** Tutup kanvas: flush simpanan terakhir, lalu umpan balik yang jujur. */
  const handleClose = useCallback(() => {
    if (closedRef.current) return
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    let result: SaveResult
    try {
      result = performSave('flush')
    } catch {
      /* Jangan buang draf karena gagal menulis — kanvas dibiarkan terbuka
         supaya tidak ada satu kata pun hilang. */
      toast.error('Gagal menyimpan — draf tetap aman di layar ini')
      return
    }
    closedRef.current = true
    closeCanvas()
    if (result === 'saved' || result === 'unchanged') {
      toast.success('Catatan tersimpan')
    } else if (result === 'deleted') {
      toast('Catatan kosong dihapus')
    }
    /* 'discarded' → hening: tidak ada catatan kosong yang dibuat. */
  }, [performSave, closeCanvas])

  /* Tutup dengan Escape. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleClose])

  /* Jaring pengaman: flush saat lepas pasang tanpa lewat tombol tutup.
     Idempoten — tidak menduplikasi simpanan handleClose. */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (closedRef.current) return
      try {
        performSave('flush')
      } catch {
        /* Draf terakhir gagal ditulis; tidak ada yang bisa dilakukan
           pada titik ini — biarkan senyap. */
      }
    }
  }, [performSave])

  /* Fokus awal: catatan baru → judul; menyunting → lanjut menulis di
     akhir isi (efek ini berjalan setelah focus trap memilih target awal,
     lalu menimpanya dengan target yang lebih tepat). */
  useEffect(() => {
    if (session.editing) {
      const ta = bodyRef.current
      if (ta) {
        const end = ta.value.length
        ta.focus({ preventScroll: true })
        ta.setSelectionRange(end, end)
      }
    } else {
      titleRef.current?.focus({ preventScroll: true })
    }
  }, [session.editing])

  const wordCount =
    body.trim() === '' ? 0 : body.trim().split(/\s+/).length

  /** Bungkus teks terpilih dengan penanda markdown (tebal/miring). */
  const wrapSelection = (marker: string) => {
    const ta = bodyRef.current
    if (!ta) return
    const { selectionStart: start, selectionEnd: end, value } = ta
    const hasSelection = end > start
    setBody(
      value.slice(0, start) +
        marker +
        value.slice(start, end) +
        marker +
        value.slice(end),
    )
    scheduleSave()
    /* Pulihkan fokus & seleksi setelah React menerapkan nilai baru. */
    requestAnimationFrame(() => {
      ta.focus()
      const caret = start + marker.length
      ta.setSelectionRange(
        caret,
        hasSelection ? end + marker.length : caret,
      )
    })
  }

  return (
    <m.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      aria-label={
        session.editing
          ? `Menyunting catatan: ${session.editing.title || 'tanpa judul'}`
          : 'Menulis catatan baru'
      }
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: motionTokens.duration.normal,
        ease: motionTokens.easing.standard,
      }}
      className="absolute inset-0 z-[70] flex flex-col bg-background"
    >
      {/* Bilah atas minimal — kembali, indikator simpan, selesai */}
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-background px-2 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <m.button
          type="button"
          aria-label="Kembali ke jurnal"
          onClick={handleClose}
          whileTap={{ scale: 0.92 }}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
        </m.button>

        <span
          aria-live="polite"
          className="flex min-w-0 items-center justify-center"
        >
          <SaveIndicator status={status} />
        </span>

        <m.button
          type="button"
          onClick={handleClose}
          whileTap={{ scale: 0.95 }}
          className="h-10 shrink-0 cursor-pointer rounded-full bg-primary px-5 text-body font-bold text-primary-foreground shadow-soft transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Selesai
        </m.button>
      </header>

      {/* Kertas menulis — kolom terbatas & lega */}
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar overscroll-contain">
        <div className="mx-auto w-full max-w-[680px] px-5 pb-24 pt-6">
          <m.input
            ref={titleRef}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              scheduleSave()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                bodyRef.current?.focus()
              }
            }}
            placeholder="Judul refleksi…"
            aria-label="Judul catatan"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: 0.05,
              ease: motionTokens.easing.entrance,
            }}
            className={`w-full bg-transparent text-kpi font-semibold tracking-tight text-content-primary outline-none placeholder:text-content-muted/60 sm:text-3xl ${playfair.className}`}
          />

          {/* Metadata — suasana hati + kategori, redup sampai aktif */}
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: 0.1,
              ease: motionTokens.easing.entrance,
            }}
            className="mt-4 space-y-2 border-b border-border/60 pb-4"
          >
            <div className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-chart-label font-semibold uppercase tracking-[0.16em] text-content-muted">
                Suasana
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MOODS.map((moodName) => {
                  const Icon = MOOD_ICONS[moodName]
                  const active = mood === moodName
                  return (
                    <button
                      key={moodName}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setMood(active ? null : moodName)
                        scheduleSave()
                      }}
                      className={
                        'flex h-9 cursor-pointer items-center gap-1 rounded-full px-3 text-meta font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
                        (active
                          ? 'bg-secondary text-primary'
                          : 'text-content-muted hover:bg-surface-secondary hover:text-content-secondary')
                      }
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                      {moodName}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-chart-label font-semibold uppercase tracking-[0.16em] text-content-muted">
                Kategori
              </span>
              <div className="flex flex-wrap gap-1.5">
                {FOLDERS.map((f) => {
                  const active = folder === f.key
                  return (
                    <button
                      key={f.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setFolder(f.key)
                        scheduleSave()
                      }}
                      className={
                        'h-9 cursor-pointer rounded-full px-3 text-meta font-bold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
                        (active
                          ? 'bg-surface-inverse text-content-inverse'
                          : 'border border-border text-content-muted hover:bg-surface-secondary hover:text-content-secondary')
                      }
                    >
                      {FOLDER_SHORT[f.key]}
                    </button>
                  )
                })}
              </div>
            </div>
          </m.div>

          <m.textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => {
              setBody(e.target.value)
              scheduleSave()
            }}
            placeholder="Tulis apa yang ada di pikiranmu…"
            aria-label="Isi catatan"
            rows={8}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: 0.16,
              ease: motionTokens.easing.entrance,
            }}
            className="mt-5 min-h-[38vh] w-full resize-none bg-transparent text-section-lg leading-[1.8] text-content-secondary outline-none [field-sizing:content] placeholder:text-content-muted/70"
          />
        </div>
      </div>

      {/* Bilah format ringkas — tebal, miring, hitung kata */}
      <m.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: motionTokens.duration.normal,
          delay: 0.22,
          ease: motionTokens.easing.standard,
        }}
        className="flex shrink-0 items-center gap-1 border-t border-border/60 bg-background px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-1.5"
      >
        <button
          type="button"
          aria-label="Tebalkan teks terpilih"
          title="Tebal"
          onClick={() => wrapSelection('**')}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Bold className="h-4 w-4" strokeWidth={2.4} />
        </button>
        <button
          type="button"
          aria-label="Miringkan teks terpilih"
          title="Miring"
          onClick={() => wrapSelection('_')}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full font-serif text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Italic className="h-4 w-4" strokeWidth={2.4} />
        </button>
        <span
          aria-live="off"
          className="ml-auto pr-2 text-eyebrow font-semibold uppercase tracking-[0.12em] tabular-nums text-content-muted"
        >
          {wordCount} kata
        </span>
      </m.footer>
    </m.div>
  )
}

/* ===== Indikator autosave ===== */

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null

  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1 text-meta font-semibold text-content-muted">
        Menyimpan
        <span className="flex items-center gap-0.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <m.span
              key={i}
              className="h-1 w-1 rounded-full bg-content-muted"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                delay: i * 0.18,
                ease: 'easeInOut',
              }}
            />
          ))}
        </span>
      </span>
    )
  }

  return (
    <m.span
      key="saved"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionTokens.duration.fast,
        ease: motionTokens.easing.standard,
      }}
      className="flex items-center gap-1.5 text-meta font-semibold text-success"
    >
      <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
      Tersimpan
    </m.span>
  )
}
