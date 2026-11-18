import { db } from '@/lib/db'
import { fail, guard, ok } from '@/lib/api'

/* /api/transactions/[id] — hapus transaksi. */

export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return guard(async () => {
    const existing = await db.transaction.findUnique({ where: { id } })
    if (!existing) return fail('Transaksi tidak ditemukan', 404)
    await db.transaction.delete({ where: { id } })
    return ok({ deleted: id })
  })
}
