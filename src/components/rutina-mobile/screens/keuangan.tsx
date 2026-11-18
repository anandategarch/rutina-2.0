'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { animate } from 'animejs'
import {
  AnimatePresence,
  useSpring,
  type Variants,
} from 'motion/react'
import * as m from 'motion/react-m'
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Laptop,
  Pencil,
  Plane,
  PiggyBank,
  Plus,
  Repeat,
  ShieldCheck,
  Wallet,
  type LucideIcon,
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Counter } from '../counter'
import { BlurFade, ShineBorder, Spotlight } from '../motion-kit'
import { RutinaDialog } from '../rutina-dialog'
import { RutinaTabs, RutinaTabsList, RutinaTabsTrigger } from '../rutina-tabs'
import {
  useRutina,
  type FinCat,
  type FinPeriod,
  type Goal,
  type Tx,
} from '../store'
import { FinChart } from '../finance/fin-chart'
import { BUDGETABLE_CATS, CAT_META, EXPENSE, INCOME } from '../finance/cats'
import { motionTokens } from '@/lib/motion/tokens'
import {
  buildSeries,
  currentMonthKey,
  currentMonthLabel,
  defaultActive,
  fmtDate,
  formatIDR,
  formatIDRShort,
  groupByDay,
  periodScope,
  spentByCat,
  totalSaldo,
  walletBalance,
} from '../finance/utils'

/* ===== Konstanta gerak ===== */

const EASE = motionTokens.easing.standard

/* Ikon tujuan tabungan — tiga pertama tetap, sisanya koin celengan. */
const GOAL_ICONS: LucideIcon[] = [ShieldCheck, Laptop, Plane]

/* ===== Kartu tujuan (cincin SVG animasi) ===== */

function GoalCard({ goal, index }: { goal: Goal; index: number }) {
  const openGoalSheet = useRutina((s) => s.openGoalSheet)
  const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100))
  const complete = goal.saved >= goal.target
  const Icon = GOAL_ICONS[index] ?? PiggyBank
  const R = 24
  const C = 2 * Math.PI * R

  return (
    <Spotlight className="w-[188px] shrink-0 snap-start rounded-[22px]">
      <m.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE, delay: index * 0.07 }}
        className="h-full rounded-[22px] bg-surface-primary p-4 text-content-primary shadow-ink"
      >
      <div className="flex items-center gap-3.5">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full -rotate-90">
            <circle
              cx="28"
              cy="28"
              r={R}
              fill="none"
              stroke="var(--border-default)"
              strokeWidth="5"
            />
            <m.circle
              cx="28"
              cy="28"
              r={R}
              fill="none"
              stroke={complete ? 'var(--success)' : 'var(--warning)'}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{
                strokeDashoffset: C * (1 - Math.min(1, goal.saved / goal.target)),
              }}
              transition={{ type: 'spring', stiffness: 90, damping: 20 }}
            />
          </svg>
          <Icon className="relative h-5 w-5 text-content-secondary" />
        </div>
        <div>
          <p className="text-[22px] font-bold leading-none tabular-nums">
            {pct}
            <span className="text-[13px]">%</span>
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-content-muted">
            terkumpul
          </p>
        </div>
      </div>

      <p className="mt-3 truncate text-[14px] font-bold">{goal.name}</p>
      <p className="mt-0.5 text-[12px] tabular-nums text-content-muted">
        {formatIDRShort(goal.saved)}{' '}
        <span className="text-content-muted">dari {formatIDRShort(goal.target)}</span>
      </p>

      {complete ? (
        <Badge className="mt-3 w-full justify-center border-transparent bg-pistachio/30 text-success hover:bg-pistachio/30">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Tercapai
        </Badge>
      ) : (
        <button
          type="button"
          onClick={() => openGoalSheet(goal.id)}
          className="mt-3 h-9 w-full cursor-pointer rounded-full bg-secondary text-[13px] font-bold text-success transition-all hover:bg-secondary/80 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Tambah
        </button>
      )}
      </m.div>
    </Spotlight>
  )
}

/* ===== Baris transaksi (kexpand + hapus dengan konfirmasi) ===== */

