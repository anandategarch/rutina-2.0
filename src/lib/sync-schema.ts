import { z } from 'zod'

/* =====================================================================
 * Skema wire sinkronisasi — bentuk data yang dipertukarkan klien ↔ API
 * (GET/PUT /api/state dan route domain lain).
 *
 * Selaras dengan state domain store Zustand (partialize di
 * src/components/rutina-mobile/store.ts), tetapi didefinisikan mandiri
 * di sini agar lapisan server tidak mengimpor modul klien. Zod dipakai
 * untuk memvalidasi muatan PUT — endpoint ini publik, jadi setiap
 * pernyataan diberi batas wajar (panjang string, jumlah item) untuk
 * menolak muatan sampah.
 * ===================================================================== */

/** Kunci tabel rutina_app_settings — preferensi + penanda sinkronisasi. */
export const SYNC_SETTING_KEYS = {
  demoMode: 'app.demoMode',
  calorieTarget: 'app.calorieTarget',
  dailyGoal: 'app.dailyGoal',
  mood: 'app.mood',
  bonusClaimed: 'app.bonusClaimed',
  quoteSaved: 'app.quoteSaved',
  /** Suara Identitas — teks identitas personal pengguna. */
  identityText: 'app.identityText',
  /** Batas akhir deload (ISO) — string kosong bila tidak aktif. */
  deloadUntil: 'app.deloadUntil',
  /** Tanggal kutipan harian terakhir yang disimpan. */
  quoteSavedDate: 'app.quoteSavedDate',
  /** Penanda "dataset pernah diunggah" — dasar kebijakan server-menang. */
  initialized: 'sync.initialized',
  lastPushAt: 'sync.lastPushAt',
  lastPullAt: 'sync.lastPullAt',
} as const

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'tanggal harus ISO yyyy-mm-dd')

/* ===== Domain: kebiasaan ===== */

export const habitSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  desc: z.string().max(4000),
  cat: z.string().min(1).max(32),
  /** JSON number[] di DB; array di wire. */
  schedule: z.array(z.number().int().min(0).max(6)).max(7),
  weeklyTarget: z.number().int().min(1).max(7),
  reminder: z.string().max(5).nullable(),
  /** Jeda Runtun Aman — tanggal jeda terjadwal. */
  restDays: z.array(isoDate).max(400).default([]),
  /** Susun Kebiasaan — id kebiasaan pemicu. */
  afterId: z.string().max(64).nullable().default(null),
  /** Versi 2 Menit — bentuk terkecil kebiasaan. */
  mini: z.string().max(300).default(''),
  archived: z.boolean(),
  createdAt: isoDate,
})
export const habitInputSchema = habitSchema.omit({ id: true, archived: true, createdAt: true })
export const habitPatchSchema = habitInputSchema.partial()

/** completions[tanggalISO][habitId] = true */
export const completionsSchema = z.record(
  isoDate,
  z.record(z.string().min(1).max(64), z.boolean()),
)

/* ===== Domain: jurnal ===== */

export const noteSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().max(200),
  body: z.string().max(20_000),
  /** Disimpan verbatim (bisa label tampilan seperti "15 Jun"/"Hari ini"). */
  date: z.string().max(24),
  pinned: z.boolean(),
  tone: z.number().int().min(0).max(2),
  folder: z.string().min(1).max(16),
})
export const noteInputSchema = noteSchema.omit({ id: true, tone: true })
export const notePatchSchema = noteSchema.omit({ id: true }).partial()

/* ===== Domain: keuangan ===== */

export const txSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(['masuk', 'keluar', 'transfer']),
  cat: z.string().min(1).max(32),
  amount: z.number().int().min(0).max(1_000_000_000_000),
  note: z.string().max(500),
  ts: isoDate,
  walletId: z.string().max(64).nullable().optional(),
  toWalletId: z.string().max(64).nullable().optional(),
  recurrence: z.enum(['mingguan', 'bulanan']).nullable().optional(),
  recurOf: z.string().max(64).nullable().optional(),
})
/** Input POST — id & tanggal dibuat server bila absen. */
export const txInputSchema = txSchema.omit({ id: true }).extend({
  ts: isoDate.optional(),
})

export const walletSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(60),
  initial: z.number().int().min(0).max(1_000_000_000_000),
})
export const walletInputSchema = walletSchema.omit({ id: true })

export const budgetsSchema = z.record(
  z.string().min(1).max(32),
  z.number().int().min(0).max(1_000_000_000_000),
)

export const goalSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  target: z.number().int().min(0).max(1_000_000_000_000),
  saved: z.number().int().min(0).max(1_000_000_000_000),
})
export const goalInputSchema = goalSchema.omit({ id: true, saved: true })
export const goalPatchSchema = goalSchema.omit({ id: true }).partial()

