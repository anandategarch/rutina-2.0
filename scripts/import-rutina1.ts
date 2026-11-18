/**
 * import-rutina1.ts — impor satu kali data Rutina 1.0 → tabel Rutina 2.0.
 *
 * Latar belakang: database Turso yang sama masih menyimpan tabel lawas
 * aplikasi Rutina 1.0 (`habits`, `habit_checkins`, `habit_metadata`,
 * `transactions`, `workspace_modules`, …). Rutina 2.0 hanya membaca tabel
 * `rutina_*` miliknya sendiri, sehingga data lama pengguna tidak pernah
 * tampil ("kenapa kok enggak import data kebiasaan atau keuangan dari
 * turso?").
 *
 * Skrip ini membaca tabel lawas, memetakan ke skema 2.0, lalu menulis
 * dengan INSERT OR REPLACE (aman dijalankan ulang / idempoten):
 *
 *   habits          → rutina_habits        (cat: Personal→Pribadi,
 *                        Learning→Belajar, Health→Kesehatan; jadwal dari
 *                        habit_metadata.payload.schedule)
 *   habit_checkins  → rutina_habit_logs    (id deterministik habit:date)
 *   transactions    → rutina_transactions  (expense→keluar, income→masuk;
 *                        kategori lama dipetakan ke FinCat 2.0 karena
 *                        CAT_META[cat] dipakai tanpa fallback di UI)
 *   workspace_modules:
 *     finance.wallets      → rutina_wallets  (hanya dompet yang dirujuk tx)
 *     finance.wallet_id    → UPDATE walletId pada rutina_transactions
 *     finance.savingsGoals → rutina_goals
 *     finance.recurring    → templat transaksi berulang (bulanan)
 *     checkins             → rutina_mood_logs + rutina_body_logs (tidur/energi)
 *     wellness             → rutina_body_logs (air ml→gelas, berat)
 *
 * Semua penulisan dikemas dalam client.batch() (satu request HTTP per
 * ~150 statement) dengan retry — menghormati batas kapasitas Turso.
 *
 * Di akhir: tandai sync.initialized + perbarui sync.lastPushAt sehingga
 * klien yang boot berikutnya memperlakukan server sebagai sumber terbaru
 * (kebijakan server-menang) dan menarik data hasil impor.
 *
 * Pemakaian:  bun run db:import-rutina1
 */
import { createClient, type InValue } from '@libsql/client'

const url = process.env.TURSO_DATABASE_URL ?? ''
const token = process.env.TURSO_AUTH_TOKEN ?? ''

if (!url.startsWith('libsql:')) {
  console.error(
    '[import-rutina1] TURSO_DATABASE_URL belum diatur (harus libsql://…).',
  )
  process.exit(1)
}
if (!token) {
  console.error('[import-rutina1] TURSO_AUTH_TOKEN belum diatur.')
  process.exit(1)
}

/* ===== Pemetaan kategori Rutina 1.0 → FinCat Rutina 2.0 =====
   Wajib: UI 2.0 membaca CAT_META[cat].icon tanpa fallback, sehingga
   kategori tak dikenal akan merusak render. Nama lama diseragamkan. */
const CAT_MAP: Record<string, string> = {
  /* makan & minum */
  Kopi: 'makan',
  'Makanan Berat': 'makan',
  Jajan: 'makan',
  Cathering: 'makan',
  /* transportasi */
  Bensin: 'transport',
  Parkir: 'transport',
  'Pajak Motor': 'transport',
  'Servis Motor': 'transport',
  /* belanja */
  Belanja: 'belanja',
  Loundry: 'belanja',
  /* hiburan */
  Hiburan: 'hiburan',
  Dating: 'hiburan',
  Badminton: 'hiburan',
  /* tagihan */
  'Tagihan & Utilitas': 'tagihan',
  'Tagihan Air': 'tagihan',
  'Tagihan Listrik': 'tagihan',
  'Pulsa & Paket Data': 'tagihan',
  /* kesehatan */
  Kesehatan: 'kesehatan',
  'Skin Care': 'kesehatan',
  'Potong Rambut': 'kesehatan',
  /* pemasukan */
  Gaji: 'gaji',
  Investasi: 'lainnya',
  'Lainnya (Pemasukan)': 'lainnya',
  /* lain-lain */
  Lainnya: 'lainnya',
  Hutang: 'lainnya',
  'Iuran Kas': 'lainnya',
  'Tak Terduga': 'lainnya',
  Pendidikan: 'lainnya',
}

