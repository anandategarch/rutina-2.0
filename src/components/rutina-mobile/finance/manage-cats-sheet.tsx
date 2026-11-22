'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import {
  Check,
  EyeOff,
  Eye,
  Pencil,
  Repeat2,
  Trash2,
  X,
} from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { fade, sheetSpring } from '@/lib/motion/transitions'
import { motionTokens } from '@/lib/motion/tokens'
import { CONTENT_W } from '../layout-widths'
import { useRutina, type TxType } from '../store'
import { useFocusTrap } from '../use-focus-trap'
import { useEscapeLayer } from '../overlay-escape'
import { CATS_BY_TYPE, catMetaOf } from './cats'
import { formatIDR } from './utils'

/**
 * Lembar Kelola Kategori (v2.22) — ganti nama (menular ke seluruh
 * tampilan), sembunyikan kategori bawaan dari pemilih, dan hapus
 * kategori buatan (transaksinya pindah ke "Lainnya").
 *
 * Daftar menampilkan jumlah transaksi + total nominal nyata per
 * kategori sehingga keputusan menghapus/menyembunyikan selalu
 * berdasarkan data, bukan tebakan.
 */

interface CatRowInfo {
  cat: string
  count: number
  total: number
  custom: boolean
  hidden: boolean
}

export function ManageCatsSheet() {
  const open = useRutina((s) => s.catManageOpen)
  const close = useRutina((s) => s.closeCatManage)
  const txs = useRutina((s) => s.txs)
  const customCats = useRutina((s) => s.customCats)
  const catRenames = useRutina((s) => s.catRenames)
  const hiddenCats = useRutina((s) => s.hiddenCats)
  const renameCat = useRutina((s) => s.renameCat)
  const hideCat = useRutina((s) => s.hideCat)
  const unhideCat = useRutina((s) => s.unhideCat)
  const deleteCustomCat = useRutina((s) => s.deleteCustomCat)

  const [tab, setTab] = useState<TxType>('keluar')
  const [editing, setEditing] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [prevOpen, setPrevOpen] = useState(false)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(open, panelRef)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setTab('keluar')
      setEditing(null)
      setDraftName('')
    }
  }

  /* v2.49 (audit): Escape lewat tumpukan lapisan — guard AlertDialog
     terpusat di dispatcher; mode sunting ditutup lebih dulu. */
  useEscapeLayer(open, () => {
    if (editing) setEditing(null)
    else close()
  })

  /* Statistik nyata per kategori — jumlah transaksi + total nominal. */
  const rows = useMemo<CatRowInfo[]>(() => {
    const base: string[] = [
      ...CATS_BY_TYPE[tab],
      ...customCats.filter((c) => c.type === tab).map((c) => c.id),
    ]
    const customIds = new Set(customCats.map((c) => c.id))
    const stats = new Map<string, { count: number; total: number }>()
    for (const t of txs) {
      if (t.type !== tab) continue
      const cur = stats.get(t.cat) ?? { count: 0, total: 0 }
      cur.count++
      cur.total += t.amount
      stats.set(t.cat, cur)
    }
    return base.map((cat) => ({
      cat,
      count: stats.get(cat)?.count ?? 0,
      total: stats.get(cat)?.total ?? 0,
      custom: customIds.has(cat),
      hidden: hiddenCats.includes(cat),
    }))
  }, [tab, txs, customCats, hiddenCats])

  const startEdit = (cat: string) => {
    setEditing(cat)
    setDraftName(catMetaOf(cat, customCats, catRenames).label)
  }

  const submitRename = (cat: string) => {
    const clean = draftName.trim()
    if (!clean) {
      toast.warning('Nama tidak boleh kosong')
      return
    }
    renameCat(cat, clean)
    const affected = rows.find((r) => r.cat === cat)?.count ?? 0
    toast.success(
      affected > 0
        ? `Nama diperbarui — tampil di ${affected} transaksi`
        : 'Nama kategori diperbarui',
    )
    setEditing(null)
    setDraftName('')
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={close}
            className="absolute inset-0 z-[55] bg-espresso/45"
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
            aria-label="Kelola kategori keuangan"
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) close()
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetSpring}
            className={`absolute inset-x-0 bottom-0 z-[60] mx-auto flex max-h-[86%] w-full flex-col rounded-t-sheet bg-surface-primary pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2.5 no-scrollbar ${CONTENT_W}`}
          >
            {/* Pegangan seret */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-content-secondary/25" />
            </div>

            <div className="flex shrink-0 items-start justify-between gap-3 px-5">
              <div className="text-left">
                <h2 className="text-lead font-semibold tracking-tight text-content-primary">
                  Kelola Kategori
                </h2>
                <p className="mt-0.5 text-note text-content-muted">
                  Ganti nama, sembunyikan dari pemilih, atau hapus —
                  histori transaksi selalu utuh.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Tutup kelola kategori"
                className="mt-0.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Saklar arus */}
            <div
              role="group"
              aria-label="Arus kategori"
              className="mx-5 mt-3 flex shrink-0 rounded-full bg-surface-secondary p-1"
            >
              {(['keluar', 'masuk'] as TxType[]).map((t) => {
                const on = tab === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    aria-pressed={on}
                    className={`relative z-10 flex h-9 flex-1 cursor-pointer items-center justify-center rounded-full text-note font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      on
                        ? t === 'keluar'
                          ? 'text-content-danger'
                          : 'text-success'
                        : 'text-content-muted'
                    }`}
                  >
                    {on && (
                      <m.span
                        aria-hidden="true"
                        layoutId="cat-manage-pill"
                        className="absolute inset-0 z-[-1] rounded-full bg-surface-primary shadow-soft"
                        transition={motionTokens.spring.snappy}
                      />
                    )}
                    {t === 'keluar' ? 'Pengeluaran' : 'Pemasukan'}
                  </button>
                )
              })}
            </div>

            {/* Daftar kategori — v2.87: data-lenis-prevent (gulir sendiri
                di dalam wadah Lenis layar). */}
            <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 pt-3">
              <ul className="space-y-2 pb-2">
                {rows.map((r) => {
                  const meta = catMetaOf(r.cat, customCats, catRenames)
                  const Icon = meta.icon
                  const isEditing = editing === r.cat
                  return (
                    <li
                      key={r.cat}
                      className={`rounded-2xl border p-3 transition-colors ${
                        r.hidden
                          ? 'border-border bg-surface-sunken/60'
                          : 'border-border bg-surface-primary'
                      }`}
                    >
                      {isEditing ? (
                        /* Mode sunting nama */
                        <div className="flex items-center gap-2">
                          <Input
                            value={draftName}
                            onChange={(e) =>
                              setDraftName(e.target.value.slice(0, 40))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitRename(r.cat)
                              if (e.key === 'Escape') setEditing(null)
                            }}
                            autoFocus
                            aria-label={`Nama baru untuk ${meta.label}`}
                            className="h-10 flex-1 rounded-xl border-border bg-surface-sunken text-body font-semibold text-content-primary focus-visible:border-primary focus-visible:ring-primary/25"
                          />
                          <button
                            type="button"
                            onClick={() => submitRename(r.cat)}
                            aria-label="Simpan nama"
                            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            <Check className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            aria-label="Batal"
                            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-content-secondary transition-colors hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                tab === 'keluar'
                                  ? 'bg-clay/25 text-content-danger'
                                  : 'bg-pistachio/30 text-success'
                              } ${r.hidden ? 'opacity-45' : ''}`}
                            >
                              <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`line-clamp-1 break-words text-body font-semibold leading-snug ${
                                  r.hidden
                                    ? 'text-content-muted'
                                    : 'text-content-primary'
                                }`}
                              >
                                {meta.label}
                                {catRenames[r.cat] && (
                                  <span
                                    className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-px text-eyebrow font-semibold text-success"
                                    title="Nama asli dikembalikan bila kosong"
                                  >
                                    <Repeat2 className="h-2.5 w-2.5" aria-hidden="true" />
                                    diganti nama
                                  </span>
                                )}
                              </p>
                              <p className="text-eyebrow font-medium text-content-muted">
                                {r.count > 0
                                  ? `${r.count} transaksi · ${formatIDR(r.total)}`
                                  : 'belum pernah dipakai'}
                                {r.hidden && ' · disembunyikan'}
                              </p>
                            </div>
                            {/* Aksi */}
                            <span className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(r.cat)}
                                aria-label={`Ganti nama ${meta.label}`}
                                title="Ganti nama"
                                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (r.hidden) {
                                    unhideCat(r.cat)
                                    toast.success(`${meta.label} tampil kembali di pemilih`)
                                  } else {
                                    hideCat(r.cat)
                                    toast.info(
                                      `${meta.label} disembunyikan — histori tetap utuh`,
                                    )
                                  }
                                }}
                                aria-label={
                                  r.hidden
                                    ? `Tampilkan ${meta.label}`
                                    : `Sembunyikan ${meta.label}`
                                }
                                title={r.hidden ? 'Tampilkan' : 'Sembunyikan'}
                                className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                                  r.hidden
                                    ? 'text-success hover:bg-secondary'
                                    : 'text-content-secondary hover:bg-surface-secondary hover:text-content-primary'
                                }`}
                              >
                                {r.hidden ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </button>
                              {r.custom && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      type="button"
                                      aria-label={`Hapus kategori ${meta.label}`}
                                      title="Hapus kategori"
                                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-content-danger transition-colors hover:bg-destructive/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="max-w-[400px] rounded-2xl border-border bg-surface-primary p-6">
                                    <AlertDialogHeader className="text-left">
                                      <AlertDialogTitle className="text-lead tracking-tight text-content-primary">
                                        Hapus kategori &quot;{meta.label}&quot;?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription className="text-note text-content-muted">
                                        {r.count > 0
                                          ? `${r.count} transaksi (${formatIDR(r.total)}) akan dipindahkan ke kategori "Lainnya" — tidak ada catatan yang hilang.`
                                          : 'Kategori ini belum pernah dipakai.'}{' '}
                                        Tindakan ini tidak bisa dibatalkan.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="mt-3 flex flex-row gap-2">
                                      <AlertDialogCancel className="h-10 flex-1 rounded-full border-border text-note font-semibold text-content-secondary hover:bg-surface-secondary">
                                        Batal
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => {
                                          deleteCustomCat(r.cat)
                                          toast.success(
                                            `Kategori dihapus — transaksinya kini di "Lainnya"`,
                                          )
                                        }}
                                        className="h-10 flex-1 rounded-full bg-destructive text-note font-semibold text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Hapus
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </span>
                          </div>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
              <p className="pb-3 text-eyebrow leading-relaxed text-content-muted">
                Kategori bawaan hanya bisa diganti nama atau disembunyikan
                (ikon mata) — penghapusannya eksklusif untuk kategori buatanmu
                sendiri.
              </p>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
