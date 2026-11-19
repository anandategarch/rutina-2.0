/* ============================================================
 * Pengujian otomatis — skema sinkronisasi (sync-schema.ts)
 * Memastikan kontrak wire klien ↔ server: snapshot valid diterima,
 * muatan sampah ditolak, default diterapkan, dan pulang-pergi JSON aman.
 * Jalankan: bun test
 * ============================================================ */

import { describe, expect, test } from 'bun:test'

import {
  syncStateSchema,
  syncPutSchema,
  habitSchema,
  txSchema,
  workoutSchema,
  noteSchema,
  foodEntrySchema,
  bodyLogsSchema,
  completionsSchema,
  MAX_TRACKED_DAYS,
} from '../src/lib/sync-schema'

/* ---- Snapshot valid minimum-lengkap ---- */

function validState() {
  return {
    demoMode: true,
    habits: [
      {
        id: 'h-1',
        title: 'Minum air',
        desc: '',
        cat: 'Kesehatan',
        schedule: [1, 3, 5],
        weeklyTarget: 3,
        reminder: '07:00',
        archived: false,
        createdAt: '2025-01-01',
      },
    ],
    completions: {
      '2025-06-18': { 'h-1': true },
    },
    notes: [
      {
        id: 'n-1',
        title: 'Catatan',
        body: 'Isi',
        date: '18 Jun',
        pinned: false,
        tone: 0,
        folder: 'pribadi',
      },
    ],
    txs: [
      {
        id: 't-1',
        type: 'keluar',
        cat: 'makan',
        amount: 25_000,
        note: 'Sarapan',
        ts: '2025-06-18',
      },
      {
        id: 't-2',
        type: 'transfer',
        cat: 'transfer',
        amount: 100_000,
        note: 'Tarik tunai',
        ts: '2025-06-18',
        walletId: 'w-bank',
        toWalletId: 'w-tunai',
      },
    ],
    goals: [{ id: 'g-1', name: 'Laptop', target: 15_000_000, saved: 2_000_000 }],
    wallets: [
      { id: 'w-tunai', name: 'Tunai', initial: 350_000 },
      { id: 'w-bank', name: 'Rekening Bank', initial: 2_000_000 },
    ],
    budgets: { makan: 750_000 },
    workouts: [
      {
        id: 'wo-1',
        kind: 'beban',
        date: '2025-06-17',
        duration: 45,
        note: '',
        sets: [{ exercise: 'Squat', weight: 100, reps: 5 }],
      },
    ],
    foodEntries: [
      {
        id: 'f-1',
        date: '2025-06-18',
        name: 'Nasi ayam',
        cat: 'Makanan utama',
        unit: 'porsi',
        portion: 1,
        meal: 'makan siang',
        kcal: 520,
        protein: 28,
        carb: 60,
        fat: 14,
      },
    ],
    calorieTarget: 2100,
    bodyLogs: {
      '2025-06-18': { water: 2, weight: 70.5, sleepH: 7.5, energy: 4, soreness: 2, stress: 1 },
    },
    dailyGoal: 6,
    mood: 'Baik',
    bonusClaimed: false,
    quoteSaved: false,
  }
}

describe('snapshot penuh', () => {
  test('state valid diterima & default diterapkan', () => {
    const parsed = syncStateSchema.parse(validState())
    /* Default yang dijamin skema. */
    expect(parsed.habits[0].restDays).toEqual([])
    expect(parsed.habits[0].afterId).toBeNull()
    expect(parsed.habits[0].mini).toBe('')
    expect(parsed.moodLogs).toEqual({})
    expect(parsed.identityText).toBe('')
    expect(parsed.deloadUntil).toBeNull()
    expect(parsed.quoteSavedDate).toBeNull()
    /* Data asli utuh. */
    expect(parsed.txs.length).toBe(2)
    expect(parsed.bodyLogs['2025-06-18'].weight).toBe(70.5)
  })

  test('pulang-pergi JSON: parse(stringify(parse)) tetap valid', () => {
    const once = syncStateSchema.parse(validState())
    const twice = syncStateSchema.parse(JSON.parse(JSON.stringify(once)))
    expect(twice).toEqual(once)
  })

  test('muatan PUT dibungkus { state }', () => {
    expect(syncPutSchema.parse({ state: validState() }).state.habits.length).toBe(1)
    expect(syncPutSchema.safeParse(validState()).success).toBe(false)
  })
})