function TxRow({ tx }: { tx: Tx }) {
  const expanded = useRutina((s) => s.expandedTxId === tx.id)
  const toggleExpandedTx = useRutina((s) => s.toggleExpandedTx)
  const deleteTx = useRutina((s) => s.deleteTx)
  const wallets = useRutina((s) => s.wallets)
  const income = tx.type === 'masuk'
  const isTransfer = tx.type === 'transfer'
  const Icon = CAT_META[tx.cat].icon
  const fromW = wallets.find((w) => w.id === tx.walletId)
  const toW = wallets.find((w) => w.id === tx.toWalletId)

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -32, scale: 0.97, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="overflow-hidden rounded-[16px] bg-surface-primary text-content-primary shadow-ink"
    >
      <m.button
        type="button"
        whileTap={{ scale: 0.99 }}
        onClick={() => toggleExpandedTx(tx.id)}
        aria-expanded={expanded}
        aria-label={`${tx.note || CAT_META[tx.cat].label}, ${isTransfer ? 'transfer' : income ? 'pemasukan' : 'pengeluaran'} ${formatIDR(tx.amount)}`}
        className="relative z-10 flex w-full cursor-pointer items-center gap-3 p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            isTransfer
              ? 'bg-gold/30 text-warning'
              : income
                ? 'bg-pistachio/30 text-success'
                : 'bg-clay/25 text-content-danger'
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="block truncate text-[14px] font-semibold">
              {tx.note || CAT_META[tx.cat].label}
            </span>
            {tx.recurrence && !tx.recurOf && (
              <span
                title={`Berulang ${tx.recurrence}`}
                className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-success"
              >
                <Repeat className="h-2.5 w-2.5" strokeWidth={2.5} />
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-content-muted">
            {isTransfer
              ? `${fromW?.name ?? 'Dompet'} → ${toW?.name ?? 'Dompet'} · ${fmtDate(tx.ts)}`
              : `${CAT_META[tx.cat].label}${fromW ? ` · ${fromW.name}` : ''} · ${fmtDate(tx.ts)}`}
          </span>
        </span>
        <span
          className={`shrink-0 text-[14px] font-bold tabular-nums ${
            isTransfer
              ? 'text-content-muted'
              : income
                ? 'text-success'
                : 'text-content-danger'
          }`}
        >
          {isTransfer ? '' : income ? '+' : '−'}
          {formatIDR(tx.amount)}
        </span>
        <m.span
          aria-hidden="true"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0 text-content-muted"
        >
          <ChevronDown className="h-4 w-4" />
        </m.span>
      </m.button>

      <AnimatePresence initial={false}>
        {expanded && (
          <m.section
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-3.5 pb-3.5 pt-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-surface-sunken px-2 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-content-muted">
                    Kategori
                  </p>
                  <p className="mt-0.5 truncate text-[12px] font-bold">
                    {CAT_META[tx.cat].label}
                  </p>
                </div>
                <div className="rounded-xl bg-surface-sunken px-2 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-content-muted">
                    Tanggal
                  </p>
                  <p className="mt-0.5 text-[12px] font-bold">{fmtDate(tx.ts)}</p>
                </div>
                <div className="rounded-xl bg-surface-sunken px-2 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-content-muted">
                    Arus
                  </p>
                  <p
                    className={`mt-0.5 text-[12px] font-bold ${
                      isTransfer
                        ? 'text-content-muted'
                        : income
                          ? 'text-success'
                          : 'text-content-danger'
                    }`}
                  >
                    {isTransfer ? 'Transfer' : income ? 'Masuk' : 'Keluar'}
                  </p>
                </div>
              </div>

              <div className="mt-3.5 flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 flex-1 rounded-full border-destructive/30 text-[13px] font-semibold text-content-danger hover:bg-destructive/10 hover:text-content-danger"
                    >
                      Hapus
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[400px] rounded-[28px] border-border bg-surface-primary p-6">
                    <AlertDialogHeader className="text-left">
                      <AlertDialogTitle className="text-lg tracking-tight text-content-primary">
                        Hapus transaksi?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-[13px] text-content-muted">
                        {tx.note || CAT_META[tx.cat].label} sebesar{' '}
                        {formatIDR(tx.amount)} akan dihapus dari daftar. Tindakan
                        ini tidak bisa dibatalkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-3 flex flex-row gap-2">
                      <AlertDialogCancel className="h-10 flex-1 rounded-full border-border text-[13px] font-semibold text-content-secondary hover:bg-surface-secondary">
                        Batal
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          deleteTx(tx.id)
                          toast.info('Transaksi dihapus')
                        }}
                        className="h-10 flex-1 rounded-full bg-destructive text-[13px] font-semibold text-destructive-foreground hover:bg-destructive/90"
                      >
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => toggleExpandedTx(tx.id)}
                  className="h-9 flex-1 rounded-full text-[13px] font-semibold text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
                >
                  Tutup
                </Button>
              </div>
            </div>
          </m.section>
        )}
      </AnimatePresence>
    </m.div>
  )
}

