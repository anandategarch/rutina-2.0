'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { animate } from 'animejs'
import {
  AnimatePresence,
  motion,
  type Variants,
} from 'motion/react'
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Laptop,
  Plane,
  PiggyBank,
  Plus,
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
import {
  BUDGETS,
  useRutina,
  type FinPeriod,
  type Goal,
  type Tx,
} from '../store'
import { FinChart } from '../finance/fin-chart'
import { CAT_META, EXPENSE, INCOME } from '../finance/cats'
import {
  buildSeries,
  defaultActive,
  filterByPeriod,
  fmtDate,
  formatIDR,
  formatIDRShort,
  PERIOD_SCOPE,
  spentByCat,
} from '../finance/utils'

/* ===== Konstanta gerak ===== */

const EASE = [0.22, 1, 0.36, 1] as const

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
}
const rowStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const rowItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } },
}

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
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: EASE, delay: index * 0.07 }}
      className="w-[188px] shrink-0 snap-start rounded-[22px] bg-[#FAF9F6] p-4 text-[#231F1E] shadow-[0_14px_30px_rgba(35,31,30,0.38)]"
    >
      <div className="flex items-center gap-3.5">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full -rotate-90">
            <circle
              cx="28"
              cy="28"
              r={R}
              fill="none"
              stroke="#4A3B32"
              strokeOpacity="0.14"
              strokeWidth="5"
            />
            <motion.circle
              cx="28"
              cy="28"
              r={R}
              fill="none"
              stroke={complete ? '#A3C489' : '#C7A17A'}
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
          <Icon className="relative h-5 w-5 text-[#4A3B32]/85" />
        </div>
        <div>
          <p className="text-[22px] font-bold leading-none tabular-nums">
            {pct}
            <span className="text-[13px]">%</span>
          </p>
          <p className="mt-1 text-[10.5px] uppercase tracking-[0.14em] text-[#4A3B32]/55">
            terkumpul
          </p>
        </div>
      </div>

      <p className="mt-3 truncate text-[14px] font-bold">{goal.name}</p>
      <p className="mt-0.5 text-[12px] tabular-nums text-[#4A3B32]/70">
        {formatIDRShort(goal.saved)}{' '}
        <span className="text-[#4A3B32]/45">dari {formatIDRShort(goal.target)}</span>
      </p>

      {complete ? (
        <Badge className="mt-3 w-full justify-center border-transparent bg-[#A3C489]/30 text-[#658A4C] hover:bg-[#A3C489]/30">
          <CheckCircle2 className="mr-1 h-3 w-3" /> Tercapai
        </Badge>
      ) : (
        <button
          type="button"
          onClick={() => openGoalSheet(goal.id)}
          className="mt-3 h-9 w-full cursor-pointer rounded-full bg-[#E4EFE0] text-[13px] font-bold text-[#658A4C] transition-all hover:bg-[#D8E8CF] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#749B58]"
        >
          Tambah
        </button>
      )}
    </motion.div>
  )
}

/* ===== Baris transaksi (kexpand + hapus dengan konfirmasi) ===== */

