import { z } from 'zod'
import { db } from '@/lib/db'
import { SYNC_SETTING_KEYS } from '@/lib/sync-schema'
import { fail, guard, ok, parseWith, readJson } from '@/lib/api'

/* /api/settings — preferensi aplikasi (tabel rutina_app_settings, kunci
 * app.*). Kunci sync.* dikelola /api/state — tidak boleh diutak-atik di
 * sini.
 *
 * GET → { settings: Record<kunci, nilai> }
 * PUT { settings } → upsert massal (maks. 50 kunci app.*) */

export const dynamic = 'force-dynamic'

const allowedKey = z
  .string()
  .min(3)
  .max(48)
  .regex(/^app\.[A-Za-z0-9_.-]+$/, 'kunci harus diawali "app."')

const putSchema = z.object({
  settings: z.record(allowedKey, z.string().max(2000)).refine(
    (s) => Object.keys(s).length <= 50,
    'maksimal 50 kunci sekali tulis',
  ),
})

export async function GET() {
  return guard(async () => {
    const rows = await db.appSetting.findMany()
    const settings: Record<string, string> = {}
    for (const r of rows) {
      if (r.key.startsWith('app.')) settings[r.key] = r.value
    }
    return ok({ settings })
  })
}

export async function PUT(req: Request) {
  const parsed = parseWith(putSchema, await readJson(req))
  if (!parsed.ok) return fail('Muatan tidak valid', 422, parsed.issues)
  const entries = Object.entries(parsed.data.settings)

  return guard(async () => {
    await db.$transaction(
      entries.map(([key, value]) =>
        db.appSetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    )
    /* Balkon kunci yang dikenali aplikasi agar klien tahu nama resminya. */
    return ok({ settings: parsed.data.settings, knownKeys: Object.values(SYNC_SETTING_KEYS) })
  })
}
