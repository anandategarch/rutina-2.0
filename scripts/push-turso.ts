/**
 * push-turso.ts — sinkronisasi skema Prisma ke database Turso.
 *
 * Prisma CLI tidak dapat terhubung langsung ke URL libsql://, maka DDL
 * dihasilkan lewat `prisma migrate diff` (lihat skrip db:sql) lalu
 * dieksekusi di sini memakai @libsql/client.
 *
 * Pemakaian:
 *   bun run db:push-turso
 *
 * Variabel lingkungan (bisa lewat .env):
 *   TURSO_DATABASE_URL  wajib  — libsql://…turso.io
 *   TURSO_AUTH_TOKEN    wajib  — token akses database
 */
import { createClient } from '@libsql/client'
import { readFileSync, existsSync } from 'node:fs'

const SCHEMA_FILE = 'db/turso-schema.sql'

const url =
  process.env.TURSO_DATABASE_URL ??
  (process.env.DATABASE_URL?.startsWith('libsql:') ? process.env.DATABASE_URL : '')
const token = process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN ?? ''

if (!url.startsWith('libsql:')) {
  console.error(
    '[push-turso] TURSO_DATABASE_URL belum diatur (harus diawali libsql://). ' +
      'Isi di .env lalu jalankan ulang.',
  )
  process.exit(1)
}
if (!token) {
  console.error('[push-turso] TURSO_AUTH_TOKEN belum diatur. Isi di .env lalu jalankan ulang.')
  process.exit(1)
}
if (!existsSync(SCHEMA_FILE)) {
  console.error(
    `[push-turso] ${SCHEMA_FILE} tidak ditemukan — jalankan "bun run db:sql" terlebih dahulu.`,
  )
  process.exit(1)
}

/* Pecah DDL menjadi pernyataan individual:
   1. buang baris komentar (-- …),
   2. pisahkan pernyataan pada titik-koma. */
const statements = readFileSync(SCHEMA_FILE, 'utf8')
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0)

const client = createClient({ url, authToken: token })

console.log(`[push-turso] Target : ${url}`)
console.log(`[push-turso] DDL    : ${statements.length} pernyataan dari ${SCHEMA_FILE}`)

try {
  await client.batch(statements.map((sql) => ({ sql, args: [] })), 'write')
  console.log('[push-turso] Skema diterapkan.')

  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )
  console.log(
    `[push-turso] Tabel (${tables.rows.length}):`,
    tables.rows.map((r) => r.name).join(', '),
  )
  console.log('[push-turso] Selesai.')
} catch (error) {
  console.error('[push-turso] GAGAL:', error instanceof Error ? error.message : error)
  process.exit(1)
}
