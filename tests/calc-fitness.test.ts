/* ============================================================
 * Pengujian otomatis — perhitungan Bugar (fitness/fit-utils.ts)
 * Fungsi murni (tanpa React/efek samping) — aman untuk unit test.
 * Jalankan: bun test
 * ============================================================ */

import { describe, expect, test } from 'bun:test'

import {
  e1rmOf,
  tonaseOf,
  bestE1rmIn,
  paceOf,
  exStatOf,
  prBoard,
  weekSummary,
  cardioSummary,
  latestWeight,
  weightSeries,
  kcalOf,
  readinessOf,
  round2_5,
  doubleProgression,
  detectPlateau,
  deloadActive,
  deloadSets,
  cardioGuard,
  plateLoader,
  rmTable,
  warmupLadder,
} from '../src/components/rutina-mobile/fitness/fit-utils'
import { todayISO, addDaysISO, type BodyLogs, type Workout, type WorkoutSet } from '../src/components/rutina-mobile/store'

/* ---- Fixture builder ---- */

function set(exercise: string, weight: number, reps: number): WorkoutSet {
  return { exercise, weight, reps }
}

function beban(date: string, sets: WorkoutSet[], duration = 45): Workout {
  return { id: `w-${date}-${Math.random().toString(36).slice(2, 6)}`, kind: 'beban', date, duration, note: '', sets }
}

function cardio(date: string, kind: 'jalan' | 'lari', distance: number, duration: number): Workout {
  return { id: `c-${date}-${Math.random().toString(36).slice(2, 6)}`, kind, date, duration, note: '', sets: [], distance }
}

describe('e1RM (Epley)', () => {
  test('beban × (1 + reps/30)', () => {
    expect(e1rmOf(100, 0)).toBe(100)
    expect(e1rmOf(100, 30)).toBe(200)
    expect(e1rmOf(60, 5)).toBeCloseTo(70, 10)
  })

  test('bestE1rmIn mengambil set terbaik dalam sesi', () => {
    const w = beban('2025-06-01', [set('Bench', 100, 5), set('Bench', 80, 10)])
    expect(bestE1rmIn(w)).toBeCloseTo(Math.max(100 * (1 + 5 / 30), 80 * (1 + 10 / 30)), 10)
  })
})

describe('tonase & statistik sesi', () => {
  test('tonaseOf = Σ beban × repetisi (khusus kind beban)', () => {
    const w = beban('2025-06-01', [set('Squat', 100, 5), set('Squat', 80, 8)])
    expect(tonaseOf(w)).toBe(100 * 5 + 80 * 8)
    /* Kardio tidak punya tonase beban. */
    expect(tonaseOf(cardio('2025-06-01', 'jalan', 3, 30))).toBe(0)
  })

  test('paceOf menit-per-km, null bila data kurang', () => {
    expect(paceOf(30, 5)).toBe(`6'00"`)
    expect(paceOf(31, 5)).toBe(`6'12"`)
    expect(paceOf(0, 5)).toBeNull()
    expect(paceOf(30, 0)).toBeNull()
  })
})

describe('rekap lintas sesi', () => {
  const workouts = [
    beban('2025-06-02', [set('Bench', 80, 8), set('Row', 60, 10)]),
    beban('2025-06-05', [set('Bench', 85, 6)]),
    cardio('2025-06-07', 'jalan', 3.5, 40),
  ]

  test('exStatOf menghitung sesi, PR, dan set terakhir per gerakan', () => {
    const stat = exStatOf(workouts, 'Bench')
    expect(stat.sessions).toBe(2)
    expect(stat.best).toBeCloseTo(85 * (1 + 6 / 30), 10)
    expect(stat.lastWeight).toBe(85)
    expect(stat.lastReps).toBe(6)
  })

  test('prBoard mengurutkan gerakan berdasar e1RM tertinggi', () => {
    const board = prBoard(workouts)
    const bench = board.find((r) => r.name === 'Bench')
    const row = board.find((r) => r.name === 'Row')
    expect(bench).toBeDefined()
    expect(bench!.sessions).toBe(2)
    expect(row).toBeDefined()
    expect(board[0].best).toBeGreaterThanOrEqual(board[board.length - 1].best)
  })

  test('cardioSummary merekap sesi & jarak kardio', () => {
    const sum = cardioSummary([...workouts, cardio('2025-06-08', 'lari', 7.2, 45)])
    expect(sum.sessions).toBe(2)
    expect(sum.km).toBeCloseTo(10.7, 10)
    expect(sum.farthest).toBeCloseTo(7.2, 10)
  })
})

