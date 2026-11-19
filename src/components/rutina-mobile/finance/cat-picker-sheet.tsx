'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { CONTENT_W } from '../layout-widths'
import { useRutina, type CustomCat, type TxType } from '../store'
import { useFocusTrap } from '../use-focus-trap'
import { allCatsOf, catMetaOf, frequentCats, subcatsOf } from './cats'

/**
 * Pemilih kategori (v2.17) — SATU sistem kategori terpadu: bawaan 2.0,
 * impor Rutina 1.0, dan kategori buatan pengguna dalam satu daftar
 * tanpa penanda asal.
 *
 * Isi sesuai rancangan: (1) kolom pencarian, (2) kategori yang sering
 * dipakai, (3) daftar lengkap yang bisa diluas, (4) subkategori muncul
 * setelah kategori induk dipilih, (5) tombol tambah kategori.
 * Form transaksi tetap pendek — hanya menampilkan kategori terpilih.
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
  /** Dipanggil dengan kategori (dan subkategori opsional bila dipilih). */
  onSelect: (cat: string, subcat?: string) => void
  onClose: () => void
}) {
  const txs = useRutina((s) => s.txs)
  const customCats = useRutina((s) => s.customCats)
  const addCustomCat = useRutina((s) => s.addCustomCat)

  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
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
      setExpanded(null)
      setAdding(false)
      setNewName('')
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  /* Fokus langsung ke pencarian saat dibuka. */
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 250)
      return () => clearTimeout(t)
    }
  }, [open])

  const q = query.trim().toLowerCase()

  /* Kategori sering dipakai — dari frekuensi transaksi nyata. */
  const frequent = useMemo(
    () => (q ? [] : frequentCats(txs, type, 6)),
    [txs, type, q],
  )

  /* Daftar lengkap — bawaan + buatan, difilter pencarian. */
  const list = useMemo(() => {
    const all = allCatsOf(type, customCats)
    if (!q) return all
    return all.filter((c) =>
      catMetaOf(c, customCats).label.toLowerCase().includes(q),
    )
  }, [type, customCats, q])

  const pick = (cat: string, subcat?: string) => {
    onSelect(cat, subcat)
    onClose()
  }

  /** Ketuk baris kategori: pilih; bila punya subkategori → luaskan
   *  (tetap terpilih, subkategori opsional). Tanpa subkategori → tutup. */
  const tapCat = (cat: string) => {
    const subs = subcatsOf(cat, customCats)
    if (subs.length > 0) {
      setExpanded(expanded === cat ? null : cat)
      /* Pilih induk seketika agar pratinjau form ikut berubah. */
      onSelect(cat)
      return
    }
    pick(cat)
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
            transition={{ duration: 0.2 }}
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
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className={`absolute inset-x-0 bottom-0 z-[60] mx-auto flex max-h-[86%] w-full flex-col rounded-t-[28px] bg-surface-primary pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2.5 no-scrollbar ${CONTENT_W}`}
          >
            {/* Pegangan seret */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-cocoa/15" />
            </div>

            <div className="flex shrink-0 items-start justify-between gap-3 px-5">
              <div className="text-left">
                <h2 className="text-lg font-semibold tracking-tight text-content-primary">
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

            {/* 1 — Kolom pencarian */}
            <div className="shrink-0 px-5 pt-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari kategori…"
                  className="h-11 rounded-xl border-border bg-surface-sunken pl-10 text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
                />
              </div>
            </div>

            {/* Daftar bisa digulir */}
            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 pt-3">
              {/* 2 — Kategori yang sering dipakai */}
              {frequent.length > 0 && (
                <section aria-label="Kategori yang sering dipakai">
                  <p className="text-meta font-bold uppercase tracking-[0.08em] text-content-muted">
                    Sering dipakai
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {frequent.map(({ cat, count }) => {
                      const meta = catMetaOf(cat, customCats)
                      const Icon = meta.icon
                      const on = selected === cat
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => pick(cat)}
                          aria-pressed={on}
                          className={`flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border pl-2.5 pr-3 text-meta font-semibold transition-all active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                            on
                              ? 'border-primary bg-secondary text-success shadow-leaf'
                              : 'border-border bg-surface-sunken text-content-secondary hover:border-primary/40'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {meta.label}
                          <span className="text-content-muted/70 tabular-nums">{count}×</span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* 3 — Daftar lengkap yang bisa diluas */}
              <section aria-label="Daftar kategori" className="mt-4 pb-2">
                <p className="text-meta font-bold uppercase tracking-[0.08em] text-content-muted">
                  Semua kategori
                </p>
                <ul className="mt-2 space-y-1.5">
                  {list.map((cat) => {
                    const meta = catMetaOf(cat, customCats)
                    const Icon = meta.icon
                    const on = selected === cat
                    const subs = subcatsOf(cat, customCats)
                    const isOpen = expanded === cat
                    return (
                      <li key={cat}>
                        <div
                          className={`overflow-hidden rounded-2xl border transition-colors ${
                            on ? 'border-primary bg-secondary/50' : 'border-border bg-surface-primary'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => tapCat(cat)}
                            aria-pressed={on}
                            aria-expanded={subs.length > 0 ? isOpen : undefined}
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
                              <span className="block truncate text-body font-semibold text-content-primary">
                                {meta.label}
                              </span>
                              {on && (
                                <span className="mt-0.5 flex items-center gap-1 text-eyebrow font-semibold text-success">
                                  <Check className="h-3 w-3" aria-hidden="true" />
                                  terpilih
                                  {subs.length > 0 && ' — bisa pilih subkategori'}
                                </span>
                              )}
                            </span>
                            {subs.length > 0 && (
                              <m.span
                                aria-hidden="true"
                                animate={{ rotate: isOpen ? 180 : 0 }}
                                transition={{ duration: 0.25 }}
                                className="flex h-7 w-7 shrink-0 items-center justify-center text-content-muted"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </m.span>
                            )}
                          </button>

                          {/* 4 — Subkategori setelah induk dipilih */}
                          <AnimatePresence initial={false}>
                            {isOpen && subs.length > 0 && (
                              <m.div
                                key="subs"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-border bg-surface-sunken/60 px-3.5 py-3">
                                  <p className="text-eyebrow font-semibold text-content-muted">
                                    Subkategori (opsional)
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => pick(cat)}
                                      className="h-8 shrink-0 cursor-pointer rounded-full border border-border bg-surface-primary px-3.5 text-eyebrow font-bold text-content-secondary transition-all active:scale-[0.96] hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                    >
                                      Tanpa subkategori
                                    </button>
                                    {subs.map((sub) => (
                                      <button
                                        key={sub}
                                        type="button"
                                        onClick={() => pick(cat, sub)}
                                        className="h-8 shrink-0 cursor-pointer rounded-full border border-border bg-surface-primary px-3.5 text-eyebrow font-bold text-content-secondary transition-all active:scale-[0.96] hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                      >
                                        {sub}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </m.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </li>
                    )
                  })}
                  {list.length === 0 && (
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
            </div>

            {/* 5 — Tombol tambah kategori */}
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
                  Tambah kategori baru
                </button>
              )}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
