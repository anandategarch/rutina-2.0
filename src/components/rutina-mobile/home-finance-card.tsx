'use client'

import { useMemo } from 'react'
import * as m from 'motion/react-m'
import {
  ChevronRight,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'

import { motionTokens } from '@/lib/motion/tokens'
import { CAT_META } from './finance/cats'
import { formatIDR, formatIDRShort } from './finance/utils'
import { RutinaCard } from './rutina-card'
import { RutinaSectionHeader } from './rutina-section-header'
import { todayISO, useRutina, type FinCat } from './store'

/**
 * Kartu "Arus Kas Hari Ini" — ringkasan finansial harian di Beranda
 * (audit #11): uang keluar, pemasukan, saldo bersih, top 3 kategori
 * pengeluaran, dan transaksi hari ini yang bisa dibuka ke tab Keuangan.
 * Transfer antar-dompet dikecualikan dari seluruh angka (bukan arus kas).
 */
export function HomeFinanceCard() {
  const txs = useRutina((s) => s.txs)
  const setScreen = useRutina((s) => s.setScreen)

  const today = todayISO()

  const todayTxs = useMemo(
    () => txs.filter((t) => t.ts === today && t.type !== 'transfer'),
    [txs, today],
  )

  const keluar = todayTxs.reduce(
    (a, t) => a + (t.type === 'keluar' ? t.amount : 0),
    0,
  )
  const masuk = todayTxs.reduce(
    (a, t) => a + (t.type === 'masuk' ? t.amount : 0),
    0,
  )
  const net = masuk - keluar

  /* Top 3 kategori pengeluaran hari ini. */
  const topCats = useMemo(() => {
    const byCat = new Map<FinCat, number>()
    for (const t of todayTxs) {
      if (t.type !== 'keluar') continue
      byCat.set(t.cat, (byCat.get(t.cat) ?? 0) + t.amount)
    }
    return [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [todayTxs])

  const visibleTxs = todayTxs.slice(0, 3)
  const empty = todayTxs.length === 0

  return (
    <m.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, ease: motionTokens.easing.standard }}
      aria-label="Arus kas hari ini"
      className="mt-8"
    >
      <RutinaSectionHeader
        title="Arus Kas Hari Ini"
        description="Pemasukan, pengeluaran, dan transaksi hari ini"
      />
      <RutinaCard
        density="comfortable"
        radius="2xl"
        className="mt-4 shadow-soft"
      >
        {empty ? (
          <div className="flex flex-col items-center gap-1.5 py-6 text-center">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-content-secondary"
            >
              <Wallet className="h-5 w-5" strokeWidth={1.9} />
            </span>
            <p className="mt-1 text-body font-semibold text-content-primary">
              Belum ada transaksi hari ini
            </p>
            <p className="max-w-[32ch] text-meta leading-relaxed text-content-muted">
              Catat pemasukan dan pengeluaranmu agar arus kas hari ini
              tergambar di sini.
            </p>
          </div>
        ) : (
          <>
            {/* Tiga metrik harian */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-eyebrow font-semibold uppercase tracking-[0.06em] text-content-muted">
                  <TrendingDown
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 text-content-danger"
                  />
                  <span className="truncate">Keluar</span>
                </p>
                <p className="mt-1 truncate text-body font-bold tabular-nums text-content-danger">
                  {formatIDR(keluar)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-eyebrow font-semibold uppercase tracking-[0.06em] text-content-muted">
                  <TrendingUp
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 text-success"
                  />
                  <span className="truncate">Masuk</span>
                </p>
                <p className="mt-1 truncate text-body font-bold tabular-nums text-success">
                  {formatIDR(masuk)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-eyebrow font-semibold uppercase tracking-[0.06em] text-content-muted">
                  <Scale
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 text-content-secondary"
                  />
                  <span className="truncate">Saldo</span>
                </p>
                <p
                  className={
                    'mt-1 truncate text-body font-bold tabular-nums ' +
                    (net >= 0 ? 'text-content-primary' : 'text-content-danger')
                  }
                >
                  {formatIDR(net)}
                </p>
              </div>
            </div>

            {/* Top 3 kategori pengeluaran */}
            {topCats.length > 0 && (
              <div className="mt-4">
                <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                  Top 3 kategori pengeluaran
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {topCats.map(([cat, amt]) => {
                    const Icon = CAT_META[cat].icon
                    return (
                      <span
                        key={cat}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-secondary px-3 text-eyebrow font-semibold text-content-secondary"
                      >
                        <Icon
                          aria-hidden="true"
                          className="h-3.5 w-3.5 shrink-0 text-content-muted"
                        />
                        <span className="truncate">
                          {CAT_META[cat].label} · {formatIDRShort(amt)}
                        </span>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Transaksi hari ini — maks. 3 baris, sisanya di tab Keuangan */}
            <div className="mt-4">
              <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                Transaksi hari ini
              </p>
              <div className="mt-0.5">
                {visibleTxs.map((t) => {
                  const income = t.type === 'masuk'
                  const Icon = CAT_META[t.cat].icon
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setScreen('keuangan')}
                      aria-label={`${t.note || CAT_META[t.cat].label}, ${income ? 'pemasukan' : 'pengeluaran'} ${formatIDR(t.amount)} — buka tab Keuangan`}
                      className="flex w-full cursor-pointer items-center gap-3 border-b border-border py-2.5 text-left transition-colors last:border-b-0 hover:bg-surface-sunken/60 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                    >
                      <span
                        className={
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ' +
                          (income
                            ? 'bg-pistachio/30 text-success'
                            : 'bg-clay/25 text-content-danger')
                        }
                      >
                        <Icon
                          aria-hidden="true"
                          className="h-4 w-4"
                          strokeWidth={2.1}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block min-w-0 line-clamp-2 break-words leading-snug text-note font-semibold text-content-primary">
                          {t.note || CAT_META[t.cat].label}
                        </span>
                        <span className="mt-0.5 block break-words text-eyebrow font-medium leading-snug text-content-muted">
                          {CAT_META[t.cat].label} ·{' '}
                          {income ? 'Masuk' : 'Keluar'}
                        </span>
                      </span>
                      <span
                        className={
                          'shrink-0 text-note font-bold tabular-nums ' +
                          (income ? 'text-success' : 'text-content-danger')
                        }
                      >
                        {income ? '+' : '−'}
                        {formatIDR(t.amount)}
                      </span>
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => setScreen('keuangan')}
                className="mt-2.5 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border bg-surface-primary text-meta font-bold text-content-secondary transition-all hover:bg-surface-secondary hover:text-content-primary active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Lihat semua di Keuangan
                <ChevronRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                  strokeWidth={2.5}
                />
              </button>
            </div>
          </>
        )}
      </RutinaCard>
    </m.section>
  )
}
