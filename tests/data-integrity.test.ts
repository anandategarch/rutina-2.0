/* ============================================================
 * Pengujian otomatis — integritas data visualisasi v2.36 Tahap 1:
 * tanggal catatan jurnal (ISO + migrasi id-epoch) dan metrik
 * kebiasaan sadar-jadwal (kepatuhan, status harian, tren pekan).
 * Jalankan: bun test
 * ============================================================ */

import { describe, expect, test } from 'bun:test'

import {
  addDaysISO,
  daySchedules,
  habitStatusOn,
  habitWeeklyRates,
  noteDateISO,
  noteDateLabel,
  todayISO,
  weekStartISO,
  type Completions,
  type Habit,
  type Note,
} from '../src/components/rutina-mobile/store'

/* --- Perkakas --- */

const T0 = '2026-02-11' // Rabu (getDay 3)

function mkHabit(
  over: Partial<Habit> = {},
): Habit {
  return {
    id: 'h-test',
    title: 'Uji',
    desc: '',
    cat: 'Kebiasaan',
    schedule: [],
    weeklyTarget: 7,
    reminder: null,
    restDays: [],
    afterId: null,
    mini: '',
    target: null,
    unit: null,
    groupId: null,
    archived: false,
    createdAt: '2020-01-01',
    ...over,
  }
}

function mkNote(over: Partial<Note> = {}): Note {
  return {
    id: 'note-0',
    title: 'Uji',
    body: '',
    date: '2026-02-11',
    pinned: false,
    tone: 0,
    folder: 'pribadi',
    ...over,
  }
}

/* ===== noteDateISO — tangga kejujuran tanggal ===== */

describe('noteDateISO', () => {
  test('field ISO dipakai apa adanya', () => {
    expect(noteDateISO(mkNote({ date: '2026-02-11' }))).toBe('2026-02-11')
  })

  test('catatan lama "Hari ini" → tanggal-dibuat dari id note-<epoch>', () => {
    const ts = new Date('2026-02-09T10:30:00').getTime()
    const iso = noteDateISO(mkNote({ id: `note-${ts}`, date: 'Hari ini' }))
    expect(iso).toBe('2026-02-09')
  })

  test('kutipan tersimpan quote-<epoch> juga bisa diturunkan', () => {
    const ts = new Date('2026-01-31T23:00:00').getTime()
    const iso = noteDateISO(mkNote({ id: `quote-${ts}`, date: 'Hari ini' }))
    expect(iso).toBe('2026-01-31')
  })

  test('id tak dikenal → null (TIDAK dianggap hari ini)', () => {
    expect(noteDateISO(mkNote({ id: 'n1', date: 'Hari ini' }))).toBeNull()
    expect(noteDateISO(mkNote({ id: 'x', date: '15 Jun' }))).toBeNull()
  })

  test('id epoch tidak valid (NaN) → null', () => {
    expect(noteDateISO(mkNote({ id: 'note-99999999999999999999', date: 'x' }))).toBeNull()
  })
})

/* ===== noteDateLabel — label tampilan ===== */

describe('noteDateLabel', () => {
  test('hari ini / kemarin / tanggal pendek', () => {
    const today = '2026-02-11'
    expect(noteDateLabel(mkNote({ date: today }), today)).toBe('Hari ini')
    expect(noteDateLabel(mkNote({ date: '2026-02-10' }), today)).toBe('Kemarin')
    expect(noteDateLabel(mkNote({ date: '2026-02-05' }), today)).toBe('5 Feb')
  })

  test('tanpa tanggal pasti → "Tanpa tanggal"', () => {
    expect(noteDateLabel(mkNote({ id: 'n1', date: 'Hari ini' }), '2026-02-11')).toBe(
      'Tanpa tanggal',
    )
  })
})

/* ===== daySchedules — kepatuhan jadwal per hari ===== */

describe('daySchedules', () => {
  test('tanpa kebiasaan → pct null (bukan 0%) di semua hari', () => {
    const out = daySchedules([], {}, T0, 7)
    expect(out).toHaveLength(7)
    for (const d of out) {
      expect(d.scheduled).toBe(0)
      expect(d.pct).toBeNull()
    }
  })

  test('rasio kepatuhan: 2/2 (100%) vs 4/6 (67%) — bukan jumlah mentah', () => {
    // Rab 2026-02-11 (getDay 3): dua kebiasaan terjadwal, keduanya selesai.
    // Sel 2026-02-10 (getDay 2): enam terjadwal, empat selesai.
    const habits = [
      mkHabit({ id: 'a', schedule: [3] }), // Rabu
      mkHabit({ id: 'b', schedule: [3] }),
      ...[1, 2, 3, 4, 5, 6].map((i) => mkHabit({ id: `w${i}`, schedule: [2] })), // Selasa
    ]
    const c: Completions = {
      '2026-02-11': { a: true, b: true },
      '2026-02-10': { w1: true, w2: true, w3: true, w4: true },
    }
    const out = daySchedules(habits, c, T0, 2)
    const sel = out.find((d) => d.date === '2026-02-10')!
    const rab = out.find((d) => d.date === '2026-02-11')!
    expect(rab.pct).toBe(100)
    expect(rab.scheduled).toBe(2)
    expect(sel.pct).toBe(67)
    expect(sel.scheduled).toBe(6)
  })

  test('hari jeda diampuni — keluar dari penyebut, bukan dihitung gagal', () => {
    const habits = [
      mkHabit({ id: 'a', schedule: [3], restDays: ['2026-02-11'] }),
      mkHabit({ id: 'b', schedule: [3] }),
    ]
    const c: Completions = { '2026-02-11': { b: true } }
    const out = daySchedules(habits, c, T0, 1)
    expect(out[0].rest).toBe(1)
    expect(out[0].scheduled).toBe(1)
    expect(out[0].done).toBe(1)
    expect(out[0].pct).toBe(100)
  })

  test('createdAt dihormati — kebiasaan baru tidak menghukum hari sebelum lahir', () => {
    const habits = [mkHabit({ id: 'a', schedule: [], createdAt: '2026-02-11' })]
    const out = daySchedules(habits, {}, T0, 2)
    expect(out.find((d) => d.date === '2026-02-10')!.pct).toBeNull()
    expect(out.find((d) => d.date === '2026-02-11')!.scheduled).toBe(1)
  })

  test('arsip tidak dihitung terjadwal', () => {
    const habits = [mkHabit({ id: 'a', schedule: [], archived: true })]
    const out = daySchedules(habits, {}, T0, 1)
    expect(out[0].pct).toBeNull()
  })

  test('histori panjang 84 hari utuh & berurutan', () => {
    const out = daySchedules([mkHabit({ id: 'a', schedule: [] })], {}, T0, 84)
    expect(out).toHaveLength(84)
    expect(out[0].date).toBe(addDaysISO(T0, -83))
    expect(out[83].date).toBe(T0)
  })
})

