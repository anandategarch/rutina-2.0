'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import { PenLine } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CONTENT_W } from './layout-widths'
import { FOLDERS, FOLDER_SHORT, useRutina, type FolderKey } from './store'
import { useFocusTrap } from './use-focus-trap'

/**
 * Sheet bawah kustom — dibangun manual (bukan shadcn Sheet) agar tetap
 * berada di dalam bingkai ponsel, bukan di-portal ke body.
 * Bisa diseret ke bawah untuk ditutup.
 */
export function ComposeSheet() {
  const open = useRutina((s) => s.composeOpen)
  const closeCompose = useRutina((s) => s.closeCompose)
  const addNote = useRutina((s) => s.addNote)
  const composeFolder = useRutina((s) => s.composeFolder)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [folder, setFolder] = useState<FolderKey>('pribadi')
  const [prevOpen, setPrevOpen] = useState(false)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  /* Focus management: fokus awal, trap Tab, kembalikan fokus saat tutup. */
  useFocusTrap(open, panelRef)

  // Reset draf setiap kali sheet dibuka — pola "sesuaikan state saat render"
  // (folder awal mengikuti composeFolder, mis. dari tombol + di kartu folder)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setFolder(composeFolder)
      setTitle('')
      setBody('')
    }
  }

  // Tutup dengan Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCompose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeCompose])

  const submit = () => {
    const t = title.trim()
    if (!t) {
      toast.warning('Judul catatan masih kosong')
      return
    }
    addNote({ title: t, body: body.trim(), folder })
    setTitle('')
    setBody('')
    closeCompose()
    toast.success('Catatan baru ditambahkan ke jurnal')
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={closeCompose}
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
            aria-label="Buat catatan baru"
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) closeCompose()
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
              <h2 className="text-lg font-semibold tracking-tight text-content-primary">
                Catatan Baru
              </h2>
              <p className="mt-0.5 text-[13px] text-content-muted">
                Simpan pikiran atau ide hari ini ke jurnal.
              </p>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="sheet-title"
                  className="text-[13px] font-semibold text-content-secondary"
                >
                  Judul
                </Label>
                <Input
                  id="sheet-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="mis. Ide pagi ini"
                  className="h-11 rounded-xl border-border bg-surface-sunken text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="sheet-body"
                  className="text-[13px] font-semibold text-content-secondary"
                >
                  Isi catatan
                </Label>
                <Textarea
                  id="sheet-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Tulis apa pun yang ada di kepalamu..."
                  className="min-h-[84px] resize-none rounded-xl border-border bg-surface-sunken text-content-primary [field-sizing:content] placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[13px] font-semibold text-content-secondary">
                  Kategori
                </span>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {FOLDERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFolder(f.key)}
                      aria-pressed={folder === f.key}
                      className={`h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-[12px] font-bold transition-colors ${
                        folder === f.key
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-surface-primary text-content-secondary hover:bg-secondary'
                      }`}
                    >
                      {FOLDER_SHORT[f.key]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={closeCompose}
                className="h-11 flex-1 rounded-full font-semibold text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={submit}
                className="h-11 flex-1 rounded-full bg-primary font-semibold text-primary-foreground hover:bg-action-hover"
              >
                <PenLine className="h-4 w-4" />
                Simpan
              </Button>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
