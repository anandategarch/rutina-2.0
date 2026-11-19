'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  useDragControls,
} from 'motion/react'
import * as m from 'motion/react-m'
import { Delete } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronRight } from 'lucide-react'
import { CONTENT_W } from '../layout-widths'
import {
  shortDateLabel,
  todayISO,
  useRutina,
  type Recurrence,
  type TxType,
} from '../store'
import { useFocusTrap } from '../use-focus-trap'
import { CatPickerSheet } from './cat-picker-sheet'
import { catMetaOf, PRIMARY_CATS_BY_TYPE } from './cats'
import { formatIDR } from './utils'

/**
 * Lembar tambah transaksi (v2.17) — keypad khas aplikasi keuangan
 * dengan pemilih kategori DROPDOWN: form tetap pendek, hanya menampilkan
 * kategori terpilih; daftar lengkap (bawaan 2.0 + impor 1.0 + buatan,
 * tanpa penanda asal) hidup di CatPickerSheet bersama pencarian,
 * kategori sering dipakai, dan tombol tambah.
 * v2.18: subkategori dihapus — kategori saja cukup.
 */

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'back']

export function AddTxSheet() {
  const open = useRutina((s) => s.txSheetOpen)
  const closeTxSheet = useRutina((s) => s.closeTxSheet)
  const addTx = useRutina((s) => s.addTx)
  const wallets = useRutina((s) => s.wallets)
  const customCats = useRutina((s) => s.customCats)

  const [type, setType] = useState<TxType>('keluar')
  const [cat, setCat] = useState<string>('makan')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [digits, setDigits] = useState('')
  const [note, setNote] = useState('')
  const [walletId, setWalletId] = useState('')
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null)
  const [prevOpen, setPrevOpen] = useState(false)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  /* Focus management: fokus awal, trap Tab, kembalikan fokus saat tutup. */
  useFocusTrap(open, panelRef)

  /* Draf di-reset setiap kali lembar dibuka. */
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setType('keluar')
      setCat('makan')
      setPickerOpen(false)
      setDigits('')
      setNote('')
      setWalletId(wallets[0]?.id ?? '')
      setRecurrence(null)
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTxSheet()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeTxSheet])

  const amount = Number(digits || '0')

  const press = (k: string) => {
    if (k === 'back') {
      setDigits((d) => d.slice(0, -1))
      return
    }
    setDigits((d) => {
      const next = d === '0' ? (k === '000' ? '000' : k) : d + k
      return next.slice(0, 9)
    })
  }

  const switchType = (t: TxType) => {
    if (t === type) return
    setType(t)
    setCat(PRIMARY_CATS_BY_TYPE[t][0])
  }

  const submit = () => {
    if (!amount) {
      toast.warning('Masukkan nominal terlebih dahulu')
      return
    }
    addTx({
      type,
      cat,
      amount,
      note,
      walletId: walletId || undefined,
      recurrence,
    })
    if (recurrence) {
      useRutina.getState().materializeRecurring()
    }
    closeTxSheet()
    toast.success(
      type === 'keluar'
        ? `Pengeluaran ${formatIDR(amount)} dicatat`
        : `Pemasukan ${formatIDR(amount)} dicatat`,
    )
  }

  const amountColor =
    type === 'keluar' ? 'text-content-danger' : 'text-success'

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={closeTxSheet}
            className="absolute inset-0 z-40 bg-espresso/45"
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
            aria-label="Tambah transaksi"
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 600) closeTxSheet()
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className={`absolute inset-x-0 bottom-0 z-50 mx-auto max-h-[92%] w-full overflow-y-auto rounded-t-[28px] bg-surface-primary px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 no-scrollbar ${CONTENT_W}`}
          >
            {/* Pegangan seret */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-cocoa/15" />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="text-left">
                <h2 className="text-lg font-semibold tracking-tight text-content-primary">
                  Transaksi Baru
                </h2>
                <p className="mt-0.5 text-note text-content-muted">
                  Catat arus uang — {shortDateLabel(todayISO())}.
                </p>
              </div>
            </div>

            {/* Saklar tipe arus */}
            <div
              role="group"
              aria-label="Jenis transaksi"
              className="relative mt-3 flex rounded-full bg-surface-secondary p-1"
            >
              {(['keluar', 'masuk'] as TxType[]).map((t) => {
                const on = type === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => switchType(t)}
                    aria-pressed={on}
                    className={`relative z-10 flex h-9 flex-1 cursor-pointer items-center justify-center rounded-full text-note font-bold transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
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
                        layoutId="tx-type-pill"
                        className="absolute inset-0 z-[-1] rounded-full bg-surface-primary shadow-soft"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    {t === 'keluar' ? 'Pengeluaran' : 'Pemasukan'}
                  </button>
                )
              })}
            </div>

            {/* Nominal besar — diumumkan ke pembaca layar (audit T5-d #2):
                keypad tidak memberi umpan balik lain saat nilai diketik. */}
            <div className="mt-4 text-center">
              <span
                role="status"
                aria-live="polite"
                aria-label={`Nominal saat ini: ${amount ? formatIDR(amount) : 'Rp0'}`}
                className={`text-kpi-lg font-bold leading-none tabular-nums transition-colors duration-300 ${amountColor} ${
                  amount ? '' : 'opacity-35'
                }`}
              >
                {amount ? formatIDR(amount) : 'Rp0'}
              </span>
              <p className="mt-1 text-eyebrow text-content-muted">
                {catMetaOf(cat, customCats).label} · {shortDateLabel(todayISO())}
              </p>
            </div>

            {/* Kategori — DROPDOWN satu sistem (v2.17): form hanya
                menampilkan kategori terpilih; daftar lengkap + pencarian
                + sering dipakai + tambah ada di lembar pemilih.
                v2.18: tanpa subkategori. Tanpa penanda asal kategori. */}
            <div className="mt-4 space-y-1.5">
              <span className="text-note font-semibold text-content-secondary">
                Kategori
              </span>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                aria-haspopup="dialog"
                aria-label={`Kategori terpilih: ${catMetaOf(cat, customCats).label}. Ketuk untuk mengganti.`}
                className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-sunken px-3.5 text-left transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {(() => {
                  const meta = catMetaOf(cat, customCats)
                  const Icon = meta.icon
                  return (
                    <>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-success">
                        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body font-semibold text-content-primary">
                        {meta.label}
                      </span>
                      <ChevronRight
                        className="h-4.5 w-4.5 shrink-0 text-content-muted"
                        aria-hidden="true"
                      />
                    </>
                  )
                })()}
              </button>
            </div>

            {/* Catatan */}
            <div className="mt-4 space-y-1.5">
              <Label
                htmlFor="tx-note"
                className="text-note font-semibold text-content-secondary"
              >
                Catatan <span className="font-normal text-content-muted">(opsional)</span>
              </Label>
              <Input
                id="tx-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="mis. Ngopi sama tim proyek"
                maxLength={40}
                className="h-11 rounded-xl border-input bg-surface-sunken text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
              />
            </div>

            {/* Dompet sumber — hanya bila pengguna punya dompet */}
            {wallets.length > 0 && (
              <div className="mt-4 space-y-1.5" role="group" aria-label="Dompet sumber">
                <span className="text-note font-semibold text-content-secondary">
                  Dompet
                </span>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {wallets.map((w) => {
                    const on = walletId === w.id
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setWalletId(w.id)}
                        aria-pressed={on}
                        className={`h-10 shrink-0 cursor-pointer rounded-full px-4 text-note font-bold transition-all active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          on
                            ? 'bg-surface-inverse text-content-inverse shadow-soft'
                            : 'border border-border bg-surface-sunken text-content-secondary'
                        }`}
                      >
                        {w.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Transaksi berulang */}
            <div className="mt-4 space-y-1.5" role="group" aria-label="Transaksi berulang">
              <span className="text-note font-semibold text-content-secondary">
                Berulang{' '}
                <span className="font-normal text-content-muted">
                  (tercatat otomatis tiap jadwal)
                </span>
              </span>
              <div className="flex gap-2">
                {([null, 'mingguan', 'bulanan'] as const).map((r) => {
                  const on = recurrence === r
                  return (
                    <button
                      key={r ?? 'sekali'}
                      type="button"
                      onClick={() => setRecurrence(r as Recurrence | null)}
                      aria-pressed={on}
                      className={`h-10 flex-1 cursor-pointer rounded-xl text-note font-bold transition-all active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        on
                          ? 'bg-primary text-primary-foreground shadow-soft'
                          : 'border border-border bg-surface-sunken text-content-secondary'
                      }`}
                    >
                      {r === null ? 'Sekali' : r === 'mingguan' ? 'Mingguan' : 'Bulanan'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Keypad */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {KEYS.map((k) =>
                k === 'back' ? (
                  <m.button
                    key={k}
                    type="button"
                    onClick={() => press(k)}
                    whileTap={{ scale: 0.92 }}
                    aria-label="Hapus satu digit"
                    className="flex h-11 cursor-pointer items-center justify-center rounded-2xl bg-surface-secondary text-content-secondary transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <Delete className="h-5 w-5" />
                  </m.button>
                ) : (
                  <m.button
                    key={k}
                    type="button"
                    onClick={() => press(k)}
                    whileTap={{ scale: 0.92 }}
                    className={`h-11 cursor-pointer rounded-2xl text-lead font-bold tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      k === '000'
                        ? 'bg-secondary text-success hover:bg-secondary/80'
                        : 'bg-surface-sunken text-content-primary hover:bg-surface-secondary'
                    }`}
                  >
                    {k}
                  </m.button>
                ),
              )}
            </div>

            {/* Aksi */}
            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={closeTxSheet}
                className="h-11 flex-1 rounded-full font-semibold text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={submit}
                disabled={!amount}
                className="h-11 flex-1 rounded-full bg-primary font-semibold text-primary-foreground hover:bg-action-hover disabled:opacity-45"
              >
                Simpan Transaksi
              </Button>
            </div>
          </m.div>

          {/* Lembar pemilih kategori — overlay di atas lembar transaksi
              (v2.17): satu sistem kategori + pencarian. */}
          <CatPickerSheet
            open={pickerOpen}
            type={type}
            selected={cat}
            onSelect={(c) => setCat(c)}
            onClose={() => setPickerOpen(false)}
          />
        </>
      )}
    </AnimatePresence>
  )
}