/* ===== habitStatusOn — enam status hari ===== */

describe('habitStatusOn', () => {
  const h = mkHabit({ id: 'a', schedule: [2, 3] }) // Selasa & Rabu

  test('done: terjadwal & selesai', () => {
    expect(habitStatusOn(h, { '2026-02-11': { a: true } }, '2026-02-11', T0)).toBe('done')
  })
  test('missed: terjadwal tapi belum — hari SUDAH LEWAT', () => {
    expect(habitStatusOn(h, {}, '2026-02-10', T0)).toBe('missed') // Selasa lampau
  })
  test('pending: HARI INI terjadwal tapi belum — hari masih berjalan (v2.45)', () => {
    expect(habitStatusOn(h, {}, '2026-02-11', T0)).toBe('pending')
  })
  test('unscheduled: hari tanpa jadwal', () => {
    expect(habitStatusOn(h, {}, '2026-02-09', T0)).toBe('unscheduled') // Senin
  })
  test('rest: hari jeda terjadwal', () => {
    const hr = mkHabit({ id: 'a', schedule: [3], restDays: ['2026-02-11'] })
    expect(habitStatusOn(hr, {}, '2026-02-11', T0)).toBe('rest')
  })
  test('future: setelah hari ini (termasuk hari yang belum terjadi pekan ini)', () => {
    expect(habitStatusOn(h, {}, addDaysISO(T0, 1), T0)).toBe('future')
  })
  test('sebelum createdAt = unscheduled', () => {
    const hc = mkHabit({ id: 'a', schedule: [], createdAt: '2026-02-11' })
    expect(habitStatusOn(hc, {}, '2026-02-10', T0)).toBe('unscheduled')
  })
})

/* ===== habitWeeklyRates — tren empat pekan ===== */

describe('habitWeeklyRates', () => {
  test('empat pekan terurut tua→baru, pekan berjalan parsial', () => {
    const h = mkHabit({ id: 'a', schedule: [] }) // setiap hari
    // Rab 11 Feb 2026 → pekan berjalan Sen 9..Min 15; hanya Sen/Rab lewat.
    const out = habitWeeklyRates(h, {}, T0, 4)
    expect(out).toHaveLength(4)
    expect(out[3].start).toBe(weekStartISO(T0))
    expect(out[3].scheduled).toBe(3) // Sen 9, Sel 10, Rab 11 — hari ini dihitung
    expect(out[0].start).toBe(addDaysISO(weekStartISO(T0), -21))
  })

  test('pekan tanpa jadwal → pct null, bukan 0%', () => {
    // Kebiasaan baru lahir Senin pekan berjalan: pekan sebelumnya tak
    // punya jadwal sama sekali (null), pekan berjalan terjadwal 0%-selesai.
    const h = mkHabit({ id: 'a', schedule: [], createdAt: weekStartISO(T0) })
    const out = habitWeeklyRates(h, {}, T0, 2)
    expect(out[1].pct).toBe(0)
    expect(out[0].pct).toBeNull()
  })

  test('persentase pekan dihitung dari jadwal & hari jeda', () => {
    const start = weekStartISO(T0) // Sen
    const h = mkHabit({
      id: 'a',
      schedule: [],
      restDays: [start],
      createdAt: '2020-01-01',
    })
    const c: Completions = {
      [addDaysISO(start, 1)]: { a: true },
      [addDaysISO(start, 2)]: { a: true },
    }
    const out = habitWeeklyRates(h, c, T0, 1)
    // Sen diampuni; Sel+Rab selesai; Kam..Min masa depan → 2/2 = 100%.
    expect(out[0].scheduled).toBe(2)
    expect(out[0].done).toBe(2)
    expect(out[0].pct).toBe(100)
  })
})

/* ===== Catatan tanggal default param (defensif SSR) ===== */

test('noteDateLabel tanpa argumen today tidak melempar', () => {
  const label = noteDateLabel(mkNote({ date: todayISO() }))
  expect(['Hari ini', 'Kemarin']).toContain(label)
})