describe('weekSummary (relatif hari ini)', () => {
  const today = todayISO()

  test('hanya sesi pekan berjalan (Sen–Min) yang dihitung', () => {
    const workouts = [
      beban(today, [set('Squat', 100, 5)], 50),
      beban(addDaysISO(today, -1), [set('Squat', 90, 5)], 40),
      /* Di luar pekan (≥ 7 hari lalu relatif Senin). */
      beban(addDaysISO(today, -9), [set('Squat', 140, 5)], 60),
    ]
    const sum = weekSummary(workouts)
    expect(sum.sessions).toBe(2)
    expect(sum.minutes).toBe(90)
    expect(sum.tonase).toBe(100 * 5 + 90 * 5)
  })
})

describe('tubuh & energi', () => {
  test('latestWeight mengambil berat tercatat terbaru', () => {
    const logs: BodyLogs = {
      '2025-06-01': { water: 2, weight: 70 },
      '2025-06-03': { water: 2 }, /* tanpa berat */
      '2025-06-05': { water: 2, weight: 71.5 },
    }
    expect(latestWeight(logs)).toBe(71.5)
    expect(latestWeight({ '2025-06-01': { water: 2 } })).toBeNull()
  })

  test('weightSeries menyaring & mengurutkan tanggal naik', () => {
    const logs: BodyLogs = {
      '2025-06-05': { water: 2, weight: 71.5 },
      '2025-06-01': { water: 2, weight: 70 },
      '2025-06-03': { water: 2 },
    }
    expect(weightSeries(logs)).toEqual([
      { date: '2025-06-01', kg: 70 },
      { date: '2025-06-05', kg: 71.5 },
    ])
  })

  test('kcalOf = MET × berat × jam (fallback 60 kg)', () => {
    expect(kcalOf(beban('2025-06-01', [], 60), 70)).toBe(5 * 70 * 1)
    expect(kcalOf(cardio('2025-06-01', 'lari', 5, 30), null)).toBe(Math.round(8.3 * 60 * 0.5))
  })
})

describe('readinessOf', () => {
  test('komponen lengkap & prima → siap latihan', () => {
    const r = readinessOf({
      [todayISO()]: { water: 2, sleepH: 8, soreness: 1, stress: 1, energy: 5 },
    })
    expect(r).not.toBeNull()
    expect(r!.score).toBe(100)
    expect(r!.label).toBe('Siap latihan')
    expect(r!.missing).toEqual([])
  })

  test('komponen parsial → bobot dinormalisasi & missing dilaporkan', () => {
    const r = readinessOf({
      [todayISO()]: { water: 2, sleepH: 4 }, /* tidur 50% saja */
    })
    expect(r).not.toBeNull()
    expect(r!.score).toBe(50)
    expect(r!.missing).toContain('nyeri otot')
  })

  test('tanpa check-in hari ini → null', () => {
    expect(readinessOf({})).toBeNull()
  })
})

describe('double progression & pembulatan', () => {
  test('round2_5 membulatkan ke kelipatan 2,5 kg', () => {
    expect(round2_5(62.4)).toBe(62.5)
    expect(round2_5(61.2)).toBe(60)
    expect(round2_5(100)).toBe(100)
  })

  test('semua set mencapai target → naik 2,5 kg', () => {
    const a = doubleProgression([{ weight: 80, reps: 12 }, { weight: 80, reps: 12 }], 12)
    expect(a!.action).toBe('naik')
    expect(a!.nextWeight).toBe(82.5)
  })

  test('repetisi jauh tertinggal → turun 10%', () => {
    const a = doubleProgression([{ weight: 100, reps: 6 }, { weight: 100, reps: 6 }], 10)
    expect(a!.action).toBe('turun')
    expect(a!.nextWeight).toBe(90)
  })

  test('di antaranya → pertahankan', () => {
    const a = doubleProgression([{ weight: 80, reps: 10 }, { weight: 80, reps: 9 }], 10)
    expect(a!.action).toBe('pertahankan')
    expect(a!.nextWeight).toBe(80)
  })

  test('tanpa set → null', () => {
    expect(doubleProgression([], 10)).toBeNull()
  })
})

