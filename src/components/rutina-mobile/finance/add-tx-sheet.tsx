'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  useDragControls,
} from 'motion/react'
import * as m from 'motion/react-m'
import { Delete, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import { fade, sheetSpring } from '@/lib/motion/transitions'
import { motionTokens } from '@/lib/motion/tokens'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronRight } from 'lucide-react'
import { CONTENT_W } from '../layout-widths'
import {
  addDaysISO,
  shortDateLabel,
  todayISO,
  useRutina,
  type Recurrence,
  type TxType,
} from '../store'
import { useFocusTrap } from '../use-focus-trap'
import { useEscapeLayer } from '../overlay-escape'
import { CatPickerSheet } from './cat-picker-sheet'
import { WalletPickerSheet } from './wallet-picker-sheet'
import { catMetaOf, PRIMARY_CATS_BY_TYPE } from './cats'
import { formatIDR } from './utils'

/**
 * Lembar tambah/sunting transaksi (v2.17, v2.22) — keypad khas
 * aplikasi keuangan dengan pemilih kategori DROPDOWN: form tetap pendek,
 * hanya menampilkan kategori terpilih; daftar lengkap (bawaan 2.0 +
 * impor 1.0 + buatan, tanpa penanda asal) hidup di CatPickerSheet bersama
 * pencarian, kategori sering dipakai, dan tombol tambah.
 * v2.18: subkategori dihapus — kategori saja cukup.
 * v2.22: MODE SUNTING — txEditId terisi → lembar terbuka membawa nilai
 * transaksi lama; simpan memperbarui baris yang sama (bukan menambah).
 * v2.42: TANGGAL BISA DIPILIH — chip cepat Hari ini/Kemarin + input
 * tanggal (maks. hari ini). Lupa mencatat kemarin bukan lagi halangan;
 * mode sunting pun bisa memindah tanggal tx lama yang salah catat.
 */

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'back']

