/**
 * pull-production.ts — tarik snapshot penuh dari deployment PRODUKSI
 * (Vercel + Turso) lalu terapkan ke database sandbox LOKAL.
 *
 * Latar belakang: sandbox dev memakai SQLite lokal (file:) sementara
 * data asli pengguna — hasil impor Rutina 1.0 + sinkron harian — hidup
 * di Turso lewat deployment produksi. Setelah reset sandbox (db lokal
 * kembali berisi seed demo), histori asli "hilang" dari preview.
 *
 * Skrip ini:
 *   1. GET {PROD_URL}/api/state            → snapshot produksi (wire).
 *   2. Baca db lokal untuk INPUT PENGGUNA hari ini yang layak
 *      dipertahankan (bukan seed demo):
 *        - rutina_workout_sessions  → semua baris (uji template baru)
 *        - rutina_fin_categories    → semua baris (kategori buatan)
 *        - rutina_transactions      → hanya id 'tx-*' (buatan pengguna,
 *                                      bukan seed demo 'f-*')
 *   3. Gabungkan (produksi menang bentuk dasar; input lokal ditambah,
 *      dedup berdasar id).
 *   4. PUT {LOCAL_URL}/api/state           → tulis atomik ke db lokal
 *      + tandai sync.lastPushAt = sekarang, sehingga browser preview
 *      menarik data hasil gabungan saat boot berikutnya (server-menang).
 *
 * Idempoten: menjalankan ulang hanya menyegarkan snapshot dari produksi.
 *
 * Pemakaian: bun run db:pull-production
 * (dev server lokal harus berjalan di :3000 sebagai target PUT)
 */
import { createClient } from '@libsql/client'

const PROD = process.env.PROD_URL ?? 'https://rutina-2-0.vercel.app'
const LOCAL = process.env.LOCAL_URL ?? 'http://localhost:3000'
const LOCAL_DB = process.env.DATABASE_URL ?? 'file:./db/custom.db'

interface WireTx {
  id: string
  type: string
  cat: string
  amount: number
  note: string
  ts: string
  walletId?: string | null
  toWalletId?: string | null
  recurrence?: string | null
  recurOf?: string | null
}

interface WireWorkout {
  id: string
  kind: string
  date: string
  duration: number
  note: string
  sets: { exercise: string; weight: number; reps: number }[]
  distance?: number | null
  kcal?: number | null
}

interface WireCustomCat {
  id: string
  name: string
  type: string
}

/* ===== 1. Tarik snapshot produksi ===== */
console.log(`[pull-production] Sumber : ${PROD}`)
console.log(`[pull-production] Target : ${LOCAL} (${LOCAL_DB})`)

const res = await fetch(`${PROD}/api/state`, { cache: 'no-store' })
if (!res.ok) {
  console.error(`[pull-production] GET /api/state produksi gagal: HTTP ${res.status}`)
  process.exit(1)
}
const remote = (await res.json()) as {
  initialized: boolean
  state: Record<string, unknown> | null
}
if (!remote.initialized || !remote.state) {
  console.error('[pull-production] Dataset produksi belum ter-inisialisasi — berhenti.')
  process.exit(1)
}
const state = remote.state as {
  demoMode: boolean
  habits: unknown[]
  completions: Record<string, Record<string, boolean>>
  notes: unknown[]
  txs: WireTx[]
  goals: unknown[]
  wallets: unknown[]
  budgets: Record<string, number>
  customCats: WireCustomCat[]
  workouts: WireWorkout[]
  foodEntries: unknown[]
  calorieTarget: number
  bodyLogs: Record<string, unknown>
  dailyGoal: number
  mood: string | null
  moodLogs: Record<string, string>
  identityText: string
  deloadUntil: string | null
  bonusClaimed: boolean
  quoteSaved: boolean
  quoteSavedDate: string | null
}

console.log(
  `[pull-production] Produksi: ${state.habits.length} kebiasaan · ${Object.keys(state.completions).length} hari check-in · ${state.txs.length} transaksi · ${state.wallets.length} dompet · ${state.goals.length} tujuan · ${state.workouts.length} sesi latihan · ${state.customCats.length} kategori buatan`,
)

/* ===== 2. Input lokal yang dipertahankan ===== */
const local = createClient({ url: LOCAL_DB })

const localWorkouts = (
  await local.execute('SELECT id, kind, date, duration, note, sets, distance, kcal FROM rutina_workout_sessions')
).rows as unknown as {
  id: string
  kind: string
  date: string
  duration: number
  note: string
  sets: string
  distance: number | null
  kcal: number | null
}[]

const localCats = (
  await local.execute('SELECT id, name, type FROM rutina_fin_categories WHERE archived = 0')
).rows as unknown as WireCustomCat[]

const localTxs = (
  await local.execute(
    "SELECT id, type, cat, amount, note, ts, walletId, toWalletId, recurrence, recurOf FROM rutina_transactions WHERE id LIKE 'tx-%'",
  )
).rows as unknown as WireTx[]

console.log(
  `[pull-production] Lokal   : ${localWorkouts.length} sesi latihan · ${localCats.length} kategori buatan · ${localTxs.length} transaksi pengguna (tx-*) dipertahankan`,
)

/* ===== 3. Gabungkan (dedup per id, produksi dulu) ===== */
const mergeById = <T extends { id: string }>(base: T[], extra: T[]): T[] => {
  const seen = new Set(base.map((x) => x.id))
  return [...base, ...extra.filter((x) => !seen.has(x.id))]
}

const merged: typeof state = {
  ...state,
  workouts: mergeById(
    state.workouts,
    localWorkouts.map((w) => ({
      id: w.id,
      kind: w.kind,
      date: w.date,
      duration: w.duration,
      note: w.note ?? '',
      sets: JSON.parse(w.sets || '[]') as WireWorkout['sets'],
      distance: w.distance ?? null,
      kcal: w.kcal ?? null,
    })),
  ),
  customCats: mergeById(state.customCats, localCats),
  txs: mergeById(state.txs, localTxs),
}

console.log(
  `[pull-production] Gabungan: ${merged.habits.length} kebiasaan · ${merged.txs.length} transaksi · ${merged.workouts.length} sesi latihan · ${merged.customCats.length} kategori buatan`,
)

/* ===== 4. PUT ke server lokal (atomik + lastPushAt=now) ===== */
const put = await fetch(`${LOCAL}/api/state`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ state: merged }),
})
if (!put.ok) {
  const body = await put.text()
  console.error(`[pull-production] PUT lokal gagal: HTTP ${put.status} — ${body.slice(0, 300)}`)
  process.exit(1)
}
const result = (await put.json()) as { ok: boolean; data?: { counts?: Record<string, number>; syncedAt?: string } }
console.log(
  `[pull-production] Selesai: ${JSON.stringify(result.data?.counts ?? {})} · syncedAt ${result.data?.syncedAt ?? '-'}`,
)
console.log('[pull-production] Browser preview akan menarik data ini saat dimuat ulang (server-menang).')
