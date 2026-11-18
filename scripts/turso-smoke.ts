/**
 * turso-smoke.ts — verifikasi cepat jalur PRODUKSI (Vercel):
 * Prisma + adapter PrismaLibSQL menuju Turso. Menimpa DATABASE_URL
 * dengan TURSO_DATABASE_URL dari .env.
 */
process.env.DATABASE_URL = process.env.TURSO_DATABASE_URL
process.env.DATABASE_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN

export {}

const { db } = await import('../src/lib/db')

const tables = (await db.$queryRawUnsafe(
  "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'rutina_%' ORDER BY name",
)) as { name: string }[]
console.log('[turso-smoke] Tabel rutina_* :', tables.map((t) => t.name).join(', '))

const counters: [string, () => Promise<number>][] = [
  ['habit', () => db.habit.count()],
  ['journalNote', () => db.journalNote.count()],
  ['wallet', () => db.wallet.count()],
  ['transaction', () => db.transaction.count()],
  ['workoutSession', () => db.workoutSession.count()],
  ['foodEntry', () => db.foodEntry.count()],
  ['bodyLog', () => db.bodyLog.count()],
  ['appSetting', () => db.appSetting.count()],
  ['budget', () => db.budget.count()],
  ['goal', () => db.goal.count()],
]
for (const [name, count] of counters) {
  console.log(`[turso-smoke] ${name}: ${await count()} baris`)
}
console.log('[turso-smoke] OK — jalur produksi Prisma↔Turso berfungsi.')
process.exit(0)