/* ===== Kartu saldo — dompet espresso, bukan kartu bank =====
   Tanpa ikon NFC, chip, atau nomor kartu: tidak ada integrasi
   finansial nyata di baliknya. Tilt 3D halus + sapuan kilau ShineBorder. */

function SaldoCard({
  saldo,
  txCount,
  saldoRef,
  onAdd,
}: {
  saldo: number
  /** Jumlah transaksi bulan berjalan — dari data nyata, bukan angka statis. */
  txCount: number
  saldoRef: React.RefObject<HTMLSpanElement | null>
  onAdd: () => void
}) {
  /* Tilt 3D — hanya untuk pointer presisi (mouse); sentuhan tetap datar
     agar tidak mengganggu gulir. */
  const rx = useSpring(0, { stiffness: 260, damping: 22 })
  const ry = useSpring(0, { stiffness: 260, damping: 22 })

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    ry.set(px * 7)
    rx.set(-py * 7)
  }
  const onLeave = () => {
    rx.set(0)
    ry.set(0)
  }

  return (
    <m.div
      role="button"
      tabIndex={0}
      aria-label={`Dompet Rutina Vault, saldo ${formatIDR(saldo)}. Ketuk untuk menambah transaksi.`}
      onClick={onAdd}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onAdd()
        }
      }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      whileTap={{ scale: 0.985 }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className="relative cursor-pointer overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,var(--surface-inverse)_0%,var(--espresso-soft)_46%,var(--surface-inverse)_100%)] p-5 shadow-ink-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <ShineBorder borderWidth={1.5} duration={12} shineColor={['var(--palette-gold)', 'var(--palette-pistachio)']} />

      {/* Cahaya emas lembut dari sudut kiri atas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-gold/12 blur-3xl"
      />

      {/* Baris merek */}
      <p className="relative z-10 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.26em] text-gold">
        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
        Rutina Vault
      </p>

      {/* Saldo */}
      <div className="relative z-10 mt-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-content-inverse/65">
          Saldo Tersedia
        </p>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-[19px] font-bold text-gold">Rp</span>
          <span
            ref={saldoRef}
            className="text-[31px] font-bold leading-none tabular-nums text-content-inverse"
          >
            <Counter to={saldo} />
          </span>
        </div>
      </div>

      {/* Transaksi bulan ini + pemegang */}
      <div className="relative z-10 mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-content-inverse/65">
            Transaksi bulan ini
          </p>
          <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-gold">
            {txCount}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-content-inverse/65">
            Pemegang
          </p>
          <p className="mt-0.5 text-[12.5px] font-bold tracking-[0.1em] text-gold">
            ANANDA
          </p>
        </div>
      </div>
    </m.div>
  )
}

/* ===== Baris anggaran — batas dapat disunting pengguna ===== */