function TxRow({ tx }: { tx: Tx }) {
  const expanded = useRutina((s) => s.expandedTxId === tx.id)
  const toggleExpandedTx = useRutina((s) => s.toggleExpandedTx)
  const deleteTx = useRutina((s) => s.deleteTx)
  const income = tx.type === 'masuk'
  const Icon = CAT_META[tx.cat].icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -32, scale: 0.97, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease: EASE }}
      className="overflow-hidden rounded-[16px] bg-[#FAF9F6] text-[#231F1E]"
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.99 }}
        onClick={() => toggleExpandedTx(tx.id)}
        aria-expanded={expanded}
        aria-label={`${tx.note || CAT_META[tx.cat].label}, ${income ? 'pemasukan' : 'pengeluaran'} ${formatIDR(tx.amount)}`}
        className="relative z-10 flex w-full cursor-pointer items-center gap-3 p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9B98C]"
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            income
              ? 'bg-[#A3C489]/30 text-[#658A4C]'
              : 'bg-[#E08A6D]/25 text-[#C25F3D]'
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={2.1} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold">
            {tx.note || CAT_META[tx.cat].label}
          </span>
          <span className="mt-0.5 block text-[11px] text-[#4A3B32]/60">
            {CAT_META[tx.cat].label} · {fmtDate(tx.ts)}
          </span>
        </span>
        <span
          className={`shrink-0 text-[14px] font-bold tabular-nums ${
            income ? 'text-[#658A4C]' : 'text-[#C25F3D]'
          }`}
        >
          {income ? '+' : '−'}
          {formatIDR(tx.amount)}
        </span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0 text-[#4A3B32]/40"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </motion.button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.section
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-t border-[#4A3B32]/10 px-3.5 pb-3.5 pt-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[#F5F3EE] px-2 py-2">
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/55">
                    Kategori
                  </p>
                  <p className="mt-0.5 truncate text-[12px] font-bold">
                    {CAT_META[tx.cat].label}
                  </p>
                </div>
                <div className="rounded-xl bg-[#F5F3EE] px-2 py-2">
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/55">
                    Tanggal
                  </p>
                  <p className="mt-0.5 text-[12px] font-bold">{fmtDate(tx.ts)}</p>
                </div>
                <div className="rounded-xl bg-[#F5F3EE] px-2 py-2">
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#4A3B32]/55">
                    Arus
                  </p>
                  <p
                    className={`mt-0.5 text-[12px] font-bold ${
                      income ? 'text-[#658A4C]' : 'text-[#C25F3D]'
                    }`}
                  >
                    {income ? 'Masuk' : 'Keluar'}
                  </p>
                </div>
              </div>

              <div className="mt-3.5 flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 flex-1 rounded-full border-[#B25E3F]/30 text-[13px] font-semibold text-[#B25E3F] hover:bg-[#B25E3F]/10 hover:text-[#B25E3F]"
                    >
                      Hapus
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[400px] rounded-[28px] border-[#4A3B32]/10 bg-[#FAF9F6] p-6">
                    <AlertDialogHeader className="text-left">
                      <AlertDialogTitle className="text-lg tracking-tight text-[#231F1E]">
                        Hapus transaksi?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-[13px] text-[#4A3B32]/70">
                        {tx.note || CAT_META[tx.cat].label} sebesar{' '}
                        {formatIDR(tx.amount)} akan dihapus dari daftar. Tindakan
                        ini tidak bisa dibatalkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-3 flex flex-row gap-2">
                      <AlertDialogCancel className="h-10 flex-1 rounded-full border-[#4A3B32]/20 text-[13px] font-semibold text-[#4A3B32] hover:bg-[#EAE5D9]">
                        Batal
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          deleteTx(tx.id)
                          toast.info('Transaksi dihapus')
                        }}
                        className="h-10 flex-1 rounded-full bg-[#B25E3F] text-[13px] font-semibold text-white hover:bg-[#9E4E33]"
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
                  className="h-9 flex-1 rounded-full text-[13px] font-semibold text-[#4A3B32] hover:bg-[#EAE5D9] hover:text-[#231F1E]"
                >
                  Tutup
                </Button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ===== Layar utama ===== */

const PERIODS: { id: FinPeriod; label: string }[] = [
  { id: 'minggu', label: 'Minggu' },
  { id: 'bulan', label: 'Bulan' },
  { id: 'tahun', label: 'Tahun' },
]

export default function KeuanganScreen() {
  const txs = useRutina((s) => s.txs)
  const goals = useRutina((s) => s.goals)
  const finPeriod = useRutina((s) => s.finPeriod)
  const setFinPeriod = useRutina((s) => s.setFinPeriod)
  const openTxSheet = useRutina((s) => s.openTxSheet)
  const openGoalDialog = useRutina((s) => s.openGoalDialog)

  const [active, setActive] = useState(2)
  useEffect(() => {
    setActive(defaultActive(finPeriod))
  }, [finPeriod])

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
  const filtered = useMemo(
    () =>
      filterByPeriod(txs, finPeriod)
        .slice()
        .sort((a, b) =>
          a.ts === b.ts ? b.id.localeCompare(a.id) : b.ts.localeCompare(a.ts),
        ),
    [txs, finPeriod],
  )
  const spent = useMemo(() => spentByCat(txs), [txs])
  const saldo = useMemo(
    () =>
      txs.reduce((a, t) => a + (t.type === 'masuk' ? t.amount : -t.amount), 0),
    [txs],
  )
  const spentTotal = useMemo(
    () => BUDGETS.reduce((a, b) => a + (spent[b.cat] ?? 0), 0),
    [spent],
  )
  const totalLimit = useMemo(() => BUDGETS.reduce((a, b) => a + b.limit, 0), [])
  const totalPct = Math.min(100, Math.round((spentTotal / totalLimit) * 100))

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
    <div className="h-full overflow-y-auto no-scrollbar px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-[#FAF9F6]">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-5"
      >
        {/* ===== Kepala: saldo + tombol tambah ===== */}
        <motion.section variants={item} className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#FAF9F6]/60">
              Saldo Tersedia
            </p>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="text-[20px] font-bold text-[#D9B98C]">Rp</span>
              <span
                ref={saldoRef}
                className="text-[34px] font-bold leading-none tabular-nums text-[#FAF9F6]"
              >
                <Counter to={saldo} />
              </span>
            </div>
            <p className="mt-1.5 text-[11.5px] text-[#FAF9F6]/60">
              Juni 2025 · pemasukan dikurangi pengeluaran
            </p>
          </div>
          <motion.button
            type="button"
            onClick={openTxSheet}
            whileTap={{ scale: 0.88 }}
            aria-label="Tambah transaksi baru"
            className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#D9B98C] text-[#4A3B32] shadow-[0_10px_26px_rgba(217,185,140,0.4)] transition-colors hover:bg-[#E9D5B8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9B98C]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.6} />
          </motion.button>
        </motion.section>

        {/* ===== Chip totals per periode ===== */}
        <motion.section variants={item} className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-[#A3C489]/15 px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#FAF9F6]/70">
              <ArrowUpRight className="h-3.5 w-3.5 text-[#A3C489]" />
              Masuk · periode ini
            </p>
            <p className="mt-1 text-[17px] font-bold tabular-nums text-[#A3C489]">
              +{formatIDRShort(totals.masuk)}
            </p>
          </div>
          <div className="rounded-2xl bg-[#E08A6D]/15 px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#FAF9F6]/70">
              <ArrowDownRight className="h-3.5 w-3.5 text-[#E08A6D]" />
              Keluar · periode ini
            </p>
            <p className="mt-1 text-[17px] font-bold tabular-nums text-[#E08A6D]">
              −{formatIDRShort(totals.keluar)}
            </p>
          </div>
        </motion.section>

        {/* ===== Arus kas: kontrol periode + grafik ===== */}
        <motion.section
          variants={item}
          className="rounded-[24px] border border-[#FAF9F6]/12 bg-[#FAF9F6]/[0.07] p-4"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#E9D5B8]">
              Arus Kas
            </h2>
            <span className="text-[11px] font-medium tabular-nums text-[#FAF9F6]/60">
              {PERIOD_SCOPE[finPeriod]}
            </span>
          </div>

          {/* Kontrol periode — pil aktif meluncur (layoutId) */}
          <div
            role="group"
            aria-label="Pilih periode"
            className="mt-3 flex rounded-full bg-[#231F1E]/35 p-1"
          >
            {PERIODS.map((p) => {
              const on = finPeriod === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFinPeriod(p.id)}
                  aria-pressed={on}
                  className={`relative z-10 h-8 flex-1 cursor-pointer rounded-full text-[12px] font-bold transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9B98C] ${
                    on ? 'text-[#4A3B32]' : 'text-[#FAF9F6]/60'
                  }`}
                >
                  {on && (
                    <motion.span
                      aria-hidden="true"
                      layoutId="fin-period"
                      className="absolute inset-0 z-[-1] rounded-full bg-[#FAF9F6]"
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
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#FAF9F6]/65">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: INCOME }}
                />
                Masuk
                <span className="relative ml-0.5 inline-flex overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={`${finPeriod}-${active}-m`}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -10, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="font-bold tabular-nums text-[#A3C489]"
                    >
                      +{formatIDRShort(pt.masuk)}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#FAF9F6]/65">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: EXPENSE }}
                />
                Keluar
                <span className="relative ml-0.5 inline-flex overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={`${finPeriod}-${active}-k`}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -10, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="font-bold tabular-nums text-[#E08A6D]"
                    >
                      −{formatIDRShort(pt.keluar)}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </span>
            </div>
            <span className="text-[10.5px] text-[#FAF9F6]/45">ketuk titik</span>
          </div>

          <div className="mx-auto mt-2 w-full max-w-[560px]">
            <FinChart points={series} active={active} onPick={setActive} />
          </div>
        </motion.section>

        {/* ===== Anggaran ===== */}
        <motion.section
          variants={item}
          className="rounded-[24px] bg-[#FAF9F6] p-4 text-[#231F1E] shadow-[0_18px_44px_rgba(35,31,30,0.4)]"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#4A3B32]">
              Anggaran Juni
            </h2>
            <Badge className="border-transparent bg-[#E4EFE0] text-[#658A4C] hover:bg-[#E4EFE0]">
              Terpakai {totalPct}%
            </Badge>
          </div>

          {/* Batang total */}
          <div className="mt-3">
            <div className="h-2.5 overflow-hidden rounded-full bg-[#4A3B32]/10">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${totalPct}%` }}
                transition={{ type: 'spring', stiffness: 110, damping: 21 }}
                className="h-full rounded-full bg-gradient-to-r from-[#749B58] to-[#A3C489]"
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-[#4A3B32]/70">
              <span>{formatIDRShort(spentTotal)} terpakai</span>
              <span>sisa {formatIDRShort(Math.max(0, totalLimit - spentTotal))}</span>
            </div>
          </div>

          {/* Baris per kategori */}
          <motion.div variants={rowStagger} className="mt-4 space-y-4">
            {BUDGETS.map((b) => {
              const used = spent[b.cat] ?? 0
              const pct = Math.round((used / b.limit) * 100)
              const over = used > b.limit
              const warn = !over && pct >= 85
              const Icon = CAT_META[b.cat].icon
              const barColor = over ? '#B25E3F' : warn ? '#C7A17A' : '#749B58'
              return (
                <motion.div key={b.cat} variants={rowItem} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4A3B32]/8 text-[#4A3B32]/85">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13.5px] font-semibold">
                        {CAT_META[b.cat].label}
                      </span>
                      <span className="shrink-0 text-[12px] tabular-nums text-[#4A3B32]/80">
                        {formatIDRShort(used)}{' '}
                        <span className="text-[#4A3B32]/45">
                          / {formatIDRShort(b.limit)}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#4A3B32]/10">
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: `${Math.min(100, pct)}%` }}
                        transition={{ type: 'spring', stiffness: 110, damping: 21 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: barColor }}
                      />
                    </div>
                    <p
                      className={`mt-1 text-[10.5px] ${
                        over
                          ? 'font-bold text-[#B25E3F]'
                          : 'text-[#4A3B32]/60'
                      }`}
                    >
                      {over
                        ? `Lewat ${formatIDRShort(used - b.limit)} dari batas`
                        : `Sisa ${formatIDRShort(b.limit - used)} bulan ini`}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </motion.section>

        {/* ===== Tujuan tabungan ===== */}
        <motion.section variants={item}>
          <div className="flex items-center justify-between gap-3 px-0.5">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#E9D5B8]">
              Tujuan Tabungan
            </h2>
            <button
              type="button"
              onClick={openGoalDialog}
              className="h-8 cursor-pointer rounded-full border border-[#FAF9F6]/25 px-3.5 text-[12px] font-bold text-[#FAF9F6] transition-all hover:bg-[#FAF9F6]/10 active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9B98C]"
            >
              + Tujuan
            </button>
          </div>

          <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto no-scrollbar pb-1">
            {goals.map((g, i) => (
              <GoalCard key={g.id} goal={g} index={i} />
            ))}

            {/* Kartu tambah — putus-putus */}
            <button
              type="button"
              onClick={openGoalDialog}
              className="flex min-h-[178px] w-[150px] shrink-0 snap-center cursor-pointer flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-[#FAF9F6]/30 px-3 py-4 text-[#FAF9F6]/70 transition-all hover:border-[#D9B98C]/60 hover:text-[#E9D5B8] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9B98C]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FAF9F6]/10">
                <Plus className="h-5 w-5" />
              </span>
              <span className="text-[12.5px] font-bold">Tujuan Baru</span>
              <span className="text-center text-[10.5px] leading-tight opacity-70">
                tetapkan nama &amp; target
              </span>
            </button>
          </div>
        </motion.section>

        {/* ===== Transaksi ===== */}
        <motion.section variants={item}>
          <div className="flex items-center justify-between gap-3 px-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#E9D5B8]">
                Transaksi
              </h2>
              <Badge className="border-transparent bg-[#FAF9F6]/12 text-[#E9D5B8] hover:bg-[#FAF9F6]/12">
                {filtered.length}
              </Badge>
            </div>
            <button
              type="button"
              onClick={openTxSheet}
              className="h-8 cursor-pointer rounded-full border border-[#FAF9F6]/25 px-3.5 text-[12px] font-bold text-[#FAF9F6] transition-all hover:bg-[#FAF9F6]/10 active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9B98C]"
            >
              + Tambah
            </button>
          </div>

          <div className="mt-3 max-h-[430px] space-y-2.5 overflow-y-auto no-scrollbar pr-1">
            <AnimatePresence initial={false} mode="popLayout">
              {filtered.map((tx) => (
                <TxRow key={tx.id} tx={tx} />
              ))}
              {filtered.length === 0 && (
                <motion.div
                  key="fin-empty"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="rounded-[20px] border-2 border-dashed border-[#FAF9F6]/25 px-6 py-9 text-center"
                >
                  <Wallet className="mx-auto h-6 w-6 text-[#FAF9F6]/50" />
                  <p className="mt-2 text-[13px] font-semibold text-[#FAF9F6]/70">
                    Belum ada transaksi
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-[#FAF9F6]/50">
                    pada periode {PERIOD_SCOPE[finPeriod].toLowerCase()}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      </motion.div>
    </div>
  )
}
