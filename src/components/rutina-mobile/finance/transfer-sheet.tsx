'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import { ArrowLeftRight, ChevronDown, Delete } from 'lucide-react'
import { toast } from 'sonner'

import { fade, sheetSpring } from '@/lib/motion/transitions'
import { Label } from '@/components/ui/label'
import { CONTENT_W } from '../layout-widths'
import { addDaysISO, shortDateLabel, todayISO, useRutina } from '../store'
import { useFocusTrap } from '../use-focus-trap'
import { WalletPickerSheet } from './wallet-picker-sheet'
import { formatIDR, walletBalance } from './utils'

/**
 * Lembar transfer antar-dompet — uang berpindah antar sumber dana,
 * tercatat sebagai tipe 'transfer' yang tidak menggelembungkan
 * statistik pemasukan/pengeluaran.
 * v2.42: tanggal transfer bisa dipilih (kemarin dst.) — selaras dengan
 * lembar transaksi; saldo dompet dihitung dari seluruh mutasi sehingga
 * transfer ber-tanggal lampau tetap konsisten.
 */

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'back']

export function TransferSheet() {
  const open = useRutina((s) => s.transferSheetOpen)
  const close = useRutina((s) => s.closeTransferSheet)
  const addTransfer = useRutina((s) => s.addTransfer)
  const wallets = useRutina((s) => s.wallets)
  const txs = useRutina((s) => s.txs)

  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [digits, setDigits] = useState('')
  const [note, setNote] = useState('')
  /* v2.42: tanggal transfer — default hari ini, bisa kemarin/lain. */
  const [date, setDate] = useState<string>(todayISO())
  const [pickerFor, setPickerFor] = useState<'from' | 'to' | null>(null)
  const [prevOpen, setPrevOpen] = useState(false)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(open, panelRef)

  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setFromId(wallets[0]?.id ?? '')
      setToId(wallets[1]?.id ?? wallets[0]?.id ?? '')
      setDigits('')
      setNote('')
      setDate(todayISO())
      setPickerFor(null)
    }
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  const amount = Number(digits || '0')
  const from = wallets.find((w) => w.id === fromId)
  const to = wallets.find((w) => w.id === toId)
  const fromBal = from ? walletBalance(txs, from) : 0

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

  const submit = () => {
    if (!from || !to) {
      toast.warning('Pilih dompet sumber & tujuan')
      return
    }
    if (from.id === to.id) {
      toast.warning('Dompet sumber dan tujuan tidak boleh sama')
      return
    }
    if (amount <= 0) {
      toast.warning('Masukkan nominal transfer')
      return
    }
    if (amount > fromBal) {
      toast.warning(
        `Saldo ${from.name} kurang — tersisa ${formatIDR(fromBal)}`,
      )
      return
    }
    addTransfer({ fromId: from.id, toId: to.id, amount, note, date })
    toast.success(
      `${formatIDR(amount)} dipindah dari ${from.name} ke ${to.name}${
        date !== todayISO() ? ` · ${shortDateLabel(date)}` : ''
      }`,
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={close}
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
            aria-label="Transfer antar dompet"
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
            className={`absolute inset-x-0 bottom-0 z-50 mx-auto max-h-[92%] w-full overflow-y-auto rounded-t-sheet bg-surface-primary px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 no-scrollbar ${CONTENT_W}`}
          >
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-content-secondary/25" />
            </div>

            <div className="text-left">
              <h2 className="flex items-center gap-2 text-lead font-semibold tracking-tight text-content-primary">
                <ArrowLeftRight className="h-4.5 w-4.5 text-warning" />
                Transfer Antar-Dompet
              </h2>
              <p className="mt-0.5 text-note text-content-muted">
                Uang berpindah — tidak dihitung sebagai pemasukan/pengeluaran.
              </p>
            </div>

            {/* Pemilih dompet — baris tombol (pengganti <select> native)
                yang membuka lembar pemilih dompet: konsisten dengan
                lembar transaksi, bisa cari + tambah dompet. */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="tr-from" className="text-note font-semibold text-content-secondary">
                  Dari
                </Label>
                <button
                  type="button"
                  id="tr-from"
                  onClick={() => setPickerFor('from')}
                  aria-haspopup="dialog"
                  aria-label={`Dompet sumber: ${
                    from?.name ?? 'belum dipilih'
                  }. Ketuk untuk mengganti.`}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-sunken px-3 py-1.5 text-left transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="min-w-0 flex-1 line-clamp-2 break-words text-body font-semibold leading-snug text-content-primary">
                    {from?.name ?? 'Pilih dompet'}
                  </span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-content-muted"
                    aria-hidden="true"
                  />
                </button>
                {from && (
                  <p className="text-eyebrow font-medium tabular-nums text-content-muted">
                    Saldo: {formatIDR(fromBal)}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tr-to" className="text-note font-semibold text-content-secondary">
                  Ke
                </Label>
                <button
                  type="button"
                  id="tr-to"
                  onClick={() => setPickerFor('to')}
                  aria-haspopup="dialog"
                  aria-label={`Dompet tujuan: ${
                    to?.name ?? 'belum dipilih'
                  }. Ketuk untuk mengganti.`}
                  className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-sunken px-3 py-1.5 text-left transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="min-w-0 flex-1 line-clamp-2 break-words text-body font-semibold leading-snug text-content-primary">
                    {to?.name ?? 'Pilih dompet'}
                  </span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-content-muted"
                    aria-hidden="true"
                  />
                </button>
                {to && (
                  <p className="text-eyebrow font-medium text-content-muted">
                    Tujuan: {to.name}
                  </p>
                )}
              </div>
            </div>

            {/* Nominal */}
            <div className="mt-5 text-center">
              <span
                className={`text-kpi-lg font-bold leading-none tabular-nums transition-colors ${
                  amount ? 'text-warning' : 'text-warning/35'
                }`}
              >
                {amount ? formatIDR(amount) : 'Rp0'}
              </span>
            </div>

            {/* Tanggal transfer (v2.42) — chip cepat + input tanggal,
                pola sama dengan lembar transaksi. */}
            <div className="mt-4 space-y-1.5" role="group" aria-label="Tanggal transfer">
              <span className="text-note font-semibold text-content-secondary">
                Tanggal{' '}
                <span className="font-normal text-content-muted">
                  (bisa pilih kemarin)
                </span>
              </span>
              <div className="flex gap-2">
                {[
                  { key: 'today', label: 'Hari ini', iso: todayISO() },
                  { key: 'yesterday', label: 'Kemarin', iso: addDaysISO(todayISO(), -1) },
                ].map((chip) => {
                  const on = date === chip.iso
                  return (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setDate(chip.iso)}
                      aria-pressed={on}
                      className={`h-10 flex-1 cursor-pointer rounded-xl text-note font-bold transition-all active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        on
                          ? 'bg-primary text-primary-foreground shadow-soft'
                          : 'border border-border bg-surface-sunken text-content-secondary'
                      }`}
                    >
                      {chip.label}
                    </button>
                  )
                })}
                <input
                  id="tr-date"
                  type="date"
                  value={date}
                  min={addDaysISO(todayISO(), -365)}
                  max={todayISO()}
                  onChange={(e) => {
                    /* Kosong jatuh kembali ke hari ini. */
                    setDate(e.target.value || todayISO())
                  }}
                  aria-label="Pilih tanggal transfer lain, maksimal satu tahun ke belakang"
                  className="h-10 flex-1 rounded-xl border border-border bg-surface-sunken px-2 text-center text-note font-semibold tabular-nums text-content-primary transition-colors hover:border-primary/40 focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
              </div>
            </div>

            {/* Catatan */}
            <div className="mt-4">
              <Label htmlFor="tr-note" className="text-note font-semibold text-content-secondary">
                Catatan <span className="font-normal text-content-muted">(opsional)</span>
              </Label>
              <input
                id="tr-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="mis. Tarik tunai ATM"
                maxLength={40}
                className="mt-1.5 h-11 w-full rounded-xl border border-input bg-surface-sunken px-3.5 text-body text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary/30"
              />
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

            <m.button
              type="button"
              onClick={submit}
              whileTap={{ scale: 0.97 }}
              className="mt-5 h-12 w-full cursor-pointer rounded-full bg-surface-inverse text-section font-bold text-content-inverse shadow-soft transition-colors hover:bg-surface-inverse-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Transfer Sekarang
            </m.button>
          </m.div>

          {/* Lembar pemilih dompet — sumber & tujuan (tujuan mengecualikan
              sumber agar transfer ke dompet sendiri tidak mungkin). */}
          <WalletPickerSheet
            open={pickerFor === 'from'}
            selectedId={fromId}
            onSelect={(id) => setFromId(id)}
            onClose={() => setPickerFor(null)}
          />
          <WalletPickerSheet
            open={pickerFor === 'to'}
            selectedId={toId}
            excludeId={fromId}
            onSelect={(id) => setToId(id)}
            onClose={() => setPickerFor(null)}
          />
        </>
      )}
    </AnimatePresence>
  )
}
