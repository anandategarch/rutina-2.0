import { db } from '@/lib/db'
import { fail, guard, ok } from '@/lib/api'

/* /api/workouts/[id] — hapus sesi latihan. */

export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return guard(async () => {
    const existing = await db.workoutSession.findUnique({ where: { id } })
    if (!existing) return fail('Sesi latihan tidak ditemukan', 404)
    await db.workoutSession.delete({ where: { id } })
    return ok({ deleted: id })
  })
}
