import { db } from '@/lib/db'
import { fail, guard, ok } from '@/lib/api'

/* /api/foods/[id] — hapus asupan makan. */

export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return guard(async () => {
    const existing = await db.foodEntry.findUnique({ where: { id } })
    if (!existing) return fail('Asupan tidak ditemukan', 404)
    await db.foodEntry.delete({ where: { id } })
    return ok({ deleted: id })
  })
}
