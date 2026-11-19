/* ============================================================
 * Pengujian otomatis — registry kategori Keuangan (finance/cats.ts)
 * v2.15: impor kategori Rutina 1.0 dari Turso.
 * v2.17: SATU SISTEM KATEGORI — bawaan 2.0 + impor 1.0 + buatan
 * menyatu tanpa penanda asal.
 * v2.18: subkategori DIHAPUS — kategori saja cukup (flat).
 * Menjaga invarian yang dipakai UI:
 *   - CAT_META[cat] selalu ada untuk semua kategori yang bisa dipilih
 *   - CATS_BY_TYPE bebas duplikat & elemen pertama = default form
 *   - BUDGETABLE_CATS ⊆ kategori keluar
 *   - catMetaOf aman untuk slug apa pun (bawaan / buatan / asing)
 * Jalankan: bun test
 * ============================================================ */

import { describe, expect, test } from 'bun:test'

import {
  BUDGETABLE_CATS,
  CAT_META,
  CATS_BY_TYPE,
  CATS_UNIFIED_LABELS,
  allCatsOf,
  catMetaOf,
  frequentCats,
} from '../src/components/rutina-mobile/finance/cats'
import type { CustomCat, FinCat, TxType } from '../src/components/rutina-mobile/store'

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

  test('CATS_UNIFIED_LABELS mencerminkan CAT_META (anti-duplikat kategori buatan)', () => {
    expect(Object.keys(CATS_UNIFIED_LABELS).length).toBe(ALL.length)
    for (const c of ALL) {
      expect(CATS_UNIFIED_LABELS[c]).toBe(CAT_META[c].label)
    }
  })
})

describe('CATS_BY_TYPE — SATU daftar terpadu (v2.17)', () => {
  test('daftar per arah bebas duplikat', () => {
    for (const t of DIRECTIONS) {
      expect(new Set(CATS_BY_TYPE[t]).size).toBe(CATS_BY_TYPE[t].length)
    }
  })

  test('elemen pertama tetap kategori bawaan (default lembar transaksi)', () => {
    expect(CATS_BY_TYPE.keluar[0]).toBe('makan')
    expect(CATS_BY_TYPE.masuk[0]).toBe('gaji')
  })

  test('kategori impor Rutina 1.0 menyatu di daftar yang sama (tanpa blok terpisah)', () => {
    /* Impor 1.0 yang paling khas — harus bisa dipilih tanpa penanda asal. */
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
    ]
    for (const c of mustHave) {
      expect(CATS_BY_TYPE.keluar.includes(c)).toBe(true)
    }
    for (const c of ['investasi', 'penghasilan'] as FinCat[]) {
      expect(CATS_BY_TYPE.masuk.includes(c)).toBe(true)
    }
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
    for (const c of BUDGETABLE_CATS) {
      expect(keluar.has(c)).toBe(true)
      expect(c).not.toBe('transfer')
    }
  })
})

describe('catMetaOf — lookup aman untuk slug apa pun (v2.17)', () => {
  test('kategori bawaan → meta CAT_META', () => {
    expect(catMetaOf('makan').label).toBe('Makan & Minum')
    expect(catMetaOf('kopi').label).toBe('Kopi')
  })

  test('kategori buatan → nama pengguna + ikon tag', () => {
    const custom: CustomCat[] = [
      { id: 'fcat-1', name: 'Kebun', type: 'keluar' },
    ]
    expect(catMetaOf('fcat-1', custom).label).toBe('Kebun')
    expect(catMetaOf('fcat-1', custom).icon).toBeDefined()
  })

  test('slug asing → kapitalisasi wajar, tidak melempar', () => {
    const meta = catMetaOf('biaya-admin')
    expect(meta.label).toBe('Biaya Admin')
    expect(meta.icon).toBeDefined()
  })
})

describe('allCatsOf / frequentCats — kategori buatan menyatu (v2.18: flat)', () => {
  const custom: CustomCat[] = [
    { id: 'fcat-1', name: 'Kebun', type: 'keluar' },
    { id: 'fcat-2', name: 'Freelance', type: 'masuk' },
  ]

  test('allCatsOf menggabungkan bawaan + buatan per arus', () => {
    const keluar = allCatsOf('keluar', custom)
    expect(keluar.slice(0, CATS_BY_TYPE.keluar.length)).toEqual(CATS_BY_TYPE.keluar)
    expect(keluar).toContain('fcat-1')
    expect(keluar).not.toContain('fcat-2')
  })

  test('frequentCats mengurutkan dari frekuensi pemakaian nyata', () => {
    const txs = [
      { id: 'a', type: 'keluar', cat: 'kopi', amount: 1, note: '', ts: '2025-06-01' },
      { id: 'b', type: 'keluar', cat: 'kopi', amount: 1, note: '', ts: '2025-06-02' },
      { id: 'c', type: 'keluar', cat: 'makan', amount: 1, note: '', ts: '2025-06-03' },
      { id: 'd', type: 'masuk', cat: 'gaji', amount: 1, note: '', ts: '2025-06-04' },
    ] as const
    const freq = frequentCats([...txs], 'keluar', 2)
    expect(freq[0]).toEqual({ cat: 'kopi', count: 2 })
    expect(freq[1]).toEqual({ cat: 'makan', count: 1 })
    expect(frequentCats([...txs], 'masuk', 5)).toEqual([{ cat: 'gaji', count: 1 }])
  })
})