export function AddTxSheet() {
  const open = useRutina((s) => s.txSheetOpen)
  const txEditId = useRutina((s) => s.txEditId)
  const txs = useRutina((s) => s.txs)
  const closeTxSheet = useRutina((s) => s.closeTxSheet)
  const addTx = useRutina((s) => s.addTx)
  const updateTx = useRutina((s) => s.updateTx)
  const wallets = useRutina((s) => s.wallets)
  const customCats = useRutina((s) => s.customCats)

  /* Transaksi yang sedang disunting (v2.22) — null = mode tambah. */
  const editing = txEditId ? (txs.find((t) => t.id === txEditId) ?? null) : null

  const [type, setType] = useState<TxType>('keluar')
  const [cat, setCat] = useState<string>('makan')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [walletPickerOpen, setWalletPickerOpen] = useState(false)
  const [digits, setDigits] = useState('')
  const [note, setNote] = useState('')
  const [walletId, setWalletId] = useState('')
  const [recurrence, setRecurrence] = useState<Recurrence | null>(null)
  /* v2.42: tanggal draf — default hari ini, bisa digeser ke kemarin
     atau tanggal lain (maks. hari ini, tidak bisa mencatat masa depan). */
  const [date, setDate] = useState<string>(todayISO())
  const [prevOpen, setPrevOpen] = useState(false)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  /* Focus management: fokus awal, trap Tab, kembalikan fokus saat tutup. */
  useFocusTrap(open, panelRef)

  /* Draf di-reset setiap kali lembar dibuka — mode sunting membawa nilai
     transaksi lama (v2.22). */
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      if (editing) {
        setType(editing.type === 'masuk' ? 'masuk' : 'keluar')
        setCat(editing.cat)
        setDigits(editing.amount > 0 ? String(editing.amount) : '')
        setNote(editing.note)
        setWalletId(editing.walletId ?? '')
        /* Tanggal tx lama dibawa ke draf — bisa dipindah bila salah. */
        setDate(editing.ts)
        /* Berulang hanya bisa diubah pada templat asli — salinan otomatis
           mengikuti templatnya. */
        setRecurrence(editing.recurOf ? null : (editing.recurrence ?? null))
      } else {
        setType('keluar')
        setCat('makan')
        setDigits('')
        setNote('')
        setWalletId(wallets[0]?.id ?? '')
        setRecurrence(null)
        setDate(todayISO())
      }
      setPickerOpen(false)
      setWalletPickerOpen(false)
    }
  }

  /* v2.49 (audit): Escape lewat tumpukan lapisan — pemilih kategori /
     dompet di atas lembar ini ditutup berlapis, draf transaksi aman. */
  useEscapeLayer(open, () => closeTxSheet())

  const amount = Number(digits || '0')
  const today = todayISO()
  const yesterday = addDaysISO(today, -1)

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
    /* Keterangan tanggal pada toast — hanya disebut bila BUKAN hari ini
       agar tidak menambah derau pada alur paling umum. */
    const whenNote =
      date !== today ? ` · ${shortDateLabel(date)}` : ''
    /* Mode sunting (v2.22): perbarui baris yang sama — tanggal ikut
       bisa dipindah (v2.42). */
    if (editing) {
      updateTx(editing.id, {
        type,
        cat,
        amount,
        note,
        walletId: walletId || undefined,
        /* Salinan otomatis tidak menyimpan jadwal sendiri. */
        recurrence: editing.recurOf ? undefined : recurrence,
        ts: date,
      })
      closeTxSheet()
      toast.success(`Transaksi ${formatIDR(amount)} diperbarui${whenNote}`)
      return
    }
    addTx({
      type,
      cat,
      amount,
      note,
      walletId: walletId || undefined,
      recurrence,
      date,
    })
    if (recurrence) {
      useRutina.getState().materializeRecurring()
    }
    closeTxSheet()
    toast.success(
      type === 'keluar'
        ? `Pengeluaran ${formatIDR(amount)} dicatat${whenNote}`
        : `Pemasukan ${formatIDR(amount)} dicatat${whenNote}`,
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
            transition={fade}
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
            transition={sheetSpring}
            className={`absolute inset-x-0 bottom-0 z-50 mx-auto max-h-[92%] w-full overflow-y-auto rounded-t-sheet bg-surface-primary px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 no-scrollbar ${CONTENT_W}`}
          >
            {/* Pegangan seret */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-7 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-content-secondary/25" />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="text-left">
                <h2 className="text-lead font-semibold tracking-tight text-content-primary">
                  {editing ? 'Sunting Transaksi' : 'Transaksi Baru'}
                </h2>
                <p className="mt-0.5 text-note text-content-muted">
                  {editing
                    ? `Perubahan menggantikan catatan lama — ${shortDateLabel(date)}.`
                    : `Catat arus uang — ${shortDateLabel(date)}.`}
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
                        transition={motionTokens.spring.snappy}
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
                {catMetaOf(cat, customCats).label} · {shortDateLabel(date)}
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
                className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-sunken px-3.5 text-left transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {(() => {
                  const meta = catMetaOf(cat, customCats)
                  const Icon = meta.icon
                  return (
                    <>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-success">
                        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 line-clamp-2 break-words text-body font-semibold leading-snug text-content-primary">
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

            {/* Dompet sumber — hanya bila pengguna punya dompet.
                Dropdown satu baris menggantikan deretan chip: daftar
                lengkap + pencarian + tambah dompet ada di lembar
                pemilih dompet. */}
            {wallets.length > 0 && (
              <div className="mt-4 space-y-1.5" role="group" aria-label="Dompet sumber">
                <span className="text-note font-semibold text-content-secondary">
                  Dompet
                </span>
                <button
                  type="button"
                  onClick={() => setWalletPickerOpen(true)}
                  aria-haspopup="dialog"
                  aria-label={`Dompet terpilih: ${
                    wallets.find((w) => w.id === walletId)?.name ?? 'tanpa dompet'
                  }. Ketuk untuk mengganti.`}
                  className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-sunken px-3.5 text-left transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-success">
                    <Wallet className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 line-clamp-2 break-words text-body font-semibold leading-snug text-content-primary">
                    {wallets.find((w) => w.id === walletId)?.name ?? 'Tanpa dompet'}
                  </span>
                  <ChevronRight
                    className="h-4.5 w-4.5 shrink-0 text-content-muted"
                    aria-hidden="true"
                  />
                </button>
              </div>
            )}

            {/* Tanggal transaksi (v2.42) — chip cepat Hari ini/Kemarin
                + input tanggal untuk hari lain (maks. hari ini).
                Tanggal aktif tercermin di subjudul & bawah nominal. */}
            <div className="mt-4 space-y-1.5" role="group" aria-label="Tanggal transaksi">
              <span className="text-note font-semibold text-content-secondary">
                Tanggal{' '}
                <span className="font-normal text-content-muted">
                  (lupa mencatat kemarin? tinggal pilih)
                </span>
              </span>
              <div className="flex gap-2">
                {[
                  { key: 'today', label: 'Hari ini', iso: today },
                  { key: 'yesterday', label: 'Kemarin', iso: yesterday },
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
                  id="tx-date"
                  type="date"
                  value={date}
                  min={addDaysISO(today, -365)}
                  max={today}
                  onChange={(e) => {
                    /* Kosong (dibersihkan UI native) jatuh kembali ke
                       hari ini — tidak pernah menyimpan tanggal kosong. */
                    setDate(e.target.value || today)
                  }}
                  aria-label="Pilih tanggal lain, paling jauh satu tahun ke belakang"
                  className="h-10 flex-1 rounded-xl border border-border bg-surface-sunken px-2 text-center text-note font-semibold tabular-nums text-content-primary transition-colors hover:border-primary/40 focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
              </div>
            </div>

            {/* Transaksi berulang — tidak untuk salinan otomatis (recurOf). */}
            <div className="mt-4 space-y-1.5" role="group" aria-label="Transaksi berulang">
              <span className="text-note font-semibold text-content-secondary">
                Berulang{' '}
                <span className="font-normal text-content-muted">
                  {editing?.recurOf
                    ? '(salinan otomatis — ikut templatnya)'
                    : '(tercatat otomatis tiap jadwal)'}
                </span>
              </span>
              {editing?.recurOf ? (
                <p className="rounded-xl bg-surface-sunken px-3.5 py-2.5 text-meta leading-relaxed text-content-muted">
                  Ini salinan otomatis dari transaksi berulang. Ubah jadwalnya
                  di templat asal (baris dengan ikon panah melingkar).
                </p>
              ) : (
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
              )}
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
                {editing ? 'Simpan Perubahan' : 'Simpan Transaksi'}
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

          {/* Lembar pemilih dompet — overlay di atas lembar transaksi:
              pencarian, dompet sering dipakai, dan tambah dompet. */}
          <WalletPickerSheet
            open={walletPickerOpen}
            selectedId={walletId}
            onSelect={(id) => setWalletId(id)}
            onClose={() => setWalletPickerOpen(false)}
          />
        </>
      )}
    </AnimatePresence>
  )
}
