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
import { fade, sheetSpring } from '@/lib/motion/transitions'
import { JournalCanvas } from './journal-canvas'
import { CONTENT_W } from './layout-widths'
import { RutinaIllustration } from './rutina-illustration'
import { FOLDERS, FOLDER_SHORT, useRutina, type FolderKey } from './store'
import { useFocusTrap } from './use-focus-trap'
import { useEscapeLayer } from './overlay-escape'

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

  /* v2.75 (audit PWA P1 — draft recovery): draf TIDAK lagi direset saat
     sheet dibuka kembali. Ketukan backdrop/Escape yang tak sengaja atau
     giliran aplikasi sebelumnya membuat judul+isi lenyap begitu sheet
     ditutup — kini draf bertahan di state komponen (sheet selalu
     terpasang di cangkang) sampai BERSIH DIKIRIM. Folder awal hanya
     diisi ulang bila draf kosong (catatan baru); draf lanjutan
     mempertahankan folder pilihan pengguna. */
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open && title.trim() === '' && body.trim() === '') {
      setFolder(composeFolder)
    }
  }

  // Tutup dengan Escape — v2.49 (audit): tumpukan lapisan (overlay-escape).
  useEscapeLayer(open, () => closeCompose())

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
    <>
      <AnimatePresence>
        {open && (
        <>
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={closeCompose}
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
            transition={sheetSpring}
            className={`absolute inset-x-0 bottom-0 z-50 mx-auto w-full rounded-t-sheet bg-surface-primary px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-2.5 ${CONTENT_W}`}
          >
            {/* Pegangan seret */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-content-secondary/25" />
            </div>

            <div className="flex items-center gap-3.5 text-left">
              {/* Buku catatan terbuka (aset 18) — konteks visual lembar
                  catatan cepat; teks tetap memimpin. */}
              <RutinaIllustration
                name="18-journal-open-notebook"
                size={160}
                className="size-14 shrink-0"
              />
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-content-primary">
                  Catatan Baru
                </h2>
                <p className="mt-0.5 text-note text-content-muted">
                  Simpan pikiran atau ide hari ini ke jurnal.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="sheet-title"
                  className="text-note font-semibold text-content-secondary"
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
                  className="text-note font-semibold text-content-secondary"
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
                <span className="text-note font-semibold text-content-secondary">
                  Kategori
                </span>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {FOLDERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFolder(f.key)}
                      aria-pressed={folder === f.key}
                      /* Fokus keyboard — pola focus-visible chip yang sama
                         dengan pemilih kategori di habit-sheet. */
                      className={`h-9 shrink-0 cursor-pointer rounded-full px-3.5 text-meta font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
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

      {/* Kanvas menulis jurnal (mode layar penuh) dipasang di sini karena
          komponen ini adalah komponen tingkat-cangkang yang dimuat langsung
          oleh rutina-app — posisi anak langsung cangkang membuat overlay
          absolut kanvas menutupi SELURUH aplikasi (termasuk navigasi bawah)
          tanpa perlu mengubah rutina-app.tsx. ComposeSheet sendiri tetap
          dipakai alur cepat "Catatan Baru" di layar Beranda. */}
      <JournalCanvas />
    </>
  )
}
