'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { Pin, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FOLDER_SHORT, useRutina } from './store'
import { playfair } from './serif'

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
          <motion.div
            key="backdrop"
            aria-hidden="true"
            onClick={closeReading}
            className="absolute inset-0 z-40 bg-[#231F1E]/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
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
            className="absolute inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[520px] rounded-t-[28px] bg-[#FAF9F6] px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-2.5"
          >
            {/* Pegangan seret */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-[#4A3B32]/15" />
            </div>

            <div className="text-left">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-[#E4EFE0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#4A3B32]">
                  {FOLDER_SHORT[note.folder]}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/60">
                  {note.date}
                </span>
                {note.pinned ? (
                  <Pin
                    className="h-3.5 w-3.5 text-[#4A3B32]"
                    fill="currentColor"
                  />
                ) : null}
              </div>
              <h2
                className={`${playfair.className} mt-2 text-[22px] font-semibold leading-snug tracking-tight text-[#231F1E]`}
              >
                {note.title}
              </h2>
            </div>

            <p className="mt-3 text-left text-[14px] leading-relaxed text-[#231F1E]/75">
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
                className="h-11 flex-1 rounded-full font-semibold text-[#4A3B32] hover:bg-[#EAE5D9] hover:text-[#231F1E]"
              >
                <Pin
                  className="h-4 w-4"
                  fill={note.pinned ? 'currentColor' : 'none'}
                />
                {note.pinned ? 'Lepas' : 'Sematkan'}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  deleteNote(note.id)
                  toast('Catatan dihapus')
                }}
                className="h-11 flex-1 rounded-full bg-[#4A3B32] font-semibold text-[#FAF9F6] hover:bg-[#3A2E27]"
              >
                <Trash2 className="h-4 w-4" />
                Hapus
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
