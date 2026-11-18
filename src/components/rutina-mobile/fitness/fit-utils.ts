/* ============================================================
   Derivasi murni di atas domain Workout — tanpa React, tanpa
   efek samping; aman untuk SSR & unit test.

   Semua keputusan kebugaran dihitung dari data latihan sendiri
   (pendekatan coach Rutina v3: "data dulu, rekomendasi kemudian").
   ============================================================ */

import { addDaysISO, todayISO, type Workout } from '../store'

/* ===== e1RM (Epley) ===== */

/** Estimasi kekuatan lintas rep-range: beban × (1 + reps/30). */
export function e1rmOf(weight: number, reps: number): number {
  return weight * (1 + reps / 30)
}

/* ===== Statistik satu sesi ===== */

/** Tonase sesi beban: total beban × repetisi (kg). */
export function tonaseOf(w: Workout): number {
  if (w.kind !== 'beban') return 0
  return w.sets.reduce((a, s) => a + s.weight * s.reps, 0)
}

/** e1RM terbaik dalam satu sesi beban. */
export function bestE1rmIn(w: Workout): number {
  if (w.kind !== 'beban' || w.sets.length === 0) return 0
  return Math.max(...w.sets.map((s) => e1rmOf(s.weight, s.reps)))
}

/** Pace kardio: menit per km — "6'32\"" atau null bila data kurang. */
export function paceOf(duration: number, distance: number): string | null {
  if (distance <= 0 || duration <= 0) return null
  const secPerKm = (duration * 60) / distance
  const min = Math.floor(secPerKm / 60)
  const sec = Math.round(secPerKm % 60)
  return `${min}'${String(sec).padStart(2, '0')}"`
}

/* ===== Statistik lintas sesi ===== */

export interface ExStat {
  sessions: number
  /** PR e1RM terbaik sepanjang histori (kg). */
  best: number
  /** Berat terakhir dipakai (kg) — untuk perbandingan sesi berikutnya. */
  lastWeight: number
  lastReps: number
}

/** Rekap satu gerakan: jumlah sesi, PR e1RM, set terakhir. */
export function exStatOf(workouts: Workout[], name: string): ExStat {
  let sessions = 0
  let best = 0
  let lastWeight = 0
  let lastReps = 0
  for (const w of workouts) {
    if (w.kind !== 'beban') continue
    const sets = w.sets.filter((s) => s.exercise === name)
    if (sets.length === 0) continue
    sessions++
    for (const s of sets) {
      const e = e1rmOf(s.weight, s.reps)
      if (e > best) best = e
    }
    lastWeight = sets[sets.length - 1].weight
    lastReps = sets[sets.length - 1].reps
  }
  return { sessions, best, lastWeight, lastReps }
}

export interface PrRow {
  name: string
  best: number
  sessions: number
}

/** Papan rekor: tiap gerakan yang pernah dicatat, urut e1RM tertinggi. */
export function prBoard(workouts: Workout[]): PrRow[] {
  const map = new Map<string, PrRow>()
  for (const w of workouts) {
    if (w.kind !== 'beban') continue
    for (const s of w.sets) {
      const e = e1rmOf(s.weight, s.reps)
      const row = map.get(s.exercise) ?? {
        name: s.exercise,
        best: 0,
        sessions: 0,
      }
      if (e > row.best) row.best = e
      map.set(s.exercise, row)
    }
  }
  /* Jumlah sesi per gerakan (satu sesi dihitung sekali). */
  for (const [name, row] of map) {
    row.sessions = workouts.filter(
      (w) => w.kind === 'beban' && w.sets.some((s) => s.exercise === name),
    ).length
    map.set(name, row)
  }
  return [...map.values()].sort((a, b) => b.best - a.best)
}

/* ===== Jendela pekan ===== */

/** Pekan berjalan Senin–Minggu meliputi hari ini. */
export function weekRange(): { start: string; end: string } {
  const today = todayISO()
  const dow = (new Date(today + 'T00:00:00').getDay() + 6) % 7 // Senin = 0
  const start = addDaysISO(today, -dow)
  return { start, end: addDaysISO(start, 6) }
}

export interface WeekSummary {
  sessions: number
  /** Total menit latihan pekan ini. */
  minutes: number
  /** Tonase total (kg) dari sesi beban pekan ini. */
  tonase: number
  /** e1RM tertinggi pekan ini. */
  bestE1rm: number
}

/** Ringkasan pekan berjalan — angka hero layar Bugar. */
export function weekSummary(workouts: Workout[]): WeekSummary {
  const { start, end } = weekRange()
  const inWeek = workouts.filter((w) => w.date >= start && w.date <= end)
  return {
    sessions: inWeek.length,
    minutes: inWeek.reduce((a, w) => a + (w.duration || 0), 0),
    tonase: inWeek.reduce((a, w) => a + tonaseOf(w), 0),
    bestE1rm: inWeek.reduce((a, w) => Math.max(a, bestE1rmIn(w)), 0),
  }
}

/* ===== Kardio ===== */

export interface CardioSummary {
  sessions: number
  km: number
  /** Jarak terjauh sekali jalan (km). */
  farthest: number
}

/** Rekap jalan/lari lintas histori. */
export function cardioSummary(workouts: Workout[]): CardioSummary {
  const cardio = workouts.filter((w) => w.kind !== 'beban')
  return {
    sessions: cardio.length,
    km: cardio.reduce((a, w) => a + (w.distance ?? 0), 0),
    farthest: cardio.reduce((a, w) => Math.max(a, w.distance ?? 0), 0),
  }
}
