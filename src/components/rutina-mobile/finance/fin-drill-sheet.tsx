'use client'

import { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, useDragControls } from 'motion/react'
import * as m from 'motion/react-m'
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Receipt,
  Wallet as WalletIcon,
  X,
} from 'lucide-react'

import { fade, sheetSpring } from '@/lib/motion/transitions'
import { barFill } from '@/lib/motion/transitions'
import { CONTENT_W } from '../layout-widths'
import { useRutina, type Tx } from '../store'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { useFocusTrap } from '../use-focus-trap'
import { useEscapeLayer } from '../overlay-escape'
import { useCatMeta } from './use-cat-meta'
import {
  catMetaOf,
} from './cats'
import {
  currentMonthKey,
  fmtDate,
  formatIDR,
  formatIDRShort,
  monthRange,
  walletBalance,
  walletFlow,
} from './utils'

/**
 * Drill-down keuangan universal (v2.22) — satu lembar untuk membedah
 * KATEGORI (dari donut komposisi / baris anggaran) dan DOMPET (dari kartu
 * dompet): statistik bulan berjalan + daftar transaksi terkait.
 * Reinkarnasi "modal drill universal" Rutina 1.0 dalam desain 2.0.
 */

export function FinDrillSheet() {
  const drill = useRutina((s) => s.finDrill)
  const close = useRutina((s) => s.closeFinDrill)
  const txs = useRutina((s) => s.txs)
  const wallets = useRutina((s) => s.wallets)
  const customCats = useRutina((s) => s.customCats)
  const catRenames = useRutina((s) => s.catRenames)
  const budgets = useRutina((s) => s.budgets)
  const catMeta = useCatMeta()

  const open = drill !== null
  const dragControls = useDragControls()
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap(open, panelRef)

  /* v2.49 (audit): Escape lewat tumpukan lapisan (overlay-escape). */
  useEscapeLayer(open, close)

  /* v2.49 (audit): batang data tidak replay initial scaleX:0 setiap
     lembar dibuka — membuka lembar sudah menjadi interaksinya (pola
     keuangan-wallet-flow / allowance). */
  const playBars = useFirstVisit('fin-drill-bars')

  const isCat = drill?.kind === 'cat'
  const isWallet = drill?.kind === 'wallet'

  const title = isCat
    ? catMetaOf(drill.id, customCats, catRenames).label
    : isWallet
      ? (wallets.find((w) => w.id === drill?.id)?.name ?? 'Dompet')
      : ''

  /* Transaksi terkait bulan berjalan + sepanjang masa. */
  const { monthTxs, allTxs, monthIn, monthOut, monthCount } = useMemo(() => {
    if (!drill) return { monthTxs: [], allTxs: [], monthIn: 0, monthOut: 0, monthCount: 0 }
    const ym = currentMonthKey()
    const r = monthRange(ym)
    let monthIn = 0
    let monthOut = 0
    let monthCount = 0
    if (drill.kind === 'cat') {
      const all = txs.filter((t) => t.cat === drill.id)
      const month = all.filter((t) => t.ts >= r.start && t.ts <= r.end)
      for (const t of month) {
        if (t.type === 'masuk') monthIn += t.amount
        else if (t.type === 'keluar') monthOut += t.amount
        monthCount++
      }
      return {
        monthTxs: month,
        allTxs: all,
        monthIn,
        monthOut,
        monthCount,
      }
    }
    /* Dompet: transaksi yang menyentuh dompet ini dari sisi mana pun. */
    const all = txs.filter(
      (t) => t.walletId === drill.id || t.toWalletId === drill.id,
    )
    const month = all.filter((t) => t.ts >= r.start && t.ts <= r.end)
    for (const t of month) {
      if (t.type === 'transfer') {
        if (t.walletId === drill.id) monthOut += t.amount
        if (t.toWalletId === drill.id) monthIn += t.amount
        monthCount++
      } else if (t.walletId === drill.id) {
        if (t.type === 'masuk') monthIn += t.amount
        else monthOut += t.amount
        monthCount++
      }
    }
    return { monthTxs: month, allTxs: all, monthIn, monthOut, monthCount }
  }, [drill, txs])

  const budget = isCat ? (budgets[drill!.id] ?? null) : null
  const wallet = isWallet ? (wallets.find((w) => w.id === drill?.id) ?? null) : null
  const flow = isWallet && wallet ? walletFlow(txs, wallet.id, currentMonthKey()) : null
  const maxFlow = flow ? Math.max(flow.masuk, flow.keluar, 1) : 1

  const Icon = isCat
    ? catMetaOf(drill!.id, customCats, catRenames).icon
    : WalletIcon

  const renderTx = (t: Tx) => {
    const income = t.type === 'masuk'
    const transfer = t.type === 'transfer'
    const walletFrom = wallets.find((w) => w.id === t.walletId)
    const walletTo = wallets.find((w) => w.id === t.toWalletId)
    return (
      <li
        key={t.id}
        className="flex items-center gap-3 rounded-xl border border-border bg-surface-primary px-3 py-2.5"
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            transfer
              ? 'bg-gold/25 text-warning'
              : income
                ? 'bg-pistachio/30 text-success'
                : 'bg-clay/25 text-content-danger'
          }`}
        >
          {transfer ? (
            <ArrowLeftRight className="h-4 w-4" />
          ) : income ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <ArrowDownRight className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 break-words text-note font-semibold leading-snug text-content-primary">
            {t.note || catMeta(t.cat).label}
          </p>
          <p className="text-eyebrow font-medium text-content-muted">
            {transfer
              ? `${walletFrom?.name ?? 'Dompet'} → ${walletTo?.name ?? 'Dompet'}`
              : `${catMeta(t.cat).label}${t.walletId ? ` · ${wallets.find((w) => w.id === t.walletId)?.name ?? ''}` : ''}`}{' '}
            · {fmtDate(t.ts)}
          </p>
        </div>
        <p
          className={`shrink-0 text-note font-bold tabular-nums ${
            transfer
              ? 'text-content-muted'
              : income
                ? 'text-success'
                : 'text-content-danger'
          }`}
        >
          {transfer ? '' : income ? '+' : '−'}
          {formatIDRShort(t.amount)}
        </p>
      </li>
    )
  }

  return (
    <AnimatePresence>
      {open && drill && (
        <>
          <m.div
            key="backdrop"
            aria-hidden="true"
            onClick={close}
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
            aria-label={`Bedah ${isCat ? 'kategori' : 'dompet'} ${title}`}
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
              <div className="flex min-w-0 items-center gap-3 text-left">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-module-accent/15 text-module-accent-strong">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                    {isCat ? 'Bedah kategori' : 'Bedah dompet'}
                  </p>
                  <h2 className="line-clamp-1 break-words text-lead font-semibold tracking-tight text-content-primary">
                    {title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Tutup"
                className="mt-0.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-content-muted transition-colors hover:bg-surface-secondary hover:text-content-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 pt-4">
              {/* Statistik bulan berjalan */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl bg-surface-sunken px-3 py-2.5">
                  <p className="text-eyebrow font-semibold uppercase tracking-[0.1em] text-content-muted">
                    Masuk
                  </p>
                  <p className="mt-1 truncate text-section font-bold tabular-nums text-success">
                    {monthIn > 0 ? `+${formatIDRShort(monthIn)}` : '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-sunken px-3 py-2.5">
                  <p className="text-eyebrow font-semibold uppercase tracking-[0.1em] text-content-muted">
                    Keluar
                  </p>
                  <p className="mt-1 truncate text-section font-bold tabular-nums text-content-danger">
                    {monthOut > 0 ? `−${formatIDRShort(monthOut)}` : '—'}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-sunken px-3 py-2.5">
                  <p className="text-eyebrow font-semibold uppercase tracking-[0.1em] text-content-muted">
                    {isCat ? 'Anggaran' : 'Saldo'}
                  </p>
                  <p className="mt-1 truncate text-section font-bold tabular-nums text-content-primary">
                    {isCat
                      ? budget
                        ? formatIDRShort(budget)
                        : '—'
                      : wallet
                        ? formatIDRShort(walletBalance(txs, wallet))
                        : '—'}
                  </p>
                </div>
              </div>

              {/* Anggaran: bar pemakaian bulan ini */}
              {isCat && budget && budget > 0 && (
                <div className="mt-3 rounded-2xl bg-surface-sunken px-3.5 py-3">
                  <div className="flex items-baseline justify-between text-eyebrow font-semibold text-content-muted">
                    <span>
                      Terpakai {Math.round((monthOut / budget) * 100)}% bulan ini
                    </span>
                    <span className="tabular-nums">
                      {formatIDRShort(monthOut)} / {formatIDRShort(budget)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                    <m.div
                      initial={playBars ? { scaleX: 0 } : false}
                      animate={{
                        scaleX: Math.min(1, monthOut / budget),
                      }}
                      transition={barFill}
                      className={`h-full origin-left rounded-full ${
                        monthOut > budget
                          ? 'bg-destructive'
                          : monthOut > budget * 0.8
                            ? 'bg-warning'
                            : 'bg-primary'
                      }`}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}

              {/* Dompet: bar proporsi arus bulan ini */}
              {flow && (
                <div className="mt-3 rounded-2xl bg-surface-sunken px-3.5 py-3">
                  <p className="text-eyebrow font-semibold uppercase tracking-[0.1em] text-content-muted">
                    Arus {fmtDate(monthRange(currentMonthKey()).start)} — hari ini
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="w-12 shrink-0 text-eyebrow font-semibold text-success">
                      {formatIDRShort(flow.masuk)}
                    </span>
                    <div className="flex h-2.5 min-w-0 flex-1 gap-1 overflow-hidden rounded-full bg-border">
                      <m.div
                        initial={playBars ? { scaleX: 0 } : false}
                        animate={{ scaleX: flow.masuk / maxFlow }}
                        transition={barFill}
                        className="h-full origin-left rounded-l-full bg-pistachio"
                        style={{ width: '50%' }}
                      />
                      <m.div
                        initial={playBars ? { scaleX: 0 } : false}
                        animate={{ scaleX: flow.keluar / maxFlow }}
                        transition={barFill}
                        className="h-full origin-left rounded-r-full bg-clay"
                        style={{ width: '50%' }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right text-eyebrow font-semibold text-content-danger">
                      {formatIDRShort(flow.keluar)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-eyebrow font-medium text-content-muted">
                    Net bulan ini{' '}
                    <span
                      className={
                        flow.net >= 0 ? 'text-success' : 'text-content-danger'
                      }
                    >
                      {flow.net >= 0 ? '+' : '−'}
                      {formatIDRShort(Math.abs(flow.net))}
                    </span>{' '}
                    · {flow.count} mutasi
                  </p>
                </div>
              )}

              {/* Daftar transaksi bulan berjalan */}
              <section aria-label="Transaksi bulan ini" className="mt-4 pb-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-meta font-bold uppercase tracking-[0.08em] text-content-muted">
                    Transaksi bulan ini
                  </p>
                  <p className="text-eyebrow font-semibold tabular-nums text-content-muted">
                    {monthCount}
                  </p>
                </div>
                {monthTxs.length === 0 ? (
                  <div className="mt-2 rounded-2xl border-2 border-dashed border-border px-6 py-8 text-center">
                    <Receipt className="mx-auto h-5 w-5 text-content-muted" />
                    <p className="mt-2 text-note font-semibold text-content-muted">
                      Belum ada transaksi bulan ini
                    </p>
                  </div>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {monthTxs
                      .slice()
                      .sort((a, b) => (a.ts === b.ts ? b.id.localeCompare(a.id) : a.ts < b.ts ? 1 : -1))
                      .slice(0, 30)
                      .map(renderTx)}
                    {monthTxs.length > 30 && (
                      <li className="py-1 text-center text-eyebrow font-medium text-content-muted">
                        +{monthTxs.length - 30} transaksi lagi bulan ini
                      </li>
                    )}
                  </ul>
                )}
                {allTxs.length > monthTxs.length && (
                  <p className="mt-2 text-eyebrow font-medium text-content-muted">
                    Total sepanjang masa: {allTxs.length} transaksi · terakhir{' '}
                    {allTxs.length > 0
                      ? fmtDate(
                          allTxs.reduce((latest, t) => (t.ts > latest ? t.ts : latest), allTxs[0]!.ts),
                        )
                      : '—'}
                  </p>
                )}
              </section>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
