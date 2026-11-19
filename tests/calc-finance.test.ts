/* ============================================================
 * Pengujian otomatis — perhitungan Keuangan (finance/utils.ts)
 * Semua kasus tanggal-relatif dihitung dinamis dari hari berjalan
 * sehingga suite tetap hijau kapan pun dijalankan.
 * Jalankan: bun test
 * ============================================================ */

import { describe, expect, test } from 'bun:test'

import {
  formatIDR,
  formatIDRShort,
  monthRange,
  monthLabel,
  shiftMonthKey,
  monthFlow,
  monthSpend,
  monthSpendByCat,
  spendByDay,
  groupByDay,
  walletBalance,
  totalSaldo,
  filterByPeriod,
  buildSeries,
  defaultActive,
  yearWindow,
  fmtDate,
} from '../src/components/rutina-mobile/finance/utils'
import { addDaysISO, todayISO, type Tx, type Wallet } from '../src/components/rutina-mobile/store'

/* ---- Fixture builder ---- */

function tx(partial: Partial<Tx> & Pick<Tx, 'type' | 'amount' | 'ts'>): Tx {
  return {
    id: partial.id ?? `tx-${Math.random().toString(36).slice(2, 8)}`,
    cat: partial.cat ?? 'makan',
    note: partial.note ?? '',
    ...partial,
  } as Tx
}

describe('formatIDR / formatIDRShort', () => {
  test('formatIDR memakai pemisah ribuan id-ID', () => {
    expect(formatIDR(8_500_000)).toBe('Rp8.500.000')
    expect(formatIDR(0)).toBe('Rp0')
    expect(formatIDR(1_234)).toBe('Rp1.234')
  })

  test('formatIDRShort meringkat juta & ribu', () => {
    expect(formatIDRShort(8_500_000)).toBe('8,5 jt')
    expect(formatIDRShort(1_000_000)).toBe('1 jt')
    expect(formatIDRShort(250_000)).toBe('250 rb')
    expect(formatIDRShort(999)).toBe('999')
  })

  test('fmtDate "2025-06-18" -> "18 Jun"', () => {
    expect(fmtDate('2025-06-18')).toBe('18 Jun')
    expect(fmtDate('2025-01-01')).toBe('1 Jan')
  })
})

describe('alat bulanan', () => {
  test('monthRange: tanggal 1 s.d. akhir bulan (termasuk tahun kabisat)', () => {
    expect(monthRange('2025-02')).toEqual({ start: '2025-02-01', end: '2025-02-28' })
    expect(monthRange('2024-02')).toEqual({ start: '2024-02-01', end: '2024-02-29' })
    expect(monthRange('2025-04')).toEqual({ start: '2025-04-01', end: '2025-04-30' })
  })

  test('monthLabel menghasilkan nama bulan Indonesia', () => {
    expect(monthLabel('2025-06')).toBe('Juni 2025')
    expect(monthLabel('2025-01')).toBe('Januari 2025')
  })

  test('shiftMonthKey bergeser lintas tahun & menormalkan', () => {
    expect(shiftMonthKey('2025-01', -1)).toBe('2024-12')
    expect(shiftMonthKey('2025-12', 1)).toBe('2026-01')
    expect(shiftMonthKey('2025-03', 0)).toBe('2025-03')
  })
})

describe('monthFlow / monthSpend / monthSpendByCat', () => {
  const feb = '2025-02'
  const txs: Tx[] = [
    tx({ type: 'masuk', amount: 5_000_000, ts: '2025-02-10', cat: 'gaji' }),
    tx({ type: 'keluar', amount: 1_500_000, ts: '2025-02-15', cat: 'makan' }),
    tx({ type: 'keluar', amount: 500_000, ts: '2025-02-20', cat: 'transport' }),
    /* Transfer antar-dompet bukan arus kas — harus dikecualikan. */
    tx({ type: 'transfer', amount: 2_000_000, ts: '2025-02-20' }),
    /* Di luar bulan Februari. */
    tx({ type: 'keluar', amount: 9_999_999, ts: '2025-03-01' }),
    tx({ type: 'masuk', amount: 9_999_999, ts: '2025-01-31', cat: 'gaji' }),
  ]

  test('monthFlow menjumlahkan masuk/keluar & mengecualikan transfer', () => {
    expect(monthFlow(txs, feb)).toEqual({ masuk: 5_000_000, keluar: 2_000_000 })
  })

  test('monthSpend hanya mengembalikan sisi keluar', () => {
    expect(monthSpend(txs, feb)).toBe(2_000_000)
    expect(monthSpend(txs, '2025-03')).toBe(9_999_999)
  })

  test('monthSpendByCat mengelompokkan per kategori', () => {
    expect(monthSpendByCat(txs, feb)).toEqual({ makan: 1_500_000, transport: 500_000 })
  })
})

