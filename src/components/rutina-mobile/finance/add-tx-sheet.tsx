'use client'

import { useEffect, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useDragControls,
  type Variants,
} from 'motion/react'
import { Delete } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CONTENT_W } from '../layout-widths'
import { useRutina, type FinCat, type TxType } from '../store'
import { CAT_META, CATS_BY_TYPE } from './cats'
import { formatIDR } from './utils'

/**
 * Lembar tambah transaksi — keypad khas aplikasi keuangan:
 * tombol "000" untuk nominal bulat, kategori bergambar yang berganti
 * himpunan mengikuti arah arus (Pengeluaran / Pemasukan).
 */

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'back']

/* Kategori melintas arah mengikuti tipe — masuk dari kanan, keluar dari kiri. */
const gridSwap: Variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 26 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } },
  exit: (dir: number) => ({ opacity: 0, x: dir * -26, transition: { duration: 0.18 } }),
}

export function AddTxSheet() {
  const open = useRutina((s) => s.txSheetOpen)
  const closeTxSheet = useRutina((s) => s.closeTxSheet)
  const addTx = useRutina((s) => s.addTx)

  const [type, setType] = useState<TxType>('keluar')
  const [cat, setCat] = useState<FinCat>('makan')
  const [digits, setDigits] = useState('')
  const [note, setNote] = useState('')
  const [prevOpen, setPrevOpen] = useState(false)
  const dragControls = useDragControls()

  /* Draf di-reset setiap kali lembar dibuka. */
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setType('keluar')
      setCat('makan')
      setDigits('')
      setNote('')
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
    setCat(CATS_BY_TYPE[t][0])
  }

  const submit = () => {
    if (!amount) {
      toast.warning('Masukkan nominal terlebih dahulu')
      return
    }
    addTx({ type, cat, amount, note })
    closeTxSheet()
    toast.success(
      type === 'keluar'
        ? `Pengeluaran ${formatIDR(amount)} dicatat`
        : `Pemasukan ${formatIDR(amount)} dicatat`,
    )
  }

  const amountColor =
    type === 'keluar' ? 'text-[#B25E3F]' : 'text-[#658A4C]'
  const gridDir = type === 'masuk' ? 1 : -1

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            aria-hidden="true"
            onClick={closeTxSheet}
            className="absolute inset-0 z-40 bg-[#231F1E]/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
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
            className={`absolute inset-x-0 bottom-0 z-50 mx-auto max-h-[92%] w-full overflow-y-auto rounded-t-[28px] bg-[#FAF9F6] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 no-scrollbar ${CONTENT_W}`}
          >
            {/* Pegangan seret */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-[#4A3B32]/15" />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="text-left">
                <h2 className="text-lg font-semibold tracking-tight text-[#231F1E]">
                  Transaksi Baru
                </h2>
                <p className="mt-0.5 text-[13px] text-[#4A3B32]/70">
                  Catat arus uang — jatuh tempo 20 Jun 2025.
                </p>
              </div>
            </div>

            {/* Saklar tipe arus */}
            <div
              role="group"
              aria-label="Jenis transaksi"
              className="relative mt-3 flex rounded-full bg-[#EAE5D9] p-1"
            >
              {(['keluar', 'masuk'] as TxType[]).map((t) => {
                const on = type === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => switchType(t)}
                    aria-pressed={on}
                    className={`relative z-10 flex h-9 flex-1 cursor-pointer items-center justify-center rounded-full text-[13px] font-bold transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] ${
                      on
                        ? t === 'keluar'
                          ? 'text-[#B25E3F]'
                          : 'text-[#658A4C]'
                        : 'text-[#4A3B32]/55'
                    }`}
                  >
                    {on && (
                      <motion.span
                        aria-hidden="true"
                        layoutId="tx-type-pill"
                        className="absolute inset-0 z-[-1] rounded-full bg-white shadow-[0_2px_10px_rgba(74,59,50,0.16)]"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    {t === 'keluar' ? 'Pengeluaran' : 'Pemasukan'}
                  </button>
                )
              })}
            </div>

            {/* Nominal besar */}
            <div className="mt-4 text-center">
              <span
                className={`text-[34px] font-bold leading-none tabular-nums transition-colors duration-300 ${amountColor} ${
                  amount ? '' : 'opacity-35'
                }`}
              >
                {amount ? formatIDR(amount) : 'Rp0'}
              </span>
              <p className="mt-1 text-[11px] text-[#4A3B32]/55">
                {CAT_META[cat].label} · 20 Jun 2025
              </p>
            </div>

            {/* Pemilih kategori — himpunan berganti mengikuti tipe */}
            <div className="mt-4">
              <span className="text-[13px] font-semibold text-[#4A3B32]">
                Kategori
              </span>
              <AnimatePresence mode="wait" custom={gridDir} initial={false}>
                <motion.div
                  key={type}
                  custom={gridDir}
                  variants={gridSwap}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="mt-2 grid grid-cols-4 gap-2"
                >
                  {CATS_BY_TYPE[type].map((c) => {
                    const on = cat === c
                    const Icon = CAT_META[c].icon
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCat(c)}
                        aria-pressed={on}
                        className={`flex h-[64px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all duration-200 active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58] ${
                          on
                            ? 'border-[#749B58] bg-[#E4EFE0] shadow-[0_4px_14px_rgba(116,155,88,0.22)]'
                            : 'border-[#4A3B32]/10 bg-[#F5F3EE] hover:border-[#749B58]/40'
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${on ? 'text-[#658A4C]' : 'text-[#4A3B32]/70'}`}
                          strokeWidth={on ? 2.4 : 2}
                        />
                        <span
                          className={`px-1 text-center text-[10.5px] font-semibold leading-tight ${
                            on ? 'text-[#658A4C]' : 'text-[#4A3B32]/65'
                          }`}
                        >
                          {CAT_META[c].label}
                        </span>
                      </button>
                    )
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Catatan */}
            <div className="mt-4 space-y-1.5">
              <Label
                htmlFor="tx-note"
                className="text-[13px] font-semibold text-[#4A3B32]"
              >
                Catatan <span className="font-normal text-[#4A3B32]/50">(opsional)</span>
              </Label>
              <Input
                id="tx-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="mis. Ngopi sama tim proyek"
                maxLength={40}
                className="h-11 rounded-xl border-[#4A3B3233] bg-[#F5F3EE] text-[#231F1E] placeholder:text-[#4A3B32]/40 focus-visible:border-[#749B58] focus-visible:ring-[#749B58]/25"
              />
            </div>

            {/* Keypad */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {KEYS.map((k) =>
                k === 'back' ? (
                  <motion.button
                    key={k}
                    type="button"
                    onClick={() => press(k)}
                    whileTap={{ scale: 0.92 }}
                    aria-label="Hapus satu digit"
                    className="flex h-11 cursor-pointer items-center justify-center rounded-2xl bg-[#EAE5D9] text-[#4A3B32] transition-colors hover:bg-[#E4EFE0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
                  >
                    <Delete className="h-5 w-5" />
                  </motion.button>
                ) : (
                  <motion.button
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
                  </motion.button>
                ),
              )}
            </div>

            {/* Aksi */}
            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={closeTxSheet}
                className="h-11 flex-1 rounded-full font-semibold text-[#4A3B32] hover:bg-[#EAE5D9] hover:text-[#231F1E]"
              >
                Batal
              </Button>
              <Button
                type="button"
                onClick={submit}
                disabled={!amount}
                className="h-11 flex-1 rounded-full bg-[#749B58] font-semibold text-white hover:bg-[#658A4C] disabled:opacity-45"
              >
                Simpan Transaksi
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