function BudgetRow({
  cat,
  limit,
  used,
  pct,
  over,
  warn,
  barColor,
  Icon,
}: {
  cat: FinCat
  limit: number
  used: number
  pct: number
  over: boolean
  warn: boolean
  barColor: string
  Icon: LucideIcon
}) {
  const setBudget = useRutina((s) => s.setBudget)
  const removeBudget = useRutina((s) => s.removeBudget)
  const [draft, setDraft] = useState('')

  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-content-secondary">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13.5px] font-semibold">
            {CAT_META[cat].label}
          </span>
          <span className="shrink-0 text-[12px] tabular-nums text-content-secondary">
            {formatIDRShort(used)}{' '}
            <span className="text-content-muted">/ {formatIDRShort(limit)}</span>
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
          <m.div
            initial={{ width: '0%' }}
            animate={{ width: `${Math.min(100, pct)}%` }}
            transition={{ type: 'spring', stiffness: 110, damping: 21 }}
            className="h-full rounded-full"
            style={{ backgroundColor: barColor }}
          />
        </div>
        <p
          className={`mt-1 text-[11px] ${
            over ? 'font-bold text-content-danger' : 'text-content-muted'
          }`}
        >
          {over
            ? `Lewat ${formatIDRShort(used - limit)} dari batas`
            : `Sisa ${formatIDRShort(limit - used)} bulan ini`}
          {warn && !over ? ' — hampir habis!' : ''}
        </p>
      </div>

      {/* Sunting batas */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            aria-label={`Sunting anggaran ${CAT_META[cat].label}`}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-content-secondary transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className="max-w-[320px] rounded-[24px] border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[16px] font-bold tracking-tight text-content-primary">
              Batas {CAT_META[cat].label}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12.5px] leading-relaxed text-content-muted">
              Terpakai {formatIDR(used)} bulan ini. Tentukan batas bulanan
              baru (Rp).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            aria-label="Batas bulanan baru"
            inputMode="numeric"
            value={draft}
            onChange={(e) =>
              setDraft(e.target.value.replace(/\D/g, '').slice(0, 9))
            }
            placeholder={String(limit)}
            className="h-11 w-full rounded-xl border border-input bg-surface-sunken px-3.5 text-[15px] font-bold tabular-nums text-content-primary placeholder:font-medium placeholder:text-content-muted focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary/30"
          />
          <AlertDialogFooter className="flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                removeBudget(cat)
                toast(`${CAT_META[cat].label} dihapus dari anggaran.`)
              }}
              className="h-10 flex-1 cursor-pointer rounded-full border border-destructive/35 text-[12.5px] font-bold text-content-danger transition-colors hover:bg-destructive/10"
            >
              Hapus
            </button>
            <AlertDialogCancel className="mt-0 h-10 flex-1 rounded-full border-border-strong text-[12.5px] font-bold text-content-secondary">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const v = Number(draft)
                if (v > 0) {
                  setBudget(cat, v)
                  toast.success(
                    `Batas ${CAT_META[cat].label}: ${formatIDR(v)}/bulan`,
                  )
                }
              }}
              className="h-10 flex-1 rounded-full border-none bg-primary text-[12.5px] font-bold text-primary-foreground hover:bg-action-hover"
            >
              Simpan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ===== Dialog tambah dompet ===== */

function WalletDialog() {
  const open = useRutina((s) => s.walletDialogOpen)
  const close = useRutina((s) => s.closeWalletDialog)
  const addWallet = useRutina((s) => s.addWallet)
  const [name, setName] = useState('')
  const [initial, setInitial] = useState('')

  return (
    <RutinaDialog
      open={open}
      onClose={close}
      label="Tambah dompet"
      className="max-w-[320px] rounded-[24px] shadow-ink-deep"
    >
        <h2 className="text-[16px] font-bold tracking-tight text-content-primary">
          Dompet Baru
        </h2>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-content-muted">
          Sumber dana terpisah — tunai, bank, atau e-wallet.
        </p>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="w-name" className="text-[13px] font-semibold text-content-secondary">
              Nama dompet
            </label>
            <input
              id="w-name"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              placeholder="mis. E-Wallet"
              className="h-11 w-full rounded-xl border border-input bg-surface-sunken px-3.5 text-[14px] text-content-primary placeholder:text-content-muted focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="w-init" className="text-[13px] font-semibold text-content-secondary">
              Saldo awal (Rp)
            </label>
            <input
              id="w-init"
              inputMode="numeric"
              value={initial}
              onChange={(e) =>
                setInitial(e.target.value.replace(/\D/g, '').slice(0, 10))
              }
              placeholder="mis. 250000"
              className="h-11 w-full rounded-xl border border-input bg-surface-sunken px-3.5 text-[14px] font-bold tabular-nums text-content-primary placeholder:font-medium placeholder:text-content-muted focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary/30"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={close}
            className="h-11 flex-1 cursor-pointer rounded-full border border-border-strong text-[13px] font-bold text-content-secondary transition-colors hover:bg-surface-secondary"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              if (!name.trim()) {
                toast.warning('Beri nama dompetmu dulu')
                return
              }
              addWallet(name, Number(initial || '0'))
              toast.success(`Dompet "${name.trim()}" dibuat`)
              setName('')
              setInitial('')
            }}
            className="h-11 flex-1 cursor-pointer rounded-full bg-primary text-[13px] font-bold text-primary-foreground shadow-soft transition-all hover:bg-action-hover active:scale-[0.98]"
          >
            Buat Dompet
          </button>
        </div>
    </RutinaDialog>
  )
}

/* ===== Layar utama ===== */

const PERIODS: { id: FinPeriod; label: string }[] = [
  { id: 'minggu', label: 'Minggu' },
  { id: 'bulan', label: 'Bulan' },
  { id: 'tahun', label: 'Tahun' },
]

/* Subtab Keuangan — arsitektur 4 bagian agar satu tab utama tetap
   nyaman dijangkau satu tangan (rekomendasi audit produk). */
