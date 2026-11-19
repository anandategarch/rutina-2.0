/* ============================================================
 * Pengujian otomatis — perhitungan inti store & kartu stempel
 * (XP/level, streak, penjadwalan, utilitas tanggal)
 * Jalankan: bun test
 * ============================================================ */

import { describe, expect, test } from 'bun:test'

import {
  XP_BASE,
  XP_BONUS,
  XP_PER_TASK,
  XP_TARGET,
  computeXp,
  computeLevel,
  doneCountOn,
  isDoneOn,
  scheduledOn,
  habitsOn,
  habitStreak,
  bestStreak,
  addDaysISO,
  addMonthsISO,
  fromISO,
  isoOf,
  todayISO,
  type Completions,
  type Habit,
} from '../src/components/rutina-mobile/store'

/* ---- Fixture builder ---- */

function habit(partial: Partial<Habit> = {}): Habit {
  return {
    id: partial.id ?? 'h-1',
    title: partial.title ?? 'Minum air',
    desc: '',
    cat: partial.cat ?? 'Kesehatan',
    schedule: partial.schedule ?? [],
    weeklyTarget: partial.weeklyTarget ?? 7,
    reminder: partial.reminder ?? null,
    restDays: partial.restDays ?? [],
    afterId: partial.afterId ?? null,
    mini: partial.mini ?? '',
    archived: partial.archived ?? false,
    createdAt: partial.createdAt ?? '2020-01-01',
  }
}

const done = (c: Completions, date: string, ...ids: string[]) => {
  c[date] = { ...(c[date] ?? {}), ...Object.fromEntries(ids.map((id) => [id, true])) }
}

describe('XP & level', () => {
  test('computeXp = basis + misi×80 + bonus', () => {
    expect(computeXp(0, false)).toBe(XP_BASE)
    expect(computeXp(2, false)).toBe(XP_BASE + 2 * XP_PER_TASK)
    expect(computeXp(2, true)).toBe(XP_BASE + 2 * XP_PER_TASK + XP_BONUS)
  })

  test('computeLevel: 8 pada target, 7 di bawahnya', () => {
    expect(computeLevel(XP_TARGET - 1)).toBe(7)
    expect(computeLevel(XP_TARGET)).toBe(8)
    expect(computeLevel(999_999)).toBe(8)
  })
})

describe('utilitas tanggal', () => {
  test('isoOf/fromISO pulang-pergi di zona waktu lokal', () => {
    expect(isoOf(fromISO('2025-06-18'))).toBe('2025-06-18')
    expect(isoOf(new Date(2025, 0, 31))).toBe('2025-01-31')
  })

  test('addDaysISO melintasi akhir bulan & tahun', () => {
    expect(addDaysISO('2025-01-31', 1)).toBe('2025-02-01')
    expect(addDaysISO('2024-02-28', 1)).toBe('2024-02-29') /* kabisat */
    expect(addDaysISO('2025-02-28', 1)).toBe('2025-03-01')
    expect(addDaysISO('2025-12-31', 1)).toBe('2026-01-01')
    expect(addDaysISO('2025-06-18', -18)).toBe('2025-05-31')
  })

  test('addMonthsISO menjepit ke akhir bulan bila perlu', () => {
    expect(addMonthsISO('2025-01-31', 1)).toBe('2025-02-28')
    expect(addMonthsISO('2025-03-31', -1)).toBe('2025-02-28')
    expect(addMonthsISO('2025-06-15', 12)).toBe('2026-06-15')
  })

  test('todayISO selalu format yyyy-mm-dd', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('penjadwalan & penyelesaian', () => {
  test('scheduledOn: jadwal kosong = setiap hari; arsip tidak terjadwal', () => {
    expect(scheduledOn(habit({ schedule: [] }), '2025-06-18')).toBe(true)
    const archived = habit({ archived: true, schedule: [1, 3, 5] })
    expect(scheduledOn(archived, '2025-06-18')).toBe(false)
    /* 18 Jun 2025 = Rabu (3). */
    expect(scheduledOn(habit({ schedule: [3] }), '2025-06-18')).toBe(true)
    expect(scheduledOn(habit({ schedule: [1] }), '2025-06-18')).toBe(false)
  })

  test('habitsOn hanya mengembalikan aktif & terjadwal', () => {
    const hs = [
      habit({ id: 'a', schedule: [3] }),
      habit({ id: 'b', schedule: [1] }),
      habit({ id: 'c', archived: true, schedule: [3] }),
    ]
    const on = habitsOn(hs, '2025-06-18')
    expect(on.map((h) => h.id)).toEqual(['a'])
  })

  test('isDoneOn & doneCountOn menghitung dari histori', () => {
    const c: Completions = {}
    done(c, '2025-06-18', 'a', 'b')
    done(c, '2025-06-17', 'a')
    expect(isDoneOn(c, '2025-06-18', 'a')).toBe(true)
    expect(isDoneOn(c, '2025-06-18', 'z')).toBe(false)
    expect(doneCountOn(c, '2025-06-18')).toBe(2)
    expect(doneCountOn(c, '1999-01-01')).toBe(0)
  })
})

describe('habitStreak', () => {
  const today = todayISO()
  const h = habit({ id: 'h' })

  test('runtun berjalan terhitung mundur dari hari ini', () => {
    const c: Completions = {}
    done(c, today, 'h')
    done(c, addDaysISO(today, -1), 'h')
    /* Dua hari lalu bolong → streak berhenti di 2. */
    expect(habitStreak(h, c, today)).toBe(2)
  })

  test('hari ini belum selesai tidak memutus streak (grace)', () => {
    const c: Completions = {}
    done(c, addDaysISO(today, -1), 'h')
    done(c, addDaysISO(today, -2), 'h')
    expect(habitStreak(h, c, today)).toBe(2)
  })

  test('hari jeda (rest day) transparan — tidak menambah & tidak memutus', () => {
    const c: Completions = {}
    done(c, today, 'h')
    const restDate = addDaysISO(today, -1)
    done(c, addDaysISO(today, -2), 'h')
    expect(habitStreak(habit({ id: 'h', restDays: [restDate] }), c, today)).toBe(2)
  })

  test('streak tidak menembus createdAt', () => {
    const created = addDaysISO(today, -3)
    const c: Completions = {}
    for (let i = 0; i < 10; i++) done(c, addDaysISO(today, -i), 'h')
    expect(habitStreak(habit({ id: 'h', createdAt: created }), c, today)).toBe(4)
  })
})

describe('bestStreak', () => {
  test('memilih kebiasaan aktif dengan streak terpanjang', () => {
    const today = todayISO()
    const c: Completions = {}
    done(c, today, 'strong')
    done(c, addDaysISO(today, -1), 'strong')
    done(c, addDaysISO(today, -2), 'strong')
    done(c, today, 'weak')
    const habits = [
      habit({ id: 'strong', title: 'Kuat' }),
      habit({ id: 'weak', title: 'Lemah' }),
      habit({ id: 'gone', archived: true, title: 'Arsip' }),
    ]
    const best = bestStreak(habits, c, today)
    expect(best.habit!.id).toBe('strong')
    expect(best.streak).toBe(3)
    expect(best.record).toBeGreaterThanOrEqual(3)
  })
})

/* punchWeekInfo (kartu stempel) — pensiun bersama komponen punch-card
   di v2.20; blok tes dihapus agar suite kini hijau penuh. */
