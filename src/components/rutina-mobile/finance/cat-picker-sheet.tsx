'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'

import { fade, sheetSpring } from '@/lib/motion/transitions'
import { Input } from '@/components/ui/input'
import { CONTENT_W } from '../layout-widths'
import { useRutina, type TxType } from '../store'
import { useFocusTrap } from '../use-focus-trap'
import { useEscapeLayer } from '../overlay-escape'
import { allCatsOf, catMetaOf, PRIMARY_CATS_BY_TYPE } from './cats'

/**
 * Pemilih kategori (v2.17) — SATU sistem kategori terpadu: bawaan 2.0,
 * impor Rutina 1.0, dan kategori buatan pengguna.
 *
 * v2.82 (audit UX §B): HIERARKI BERTINGKAT, bukan daftar panjang —
 * (1) kategori utama (7 pengeluaran / 4 pemasukan) tampil langsung,
 * (2) kategori terpilih dari transaksi lama (legacy/buatan) DISEMATKAN
 * paling atas saat sunting — nilainya tidak pernah hilang di balik
 * lipatan, (3) sisanya di balik "Lihat kategori lainnya · N",
 * (4) pencarian HANYA muncul saat diminta lewat "Cari kategori lain"
 * (keyboard tidak lagi terbuka otomatis), (5) pintu Kelola kategori
 * dipensiunkan dari sini — hidup di tab Anggaran Keuangan.
 */

