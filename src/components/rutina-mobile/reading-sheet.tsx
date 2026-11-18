'use client'

import { useEffect, useRef } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import { Pin, Trash2 } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { CONTENT_W } from './layout-widths'
import { FOLDER_SHORT, useRutina } from './store'
import { playfair } from './serif'
import { useFocusTrap } from './use-focus-trap'

/**
 * Sheet baca catatan — pola drag-to-close yang sama dengan ComposeSheet
 * (dibangun manual agar tetap di dalam bingkai ponsel).
 */
export function ReadingSheet() {
  const notes = useRutina((s) => s.notes)
  const readingNoteId = useRutina((s) => s.readingNoteId)
  const closeReading = useRutina((s) => s.closeReading)
  const togglePin = useRutina((s) => s.togglePin)
  const deleteNote = useRutina((s) => s.deleteNote)

  const note = notes.find((n) => n.id === readingNoteId)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  /* Focus management: fokus awal, trap Tab, kembalikan fokus saat tutup. */
  useFocusTrap(Boolean(note), panelRef)

  // Tutup dengan Escape
  useEffect(() => {
    if (!note) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeReading()
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
            className="absolute inset-0 z-40 bg-espresso/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <m.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            aria-label={`Baca catatan: ${note.title}`}
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
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className={`absolute inset-x-0 bottom-0 z-50 mx-auto w-full rounded-t-sheet bg-surface-primary px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-2.5 ${CONTENT_W}`}
          >
            {/* Pegangan seret */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-cocoa/15" />
            </div>

            <div className="text-left">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-content-secondary">
                  {FOLDER_SHORT[note.folder]}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-content-muted">
                  {note.date}
                </span>
                {note.pinned ? (
                  <Pin
                    className="h-3.5 w-3.5 text-content-secondary"
                    fill="currentColor"
                  />
                ) : null}
              </div>
              <h2
                className={`${playfair.className} mt-2 text-[22px] font-semibold leading-snug tracking-tight text-content-primary`}
              >
                {note.title}
              </h2>
            </div>

            <Separator className="mt-4 bg-border" />

            <p className="mt-4 text-left text-[14px] leading-relaxed text-content-secondary">
              {note.body}
            </p>

            <div className="mt-6 flex gap-2">
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
                    className="h-11 flex-1 rounded-full bg-surface-inverse font-semibold text-content-inverse hover:bg-espresso-soft"
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[320px] rounded-[24px] border-border p-6 sm:max-w-[320px]">
                  <AlertDialogHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                      <Trash2 className="h-5 w-5 text-content-danger" />
                    </div>
                    <AlertDialogTitle className="text-center text-lg font-bold tracking-tight text-content-primary">
                      Hapus catatan ini?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center text-[12.5px] leading-relaxed text-content-muted">
                      Catatan “{note.title}” akan dihapus permanen dan tidak
                      bisa dikembalikan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row gap-2 sm:justify-center">
                    <AlertDialogCancel className="mt-0 h-10 flex-1 rounded-full border-border text-[13px] font-semibold text-content-secondary hover:bg-surface-sunken hover:text-content-primary">
                      Batal
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        deleteNote(note.id)
                        toast('Catatan dihapus')
                      }}
                      className="h-10 flex-1 rounded-full bg-destructive text-[13px] font-bold text-white hover:bg-destructive/90"
                    >
                      Ya, Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
