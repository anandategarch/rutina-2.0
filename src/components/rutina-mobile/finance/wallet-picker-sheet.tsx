'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import { Check, Plus, Search, Wallet, X } from 'lucide-react'
import { toast } from 'sonner'

import { fade, sheetSpring } from '@/lib/motion/transitions'
import { Input } from '@/components/ui/input'
import { CONTENT_W } from '../layout-widths'
import { useRutina } from '../store'
import { useFocusTrap } from '../use-focus-trap'
import { formatIDRShort, walletBalance } from './utils'

/**
 * Pemilih dompet — kembar arsitektur CatPickerSheet (v2.17): satu daftar
 * dompet dengan (1) kolom pencarian, (2) dompet yang sering dipakai
 * (frekuensi transaksi nyata), (3) daftar lengkap + saldo, (4) form
 * tambah dompet baru (logika yang sama dengan WalletDialog).
 *
 * Dipakai lembar transaksi (dompet sumber) dan lembar transfer
 * (sumber & tujuan — tujuan mengecualikan sumber lewat excludeId).
 */

export function WalletPickerSheet({
  open,
  onClose,
  onSelect,
  selectedId,
  excludeId,
}: {
  open: boolean
  onClose: () => void
  onSelect: (walletId: string) => void
  selectedId?: string
  /** Dompet yang tidak boleh dipilih (mis. sumber pada transfer). */
  excludeId?: string
}) {
  const txs = useRutina((s) => s.txs)
  const wallets = useRutina((s) => s.wallets)
  const addWallet = useRutina((s) => s.addWallet)

  const [query, setQuery] = useState('')
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

  /* Dompet sering dipakai — frekuensi transaksi nyata per dompet
     (sebagai sumber maupun tujuan transfer). */
  const frequent = useMemo(() => {
    if (q) return []
    const counts = new Map<string, number>()
    for (const t of txs) {
      if (t.walletId) counts.set(t.walletId, (counts.get(t.walletId) ?? 0) + 1)
      if (t.toWalletId)
        counts.set(t.toWalletId, (counts.get(t.toWalletId) ?? 0) + 1)
    }
    return wallets
      .filter((w) => w.id !== excludeId)
      .map((w) => ({ wallet: w, count: counts.get(w.id) ?? 0 }))
      .filter((e) => e.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [txs, wallets, q, excludeId])

  /* Daftar lengkap — difilter pencarian & pengecualian. */
  const list = useMemo(() => {
    const pool = wallets.filter((w) => w.id !== excludeId)
    if (!q) return pool
    return pool.filter((w) => w.name.toLowerCase().includes(q))
  }, [wallets, q, excludeId])

  const pick = (walletId: string) => {
    onSelect(walletId)
    onClose()
  }

  /* Tambah dompet — logika yang sama dengan WalletDialog di layar
     Keuangan; dompet baru langsung terpilih. */
  const submitNewWallet = () => {
    const name = newName.trim()
    if (!name) {
      toast.warning('Tulis nama dompetnya dulu')
      return
    }
    addWallet(name, 0)
    const created = useRutina.getState().wallets.at(-1)
    toast.success(`Dompet "${name}" dibuat`)
    setAdding(false)
    setNewName('')
    setQuery('')
    if (created) pick(created.id)
  }

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
            aria-label="Pilih dompet"
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
                  Pilih Dompet
                </h2>
                <p className="mt-0.5 text-note text-content-muted">
                  Satu daftar untuk semua sumber danamu — cari, pilih, atau
                  tambah baru.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup pemilih dompet"
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
                  placeholder="Cari dompet…"
                  className="h-11 rounded-xl border-border bg-surface-sunken pl-10 text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
                />
              </div>
            </div>

            {/* Daftar bisa digulir */}
            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 pt-3">
              {/* 2 — Dompet yang sering dipakai */}
              {frequent.length > 0 && (
                <section aria-label="Dompet yang sering dipakai">
                  <p className="text-meta font-bold uppercase tracking-[0.08em] text-content-muted">
                    Sering dipakai
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {frequent.map(({ wallet: w, count }) => {
                      const on = selectedId === w.id
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => pick(w.id)}
                          aria-pressed={on}
                          className={`flex h-9 max-w-full shrink-0 cursor-pointer items-center gap-1.5 rounded-full border pl-2.5 pr-3 text-meta font-semibold transition-all active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                            on
                              ? 'border-primary bg-secondary text-success shadow-leaf'
                              : 'border-border bg-surface-sunken text-content-secondary hover:border-primary/40'
                          }`}
                        >
                          <Wallet className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{w.name}</span>
                          <span className="text-content-muted/70 tabular-nums">{count}×</span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* 3 — Daftar lengkap */}
              <section aria-label="Daftar dompet" className="mt-4 pb-2">
                <p className="text-meta font-bold uppercase tracking-[0.08em] text-content-muted">
                  Semua dompet
                </p>
                <ul className="mt-2 space-y-1.5">
                  {list.map((w) => {
                    const on = selectedId === w.id
                    return (
                      <li key={w.id}>
                        <div
                          className={`overflow-hidden rounded-2xl border transition-colors ${
                            on ? 'border-primary bg-secondary/50' : 'border-border bg-surface-primary'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => pick(w.id)}
                            aria-pressed={on}
                            className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                on ? 'bg-secondary text-success' : 'bg-surface-sunken text-content-muted'
                              }`}
                            >
                              <Wallet className="h-4.5 w-4.5" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-body font-semibold text-content-primary">
                                {w.name}
                              </span>
                              <span className="mt-0.5 block text-eyebrow tabular-nums text-content-muted">
                                Saldo {formatIDRShort(walletBalance(txs, w))}
                              </span>
                            </span>
                            {on && (
                              <span className="flex shrink-0 items-center gap-1 text-eyebrow font-semibold text-success">
                                <Check className="h-3 w-3" aria-hidden="true" />
                                terpilih
                              </span>
                            )}
                          </button>
                        </div>
                      </li>
                    )
                  })}
                  {list.length === 0 && (
                    <li className="rounded-2xl border-2 border-dashed border-border px-6 py-8 text-center">
                      <Search className="mx-auto h-5 w-5 text-content-muted" />
                      <p className="mt-2 text-note font-semibold text-content-muted">
                        Tidak ada dompet cocok
                      </p>
                      <p className="mt-0.5 text-meta text-content-muted">
                        Coba kata lain, atau tambah dompet baru di bawah.
                      </p>
                    </li>
                  )}
                </ul>
              </section>
            </div>

            {/* 4 — Form tambah dompet */}
            <div className="shrink-0 border-t border-border px-5 pt-3">
              {adding ? (
                <div className="flex gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value.slice(0, 20))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitNewWallet()
                    }}
                    placeholder="mis. E-Wallet"
                    autoFocus
                    className="h-11 rounded-xl border-border bg-surface-sunken text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
                  />
                  <button
                    type="button"
                    onClick={submitNewWallet}
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
                  Tambah dompet baru
                </button>
              )}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