/* Pemetaan kategori kebiasaan lama (inggris) → HabitCat 2.0. */
const HABIT_CAT_MAP: Record<string, string> = {
  Personal: 'Pribadi',
  Learning: 'Belajar',
  Health: 'Kesehatan',
}

const client = createClient({ url, authToken: token })

type Stmt = { sql: string; args: InValue[] }

/** Jalankan daftar statement dalam batch ter-chunk + retry backoff
 *  (batas kapasitas Turso free-tier bisa sementara menolak request). */
async function runBatch(stmts: Stmt[]): Promise<void> {
  const CHUNK = 150
  for (let i = 0; i < stmts.length; i += CHUNK) {
    const chunk = stmts.slice(i, i + CHUNK)
    for (let attempt = 1; ; attempt++) {
      try {
        await client.batch(chunk, 'write')
        break
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        const transient = /capacity|temporarily|busy|overloaded/i.test(msg)
        if (transient && attempt < 5) {
          const wait = attempt * 4000
          console.log(
            `[import-rutina1] Batch ditolak sementara (percobaan ${attempt}) — tunggu ${wait} ms…`,
          )
          await new Promise((r) => setTimeout(r, wait))
          continue
        }
        throw error
      }
    }
  }
}

console.log(`[import-rutina1] Target: ${url}`)

/* ===== 1. Baca tabel lawas (9 request baca) ===== */
const [habitsRes, metaRes, checkinRes, txRes, metaTxRes, modulesRes] =
  await Promise.all([
    client.execute('SELECT id, title, category, time, created_at FROM habits'),
    client.execute('SELECT habit_id, payload FROM habit_metadata'),
    client.execute('SELECT habit_id, completed_on FROM habit_checkins'),
    client.execute(
      'SELECT id, title, category, type, amount, transaction_date FROM transactions',
    ),
    client.execute(
      'SELECT transaction_id, wallet_id FROM transaction_metadata WHERE wallet_id IS NOT NULL',
    ),
    client.execute('SELECT module_key, payload FROM workspace_modules'),
  ])

interface OldHabit {
  id: string
  title: string
  category: string | null
  time: string | null
  created_at: string
}
const oldHabits = habitsRes.rows as unknown as OldHabit[]
const oldMeta = metaRes.rows as unknown as { habit_id: string; payload: string }[]
const oldCheckins = checkinRes.rows as unknown as {
  habit_id: string
  completed_on: string
}[]
const oldTxs = txRes.rows as unknown as {
  id: string
  title: string | null
  category: string | null
  type: string | null
  amount: number
  transaction_date: string | null
}[]
const txMeta = metaTxRes.rows as unknown as {
  transaction_id: string
  wallet_id: string
}[]
const modules = modulesRes.rows as unknown as {
  module_key: string
  payload: string
}[]

console.log(
  `[import-rutina1] Sumber: ${oldHabits.length} kebiasaan · ${oldCheckins.length} check-in · ${oldTxs.length} transaksi`,
)

if (oldHabits.length === 0 && oldTxs.length === 0) {
  console.log('[import-rutina1] Tidak ada data lama untuk diimpor — berhenti tanpa perubahan.')
  process.exit(0)
}

/* Metadata jadwal per habit (payload JSON). */
interface OldSchedule {
  kind?: string
  days?: number[]
}
const metaByHabit = new Map<string, OldSchedule>()
for (const m of oldMeta) {
  try {
    metaByHabit.set(m.habit_id, JSON.parse(m.payload) as OldSchedule)
  } catch {
    /* payload rusak → jatuh ke default harian */
  }
}

/* Modul workspace lama. */
const moduleBy = new Map<string, unknown>()
for (const mod of modules) {
  try {
    moduleBy.set(mod.module_key, JSON.parse(mod.payload))
  } catch {
    /* payload rusak → modul dilewati */
  }
}

/* ===== 2. Susun semua statement tulis ===== */
const writes: Stmt[] = []

/* Kebiasaan → rutina_habits */
for (const h of oldHabits) {
  const sched = metaByHabit.get(h.id)
  let days = [0, 1, 2, 3, 4, 5, 6]
  if (sched?.kind === 'weekly' && Array.isArray(sched.days) && sched.days.length > 0) {
    const d = [...new Set(sched.days)].filter((x) => x >= 0 && x <= 6).sort()
    if (d.length > 0) days = d
  }
  const createdAt = (h.created_at ?? '').slice(0, 10) || '2026-01-01'
  writes.push({
    sql: `INSERT OR REPLACE INTO rutina_habits
          (id, title, desc, cat, schedule, weeklyTarget, reminder, restDays, afterId, mini, archived, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, '[]', NULL, '', 0, ?)`,
    args: [
      h.id,
      h.title,
      '',
      HABIT_CAT_MAP[h.category ?? ''] ?? 'Kebiasaan',
      JSON.stringify(days),
      days.length,
      h.time && /^\d{2}:\d{2}$/.test(h.time) ? h.time : null,
      createdAt,
    ],
  })
}

