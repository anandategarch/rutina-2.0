import { z } from 'zod'
import { db } from '@/lib/db'
import { goalInputSchema } from '@/lib/sync-schema'
import { fail, guard, newId, ok, parseWith, readJson } from '@/lib/api'

/* /api/goals — target tabungan: daftar & buat. */

export const dynamic = 'force-dynamic'

const createSchema = goalInputSchema.extend({
  id: z.string().min(1).max(64).optional(),
  saved: z.number().int().min(0).optional(),
})

export async function GET() {
  return guard(async () => {
    const goals = await db.goal.findMany()
    return ok({ goals })
  })
}

export async function POST(req: Request) {
  const parsed = parseWith(createSchema, await readJson(req))
  if (!parsed.ok) return fail('Muatan tidak valid', 422, parsed.issues)
  const input = parsed.data

  return guard(async () => {
    const goal = await db.goal.create({
      data: {
        id: input.id ?? newId('goal'),
        name: input.name,
        target: input.target,
        saved: input.saved ?? 0,
      },
    })
    return ok({ goal }, 201)
  })
}
