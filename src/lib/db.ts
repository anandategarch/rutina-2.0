import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

/**
 * Klien Prisma Rutina — satu titik konfigurasi untuk SEMUA lingkungan:
 *
 *  - Lokal (sandbox/dev) : DATABASE_URL=file:…  → SQLite file.
 *  - Produksi (Vercel)   : DATABASE_URL=libsql://… + DATABASE_AUTH_TOKEN
 *                          → Turso lewat driver adapter @prisma/adapter-libsql.
 *
 * Skema memakai previewFeatures=["driverAdapters"]; adapter PrismaLibSQL
 * menerima konfigurasi koneksi (bukan instance klien) dan mendukung
 * skema URL file: maupun libsql:.
 */

function createPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL ?? 'file:./db/custom.db'

  const adapter = new PrismaLibSQL({
    url,
    /* authToken diabaikan untuk file: lokal; wajib untuk Turso. */
    authToken: process.env.DATABASE_AUTH_TOKEN,
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
export const isTurso = (process.env.DATABASE_URL ?? '').startsWith('libsql:')