describe('penolakan muatan tidak valid', () => {
  test('habit tanpa judul / jadwal di luar 0–6 ditolak', () => {
    const h = (validState().habits[0] as Record<string, unknown>)
    expect(habitSchema.safeParse({ ...h, title: '' }).success).toBe(false)
    expect(habitSchema.safeParse({ ...h, schedule: [7] }).success).toBe(false)
    expect(habitSchema.safeParse({ ...h, createdAt: '18-06-2025' }).success).toBe(false)
  })

  test('tx: nominal negatif / tipe asing / tanggal rusak ditolak', () => {
    const t = validState().txs[0]
    expect(txSchema.safeParse({ ...t, amount: -1 }).success).toBe(false)
    expect(txSchema.safeParse({ ...t, type: 'hiburan' }).success).toBe(false)
    expect(txSchema.safeParse({ ...t, ts: '2025/06/18' }).success).toBe(false)
    /* Nominal harus bulat. */
    expect(txSchema.safeParse({ ...t, amount: 25_000.5 }).success).toBe(false)
  })

  test('workout: kind asing / set lebih dari 60 ditolak', () => {
    const w = validState().workouts[0]
    expect(workoutSchema.safeParse({ ...w, kind: 'renang' }).success).toBe(false)
    const manySets = Array.from({ length: 61 }, () => ({ exercise: 'Squat', weight: 10, reps: 1 }))
    expect(workoutSchema.safeParse({ ...w, sets: manySets }).success).toBe(false)
  })

  test('completions: kunci tanggal harus ISO', () => {
    expect(completionsSchema.safeParse({ '18 Juni': { 'h-1': true } }).success).toBe(false)
    expect(completionsSchema.safeParse({ '2025-06-18': { 'h-1': 'yes' } }).success).toBe(false)
  })

  test('bodyLogs: skor 1–5 di luar jangkauan ditolak, air max 50 gelas', () => {
    expect(bodyLogsSchema.safeParse({ '2025-06-18': { water: 2, energy: 6 } }).success).toBe(false)
    expect(bodyLogsSchema.safeParse({ '2025-06-18': { water: 51 } }).success).toBe(false)
    expect(bodyLogsSchema.safeParse({ '2025-06-18': { water: 2, energy: 5 } }).success).toBe(true)
  })

  test('foodEntry: makro nullable boleh kosong', () => {
    const f = validState().foodEntries[0]
    expect(
      foodEntrySchema.safeParse({ ...f, protein: null, carb: null, fat: null }).success,
    ).toBe(true)
    expect(foodEntrySchema.safeParse({ ...f, kcal: -10 }).success).toBe(false)
  })

  test('note: folder & panjang isi dibatasi', () => {
    const n = validState().notes[0]
    expect(noteSchema.safeParse({ ...n, body: 'x'.repeat(20_001) }).success).toBe(false)
    expect(noteSchema.safeParse({ ...n, tone: 3 }).success).toBe(false)
  })
})

describe('batas pertahanan', () => {
  test('MAX_TRACKED_DAYS konsisten dengan guard route (≥ 10 tahun harian)', () => {
    expect(MAX_TRACKED_DAYS).toBeGreaterThanOrEqual(3650)
  })

  test('jumlah item domain dibatasi (txs 10.000, workouts 5.000)', () => {
    const state = validState()
    const manyTxs = Array.from({ length: 10_001 }, (_, i) => ({
      ...state.txs[0],
      id: `t-${i}`,
    }))
    expect(syncStateSchema.safeParse({ ...state, txs: manyTxs }).success).toBe(false)
  })

  /* v2.16 (audit T5-b #3): dua record tanpa batas kini ditolak. */
  test('moodLogs & budgets: jumlah kunci dibatasi', () => {
    const state = validState()
    const day = (n: number) =>
      new Date(Date.UTC(2000, 0, 1 + n)).toISOString().slice(0, 10)
    const manyMoodLogs = Object.fromEntries(
      Array.from({ length: MAX_TRACKED_DAYS + 1 }, (_, i) => [day(i), 'Ceria']),
    )
    expect(
      syncStateSchema.safeParse({ ...state, moodLogs: manyMoodLogs }).success,
    ).toBe(false)

    const manyBudgets = Object.fromEntries(
      Array.from({ length: MAX_TRACKED_DAYS + 1 }, (_, i) => [`cat-${i}`, 100_000]),
    )
    expect(
      syncStateSchema.safeParse({ ...state, budgets: manyBudgets }).success,
    ).toBe(false)
  })
})
