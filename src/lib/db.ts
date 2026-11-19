import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient, type Client } from '@libsql/client'

/**
 * Klien Prisma Rutina — satu titik konfigurasi untuk SEMUA lingkungan:
 *
 *  - Lokal (sandbox/dev) : SQLite file.
 *  - Produksi (Vercel)   : Turso lewat driver adapter @prisma/adapter-libsql.
 *
 * URUTAN RESOLUSI koneksi (variabel pertama yang ada menang):
 *   1. TURSO_DATABASE_URL / TURSO_AUTH_TOKEN   — kredensial Turso
 *      terverifikasi (dipakai skrip db:push-turso & db:smoke-turso).
 *   2. DATABASE_URL / DATABASE_AUTH_TOKEN      — konvensi Vercel.
 *   3. Default file:./db/custom.db             — dev lokal segar.
 *
 * Urutan ini sengaja: di sandbox, shell platform masih mengekspor
 * DATABASE_URL=file:… warisan; kredensial Turso di .env harus menang.
 * Di Vercel, TURSO_* tidak diset sehingga DATABASE_* dipakai normal.
 */

function resolveDatabaseConfig(): { url: string; authToken?: string } {
  const url =
    process.env.TURSO_DATABASE_URL ??
    process.env.DATABASE_URL ??
    'file:./db/custom.db'
  const authToken =
    process.env.TURSO_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN
  return { url, authToken }
}

/** Koneksi libSQL mentah — dipakai PrismaLibSQL adapter sekaligus
 *  eksekusi sistem (PRAGMA) yang tidak didukung jalur queryRaw Prisma
 *  (lihat db-migrate.ts). Satu koneksi bersama, tanpa duplikasi. */
function createLibsql(): Client {
  const { url, authToken } = resolveDatabaseConfig()
  /* authToken diabaikan untuk file: lokal; wajib untuk Turso. */
  return createClient(authToken ? { url, authToken } : { url })
}

const globalForLibsql = globalThis as unknown as {
  rutinaLibsql: Client | undefined
}

export const libsql = globalForLibsql.rutinaLibsql ?? createLibsql()

if (process.env.NODE_ENV !== 'production') globalForLibsql.rutinaLibsql = libsql

function createPrisma(): PrismaClient {
  const { url, authToken } = resolveDatabaseConfig()
  return new PrismaClient({
    /* Adapter 6.19 menerima konfigurasi (bukan instance klien) — koneksi
       Prisma dan klien mentah libsql di atas berbagi konfigurasi yang
       sama, file database identik. */
    adapter: new PrismaLibSQL({ url, authToken }),
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/** True bila terhubung ke Turso (produksi), false bila SQLite lokal. */
export const isTurso = resolveDatabaseConfig().url.startsWith('libsql:')
