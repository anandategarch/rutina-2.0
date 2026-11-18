/**
 * migrate-turso-incremental.ts — migrasi skema Turso yang sudah berisi
 * data lama (tabel rutina_* versi sebelumnya) ke skema v2.1.
 *
 * Berbeda dengan push-turso.ts (DDL from-empty untuk DB segar), skrip ini
 * idempoten: memeriksa kolom/tabel yang ada lewat PRAGMA, lalu hanya
 * menambahkan yang belum ada:
 *   - rutina_habits   : restDays, afterId, mini
 *   - rutina_body_logs: soreness, stress
 *   - rutina_mood_logs: tabel baru (riwayat mood per tanggal)
 *
 * Pemakaian: set -a; source .env; set +a; bun scripts/migrate-turso-incremental.ts
 */
import { createClient } from '@libsql/client'

const url = process.env.TURSO_DATABASE_URL ?? ''
const token = process.env.TURSO_AUTH_TOKEN ?? ''
if (!url.startsWith('libsql:')) {
  console.error('[migrate] TURSO_DATABASE_URL belum diatur.')
  process.exit(1)
}

const client = createClient({ url, authToken: token })

async function columnsOf(table: string): Promise<Set<string>> {
  const res = await client.execute(`PRAGMA table_info(${table})`)
  return new Set(res.rows.map((r) => String(r.name)))
}

async function tableExists(table: string): Promise<boolean> {
  const res = await client.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`,
  )
  return res.rows.length > 0
}

interface Step {
  sql: string
  desc: string
}

async function run() {
  console.log('[migrate] Target :', url)
  const applied: string[] = []
  const skipped: string[] = []

  /* --- rutina_habits: kolom baru --- */
  const habitCols = await columnsOf('rutina_habits')
  const habitSteps: Step[] = [
    {
      desc: 'rutina_habits.restDays (Jeda Runtun Aman)',
      sql: `ALTER TABLE rutina_habits ADD COLUMN "restDays" TEXT NOT NULL DEFAULT '[]'`,
    },
    {
      desc: 'rutina_habits.afterId (Susun Kebiasaan)',
      sql: `ALTER TABLE rutina_habits ADD COLUMN "afterId" TEXT`,
    },
    {
      desc: 'rutina_habits.mini (Versi 2 Menit)',
      sql: `ALTER TABLE rutina_habits ADD COLUMN "mini" TEXT NOT NULL DEFAULT ''`,
    },
  ]
  for (const s of habitSteps) {
    const col = s.desc.split('.')[1]?.split(' ')[0]
    if (col && habitCols.has(col)) {
      skipped.push(s.desc + ' — sudah ada')
      continue
    }
    await client.execute(s.sql)
    applied.push(s.desc)
  }

  /* --- rutina_body_logs: kolom baru --- */
  const bodyCols = await columnsOf('rutina_body_logs')
  const bodySteps: Step[] = [
    {
      desc: 'rutina_body_logs.soreness (DOMS 1-5)',
      sql: `ALTER TABLE rutina_body_logs ADD COLUMN "soreness" INTEGER`,
    },
    {
      desc: 'rutina_body_logs.stress (stres 1-5)',
      sql: `ALTER TABLE rutina_body_logs ADD COLUMN "stress" INTEGER`,
    },
  ]
  for (const s of bodySteps) {
    const col = s.desc.split('.')[1]?.split(' ')[0]
    if (col && bodyCols.has(col)) {
      skipped.push(s.desc + ' — sudah ada')
      continue
    }
    await client.execute(s.sql)
    applied.push(s.desc)
  }

  /* --- rutina_mood_logs: tabel baru --- */
  if (await tableExists('rutina_mood_logs')) {
    skipped.push('rutina_mood_logs — sudah ada')
  } else {
    await client.batch(
      [
        {
          sql: `CREATE TABLE "rutina_mood_logs" ("date" TEXT NOT NULL PRIMARY KEY, "mood" TEXT NOT NULL)`,
          args: [],
        },
      ],
      'write',
    )
    applied.push('rutina_mood_logs (tabel baru)')
  }

  console.log('[migrate] Diterapkan :', applied.length ? applied.join(' | ') : '(tidak ada)')
  console.log('[migrate] Dilewati  :', skipped.length ? skipped.join(' | ') : '(tidak ada)')

  /* Verifikasi akhir: struktur yang diharapkan v2.1 */
  const finalHabit = await columnsOf('rutina_habits')
  const finalBody = await columnsOf('rutina_body_logs')
  const moodOk = await tableExists('rutina_mood_logs')
  const ok =
    ['restDays', 'afterId', 'mini'].every((c) => finalHabit.has(c)) &&
    ['soreness', 'stress'].every((c) => finalBody.has(c)) &&
    moodOk
  console.log('[migrate] Verifikasi:', ok ? 'SKEMA v2.1 LENGKAP' : 'MASIH KURANG!')
  process.exit(ok ? 0 : 1)
}

run().catch((e) => {
  console.error('[migrate] GAGAL:', e instanceof Error ? e.message : e)
  process.exit(1)
})
