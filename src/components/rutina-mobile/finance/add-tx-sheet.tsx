'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  useDragControls,
} from 'motion/react'
import * as m from 'motion/react-m'
import { ChevronDown, ChevronRight, Delete, Wallet, X } from 'lucide-react'
import { toast } from 'sonner'

import { fade, sheetSpring } from '@/lib/motion/transitions'
import { motionTokens } from '@/lib/motion/tokens'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
 * v2.53: TATA LETAK TANPA-GULIR — seluruh isi lembar dirampingkan agar
 * muat dalam satu layar ponsel (dulu ±930px → harus menggulir 150px+):
 * judul + tombol tutup di satu baris (subjudul digabung ke baris meta
 * nominal), Kategori & Dompet jadi dua kolom berdampingan, label seksi
 * dilipat ke dalam kontrol (placeholder/aria), keypad 4 kolom × 3 baris
 * (1-9 + ⌫/000/0 di kolom kanan), dan Simpan jadi tombol lebar penuh.
 * Semua target sentuh tetap ≥44px; penutupan tetap bisa lewat pegangan
 * seret, latar, Escape, dan tombol × di kanan judul.
 */

/* Papan ketik 4 kolom × 3 baris — angka 1-9 tetap di posisi dialer,
   kolom kanan memuat ⌫ / 000 / 0 (hemat satu baris penuh vs 3×4). */
