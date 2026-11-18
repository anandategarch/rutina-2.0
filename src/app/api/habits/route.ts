import { z } from 'zod'
import { db } from '@/lib/db'
import { habitInputSchema } from '@/lib/sync-schema'
import { fail, guard, newId, ok, parseWith, readJson, todayJakartaISO } from '@/lib/api'

/* /api/habits — daftar & buat kebiasaan.
 * GET  → { habits, completions }  (completions = peta histori penuh)
 * POST → buat kebiasaan baru (id opsional; dibuat server bila absen) */

export const dynamic = 'force-dynamic'

const createSchema = habitInputSchema.extend({ id: z.string().min(1).max(64).optional() })

export async function GET() {
  return guard(async () => {
    const [habits, logs] = await Promise.all([
      db.habit.findMany({ orderBy: { createdAt: 'asc' } }),
      db.habitLog.findMany(),
    ])
    const completions: Record<string, Record<string, boolean>> = {}
    for (const log of logs) {
      ;(completions[log.date] ??= {})[log.habitId] = true
    }
    return ok({
      habits: habits.map((h) => ({
        id: h.id,
        title: h.title,
        desc: h.desc,
        cat: h.cat,
        schedule: JSON.parse(h.schedule) as number[],
        weeklyTarget: h.weeklyTarget,
        reminder: h.reminder,
        archived: h.archived,
        createdAt: h.createdAt,
      })),
      completions,
    })
  })
}

export async function POST(req: Request) {
  const parsed = parseWith(createSchema, await readJson(req))
  if (!parsed.ok) return fail('Muatan tidak valid', 422, parsed.issues)
  const input = parsed.data

  return guard(async () => {
    const habit = await db.habit.create({
      data: {
        id: input.id ?? newId('habit'),
        title: input.title,
        desc: input.desc,
        cat: input.cat,
        schedule: JSON.stringify([...input.schedule].sort((a, b) => a - b)),
        weeklyTarget: input.weeklyTarget,
        reminder: input.reminder,
        archived: false,
        createdAt: todayJakartaISO(),
      },
    })
    return ok({ habit: { ...habit, schedule: JSON.parse(habit.schedule) as number[] } }, 201)
  })
}
