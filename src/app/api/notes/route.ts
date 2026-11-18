import { z } from 'zod'
import { db } from '@/lib/db'
import { noteInputSchema } from '@/lib/sync-schema'
import { fail, guard, newId, ok, parseWith, readJson } from '@/lib/api'

/* /api/notes — daftar & buat catatan jurnal.
 * GET  ?folder=&limit=  → { notes }
 * POST → buat catatan (id & tone opsional) */

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  folder: z.string().max(16).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const createSchema = noteInputSchema.extend({
  id: z.string().min(1).max(64).optional(),
  tone: z.number().int().min(0).max(2).optional(),
})

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = parseWith(querySchema, {
    folder: url.searchParams.get('folder') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  })
  if (!parsed.ok) return fail('Parameter tidak valid', 422, parsed.issues)

  return guard(async () => {
    const notes = await db.journalNote.findMany({
      where: parsed.data.folder ? { folder: parsed.data.folder } : {},
      orderBy: [{ pinned: 'desc' }, { date: 'desc' }],
      ...(parsed.data.limit ? { take: parsed.data.limit } : {}),
    })
    return ok({ notes })
  })
}

export async function POST(req: Request) {
  const parsed = parseWith(createSchema, await readJson(req))
  if (!parsed.ok) return fail('Muatan tidak valid', 422, parsed.issues)
  const input = parsed.data

  return guard(async () => {
    const note = await db.journalNote.create({
      data: {
        id: input.id ?? newId('note'),
        title: input.title,
        body: input.body,
        date: input.date,
        pinned: input.pinned,
        tone: input.tone ?? 0,
        folder: input.folder,
      },
    })
    return ok({ note }, 201)
  })
}
