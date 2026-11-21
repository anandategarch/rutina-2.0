'use client'

import { useMemo } from 'react'
import * as m from 'motion/react-m'
import {
  ChevronRight,
  Gauge,
  Scale,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from 'lucide-react'

import { motionTokens } from '@/lib/motion/tokens'
import { barFill } from '@/lib/motion/transitions'
import { useFirstVisit } from '@/lib/motion/first-visit'
import { useCatMeta } from './finance/use-cat-meta'
import {
  allowanceInfo,
  formatIDR,
  formatIDRShort,
  monthSpendByCat,
  spendByDay,
} from './finance/utils'
import { BUDGET_WARN_PCT } from './daily-highlight'
import { RutinaCard } from './rutina-card'
import { RutinaSectionHeader } from './rutina-section-header'
import { addDaysISO, fromISO, todayISO, useRutina, WEEKDAY_MIN } from './store'

/**
 * Kartu "Arus Kas Hari Ini" — ringkasan finansial harian di Beranda
 * (audit #11): uang keluar, pemasukan, saldo bersih, top 3 kategori
 * pengeluaran, dan transaksi hari ini yang bisa dibuka ke tab Keuangan.
 * Transfer antar-dompet dikecualikan dari seluruh angka (bukan arus kas).
 */
export function HomeFinanceCard() {
  const catMeta = useCatMeta()
  const txs = useRutina((s) => s.txs)
  const budgets = useRutina((s) => s.budgets)
  const setScreen = useRutina((s) => s.setScreen)
  const setUiPref = useRutina((s) => s.setUiPref)

  /* v2.27 audit motion: gerbang anti-replay entrance. */
  const playEntrance = useFirstVisit('home-finance')

  const today = todayISO()

  /* Jatah aman hari ini (v2.22) — sisa anggaran ÷ hari tersisa. */
  const allowance = useMemo(
    () => allowanceInfo(budgets, txs, today),
    [budgets, txs, today],
  )

  const todayTxs = useMemo(
    () => txs.filter((t) => t.ts === today && t.type !== 'transfer'),
    [txs, today],
  )

  /* SATU peringatan anggaran (Task 1 E): kategori terboros bulan
     berjalan — rasio terpakai/batas tertinggi, hanya muncul bila
     melewati ambang waspada (ambang yang sama dengan Sorotan
     budget-warning). Strip informatif memindahkan pengguna ke tab
     anggaran; tampil di kedua cabang kartu (empty-state maupun
     normal) karena pemakaian anggaran adalah persoalan bulanan,
     bukan harian. Sisa negatif (lewat batas) tampil apa adanya. */
  const budgetAlert = useMemo(() => {
    const spend = monthSpendByCat(txs, today.slice(0, 7))
    let worst: { cat: string; spent: number; limit: number; pct: number } | null =
      null
    for (const [cat, limit] of Object.entries(budgets)) {
      if (!(limit > 0)) continue
      const spent = spend[cat] ?? 0
      const pct = spent / limit
      if (pct >= BUDGET_WARN_PCT && (!worst || pct > worst.pct)) {
        worst = { cat, spent, limit, pct }
      }
    }
    return worst
  }, [txs, budgets, today])

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
    const byCat = new Map<string, number>()
    for (const t of todayTxs) {
      if (t.type !== 'keluar') continue
      byCat.set(t.cat, (byCat.get(t.cat) ?? 0) + t.amount)
    }
    return [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [todayTxs])

  const visibleTxs = todayTxs.slice(0, 3)
  const empty = todayTxs.length === 0

  /* v2.39 (audit visual data): pengeluaran harian 7 hari terakhir —
     trio angka keluar/masuk/saldo kini punya konteks mingguan; hari ini
     disorot, rata-rata kalender di kepala strip. */
  const weekSpend = useMemo(() => {
    const byDay = spendByDay(txs)
    const days: { iso: string; label: string; total: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const iso = addDaysISO(today, -i)
      days.push({
        iso,
        label: WEEKDAY_MIN[fromISO(iso).getDay()],
        total: byDay[iso]?.total ?? 0,
      })
    }
    return days
  }, [txs, today])
  const weekMax = weekSpend.reduce((a, d) => Math.max(a, d.total), 0)
  const weekAvg = Math.round(
    weekSpend.reduce((a, d) => a + d.total, 0) / weekSpend.length,
  )

  return (
    <m.section
      initial={playEntrance ? { opacity: 0, y: 18 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={motionTokens.preset.pageEntrance}
      aria-label="Arus kas hari ini"
      className="mt-8"
    >
      <RutinaSectionHeader
        title="Arus Kas Hari Ini"
        description="Pemasukan, pengeluaran, dan transaksi hari ini"
      />
      <RutinaCard
        density="comfortable"
        radius="xl"
        /* v2.27 Daybook: permukaan bertint domain finance (antique
           bronze) — band bawah Beranda kini bertingkat: flat insight,
           dashed bonus, tint jurnal, garden rekap, tint finance —
           bukan lagi deretan kartu parchment seragam. */
        className="mt-4 border-module-finance/35 bg-module-finance-soft/65 shadow-soft"
      >
        {/* Strip peringatan anggaran terburuk bulan ini — elemen PERTAMA
            di dalam kartu, tampil baik pada empty-state maupun isi. */}
        {budgetAlert && (
          <button
            type="button"
            onClick={() => {
              setScreen('keuangan')
              setUiPref({ finTab: 'anggaran' })
            }}
            aria-label={`Peringatan anggaran: ${catMeta(budgetAlert.cat).label} terpakai ${Math.round(
              budgetAlert.pct * 100,
            )} persen dari batas ${formatIDRShort(budgetAlert.limit)}, ${
              budgetAlert.spent > budgetAlert.limit
                ? `lewat batas ${formatIDRShort(budgetAlert.spent - budgetAlert.limit)}`
                : `sisa ${formatIDRShort(budgetAlert.limit - budgetAlert.spent)}`
            } — buka tab anggaran di Keuangan`}
            className={
              'mb-4 flex w-full cursor-pointer items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ' +
              (budgetAlert.pct >= 1
                ? 'border-clay/40 bg-clay/15 hover:bg-clay/20'
                : 'border-gold/45 bg-gold/15 hover:bg-gold/20')
            }
          >
            <TriangleAlert
              aria-hidden="true"
              className={
                'mt-0.5 h-4 w-4 shrink-0 ' +
                (budgetAlert.pct >= 1 ? 'text-content-danger' : 'text-warning')
              }
              strokeWidth={2.2}
            />
            <span className="min-w-0 text-note font-semibold text-content-primary">
              Anggaran {catMeta(budgetAlert.cat).label} terpakai{' '}
              {Math.round(budgetAlert.pct * 100)}%
              <span className="text-meta font-medium text-content-muted">
                {' '}
                {budgetAlert.spent > budgetAlert.limit
                  ? `— lewat batas ${formatIDRShort(budgetAlert.spent - budgetAlert.limit)}`
                  : `— sisa ${formatIDRShort(budgetAlert.limit - budgetAlert.spent)}`}
              </span>
            </span>
          </button>
        )}
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
            {/* Jatah hari ini tetap tampil walau belum belanja (v2.22) */}
            {allowance && (
              <button
                type="button"
                onClick={() => setScreen('keuangan')}
                className="mt-3 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-secondary px-4 text-meta font-bold text-success transition-colors hover:bg-secondary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Gauge aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.4} />
                Jatah hari ini ±{formatIDRShort(allowance.daily)}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Tiga metrik harian */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-meta font-semibold text-content-muted">
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
                <p className="flex items-center gap-1 text-meta font-semibold text-content-muted">
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
                <p className="flex items-center gap-1 text-meta font-semibold text-content-muted">
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

            {/* Strip pengeluaran 7 hari (v2.39) — konteks mingguan bagi
                tiga metrik harian: tinggi bar = proporsi vs hari terboros,
                bar hari ini disorot. Nilai persis tinggal di tab Keuangan. */}
            {weekMax > 0 && (
              <div className="mt-4">
                <div className="flex items-baseline justify-between gap-2 text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                  <span>Pengeluaran 7 hari</span>
                  <span className="normal-case tracking-normal tabular-nums">
                    Rata² {formatIDRShort(weekAvg)}/hari
                  </span>
                </div>
                <div className="mt-2 flex h-12 gap-1" aria-hidden="true">
                  {weekSpend.map((d) => {
                    const isToday = d.iso === today
                    const h =
                      d.total <= 0
                        ? 4
                        : Math.max(10, Math.round((d.total / weekMax) * 100))
                    return (
                      <span
                        key={d.iso}
                        className="flex h-full min-w-0 flex-1 flex-col gap-1"
                      >
                        {/* v2.47 (coin-ledger): tekstur tumpukan koin — dua
                            garis rambut TETAP (33%/66%, bukan hitungan
                            nilai) pada batang berisi; hari ini mendapat
                            tutup koin emas di puncak. Nol tetap stub 4px
                            polos. */}
                        <span className="relative flex w-full flex-1 items-end">
                          <m.span
                            className={
                              'relative w-full origin-bottom overflow-hidden rounded-full ' +
                              (d.total <= 0
                                ? 'bg-primary/15'
                                : isToday
                                  ? 'bg-primary'
                                  : 'bg-primary/35')
                            }
                            style={{ height: `${h}%` }}
                            initial={playEntrance ? { scaleY: 0 } : false}
                            animate={{ scaleY: 1 }}
                            transition={barFill}
                          >
                            {d.total > 0 && (
                              <>
                                <span className="absolute inset-x-0 top-[33%] h-px bg-surface-primary/50" />
                                <span className="absolute inset-x-0 top-[66%] h-px bg-surface-primary/50" />
                              </>
                            )}
                          </m.span>
                          {isToday && d.total > 0 && (
                            <m.span
                              className="absolute left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-gold"
                              style={{ bottom: `calc(${h}% + 3px)` }}
                              initial={
                                playEntrance ? { opacity: 0, y: -3 } : false
                              }
                              animate={{ opacity: 1, y: 0 }}
                              transition={barFill}
                            />
                          )}
                        </span>
                        <span
                          className={
                            'text-center text-chart-label font-semibold ' +
                            (isToday
                              ? 'text-content-secondary'
                              : 'text-content-muted')
                          }
                        >
                          {d.label}
                        </span>
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Jatah aman hari ini (v2.22) — strip di bawah metrik;
                v2.39: bar laju mini (terpakai vs posisi ideal bulan)
                menyertai vonis proyeksi, angka lengkap di tab Keuangan. */}
            {allowance && (
              <button
                type="button"
                onClick={() => setScreen('keuangan')}
                aria-label={`Jatah aman hari ini sekitar ${formatIDR(allowance.daily)}, laju belanja ${allowance.pacePct} persen dari anggaran — buka tab Keuangan`}
                className="mt-4 flex w-full cursor-pointer flex-col rounded-xl bg-surface-sunken px-3.5 py-2.5 text-left transition-colors hover:bg-surface-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <Gauge
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-module-accent-strong"
                      strokeWidth={2.2}
                    />
                    <span className="min-w-0 truncate text-note font-semibold text-content-primary">
                      Jatah hari ini ±{formatIDRShort(allowance.daily)}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-eyebrow font-bold ${
                      allowance.verdict === 'aman'
                        ? 'bg-secondary text-success'
                        : allowance.verdict === 'waspada'
                          ? 'bg-gold/25 text-warning'
                          : 'bg-clay/25 text-content-danger'
                    }`}
                  >
                    {allowance.verdict === 'aman'
                      ? 'proyeksi aman'
                      : allowance.verdict === 'waspada'
                        ? 'proyeksi waspada'
                        : 'proyeksi lewat batas'}
                  </span>
                </span>
                {/* Bar laju — terpakai (skala) + penanda posisi ideal */}
                <span
                  aria-hidden="true"
                  className="relative mt-2.5 block h-1.5 overflow-visible rounded-full bg-surface-primary"
                >
                  <span className="block h-full overflow-hidden rounded-full">
                    <m.span
                      className={
                        'block h-full w-full origin-left rounded-full ' +
                        (allowance.verdict === 'aman'
                          ? 'bg-primary'
                          : allowance.verdict === 'waspada'
                            ? 'bg-warning'
                            : 'bg-destructive')
                      }
                      initial={playEntrance ? { scaleX: 0 } : false}
                      animate={{
                        scaleX: Math.min(allowance.pacePct, 100) / 100,
                      }}
                      transition={barFill}
                    />
                  </span>
                  <span
                    className="absolute -bottom-[3px] -top-[3px] w-0.5 rounded-full bg-espresso/70"
                    style={{
                      left: `${Math.min(100, allowance.idealPct)}%`,
                    }}
                  />
                </span>
              </button>
            )}

            {/* Top 3 kategori pengeluaran */}
            {topCats.length > 0 && (
              <div className="mt-4">
                <p className="text-eyebrow font-semibold uppercase tracking-[0.14em] text-content-muted">
                  Top 3 kategori pengeluaran
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {topCats.map(([cat, amt]) => {
                    const Icon = catMeta(cat).icon
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
                          {catMeta(cat).label} · {formatIDRShort(amt)}
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
                  const Icon = catMeta(t.cat).icon
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setScreen('keuangan')}
                      aria-label={`${t.note || catMeta(t.cat).label}, ${income ? 'pemasukan' : 'pengeluaran'} ${formatIDR(t.amount)} — buka tab Keuangan`}
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
                          {t.note || catMeta(t.cat).label}
                        </span>
                        <span className="mt-0.5 block break-words text-eyebrow font-medium leading-snug text-content-muted">
                          {catMeta(t.cat).label} ·{' '}
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