describe('spendByDay & groupByDay', () => {
  const txs: Tx[] = [
    tx({ type: 'keluar', amount: 25_000, ts: '2025-06-20' }),
    tx({ type: 'keluar', amount: 15_000, ts: '2025-06-20' }),
    tx({ type: 'masuk', amount: 1_000_000, ts: '2025-06-20' }),
    tx({ type: 'keluar', amount: 40_000, ts: '2025-06-18' }),
  ]

  test('spendByDay merekap total & jumlah transaksi keluar per tanggal', () => {
    const map = spendByDay(txs)
    expect(map['2025-06-20']).toEqual({ total: 40_000, count: 2 })
    expect(map['2025-06-18']).toEqual({ total: 40_000, count: 1 })
  })

  test('groupByDay mengurutkan terbaru-dulu dengan ringkasan harian', () => {
    const groups = groupByDay(txs)
    expect(groups.map((g) => g.date)).toEqual(['2025-06-20', '2025-06-18'])
    expect(groups[0]).toMatchObject({ masuk: 1_000_000, keluar: 40_000 })
    expect(groups[0].txs.length).toBe(3)
  })
})

describe('dompet & saldo', () => {
  const wallets: Wallet[] = [
    { id: 'w1', name: 'Tunai', initial: 100_000 },
    { id: 'w2', name: 'Bank', initial: 500_000 },
  ]
  const txs: Tx[] = [
    tx({ type: 'masuk', amount: 50_000, ts: '2025-06-01', walletId: 'w1' }),
    tx({ type: 'keluar', amount: 30_000, ts: '2025-06-02', walletId: 'w1' }),
    tx({ type: 'transfer', amount: 20_000, ts: '2025-06-03', walletId: 'w1', toWalletId: 'w2' }),
    /* Tanpa dompet — arus lama, dihitung sekali secara global. */
    tx({ type: 'masuk', amount: 10_000, ts: '2025-06-04' }),
    tx({ type: 'keluar', amount: 5_000, ts: '2025-06-04' }),
  ]

  test('walletBalance: awal + mutasi, transfer mengurangi sumber & menambah tujuan', () => {
    expect(walletBalance(txs, wallets[0])).toBe(100_000) // 100k + 50k - 30k - 20k
    expect(walletBalance(txs, wallets[1])).toBe(520_000) // 500k + 20k
  })

  test('totalSaldo menjumlahkan dompet + arus tanpa dompet (transfer netral)', () => {
    expect(totalSaldo(txs, wallets)).toBe(625_000) // 100k + 520k + 10k - 5k
  })
})

/* ---- Deret grafik & periode (relatif hari berjalan) ---- */

describe('buildSeries & filterByPeriod (relatif hari ini)', () => {
  const today = todayISO()

  test('periode minggu: deret Sen..Min, transaksi hari ini masuk kolom hari ini', () => {
    const txs = [
      tx({ type: 'masuk', amount: 100_000, ts: today }),
      tx({ type: 'keluar', amount: 25_000, ts: addDaysISO(today, -1) }),
      /* Jauh di luar pekan. */
      tx({ type: 'keluar', amount: 99_999, ts: addDaysISO(today, -10) }),
    ]
    const pts = buildSeries(txs, 'minggu')
    expect(pts.length).toBe(7)
    expect(pts.every((p) => p.masuk + p.keluar >= 0)).toBe(true)
    const totalMasuk = pts.reduce((a, p) => a + p.masuk, 0)
    const totalKeluar = pts.reduce((a, p) => a + p.keluar, 0)
    expect(totalMasuk).toBe(100_000)
    expect(totalKeluar).toBe(25_000)
    /* Kolom hari ini berisi pemasukan hari ini. */
    const idx = defaultActive('minggu')
    expect(pts[idx].masuk).toBe(100_000)
  })

  test('filterByPeriod minggu memuat transaksi pekan berjalan saja', () => {
    const txs = [
      tx({ type: 'masuk', amount: 1_000, ts: today }),
      tx({ type: 'keluar', amount: 999_999, ts: addDaysISO(today, -10) }),
    ]
    const week = filterByPeriod(txs, 'minggu')
    expect(week.length).toBe(1)
    expect(week[0].ts).toBe(today)
  })

  test('transfer tidak pernah masuk deret grafik', () => {
    const txs = [
      tx({ type: 'transfer', amount: 500_000, ts: today, walletId: 'w1', toWalletId: 'w2' }),
    ]
    const pts = buildSeries(txs, 'minggu')
    expect(pts.reduce((a, p) => a + p.masuk + p.keluar, 0)).toBe(0)
  })
})

describe('yearWindow & defaultActive (tahun)', () => {
  const today = todayISO()
  const year = Number(today.slice(0, 4))
  const thisMonth = Number(today.slice(5, 7))

  test('yearWindow dimulai dari bulan bertransaksi terawal tahun ini', () => {
    const txs = [
      tx({ type: 'keluar', amount: 1, ts: `${year}-0${Math.min(thisMonth, 2)}-15` }),
    ]
    const w = yearWindow(txs)
    expect(w.year).toBe(year)
    expect(w.now).toBe(thisMonth - 1)
    expect(w.first).toBeLessThanOrEqual(w.now)
    /* Tanpa transaksi tahun ini → minimal bulan berjalan. */
    expect(yearWindow([]).first).toBe(thisMonth - 1)
  })

  test('defaultActive tahun = bulan berjalan − bulan terawal', () => {
    const w = yearWindow([])
    expect(defaultActive('tahun', [])).toBe(w.now - w.first)
  })
})
