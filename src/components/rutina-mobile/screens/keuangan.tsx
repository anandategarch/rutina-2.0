'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { animate } from 'animejs'
import { AnimatePresence, useReducedMotion, useSpring } from 'motion/react'
import * as m from 'motion/react-m'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Info,
  Laptop,
  Minus,
  Pencil,
  PiggyBank,
  Plane,
  Plus,
  Receipt,
  Repeat,
  ScrollText,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
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
import { Input } from '@/components/ui/input'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import { Counter } from '../counter'
import { BlurFade, ShineBorder, Spotlight } from '../motion-kit'
import { RutinaDialog } from '../rutina-dialog'
import { RutinaEmptyState } from '../rutina-empty-state'
import { RutinaTabs, RutinaTabsList, RutinaTabsTrigger } from '../rutina-tabs'
import {
  addDaysISO,
  fromISO,
  isoOf,
  todayISO,
  useRutina,
  type FinCat,
  type FinPeriod,
  type Goal,
  type Tx,
  type TxType,
  type Wallet as FinWallet,
} from '../store'
import { FinChart } from '../finance/fin-chart'
import { BUDGETABLE_CATS, CAT_META } from '../finance/cats'
import { SpendHeatmap } from '../spend-heatmap'
import {
  buildSeries,
  currentMonthKey,
  currentMonthLabel,
  defaultActive,
  fmtDate,
  formatIDR,
  formatIDRShort,
  groupByDay,
  monthFlow,
  monthSpendByCat,
  periodScope,
  spentByCat,
  shiftMonthKey,
  totalSaldo,
  walletBalance,
  WEEKDAY_LABELS,
  yearWindow,
  type PeriodPoint,
} from '../finance/utils'
import { motionTokens } from '@/lib/motion/tokens'
import { RutinaSectionHeader } from '../rutina-section-header'
import { RutinaBentoGrid, RutinaBentoItem } from '../rutina-bento'

/* ===== Konstanta gerak =====
   Seluruh durasi/easing kini melalui motionTokens.preset (governance
   audit v2.9) — tidak ada angka gerak bebas di layar ini. */

/* Ikon tujuan tabungan — tiga pertama tetap, sisanya koin celengan. */
const GOAL_ICONS: LucideIcon[] = [ShieldCheck, Laptop, Plane]

/* ===== Periode arus kas =====
   "Minggu ini" / "Bulan ini" tersimpan di store; "Semua" adalah tampilan
   seluruh waktu (deret bulan dari arus kas pertama s.d. bulan berjalan)
   yang hanya hidup di layar ini — kontrak store tidak berubah. */
type ChartPeriod = FinPeriod | 'semua'

const PERIODS: { id: ChartPeriod; label: string }[] = [
  { id: 'minggu', label: 'Minggu ini' },
  { id: 'bulan', label: 'Bulan ini' },
  { id: 'semua', label: 'Semua' },
]

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

/** Akhiran label periode sebelumnya — baris perubahan saldo di kartu Vault. */
const PREV_SUFFIX: Record<ChartPeriod, string | null> = {
  minggu: 'vs minggu lalu',
  bulan: 'vs bulan lalu',
  tahun: 'vs tahun lalu',
  semua: null,
}

interface DateRange {
  start: string
  end: string
}

/** Rentang periode berjalan — dihitung dari hari nyata. */
function currentRange(period: ChartPeriod): DateRange | null {
  const today = todayISO()
  const now = fromISO(today)
  const y = now.getFullYear()
  const mo = now.getMonth()
  if (period === 'minggu') {
    const dow = (now.getDay() + 6) % 7 // Senin = 0
    const start = addDaysISO(today, -dow)
    return { start, end: addDaysISO(start, 6) }
  }
  if (period === 'bulan') {
    return {
      start: today.slice(0, 8) + '01',
      end: isoOf(new Date(y, mo + 1, 0)),
    }
  }
  if (period === 'tahun') {
    return { start: `${y}-01-01`, end: `${y}-12-31` }
  }
  return null
}

/** Rentang periode sebelumnya — pembanding perubahan saldo. */
function previousRange(period: ChartPeriod): DateRange | null {
  const today = todayISO()
  const now = fromISO(today)
  const y = now.getFullYear()
  const mo = now.getMonth()
  if (period === 'minggu') {
    const dow = (now.getDay() + 6) % 7
    const thisStart = addDaysISO(today, -dow)
    return { start: addDaysISO(thisStart, -7), end: addDaysISO(thisStart, -1) }
  }
  if (period === 'bulan') {
    return {
      start: isoOf(new Date(y, mo - 1, 1)),
      end: isoOf(new Date(y, mo, 0)),
    }
  }
  if (period === 'tahun') {
    return { start: `${y - 1}-01-01`, end: `${y - 1}-12-31` }
  }
  return null
}

/** Net arus kas (masuk − keluar; transfer dikecualikan) dalam rentang tanggal. */
function netInRange(txs: Tx[], r: DateRange): number {
  let net = 0
  for (const t of txs) {
    if (t.type === 'transfer') continue
    if (t.ts < r.start || t.ts > r.end) continue
    net += t.type === 'masuk' ? t.amount : -t.amount
  }
  return net
}

/** Deret "Semua": satu titik per bulan — dari bulan arus kas pertama
    hingga bulan berjalan, termasuk bulan kosong (garis waktu jujur).
    `details` memuat label panjang per titik untuk baris ringkasan. */
function buildAllSeries(txs: Tx[]): {
  series: PeriodPoint[]
  details: string[]
} {
  const now = fromISO(todayISO())
  const monthYear = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  })

  let first: { y: number; m: number } | null = null
  for (const t of txs) {
    if (t.type === 'transfer') continue
    const y = Number(t.ts.slice(0, 4))
    const mo = Number(t.ts.slice(5, 7)) - 1
    if (!first || y < first.y || (y === first.y && mo < first.m)) {
      first = { y, m: mo }
    }
  }
  const start = first ?? { y: now.getFullYear(), m: now.getMonth() }
  const startM = start.y * 12 + start.m
  const endM = now.getFullYear() * 12 + now.getMonth()

  const series: PeriodPoint[] = []
  const details: string[] = []
  for (let k = startM; k <= endM && series.length < 240; k++) {
    const y = Math.floor(k / 12)
    const mo = k % 12
    series.push({ label: MONTH_SHORT[mo], masuk: 0, keluar: 0 })
    details.push(monthYear.format(new Date(y, mo, 1)))
  }
  for (const t of txs) {
    if (t.type === 'transfer') continue
    const idx =
      Number(t.ts.slice(0, 4)) * 12 + (Number(t.ts.slice(5, 7)) - 1) - startM
    if (idx < 0 || idx >= series.length) continue
    if (t.type === 'masuk') series[idx].masuk += t.amount
    else series[idx].keluar += t.amount
  }
  return { series, details }
}

/** Label panjang per titik deret (baris ringkasan di bawah grafik):
    minggu → hari + tanggal, bulan → pekan + rentang tanggal,
    tahun → nama bulan penuh. */
function buildPeriodDetails(period: ChartPeriod, txs: Tx[]): string[] {
  const today = todayISO()
  const now = fromISO(today)
  if (period === 'minggu') {
    const dow = (now.getDay() + 6) % 7
    const start = addDaysISO(today, -dow)
    return WEEKDAY_LABELS.map(
      (wd, i) => `${wd}, ${fmtDate(addDaysISO(start, i))}`,
    )
  }
  if (period === 'bulan') {
    const y = now.getFullYear()
    const mo = now.getMonth()
    const days = new Date(y, mo + 1, 0).getDate()
    return [0, 1, 2, 3].map((n) => {
      const from = n * 7 + 1
      const to = Math.min(n * 7 + 7, days)
      const toISO = today.slice(0, 8) + String(to).padStart(2, '0')
      return `Pekan ${n + 1} · ${from}–${fmtDate(toISO)}`
    })
  }
  if (period === 'tahun') {
    const w = yearWindow(txs)
    const monthLong = new Intl.DateTimeFormat('id-ID', { month: 'long' })
    return Array.from({ length: w.now - w.first + 1 }, (_, i) =>
      monthLong.format(new Date(w.year, w.first + i, 1)),
    )
  }
  return []
}