export function CatPickerSheet({
  open,
  type,
  selected,
  onSelect,
  onClose,
}: {
  open: boolean
  type: TxType
  selected: string
  onSelect: (cat: string) => void
  onClose: () => void
}) {
  const customCats = useRutina((s) => s.customCats)
  const catRenames = useRutina((s) => s.catRenames)
  const hiddenCats = useRutina((s) => s.hiddenCats)
  const addCustomCat = useRutina((s) => s.addCustomCat)

  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  /* v2.82: kategori lain & pencarian dibuka saat diminta. */
  const [othersOpen, setOthersOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [prevOpen, setPrevOpen] = useState(false)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useFocusTrap(open, panelRef)

  /* Draf di-reset tiap kali lembar dibuka. */
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setQuery('')
      setAdding(false)
      setNewName('')
      setOthersOpen(false)
      setSearchOpen(false)
    }
  }

  /* v2.49 (audit): Escape lewat tumpukan lapisan (overlay-escape). */
  useEscapeLayer(open, onClose)

  /* Keyboard HANYA terbuka setelah pengguna mengetuk "Cari kategori
     lain" (v2.82, audit UX — aturan global: pencarian opsional tidak
     membuka keyboard otomatis). */
  useEffect(() => {
    if (open && searchOpen) {
      const t = setTimeout(() => searchRef.current?.focus(), 120)
      return () => clearTimeout(t)
    }
  }, [open, searchOpen])

  const q = query.trim().toLowerCase()

  /* Kategori utama (v2.82) — 7 pengeluaran / 4 pemasukan, di depan.
     (string[] — kategori terpilih bisa slug buatan/legacy apa pun.) */
  const primary = useMemo(
    () =>
      PRIMARY_CATS_BY_TYPE[type].filter(
        (c) => !hiddenCats.includes(c),
      ) as string[],
    [type, hiddenCats],
  )

  /* Kategori terpilih yang TIDAK di daftar utama (legacy/buatan) —
     disematkan paling atas: sunting transaksi lama tidak pernah
     menyembunyikan nilainya di balik "Lainnya" (audit UX §B). */
  const pinnedSelected =
    selected && !primary.includes(selected) ? selected : null

  /* Kategori lain — seluruh daftar minus utama minus tersemat. */
  const others = useMemo(() => {
    const all = allCatsOf(type, customCats, hiddenCats)
    return all.filter((c) => c !== pinnedSelected && !primary.includes(c))
  }, [type, customCats, hiddenCats, primary, pinnedSelected])

  /* Hasil pencarian — mencari SELURUH daftar (utama + lainnya). */
  const results = useMemo(() => {
    if (!q) return []
    const all = allCatsOf(type, customCats, hiddenCats)
    return all.filter((c) =>
      catMetaOf(c, customCats, catRenames).label.toLowerCase().includes(q),
    )
  }, [q, type, customCats, hiddenCats, catRenames])

  const pick = (cat: string) => {
    onSelect(cat)
    onClose()
  }

  const submitNewCat = () => {
    const name = newName.trim()
    if (!name) {
      toast.warning('Tulis nama kategorinya dulu')
      return
    }
    const created = addCustomCat({ name, type })
    if (!created) {
      toast.info(`Kategori "${name}" sudah ada — pakai saja yang itu.`)
      return
    }
    toast.success(`Kategori "${created.name}" ditambahkan`)
    setAdding(false)
    setNewName('')
    setQuery('')
    pick(created.id)
  }

  const typeLabel = type === 'keluar' ? 'pengeluaran' : 'pemasukan'

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={onClose}
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
            aria-label={`Pilih kategori ${typeLabel}`}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) onClose()
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
                  Pilih Kategori
                </h2>
                <p className="mt-0.5 text-note text-content-muted">
                  Satu daftar untuk semua kategorimu — cari, pilih, atau
                  tambah baru.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup pemilih kategori"
                className="mt-0.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* 1 — Pencarian (v2.82): HANYA saat diminta. */}
            {searchOpen ? (
              <div className="shrink-0 px-5 pt-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
                  <Input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari semua kategori…"
                    aria-label="Cari kategori"
                    className="h-11 rounded-xl border-border bg-surface-sunken pl-10 text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Hapus pencarian"
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors hover:bg-surface-sunken hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="shrink-0 px-5 pt-3">
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border bg-surface-sunken text-meta font-bold text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Search className="h-3.5 w-3.5" aria-hidden="true" />
                  Cari kategori lain
                </button>
              </div>
            )}

            {/* Daftar bisa digulir */}
            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 pt-3">
              {/* Mode pencarian aktif — hasil dari SELURUH daftar. */}
              {q ? (
                <section aria-label="Hasil pencarian kategori" className="pb-2">
                  <p className="text-meta font-bold uppercase tracking-[0.08em] text-content-muted">
                    Hasil pencarian
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {results.map((cat) => (
                      <CatRow
                        key={cat}
                        cat={cat}
                        selected={selected}
                        onPick={pick}
                        customCats={customCats}
                        catRenames={catRenames}
                      />
                    ))}
                    {results.length === 0 && (
                      <li className="rounded-2xl border-2 border-dashed border-border px-6 py-8 text-center">
                        <Search className="mx-auto h-5 w-5 text-content-muted" />
                        <p className="mt-2 text-note font-semibold text-content-muted">
                          Tidak ada kategori cocok
                        </p>
                        <p className="mt-0.5 text-meta text-content-muted">
                          Coba kata lain, atau tambah kategori baru di bawah.
                        </p>
                      </li>
                    )}
                  </ul>
                </section>
              ) : (
                <>
                  {/* 2 — Kategori terpilih non-utama, disematkan (v2.82):
                      sunting transaksi legacy/buatan tetap terlihat. */}
                  {pinnedSelected && (
                    <section aria-label="Kategori transaksi ini">
                      <p className="text-meta font-bold uppercase tracking-[0.08em] text-content-muted">
                        Kategori transaksi ini
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        <CatRow
                          cat={pinnedSelected}
                          selected={selected}
                          onPick={pick}
                          customCats={customCats}
                          catRenames={catRenames}
                        />
                      </ul>
                    </section>
                  )}

                  {/* 3 — Kategori utama */}
                  <section
                    aria-label="Kategori utama"
                    className={pinnedSelected ? 'mt-4' : undefined}
                  >
                    <p className="text-meta font-bold uppercase tracking-[0.08em] text-content-muted">
                      Kategori utama
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {primary.map((cat) => (
                        <CatRow
                          key={cat}
                          cat={cat}
                          selected={selected}
                          onPick={pick}
                          customCats={customCats}
                          catRenames={catRenames}
                        />
                      ))}
                    </ul>
                  </section>

                  {/* 4 — Kategori lainnya (v2.82) — legacy Rutina 1.0 +
                      buatan; dibuka lewat SATU tombol, nilai histori
                      tetap utuh (tidak ada data yang dihapus). */}
                  {others.length > 0 && (
                    <section aria-label="Kategori lainnya" className="mt-4 pb-2">
                      <button
                        type="button"
                        onClick={() => setOthersOpen((v) => !v)}
                        aria-expanded={othersOpen}
                        aria-controls="kategori-lainnya"
                        className="flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-dashed border-border-strong px-3.5 text-left transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        <span className="text-meta font-bold text-content-secondary">
                          Lihat kategori lainnya
                          <span className="ml-1.5 font-semibold tabular-nums text-content-muted">
                            · {others.length}
                          </span>
                        </span>
                        <ChevronDown
                          aria-hidden="true"
                          className={
                            'h-4 w-4 shrink-0 text-content-muted transition-transform duration-300 ' +
                            (othersOpen ? 'rotate-180' : '')
                          }
                        />
                      </button>
                      {othersOpen && (
                        <ul id="kategori-lainnya" className="mt-2 space-y-1.5">
                          {others.map((cat) => (
                            <CatRow
                              key={cat}
                              cat={cat}
                              selected={selected}
                              onPick={pick}
                              customCats={customCats}
                              catRenames={catRenames}
                            />
                          ))}
                        </ul>
                      )}
                    </section>
                  )}
                </>
              )}
            </div>

            {/* 5 — Form tambah kategori (v2.82: pintu Kelola pindah ke
                tab Anggaran Keuangan — bukan bagian alur pencatatan). */}
            <div className="shrink-0 border-t border-border px-5 pt-3">
              {adding ? (
                <div className="flex gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value.slice(0, 40))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitNewCat()
                    }}
                    placeholder={`mis. ${type === 'keluar' ? 'Kebun' : 'Uang Jajan'}`}
                    autoFocus
                    className="h-11 rounded-xl border-border bg-surface-sunken text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
                  />
                  <button
                    type="button"
                    onClick={submitNewCat}
                    className="h-11 shrink-0 cursor-pointer rounded-xl bg-primary px-4 text-note font-bold text-primary-foreground transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Simpan
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border-2 border-dashed border-primary/40 text-note font-bold text-success transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Tambah kategori
                </button>
              )}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* Baris kategori (v2.82) — satu sumber markup untuk utama, tersemat,
   lainnya, dan hasil pencarian. */
function CatRow({
  cat,
  selected,
  onPick,
  customCats,
  catRenames,
}: {
  cat: string
  selected: string
  onPick: (cat: string) => void
  customCats: ReturnType<typeof useRutina.getState>['customCats']
  catRenames: Record<string, string>
}) {
  const meta = catMetaOf(cat, customCats, catRenames)
  const Icon = meta.icon
  const on = selected === cat
  return (
    <li>
      <div
        className={`overflow-hidden rounded-2xl border transition-colors ${
          on ? 'border-primary bg-secondary/50' : 'border-border bg-surface-primary'
        }`}
      >
        <button
          type="button"
          onClick={() => onPick(cat)}
          aria-pressed={on}
          className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              on ? 'bg-secondary text-success' : 'bg-surface-sunken text-content-muted'
            }`}
          >
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block line-clamp-2 break-words text-body font-semibold leading-snug text-content-primary">
              {meta.label}
            </span>
            {on && (
              <span className="mt-0.5 flex items-center gap-1 text-eyebrow font-semibold text-success">
                <Check className="h-3 w-3" aria-hidden="true" />
                terpilih
              </span>
            )}
          </span>
        </button>
      </div>
    </li>
  )
}
