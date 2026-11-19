import { readFullState, writeFullState } from '@/lib/sync-server'
import { MAX_TRACKED_DAYS, syncPutSchema } from '@/lib/sync-schema'
import { fail, ok, parseWith, readJson } from '@/lib/api'

/* =====================================================================
 * /api/state — endpoint sinkronisasi snapshot penuh (inti sync engine).
 *
 *  GET → { initialized, state, backend, syncedAt }
 *        initialized=false berarti dataset server belum pernah diunggah
 *        (klien boleh mengunggah data lokalnya); true berarti server
 *        adalah sumber kebenaran (klien menarik).
 *
 *  PUT → { state: SyncState } — mengganti seluruh tabel rutina_* dalam
 *        satu transaksi lalu menandai sync.initialized + lastPushAt.
 * ===================================================================== */

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await readFullState()
    return Response.json(result, {
      headers: { 'cache-control': 'no-store' },
    })
  } catch (error) {
    /* v2.16 (audit T5-b #6): pesan generik — detail error bisa membocorkan
       nama tabel/fragmen SQL; detail tetap di log server. */
    console.error('[api/state] GET gagal:', error)
    return fail('Gagal membaca state', 500)
  }
}

export async function PUT(req: Request) {
  const parsed = parseWith(syncPutSchema, await readJson(req))
  if (!parsed.ok) return fail('Muatan tidak valid', 422, parsed.issues)

  const { state } = parsed.data
  if (Object.keys(state.completions).length > MAX_TRACKED_DAYS) {
    return fail('Jumlah tanggal completions melebihi batas', 413)
  }
  if (Object.keys(state.bodyLogs).length > MAX_TRACKED_DAYS) {
    return fail('Jumlah tanggal bodyLogs melebihi batas', 413)
  }
  /* v2.16 (audit T5-b #3): dua record tanpa batas kini ikut dicek. */
  if (Object.keys(state.moodLogs).length > MAX_TRACKED_DAYS) {
    return fail('Jumlah tanggal moodLogs melebihi batas', 413)
  }
  if (Object.keys(state.budgets).length > MAX_TRACKED_DAYS) {
    return fail('Jumlah kunci budgets melebihi batas', 413)
  }

  try {
    const counts = await writeFullState(state)
    return ok({
      counts,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    /* v2.16 (audit T5-b #6): pesan generik — detail tetap di log server. */
    console.error('[api/state] PUT gagal:', error)
    return fail('Gagal menulis state', 500)
  }
}