describe('plateau & deload', () => {
  test('tiga sesi terakhir tanpa perbaikan → stalled', () => {
    const workouts = [
      beban('2025-05-01', [set('Bench', 100, 5)]), /* PR lama */
      beban('2025-05-08', [set('Bench', 90, 5)]),
      beban('2025-05-15', [set('Bench', 90, 5)]),
      beban('2025-05-22', [set('Bench', 90, 5)]),
    ]
    const p = detectPlateau(workouts, 'Bench')
    expect(p).not.toBeNull()
    expect(p!.stalled).toBe(true)
    expect(p!.priorBest).toBeCloseTo(100 * (1 + 5 / 30), 10)
  })

  test('ada perbaikan → tidak stalled; kurang dari 3 sesi → null', () => {
    const improving = [
      beban('2025-05-01', [set('Bench', 80, 5)]),
      beban('2025-05-08', [set('Bench', 90, 5)]),
      beban('2025-05-15', [set('Bench', 100, 5)]),
      beban('2025-05-22', [set('Bench', 110, 5)]),
    ]
    expect(detectPlateau(improving, 'Bench')!.stalled).toBe(false)
    expect(detectPlateau(improving.slice(0, 2), 'Bench')).toBeNull()
  })

  test('deloadActive mengikuti tanggal', () => {
    const today = todayISO()
    expect(deloadActive(addDaysISO(today, 3))).toBe(true)
    expect(deloadActive(today)).toBe(true)
    expect(deloadActive(addDaysISO(today, -1))).toBe(false)
    expect(deloadActive(null)).toBe(false)
  })

  test('deloadSets memotong beban 50% (pembulatan 2,5 kg)', () => {
    const out = deloadSets([set('Squat', 100, 5), set('Squat', 85, 8)])
    expect(out[0].weight).toBe(50)
    expect(out[1].weight).toBe(42.5)
    /* Repetisi tidak berubah. */
    expect(out[0].reps).toBe(5)
  })
})

describe('guard kardio', () => {
  test('≥ 5 sesi kardio dalam 7 hari → terlalu banyak', () => {
    const today = todayISO()
    const workouts = [0, 1, 2, 3, 4].map((i) => cardio(addDaysISO(today, -i), 'jalan', 2, 25))
    const g = cardioGuard(workouts)
    expect(g.cardioCount7d).toBe(5)
    expect(g.tooMuch).toBe(true)
    expect(g.suggestion).not.toBeNull()
  })

  test('kardio sehat → tidak ada saran; di luar jendela tidak dihitung', () => {
    const today = todayISO()
    const workouts = [
      cardio(addDaysISO(today, -1), 'jalan', 2, 25),
      cardio(addDaysISO(today, -20), 'lari', 5, 30), /* di luar 7 hari */
      beban(today, [set('Squat', 100, 5)]),
    ]
    const g = cardioGuard(workouts)
    expect(g.cardioCount7d).toBe(1)
    expect(g.tooMuch).toBe(false)
    expect(g.suggestion).toBeNull()
  })
})

describe('alat barbel', () => {
  test('plateLoader memuat piring per sisi dengan sisa bebas', () => {
    const r = plateLoader(100, 20)
    expect(r).not.toBeNull()
    /* 40 kg per sisi → 25 + 15. */
    expect(r!.plates.map((p) => `${p.spec.kg}×${p.countPerSide}`)).toEqual(['25×1', '15×1'])
    expect(r!.achieved).toBe(100)
    expect(r!.remainder).toBe(0)
  })

  test('plateLoader menolak beban di bawah bar', () => {
    expect(plateLoader(15, 20)).toBeNull()
    expect(plateLoader(NaN)).toBeNull()
  })

  test('rmTable menghasilkan 7 baris 95–65% pembulatan 2,5 kg', () => {
    const rows = rmTable(100, 5)
    expect(rows.length).toBe(7)
    expect(rows[0].pct).toBe(95)
    expect(rows[6].pct).toBe(65)
    for (const r of rows) expect(r.kg % 2.5).toBe(0)
  })

  test('warmupLadder: bar → 40% → 60% → 80%, duplikat dilompati', () => {
    expect(warmupLadder(100, 20)).toEqual([
      { label: 'Bar kosong', kg: 20 },
      { label: '40%', kg: 40 },
      { label: '60%', kg: 60 },
      { label: '80%', kg: 80 },
    ])
    /* Bar 20 = 40% dari 50 → langkah 40% dilompati. */
    const ladder = warmupLadder(50, 20)
    expect(ladder.some((s) => s.label === '40%')).toBe(false)
  })
})
