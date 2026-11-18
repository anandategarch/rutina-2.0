import { z } from 'zod'
import { db } from '@/lib/db'
import { workoutInputSchema } from '@/lib/sync-schema'
import { fail, guard, newId, ok, parseWith, readJson, todayJakartaISO } from '@/lib/api'

/* /api/workouts — sesi latihan: daftar & catat.
 * GET ?limit=&offset= → { workouts, total }  (sets diparse ke array) */

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const createSchema = workoutInputSchema.extend({ id: z.string().min(1).max(64).optional() })

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = parseWith(querySchema, {
    limit: url.searchParams.get('limit') ?? undefined,
    offset: url.searchParams.get('offset') ?? undefined,
  })
  if (!parsed.ok) return fail('Parameter tidak valid', 422, parsed.issues)
  const q = parsed.data

  return guard(async () => {
    const [workouts, total] = await Promise.all([
      db.workoutSession.findMany({
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        ...(q.limit ? { take: q.limit } : {}),
        ...(q.offset ? { skip: q.offset } : {}),
      }),
      db.workoutSession.count(),
    ])
    return ok({
      workouts: workouts.map((w) => ({
        ...w,
        sets: JSON.parse(w.sets) as unknown[],
      })),
      total,
    })
  })
}

export async function POST(req: Request) {
  const parsed = parseWith(createSchema, await readJson(req))
  if (!parsed.ok) return fail('Muatan tidak valid', 422, parsed.issues)
  const input = parsed.data

  return guard(async () => {
    const workout = await db.workoutSession.create({
      data: {
        id: input.id ?? newId('wo'),
        kind: input.kind,
        date: input.date ?? todayJakartaISO(),
        duration: input.duration,
        note: input.note,
        sets: JSON.stringify(input.sets),
        distance: input.distance ?? null,
      },
    })
    return ok({ workout: { ...workout, sets: JSON.parse(workout.sets) } }, 201)
  })
}
