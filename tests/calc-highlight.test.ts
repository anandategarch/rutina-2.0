/* ============================================================
 * Pengujian otomatis — Sorotan Hari Ini, Rekap Pekan, dan
 * kutipan refleksi yang bisa diganti-ganti (v2.14).
 * Jalankan: bun test
 * ============================================================ */

import { describe, expect, test } from 'bun:test'

import {
  DAILY_QUOTES,
  dailyQuote,
  currentQuoteOf,
  nextQuoteOffset,
  quoteFor,
  type Budgets,
  type Completions,
  type Goal,
  type Habit,
  type Tx,
  type Workout,
} from '../src/components/rutina-mobile/store'
import {
  BUDGET_WARN_PCT,
  GOAL_NEAR_PCT,
  STREAK_RISK_MIN,
  pickDailyHighlight,
  type HighlightInput,
} from '../src/components/rutina-mobile/daily-highlight'
import { weeklyRecapOf, recapRangeLabel } from '../src/components/rutina-mobile/weekly-recap'

/* ---- Fixture builder ---- */

function habit(partial: Partial<Habit> = {}): Habit {
  return {
    id: partial.id ?? 'h-1',
    title: partial.title ?? 'Minum air',
    desc: '',
    cat: partial.cat ?? 'Kesehatan',
    schedule: partial.schedule ?? [0, 1, 2, 3, 4, 5, 6],
    weeklyTarget: partial.weeklyTarget ?? 7,
    reminder: partial.reminder ?? null,
    restDays: partial.restDays ?? [],
    afterId: partial.afterId ?? null,
    mini: partial.mini ?? '',
    archived: partial.archived ?? false,
    createdAt: partial.createdAt ?? '2025-01-01',
  }
}

function tx(partial: Partial<Tx> = {}): Tx {
  return {
    id: partial.id ?? 'tx-1',
    type: partial.type ?? 'keluar',
    cat: partial.cat ?? 'makan',
    amount: partial.amount ?? 10_000,
    note: partial.note ?? '',
    ts: partial.ts ?? '2025-03-14',
    walletId: partial.walletId,
    toWalletId: partial.toWalletId,
    recurrence: partial.recurrence ?? null,
    recurOf: partial.recurOf,
  }
}

function workout(partial: Partial<Workout> = {}): Workout {
  return {
    id: partial.id ?? 'w-1',
    kind: partial.kind ?? 'beban',
    date: partial.date ?? '2025-03-11',
    duration: partial.duration ?? 30,
    note: '',
    sets: [],
    distance: partial.distance,
  }
}

/* 14 Maret 2025 = Jumat. Pekan berjalan: Sen 10 – Min 16 Maret. */
const TODAY = '2025-03-14'

const done = (c: Completions, date: string, ...ids: string[]) => {
  c[date] = { ...(c[date] ?? {}), ...Object.fromEntries(ids.map((id) => [id, true])) }
}

function baseInput(overrides: Partial<HighlightInput> = {}): HighlightInput {
  return {
    today: TODAY,
    habits: [],
    completions: {},
    txs: [],
    budgets: {},
    goals: [],
    workouts: [],
    ...overrides,
  }
}

/* ===== Sorotan Hari Ini ===== */