/* ===== Domain: bugar ===== */

export const workoutSetSchema = z.object({
  exercise: z.string().min(1).max(120),
  weight: z.number().min(0).max(1000),
  reps: z.number().int().min(0).max(1000),
})

export const workoutSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(['beban', 'jalan', 'lari']),
  date: isoDate,
  duration: z.number().int().min(0).max(1440),
  note: z.string().max(500),
  /** JSON WorkoutSet[] di DB; array di wire. */
  sets: z.array(workoutSetSchema).max(60),
  distance: z.number().min(0).max(1000).nullable().optional(),
})
/** Input POST — id & tanggal dibuat server bila absen. */
export const workoutInputSchema = workoutSchema.omit({ id: true }).extend({
  date: isoDate.optional(),
})
export const workoutPatchSchema = workoutSchema.omit({ id: true }).partial()

export const foodEntrySchema = z.object({
  id: z.string().min(1).max(64),
  date: isoDate,
  name: z.string().min(1).max(120),
  cat: z.string().min(1).max(60),
  unit: z.string().min(1).max(40),
  portion: z.number().min(0).max(100),
  meal: z.string().min(1).max(20),
  kcal: z.number().int().min(0).max(100_000),
  protein: z.number().min(0).max(10_000).nullable(),
  carb: z.number().min(0).max(10_000).nullable(),
  fat: z.number().min(0).max(10_000).nullable(),
})
/** Input POST — id & tanggal dibuat server bila absen. */
export const foodEntryInputSchema = foodEntrySchema.omit({ id: true }).extend({
  date: isoDate.optional(),
})
export const foodEntryPatchSchema = foodEntrySchema.omit({ id: true }).partial()

/** bodyLogs[tanggalISO] — satu catatan per hari. */
export const bodyLogSchema = z.object({
  water: z.number().int().min(0).max(50),
  weight: z.number().min(0).max(500).nullable().optional(),
  sleepH: z.number().min(0).max(24).nullable().optional(),
  energy: z.number().int().min(1).max(5).nullable().optional(),
  /** DOMS / nyeri otot 1–5. */
  soreness: z.number().int().min(1).max(5).nullable().optional(),
  /** Stres 1–5. */
  stress: z.number().int().min(1).max(5).nullable().optional(),
})
export const bodyLogsSchema = z.record(isoDate, bodyLogSchema)

/** moodLogs[tanggalISO] = nama mood — histori wellness per tanggal. */
export const moodLogsSchema = z.record(isoDate, z.string().min(1).max(24))

/* ===== Snapshot penuh ===== */

export const syncStateSchema = z.object({
  demoMode: z.boolean(),
  habits: z.array(habitSchema).max(500),
  completions: completionsSchema,
  notes: z.array(noteSchema).max(2000),
  txs: z.array(txSchema).max(10_000),
  goals: z.array(goalSchema).max(200),
  wallets: z.array(walletSchema).max(50),
  budgets: budgetsSchema,
  workouts: z.array(workoutSchema).max(5000),
  foodEntries: z.array(foodEntrySchema).max(10_000),
  calorieTarget: z.number().int().min(500).max(20_000),
  bodyLogs: bodyLogsSchema,
  dailyGoal: z.number().int().min(1).max(20),
  mood: z.string().max(24).nullable(),
  /** Riwayat mood per tanggal (Rutina lama: DailyLog). */
  moodLogs: moodLogsSchema.default({}),
  /** Suara Identitas — teks identitas personal. */
  identityText: z.string().max(600).default(''),
  /** Batas akhir deload (ISO), null bila tidak aktif. */
  deloadUntil: isoDate.nullable().default(null),
  bonusClaimed: z.boolean(),
  quoteSaved: z.boolean(),
  /** Tanggal kutipan harian terakhir disimpan. */
  quoteSavedDate: isoDate.nullable().default(null),
})

/** Muatan PUT /api/state — { state: SyncState }. */
export const syncPutSchema = z.object({ state: syncStateSchema })

/** Bentuk TypeScript snapshot (hasil inferensi Zod). */
export type SyncState = z.infer<typeof syncStateSchema>
export type HabitWire = z.infer<typeof habitSchema>
export type NoteWire = z.infer<typeof noteSchema>
export type TxWire = z.infer<typeof txSchema>
export type WalletWire = z.infer<typeof walletSchema>
export type GoalWire = z.infer<typeof goalSchema>
export type WorkoutWire = z.infer<typeof workoutSchema>
export type FoodEntryWire = z.infer<typeof foodEntrySchema>
export type BodyLogWire = z.infer<typeof bodyLogSchema>

/** Batas jumlah tanggal pada completions/bodyLogs (tolak muatan raksasa). */
export const MAX_TRACKED_DAYS = 4000
