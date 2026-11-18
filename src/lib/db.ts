import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

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

function createPrisma(): PrismaClient {
  const { url, authToken } = resolveDatabaseConfig()

  const adapter = new PrismaLibSQL({
    url,
    /* authToken diabaikan untuk file: lokal; wajib untuk Turso. */
    authToken,
  })

  return new PrismaClient({
    adapter,
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