describe('Sorotan Hari Ini — prioritas & ambang', () => {
  test('tidak ada data → sambutan (welcome)', () => {
    const hl = pickDailyHighlight(baseInput())
    expect(hl.key).toBe('welcome')
    expect(hl.cta).toBe('add-habit')
  })

  test('ada kebiasaan aktif tanpa jadwal hari ini → hari tenang (quiet)', () => {
    const hl = pickDailyHighlight(
      baseInput({
        habits: [habit({ schedule: [1] })], // hanya Senin; hari ini Jumat
      }),
    )
    expect(hl.key).toBe('quiet')
  })

  test('pengguna tanpa kebiasaan → sambutan (onboarding dulu)', () => {
    const hl = pickDailyHighlight(baseInput({ habits: [] }))
    expect(hl.key).toBe('welcome')
  })

  test('streak ≥ ambang belum selesai hari ini → streak-risk, runtun tertinggi menang', () => {
    const c: Completions = {}
    // A: 3 hari beruntun (11-13 Maret)
    done(c, '2025-03-11', 'a')
    done(c, '2025-03-12', 'a')
    done(c, '2025-03-13', 'a')
    // B: 5 hari beruntun (09-13 Maret)
    done(c, '2025-03-09', 'b')
    done(c, '2025-03-10', 'b')
    done(c, '2025-03-11', 'b')
    done(c, '2025-03-12', 'b')
    done(c, '2025-03-13', 'b')
    const hl = pickDailyHighlight(
      baseInput({ habits: [habit({ id: 'a' }), habit({ id: 'b' })], completions: c }),
    )
    expect(hl.key).toBe('streak-risk')
    expect(hl.visual.kind).toBe('streak')
    if (hl.visual.kind === 'streak') {
      expect(hl.visual.streak).toBe(5)
      expect(hl.visual.habitId).toBe('b')
    }
  })

  test(`streak ${STREAK_RISK_MIN - 1} hari belum selesai → BUKAN streak-risk`, () => {
    const c: Completions = {}
    done(c, '2025-03-12', 'a')
    done(c, '2025-03-13', 'a')
    const hl = pickDailyHighlight(
      baseInput({
        habits: [habit({ id: 'a' })],
        completions: c,
      }),
    )
    expect(hl.key).not.toBe('streak-risk')
  })

  test('anggaran terpakai ≥ ambang → budget-warning dengan rasio tertinggi', () => {
    const budgets: Budgets = { makan: 100_000, transport: 200_000 }
    const txs = [
      tx({ cat: 'makan', amount: 90_000, ts: '2025-03-05' }), // 90% — bulan sama
      tx({ cat: 'transport', amount: 168_000, ts: '2025-03-10' }), // 84% — di bawah ambang
    ]
    const hl = pickDailyHighlight(
      baseInput({
        habits: [habit({ schedule: [1] })],
        budgets,
        txs,
      }),
    )
    expect(hl.key).toBe('budget-warning')
    expect(hl.visual.kind).toBe('budget')
    if (hl.visual.kind === 'budget') {
      expect(hl.visual.cat).toBe('makan')
      expect(hl.visual.pct).toBeGreaterThanOrEqual(BUDGET_WARN_PCT)
    }
  })

  test('pengeluaran bulan lalu tidak dihitung ke anggaran bulan ini', () => {
    const hl = pickDailyHighlight(
      baseInput({
        habits: [habit({ schedule: [1] })],
        budgets: { makan: 100_000 },
        txs: [tx({ cat: 'makan', amount: 500_000, ts: '2025-02-20' })],
      }),
    )
    expect(hl.key).not.toBe('budget-warning')
  })

  test('streak-risk menang atas budget-warning (urutan prioritas)', () => {
    const c: Completions = {}
    done(c, '2025-03-12', 'a')
    done(c, '2025-03-13', 'a')
    done(c, '2025-03-14', 'a') // streak 3 & selesai hari ini → bukan risk…
    // …jadi pakai streak yang belum selesai hari ini
    const c2: Completions = {}
    done(c2, '2025-03-11', 'b')
    done(c2, '2025-03-12', 'b')
    done(c2, '2025-03-13', 'b')
    const hl = pickDailyHighlight(
      baseInput({
        habits: [habit({ id: 'b' })],
        completions: c2,
        budgets: { makan: 100_000 },
        txs: [tx({ cat: 'makan', amount: 95_000 })],
      }),
    )
    expect(hl.key).toBe('streak-risk')
  })

  test('latihan terakhir ≥ ambang hari → workout-stale; tanpa histori tidak dinag', () => {
    const stale = pickDailyHighlight(
      baseInput({
        habits: [habit({ schedule: [1] })],
        workouts: [workout({ date: '2025-03-10' })], // 4 hari lalu
      }),
    )
    expect(stale.key).toBe('workout-stale')
    if (stale.visual.kind === 'stale') expect(stale.visual.daysSince).toBe(4)

    const noHistory = pickDailyHighlight(
      baseInput({
        habits: [habit({ schedule: [1] })],
        workouts: [], // tidak pernah latihan — bukan domainnya
      }),
    )
    expect(noHistory.key).toBe('quiet')

    const fresh = pickDailyHighlight(
      baseInput({
        habits: [habit({ schedule: [1] })],
        workouts: [workout({ date: '2025-03-13' })], // kemarin
      }),
    )
    expect(fresh.key).toBe('quiet')
  })

  test('tujuan terdanai ≥ ambang (belum penuh) → goal-near', () => {
    const goals: Goal[] = [
      { id: 'g1', name: 'Laptop', target: 10_000_000, saved: 8_500_000 },
    ]
    const hl = pickDailyHighlight(
      baseInput({
        habits: [habit({ schedule: [1] })],
        goals,
      }),
    )
    expect(hl.key).toBe('goal-near')
    expect(hl.visual.kind).toBe('goal')
    if (hl.visual.kind === 'goal') {
      expect(hl.visual.pct).toBeGreaterThanOrEqual(GOAL_NEAR_PCT)
    }

    // Tujuan yang sudah 100% tidak ditonjolkan lagi
    const full = pickDailyHighlight(
      baseInput({
        habits: [habit({ schedule: [1] })],
        goals: [{ id: 'g1', name: 'Laptop', target: 10_000_000, saved: 10_000_000 }],
      }),
    )
    expect(full.key).toBe('quiet')
  })

  test("v2.95: bonus tak lagi jadi sorotan — satu pintu klaim di seksi Bonus harian", () => {
    // Sorotan 'bonus' dipensiunkan: hari tanpa urgensi & tanpa saran coach
    // jatuh ke pengisi netral ('quiet'), bukan UI klaim kedua.
    const hl = pickDailyHighlight(
      baseInput({
        habits: [habit({ schedule: [1] })],
      }),
    )
    expect(hl.key).toBe('quiet')
    expect(hl.cta).toBe('add-habit')
  })

  test('semua misi selesai + bonus terklaim → perfect', () => {
    const c: Completions = {}
    done(c, TODAY, 'a', 'b')
    const hl = pickDailyHighlight(
      baseInput({
        habits: [habit({ id: 'a' }), habit({ id: 'b' })],
        completions: c,
      }),
    )
    expect(hl.key).toBe('perfect')
    expect(hl.visual.kind).toBe('perfect')
    if (hl.visual.kind === 'perfect') expect(hl.visual.missions).toBe(2)
  })
})

