import { z } from 'zod'
import { db } from '@/lib/db'
import { foodEntryInputSchema } from '@/lib/sync-schema'
import { fail, guard, newId, ok, parseWith, readJson, todayJakartaISO } from '@/lib/api'

/* /api/foods — asupan makan: daftar & catat.
 * GET ?date=&limit= → { foodEntries } */

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const createSchema = foodEntryInputSchema.extend({ id: z.string().min(1).max(64).optional() })

export async function GET(req: Request) {
  const url = new URL(req.url)
  const parsed = parseWith(querySchema, {
    date: url.searchParams.get('date') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  })
  if (!parsed.ok) return fail('Parameter tidak valid', 422, parsed.issues)
  const q = parsed.data

  return guard(async () => {
    const foodEntries = await db.foodEntry.findMany({
      where: q.date ? { date: q.date } : {},
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      ...(q.limit ? { take: q.limit } : {}),
    })
    return ok({ foodEntries })
  })
}

export async function POST(req: Request) {
  const parsed = parseWith(createSchema, await readJson(req))
  if (!parsed.ok) return fail('Muatan tidak valid', 422, parsed.issues)
  const input = parsed.data

  return guard(async () => {
    const foodEntry = await db.foodEntry.create({
      data: {
        id: input.id ?? newId('fd'),
        date: input.date ?? todayJakartaISO(),
        name: input.name,
        cat: input.cat,
        unit: input.unit,
        portion: input.portion,
        meal: input.meal,
        kcal: input.kcal,
        protein: input.protein ?? null,
        carb: input.carb ?? null,
        fat: input.fat ?? null,
      },
    })
    return ok({ foodEntry }, 201)
  })
}
