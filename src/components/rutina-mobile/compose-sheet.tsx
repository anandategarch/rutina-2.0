'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { PenLine } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FOLDERS, FOLDER_SHORT, useRutina, type FolderKey } from './store'

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
          <motion.div
            key="backdrop"
            aria-hidden="true"
            onClick={closeCompose}
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
            className="absolute inset-x-0 bottom-0 z-50 rounded-t-[28px] bg-[#FAF9F6] px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-2.5"
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
              <h2 className="text-lg font-semibold tracking-tight text-[#231F1E]">
                Catatan Baru
              </h2>
              <p className="mt-0.5 text-[13px] text-[#4A3B32]/70">
                Simpan pikiran atau ide hari ini ke jurnal.
              </p>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="sheet-title"
                  className="text-[13px] font-semibold text-[#4A3B32]"
                >
                  Judul
                </Label>
                <Input
                  id="sheet-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="mis. Ide pagi ini"
                  className="h-11 rounded-xl border-[#4A3B3233] bg-[#F5F3EE] text-[#231F1E] placeholder:text-[#4A3B32]/40 focus-visible:border-[#749B58] focus-visible:ring-[#749B58]/25"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="sheet-body"
                  className="text-[13px] font-semibold text-[#4A3B32]"
                >
                  Isi catatan
                </Label>
                <Textarea
                  id="sheet-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Tulis apa pun yang ada di kepalamu..."
                  className="min-h-[84px] resize-none rounded-xl border-[#4A3B3233] bg-[#F5F3EE] text-[#231F1E] placeholder:text-[#4A3B32]/40 focus-visible:border-[#749B58] focus-visible:ring-[#749B58]/25"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[13px] font-semibold text-[#4A3B32]">
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
                          ? 'bg-[#749B58] text-white'
                          : 'border border-[#4A3B321F] bg-white text-[#4A3B32] hover:bg-[#E4EFE0]'
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
                className="h-11 flex-1 rounded-full font-semibold text-[#4A3B32] hover:bg-[#EAE5D9] hover:text-[#231F1E]"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={submit}
                className="h-11 flex-1 rounded-full bg-[#749B58] font-semibold text-white hover:bg-[#658A4C]"
              >
                <PenLine className="h-4 w-4" />
                Simpan
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
