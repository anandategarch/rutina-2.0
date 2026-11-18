/**
 * turso-smoke.ts — verifikasi cepat jalur PRODUKSI (Vercel):
 * Prisma + adapter PrismaLibSQL menuju Turso. Menimpa DATABASE_URL
 * dengan TURSO_DATABASE_URL dari .env.
 */
process.env.DATABASE_URL = process.env.TURSO_DATABASE_URL
process.env.DATABASE_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN

const { db } = await import('../src/lib/db')

const tables = (await db.$queryRawUnsafe(
  "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'rutina_%' ORDER BY name",
)) as { name: string }[]
console.log('[turso-smoke] Tabel rutina_* :', tables.map((t) => t.name).join(', '))

for (const model of ['habit', 'journalNote', 'wallet', 'transaction', 'workoutSession', 'foodEntry', 'bodyLog', 'appSetting', 'budget', 'goal'] as const) {
  const count = await db[model].count()
  console.log(`[turso-smoke] ${model}: ${count} baris`)
}
console.log('[turso-smoke] OK — jalur produksi Prisma↔Turso berfungsi.')
process.exit(0)