/* ===== Kelengkapan antarmuka kecil ===== */

/** Pil aksi kepala bagian — satu gaya untuk seluruh layar. */
const PILL_CLS =
  'h-8 shrink-0 cursor-pointer rounded-full border border-border-strong px-3.5 text-[12px] font-bold text-content-secondary transition-all hover:bg-surface-secondary active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold'

function PillAction({
  children,
  onClick,
  label,
}: {
  children: ReactNode
  onClick: () => void
  label: string
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={PILL_CLS}>
      {children}
    </button>
  )
}

/** Judul bagian standar layar Keuangan — normal case, tenang
    (Tipografi System v1: uppercase hanya untuk eyebrow). */
function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-0.5">
      <h2 className="text-section font-semibold tracking-tight text-content-secondary">
        {title}
      </h2>
      {action}
    </div>
  )
}

/* ===== Kartu tujuan (cincin SVG animasi) ===== */

function GoalCard({ goal, index }: { goal: Goal; index: number }) {
  const openGoalSheet = useRutina((s) => s.openGoalSheet)
  const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100))
  const complete = goal.saved >= goal.target
  const remaining = Math.max(0, goal.target - goal.saved)
  const Icon = GOAL_ICONS[index] ?? PiggyBank
  const R = 24
  const C = 2 * Math.PI * R

  return (
    <Spotlight className="w-[188px] shrink-0 snap-start rounded-[22px] sm:w-full sm:shrink">
      <m.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...motionTokens.preset.data, delay: Math.min(index * 0.07, 0.28) }}
        className="flex h-full min-h-[200px] flex-col rounded-[22px] bg-surface-primary p-4 text-content-primary shadow-ink transition-transform duration-300 hover:-translate-y-0.5"
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
        <p className="mt-0.5 text-[12px] tabular-nums text-content-secondary">
          {formatIDRShort(goal.saved)}{' '}
          <span className="text-content-muted">dari {formatIDRShort(goal.target)}</span>
        </p>
        <p className="mt-0.5 text-[12px] tabular-nums text-content-muted">
          {complete ? 'Target tercapai' : `Sisa ${formatIDRShort(remaining)} lagi`}
        </p>

        <div className="mt-auto pt-3">
          {complete ? (
            <Badge className="w-full justify-center border-transparent bg-pistachio/30 text-success hover:bg-pistachio/30">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Tercapai
            </Badge>
          ) : (
            <button
              type="button"
              onClick={() => openGoalSheet(goal.id)}
              className="h-9 w-full cursor-pointer rounded-full bg-secondary text-[13px] font-bold text-success transition-all hover:bg-secondary/80 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Setor
            </button>
          )}
        </div>
      </m.div>
    </Spotlight>
  )
}

/* ===== Sel detail transaksi (kartu kecil dalam baris terbuka) ===== */

