/* ============================================================
 * Pengujian otomatis — registry kategori Keuangan (finance/cats.ts)
 * v2.15: impor kategori Rutina 1.0 dari Turso.
 * Menjaga invarian yang dipakai UI tanpa fallback:
 *   - CAT_META[cat] selalu ada untuk semua kategori yang bisa dipilih
 *   - BUDGETABLE_CATS ⊆ kategori keluar
 *   - bawaan 2.0 tidak tertukar posisi dengan impor 1.0
 * Jalankan: bun test
 * ============================================================ */

import { describe, expect, test } from 'bun:test'

import {
  BUDGETABLE_CATS,
  CAT_META,
  CATS_BY_TYPE,
  LEGACY_CATS_BY_TYPE,
  PRIMARY_CATS_BY_TYPE,
} from '../src/components/rutina-mobile/finance/cats'
import type { FinCat, TxType } from '../src/components/rutina-mobile/store'

const ALL = Object.keys(CAT_META) as FinCat[]
const DIRECTIONS: TxType[] = ['keluar', 'masuk', 'transfer']

describe('CAT_META — meta lengkap untuk seluruh kategori', () => {
  test('setiap entri punya label non-kosong dan ikon terdefinisi', () => {
    expect(ALL.length).toBeGreaterThanOrEqual(35)
    for (const c of ALL) {
      expect(CAT_META[c].label.length).toBeGreaterThan(0)
      expect(CAT_META[c].icon).toBeDefined()
    }
  })

  test('tidak ada label ganda antar kategori', () => {
    const labels = ALL.map((c) => CAT_META[c].label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})

describe('CATS_BY_TYPE — susunan bawaan + impor 1.0', () => {
  test('daftar per arang bebas duplikat', () => {
    for (const t of DIRECTIONS) {
      expect(new Set(CATS_BY_TYPE[t]).size).toBe(CATS_BY_TYPE[t].length)
    }
  })

  test('merupakan gabungan bawaan (duluan) + impor 1.0', () => {
    expect(CATS_BY_TYPE.keluar).toEqual([
      ...PRIMARY_CATS_BY_TYPE.keluar,
      ...LEGACY_CATS_BY_TYPE.keluar,
    ])
    expect(CATS_BY_TYPE.masuk).toEqual([
      ...PRIMARY_CATS_BY_TYPE.masuk,
      ...LEGACY_CATS_BY_TYPE.masuk,
    ])
    expect(CATS_BY_TYPE.transfer).toEqual([])
  })

  test('elemen pertama tetap kategori bawaan (default lembar transaksi)', () => {
    expect(PRIMARY_CATS_BY_TYPE.keluar[0]).toBe('makan')
    expect(PRIMARY_CATS_BY_TYPE.masuk[0]).toBe('gaji')
  })

  test('impor 1.0 tidak tumpang tindih dengan bawaan', () => {
    const primary = new Set<FinCat>([
      ...PRIMARY_CATS_BY_TYPE.keluar,
      ...PRIMARY_CATS_BY_TYPE.masuk,
    ])
    const legacy = [
      ...LEGACY_CATS_BY_TYPE.keluar,
      ...LEGACY_CATS_BY_TYPE.masuk,
    ]
    for (const c of legacy) {
      expect(primary.has(c)).toBe(false)
    }
    expect(legacy.length).toBeGreaterThanOrEqual(24)
  })

  test('semua kategori yang bisa dipilih punya meta (tanpa fallback di UI)', () => {
    for (const t of DIRECTIONS) {
      for (const c of CATS_BY_TYPE[t]) {
        expect(CAT_META[c]).toBeDefined()
      }
    }
  })
})

describe('BUDGETABLE_CATS — kategori anggaran', () => {
  test('bebas duplikat', () => {
    expect(new Set(BUDGETABLE_CATS).size).toBe(BUDGETABLE_CATS.length)
  })

  test('hanya berisi kategori pengeluaran (bukan masuk/transfer)', () => {
    const keluar = new Set<FinCat>(CATS_BY_TYPE.keluar)
    const masuk = new Set<FinCat>(CATS_BY_TYPE.masuk)
    for (const c of BUDGETABLE_CATS) {
      expect(keluar.has(c)).toBe(true)
      expect(masuk.has(c) && !keluar.has(c)).toBe(false)
      expect(c).not.toBe('transfer')
    }
  })

  test('memuat subset impor 1.0 yang paling sering dikendalikan', () => {
    const legacyBudgetable = BUDGETABLE_CATS.filter((c) =>
      [...LEGACY_CATS_BY_TYPE.keluar].includes(c),
    )
    // kopi, bensin, parkir, loundry, pecahan tagihan, pulsa
    expect(legacyBudgetable).toEqual(
      expect.arrayContaining(['kopi', 'bensin', 'parkir', 'loundry', 'tagihan-air', 'tagihan-listrik', 'pulsa-data']),
    )
  })
})

describe('kunci impor Rutina 1.0 (Turso) tersedia sebagai FinCat', () => {
  test('slug CAT_MAP import-rutina1 dipetakan ke kategori terdaftar', () => {
    const mustHave: FinCat[] = [
      'kopi',
      'makanan-berat',
      'jajan',
      'cathering',
      'bensin',
      'parkir',
      'pajak-motor',
      'servis-motor',
      'loundry',
      'dating',
      'badminton',
      'tagihan-utilitas',
      'tagihan-air',
      'tagihan-listrik',
      'pulsa-data',
      'skin-care',
      'potong-rambut',
      'hutang',
      'iuran-kas',
      'tak-terduga',
      'pendidikan',
      'lifestyle',
      'investasi',
      'penghasilan',
    ]
    for (const c of mustHave) {
      expect(CAT_META[c]).toBeDefined()
      expect(CATS_BY_TYPE.keluar.includes(c) || CATS_BY_TYPE.masuk.includes(c)).toBe(true)
    }
  })
})
