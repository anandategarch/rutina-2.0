import { db } from '@/lib/db'
import { habitPatchSchema } from '@/lib/sync-schema'
import { fail, guard, ok, parseWith, readJson } from '@/lib/api'

/* /api/habits/[id] — detail, sunting, hapus (histori ikut terhapus). */

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  return guard(async () => {
    const habit = await db.habit.findUnique({ where: { id } })
    if (!habit) return fail('Kebiasaan tidak ditemukan', 404)
    return ok({
      habit: { ...habit, schedule: JSON.parse(habit.schedule) as number[] },
    })
  })
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params
  const parsed = parseWith(habitPatchSchema, await readJson(req))
  if (!parsed.ok) return fail('Muatan tidak valid', 422, parsed.issues)
  const patch = parsed.data

  return guard(async () => {
    const existing = await db.habit.findUnique({ where: { id } })
    if (!existing) return fail('Kebiasaan tidak ditemukan', 404)

    const habit = await db.habit.update({
      where: { id },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.desc !== undefined ? { desc: patch.desc } : {}),
        ...(patch.cat !== undefined ? { cat: patch.cat } : {}),
        ...(patch.schedule !== undefined
          ? { schedule: JSON.stringify([...patch.schedule].sort((a, b) => a - b)) }
          : {}),
        ...(patch.weeklyTarget !== undefined
          ? { weeklyTarget: patch.weeklyTarget }
          : {}),
        ...(patch.reminder !== undefined ? { reminder: patch.reminder } : {}),
      },
    })
    return ok({ habit: { ...habit, schedule: JSON.parse(habit.schedule) as number[] } })
  })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  return guard(async () => {
    const existing = await db.habit.findUnique({ where: { id } })
    if (!existing) return fail('Kebiasaan tidak ditemukan', 404)
    await db.habit.delete({ where: { id } }) // log ikut terhapus (cascade)
    return ok({ deleted: id })
  })
}