function DetailCell({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className="min-w-0 rounded-xl bg-surface-sunken px-2 py-2 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-content-muted">
        {label}
      </p>
      <p className={`mt-0.5 truncate text-[12px] font-bold ${tone ?? 'text-content-primary'}`}>
        {value}
      </p>
    </div>
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
  const walletLabel = isTransfer
    ? `${fromW?.name ?? 'Dompet'} → ${toW?.name ?? 'Dompet'}`
    : (fromW?.name ?? 'Tanpa dompet')

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -32, scale: 0.97, transition: { ...motionTokens.preset.interaction } }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="overflow-hidden rounded-[16px] bg-surface-primary text-content-primary shadow-ink"
    >
      <m.button
        type="button"
        whileTap={{ scale: 0.99 }}
        onClick={() => toggleExpandedTx(tx.id)}
        aria-expanded={expanded}
        aria-label={`${tx.note || CAT_META[tx.cat].label}, ${isTransfer ? 'transfer' : income ? 'pemasukan' : 'pengeluaran'} ${formatIDR(tx.amount)}`}
        className="relative z-10 flex w-full cursor-pointer items-center gap-3 p-3 text-left transition-colors duration-200 hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
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
            <span className="block min-w-0 line-clamp-2 break-words leading-snug text-[14px] font-semibold">
              {tx.note || CAT_META[tx.cat].label}
            </span>
            {tx.recurrence && !tx.recurOf && (
              <span
                title={`Berulang ${tx.recurrence}`}
                className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-module-accent/15 text-module-accent-strong"
              >
                <Repeat className="h-2.5 w-2.5" strokeWidth={2.5} />
              </span>
            )}
          </span>
          <span className="mt-0.5 block break-words text-[11px] leading-snug text-content-muted">
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
          transition={motionTokens.preset.interaction}
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
            transition={motionTokens.preset.navigation}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-3.5 pb-3.5 pt-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <DetailCell label="Kategori" value={CAT_META[tx.cat].label} />
                <DetailCell label="Tanggal" value={fmtDate(tx.ts)} />
                <DetailCell label="Dompet" value={walletLabel} />
                <DetailCell
                  label="Arus"
                  value={isTransfer ? 'Transfer' : income ? 'Masuk' : 'Keluar'}
                  tone={
                    isTransfer
                      ? 'text-content-muted'
                      : income
                        ? 'text-success'
                        : 'text-content-danger'
                  }
                />
              </div>

              {tx.note && (
                <div className="mt-2.5 rounded-xl bg-surface-sunken px-3 py-2 text-left">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-content-muted">
                    Catatan
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-content-secondary">
                    {tx.note}
                  </p>
                </div>
              )}

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

/* ===== Workspace Mutasi (desktop lg+) — buku kas & inspektor =====
   Di layar lebar tab Mutasi menjadi meja kerja akuntansi: panel kiri
   berisi ledger harian (pencarian + filter arus, baris hairline ala
   buku kas dengan angka tabular rata kanan), panel kanan berisi
   inspektor transaksi terpilih. Kedua panel menggulir mandiri dan
   pembatasnya bisa digeser. Ponsel (<lg) tetap memakai daftar TxRow
   per hari — komponen ini hanya dipasang di lg+. */

type MutasiFilter = TxType | 'semua'

const TYPE_FILTERS: { id: MutasiFilter; label: string }[] = [
  { id: 'semua', label: 'Semua' },
  { id: 'masuk', label: 'Masuk' },
  { id: 'keluar', label: 'Keluar' },
  { id: 'transfer', label: 'Transfer' },
]

/** Nada warna nominal — cermin TxRow: masuk hijau, keluar merah,
    transfer netral. Dipakai baris ledger & inspektor. */
function amountTone(tx: Tx): string {
  if (tx.type === 'masuk') return 'text-success'
  if (tx.type === 'keluar') return 'text-content-danger'
  return 'text-content-muted'
}

/** Nominal + tanda — transfer tanpa tanda, masuk "+", keluar "−". */
function amountText(tx: Tx): string {
  const sign = tx.type === 'transfer' ? '' : tx.type === 'masuk' ? '+' : '−'
  return `${sign}${formatIDR(tx.amount)}`
}

/** Label dompet (sumber → tujuan bila transfer) — logika yang sama
    dengan TxRow. */
function walletLabelOf(tx: Tx, wallets: FinWallet[]): string {
  const fromW = wallets.find((w) => w.id === tx.walletId)
  const toW = wallets.find((w) => w.id === tx.toWalletId)
  return tx.type === 'transfer'
    ? `${fromW?.name ?? 'Dompet'} → ${toW?.name ?? 'Dompet'}`
    : (fromW?.name ?? 'Tanpa dompet')
}

/** Satu baris ledger — padat, hairline bawah (utilitas ledger-row),
    nominal rata kanan. Terpilih memakai tint modul lembut + garis
    aksen perunggu di tepi kiri. */
function LedgerRow({
  tx,
  wallets,
  selected,
  onSelect,
}: {
  tx: Tx
  wallets: FinWallet[]
  selected: boolean
  onSelect: (id: string) => void
}) {
  const Icon = CAT_META[tx.cat].icon
  const income = tx.type === 'masuk'
  const isTransfer = tx.type === 'transfer'

  return (
    <button
      type="button"
      onClick={() => onSelect(tx.id)}
      aria-current={selected ? 'true' : undefined}
      className={`ledger-row flex min-h-11 w-full cursor-pointer items-center gap-3 px-2 py-2 text-left transition-[background-color,box-shadow] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
        selected
          ? 'bg-module-accent-soft/50 [box-shadow:inset_2px_0_0_var(--module-accent)] hover:bg-module-accent-soft/70'
          : '[box-shadow:inset_2px_0_0_transparent] hover:bg-surface-sunken'
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isTransfer
            ? 'bg-gold/30 text-warning'
            : income
              ? 'bg-pistachio/30 text-success'
              : 'bg-clay/25 text-content-danger'
        }`}
      >
        <Icon className="h-4 w-4" strokeWidth={2.1} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold leading-snug">
          {tx.note || CAT_META[tx.cat].label}
        </span>
        <span className="mt-0.5 block truncate text-[11px] leading-snug text-content-muted">
          {isTransfer
            ? walletLabelOf(tx, wallets)
            : `${CAT_META[tx.cat].label} · ${walletLabelOf(tx, wallets)}`}
        </span>
      </span>
      <span className="shrink-0 text-[11px] font-medium tabular-nums text-content-muted">
        {fmtDate(tx.ts)}
      </span>
      <span
        className={`w-28 shrink-0 text-right text-[13px] font-bold tabular-nums ${amountTone(tx)}`}
      >
        {amountText(tx)}
      </span>
    </button>
  )
}

/** Isi inspektor untuk satu transaksi — nominal besar, badge arus,
    baris rincian hairline, catatan, dan aksi Hapus dengan alur
    konfirmasi yang sama dengan TxRow. */
function TxInspectorDetail({
  tx,
  wallets,
  onClear,
}: {
  tx: Tx
  wallets: FinWallet[]
  onClear: () => void
}) {
  const deleteTx = useRutina((s) => s.deleteTx)
  const Icon = CAT_META[tx.cat].icon
  const dateLong = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fromISO(tx.ts))

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={motionTokens.preset.interactionInstant}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-content-muted">
            Detail Transaksi
          </p>
          <Badge
            className={
              tx.type === 'masuk'
                ? 'border-transparent bg-pistachio/30 text-success hover:bg-pistachio/30'
                : tx.type === 'keluar'
                  ? 'border-transparent bg-clay/20 text-content-danger hover:bg-clay/20'
                  : 'border-transparent bg-gold/25 text-warning hover:bg-gold/25'
            }
          >
            {tx.type === 'transfer'
              ? 'Transfer'
              : tx.type === 'masuk'
                ? 'Pemasukan'
                : 'Pengeluaran'}
          </Badge>
        </div>

        <p
          className="mt-3 text-[16px] font-semibold leading-snug tracking-tight text-content-primary"
        >
          {tx.note || CAT_META[tx.cat].label}
        </p>
        <p
          className={`mt-2 text-[30px] font-bold leading-none tabular-nums ${
            tx.type === 'masuk'
              ? 'text-success'
              : tx.type === 'keluar'
                ? 'text-content-danger'
                : 'text-content-primary'
          }`}
        >
          {amountText(tx)}
        </p>

        <dl className="mt-4">
          <div className="ledger-row flex items-center justify-between gap-3 py-2.5">
            <dt className="shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-content-muted">
              Kategori
            </dt>
            <dd className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-content-primary">
              <Icon className="h-3.5 w-3.5 shrink-0 text-content-secondary" strokeWidth={2.1} />
              <span className="truncate">{CAT_META[tx.cat].label}</span>
            </dd>
          </div>
          <div className="ledger-row flex items-center justify-between gap-3 py-2.5">
            <dt className="shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-content-muted">
              Dompet
            </dt>
            <dd className="min-w-0 truncate text-[13px] font-semibold text-content-primary">
              {walletLabelOf(tx, wallets)}
            </dd>
          </div>
          <div className="ledger-row flex items-center justify-between gap-3 py-2.5">
            <dt className="shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-content-muted">
              Tanggal
            </dt>
            <dd className="shrink-0 text-[13px] font-semibold tabular-nums text-content-primary">
              {dateLong}
            </dd>
          </div>
          {tx.recurrence && !tx.recurOf && (
            <div className="ledger-row flex items-center justify-between gap-3 py-2.5">
              <dt className="shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-content-muted">
                Jadwal
              </dt>
              <dd className="shrink-0 text-[13px] font-semibold text-content-primary">
                Berulang {tx.recurrence}
              </dd>
            </div>
          )}
        </dl>

        {tx.note && (
          <div className="mt-3 rounded-xl bg-surface-sunken px-3 py-2.5 text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-content-muted">
              Catatan
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-content-secondary">
              {tx.note}
            </p>
          </div>
        )}
      </div>

      <div className="flex shrink-0 gap-2 border-t border-border p-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-full border-destructive/30 text-[13px] font-semibold text-content-danger hover:bg-destructive/10 hover:text-content-danger"
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
          onClick={onClear}
          className="h-11 flex-1 rounded-full text-[13px] font-semibold text-content-secondary hover:bg-surface-secondary hover:text-content-primary"
        >
          Tutup
        </Button>
      </div>
    </m.div>
  )
}

/** Inspektor — panel kanan workspace Mutasi. Crossfade halus antar
    pergantian pilihan (AnimatePresence mode="wait", opacity 0.15 dtk);
    tanpa pilihan menampilkan keadaan kosong. */
