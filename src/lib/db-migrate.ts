import { db, libsql } from '@/lib/db'

/* =====================================================================
 * Auto-migrasi skema (v2.18) — menyembuhkan drift kode ↔ database.
 *
 * Latar belakang: v2.17 menambah tabel `rutina_fin_categories` + kolom
 * `distance`/`kcal` pada `rutina_workout_sessions`, tetapi DDL-nya
 * tidak pernah sampai ke Turso produksi (kredensial push hilang dari
 * sandbox). Akibatnya seluruh query Prisma yang menyentuh tabel/kolom
 * itu gagal ("no such column") — /api/transactions, /api/workouts,
 * dan /api/state produksi mati, sehingga histori Rutina 1.0 milik
 * pengguna (yang sudah tersimpan di Turso) tampak hilang.
 *
 * Solusi: DDL idempoten dijalankan otomatis sekali per proses server
 * sebelum query pertama. Karena prisma db push membutuhkan token yang
 * saat ini tidak dimiliki sandbox, jalur ini memulihkan produksi
 * tanpa akses manual ke konsol Turso.
 *
 * Setiap pernyataan dibungkus try/catch:
 *  - "already exists" / "duplicate column" → kolom/tabel sudah ada,
 *    bukan error (idempoten).
 *  - Error lain dicatat sebagai peringatan dan TIDAK menggagalkan
 *    request — query berikutnya yang menentukan.
 * ===================================================================== */

/** DDL idempoten — hanya tambahan incremental, selaras prisma/schema.prisma.
 *  (ALTER ADD COLUMN dijalankan terpisah dengan pemeriksaan PRAGMA —
 *  lihat runDdl.) */
const DDL_STATEMENTS: string[] = [
  /* v2.17: kategori buatan pengguna — satu sistem kategori terpadu. */
  `CREATE TABLE IF NOT EXISTS "rutina_fin_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false
  )`,
  `CREATE INDEX IF NOT EXISTS "rutina_fin_categories_type_idx"
   ON "rutina_fin_categories"("type")`,
]

/** Janji tunggal per proses — pemanggil paralel berbagi satu eksekusi. */
let migratePromise: Promise<void> | null = null

/** Apakah kolom sudah ada? (PRAGMA table_info lewat klien libSQL mentah —
 *  jalur queryRaw Prisma tidak mendukung PRAGMA dan selalu melempar,
 *  membuat pemeriksaan ini dulunya selalu salah "belum ada" sehingga
 *  ALTER memicu error "duplicate column" yang berulang di log.) */
async function hasColumn(table: string, column: string): Promise<boolean> {
  try {
    const result = await libsql.execute(`PRAGMA table_info("${table}")`)
    return result.rows.some((row) => row.name === column)
  } catch {
    /* Tabel belum ada / PRAGMA tak didukung → biarkan ALTER yang bicara. */
    return false
  }
}

async function runDdl(): Promise<void> {
  /* CREATE ... IF NOT EXISTS idempoten secara native — langsung saja. */
  for (const sql of DDL_STATEMENTS) {
    try {
      await db.$executeRawUnsafe(sql)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (/already exists|duplicate column/i.test(msg)) continue
      console.warn('[db-migrate] DDL dilewati:', msg.slice(0, 160))
    }
  }
  /* ALTER ADD COLUMN tidak punya IF NOT EXISTS — cek dulu kolomnya. */
  const cardioCols: [string, string][] = [
    ['rutina_workout_sessions', 'distance'],
    ['rutina_workout_sessions', 'kcal'],
  ]
  for (const [table, column] of cardioCols) {
    if (await hasColumn(table, column)) continue
    try {
      await db.$executeRawUnsafe(
        `ALTER TABLE "${table}" ADD COLUMN "${column}" ${
          column === 'distance' ? 'REAL' : 'INTEGER'
        }`,
      )
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (/already exists|duplicate column/i.test(msg)) continue
      console.warn('[db-migrate] DDL dilewati:', msg.slice(0, 160))
    }
  }
}

/** Pastikan skema backend mutakhir — aman dipanggil berulang. */
export function ensureSchema(): Promise<void> {
  migratePromise ??= runDdl()
  return migratePromise
}
