import { z } from 'zod'
import { db } from '@/lib/db'
import { goalPatchSchema } from '@/lib/sync-schema'
import { fail, guard, ok, parseWith, readJson } from '@/lib/api'

/* /api/goals/[id] — sunting (nama/target/setoran) & hapus target.
 * PATCH { saved?: n } dengan makna SETORAN (increment) bila klien mengirim
 * { contribute: n }, atau nilai absolut bila `saved` langsung. */

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

const patchSchema = goalPatchSchema.extend({
  /** Setoran tambahan (increment saved) — selaras aksi contributeGoal. */
  contribute: z.number().int().min(0).max(1_000_000_000_000).optional(),
})

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params
  const parsed = parseWith(patchSchema, await readJson(req))
  if (!parsed.ok) return fail('Muatan tidak valid', 422, parsed.issues)
  const patch = parsed.data

  return guard(async () => {
    const existing = await db.goal.findUnique({ where: { id } })
    if (!existing) return fail('Target tidak ditemukan', 404)

    const saved =
      patch.contribute !== undefined
        ? existing.saved + patch.contribute
        : patch.saved !== undefined
          ? patch.saved
          : existing.saved

    const goal = await db.goal.update({
      where: { id },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.target !== undefined ? { target: patch.target } : {}),
        saved,
      },
    })
    return ok({ goal })
  })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  return guard(async () => {
    const existing = await db.goal.findUnique({ where: { id } })
    if (!existing) return fail('Target tidak ditemukan', 404)
    await db.goal.delete({ where: { id } })
    return ok({ deleted: id })
  })
}