const KEYS = [
  '1', '2', '3', 'back',
  '4', '5', '6', '000',
  '7', '8', '9', '0',
]

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
  /* v2.82 (audit UX §A): opsi tanggal & pengulangan dilipat — "Hari ini"
     dan "Sekali" adalah default; Kemarin/tanggal manual serta jadwal
     mingguan/bulanan dibuka lewat satu baris saat diminta. */
  const [dateOptionsOpen, setDateOptionsOpen] = useState(false)
  const [recurrenceOptionsOpen, setRecurrenceOptionsOpen] = useState(false)
  const [prevOpen, setPrevOpen] = useState(false)
  /* Anti ketukan-ganda (v2.82, audit UX §A): Simpan dua kali cepat tidak
     boleh mencatat dua transaksi — gerbang ref, tanpa render tambahan. */
  const submittingRef = useRef(false)
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  /* Focus management: fokus awal, trap Tab, kembalikan fokus saat tutup. */
  useFocusTrap(open, panelRef)

  /* v2.82 (audit UX §A): DEFAULT CERDAS — kategori terakhir yang dipakai
     untuk jenis arus ini & dompet terakhir dipakai; tanpa histori jatuh
     ke kategori utama (Makan & Minum / Gaji) & dompet pertama. Pengguna
     rutin tak perlu memilih ulang tiap kali mencatat. */
  const lastCatOf = (t: TxType) => {
    const recent = [...txs].sort((a, b) =>
      a.ts === b.ts ? b.id.localeCompare(a.id) : a.ts < b.ts ? 1 : -1,
    )
    return recent.find((tx) => tx.type === t)?.cat ?? PRIMARY_CATS_BY_TYPE[t][0]
  }
  const lastWalletId = () => {
    const recent = [...txs].sort((a, b) =>
      a.ts === b.ts ? b.id.localeCompare(a.id) : a.ts < b.ts ? 1 : -1,
    )
    return recent.find((tx) => tx.walletId)?.walletId ?? wallets[0]?.id ?? ''
  }

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
        setCat(lastCatOf('keluar'))
        setDigits('')
        setNote('')
        setWalletId(lastWalletId())
        setRecurrence(null)
        setDate(todayISO())
      }
      setPickerOpen(false)
      setWalletPickerOpen(false)
      setDateOptionsOpen(false)
      setRecurrenceOptionsOpen(false)
    }
  }

  /* Pulihkan gerbang anti ketukan-ganda saat lembar DIBUKA — bukan saat
     ditutup: panel tetap interaktif selama animasi keluar (~300ms), dan
     reset-prematur membuat ketukan kedua pada panel yang sedang pergi
     mencatat transaksi GANDA (reproduksi: dua ketukan cepat terpisah).
     Flag tetap terpasang dari simpan sampai sesi berikutnya dibuka. */
  useEffect(() => {
    if (open) submittingRef.current = false
  }, [open])

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
    /* Kategori mengikuti riwayat jenis arus tujuan (v2.82) — bukan reset
       buta ke kategori pertama. */
    setCat(lastCatOf(t))
  }

  const submit = () => {
    if (submittingRef.current) return
    if (!amount) {
      toast.warning('Masukkan nominal terlebih dahulu')
      return
    }
    submittingRef.current = true
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
            className={`absolute inset-x-0 bottom-0 z-50 mx-auto max-h-[92%] w-full overflow-y-auto rounded-t-sheet bg-surface-primary px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2.5 no-scrollbar ${CONTENT_W}`}
          >
            {/* Pegangan seret */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mx-auto flex h-6 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              aria-hidden="true"
            >
              <span className="h-1.5 w-10 rounded-full bg-content-secondary/25" />
            </div>

            {/* Judul + tombol tutup — subjudul (tanggal) kini terbaca di
                baris meta bawah nominal, bukan baris tersendiri. */}
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-body font-bold tracking-tight text-content-primary">
                {editing ? 'Sunting Transaksi' : 'Transaksi Baru'}
              </h2>
              <button
                type="button"
                onClick={closeTxSheet}
                aria-label="Tutup lembar transaksi"
                className="interactive -mr-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X className="h-4.5 w-4.5" strokeWidth={2.4} aria-hidden="true" />
              </button>
            </div>

            {/* Saklar tipe arus */}
            <div
              role="group"
              aria-label="Jenis transaksi"
              className="relative mt-2 flex rounded-full bg-surface-secondary p-1"
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
                keypad tidak memberi umpan balik lain saat nilai diketik.
                Baris meta memikul peran subjudul lama: kategori + tanggal. */}
            <div className="mt-2.5 text-center">
              <span
                role="status"
                aria-live="polite"
                aria-label={`Nominal saat ini: ${amount ? formatIDR(amount) : 'Rp0'}`}
                className={`text-kpi font-bold leading-none tabular-nums transition-colors duration-300 ${amountColor} ${
                  amount ? '' : 'opacity-50'
                }`}
              >
                {amount ? formatIDR(amount) : 'Rp0'}
              </span>
              <p className="mt-1 text-eyebrow text-content-muted">
                {catMetaOf(cat, customCats).label} · {shortDateLabel(date)}
                {editing ? ' · sunting' : ''}
              </p>
            </div>

            {/* Kategori + Dompet — dua kolom berdampingan (v2.53): keduanya
                dropdown ke lembar pemilih; label mikro di dalam tombol
                menggantikan label seksi di atasnya. */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                aria-haspopup="dialog"
                aria-label={`Kategori terpilih: ${catMetaOf(cat, customCats).label}. Ketuk untuk mengganti.`}
                className="flex min-h-14 w-full cursor-pointer flex-col justify-center gap-0.5 rounded-xl border border-border bg-surface-sunken px-3 py-1.5 text-left transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="text-chart-label font-semibold uppercase tracking-[0.12em] text-content-muted">
                  Kategori
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  {(() => {
                    const Icon = catMetaOf(cat, customCats).icon
                    return <Icon className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  })()}
                  <span className="min-w-0 flex-1 truncate text-meta font-semibold leading-tight text-content-primary">
                    {catMetaOf(cat, customCats).label}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" aria-hidden="true" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => setWalletPickerOpen(true)}
                aria-haspopup="dialog"
                aria-label={`Dompet terpilih: ${
                  wallets.find((w) => w.id === walletId)?.name ?? 'tanpa dompet'
                }. Ketuk untuk mengganti.`}
                className="flex min-h-14 w-full cursor-pointer flex-col justify-center gap-0.5 rounded-xl border border-border bg-surface-sunken px-3 py-1.5 text-left transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="text-chart-label font-semibold uppercase tracking-[0.12em] text-content-muted">
                  Dompet
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <Wallet className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-meta font-semibold leading-tight text-content-primary">
                    {wallets.length > 0
                      ? (wallets.find((w) => w.id === walletId)?.name ?? 'Tanpa dompet')
                      : 'Tanpa dompet'}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" aria-hidden="true" />
                </span>
              </button>
            </div>

            {/* Catatan — placeholder menjelaskan diri, tanpa label seksi. */}
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan (opsional)…"
              maxLength={40}
              aria-label="Catatan transaksi, opsional"
              className="mt-2.5 h-11 rounded-xl border-input bg-surface-sunken text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:ring-primary/25"
            />

            {/* Tanggal transaksi (v2.82, audit UX §A) — SATU baris status:
                "Hari ini" adalah default; Kemarin & tanggal manual hidup
                di balik "Ubah tanggal". Nilai aktif tetap terbaca di baris
                meta nominal — mode sunting tanggal lama pun terlihat. */}
            <button
              type="button"
              onClick={() => setDateOptionsOpen((v) => !v)}
              aria-expanded={dateOptionsOpen}
              aria-controls="tx-tanggal-opsi"
              className="mt-2.5 flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-surface-sunken px-3.5 text-left transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="min-w-0 flex-1 truncate text-meta font-semibold text-content-primary">
                {date === today
                  ? 'Hari ini'
                  : `${shortDateLabel(date)}${date === yesterday ? ' · kemarin' : ''}`}
              </span>
              <span className="flex shrink-0 items-center gap-1 text-eyebrow font-semibold text-content-muted">
                Ubah tanggal
                <ChevronDown
                  aria-hidden="true"
                  className={
                    'h-3.5 w-3.5 transition-transform duration-300 ' +
                    (dateOptionsOpen ? 'rotate-180' : '')
                  }
                />
              </span>
            </button>
            {dateOptionsOpen && (
              <div
                id="tx-tanggal-opsi"
                className="mt-2 flex gap-2"
                role="group"
                aria-label="Tanggal transaksi"
              >
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
                      className={`h-11 flex-1 cursor-pointer rounded-xl text-meta font-bold transition-all active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
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
                  className="h-11 flex-1 rounded-xl border border-border bg-surface-sunken px-2 text-center text-meta font-semibold tabular-nums text-content-primary transition-colors hover:border-primary/40 focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
              </div>
            )}

            {/* Pengulangan (v2.82) — SATU baris berikut nilainya; pilihan
                Sekali/Mingguan/Bulanan dibuka saat diminta. Nilai berulang
                transaksi lama tetap terbaca di baris (audit UX §A). */}
            {editing?.recurOf ? (
              <p className="mt-2.5 rounded-xl bg-surface-sunken px-3.5 py-2 text-meta leading-relaxed text-content-muted">
                Salinan otomatis dari transaksi berulang — jadwalnya diatur di
                templat asal.
              </p>
            ) : (
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => setRecurrenceOptionsOpen((v) => !v)}
                  aria-expanded={recurrenceOptionsOpen}
                  aria-controls="tx-pengulangan-opsi"
                  className="flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-surface-sunken px-3.5 text-left transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="text-meta font-semibold text-content-primary">
                    Pengulangan
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-meta font-bold text-content-secondary">
                    {recurrence === 'mingguan'
                      ? 'Mingguan'
                      : recurrence === 'bulanan'
                        ? 'Bulanan'
                        : 'Sekali'}
                    <ChevronDown
                      aria-hidden="true"
                      className={
                        'h-3.5 w-3.5 text-content-muted transition-transform duration-300 ' +
                        (recurrenceOptionsOpen ? 'rotate-180' : '')
                      }
                    />
                  </span>
                </button>
                {recurrenceOptionsOpen && (
                  <div
                    id="tx-pengulangan-opsi"
                    className="mt-2 flex gap-2"
                    role="group"
                    aria-label="Transaksi berulang"
                  >
                    {([null, 'mingguan', 'bulanan'] as const).map((r) => {
                      const on = recurrence === r
                      return (
                        <button
                          key={r ?? 'sekali'}
                          type="button"
                          onClick={() => setRecurrence(r as Recurrence | null)}
                          aria-pressed={on}
                          className={`h-11 flex-1 cursor-pointer rounded-xl text-meta font-bold transition-all active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
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
            )}

            {/* Keypad 4×3 — kolom kanan: ⌫ / 000 / 0 */}
            <div className="mt-3 grid grid-cols-4 gap-2">
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

            {/* Aksi — Simpan lebar penuh; batal lewat ×, latar, Escape,
                atau pegangan seret. */}
            <Button
              type="button"
              onClick={submit}
              disabled={!amount}
              className="mt-2.5 h-12 w-full rounded-full bg-primary text-body font-semibold text-primary-foreground shadow-soft hover:bg-action-hover disabled:opacity-45"
            >
              {editing ? 'Simpan Perubahan' : 'Simpan Transaksi'}
            </Button>
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
