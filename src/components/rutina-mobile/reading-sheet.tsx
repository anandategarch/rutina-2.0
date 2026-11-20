'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import { PenLine, Pin, Trash2 } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { fade, sheetSpring } from '@/lib/motion/transitions'
import { CONTENT_W } from './layout-widths'
import { MOOD_DOT, useJournalUi } from './journal-ui'
import { FOLDER_SHORT, useRutina } from './store'
import { playfair } from './serif'
import { useFocusTrap } from './use-focus-trap'
import { motionTokens } from '@/lib/motion/tokens'

/**
 * Sheet baca catatan — MODE BACA yang jelas terpisah dari mode menulis:
 * tipografi editorial (judul serif, ukuran terbaca, langgang), metadata
 * lengkap (kategori, suasana hati, tanggal), lalu aksi "Sunting" yang
 * membuka kanvas menulis di atasnya. Pola drag-to-close sama dengan
 * sheet lain (dibangun manual agar tetap di dalam bingkai ponsel).
 */
export function ReadingSheet() {
  const notes = useRutina((s) => s.notes)
  const readingNoteId = useRutina((s) => s.readingNoteId)
  const closeReading = useRutina((s) => s.closeReading)
  const togglePin = useRutina((s) => s.togglePin)
  const deleteNote = useRutina((s) => s.deleteNote)
  const noteMoods = useJournalUi((s) => s.noteMoods)
  const openCanvas = useJournalUi((s) => s.openCanvas)

  const note = notes.find((n) => n.id === readingNoteId)
  const mood = note ? noteMoods[note.id] : undefined
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  /* Focus management: fokus awal, trap Tab, kembalikan fokus saat tutup. */
  useFocusTrap(Boolean(note), panelRef)

  // Tutup dengan Escape — kecuali kanvas menulis sedang terbuka di atas
  // sheet ini (Escape milik kanvas duluan, sheet menyusul setelahnya).
  useEffect(() => {
    if (!note) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (useJournalUi.getState().canvasOpen) return
      closeReading()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [note, closeReading])

  return (
    <AnimatePresence>
      {note && (
        <>
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={closeReading}
            className="absolute inset-0 z-40 bg-espresso/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
          />
          <m.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            aria-label={`Baca catatan: ${note.title || 'tanpa judul'}`}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) closeReading()
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetSpring}
            className={`absolute inset-x-0 bottom-0 z-50 mx-auto max-h-[calc(100%-1.5rem)] w-full overflow-y-auto no-scrollbar overscroll-contain rounded-t-sheet bg-surface-primary px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-2.5 ${CONTENT_W}`}
          >
            {/* Pegangan seret */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-content-secondary/25" />
            </div>

            {/* Kepala editorial — metadata lalu judul serif */}
            <div className="text-left">
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: motionTokens.duration.enter,
                  delay: motionTokens.delay.step,
                  ease: motionTokens.easing.standard,
                }}
                className="flex flex-wrap items-center gap-1.5"
              >
                <span className="rounded-full bg-secondary px-2.5 py-1 text-chart-label font-semibold uppercase tracking-[0.12em] text-content-secondary">
                  {FOLDER_SHORT[note.folder]}
                </span>
                {mood ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-chart-label font-semibold uppercase tracking-[0.12em] text-content-secondary">
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${MOOD_DOT[mood] ?? 'bg-cocoa/40'}`}
                    />
                    {mood}
                  </span>
                ) : null}
                <span className="text-chart-label font-semibold uppercase tracking-[0.14em] text-content-muted">
                  {note.date}
                </span>
                {note.pinned ? (
                  <Pin
                    className="h-3.5 w-3.5 text-content-secondary"
                    fill="currentColor"
                  />
                ) : null}
              </m.div>
              <m.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  ...motionTokens.preset.panelReveal,
                  ease: motionTokens.easing.entrance,
                  delay: motionTokens.delay.relaxed,
                }}
                className={`${playfair.className} mt-2 text-2xl font-semibold leading-snug tracking-tight text-content-primary`}
              >
                {note.title === '' ? (
                  <span className="italic text-content-muted">
                    Tanpa judul
                  </span>
                ) : (
                  note.title
                )}
              </m.h2>
            </div>

            <m.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                ...motionTokens.preset.panelReveal,
                ease: motionTokens.easing.entrance,
                /* Sekuens editorial baca — blok isi menyusul judul. */
                delay: 0.2,
              }}
              className="mt-5 border-t border-border/60 pt-5"
            >
              <p className="max-w-[62ch] whitespace-pre-wrap text-left text-section-lg leading-[1.85] text-content-secondary">
                {note.body}
              </p>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: motionTokens.duration.enter,
                /* Sekuens editorial baca — aksi menutup sekuens. */
                delay: 0.26,
                ease: motionTokens.easing.standard,
              }}
              className="mt-7 flex gap-2"
            >
              {/* Sunting — buka kanvas menulis di atas sheet ini; saat
                  kanvas ditutup, pembaca kembali dengan isi terbaru. */}
              <Button
                type="button"
                onClick={() => openCanvas(note)}
                className="h-11 flex-[1.3] rounded-full bg-primary font-semibold text-primary-foreground shadow-soft hover:bg-action-hover"
              >
                <PenLine className="h-4 w-4" />
                Sunting
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  togglePin(note.id)
                  toast(
                    note.pinned ? 'Sematan dilepas' : 'Catatan disematkan',
                  )
                }}
                className="h-11 flex-1 rounded-full font-semibold text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
              >
                <Pin
                  className="h-4 w-4"
                  fill={note.pinned ? 'currentColor' : 'none'}
                />
                {note.pinned ? 'Lepas' : 'Sematkan'}
              </Button>

              {/* Konfirmasi hapus — AlertDialog shadcn mencegah salah ketuk */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    className="h-11 flex-1 rounded-full bg-surface-inverse font-semibold text-content-inverse hover:bg-surface-inverse-raised"
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[320px] rounded-2xl border-border p-6 sm:max-w-[320px]">
                  <AlertDialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                      <Trash2 className="h-5 w-5 text-content-danger" />
                    </div>
                    <AlertDialogTitle className="text-center text-lg font-bold tracking-tight text-content-primary">
                      Hapus catatan ini?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center text-note leading-relaxed text-content-muted">
                      Catatan “{note.title || 'tanpa judul'}” akan dihapus
                      permanen dan tidak bisa dikembalikan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row gap-2 sm:justify-center">
                    <AlertDialogCancel className="mt-0 h-10 flex-1 rounded-full border-border text-note font-semibold text-content-secondary hover:bg-surface-sunken hover:text-content-primary">
                      Batal
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        deleteNote(note.id)
                        toast('Catatan dihapus')
                      }}
                      className="h-10 flex-1 rounded-full bg-destructive text-note font-bold text-white hover:bg-destructive/90"
                    >
                      Ya, Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </m.div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