type FinTab = 'ringkasan' | 'mutasi' | 'anggaran' | 'dompet'
const FIN_TABS: { id: FinTab; label: string }[] = [
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'mutasi', label: 'Mutasi' },
  { id: 'anggaran', label: 'Anggaran' },
  { id: 'dompet', label: 'Dompet' },
]

export default function KeuanganScreen() {
  const txs = useRutina((s) => s.txs)
  const goals = useRutina((s) => s.goals)
  const wallets = useRutina((s) => s.wallets)
  const budgets = useRutina((s) => s.budgets)
  const finPeriod = useRutina((s) => s.finPeriod)
  const setFinPeriod = useRutina((s) => s.setFinPeriod)
  const openTxSheet = useRutina((s) => s.openTxSheet)
  const openGoalDialog = useRutina((s) => s.openGoalDialog)
  const openTransferSheet = useRutina((s) => s.openTransferSheet)
  const openWalletDialog = useRutina((s) => s.openWalletDialog)
  const setBudget = useRutina((s) => s.setBudget)

  const [finTab, setFinTab] = useState<FinTab>('ringkasan')
  const [active, setActive] = useState(2)
  useEffect(() => {
    setActive(defaultActive(finPeriod, txs))
  }, [finPeriod, txs])

  /* Derivasi data — murni dari state, aman untuk SSR. */
  const series = useMemo(() => buildSeries(txs, finPeriod), [txs, finPeriod])
  const totals = useMemo(
    () =>
      series.reduce(
        (a, p) => ({ masuk: a.masuk + p.masuk, keluar: a.keluar + p.keluar }),
        { masuk: 0, keluar: 0 },
      ),
    [series],
  )
  const spent = useMemo(() => spentByCat(txs), [txs])
  /* Saldo keseluruhan: penjumlahan seluruh dompet (mode multi-dompet),
     atau arus masuk-keluar bila belum ada dompet. Transfer tidak
     menggelembungkan saldo karena keluar dari satu & masuk ke lainnya. */
  const saldo = useMemo(() => totalSaldo(txs, wallets), [txs, wallets])
  /* Jumlah transaksi bulan BERJALAN — kunci bulan dari hari nyata. */
  const txCount = useMemo(
    () => txs.filter((t) => t.ts.startsWith(currentMonthKey())).length,
    [txs],
  )
  const budgetRows = useMemo(
    () =>
      Object.entries(budgets)
        .filter(([cat]) => BUDGETABLE_CATS.includes(cat as FinCat))
        .map(([cat, limit]) => ({ cat: cat as FinCat, limit })),
    [budgets],
  )
  const spentTotal = useMemo(
    () => budgetRows.reduce((a, b) => a + (spent[b.cat] ?? 0), 0),
    [budgetRows, spent],
  )
  const totalLimit = useMemo(
    () => budgetRows.reduce((a, b) => a + b.limit, 0),
    [budgetRows],
  )
  const totalPct =
    totalLimit > 0
      ? Math.min(100, Math.round((spentTotal / totalLimit) * 100))
      : 0
  /* Mutasi dikelompokkan per hari — ringkasan arus kas harian. */
  const dayGroups = useMemo(() => groupByDay(txs), [txs])
  const transfers = useMemo(
    () => txs.filter((t) => t.type === 'transfer'),
    [txs],
  )

  /* anime.js — denyut "ka-ching" pada angka saldo saat transaksi baru masuk. */
  const prevLen = useRef(txs.length)
  const saldoRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (txs.length === prevLen.current) return
    const grew = txs.length > prevLen.current
    prevLen.current = txs.length
    if (grew && saldoRef.current) {
      const anim = animate(saldoRef.current, {
        scale: [1, 1.04, 1],
        duration: 520,
        ease: 'outBack(2)',
      })
      return () => {
        anim.revert()
      }
    }
  }, [txs.length])

  const pt = series[Math.min(active, series.length - 1)] ?? series[0]

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-content-primary">
      {/* Subtab Keuangan — Radix Tabs: state aktif terkelola penuh,
          dukungan papan tombol otomatis (pengganti pil aria-pressed). */}
      <RutinaTabs value={finTab} onValueChange={(v) => setFinTab(v as FinTab)}>
        <RutinaTabsList
          variant="segment"
          aria-label="Bagian Keuangan"
          className="w-full border-transparent p-1"
        >
          {FIN_TABS.map((t) => (
            <RutinaTabsTrigger key={t.id} value={t.id} className="flex-1 px-2">
              {t.label}
            </RutinaTabsTrigger>
          ))}
        </RutinaTabsList>

      {/* Section reveal memakai BlurFade (magicui): blur-ke-fokus saat
          masuk viewport — pengganti staggervariants statis. */}
      <div className="mt-4 flex flex-col gap-5">
        {finTab === 'ringkasan' && (
          <>
        {/* ===== Kepala: dompet saldo gelap + FAB tambah ===== */}
        <BlurFade>
          <div className="relative">
            <m.button
              type="button"
              onClick={openTxSheet}
              whileTap={{ scale: 0.88 }}
              aria-label="Tambah transaksi baru"
              className="absolute -top-3 right-4 z-20 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-gold text-content-secondary shadow-gold transition-colors hover:bg-gold/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <Plus className="h-5 w-5" strokeWidth={2.6} />
            </m.button>
            <SaldoCard
              saldo={saldo}
              txCount={txCount}
              saldoRef={saldoRef}
              onAdd={openTxSheet}
            />
          </div>
        </BlurFade>

        {/* ===== Chip totals per periode ===== */}
        <BlurFade delay={0.06} className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-border bg-surface-primary px-3.5 py-3 shadow-soft">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-content-muted">
              <ArrowUpRight className="h-3.5 w-3.5 text-pistachio" />
              Masuk · periode ini
            </p>
            <p className="mt-1 text-[17px] font-bold tabular-nums text-success">
              +{formatIDRShort(totals.masuk)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-primary px-3.5 py-3 shadow-soft">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-content-muted">
              <ArrowDownRight className="h-3.5 w-3.5 text-clay" />
              Keluar · periode ini
            </p>
            <p className="mt-1 text-[17px] font-bold tabular-nums text-content-danger">
              −{formatIDRShort(totals.keluar)}
            </p>
          </div>
        </BlurFade>

        {/* ===== Arus kas: kontrol periode + grafik ===== */}
        <BlurFade
          delay={0.1}
          className="rounded-[24px] border border-border bg-surface-primary p-4 shadow-soft"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-content-secondary">
              Arus Kas
            </h2>
            <span className="text-[11px] font-medium tabular-nums text-content-muted">
              {periodScope(finPeriod, txs)}
            </span>
          </div>

          {/* Kontrol periode — pil aktif meluncur (layoutId) */}
          <div
            role="group"
            aria-label="Pilih periode"
            className="mt-3 flex rounded-full bg-surface-sunken p-1"
          >
            {PERIODS.map((p) => {
              const on = finPeriod === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFinPeriod(p.id)}
                  aria-pressed={on}
                  className={`relative z-10 h-8 flex-1 cursor-pointer rounded-full text-[12px] font-bold transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                    on ? 'text-content-inverse' : 'text-content-muted'
                  }`}
                >
                  {on && (
                    <m.span
                      aria-hidden="true"
                      layoutId="fin-period"
                      className="absolute inset-0 z-[-1] rounded-full bg-surface-inverse"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* Legenda + nilai titik aktif */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-content-muted">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: INCOME }}
                />
                Masuk
                <span className="relative ml-0.5 inline-flex overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <m.span
                      key={`${finPeriod}-${active}-m`}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -10, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="font-bold tabular-nums text-success"
                    >
                      +{formatIDRShort(pt.masuk)}
                    </m.span>
                  </AnimatePresence>
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-content-muted">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: EXPENSE }}
                />
                Keluar
                <span className="relative ml-0.5 inline-flex overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <m.span
                      key={`${finPeriod}-${active}-k`}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -10, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="font-bold tabular-nums text-content-danger"
                    >
                      −{formatIDRShort(pt.keluar)}
                    </m.span>
                  </AnimatePresence>
                </span>
              </span>
            </div>
            <span className="text-[11px] text-content-muted">ketuk titik</span>
          </div>

          <div className="mx-auto mt-2 w-full max-w-[560px]">
            <FinChart points={series} active={active} onPick={setActive} />
          </div>
        </BlurFade>

        {/* ===== Tujuan tabungan (akhir Ringkasan) ===== */}
        <BlurFade delay={0.06}>
          <div className="flex items-center justify-between gap-3 px-0.5">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-content-secondary">
              Tujuan Tabungan
            </h2>
            <button
              type="button"
              onClick={openGoalDialog}
              className="h-8 cursor-pointer rounded-full border border-border-strong px-3.5 text-[12px] font-bold text-content-secondary transition-all hover:bg-surface-secondary active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              + Tujuan
            </button>
          </div>

          <div className="relative mt-3">
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto no-scrollbar pb-1">
              {goals.map((g, i) => (
                <GoalCard key={g.id} goal={g} index={i} />
              ))}

              {/* Kartu tambah — putus-putus */}
              <button
                type="button"
                onClick={openGoalDialog}
                className="flex min-h-[178px] w-[150px] shrink-0 snap-center cursor-pointer flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-border-strong px-3 py-4 text-content-muted transition-all hover:border-gold hover:text-content-primary active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunken">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="text-[12.5px] font-bold">Tujuan Baru</span>
                <span className="text-center text-[11px] leading-tight opacity-70">
                  tetapkan nama &amp; target
                </span>
              </button>
            </div>
            {/* Petunjuk geser — memudar di tepi kanan carousel */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-[22px] bg-gradient-to-l from-surface-primary to-transparent"
            />
          </div>
        </BlurFade>
          </>
        )}

        {/* ===== MUTASI: arus kas harian + seluruh transaksi ===== */}
        {finTab === 'mutasi' && (
          <BlurFade delay={0.04}>
            <div className="flex items-center justify-between gap-3 px-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-content-secondary">
                  Mutasi
                </h2>
                <Badge className="border-transparent bg-secondary text-success hover:bg-secondary">
                  {txs.length}
                </Badge>
              </div>
              <button
                type="button"
                onClick={openTxSheet}
                className="h-8 cursor-pointer rounded-full border border-border-strong px-3.5 text-[12px] font-bold text-content-secondary transition-all hover:bg-surface-secondary active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                + Tambah
              </button>
            </div>

            {dayGroups.length === 0 ? (
              <div className="mt-3 rounded-[20px] border-2 border-dashed border-border-strong px-6 py-9 text-center">
                <Wallet className="mx-auto h-6 w-6 text-content-muted" />
                <p className="mt-2 text-[13px] font-semibold text-content-muted">
                  Belum ada transaksi
                </p>
                <p className="mt-0.5 text-[11.5px] text-content-muted">
                  Catat pemasukan/pengeluaran pertamamu.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-5">
                {dayGroups.map((g) => (
                  <div key={g.date}>
                    <div className="mb-2 flex items-center justify-between px-0.5">
                      <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-content-muted">
                        {fmtDate(g.date)}
                      </p>
                      <p className="text-[11px] font-semibold tabular-nums text-content-muted">
                        {g.masuk > 0 && (
                          <span className="text-success">
                            +{formatIDRShort(g.masuk)}{' '}
                          </span>
                        )}
                        {g.keluar > 0 && (
                          <span className="text-content-danger">
                            −{formatIDRShort(g.keluar)}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="space-y-2.5">
                      {g.txs.map((tx) => (
                        <TxRow key={tx.id} tx={tx} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </BlurFade>
        )}

        {/* ===== ANGGARAN: batas per kategori, dapat diubah ===== */}
        {finTab === 'anggaran' && (
          <BlurFade delay={0.04}>
            <div className="relative rounded-[24px] bg-surface-primary p-4 text-content-primary shadow-ink-deep">
              <ShineBorder borderWidth={1.5} duration={12} shineColor={['var(--palette-gold)', 'var(--palette-pistachio)']} />
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-content-secondary">
                  Anggaran {currentMonthLabel()}
                </h2>
                <Badge className="border-transparent bg-secondary text-success hover:bg-secondary">
                  Terpakai {totalPct}%
                </Badge>
              </div>

              {/* Batang total */}
              <div className="mt-3">
                <div className="h-2.5 overflow-hidden rounded-full bg-border">
                  <m.div
                    initial={{ width: '0%' }}
                    animate={{ width: `${totalPct}%` }}
                    transition={{ type: 'spring', stiffness: 110, damping: 21 }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-pistachio"
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-content-muted">
                  <span>{formatIDRShort(spentTotal)} terpakai</span>
                  <span>sisa {formatIDRShort(Math.max(0, totalLimit - spentTotal))}</span>
                </div>
              </div>

              {/* Baris per kategori — batas dapat disunting */}
              <div className="mt-4 space-y-4">
                {budgetRows.map((b) => {
                  const used = spent[b.cat] ?? 0
                  const pct = b.limit > 0 ? Math.round((used / b.limit) * 100) : 0
                  const over = used > b.limit
                  const warn = !over && pct >= 85
                  const Icon = CAT_META[b.cat].icon
                  const barColor = over ? 'var(--destructive)' : warn ? 'var(--warning)' : 'var(--primary)'
                  return (
                    <BudgetRow
                      key={b.cat}
                      cat={b.cat}
                      limit={b.limit}
                      used={used}
                      pct={pct}
                      over={over}
                      warn={warn}
                      barColor={barColor}
                      Icon={Icon}
                    />
                  )
                })}

                {/* Tambah kategori yang belum dianggarkan */}
                {BUDGETABLE_CATS.filter((c) => !(c in budgets)).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {BUDGETABLE_CATS.filter((c) => !(c in budgets)).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setBudget(c, 300_000)
                          toast(`${CAT_META[c].label} ditambahkan — ubah batasnya sesukamu.`)
                        }}
                        className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-border-strong px-3.5 text-[12px] font-bold text-content-muted transition-all hover:bg-surface-sunken active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {CAT_META[c].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </BlurFade>
        )}

        {/* ===== DOMPET: saldo per sumber dana + transfer ===== */}
        {finTab === 'dompet' && (
          <>
            <BlurFade delay={0.04}>
              <div className="flex items-center justify-between gap-3 px-0.5">
                <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-content-secondary">
                  Dompet &amp; Rekening
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={openTransferSheet}
                    disabled={wallets.length < 2}
                    className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-surface-inverse px-3.5 text-[12px] font-bold text-content-inverse transition-all hover:bg-espresso-soft active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    Transfer
                  </button>
                  <button
                    type="button"
                    onClick={openWalletDialog}
                    className="h-8 cursor-pointer rounded-full border border-border-strong px-3.5 text-[12px] font-bold text-content-secondary transition-all hover:bg-surface-secondary active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    + Dompet
                  </button>
                </div>
              </div>

              {wallets.length === 0 ? (
                <div className="mt-3 rounded-[20px] border-2 border-dashed border-border-strong px-6 py-9 text-center">
                  <Wallet className="mx-auto h-6 w-6 text-content-muted" />
                  <p className="mt-2 text-[13px] font-semibold text-content-muted">
                    Belum ada dompet
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-content-muted">
                    Pisahkan uang tunai, rekening bank, atau e-wallet — saldo
                    dihitung per sumber dana.
                  </p>
                </div>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {wallets.map((w, i) => (
                    <m.div
                      key={w.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.06, ease: EASE }}
                      className="rounded-[20px] border border-border bg-surface-primary p-4 shadow-soft"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold/20 text-warning">
                          <Wallet className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14.5px] font-bold text-content-primary">
                            {w.name}
                          </p>
                          <p className="text-[11px] font-medium text-content-muted">
                            Saldo awal {formatIDRShort(w.initial)}
                          </p>
                        </div>
                        <p className="shrink-0 text-[17px] font-bold tabular-nums text-content-primary">
                          {formatIDRShort(walletBalance(txs, w))}
                        </p>
                      </div>
                    </m.div>
                  ))}
                  <p className="px-0.5 text-[11px] leading-relaxed text-content-muted">
                    Transfer antar-dompet tidak dihitung sebagai pemasukan atau
                    pengeluaran — hanya memindahkan saldo.
                  </p>
                </div>
              )}
            </BlurFade>

            {/* Riwayat transfer */}
            {transfers.length > 0 && (
              <BlurFade delay={0.08}>
                <h3 className="px-0.5 text-[12px] font-bold uppercase tracking-[0.14em] text-content-muted">
                  Riwayat Transfer
                </h3>
                <div className="mt-2 space-y-2">
                  {transfers.slice(0, 5).map((t) => {
                    const fromW = wallets.find((w) => w.id === t.walletId)
                    const toW = wallets.find((w) => w.id === t.toWalletId)
                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-surface-primary px-3.5 py-2.5 shadow-soft"
                      >
                        <ArrowLeftRight className="h-4 w-4 shrink-0 text-warning" />
                        <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-content-primary">
                          {fromW?.name ?? 'Dompet'} → {toW?.name ?? 'Dompet'}
                          <span className="font-medium text-content-muted">
                            {' '}
                            · {fmtDate(t.ts)}
                          </span>
                        </p>
                        <p className="shrink-0 text-[12.5px] font-bold tabular-nums text-content-muted">
                          {formatIDRShort(t.amount)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </BlurFade>
            )}
          </>
        )}
      </div>
      </RutinaTabs>

      {/* Dialog tambah dompet */}
      <WalletDialog />
    </div>
  )
}