/* Check-in → rutina_habit_logs (id deterministik → idempoten). */
const habitIds = new Set(oldHabits.map((h) => h.id))
for (const c of oldCheckins) {
  if (!habitIds.has(c.habit_id)) continue
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.completed_on ?? '')) continue
  writes.push({
    sql: `INSERT OR REPLACE INTO rutina_habit_logs (id, habitId, date) VALUES (?, ?, ?)`,
    args: [`${c.habit_id}:${c.completed_on}`, c.habit_id, c.completed_on],
  })
}

/* Transaksi → rutina_transactions */
let skipped = 0
for (const t of oldTxs) {
  if (t.type !== 'expense' && t.type !== 'income') {
    skipped++
    continue
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.transaction_date ?? '')) {
    skipped++
    continue
  }
  writes.push({
    sql: `INSERT OR REPLACE INTO rutina_transactions
          (id, type, cat, amount, note, ts, walletId, toWalletId, recurrence, recurOf)
          VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL)`,
    args: [
      t.id,
      t.type === 'expense' ? 'keluar' : 'masuk',
      CAT_MAP[t.category ?? ''] ?? 'lainnya',
      Math.max(0, Math.round(t.amount ?? 0)),
      (t.title ?? '').slice(0, 500),
      t.transaction_date,
    ],
  })
}

/* Dompet lama (hanya yang dirujuk transaksi) + tautan walletId tx. */
interface OldWallet {
  id: string
  name: string
  openingBalance?: number
}
interface OldSavingsGoal {
  id: string
  title: string
  targetAmount?: number
  savedAmount?: number
}
interface OldRecurring {
  id: string
  title: string
  amount: number
  type?: string
  category?: string
  nextDate?: string
  active?: boolean
}
const referencedWallets = new Set(txMeta.map((m) => m.wallet_id))
const oldFinance = (moduleBy.get('finance') ?? {}) as {
  wallets?: OldWallet[]
  savingsGoals?: OldSavingsGoal[]
  recurring?: OldRecurring[]
}

let walletRows = 0
for (const w of oldFinance.wallets ?? []) {
  if (!referencedWallets.has(w.id)) continue
  writes.push({
    sql: `INSERT OR REPLACE INTO rutina_wallets (id, name, initial) VALUES (?, ?, ?)`,
    args: [w.id, w.name.slice(0, 60), Math.max(0, Math.round(w.openingBalance ?? 0))],
  })
  walletRows++
}
let linked = 0
for (const m of txMeta) {
  if (!referencedWallets.has(m.wallet_id)) continue
  writes.push({
    sql: `UPDATE rutina_transactions SET walletId = ? WHERE id = ?`,
    args: [m.wallet_id, m.transaction_id],
  })
  linked++
}

/* Goals tabungan lama → rutina_goals. */
let goalRows = 0
for (const g of oldFinance.savingsGoals ?? []) {
  if (!g.id || !g.title) continue
  writes.push({
    sql: `INSERT OR REPLACE INTO rutina_goals (id, name, target, saved) VALUES (?, ?, ?, ?)`,
    args: [
      g.id.slice(0, 64),
      g.title.slice(0, 120),
      Math.max(0, Math.round(g.targetAmount ?? 0)),
      Math.max(0, Math.round(g.savedAmount ?? 0)),
    ],
  })
  goalRows++
}

/* Transaksi berulang aktif → templat bulanan (materializeRecurring
   membuat salinan saat jatuh tempo; ts = jadwal berikutnya). */
const RECUR_CAT_MAP: Record<string, string> = {
  Lifestyle: 'hiburan',
  Penghasilan: 'gaji',
}
let recurRows = 0
for (const r of oldFinance.recurring ?? []) {
  if (r.active === false) continue
  if (!r.id || !r.title || !r.nextDate) continue
  const type = r.type === 'income' ? 'masuk' : 'keluar'
  const cat =
    RECUR_CAT_MAP[r.category ?? ''] ?? (type === 'masuk' ? 'gaji' : 'lainnya')
  writes.push({
    sql: `INSERT OR REPLACE INTO rutina_transactions
          (id, type, cat, amount, note, ts, walletId, toWalletId, recurrence, recurOf)
          VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 'bulanan', NULL)`,
    args: [
      `imp-rc-${r.id}`.slice(0, 64),
      type,
      cat,
      Math.max(0, Math.round(r.amount ?? 0)),
      r.title.slice(0, 500),
      r.nextDate,
    ],
  })
  recurRows++
}