function TxInspector({
  tx,
  wallets,
  onClear,
}: {
  tx: Tx | null
  wallets: FinWallet[]
  onClear: () => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <AnimatePresence mode="wait" initial={false}>
        {tx ? (
          <TxInspectorDetail
            key={tx.id}
            tx={tx}
            wallets={wallets}
            onClear={onClear}
          />
        ) : (
          <m.div
            key="kosong"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionTokens.preset.interactionInstant}
            className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 p-8 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-sunken text-content-muted">
              <ScrollText className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="text-[14px] font-bold text-content-primary">
              Pilih transaksi untuk melihat detail
            </p>
            <p className="max-w-[260px] text-[12px] leading-relaxed text-content-muted">
              Klik baris mutasi di panel kiri — rincian, catatan, dan aksi
              akan tampil di sini.
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Meja kerja Mutasi: ResizablePanelGroup horizontal — kiri ledger
    (default 60%), kanan inspektor (default 40%, resizable). */
function MutasiWorkspace({ className = '' }: { className?: string }) {
  const txs = useRutina((s) => s.txs)
  const wallets = useRutina((s) => s.wallets)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<MutasiFilter>('semua')
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)

  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      txs.filter((t) => {
        if (filter !== 'semua' && t.type !== filter) return false
        if (!q) return true
        return (
          t.note.toLowerCase().includes(q) ||
          CAT_META[t.cat].label.toLowerCase().includes(q)
        )
      }),
    [txs, filter, q],
  )
  const ledgerGroups = useMemo(() => groupByDay(filtered), [filtered])
  const selectedTx = useMemo(
    () =>
      selectedTxId ? (txs.find((t) => t.id === selectedTxId) ?? null) : null,
    [txs, selectedTxId],
  )

  return (
    <div
      className={`h-[calc(100dvh-18rem)] min-h-[460px] max-h-[840px] ${className}`}
    >
      <ResizablePanelGroup
        direction="horizontal"
        autoSaveId="mutasi-workspace"
        className="h-full"
      >
        {/* KIRI — buku kas: pencarian, filter arus, ledger per hari */}
        <ResizablePanel
          id="mutasi-ledger"
          defaultSize={60}
          minSize={38}
          className="min-w-0"
        >
          <section
            aria-label="Buku mutasi"
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-border bg-surface-primary shadow-soft"
          >
            <div className="shrink-0 space-y-2.5 border-b border-border p-4 pb-3">
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted"
                />
                <Input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari catatan / kategori…"
                  aria-label="Cari transaksi"
                  className="h-11 rounded-xl border-border bg-surface-sunken pl-10 pr-9 placeholder:text-content-muted focus-visible:border-gold/60"
                />
                {query !== '' && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Hapus pencarian"
                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {TYPE_FILTERS.map((f) => {
                  const active = filter === f.id
                  return (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFilter(f.id)}
                      className={`h-8 cursor-pointer rounded-full border px-3.5 text-[12px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                        active
                          ? 'border-module-accent/40 bg-module-accent/15 text-module-accent-strong'
                          : 'border-border text-content-secondary hover:bg-surface-sunken hover:text-content-primary'
                      }`}
                    >
                      {f.label}
                    </button>
                  )
                })}
                <span className="ml-auto shrink-0 text-[11px] font-semibold tabular-nums text-content-muted">
                  {filtered.length} transaksi
                </span>
              </div>
            </div>

            {/* Ledger — hairline per baris; kepala hari menempel saat digulir */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar">
              <div className="px-4 pb-4">
                {ledgerGroups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunken text-content-muted">
                      <Search className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <p className="text-[13px] font-bold text-content-primary">
                      Tidak ada mutasi yang cocok
                    </p>
                    <p className="text-[12px] text-content-muted">
                      Coba kata kunci lain atau ganti filter arus.
                    </p>
                  </div>
                ) : (
                  ledgerGroups.map((g) => (
                    <section key={g.date} aria-label={`Mutasi ${fmtDate(g.date)}`}>
                      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 border-b border-border bg-surface-primary/95 px-4 py-2 backdrop-blur-sm">
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-content-muted">
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
                      <div>
                        {g.txs.map((tx) => (
                          <LedgerRow
                            key={tx.id}
                            tx={tx}
                            wallets={wallets}
                            selected={selectedTxId === tx.id}
                            onSelect={setSelectedTxId}
                          />
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>
            </div>
          </section>
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="mx-0.5 bg-border transition-colors after:w-2 data-[resize-handle-state=hover]:bg-gold/60 data-[resize-handle-state=drag]:bg-gold"
        />

        {/* KANAN — inspektor transaksi terpilih */}
        <ResizablePanel
          id="mutasi-inspector"
          defaultSize={40}
          minSize={26}
          className="min-w-0"
        >
          <aside
            aria-label="Detail transaksi terpilih"
            className="h-full min-h-0 overflow-hidden rounded-[24px] border border-border bg-surface-primary shadow-soft"
          >
            <TxInspector
              tx={selectedTx}
              wallets={wallets}
              onClear={() => setSelectedTxId(null)}
            />
          </aside>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

/* ===== Kartu saldo — dompet espresso, bukan kartu bank =====
   Tanpa ikon NFC, chip, atau nomor kartu: tidak ada integrasi
   finansial nyata di baliknya. Tilt 3D halus + sapuan kilau ShineBorder.
   Baris perubahan periode (delta net vs periode sebelumnya) berada
   tepat di bawah angka saldo. */

function SaldoCard({
  saldo,
  txCount,
  delta,
  deltaSuffix,
  saldoRef,
  onAdd,
}: {
  saldo: number
  /** Jumlah transaksi bulan berjalan — dari data nyata, bukan angka statis. */
  txCount: number
  /** Perubahan net arus kas vs periode sebelumnya — null bila tak berlaku. */
  delta: number | null
  deltaSuffix: string | null
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

  const up = delta !== null && delta > 0
  const down = delta !== null && delta < 0

  return (
    <m.div
      role="button"
      tabIndex={0}
      aria-label={`Dompet Rutina Vault, saldo ${formatIDR(saldo)}.${
        delta !== null
          ? ` Net periode ini ${up ? '+' : down ? '−' : ''}${formatIDRShort(Math.abs(delta))}.`
          : ''
      } Ketuk untuk menambah transaksi.`}
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
      className="relative cursor-pointer overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,var(--hero-surface)_0%,var(--hero-surface-raised)_46%,var(--hero-surface)_100%)] motion-safe:animate-pan p-5 shadow-ink-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <ShineBorder borderWidth={1.5} duration={12} shineColor={['var(--palette-gold)', 'var(--palette-pistachio)']} />

      {/* Cahaya emas lembut dari sudut kiri atas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-gold/12 blur-3xl"
      />

      {/* Baris merek */}
      <p className="relative z-10 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-hero-accent">
        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
        Rutina Vault
      </p>

      {/* Saldo + perubahan periode */}
      <div className="relative z-10 mt-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-hero-content-muted">
          Saldo Tersedia
        </p>
        <div className="mt-0.5 flex items-baseline gap-1">
          <span className="text-[19px] font-bold text-hero-accent">Rp</span>
          <span
            ref={saldoRef}
            className="text-[32px] font-bold leading-none tabular-nums text-hero-content"
          >
            <Counter to={saldo} />
          </span>
        </div>
        {delta !== null && (
          <p
            className={`mt-1.5 flex items-center gap-1 text-[12px] font-bold tabular-nums ${
              up
                ? 'text-pistachio'
                : down
                  ? 'text-clay'
                  : 'text-hero-content-muted'
            }`}
          >
            {up ? (
              <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.4} />
            ) : down ? (
              <TrendingDown className="h-3.5 w-3.5" strokeWidth={2.4} />
            ) : (
              <Minus className="h-3.5 w-3.5" strokeWidth={2.4} />
            )}
            {delta === 0
              ? 'Sama dengan periode lalu'
              : `${up ? '+' : '−'}${formatIDRShort(Math.abs(delta))}${
                  deltaSuffix ? ` ${deltaSuffix}` : ''
                }`}
          </p>
        )}
      </div>

      {/* Transaksi bulan ini + pemegang */}
      <div className="relative z-10 mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-hero-content-muted">
            Transaksi bulan ini
          </p>
          <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-hero-accent">
            {txCount}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-hero-content-muted">
            Pemegang
          </p>
          <p className="mt-0.5 text-[13px] font-bold tracking-[0.1em] text-hero-accent">
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
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          over
            ? 'bg-clay/20 text-content-danger'
            : warn
              ? 'bg-gold/25 text-warning'
              : 'bg-surface-sunken text-content-secondary'
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        {/* Label kategori memakai lebar penuh baris pertama; nominal
            ikut bar progres di bawahnya agar label panjang (mis.
            "Makan & Minum") tidak terpotong di layar sempit. */}
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate text-[14px] font-semibold">
            {CAT_META[cat].label}
          </span>
          {over && (
            <Badge className="h-5 shrink-0 border-transparent bg-clay/20 px-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-content-danger hover:bg-clay/20">
              Melebihi
            </Badge>
          )}
          {warn && !over && (
            <Badge className="h-5 shrink-0 border-transparent bg-gold/25 px-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-warning hover:bg-gold/25">
              Hampir batas
            </Badge>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2.5">
          <div
            className={`h-1.5 min-w-0 flex-1 overflow-hidden rounded-full ${
              over ? 'bg-clay/20' : warn ? 'bg-gold/25' : 'bg-border'
            }`}
          >
            <m.div
              initial={{ width: '0%' }}
              animate={{ width: `${Math.min(100, pct)}%` }}
              transition={{ type: 'spring', stiffness: 110, damping: 21 }}
              className="h-full rounded-full"
              style={{ backgroundColor: barColor }}
            />
          </div>
          <span className="shrink-0 text-[12px] tabular-nums text-content-secondary">
            {formatIDRShort(used)}{' '}
            <span className="text-content-muted">/ {formatIDRShort(limit)}</span>
          </span>
        </div>
        <p
          className={`mt-1 text-[11px] ${
            over ? 'font-bold text-content-danger' : 'text-content-muted'
          }`}
        >
          {over
            ? `Lewat ${formatIDRShort(used - limit)} dari batas`
            : `Sisa ${formatIDRShort(limit - used)} bulan ini`}
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
            <AlertDialogDescription className="text-[13px] leading-relaxed text-content-muted">
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
              className="h-10 flex-1 cursor-pointer rounded-full border border-destructive/35 text-[13px] font-bold text-content-danger transition-colors hover:bg-destructive/10"
            >
              Hapus
            </button>
            <AlertDialogCancel className="mt-0 h-10 flex-1 rounded-full border-border-strong text-[13px] font-bold text-content-secondary">
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
              className="h-10 flex-1 rounded-full border-none bg-primary text-[13px] font-bold text-primary-foreground hover:bg-action-hover"
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
      <p className="mt-0.5 text-[13px] leading-relaxed text-content-muted">
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

/* Subtab Keuangan — arsitektur 4 bagian agar satu tab utama tetap
   nyaman dijangkau satu tangan (rekomendasi audit produk). */
type FinTab = 'ringkasan' | 'mutasi' | 'anggaran' | 'dompet'
const FIN_TABS: { id: FinTab; label: string }[] = [
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'mutasi', label: 'Mutasi' },
  { id: 'anggaran', label: 'Anggaran' },
  { id: 'dompet', label: 'Dompet' },
]

/** Prop lengkap satu baris anggaran — dipakai tab Anggaran & ringkasan. */
function budgetRowProps(
  b: { cat: FinCat; limit: number },
  spent: Record<string, number>,
) {
  const used = spent[b.cat] ?? 0
  const pct = b.limit > 0 ? Math.round((used / b.limit) * 100) : 0
  const over = used > b.limit
  const warn = !over && pct >= 80
  const barColor = over
    ? 'var(--destructive)'
    : warn
      ? 'var(--warning)'
      : 'var(--primary)'
  const Icon = CAT_META[b.cat].icon
  return { cat: b.cat, limit: b.limit, used, pct, over, warn, barColor, Icon }
}

/* ===== Temuan & Rekomendasi (audit #10) =====

   Aturan berbasis data bulan berjalan. Bahasa observasional
   ("terdeteksi", "terlihat") — tanpa klaim sebab-akibat. */

/** Satu temuan: kartu baris + rekomendasi menjorok. */
interface FinFinding {
  key: string
  /** Urutan kepentingan — kecil tampil lebih dulu; maksimal 4 tampil. */
  weight: number
  /** warn = amber, info = netral, good = matcha positif. */
  tone: 'warn' | 'info' | 'good'
  icon: LucideIcon
  title: string
  body: string
  rec: string
}

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
  /* "Semua" hanya hidup lokal; tiga periode store tetap tersinkron. */
  const [period, setPeriod] = useState<ChartPeriod>(
    finPeriod === 'tahun' ? 'bulan' : finPeriod,
  )
  /* Titik pilihan pengguna — diingat per periode. Bila belum memilih
     (atau periode berganti), jatuh ke titik "hari ini" yang diderivasi
     murni dari data: tanpa efek, tanpa setState saat render. */
  const [picked, setPicked] = useState<{ period: ChartPeriod; i: number } | null>(
    null,
  )

  const changePeriod = (p: string) => {
    const next = p as ChartPeriod
    setPeriod(next)
    if (next !== 'semua') setFinPeriod(next)
  }

  /* Derivasi data — murni dari state, aman untuk SSR. */
  const { series, details } = useMemo(() => {
    if (period === 'semua') return buildAllSeries(txs)
    return {
      series: buildSeries(txs, period),
      details: buildPeriodDetails(period, txs),
    }
  }, [txs, period])

  const totals = useMemo(
    () =>
      series.reduce(
        (a, p) => ({ masuk: a.masuk + p.masuk, keluar: a.keluar + p.keluar }),
        { masuk: 0, keluar: 0 },
      ),
    [series],
  )
  const net = totals.masuk - totals.keluar
  /* Rasio tabungan periode terpilih — (masuk − keluar) / masuk × 100%.
     Null (→ tampil "—") bila belum ada pemasukan pada periode ini. */
  const savingRate =
    totals.masuk > 0 ? Math.round((net / totals.masuk) * 100) : null
  const savingRateTone =
    savingRate === null
      ? 'text-content-muted'
      : savingRate > 0
        ? 'text-success'
        : savingRate < 0
          ? 'text-content-danger'
          : 'text-content-secondary'
  const savingRateLabel =
    savingRate === null
      ? '—'
      : savingRate > 0
        ? `${savingRate}%`
        : savingRate < 0
          ? `−${Math.abs(savingRate)}%`
          : '0%'
  const lastIdx = Math.max(0, series.length - 1)
  const fallbackActive = Math.min(
    period === 'semua' ? lastIdx : defaultActive(period, txs),
    lastIdx,
  )
  const activeIdx =
    picked && picked.period === period
      ? Math.min(picked.i, lastIdx)
      : fallbackActive
  const pt = series[activeIdx]
  const detailLabel = pt ? (details[activeIdx] ?? pt.label) : '—'
  const dayNet = pt ? pt.masuk - pt.keluar : 0

  /* Perubahan net arus kas vs periode sebelumnya — baris di kartu Vault. */
  const periodDelta = useMemo(() => {
    if (period === 'semua') return null
    const cur = currentRange(period)
    const prev = previousRange(period)
    if (!cur || !prev) return null
    return netInRange(txs, cur) - netInRange(txs, prev)
  }, [period, txs])

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
  /* Ringkasan anggaran di Beranda: tiga kategori paling terbebani. */
  const topBudgets = useMemo(
    () =>
      [...budgetRows]
        .sort(
          (a, b) =>
            (spent[b.cat] ?? 0) / Math.max(1, b.limit) -
            (spent[a.cat] ?? 0) / Math.max(1, a.limit),
        )
        .slice(0, 3),
    [budgetRows, spent],
  )
  const totalSaved = useMemo(
    () => goals.reduce((a, g) => a + g.saved, 0),
    [goals],
  )
  const totalTarget = useMemo(
    () => goals.reduce((a, g) => a + g.target, 0),
    [goals],
  )
  /* Mutasi dikelompokkan per hari — ringkasan arus kas harian. */
  const dayGroups = useMemo(() => groupByDay(txs), [txs])
  const transfers = useMemo(
    () => txs.filter((t) => t.type === 'transfer'),
    [txs],
  )
  /* Aktivitas terbaru di Ringkasan — empat transaksi terakhir. */
  const recent = useMemo(
    () =>
      [...txs]
        .sort((a, b) =>
          a.ts === b.ts ? b.id.localeCompare(a.id) : a.ts < b.ts ? 1 : -1,
        )
        .slice(0, 4),
    [txs],
  )

  /* Temuan & rekomendasi — deret aturan observasional, maks 4, urut
     kepentingan: over-anggaran > dominan > naik > berulang > surplus. */
  const findings = useMemo<FinFinding[]>(() => {
    const out: FinFinding[] = []
    const ym = currentMonthKey()
    const flow = monthFlow(txs, ym)
    const prevFlow = monthFlow(txs, shiftMonthKey(ym, -1))
    const byCat = monthSpendByCat(txs, ym)

    /* 1 — kategori over-anggaran bulan berjalan. */
    for (const [cat, limit] of Object.entries(budgets)) {
      if (!BUDGETABLE_CATS.includes(cat as FinCat) || limit <= 0) continue
      const used = byCat[cat] ?? 0
      if (used <= limit) continue
      const label = CAT_META[cat as FinCat].label
      const pct = Math.round((used / limit) * 100)
      out.push({
        key: `over-${cat}`,
        weight: 0,
        tone: 'warn',
        icon: AlertTriangle,
        title: `Batas ${label} terlampaui`,
        body: `Anggaran ${label} terlampaui ${formatIDR(used - limit)} (${pct}% dari batas) — terdeteksi dari ${formatIDR(used)} pemakaian bulan ini.`,
        rec: `Tinjau kembali jatah ${label} atau kecilkan porsi pekan depan.`,
      })
    }

    /* 2 — kategori dominan (>40% dari total keluar). */
    const spent = flow.keluar
    const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1])
    if (spent > 0 && catEntries.length > 0) {
      const [topCat, topVal] = catEntries[0]
      const share = Math.round((topVal / spent) * 100)
      if (share > 40) {
        const label = CAT_META[topCat as FinCat].label
        out.push({
          key: 'dominan',
          weight: 1,
          tone: 'warn',
          icon: AlertTriangle,
          title: 'Pengeluaran terkonsentrasi',
          body: `Pengeluaran terlihat terkonsentrasi di ${label} — ${share}% dari total ${formatIDR(spent)} bulan ini.`,
          rec: `Cek apakah semua transaksi ${label} masih sesuai prioritas.`,
        })
      }
    }

    /* 3 — pengeluaran naik >15% vs bulan lalu (keduanya non-nol). */
    if (prevFlow.keluar > 0 && flow.keluar > prevFlow.keluar * 1.15) {
      const pct = Math.round((flow.keluar / prevFlow.keluar - 1) * 100)
      out.push({
        key: 'naik',
        weight: 2,
        tone: 'warn',
        icon: AlertTriangle,
        title: 'Pengeluaran naik',
        body: `Pengeluaran naik ${pct}% dibanding bulan lalu — terdeteksi dari ${formatIDR(flow.keluar)} vs ${formatIDR(prevFlow.keluar)}.`,
        rec: 'Tinjau transaksi terbesar sebelum menutup bulan.',
      })
    }

    /* 4 — transaksi berulang aktif (templat, bukan salinan otomatis). */
    const recurrings = txs.filter((t) => t.recurrence && !t.recurOf)
    if (recurrings.length > 0) {
      const monthly = recurrings.reduce(
        (a, t) =>
          a +
          (t.recurrence === 'bulanan'
            ? t.amount
            : Math.round((t.amount * 52) / 12)),
        0,
      )
      out.push({
        key: 'berulang',
        weight: 3,
        tone: 'info',
        icon: Info,
        title: 'Transaksi berulang aktif',
        body: `Ada ${recurrings.length} transaksi berulang aktif senilai ${formatIDR(monthly)}/bulan — terlihat dari jadwal langganan tercatat.`,
        rec: 'Pastikan langganan ini masih dipakai.',
      })
    }

    /* 5 — surplus arus kas (positif, paling akhir). */
    const netFlow = flow.masuk - flow.keluar
    if (netFlow > 0) {
      out.push({
        key: 'surplus',
        weight: 4,
        tone: 'good',
        icon: TrendingUp,
        title: 'Arus kas surplus',
        body: `Arus kas bulan ini surplus ${formatIDR(netFlow)} — terlihat dari masuk ${formatIDR(flow.masuk)} berbanding keluar ${formatIDR(flow.keluar)}.`,
        rec: 'Pertimbangkan menambah setoran ke target tabungan.',
      })
    }

    return out.sort((a, b) => a.weight - b.weight).slice(0, 4)
  }, [txs, budgets])

  /* anime.js — denyut "ka-ching" pada angka saldo saat transaksi baru masuk.
     Kebijakan reduced-motion: angka langsung diperbarui tanpa denyut. */
  const prevLen = useRef(txs.length)
  const saldoRef = useRef<HTMLSpanElement>(null)
  const reducedMotion = useReducedMotion()
  useEffect(() => {
    if (txs.length === prevLen.current) return
    const grew = txs.length > prevLen.current
    prevLen.current = txs.length
    if (grew && saldoRef.current && !reducedMotion) {
      const anim = animate(saldoRef.current, {
        scale: [1, 1.04, 1],
        duration: motionTokens.preset.valuePopMs.duration,
        ease: 'outBack(2)',
      })
      return () => {
        anim.revert()
      }
    }
  }, [txs.length, reducedMotion])

  const netChipTone =
    net > 0
      ? 'text-success'
      : net < 0
        ? 'text-content-danger'
        : 'text-content-secondary'

  return (
    <div
      data-module="finance"
      data-layout="vault"
      className="h-full overflow-y-auto no-scrollbar px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] text-content-primary"
    >
      {/* Kepala halaman — Tipografi System v1: judul operasional Geist
          Sans (bukan serif); hierarki jelas sebelum segmented tabs. */}
      <header>
        <p className="flex items-center gap-1.5 text-eyebrow font-bold uppercase tracking-[0.16em] text-module-accent-strong">
          <Wallet className="h-3.5 w-3.5" />
          Vault &amp; ledger
        </p>
        <h1 className="mt-1.5 text-balance text-fluid-page font-bold leading-none tracking-tight">
          Keuangan
        </h1>
        <p className="mt-2 text-[14px] font-medium text-content-muted">
          Ringkasan kondisi keuanganmu
        </p>
      </header>

      {/* Subtab Keuangan — Radix Tabs: state aktif terkelola penuh,
          dukungan papan tombol otomatis (pengganti pil aria-pressed). */}
      <RutinaTabs value={finTab} onValueChange={(v) => setFinTab(v as FinTab)}>
        <RutinaTabsList
          variant="segment"
          aria-label="Bagian Keuangan"
          className="mt-4 w-full border-transparent p-1"
        >
          {FIN_TABS.map((t) => (
            <RutinaTabsTrigger
              key={t.id}
              value={t.id}
              className="flex-1 px-2 data-[state=active]:bg-module-accent/15 data-[state=active]:text-module-accent-strong"
            >
              {t.label}
            </RutinaTabsTrigger>
          ))}
        </RutinaTabsList>

      {/* Section reveal memakai BlurFade (magicui): blur-ke-fokus saat
          masuk viewport — pengganti staggervariants statis. */}
      <div className="mt-4 flex flex-col gap-[var(--layout-gap)]">
        {finTab === 'ringkasan' && (
          <>
        {/* ===== LAPISAN 1 — SALDO: dompet espresso + FAB tambah ===== */}
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
              delta={periodDelta}
              deltaSuffix={PREV_SUFFIX[period]}
              saldoRef={saldoRef}
              onAdd={openTxSheet}
            />
          </div>
        </BlurFade>

        {/* ===== LAPISAN 2 — ARUS KAS: periode + grafik interaktif ===== */}
        <BlurFade
          delay={0.06}
          className="rounded-[24px] border border-border bg-surface-primary p-4 shadow-soft sm:p-5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-section font-semibold tracking-tight text-content-secondary">
              Arus Kas
            </h2>
            <span className="text-[11px] font-medium tabular-nums text-content-muted">
              {period === 'semua' ? 'Semua waktu' : periodScope(period, txs)}
            </span>
          </div>

          {/* Kontrol periode — segmented control Radix (papan tombal penuh) */}
          <RutinaTabs value={period} onValueChange={changePeriod}>
            <RutinaTabsList
              variant="segment"
              aria-label="Pilih periode arus kas"
              className="mt-3 h-10 w-full rounded-full border-transparent bg-surface-sunken p-1"
            >
              {PERIODS.map((p) => (
                <RutinaTabsTrigger
                  key={p.id}
                  value={p.id}
                  className="h-8 flex-1 px-2 text-[12px]"
                >
                  {p.label}
                </RutinaTabsTrigger>
              ))}
            </RutinaTabsList>
          </RutinaTabs>

          {/* Chip ringkasan periode: masuk, keluar, net + rasio tabungan */}
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={period}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={motionTokens.preset.interaction}
              className="mt-3.5"
            >
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl bg-surface-sunken px-3 py-2.5">
                  <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.1em] text-content-muted">
                    <ArrowUpRight className="h-3 w-3 text-pistachio" strokeWidth={2.6} />
                    Masuk
                  </p>
                  <p className="mt-1 truncate text-[15px] font-bold tabular-nums text-success">
                    +{formatIDRShort(totals.masuk)}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-sunken px-3 py-2.5">
                  <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.1em] text-content-muted">
                    <ArrowDownRight className="h-3 w-3 text-clay" strokeWidth={2.6} />
                    Keluar
                  </p>
                  <p className="mt-1 truncate text-[15px] font-bold tabular-nums text-content-danger">
                    −{formatIDRShort(totals.keluar)}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-sunken px-3 py-2.5">
                  <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.1em] text-content-muted">
                    {net > 0 ? (
                      <TrendingUp className="h-3 w-3 text-pistachio" strokeWidth={2.6} />
                    ) : net < 0 ? (
                      <TrendingDown className="h-3 w-3 text-clay" strokeWidth={2.6} />
                    ) : (
                      <Minus className="h-3 w-3 text-content-muted" strokeWidth={2.6} />
                    )}
                    Net
                  </p>
                  <p className={`mt-1 truncate text-[15px] font-bold tabular-nums ${netChipTone}`}>
                    {net > 0
                      ? `+${formatIDRShort(net)}`
                      : net < 0
                        ? `−${formatIDRShort(-net)}`
                        : '0'}
                  </p>
                </div>
              </div>

              {/* Rasio tabungan periode — (masuk − keluar) / masuk.
                  "—" bila belum ada pemasukan pada periode ini. */}
              <div className="mt-2.5 flex items-center justify-between gap-3 rounded-2xl bg-surface-sunken px-3 py-2.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.1em] text-content-muted">
                    <PiggyBank className="h-3 w-3 text-module-accent-strong" strokeWidth={2.6} />
                    Rasio Tabungan
                  </p>
                  <p className="mt-0.5 truncate text-[11px] leading-tight text-content-muted">
                    Sisa pemasukan yang berhasil disimpan
                  </p>
                </div>
                <p
                  className={`shrink-0 text-[17px] font-bold tabular-nums ${savingRateTone}`}
                >
                  {savingRateLabel}
                </p>
              </div>
            </m.div>
          </AnimatePresence>

          {/* Grafik — remount per ganti periode agar batang tumbuh
              berantai dari nol; pilih titik dengan mengetuk batang. */}
          <div className="mx-auto mt-3 w-full max-w-[560px] md:max-w-none">
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={period}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={motionTokens.preset.interaction}
              >
                <FinChart
                  points={series}
                  active={activeIdx}
                  onPick={(i) => setPicked({ period, i })}
                />
              </m.div>
            </AnimatePresence>
          </div>

          {/* Ringkasan titik terpilih — tanggal, masuk, keluar, net */}
          <div
            className="mt-2.5 rounded-2xl bg-surface-sunken px-3.5 py-3"
            aria-live="polite"
          >
            <div className="flex items-baseline justify-between gap-2">
              <AnimatePresence mode="wait" initial={false}>
                <m.p
                  key={`${period}-${activeIdx}-head`}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  transition={motionTokens.preset.interaction}
                  className="text-[13px] font-bold text-content-primary"
                >
                  {detailLabel}
                </m.p>
              </AnimatePresence>
              <p className="shrink-0 text-[11px] font-medium text-content-muted">
                ketuk batang
              </p>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={`${period}-${activeIdx}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={motionTokens.preset.interaction}
                className="mt-2 grid grid-cols-3 gap-2"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-content-muted">
                    Masuk
                  </p>
                  <p className="mt-0.5 text-[14px] font-bold tabular-nums text-success">
                    {pt && pt.masuk > 0 ? `+${formatIDRShort(pt.masuk)}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-content-muted">
                    Keluar
                  </p>
                  <p className="mt-0.5 text-[14px] font-bold tabular-nums text-content-danger">
                    {pt && pt.keluar > 0 ? `−${formatIDRShort(pt.keluar)}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-content-muted">
                    Net
                  </p>
                  <p
                    className={`mt-0.5 text-[14px] font-bold tabular-nums ${
                      dayNet > 0
                        ? 'text-success'
                        : dayNet < 0
                          ? 'text-content-danger'
                          : 'text-content-secondary'
                    }`}
                  >
                    {dayNet > 0
                      ? `+${formatIDRShort(dayNet)}`
                      : dayNet < 0
                        ? `−${formatIDRShort(-dayNet)}`
                        : '—'}
                  </p>
                </div>
              </m.div>
            </AnimatePresence>
          </div>
        </BlurFade>

        {/* ===== LAPISAN 3 & 4 — ANGGARAN + TUJUAN (berdampingan di md) =====
            grid-cols-1 eksplisit (minmax(0,1fr)) agar kolom tunggal di
            ponsel tidak melebar mengikuti max-content isi kartu. */}
        <BlurFade delay={0.1} className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
          {/* Anggaran — potret pemakaian paling kritis bulan ini */}
          <div>
            <SectionTitle
              title="Anggaran"
              action={
                <PillAction onClick={() => setFinTab('anggaran')} label="Kelola anggaran">
                  Kelola
                </PillAction>
              }
            />
            {budgetRows.length === 0 ? (
              <RutinaEmptyState
                className="mt-3"
                icon={<Receipt />}
                title="Belum ada anggaran"
                description="Atur batas belanjamu per kategori supaya pengeluaran lebih mudah dikendalikan."
                action={
                  <PillAction onClick={() => setFinTab('anggaran')} label="Atur anggaran">
                    Atur Anggaran
                  </PillAction>
                }
              />
            ) : (
              <div className="mt-3 rounded-[24px] border border-border bg-surface-primary p-4 shadow-soft">
                <div className="flex items-center justify-between gap-2">
                  <Badge className="border-transparent bg-secondary text-success hover:bg-secondary">
                    Terpakai {totalPct}%
                  </Badge>
                  <p className="text-[11px] font-medium tabular-nums text-content-muted">
                    {formatIDRShort(spentTotal)} / {formatIDRShort(totalLimit)}
                  </p>
                </div>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-border">
                  <m.div
                    initial={{ width: '0%' }}
                    animate={{ width: `${totalPct}%` }}
                    transition={{ type: 'spring', stiffness: 110, damping: 21 }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-pistachio"
                  />
                </div>
                <div className="mt-4 space-y-4">
                  {topBudgets.map((b) => (
                    <BudgetRow key={b.cat} {...budgetRowProps(b, spent)} />
                  ))}
                </div>
                {budgetRows.length > topBudgets.length && (
                  <button
                    type="button"
                    onClick={() => setFinTab('anggaran')}
                    className="mt-4 h-9 w-full cursor-pointer rounded-full bg-surface-sunken text-[12px] font-bold text-content-secondary transition-all hover:bg-surface-secondary active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    +{budgetRows.length - topBudgets.length} kategori lagi
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tujuan tabungan — progres cincin + aksi setor */}
          <div>
            <SectionTitle
              title="Tujuan Tabungan"
              action={
                <PillAction onClick={openGoalDialog} label="Tambah tujuan tabungan">
                  + Tujuan
                </PillAction>
              }
            />
            {goals.length === 0 ? (
              <RutinaEmptyState
                className="mt-3"
                icon={<PiggyBank />}
                title="Belum ada tujuan"
                description="Tetapkan target tabungan pertamamu dan pantau progresnya di sini."
                action={
                  <PillAction onClick={openGoalDialog} label="Buat tujuan tabungan">
                    Buat Tujuan
                  </PillAction>
                }
              />
            ) : (
              <>
                <p className="mt-2 px-0.5 text-[12px] font-medium tabular-nums text-content-muted">
                  Terkumpul {formatIDRShort(totalSaved)} dari{' '}
                  {formatIDRShort(totalTarget)}
                </p>
                <div className="relative mt-2.5">
                  <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto no-scrollbar pb-1 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:pb-0">
                    {goals.map((g, i) => (
                      <GoalCard key={g.id} goal={g} index={i} />
                    ))}

                    {/* Kartu tambah — putus-putus */}
                    <button
                      type="button"
                      onClick={openGoalDialog}
                      className="flex min-h-[200px] w-[150px] shrink-0 snap-center cursor-pointer flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-border-strong px-3 py-4 text-content-muted transition-all hover:border-gold hover:text-content-primary active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold sm:w-full"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunken">
                        <Plus className="h-5 w-5" />
                      </span>
                      <span className="text-[13px] font-bold">Tujuan Baru</span>
                      <span className="text-center text-[11px] leading-tight opacity-70">
                        tetapkan nama &amp; target
                      </span>
                    </button>
                  </div>
                  {/* Petunjuk geser — memudar di tepi kanan carousel */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-[22px] bg-gradient-to-l from-surface-primary to-transparent sm:hidden"
                  />
                </div>
              </>
            )}
          </div>
        </BlurFade>

        {/* ===== AKTIVITAS TERBARU — 4 mutasi terakhir, bisa dibuka ===== */}
        <BlurFade delay={0.12}>
          <SectionTitle
            title="Aktivitas Terbaru"
            action={
              <PillAction onClick={() => setFinTab('mutasi')} label="Lihat semua mutasi">
                Lihat Semua
              </PillAction>
            }
          />
          {recent.length === 0 ? (
            <RutinaEmptyState
              className="mt-3"
              icon={<Wallet />}
              title="Belum ada transaksi"
              description="Catat pemasukan atau pengeluaran pertamamu — gerak saldo langsung tergambar di sini."
              action={
                <PillAction onClick={openTxSheet} label="Catat transaksi">
                  Catat Transaksi
                </PillAction>
              }
            />
          ) : (
            <div className="mt-3 space-y-2.5">
              {recent.map((tx) => (
                <TxRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </BlurFade>

        {/* ===== PETA PANAS + TEMUAN — pasangan bento desktop (wide 8 +
              feature 4); urutan DOM dipertahankan, ponsel tetap bertumpuk.
              (audit #9 & #10) ===== */}
        <BlurFade delay={0.14}>
          <m.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              ...motionTokens.preset.layout,
              delay: 0.13,
            }}
          >
            <RutinaBentoGrid>
              <RutinaBentoItem span="wide">
          <RutinaSectionHeader
            title="Peta Panas Pengeluaran"
            description="Total keluar harian · 12 pekan terakhir · tanpa transfer."
          />
          <div className="mt-3">
            <SpendHeatmap />
          </div>
              </RutinaBentoItem>
              <RutinaBentoItem span="feature">
          <RutinaSectionHeader
            title="Temuan & Rekomendasi"
            description="Observasi bulan ini — bukan kesimpulan sebab-akibat."
          />
          {findings.length === 0 ? (
            <RutinaEmptyState
              className="mt-3"
              icon={<Info />}
              title="Belum cukup data untuk temuan bulan ini"
              description="Temuan muncul setelah ada transaksi, anggaran, atau perbandingan bulan yang cukup."
            />
          ) : (
            <ul className="mt-3 space-y-2.5">
              {findings.map((f) => (
                <li
                  key={f.key}
                  className="rounded-[18px] border border-border bg-surface-primary p-4 shadow-soft"
                >
                  <div className="flex gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        f.tone === 'warn'
                          ? 'bg-gold/25 text-warning'
                          : f.tone === 'good'
                            ? 'bg-secondary text-success'
                            : 'bg-surface-sunken text-content-secondary'
                      }`}
                    >
                      <f.icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-content-primary">
                        {f.title}
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-content-secondary">
                        {f.body}
                      </p>
                      <p className="mt-2 flex gap-1.5 border-l-2 border-gold/60 pl-2.5 text-[12px] leading-relaxed text-content-muted">
                        <ArrowRight
                          aria-hidden="true"
                          className="mt-[3px] h-3 w-3 shrink-0 text-warning"
                        />
                        {f.rec}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
              </RutinaBentoItem>
            </RutinaBentoGrid>
          </m.div>
        </BlurFade>
          </>
        )}

        {/* ===== MUTASI: arus kas harian + seluruh transaksi ===== */}
        {finTab === 'mutasi' && (
          <BlurFade delay={0.04}>
            <SectionTitle
              title="Mutasi"
              action={
                <span className="flex items-center gap-2">
                  <Badge className="border-transparent bg-secondary text-success hover:bg-secondary">
                    {txs.length}
                  </Badge>
                  <PillAction onClick={openTxSheet} label="Tambah transaksi">
                    + Tambah
                  </PillAction>
                </span>
              }
            />

            {dayGroups.length === 0 ? (
              <RutinaEmptyState
                className="mt-3"
                icon={<Wallet />}
                title="Belum ada transaksi"
                description="Catat pemasukan/pengeluaran pertamamu — mutasi akan tampil terkelompok per hari."
                action={
                  <PillAction onClick={openTxSheet} label="Catat transaksi">
                    Catat Transaksi
                  </PillAction>
                }
              />
            ) : (
              <>
                {/* Desktop lg+ — meja kerja akuntansi: ledger + inspektor
                    (panel resizable, gulir mandiri; lihat MutasiWorkspace) */}
                <MutasiWorkspace className="mt-3 hidden lg:block" />

                {/* Ponsel/tablet — daftar terkelompok per hari,
                    persis seperti sebelumnya */}
                <div className="mt-3 space-y-5 lg:hidden">
                  {dayGroups.map((g) => (
                    <div key={g.date}>
                      <div className="mb-2 flex items-center justify-between px-0.5">
                        <p className="text-eyebrow font-bold uppercase tracking-[0.12em] text-content-muted">
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
              </>
            )}
          </BlurFade>
        )}

        {/* ===== ANGGARAN: batas per kategori, dapat diubah ===== */}
        {finTab === 'anggaran' && (
          <BlurFade delay={0.04}>
            <div className="relative rounded-[24px] bg-surface-primary p-4 text-content-primary shadow-ink-deep">
              <ShineBorder borderWidth={1.5} duration={12} shineColor={['var(--palette-gold)', 'var(--palette-pistachio)']} />
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-section font-semibold tracking-tight text-content-secondary">
                  Anggaran {currentMonthLabel()}
                </h2>
                <Badge className="border-transparent bg-secondary text-success hover:bg-secondary">
                  Terpakai {totalPct}%
                </Badge>
              </div>

              {budgetRows.length === 0 ? (
                <RutinaEmptyState
                  className="mt-3"
                  icon={<Receipt />}
                  title="Belum ada anggaran"
                  description="Pilih kategori di bawah untuk menetapkan batas belanja bulanan pertamamu."
                />
              ) : (
                <>
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
                    {budgetRows.map((b) => (
                      <BudgetRow key={b.cat} {...budgetRowProps(b, spent)} />
                    ))}
                  </div>
                </>
              )}

              {/* Tambah kategori yang belum dianggarkan */}
              {BUDGETABLE_CATS.filter((c) => !(c in budgets)).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 pt-1">
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
          </BlurFade>
        )}

        {/* ===== DOMPET: saldo per sumber dana + transfer ===== */}
        {finTab === 'dompet' && (
          <>
            <BlurFade delay={0.04}>
              <SectionTitle
                title="Dompet & Rekening"
                action={
                  <span className="flex gap-2">
                    <button
                      type="button"
                      onClick={openTransferSheet}
                      disabled={wallets.length < 2}
                      className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-surface-inverse px-3.5 text-[12px] font-bold text-content-inverse transition-all hover:bg-espresso-soft active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowLeftRight className="h-3.5 w-3.5" />
                      Transfer
                    </button>
                    <PillAction onClick={openWalletDialog} label="Tambah dompet">
                      + Dompet
                    </PillAction>
                  </span>
                }
              />

              {wallets.length === 0 ? (
                <RutinaEmptyState
                  className="mt-3"
                  icon={<Wallet />}
                  title="Belum ada dompet"
                  description="Pisahkan uang tunai, rekening bank, atau e-wallet — saldo dihitung per sumber dana."
                  action={
                    <button
                      type="button"
                      onClick={openWalletDialog}
                      className="h-10 cursor-pointer rounded-full bg-primary px-5 text-[13px] font-bold text-primary-foreground shadow-soft transition-all hover:bg-action-hover active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                    >
                      Buat Dompet
                    </button>
                  }
                />
              ) : (
                <div className="mt-3 space-y-2.5">
                  {wallets.map((w, i) => (
                    <m.div
                      key={w.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...motionTokens.preset.layout, delay: i * 0.06 }}
                      className="rounded-[20px] border border-border bg-surface-primary p-4 shadow-soft"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-module-accent/15 text-module-accent-strong">
                          <Wallet className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-bold text-content-primary">
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
                <h3 className="px-0.5 text-[13px] font-semibold tracking-tight text-content-muted">
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
                        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-content-primary">
                          {fromW?.name ?? 'Dompet'} → {toW?.name ?? 'Dompet'}
                          <span className="font-medium text-content-muted">
                            {' '}
                            · {fmtDate(t.ts)}
                          </span>
                        </p>
                        <p className="shrink-0 text-[13px] font-bold tabular-nums text-content-muted">
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