/* ===== Rekap Pekan ===== */

describe('Rekap Pekan — perjalanan & pembanding', () => {
  test('strip 7 hari Senin–Minggu + total misi sampai hari ini', () => {
    const c: Completions = {}
    done(c, '2025-03-10', 'a', 'b') // Sen: 2
    done(c, '2025-03-11', 'a') // Sel: 1
    // Rab: 0
    done(c, '2025-03-13', 'a', 'b') // Kam: 2
    done(c, '2025-03-14', 'a') // Jum (hari ini): 1
    /* v2.49: id kebiasaan kini harus NYATA — penyelesaian ber-id yatim
       (kebiasaan terhapus) tidak lagi dihitung sebagai misi (satu sumber
       dayCompliance, audit v2.49). */
    const r = weeklyRecapOf({
      today: TODAY,
      habits: [habit({ id: 'a' }), habit({ id: 'b' })],
      completions: c,
      dailyGoal: 2,
      workouts: [workout({ date: '2025-03-11' })],
      txs: [],
    })
    expect(r.days).toHaveLength(7)
    expect(r.days[0]!.iso).toBe('2025-03-10') // Senin
    expect(r.days[6]!.iso).toBe('2025-03-16') // Minggu
    expect(r.missionsDone).toBe(6)
    // Target harian 2: Sen ✓, Sel ✗, Rab ✗, Kam ✓, Jum ✗
    expect(r.days.map((d) => d.metGoal)).toEqual([true, false, false, true, false, false, false])
    // Hari setelah hari ini ditandai masa depan
    expect(r.days[5]!.isFuture).toBe(true)
    expect(r.days[4]!.isToday).toBe(true)
    expect(r.xp).toBe(6 * 80)
    expect(r.workouts).toBe(1)
  })

  test('pembanding pekan lalu pada rentang hari yang sama + delta', () => {
    const c: Completions = {}
    // Pekan lalu (Sen 3 – Jum 7 Maret): 4 misi
    // (v2.49: id 'a2' yatim diganti 'b' — penyelesaian yatim tak dihitung)
    done(c, '2025-03-03', 'a', 'b')
    done(c, '2025-03-05', 'a')
    done(c, '2025-03-07', 'a')
    // Pekan ini (Sen 10 – Jum 14): 6 misi
    done(c, '2025-03-10', 'a', 'b')
    done(c, '2025-03-11', 'a')
    done(c, '2025-03-13', 'a', 'b')
    done(c, '2025-03-14', 'a')
    const r = weeklyRecapOf({
      today: TODAY,
      habits: [habit({ id: 'a' }), habit({ id: 'b' })],
      completions: c,
      dailyGoal: 2,
      workouts: [],
      txs: [],
    })
    expect(r.missionsPrev).toBe(4)
    expect(r.delta).toBe(2)
  })

  test('misi Sabtu/Minggu pekan lalu tidak ikut pembanding (hari ini Jumat)', () => {
    const c: Completions = {}
    done(c, '2025-03-08', 'a') // Sab pekan lalu — di luar rentang Sen–Jum
    const r = weeklyRecapOf({
      today: TODAY,
      habits: [habit()],
      completions: c,
      dailyGoal: 2,
      workouts: [],
      txs: [],
    })
    expect(r.missionsPrev).toBe(0)
  })

  test('arus kas bersih: masuk − keluar, transfer netral', () => {
    const r = weeklyRecapOf({
      today: TODAY,
      habits: [],
      completions: {},
      dailyGoal: 2,
      workouts: [],
      txs: [
        tx({ type: 'masuk', amount: 500_000, ts: '2025-03-12' }),
        tx({ type: 'keluar', amount: 200_000, ts: '2025-03-13' }),
        tx({ type: 'transfer', amount: 100_000, ts: '2025-03-14' }),
        tx({ type: 'masuk', amount: 999_999, ts: '2025-03-01' }), // luar pekan
      ],
    })
    expect(r.netFlow).toBe(300_000)
  })

  test('pekan tanpa aktivitas tetap valid (nol, tanpa lempar)', () => {
    const r = weeklyRecapOf({
      today: TODAY,
      habits: [],
      completions: {},
      dailyGoal: 2,
      workouts: [],
      txs: [],
    })
    expect(r.missionsDone).toBe(0)
    expect(r.delta).toBe(0)
    expect(r.netFlow).toBe(0)
    expect(r.streak).toBe(0)
    expect(r.rangeLabel).toBe('10 – 16 Mar')
  })

  test('label rentang kompak: sebulan vs lintas bulan', () => {
    expect(recapRangeLabel('2025-03-10', '2025-03-16')).toBe('10 – 16 Mar')
    expect(recapRangeLabel('2025-04-28', '2025-05-04')).toBe('28 Apr – 4 Mei')
  })
})

