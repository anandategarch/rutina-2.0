import { z } from 'zod'
import { db } from '@/lib/db'
import { bodyLogSchema } from '@/lib/sync-schema'
import { fail, guard, ok, parseWith, readJson, todayJakartaISO } from '@/lib/api'

/* /api/body — catatan tubuh harian (hidrasi/berat/tidur/energi).
 * GET ?date= → { bodyLogs: Record<tanggal, BodyLog> } (atau satu hari)
 * PUT { date?, ...BodyLog } → UPSERT satu tanggal (date default hari ini) */

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const upsertSchema = bodyLogSchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = parseWith(querySchema, {
    date: url.searchParams.get('date') ?? undefined,
  })
  if (!parsed.ok) return fail('Parameter tidak valid', 422, parsed.issues)

  return guard(async () => {
    const rows = await db.bodyLog.findMany({
      ...(parsed.data.date ? { where: { date: parsed.data.date } } : {}),
      orderBy: { date: 'desc' },
    })
    const bodyLogs: Record<string, unknown> = {}
    for (const b of rows) {
      bodyLogs[b.date] = {
        water: b.water,
        weight: b.weight,
        sleepH: b.sleepH,
        energy: b.energy,
      }
    }
    return ok({ bodyLogs })
  })
}

export async function PUT(req: Request) {
  const parsed = parseWith(upsertSchema, await readJson(req))
  if (!parsed.ok) return fail('Muatan tidak valid', 422, parsed.issues)
  const input = parsed.data
  const date = input.date ?? todayJakartaISO()
  const { date: _date, ...log } = input

  return guard(async () => {
    /* Merge dengan catatan yang ada agar kolom yang tak dikirim utuh. */
    const existing = await db.bodyLog.findUnique({ where: { date } })
    const bodyLog = await db.bodyLog.upsert({
      where: { date },
      create: {
        date,
        water: log.water,
        weight: log.weight ?? null,
        sleepH: log.sleepH ?? null,
        energy: log.energy ?? null,
      },
      update: {
        water: log.water ?? existing?.water ?? 0,
        ...(log.weight !== undefined ? { weight: log.weight } : {}),
        ...(log.sleepH !== undefined ? { sleepH: log.sleepH } : {}),
        ...(log.energy !== undefined ? { energy: log.energy } : {}),
      },
    })
    return ok({ bodyLog })
  })
}