/* Check-in harian lama → moodLogs + bodyLogs (gabung per tanggal). */
interface OldCheckin {
  date: string
  mood?: number
  energy?: number
  sleepHours?: number
}
interface OldWellness {
  date: string
  waterMl?: number | null
  weightKg?: number | null
}
const MOOD_NAMES: Record<number, string> = {
  5: 'Ceria',
  4: 'Baik',
  3: 'Biasa',
  2: 'Lelah',
  1: 'Lelah',
}
const oldWsCheckins = (moduleBy.get('checkins') ?? []) as OldCheckin[]
const oldWsWellness = (moduleBy.get('wellness') ?? []) as OldWellness[]
const byDate = new Map<
  string,
  { mood?: string; sleepH?: number; energy?: number; water?: number; weight?: number }
>()
for (const c of oldWsCheckins) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date ?? '')) continue
  const row = byDate.get(c.date) ?? {}
  if (c.mood != null && c.mood >= 1 && c.mood <= 5) row.mood = MOOD_NAMES[c.mood]
  if (c.sleepHours != null) row.sleepH = Math.min(24, Math.max(0, c.sleepHours))
  if (c.energy != null) row.energy = Math.min(5, Math.max(1, Math.round(c.energy)))
  byDate.set(c.date, row)
}
for (const w of oldWsWellness) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(w.date ?? '')) continue
  const row = byDate.get(w.date) ?? {}
  if (w.waterMl != null)
    row.water = Math.min(50, Math.max(0, Math.round(w.waterMl / 250)))
  if (w.weightKg != null && w.weightKg > 0) row.weight = w.weightKg
  byDate.set(w.date, row)
}
let moodRows = 0
let bodyRows = 0
for (const [date, row] of byDate) {
  if (row.mood) {
    writes.push({
      sql: `INSERT OR REPLACE INTO rutina_mood_logs (date, mood) VALUES (?, ?)`,
      args: [date, row.mood],
    })
    moodRows++
  }
  writes.push({
    sql: `INSERT OR REPLACE INTO rutina_body_logs
          (date, water, weight, sleepH, energy, soreness, stress)
          VALUES (?, ?, ?, ?, ?, NULL, NULL)`,
    args: [date, row.water ?? 0, row.weight ?? null, row.sleepH ?? null, row.energy ?? null],
  })
  bodyRows++
}

/* ===== 3. Eksekusi semua tulisan (batch) ===== */
console.log(`[import-rutina1] Menulis ${writes.length} statement dalam batch…`)
await runBatch(writes)

/* ===== 4. Tandai dataset ter-inisialisasi + segarkan lastPushAt ===== */
const now = new Date().toISOString()
await client.batch(
  [
    {
      sql: `INSERT INTO rutina_app_settings (key, value) VALUES ('sync.initialized', 'true')
            ON CONFLICT(key) DO UPDATE SET value = 'true'`,
      args: [],
    },
    {
      sql: `INSERT INTO rutina_app_settings (key, value) VALUES ('sync.lastPushAt', ?)
            ON CONFLICT(key) DO UPDATE SET value = ?`,
      args: [now, now],
    },
  ],
  'write',
)

/* ===== Ringkasan ===== */
const verify = await client.execute(
  `SELECT (SELECT COUNT(*) FROM rutina_habits) habits,
          (SELECT COUNT(*) FROM rutina_habit_logs) logs,
          (SELECT COUNT(*) FROM rutina_transactions) txs,
          (SELECT COUNT(*) FROM rutina_wallets) wallets,
          (SELECT COUNT(*) FROM rutina_goals) goals,
          (SELECT COUNT(*) FROM rutina_mood_logs) moods,
          (SELECT COUNT(*) FROM rutina_body_logs) bodies`,
)
console.log(
  `[import-rutina1] Impor selesai: ${oldHabits.length} kebiasaan · ${oldCheckins.length} check-in · ${oldTxs.length} transaksi (${skipped} dilewati)`,
)
console.log(
  `[import-rutina1] Modul: ${walletRows} dompet (${linked} tx ter-taut) · ${goalRows} goals · ${recurRows} berulang · ${moodRows} mood · ${bodyRows} body log`,
)
console.log(`[import-rutina1] Verifikasi tabel: ${JSON.stringify(verify.rows[0])}`)
console.log(`[import-rutina1] sync.lastPushAt = ${now} — klien berikutnya akan menarik data ini.`)
