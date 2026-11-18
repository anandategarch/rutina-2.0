'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import { ArrowLeftRight, Delete } from 'lucide-react'
import { toast } from 'sonner'

import { Label } from '@/components/ui/label'
import { CONTENT_W } from '../layout-widths'
import { useRutina } from '../store'
import { useFocusTrap } from '../use-focus-trap'
import { formatIDR, walletBalance } from './utils'

/**
 * Lembar transfer antar-dompet — uang berpindah antar sumber dana,
 * tercatat sebagai tipe 'transfer' yang tidak menggelembungkan
 * statistik pemasukan/pengeluaran.
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
    addTransfer({ fromId: from.id, toId: to.id, amount, note })
    toast.success(
      `${formatIDR(amount)} dipindah dari ${from.name} ke ${to.name}`,
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
            className="absolute inset-0 z-40 bg-[#231F1E]/45"
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
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className={`absolute inset-x-0 bottom-0 z-50 mx-auto max-h-[92%] w-full overflow-y-auto rounded-t-[28px] bg-[#FAF9F6] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 no-scrollbar ${CONTENT_W}`}
          >
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-[#4A3B32]/15" />
            </div>

            <div className="text-left">
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[#231F1E]">
                <ArrowLeftRight className="h-4.5 w-4.5 text-[#A98650]" />
                Transfer Antar-Dompet
              </h2>
              <p className="mt-0.5 text-[13px] text-[#4A3B32]/70">
                Uang berpindah — tidak dihitung sebagai pemasukan/pengeluaran.
              </p>
            </div>

            {/* Pemilih dompet */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="tr-from" className="text-[13px] font-semibold text-[#4A3B32]">
                  Dari
                </Label>
                <select
                  id="tr-from"
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
                  className="h-11 w-full cursor-pointer rounded-xl border border-[#4A3B3233] bg-[#F5F3EE] px-2.5 text-[13.5px] font-semibold text-[#231F1E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#749B58]"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                {from && (
                  <p className="text-[11px] font-medium tabular-nums text-[#4A3B32]/60">
                    Saldo: {formatIDR(fromBal)}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tr-to" className="text-[13px] font-semibold text-[#4A3B32]">
                  Ke
                </Label>
                <select
                  id="tr-to"
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="h-11 w-full cursor-pointer rounded-xl border border-[#4A3B3233] bg-[#F5F3EE] px-2.5 text-[13.5px] font-semibold text-[#231F1E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#749B58]"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                {to && (
                  <p className="text-[11px] font-medium text-[#4A3B32]/60">
                    Tujuan: {to.name}
                  </p>
                )}
              </div>
            </div>

            {/* Nominal */}
            <div className="mt-5 text-center">
              <span
                className={`text-[34px] font-bold leading-none tabular-nums transition-colors ${
                  amount ? 'text-[#A98650]' : 'text-[#A98650]/35'
                }`}
              >
                {amount ? formatIDR(amount) : 'Rp0'}
              </span>
            </div>

            {/* Catatan */}
            <div className="mt-4">
              <Label htmlFor="tr-note" className="text-[13px] font-semibold text-[#4A3B32]">
                Catatan <span className="font-normal text-[#4A3B32]/50">(opsional)</span>
              </Label>
              <input
                id="tr-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="mis. Tarik tunai ATM"
                maxLength={40}
                className="mt-1.5 h-11 w-full rounded-xl border border-[#4A3B3233] bg-[#F5F3EE] px-3.5 text-[14px] text-[#231F1E] placeholder:text-[#4A3B32]/40 focus-visible:border-[#749B58] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#749B58]/30"
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
                    className="flex h-11 cursor-pointer items-center justify-center rounded-2xl bg-[#EAE5D9] text-[#4A3B32] transition-colors hover:bg-[#E4EFE0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
                  >
                    <Delete className="h-5 w-5" />
                  </m.button>
                ) : (
                  <m.button
                    key={k}
                    type="button"
                    onClick={() => press(k)}
                    whileTap={{ scale: 0.92 }}
                    className={`h-11 cursor-pointer rounded-2xl text-[17px] font-bold tabular-nums transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] ${
                      k === '000'
                        ? 'bg-[#E4EFE0] text-[#658A4C] hover:bg-[#D8E8CF]'
                        : 'bg-[#F5F3EE] text-[#231F1E] hover:bg-[#EAE5D9]'
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
              whileTap={{ scale: 0.98 }}
              className="mt-5 h-12 w-full cursor-pointer rounded-full bg-[#231F1E] text-[15px] font-bold text-[#FAF9F6] shadow-soft transition-colors hover:bg-[#3A2E24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
            >
              Transfer Sekarang
            </m.button>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