/* ===== Refleksi bergilir ===== */

describe('Refleksi — kutipan bisa diganti-ganti', () => {
  test('quoteFor(0) sama dengan dailyQuote; offset bergerak maju', () => {
    expect(quoteFor(TODAY, 0)).toEqual(dailyQuote(TODAY))
    const base = DAILY_QUOTES.indexOf(dailyQuote(TODAY))
    const next = (base + 1) % DAILY_QUOTES.length
    expect(quoteFor(TODAY, 1)).toEqual(DAILY_QUOTES[next])
  })

  test('offset berputar penuh kembali ke kutipan awal', () => {
    expect(quoteFor(TODAY, DAILY_QUOTES.length)).toEqual(dailyQuote(TODAY))
    expect(quoteFor(TODAY, DAILY_QUOTES.length + 2)).toEqual(quoteFor(TODAY, 2))
  })

  test('nextQuoteOffset: lanjut di hari sama, reset di hari baru', () => {
    expect(nextQuoteOffset(null, 0, TODAY)).toBe(1)
    expect(nextQuoteOffset(TODAY, 3, TODAY)).toBe(4)
    expect(nextQuoteOffset('2025-03-13', 5, TODAY)).toBe(1)
  })

  test('currentQuoteOf: offset hanya berlaku pada hari penggantian', () => {
    expect(currentQuoteOf(TODAY, 2, TODAY)).toEqual(quoteFor(TODAY, 2))
    // Kemarin ganti 5 kali → hari ini kembali ke kutipan default
    expect(currentQuoteOf('2025-03-13', 5, TODAY)).toEqual(dailyQuote(TODAY))
    expect(currentQuoteOf(null, 9, TODAY)).toEqual(dailyQuote(TODAY))
  })

  test('kutipan unik cukup beragam untuk diganti-ganti', () => {
    const texts = new Set(DAILY_QUOTES.map((q) => q.text))
    expect(DAILY_QUOTES.length).toBeGreaterThanOrEqual(10)
    expect(texts.size).toBe(DAILY_QUOTES.length)
  })
})
