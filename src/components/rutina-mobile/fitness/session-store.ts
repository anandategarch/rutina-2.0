import { create } from 'zustand'

import { exStatOf } from './fit-utils'
import {
  isoOf,
  type Workout,
  type WorkoutInput,
  type WorkoutKind,
  type WorkoutSeed,
} from '../store'

/* ============================================================
   STORE SESI LATIHAN IMERSIF — sengaja TERPISAH dari store
   utama (store.ts): sesi bersifat in-flight dan harus tetap
   hidup ketika layar Bugar unmount (pindah tab / transisi
   layar). Tidak dipersist — sesi yang belum disimpan memang
   tidak pernah masuk histori maupun mesin sinkronisasi.
   ============================================================ */

/** Durasi istirahat default antar set (ms epoch). */
export const SESSION_REST_MS = 90_000

export interface SessionSet {
  weight: number
  reps: number
}

export interface SessionExercise {
  id: string
  name: string
  kind: WorkoutKind
  targetSets: number
  sets: SessionSet[]
  /** Beban terakhir dari histori saat sesi disusun (0 = belum ada riwayat). */
  hintWeight: number
  /** Repetisi terakhir dari histori saat sesi disusun (0 = belum ada riwayat). */
  hintReps: number
}

export interface ActiveSession {
  startedAt: number
  exercises: SessionExercise[]
  currentIdx: number
  /** Batas waktu istirahat (ms epoch) — null saat tidak beristirahat. */
  restingUntil: number | null
  /** Total durasi istirahat berjalan (ms) — dasar bar progres timer. */
  restDuration: number
}

/** Item penyusun sesi: gerakan + target + pra-isi dari histori. */
export interface SessionSeedItem {
  name: string
  targetSets: number
  targetReps: number
  hintWeight: number
  hintReps: number
}

interface SessionStore {
  session: ActiveSession | null
  startSession: (items: SessionSeedItem[]) => void
  /** Tambah gerakan ke sesi berjalan — mengembalikan indeks gerakan baru. */
  addExercise: (item: SessionSeedItem) => number
  completeSet: (weight: number, reps: number) => void
  nextExercise: () => void
  prevExercise: () => void
  goToExercise: (idx: number) => void
  skipRest: () => void
  extendRest: (sec: number) => void
  /** Selesaikan sesi → payload addWorkout; null bila tak ada set tercatat. */
  endSession: () => WorkoutInput | null
  reset: () => void
}

const clampIdx = (i: number, len: number): number =>
  Math.min(Math.max(i, 0), Math.max(0, len - 1))

let exSeq = 0
const toExercise = (item: SessionSeedItem): SessionExercise => ({
  id: `sx-${Date.now()}-${exSeq++}`,
  name: item.name,
  /* Mode imersif saat ini untuk latihan beban (stepper beban × repetisi). */
  kind: 'beban',
  targetSets: Math.min(12, Math.max(1, Math.round(item.targetSets))),
  sets: [],
  hintWeight: Math.max(0, item.hintWeight),
  hintReps: Math.max(0, item.hintReps),
})

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: null,

  startSession: (items) =>
    set({
      session: {
        startedAt: Date.now(),
        exercises: items.map(toExercise),
        currentIdx: 0,
        restingUntil: null,
        restDuration: SESSION_REST_MS,
      },
    }),

  addExercise: (item) => {
    const s = get().session
    if (!s) return -1
    const ex = toExercise(item)
    set({
      session: {
        ...s,
        exercises: [...s.exercises, ex],
        currentIdx: s.exercises.length,
      },
    })
    return s.exercises.length
  },

  completeSet: (weight, reps) =>
    set((s) => {
      /* Tangkap ke konst lokal agar penyempitan tipe tetap hidup di
         dalam closure map di bawah. */
      const ses = s.session
      if (!ses) return {}
      const cur = ses.exercises[ses.currentIdx]
      if (!cur) return {}
      const exercises = ses.exercises.map((e, i) =>
        i === ses.currentIdx
          ? { ...e, sets: [...e.sets, { weight, reps }] }
          : e,
      )
      return {
        session: {
          ...ses,
          exercises,
          restingUntil: Date.now() + SESSION_REST_MS,
          restDuration: SESSION_REST_MS,
        },
      }
    }),

  nextExercise: () =>
    set((s) => {
      if (!s.session) return {}
      return {
        session: {
          ...s.session,
          currentIdx: clampIdx(
            s.session.currentIdx + 1,
            s.session.exercises.length,
          ),
        },
      }
    }),

  prevExercise: () =>
    set((s) => {
      if (!s.session) return {}
      return {
        session: {
          ...s.session,
          currentIdx: clampIdx(
            s.session.currentIdx - 1,
            s.session.exercises.length,
          ),
        },
      }
    }),

  goToExercise: (idx) =>
    set((s) => {
      if (!s.session) return {}
      return {
        session: {
          ...s.session,
          currentIdx: clampIdx(idx, s.session.exercises.length),
        },
      }
    }),

  skipRest: () =>
    set((s) =>
      s.session ? { session: { ...s.session, restingUntil: null } } : {},
    ),

  extendRest: (sec) =>
    set((s) => {
      if (!s.session || s.session.restingUntil == null) return {}
      /* Mulai istirahat = batas akhir − durasi total; memperpanjang
         menambah KEDUANYA sehingga bar progres tetap proporsional. */
      const restStartedAt =
        s.session.restingUntil - s.session.restDuration
      const until =
        Math.max(s.session.restingUntil, Date.now()) + sec * 1000
      return {
        session: {
          ...s.session,
          restingUntil: until,
          restDuration: Math.max(1, until - restStartedAt),
        },
      }
    }),

  endSession: () => {
    const s = get().session
    if (!s) return null
    const sets = s.exercises.flatMap((e) =>
      e.sets.map((set) => ({
        exercise: e.name,
        weight: set.weight,
        reps: set.reps,
      })),
    )
    const duration = Math.max(1, Math.round((Date.now() - s.startedAt) / 60_000))
    set({ session: null })
    if (sets.length === 0) return null
    return {
      kind: 'beban' as const,
      /* v2.42: sesi tercatat pada tanggal MULAINYA — sesi gym 23.30 yang
         selesai lewat tengah malam tidak lagi lompat ke tanggal besoknya. */
      date: isoOf(new Date(s.startedAt)),
      duration,
      note: '',
      sets,
    }
  },

  reset: () => set({ session: null }),
}))

/** Mulai sesi dari praisai program/pustaka (WorkoutSeed) — beban &
 *  repetisi terakhir dari histori dipakai sebagai pra-isi stepper. */
export function startSeededSession(
  seed: WorkoutSeed[],
  workouts: Workout[],
): void {
  const items: SessionSeedItem[] = seed.map((sd) => {
    const stat = exStatOf(workouts, sd.name)
    return {
      name: sd.name,
      targetSets: sd.count,
      targetReps: sd.reps || stat.lastReps || 8,
      hintWeight: stat.lastWeight,
      hintReps: stat.lastReps,
    }
  })
  useSessionStore.getState().startSession(items)
}
